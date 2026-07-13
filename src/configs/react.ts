import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'

import type { FlatConfig } from '../types.js'

const REACT_FILES = ['**/*.{jsx,tsx}']

/**
 * 构建 React 项目相关配置块，仅作用于 JSX/TSX 文件。
 *
 * 在 `eslint-plugin-react` 的 recommended 与 jsx-runtime 配置基础上：
 * - 注入浏览器全局变量
 * - 将 React 版本设为 `detect` 以自动匹配项目实际版本
 * - 叠加 `eslint-plugin-react-hooks` 的推荐规则
 */
export function createReactConfigs(): FlatConfig[] {
    const recommended = reactPlugin.configs.flat.recommended
    const jsxRuntime = reactPlugin.configs.flat['jsx-runtime']

    if (!recommended || !jsxRuntime) {
        throw new Error('@brandlen/eslint-config: eslint-plugin-react does not provide its required flat configs.')
    }

    return [
        {
            name: 'brandlen/react',
            files: REACT_FILES,
            ...recommended,
            languageOptions: {
                ...recommended.languageOptions,
                globals: globals.browser,
            },
            settings: {
                react: {
                    version: 'detect',
                },
            },
        },
        {
            name: 'brandlen/react-jsx-runtime',
            files: REACT_FILES,
            ...jsxRuntime,
        },
        {
            ...reactHooksPlugin.configs.flat.recommended,
            name: 'brandlen/react-hooks',
            files: REACT_FILES,
        },
    ]
}
