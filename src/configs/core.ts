import fs from 'node:fs'
import path from 'node:path'

import { includeIgnoreFile } from '@eslint/compat'
import eslintJs from '@eslint/js'

import { BUILTIN_IGNORES } from '../constants.js'
import type { FlatConfig, UserIgnores } from '../types.js'

/**
 * 把内置默认 ignores 与用户选项合并为最终的 ignores 数组，
 * 语义与 antfu/eslint-config 的 `ignores` 字段完全一致：
 * - 数组 → 追加到默认，不替换；
 * - 函数 → 把默认作为入参传出，以返回值作为最终清单（可改写或完全替换）。
 */
function resolveIgnores(userIgnores: UserIgnores | undefined): string[] {
    if (userIgnores === undefined) return [...BUILTIN_IGNORES]
    if (typeof userIgnores === 'function') return userIgnores(BUILTIN_IGNORES)
    return [...BUILTIN_IGNORES, ...userIgnores]
}

/**
 * 构建核心通用配置块，所有项目无条件注入。
 *
 * 包含内容：
 * - 项目 `.gitignore` 中的忽略规则（若存在，独立并入，不受 userIgnores 影响）
 * - brandlen 内置默认 ignores 与用户追加/改写的 ignores，合并为单一 `brandlen/ignores` 块
 * - `@eslint/js` 的推荐规则集
 */
export function createCoreConfigs(cwd: string, userIgnores?: UserIgnores): FlatConfig[] {
    const gitignorePath = path.join(cwd, '.gitignore')
    const configs: FlatConfig[] = []

    if (fs.existsSync(gitignorePath)) {
        configs.push(includeIgnoreFile(gitignorePath, 'brandlen/apply-gitignore'))
    }

    configs.push(
        {
            name: 'brandlen/ignores',
            ignores: resolveIgnores(userIgnores),
        },
        eslintJs.configs.recommended,
    )

    return configs
}
