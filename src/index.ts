import { defineConfig } from 'eslint/config'

import { createCoreConfigs, createTypeScriptIgnoreConfigs } from './configs/core.js'
import { createImportConfigs } from './configs/imports.js'
import { createNestConfigs } from './configs/nest.js'
import { createNodeConfigs } from './configs/node.js'
import { createPrettierConfigs } from './configs/prettier.js'
import { createReactConfigs } from './configs/react.js'
import { createSourceCodeSizeConfigs } from './configs/source-code-size.js'
import { createTypeScriptConfigs } from './configs/typescript.js'
import { createVueConfigs } from './configs/vue.js'
import { resolveFeature, resolveTypeScript, resolveVue } from './detect.js'
import type {
  BrandlenOptions,
  DefaultIgnores,
  Enabled,
  FlatConfig,
  PublicFlatConfig,
  UserIgnores,
} from './types.js'

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
  const typescriptEnabled = resolveTypeScript(options.typescript ?? 'auto', cwd)
  const vueEnabled = resolveVue(options.vue ?? 'auto', cwd)
  const reactEnabled = resolveFeature(options.react ?? 'auto', 'React', 'react', cwd)
  const nestEnabled = resolveFeature(options.nest ?? 'auto', 'Nest', '@nestjs/common', cwd)
  const prettierEnabled = resolveFeature(options.prettier ?? 'auto', 'Prettier', 'prettier', cwd)

  // 基础配置始终注入：核心通用规则与源码规模约束；TypeScript 按开关决定。
  const configs: FlatConfig[] = [...createCoreConfigs(cwd, options.ignores)]
  configs.push(...createSourceCodeSizeConfigs())

  if (typescriptEnabled) {
    // 保持既有混合项目行为：typescript-eslint recommended 同时覆盖 JS 与 TS。
    configs.push(...createTypeScriptConfigs(cwd))
  } else {
    configs.push(...createTypeScriptIgnoreConfigs())
  }

  configs.push(...createImportConfigs())

  if (options.node) {
    configs.push(...createNodeConfigs())
  }

  // 框架相关配置仅在对应依赖存在时按需注入
  if (vueEnabled) {
    configs.push(...createVueConfigs(cwd, typescriptEnabled))
  }

  if (reactEnabled) {
    configs.push(...createReactConfigs())
  }

  if (nestEnabled) {
    configs.push(...createNestConfigs())
  }

  // Prettier 兼容块必须置于配置数组最末——这是 eslint-config-prettier 的硬性要求，
  // 否则其后任何块重新开启的格式化规则都会让这里的关闭失效。
  if (prettierEnabled) {
    configs.push(...createPrettierConfigs())
  }

  // 借助 eslint/config 的 defineConfig 对内部更宽泛的 FlatConfig 做归一化，
  // 再断言为对外暴露的 PublicFlatConfig，以抹平插件类型与 ESLint 原生类型之间的差异
  return defineConfig(...configs)
}
