import globals from 'globals'

import { ALL_CODE_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'

/**
 * 构建显式启用的 Node.js 运行时配置块。
 *
 * 默认不注入 Node 全局变量；普通 Node 项目可通过 `node: true` 为全部受管代码文件启用。
 */
export function createNodeConfigs(): FlatConfig[] {
  return [
    {
      name: 'brandlen/node',
      files: [...ALL_CODE_FILES],
      languageOptions: {
        globals: globals.node,
      },
    },
  ]
}
