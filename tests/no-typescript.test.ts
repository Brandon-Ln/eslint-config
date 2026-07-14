import type { Linter } from 'eslint'

import { describe, expect, it, vi } from 'vitest'

import { ESLint } from 'eslint'

import { withProject } from './test-utils.js'

const TS_MODULES = [
    'typescript',
    'typescript-eslint',
    '@typescript-eslint/parser',
    '@vue/eslint-config-typescript',
]

/**
 * 通过 `vi.mock` 拦截 `node:module` 的 `createRequire`，包装其返回的 require 函数。
 * - `apply` trap 记录每次 `require(id)` 入参（`.resolve()` 不经过此 trap，不污染记录）
 * - `blockTypescript` 开启时，对 TS 相关模块的 require 直接抛 MODULE_NOT_FOUND，
 *   模拟「未安装 typescript」的真实解析失败环境
 */
const state = vi.hoisted(() => ({
    requests: [] as string[],
    blockTypescript: false,
}))

vi.mock('node:module', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:module')>()
    return {
        ...actual,
        createRequire(filename: string) {
            const req = actual.createRequire(filename)
            return new Proxy(req, {
                apply(target, thisArg, args: [string]) {
                    state.requests.push(args[0])
                    if (state.blockTypescript && TS_MODULES.some((m) => args[0] === m || args[0].startsWith(`${m}/`))) {
                        throw Object.assign(new Error(`Cannot find module '${args[0]}'`), { code: 'MODULE_NOT_FOUND' })
                    }
                    return Reflect.apply(target, thisArg, args) as unknown
                },
            })
        },
    }
})

/**
 * 验证 `typescript: false` 下 brandlen 不会惰性 require 任何 TS 相关模块；
 * 对照组 `typescript: true` 下应触发 `typescript-eslint` 的加载。
 */
describe.sequential('lazy loading of typescript-eslint', () => {
    it('does not require typescript-related modules when typescript is disabled', async () => {
        await withProject({ name: 'no-ts-lazy', dependencies: {} }, async () => {
            state.requests.length = 0
            state.blockTypescript = false
            vi.resetModules()
            try {
                const mod = await import('../src/index.js')
                const configs = mod.default({ typescript: false, vue: false, react: false, nest: false })

                expect(Array.isArray(configs)).toBe(true)
                expect(configs.length).toBeGreaterThan(0)
                expect(state.requests).toEqual([])
            } finally {
                vi.resetModules()
            }
        })
    })

    it('requires typescript-eslint when typescript is enabled (control)', async () => {
        await withProject({ name: 'with-ts-lazy', dependencies: {} }, async () => {
            state.requests.length = 0
            state.blockTypescript = false
            vi.resetModules()
            try {
                const mod = await import('../src/index.js')
                mod.default({ typescript: true, vue: false, react: false, nest: false })

                expect(state.requests).toContain('typescript-eslint')
            } finally {
                vi.resetModules()
            }
        })
    })

    /**
     * 端到端验证：在 typescript 完全不可 require（模拟未安装）的环境下，
     * brandlen 仍能生成可用配置，ESLint 能正确 lint JS 文件且不报 fatal error。
     * 同时验证 TS 文件被 `brandlen/ignore-typescript` 正确忽略。
     */
    it('lints JavaScript files without fatal errors when requiring typescript throws', async () => {
        await withProject({ name: 'js-only-no-ts', dependencies: {} }, async (project) => {
            const jsFile = project.writeFile('unused.js', 'const unused = 42\n')
            const tsFile = project.writeFile('feature.ts', 'export const value: number = 1\n')

            state.requests.length = 0
            state.blockTypescript = true
            vi.resetModules()
            try {
                const mod = await import('../src/index.js')
                const configs = mod.default({ typescript: false, node: true, vue: false, react: false, nest: false })
                const eslint = new ESLint({
                    cwd: project.directory,
                    overrideConfig: configs as Linter.Config[],
                    overrideConfigFile: true,
                })

                const [jsResult] = await eslint.lintFiles([jsFile])

                expect(jsResult?.fatalErrorCount).toBe(0)
                expect(jsResult?.messages).toContainEqual(expect.objectContaining({ ruleId: 'no-unused-vars' }))
                expect(await eslint.isPathIgnored(tsFile)).toBe(true)
            } finally {
                state.blockTypescript = false
                vi.resetModules()
            }
        })
    })
})