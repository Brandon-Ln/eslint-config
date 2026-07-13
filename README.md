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

## 开发

运行 `pnpm build` 会生成 `dist`、校验公开 `exports`、声明文件和发布包。项目不使用 `prepack` 生命周期脚本。

`pnpm lint` 使用构建后的本包配置检查项目源码；需要自动修复时使用 `pnpm lint:fix`。修改 ESLint 配置实现后，应先运行 `pnpm build`，使 dogfood 使用最新产物。

`pnpm verify` 是 CI 与发布共用的完整校验：lint、类型检查、测试和构建。它不会修改仓库文件。

## 发布

日常开发可在 feature 分支完成后合并到 `main`，也允许直接在 `main` 开发；两种方式都不要手动修改 `package.json` 的版本号。发布时请先切换到 `main`。

发布前先提交并推送所有功能改动，并确保工作区干净，然后执行：

```sh
pnpm release
```

它会交互式选择 SemVer 版本，在提交前运行完整校验，创建 `chore(release): vX.Y.Z` 提交和 `vX.Y.Z` tag，并推送两者。bumpp 会拒绝脏工作区；推送 tag 后 GitHub Actions 会重新运行完整校验，随后发布到 npm；失败不会发布。GitHub 不会创建 GitHub Release 或 CHANGELOG。

首次使用前，创建公开仓库 `Brandon-Ln/eslint-config` 并将其设为 `origin`，然后将 `main` 推送为上游分支：

```sh
git remote add origin git@github.com:Brandon-Ln/eslint-config.git
git push -u origin main
```

GitHub Actions 的 `publish.yml` 是唯一的发布源。

首次发布前，在 GitHub Actions Secrets 中临时添加可发布 `@brandlen/eslint-config` 的 granular `NPM_TOKEN`。首个 tag 成功发布后，在 npm 为该包配置 GitHub Trusted Publisher：仓库为 `Brandon-Ln/eslint-config`，workflow 文件为 `publish.yml`，只允许 `npm publish`；也可使用 npm 11.5+ 运行：

```sh
npm trust github @brandlen/eslint-config --repo Brandon-Ln/eslint-config --file publish.yml --allow-publish
```

随后删除 `NPM_TOKEN`。之后工作流会使用 OIDC 短期凭据发布，并为公开仓库中的公开包生成 provenance。
