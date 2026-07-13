import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

import { ALL_CODE_FILES } from '../constants.js'
import type { FlatConfig } from '../types.js'

/**
 * 构建与 import/export 组织相关的配置块。
 *
 * 对所有代码文件启用 `simple-import-sort` 进行导入导出排序，
 * 关闭与之冲突的 `sort-imports` 与 `import/order`，
 * 同时启用 `eslint-plugin-import` 强制 `export` 出现在文件末尾。
 */
export function createImportConfigs(): FlatConfig[] {
    return [
        {
            name: 'brandlen/imports',
            files: [...ALL_CODE_FILES],
            plugins: {
                'simple-import-sort': simpleImportSort,
                import: importPlugin,
            },
            rules: {
                'simple-import-sort/imports': 'error',
                'simple-import-sort/exports': 'error',
                'sort-imports': 'off',
                'import/order': 'off',
                'import/exports-last': 'error',
                'import/no-duplicates': 'error',
                'import/no-self-import': 'error',
                'import/no-useless-path-segments': 'error',
                'import/no-mutable-exports': 'error',
                'import/no-empty-named-blocks': 'error',
                'import/no-import-module-exports': 'error',
                'import/max-dependencies': ['error', { max: 20 }],
                'import/export': 'error',
            },
        },
    ]
}
