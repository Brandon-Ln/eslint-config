import fs from 'node:fs'
import path from 'node:path'

import { includeIgnoreFile } from '@eslint/compat'
import eslintJs from '@eslint/js'

import type { FlatConfig } from '../types.js'

/**
 * 构建核心通用配置块，所有项目无条件注入。
 *
 * 包含内容：
 * - 项目 `.gitignore` 中的忽略规则（若存在）
 * - 对 agent/codex skills 目录与测试目录的全局忽略
 * - `@eslint/js` 的推荐规则集
 */
export function createCoreConfigs(cwd: string): FlatConfig[] {
    const gitignorePath = path.join(cwd, '.gitignore')
    const configs: FlatConfig[] = []

    if (fs.existsSync(gitignorePath)) {
        configs.push(includeIgnoreFile(gitignorePath, 'brandlen/apply-gitignore'))
    }

    configs.push(
        {
            name: 'brandlen/ignore-agent-skills',
            ignores: ['**/.{agents,codex}/skills/**'],
        },
        {
            name: 'brandlen/ignore-tests',
            ignores: ['**/{__tests__,test,tests}/**'],
        },
        eslintJs.configs.recommended,
    )

    return configs
}
