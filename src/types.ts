import type { Linter } from 'eslint'

import type { BUILTIN_IGNORES } from './constants.js'

/**
 * 启用状态选项：
 * - `true`：显式启用
 * - `false`：显式关闭
 * - `'auto'`：依据项目依赖自动探测
 */
export type Enabled = boolean | 'auto'

/**
 * brandlen 内置默认 ignores 清单的字面量元组类型，
 * 用作 `UserIgnores` 函数形式入参 `originals` 的类型，
 * 以便 IDE 提示中能直接看到具体的默认 globs。
 */
export type DefaultIgnores = typeof BUILTIN_IGNORES

/** 用户可传入的全局忽略项：追加到默认清单（数组）或改写默认清单（函数）。 */
export type UserIgnores = string[] | ((originals: DefaultIgnores) => string[])

/**
 * 对外暴露的配置函数入参，控制各可选框架规则集的启用方式。
 * 未传入的字段将采用默认值 `'auto'`。
 */
export interface BrandlenOptions {
    /**
     * 全局忽略 globs，与 ESLint flat-config 的 `ignores` 字段同义：
     * - 数组形式：追加到 brandlen 内置默认 ignores（`.agents`/`.codex` skills 目录
     *   + 测试目录），不替换；项目 `.gitignore`（若存在）仍会独立并入。
     * - 函数形式：`(originals) => string[]`，把内置默认 ignores 作为入参传出，
     *   返回值作为最终 ignores；可借此改写或完全替换默认清单（与 antfu 行为一致）。
     *
     * 仅用于"扩展排除"，不用于"收窄源码范围"。如需只检测某些目录，
     * 推荐在 `package.json` 的 lint 脚本里以 CLI 路径参数指定，例如
     * `eslint src/ scripts/`，更符合 ESLint flat-config 的设计哲学。
     *
     * @default BUILTIN_IGNORES（`.agents`/`.codex` skills 目录 + 测试目录）
     */
    ignores?: UserIgnores

    /** 是否为全部受管代码文件注入 Node.js 运行时全局变量，默认关闭。 */
    node?: boolean
    vue?: Enabled
    react?: Enabled
    nest?: Enabled
}

/**
 * Internal flat-config representation that keeps the rule-map interoperability
 * boundary explicit while matching ESLint's mutable file-pattern input.
 */
export interface FlatConfig extends Omit<Linter.Config, 'rules'> {
    rules?: object
    extends?: Linter.Config[]
}

/**
 * 对外暴露的 flat config 类型，与 ESLint 原生 `Linter.Config` 保持一致，
 * 以便使用者获得正确的类型提示而不暴露内部兼容层。
 */
export type PublicFlatConfig = Linter.Config
