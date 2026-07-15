import fs from 'node:fs'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import { ALL_CODE_FILES } from '../src/constants.js'
import brandlen from '../src/index.js'

import { configNames, hasNodeGlobals, withProject } from './test-utils.js'

describe.sequential('brandlen config factory', () => {
    it('keeps the prototype rules and import sorting rules when TypeScript is detected', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, (project) => {
            project.addPackage('typescript', '6.0.0')
            const configs = brandlen({ vue: false, react: false, nest: false })
            const typedConfig = configs.find((config) => config.name === 'brandlen/ts-type-aware')
            const importConfig = configs.find((config) => config.name === 'brandlen/imports')

            expect(typedConfig?.rules).toMatchObject({
                '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports', prefer: 'type-imports' }],
                'lines-between-class-members': ['warn', 'always'],
                '@typescript-eslint/no-deprecated': 'warn',
                '@typescript-eslint/no-unnecessary-type-assertion': 'error',
                '@typescript-eslint/unified-signatures': ['error', { ignoreDifferentlyNamedParameters: true }],
                '@typescript-eslint/no-non-null-assertion': 'off',
            })
            expect(importConfig?.rules).toMatchObject({
                'simple-import-sort/imports': 'error',
                'simple-import-sort/exports': 'error',
                'sort-imports': 'off',
                'import/order': 'off',
                'import/exports-last': 'error',
                'import/no-duplicates': 'error',
                'import/no-self-import': 'error',
                'import/no-useless-path-segments': 'error',
                'import/no-mutable-exports': 'error',
                'import/no-empty-named-blocks': 'error',
                'import/no-import-module-exports': 'error',
                'import/max-dependencies': ['error', { max: 20 }],
                'import/export': 'error',
            })
        })
    })

    it('honours explicit feature switches', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            expect(() => brandlen({ react: true })).toThrow('React is enabled')
            expect(configNames(brandlen({ vue: false, react: false, nest: false }))).not.toContain('brandlen/react')
        })
    })

    it('auto-detects TypeScript and lets explicit true retain its config without the dependency', () => {
        withProject({ name: 'plain-js', dependencies: {} }, (project) => {
            expect(configNames(brandlen({ vue: false, react: false, nest: false }))).not.toContain('brandlen/ts-type-aware')
            expect(configNames(brandlen({ typescript: true, vue: false, react: false, nest: false }))).toContain('brandlen/ts-type-aware')

            project.addPackage('typescript', '6.0.0')
            expect(configNames(brandlen({ vue: false, react: false, nest: false }))).toContain('brandlen/ts-type-aware')
        })
    })

    it('ignores standalone TypeScript files and removes TypeScript rules when disabled', async () => {
        await withProject({ name: 'typescript-disabled', dependencies: {} }, async (project) => {
            const jsFile = project.writeFile('script.js', "const pkg = require('pkg')\nconsole.log(pkg)\n")
            const tsFile = project.writeFile('feature.ts', 'export const value: number = 1\n')
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ typescript: false, node: true, vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })
            const eslintWithRewrittenIgnores = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({
                    typescript: false,
                    vue: false,
                    react: false,
                    nest: false,
                    ignores: () => [],
                }),
                overrideConfigFile: true,
            })

            const [jsResult] = await eslint.lintFiles([jsFile])

            expect(configNames(brandlen({ typescript: false, vue: false, react: false, nest: false }))).toContain('brandlen/ignore-typescript')
            expect(configNames(brandlen({ typescript: false, vue: false, react: false, nest: false }))).not.toContain('brandlen/ts-type-aware')
            expect(await eslint.isPathIgnored(tsFile)).toBe(true)
            expect(await eslintWithRewrittenIgnores.isPathIgnored(tsFile)).toBe(true)
            expect(jsResult?.messages).not.toContainEqual(expect.objectContaining({ ruleId: '@typescript-eslint/no-require-imports' }))
        })
    })

    it('always applies source-code-size rules to JavaScript without TypeScript', async () => {
        await withProject({ name: 'javascript-size-rules', dependencies: {} }, async (project) => {
            const sourceFile = project.writeFile('src/feature.js', 'export const feature = true\n')
            const configs = brandlen({ typescript: false, vue: false, react: false, nest: false })
            const sourceSizeConfig = configs.find((config) => config.name === 'brandlen/source-code-size')
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: configs,
                overrideConfigFile: true,
            })

            expect(sourceSizeConfig).toMatchObject({
                files: [...ALL_CODE_FILES],
                rules: {
                    complexity: ['error', { max: 15, variant: 'classic' }],
                    'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
                },
            })
            expect((await eslint.calculateConfigForFile(sourceFile))?.rules.complexity).toEqual([2, { max: 15, variant: 'classic' }])
            expect((await eslint.calculateConfigForFile(sourceFile))?.rules['max-lines']).toEqual([
                2,
                { max: 700, skipBlankLines: true, skipComments: true },
            ])
        })
    })

    it('keeps JavaScript Vue, React, and Nest linting when TypeScript is disabled', async () => {
        await withProject({ name: 'framework-js', dependencies: {} }, async (project) => {
            project.addPackage('vue', '3.5.0')
            project.addPackage('react', '19.2.0')
            project.addPackage('@nestjs/common', '11.1.0')

            const vueFile = project.writeFile('Component.vue', '<script setup>\nconst message = \'hello\'\n</script>\n\n<template>{{ message }}</template>\n')
            const nestFile = project.writeFile('src/users.controller.js', 'export const value = process.pid\n')
            const tsxFile = project.writeFile('Component.tsx', 'export const Component = () => <div />\n')
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ typescript: false, node: true, vue: true, react: true }),
                overrideConfigFile: true,
            })
            const [vueResult] = await eslint.lintFiles([vueFile])

            expect(configNames(brandlen({ typescript: false, vue: true, react: true }))).not.toContain('brandlen/vue-type-aware')
            expect(vueResult?.fatalErrorCount).toBe(0)
            expect(hasNodeGlobals(await eslint.calculateConfigForFile(nestFile))).toBe(true)
            expect(await eslint.isPathIgnored(tsxFile)).toBe(true)
        })
    })

    it('exposes builtin ignores via a single brandlen/ignores block by default', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            const ignoresConfig = brandlen({ vue: false, react: false, nest: false })
                .find((config) => config.name === 'brandlen/ignores')

            expect(ignoresConfig?.ignores).toEqual([
                '**/.{agents,codex}/skills/**',
                '**/{__tests__,test,tests}/**',
            ])
        })
    })

    it('appends user ignores without replacing builtin defaults', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            const ignoresConfig = brandlen({
                vue: false,
                react: false,
                nest: false,
                ignores: ['dist/**', 'coverage/**'],
            }).find((config) => config.name === 'brandlen/ignores')

            expect(ignoresConfig?.ignores).toEqual([
                '**/.{agents,codex}/skills/**',
                '**/{__tests__,test,tests}/**',
                'dist/**',
                'coverage/**',
            ])
        })
    })

    it('lets a function override rewrite the builtin ignores', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            const ignoresConfig = brandlen({
                vue: false,
                react: false,
                nest: false,
                ignores: (originals) => [...originals, 'generated/**'],
            }).find((config) => config.name === 'brandlen/ignores')

            expect(ignoresConfig?.ignores).toEqual([
                '**/.{agents,codex}/skills/**',
                '**/{__tests__,test,tests}/**',
                'generated/**',
            ])
        })
    })

    it('detects Vue 3, React, and Nest from installed project dependencies', () => {
        withProject({ name: 'full-stack', dependencies: {} }, (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('vue', '3.5.0')
            project.addPackage('react', '19.2.0')
            project.addPackage('@nestjs/common', '11.1.0')

            const names = configNames(brandlen())

            expect(names).toContain('brandlen/vue-type-aware')
            expect(names).toContain('brandlen/react')
            expect(names).toContain('brandlen/nest')
        })
    })

    it('lets explicit false override installed framework dependencies', () => {
        withProject({ name: 'full-stack-disabled', dependencies: {} }, (project) => {
            project.addPackage('vue', '3.5.0')
            project.addPackage('react', '19.2.0')
            project.addPackage('@nestjs/common', '11.1.0')

            const names = configNames(brandlen({ vue: false, react: false, nest: false }))

            expect(names).not.toContain('brandlen/vue-type-aware')
            expect(names).not.toContain('brandlen/react')
            expect(names).not.toContain('brandlen/nest')
        })
    })

    it('does not provide Node globals to ordinary source files by default', async () => {
        await withProject({ name: 'plain-ts', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            const sourceFile = project.writeFile('src/feature.ts', 'export const value = process.pid\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })

            expect(hasNodeGlobals(await eslint.calculateConfigForFile(sourceFile))).toBe(false)
        })
    })

    it('provides Node globals to all managed file types when node is enabled', async () => {
        await withProject({ name: 'node-project', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            const sourceFiles = ['script.js', 'feature.ts', 'Component.vue']
                .map((file) => project.writeFile(file, 'export const value = process.pid\n'))

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ node: true, vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })

            await Promise.all(sourceFiles.map(async (file) => {
                expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
            }))
        })
    })

    it('provides Node globals only to conventional Nest files', async () => {
        await withProject({ name: 'nest-project', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('@nestjs/common', '11.1.0')
            const nestFiles = ['src/users.controller.ts', 'src/users.service.ts', 'src/users.module.ts', 'src/auth.guard.ts']
                .map((file) => project.writeFile(file, 'export const value = process.pid\n'))
            const otherFile = project.writeFile('src/users.repository.ts', 'export const value = process.pid\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false }),
                overrideConfigFile: true,
            })

            await Promise.all(nestFiles.map(async (file) => {
                expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
            }))
            expect(hasNodeGlobals(await eslint.calculateConfigForFile(otherFile))).toBe(false)
        })
    })

    it('rejects Vue 2 when auto detection finds it', () => {
        withProject({ name: 'vue-two', dependencies: {} }, (project) => {
            project.addPackage('vue', '2.7.16')

            expect(() => brandlen()).toThrow('only Vue 3 is supported')
        })
    })

    it('lints Vue 3 SFCs with the Vue TypeScript adapter', async () => {
        await withProject({ name: 'vue-three', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('vue', '3.5.0')
            const sourceFile = project.writeFile('Component.vue', '<script setup lang="ts">\nconst message: string = \'hello\'\n</script>\n\n<template>{{ message }}</template>\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: true, react: false, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.fatalErrorCount).toBe(0)
        })
    })

    it('keeps Vue rules out of JavaScript with and without TypeScript', async () => {
        await withProject({ name: 'vue-scope', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('vue', '3.5.0')
            const sourceFile = project.writeFile('src/plain.js', 'export const value = 1\n')
            const createEslint = (typescript: boolean): ESLint => new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ typescript, vue: true, react: false, nest: false }),
                overrideConfigFile: true,
            })

            const [withoutTypeScript, withTypeScript] = await Promise.all([
                createEslint(false).calculateConfigForFile(sourceFile),
                createEslint(true).calculateConfigForFile(sourceFile),
            ])

            expect(withoutTypeScript?.rules['vue/multi-word-component-names']).toBeUndefined()
            expect(withTypeScript?.rules['vue/multi-word-component-names']).toBeUndefined()
        })
    })

    it('lints TSX with browser globals and React hooks rules', async () => {
        await withProject({ name: 'react-project', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('react', '19.2.0')
            const sourceFile = project.writeFile('Component.tsx', [
                "import { useEffect } from 'react'",
                '',
                'interface Props {',
                '    enabled: boolean',
                '}',
                '',
                'export function Component({ enabled }: Props) {',
                '    if (enabled) {',
                '        useEffect(() => {',
                "            window.localStorage.setItem('status', 'enabled')",
                '        }, [])',
                '    }',
                '',
                '    return <div>{window.location.href}</div>',
                '}',
                '',
            ].join('\n'))

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: true, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.fatalErrorCount).toBe(0)
            expect(result?.messages).toContainEqual(expect.objectContaining({ ruleId: 'react-hooks/rules-of-hooks' }))
            expect(result?.messages).not.toContainEqual(expect.objectContaining({ ruleId: 'no-undef' }))
        })
    })

    it('lints hooks in all JavaScript and TypeScript file variants', async () => {
        await withProject({ name: 'react-hooks-files', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.addPackage('react', '19.2.0')
            const sourceFile = project.writeFile('src/useFeature.ts', [
                "import { useEffect } from 'react'",
                '',
                'export function useFeature(enabled: boolean): void {',
                '    if (enabled) {',
                '        useEffect(() => undefined, [])',
                '    }',
                '}',
                '',
            ].join('\n'))
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: true, nest: false }),
                overrideConfigFile: true,
            })

            const [result] = await eslint.lintFiles([sourceFile])
            const configs = await Promise.all([
                sourceFile,
                ...['src/useFeature.js', 'src/useFeature.mjs', 'src/useFeature.cjs', 'src/useFeature.mts', 'src/useFeature.cts']
                    .map((file) => project.writeFile(file, 'export const value = true\n')),
            ].map(async (file) => eslint.calculateConfigForFile(file)))

            expect(result?.messages).toContainEqual(expect.objectContaining({ ruleId: 'react-hooks/rules-of-hooks' }))
            configs.forEach((config) => {
                expect(config?.rules['react-hooks/rules-of-hooks']).toEqual([2])
            })
        })
    })

    it('requires non-root TypeScript files to belong to a tsconfig project', async () => {
        await withProject(
            { name: 'strict-ts-project', dependencies: {} },
            async (project) => {
                project.addPackage('typescript', '6.0.0')
                project.writeFile('included.ts', 'export const included = true\n')
                const sourceFile = project.writeFile('src/outside.ts', 'export const outside = true\n')

                const eslint = new ESLint({
                    cwd: project.directory,
                    overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                    overrideConfigFile: true,
                })
                const [result] = await eslint.lintFiles([sourceFile])

                expect(result?.fatalErrorCount).toBe(1)
            },
            { compilerOptions: { strict: true }, files: ['included.ts'] },
        )
    })

    it('applies the consumer project .gitignore', async () => {
        await withProject({ name: 'ignored-file', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            project.writeFile('.gitignore', 'generated.ts\n')
            const sourceFile = project.writeFile('generated.ts', 'export const generated = true\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.warningCount).toBe(1)
            expect(result?.messages[0]?.message).toContain('ignore pattern')
        })
    })

    it('runs typed linting and fixes simple import sorting', async () => {
        await withProject({ name: 'plain-ts', dependencies: {} }, async (project) => {
            project.addPackage('typescript', '6.0.0')
            const sourceFile = project.writeFile('example.ts', "import z from 'z'\nimport a from 'a'\n\nconst value: string = 'done'\nconst redundantValue = value as string\n\nexport { z, a, redundantValue }\n")

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
                fix: true,
            })
            const results = await eslint.lintFiles([sourceFile])
            await ESLint.outputFixes(results)

            const output = fs.readFileSync(sourceFile, 'utf8')
            expect(results[0]?.messages.map((message) => `${message.ruleId}: ${message.message}`)).toEqual([])
            expect(output).toContain("import a from 'a'\nimport z from 'z'")
            expect(output).not.toContain('as string')
        })
    })

    it('auto-detects Prettier and appends the prettier config last when installed', () => {
        withProject({ name: 'prettier-auto', dependencies: {} }, (project) => {
            const namesWithout = configNames(brandlen({ vue: false, react: false, nest: false }))
            expect(namesWithout).not.toContain('brandlen/prettier')

            project.addPackage('prettier', '3.3.0')
            const configs = brandlen({ vue: false, react: false, nest: false })
            const names = configNames(configs)
            expect(names).toContain('brandlen/prettier')
            expect(names[names.length - 1]).toBe('brandlen/prettier')

            // eslint-config-prettier 用 `0` 或 `'off'` 关闭规则（二者语义等价），
            // 并且故意不关闭 `arrow-body-style` / `prefer-arrow-callback` 这类
            // "特殊规则"——交给 eslint-plugin-prettier 处理。此处仅校验它确实
            // 覆盖了 Vue / React / 通用 三条触发面。
            const rules = configs.find((config) => config.name === 'brandlen/prettier')?.rules as Record<string, unknown>
            const assertDisabled = (ruleId: string): void => {
                expect([0, 'off'], `${ruleId} should be disabled by eslint-config-prettier`).toContain(rules[ruleId])
            }
            assertDisabled('vue/html-indent')
            assertDisabled('vue/max-attributes-per-line')
            assertDisabled('vue/html-self-closing')
            assertDisabled('react/jsx-tag-spacing')
            assertDisabled('curly')
        })
    })

    it('rejects explicit Prettier enablement when prettier is not installed', () => {
        withProject({ name: 'prettier-missing', dependencies: {} }, () => {
            expect(() => brandlen({ prettier: true })).toThrow('Prettier is enabled, but prettier is not installed')
        })
    })

    it('lets explicit false override an installed Prettier package', () => {
        withProject({ name: 'prettier-disabled', dependencies: {} }, (project) => {
            project.addPackage('prettier', '3.3.0')
            const names = configNames(brandlen({ vue: false, react: false, nest: false, prettier: false }))
            expect(names).not.toContain('brandlen/prettier')
        })
    })
})
