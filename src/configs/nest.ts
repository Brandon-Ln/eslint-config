import globals from 'globals'

import type { FlatConfig } from '../types.js'

const NEST_FILES = [
  '**/*.{controller,service,module,guard,pipe,interceptor,filter,gateway,middleware,resolver}.{js,ts}',
] as const

/**
 * 构建 NestJS 项目相关配置块。
 *
 * Nest 基于 Node 运行时，因此只为社区约定命名的 Nest 构件注入 Node 全局变量，
 * 以避免在控制器、服务、模块、守卫等文件中误报 `process`、`Buffer` 等未定义。
 */
export function createNestConfigs(): FlatConfig[] {
  return [
    {
      name: 'brandlen/nest',
      files: [...NEST_FILES],
      languageOptions: {
        globals: globals.node,
      },
    },
  ]
}
