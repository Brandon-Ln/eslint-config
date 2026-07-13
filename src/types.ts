import type { Linter } from 'eslint'

/**
 * 启用状态选项：
 * - `true`：显式启用
 * - `false`：显式关闭
 * - `'auto'`：依据项目依赖自动探测
 */
export type Enabled = boolean | 'auto'

/**
 * 对外暴露的配置函数入参，控制各可选框架规则集的启用方式。
 * 未传入的字段将采用默认值 `'auto'`。
 */
export interface BrandlenOptions {
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
