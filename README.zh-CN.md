[English](./README.md) | [简体中文](./README.zh-CN.md)

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

`vue`、`react`、`nest` 接受 `true`、`false` 或 `'auto'`（默认），`node` 默认为 `false`。开关设为 `true` 时要求相应依赖存在，`'auto'` 则按项目依赖自动启用。

默认集成 TypeScript 类型感知 lint 与导入排序（支持 `--fix`）。

## 开发

- `pnpm build`：生成产物并校验公开 `exports`、声明文件和发布包。
- `pnpm lint` / `pnpm lint:fix`：使用构建后的本包配置检查项目源码。修改 ESLint 配置实现后，应先运行 `pnpm build`，使 dogfood 使用最新产物。
- `pnpm verify`：CI 与发布共用的完整校验，不会修改仓库文件。

## 发布

发布前确保工作区干净并切换到 `main`，然后执行：

```sh
pnpm release
```

它会交互式选择 SemVer 版本，在提交前运行完整校验，创建提交与 tag 并推送。GitHub Actions 的 `publish.yml` 是唯一的发布源，会在 tag 推送后再次运行完整校验，通过后发布到 npm；失败不会发布。