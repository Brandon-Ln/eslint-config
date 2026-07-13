import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import type { Linter } from 'eslint'
import vuePlugin from 'eslint-plugin-vue'
import globals from 'globals'
import eslintTs from 'typescript-eslint'

import { VUE_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'
import { typeScriptCustomRules } from './typescript.js'

/**
 * 构建 Vue 3 相关配置块，仅作用于 `.vue` 文件。
 *
 * 在 `eslint-plugin-vue` flat/recommended 与 `@vue/eslint-config-typescript`
 * 的类型感知集 基础上：
 * - 复用 TypeScript 配置中的自定义规则，保持 .ts 与 .vue 规则一致
 * - 使用 `eslintTs.parser` 作为 `<script>` 块的内部 parser
 * - 通过 `projectService` 关联 tsconfig 以启用类型感知
 * - 注入浏览器全局变量并应用与 TS 相同的源码体积约束
 */
export function createVueConfigs(cwd: string): FlatConfig[] {
    const customConfigs = [
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
        {
            name: 'brandlen/vue-source-code-size',
            files: [...VUE_FILES],
            rules: {
                complexity: ['error', { max: 15, variant: 'classic' }],
                'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
            },
        } satisfies Linter.Config,
    ] satisfies FlatConfig[]

    // @vue/eslint-config-typescript exposes @typescript-eslint/utils' config
    // type, whereas this package publicly returns ESLint's Linter.Config.
    // The helper has normalized these configs at runtime; retain this single
    // compatibility boundary until the upstream declarations converge.
    return defineConfigWithVueTs(
        vuePlugin.configs['flat/recommended'],
        vueTsConfigs.strictTypeChecked,
        vueTsConfigs.stylisticTypeCheckedOnly,
        ...customConfigs,
    ) as FlatConfig[]
}
