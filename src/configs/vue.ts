import { createRequire } from 'node:module'

import type * as VueEslintConfigTypeScript from '@vue/eslint-config-typescript'
import type { Linter } from 'eslint'
import vuePlugin from 'eslint-plugin-vue'
import globals from 'globals'
import type * as TypeScriptESLint from 'typescript-eslint'

import { VUE_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'
import { typeScriptCustomRules } from './typescript.js'

const projectRequire = createRequire(import.meta.url)

/**
 * 构建 Vue 3 相关配置块，仅作用于 `.vue` 文件。
 *
 * - TypeScript 关闭时仅注入 Vue 推荐规则与浏览器全局变量，
 *   `<script>` 块交由 vue-eslint-parser 的默认 JS parser 处理；
 *   项目若使用 `<script lang="ts">` 且未安装 `typescript`，
 *   将由 ESLint 自然报出 parse error，符合「纯 JS 项目」的真实环境。
 * - TypeScript 启用时，惰性加载 `typescript-eslint` 与 `@vue/eslint-config-typescript`，
 *   注入 TS parser、类型感知规则与 projectService。
 */
export function createVueConfigs(cwd: string, typescriptEnabled: boolean): FlatConfig[] {
    const vueRecommendedConfigs: FlatConfig[] = vuePlugin.configs['flat/recommended']
        .map((config) => ({
            ...config,
            files: config.files ?? [...VUE_FILES],
        }))

    if (!typescriptEnabled) {
        return [
            ...vueRecommendedConfigs,
            {
                name: 'brandlen/vue',
                files: [...VUE_FILES],
                languageOptions: {
                    globals: globals.browser,
                },
            } satisfies Linter.Config,
        ]
    }

    const eslintTs = projectRequire('typescript-eslint') as typeof TypeScriptESLint
    const { defineConfigWithVueTs, vueTsConfigs } = projectRequire('@vue/eslint-config-typescript') as
        typeof VueEslintConfigTypeScript

    const baseConfigs: FlatConfig[] = [
        {
            name: 'brandlen/vue',
            files: [...VUE_FILES],
            languageOptions: {
                parserOptions: {
                    parser: eslintTs.parser,
                },
                globals: globals.browser,
            },
        } satisfies Linter.Config,
    ]

    const typeAwareConfigs: FlatConfig[] = [
        {
            name: 'brandlen/vue-type-aware',
            files: [...VUE_FILES],
            rules: typeScriptCustomRules,
            languageOptions: {
                parserOptions: {
                    parser: eslintTs.parser,
                    projectService: true,
                    tsconfigRootDir: cwd,
                },
                globals: globals.browser,
            },
        } satisfies Linter.Config,
    ]

    // @vue/eslint-config-typescript exposes @typescript-eslint/utils' config
    // type, whereas this package publicly returns ESLint's Linter.Config.
    // The helper has normalized these configs at runtime; retain this single
    // compatibility boundary until the upstream declarations converge.
    return defineConfigWithVueTs(
        vueRecommendedConfigs,
        vueTsConfigs.strictTypeChecked,
        vueTsConfigs.stylisticTypeCheckedOnly,
        ...baseConfigs,
        ...typeAwareConfigs,
    ) as FlatConfig[]
}
