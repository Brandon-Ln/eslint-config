/** JavaScript 及其 JSX 变体的源码文件 glob 模式 */
export const JS_FILES: readonly string[] = ['**/*.{js,mjs,cjs,jsx}']

/** TypeScript 及其 TSX 变体的源码文件 glob 模式 */
export const TS_FILES: readonly string[] = ['**/*.{ts,mts,cts,tsx}']

/** Vue 单文件组件 glob 模式 */
export const VUE_FILES: readonly string[] = ['**/*.vue']

/** 所有受管代码文件：JS + TS + Vue */
export const ALL_CODE_FILES: readonly string[] = [...JS_FILES, ...TS_FILES, ...VUE_FILES]

/** 需要类型感知（type-aware）的文件：TS + Vue，不含纯 JS */
export const TYPED_FILES: readonly string[] = [...TS_FILES, ...VUE_FILES]

/**
 * 项目根目录下的 TypeScript 配置文件（如 tsconfig 本身的源文件），
 * 用于 parserOptions.projectService 的 allowDefaultProject 兜底匹配。
 */
export const ROOT_TYPED_CONFIG_FILES: readonly string[] = ['*.{ts,mts,cts}']
