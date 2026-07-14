import { createRequire } from 'node:module'

import type { Linter } from 'eslint'
import type * as TypeScriptESLint from 'typescript-eslint'

import { ROOT_TYPED_CONFIG_FILES, TS_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'

const projectRequire = createRequire(import.meta.url)

/**
 * 通用 TypeScript 规则覆盖项，不依赖类型信息即可 生效。
 * 例如强制类型导入分离、类成员之间留空行等。
 */
const customizedTsRules = {
    '@typescript-eslint/consistent-type-imports': [
        'error',
        {
            fixStyle: 'separate-type-imports',
            prefer: 'type-imports',
        },
    ],
    'lines-between-class-members': ['warn', 'always'],
} satisfies Linter.RulesRecord

/**
 * 依赖类型信息的 TypeScript 规则覆盖项，
 * 需配合 type-aware parser（projectService）才能生效。
 */
const customizedTsRulesWithTypeInfo = {
    '@typescript-eslint/no-deprecated': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/unified-signatures': ['error', { ignoreDifferentlyNamedParameters: true }],
    '@typescript-eslint/no-non-null-assertion': 'off',
} satisfies Linter.RulesRecord

/**
 * 构建 TypeScript 相关配置块，作用于 `.ts/.tsx` 等文件。
 *
 * 注入层级：
 * 1. `typescript-eslint` 的 recommended 基础规则
 * 2. 源码体积约束：圈复杂度 ≤ 15、单文件 ≤ 700 行
 * 3. 类型感知规则：在 strictTypeChecked 与 stylisticTypeCheckedOnly 基础上叠加自定义规则，
 *    并通过 `projectService` 关联 tsconfig，`allowDefaultProject` 兜底根目录配置文件
 */
export function createTypeScriptConfigs(cwd: string): FlatConfig[] {
    const eslintTs = projectRequire('typescript-eslint') as typeof TypeScriptESLint
    return [
        ...eslintTs.configs.recommended,
        {
            name: 'brandlen/source-code-size',
            files: [...TS_FILES],
            rules: {
                complexity: ['error', { max: 15, variant: 'classic' }],
                'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
            },
        },
        {
            name: 'brandlen/ts-type-aware',
            files: [...TS_FILES],
            extends: [...eslintTs.configs.strictTypeChecked, ...eslintTs.configs.stylisticTypeCheckedOnly],
            rules: {
                ...customizedTsRules,
                ...customizedTsRulesWithTypeInfo,
            },
            languageOptions: {
                parserOptions: {
                    projectService: {
                        allowDefaultProject: ROOT_TYPED_CONFIG_FILES,
                    },
                    tsconfigRootDir: cwd,
                },
            },
        },
    ]
}

export const typeScriptCustomRules: Linter.RulesRecord = {
    ...customizedTsRules,
    ...customizedTsRulesWithTypeInfo,
}
