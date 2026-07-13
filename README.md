# @brandlen/eslint-config

个人使用的 ESLint 9+ Flat Config：默认开启 JavaScript 基线规则与 TypeScript 类型信息 lint，并按项目依赖自动启用 Vue 3、React 或 Nest 适配器。

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    node: true,
    react: false,
    nest: false,
})
```

`vue`、`react`、`nest` 都接受 `true`、`false` 或 `'auto'`，默认 `'auto'`。`true` 在依赖不存在时会报错；Vue 仅支持 3.x。

`node` 默认为 `false`。普通 Node 项目可传入 `node: true`，为全部受管的 JS、TS 与 Vue 文件提供 Node globals。Nest 自动启用时，仅为遵循社区命名约定的 `*.controller.ts`、`*.service.ts`、`*.module.ts`、`*.guard.ts`、`*.pipe.ts`、`*.interceptor.ts`、`*.filter.ts`、`*.gateway.ts`、`*.middleware.ts` 与 `*.resolver.ts`（及其 `.js` 版本）提供 Node globals。

TypeScript 文件固定使用 `projectService` 执行类型感知 lint。根目录的 `*.ts`、`*.mts` 与 `*.cts` 配置文件可使用默认项目；其余 TypeScript 文件必须被项目的 tsconfig 包含。

配置包含 `simple-import-sort/imports` 与 `simple-import-sort/exports`，可通过 `eslint --fix` 自动整理导入与导出。

## 开发与发布

运行 `pnpm build` 会生成 `dist`、根据入口同步 `package.json` 的公开 `exports`，并校验发布包和声明文件。发布前请手动执行该命令；项目不使用 `prepack` 生命周期脚本。

`pnpm lint` 使用构建后的本包配置检查项目源码，并会自动修复可修复的问题。修改 ESLint 配置实现后，应先运行 `pnpm build`，使 dogfood 使用最新产物。
