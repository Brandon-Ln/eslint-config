import { defineConfig } from 'eslint/config'

import { createCoreConfigs } from './configs/core.js'
import { createImportConfigs } from './configs/imports.js'
import { createNestConfigs } from './configs/nest.js'
import { createNodeConfigs } from './configs/node.js'
import { createReactConfigs } from './configs/react.js'
import { createTypeScriptConfigs } from './configs/typescript.js'
import { createVueConfigs } from './configs/vue.js'
import { resolveFeature, resolveVue } from './detect.js'
import type { BrandlenOptions, DefaultIgnores, Enabled, FlatConfig, PublicFlatConfig, UserIgnores } from './types.js'

export type { BrandlenOptions, DefaultIgnores, Enabled, UserIgnores }

/**
 * 根据传入的选项与运行环境的依赖情况，组装出最终的 ESLint flat config 数组。
 *
 * 调用方通常无需手动指定各框架的启用状态：默认采用 `'auto'` 自动探测，
 * 即依据项目实际安装的依赖决定是否注入对应框架的规则集；
 * 当显式传 `true` 却未安装对应依赖时，将抛出错误以提示用户。
 */
export default function brandlen(options: BrandlenOptions = {}): PublicFlatConfig[] {
    const cwd = process.cwd()
    const vueEnabled = resolveVue(options.vue ?? 'auto', cwd)
    const reactEnabled = resolveFeature(options.react ?? 'auto', 'React', 'react', cwd)
    const nestEnabled = resolveFeature(options.nest ?? 'auto', 'Nest', '@nestjs/common', cwd)

    // 基础配置始终注入：核心通用规则、TypeScript 规则、import 规则
    const configs: FlatConfig[] = [
        ...createCoreConfigs(cwd, options.ignores),
        ...createTypeScriptConfigs(cwd),
        ...createImportConfigs(),
    ]

    if (options.node) {
        configs.push(...createNodeConfigs())
    }

    // 框架相关配置仅在对应依赖存在时按需注入
    if (vueEnabled) {
        configs.push(...createVueConfigs(cwd))
    }

    if (reactEnabled) {
        configs.push(...createReactConfigs())
    }

    if (nestEnabled) {
        configs.push(...createNestConfigs())
    }

    // 借助 eslint/config 的 defineConfig 对内部更宽泛的 FlatConfig 做归一化，
    // 再断言为对外暴露的 PublicFlatConfig，以抹平插件类型与 ESLint 原生类型之间的差异
    return defineConfig(...configs)
}
