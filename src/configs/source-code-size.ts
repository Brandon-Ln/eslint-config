import type { Linter } from 'eslint'

import { ALL_CODE_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'

/**
 * 构建所有受管源码文件共用的规模约束。
 *
 * 不依赖 TypeScript 或框架适配器，因此纯 JavaScript 项目也会获得相同的
 * 圈复杂度与有效代码行限制。
 */
export function createSourceCodeSizeConfigs(): FlatConfig[] {
    return [
        {
            name: 'brandlen/source-code-size',
            files: [...ALL_CODE_FILES],
            rules: {
                complexity: ['error', { max: 15, variant: 'classic' }],
                'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
            },
        } satisfies Linter.Config,
    ]
}
