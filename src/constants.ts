/** JavaScript 及其 JSX 变体的源码文件 glob 模式 */
export const JS_FILES = ['**/*.{js,mjs,cjs,jsx}'] as const

/** TypeScript 及其 TSX 变体的源码文件 glob 模式 */
export const TS_FILES = ['**/*.{ts,mts,cts,tsx}'] as const

/** Vue 单文件组件 glob 模式 */
export const VUE_FILES = ['**/*.vue'] as const

/** 所有受管代码文件：JS + TS + Vue */
export const ALL_CODE_FILES: readonly string[] = [...JS_FILES, ...TS_FILES, ...VUE_FILES]

/** 需要类型感知（type-aware）的文件：TS + Vue，不含纯 JS */
export const TYPED_FILES: readonly string[] = [...TS_FILES, ...VUE_FILES]

/**
 * 项目根目录下的 TypeScript 配置文件（如 tsconfig 本身的源文件），
 * 用于 parserOptions.projectService 的 allowDefaultProject 兜底匹配。
 */
export const ROOT_TYPED_CONFIG_FILES = ['*.{ts,mts,cts}'] as const

/**
 * brandlen 内置的全局忽略 globs：
 * - `.agents` / `.codex` skills 目录（不应参与项目源码检测）
 * - 各类测试目录（由专门的测试规则覆盖，不在主线规则集中检测）
 *
 * 用户通过 `BrandlenOptions.ignores` 追加或改写的项会与该清单合并，
 * 不替换本默认值（与 antfu/eslint-config 行为一致）。
 */
export const BUILTIN_IGNORES = [
  '**/.{agents,codex}/skills/**',
  '**/{__tests__,test,tests}/**',
] as const
