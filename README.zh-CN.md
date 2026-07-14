[English](./README.md) | [简体中文](./README.zh-CN.md)

# @brandlen/eslint-config

个人使用的 ESLint 9+ Flat Config：默认开启 JavaScript 基线规则，按项目依赖自动探测 TypeScript 类型信息 lint，并自动启用 Vue 3、React 或 Nest 适配器。

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    node: true,
    react: false,
    nest: false,
})
```

`typescript`、`vue`、`react`、`nest` 均支持 `true`、`false`、`'auto'`（默认），`node` 默认为 `false`。`typescript` 在 `'auto'` 时按项目是否安装 TypeScript 启用；设为 `false` 会忽略独立的 TS 文件，设为 `true` 则强制启用。

启用 TS 后保留原有的 JS/TS 混合规则与类型感知 lint。Vue 始终保留 Vue lint；关闭 TS 时，`<script lang="ts">` 只做语法解析。

## 忽略文件

`brandlen` 始终输出一个 `brandlen/ignores` 块，用于排除 agent skills 目录与测试目录，并自动并入项目 `.gitignore` 的忽略规则。可通过 `ignores` 字段（数组，或接收内置默认值并返回最终清单的函数）追加或改写默认忽略项：

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    ignores: ['dist/**', 'coverage/**'],
})

// 或改写默认清单
export default brandlen({
    ignores: (defaults) => [...defaults, 'generated/**'],
})
```

如需只检测某些目录，推荐通过 ESLint CLI 限定范围而不是在共享配置中收窄——例如在 `package.json` 的 `lint` 脚本中执行 `eslint src/ scripts/`。这样使配置与 ESLint flat-config 的设计哲学一致（配置负责匹配文件，CLI 负责选取运行对象）。

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
