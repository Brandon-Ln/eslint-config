import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

import { ALL_CODE_FILES, TYPED_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'

/**
 * 构建与 import/export 组织相关的配置块。
 *
 * - 对所有代码文件启用 `simple-import-sort` 进行导入导出排序，
 *   并关闭与之冲突的 `sort-imports` 与 `import/order`。
 * - 对需类型感知的文件（TS / Vue）启用 `eslint-plugin-import`，
 *   强制 `export` 出现在文件末尾。
 */
export function createImportConfigs(): FlatConfig[] {
    return [
        {
            name: 'brandlen/simple-import-sort',
            files: [...ALL_CODE_FILES],
            plugins: {
                'simple-import-sort': simpleImportSort,
            },
            rules: {
                'simple-import-sort/imports': 'error',
                'simple-import-sort/exports': 'error',
                'sort-imports': 'off',
                'import/order': 'off',
            },
        },
        {
            name: 'brandlen/imports',
            files: [...TYPED_FILES],
            plugins: {
                import: importPlugin,
            },
            rules: {
                'import/exports-last': 'error',
            },
        },
    ]
}
