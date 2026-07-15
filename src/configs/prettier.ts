import eslintConfigPrettier from 'eslint-config-prettier'

import type { FlatConfig } from '../types.js'

/**
 * 构建 Prettier 兼容配置块。
 *
 * 引入 `eslint-config-prettier` 的 `rules` 对象（v10 单包已覆盖
 * `vue/*`、`react/*`、`@typescript-eslint/*`、`@stylistic/*` 等触发面），
 * 包装为 `brandlen/prettier` 命名块。仅做"关闭规则"动作，无任何副作用；
 * 调用方必须保证其位于配置数组的绝对末尾——这是 `eslint-config-prettier`
 * 的硬性要求，否则前置配置中重新开启的格式化规则会覆盖此处的关闭。
 *
 * 这里不采用 `eslint-config-prettier/flat` 子路径，因其 `name` 固定为
 * `config-prettier` 且无法被前置覆盖；改用根导出取 `rules` 兜底即可。
 */
export function createPrettierConfigs(): FlatConfig[] {
  return [
    {
      name: 'brandlen/prettier',
      rules: { ...eslintConfigPrettier.rules },
    },
  ]
}
