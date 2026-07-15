# AGENTS.md

本仓库是 `@brandlen/eslint-config` —— 一份个人风格的 ESLint 9+ Flat Config，根据项目依赖自动探测 Vue 3 / React / Nest。

## 工具链

- 包管理器为 **pnpm 10.16.1**（由 `packageManager` 字段固定），所有命令都以 `pnpm` 调用。
- 纯 ESM 包，构建产物输出至 `dist/`（被 `.gitignore` 忽略，仅由 `tsdown` 生成）。
- TypeScript 严格模式 + `isolatedDeclarations` / `verbatimModuleSyntax`：跨界导入必须用 `import type`，否则 `pnpm typecheck` 会失败。

## 关键流程顺序

- **Lint 依赖构建产物**：`eslint.config.js` 引用的是 `./dist/index.js`，不是 `src/`。修改 `src/` 内部规则后，必须先 `pnpm build` 再 `pnpm lint`，否则 dogfooding 跑的是旧产物。
- 完整校验链为 `pnpm verify` = `build → lint → typecheck → test`，CI 与发布均以此为准；改动后本地先跑一次 `pnpm verify` 再提交。
- 单跑某项：`pnpm test` 运行 vitest，`pnpm test:watch` 进入监听；`pnpm typecheck` 仅做 `tsc --noEmit`。

## 测试约定

- 测试通过 `tests/test-utils.ts` 的 `withProject` 在系统临时目录里搭建假项目（写入 `package.json` / `tsconfig.json` 并 `chdir`），用来验证依赖探测与各框架开关；编写新测试请复用该工具而非直接操作 `process.cwd()`。
- 顶层 `describe` 使用 `describe.sequential`，因为用例间共享 `process.cwd()`，不要改成并行。

## 发布与分支

- **不要在功能分支上 bump `package.json` 的 `version`**：`scripts/assert-pr-version.js` 会在 PR CI 中比对 base 与 head 的版本，不一致直接失败。
- 发布仅通过 `pnpm release`（bumpp）从 `main` 触发，清洁工作树下交互式选择版本；其 `execute` 钩子会先跑 `pnpm verify`，校验通过后提交并推送 `v*` 标签。
- 真正的 `npm publish` 与 GitHub Release 由 `publish.yml` 在标签推送后执行；本地**不要**手动 `npm publish`。

## 提交信息

遵循 Conventional Commits（`feat:`、`fix:`、`chore:` 等）；发布提交固定为 `chore(release): v%s`（由 bumpp 生成）。
