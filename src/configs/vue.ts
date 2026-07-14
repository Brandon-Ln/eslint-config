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
 * 始终注入 Vue 推荐规则、浏览器全局变量与 TS 语法 parser；后者仅确保
 * `<script lang="ts">` 在 TypeScript lint 关闭时仍能被正确解析。
 * TypeScript 启用时，额外套用 Vue TS adapter、类型感知规则与 projectService。
 */
export function createVueConfigs(cwd: string, typescriptEnabled: boolean): FlatConfig[] {
    const baseConfigs = [
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
        {
            name: 'brandlen/vue-source-code-size',
            files: [...VUE_FILES],
            rules: {
                complexity: ['error', { max: 15, variant: 'classic' }],
                'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
            },
        } satisfies Linter.Config,
    ] satisfies FlatConfig[]

    if (!typescriptEnabled) {
        return [
            ...vuePlugin.configs['flat/recommended'],
            ...baseConfigs,
        ] as FlatConfig[]
    }

    const typeAwareConfigs = [
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
    ] satisfies FlatConfig[]

    // @vue/eslint-config-typescript exposes @typescript-eslint/utils' config
    // type, whereas this package publicly returns ESLint's Linter.Config.
    // The helper has normalized these configs at runtime; retain this single
    // compatibility boundary until the upstream declarations converge.
    return defineConfigWithVueTs(
        vuePlugin.configs['flat/recommended'],
        vueTsConfigs.strictTypeChecked,
        vueTsConfigs.stylisticTypeCheckedOnly,
        ...baseConfigs,
        ...typeAwareConfigs,
    ) as FlatConfig[]
}
