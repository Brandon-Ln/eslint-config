---
name: generate-changelog
description: 根据最近可达 Git tag 到 HEAD 的提交生成或更新 CHANGELOG.md。用户要求编写、更新、整理发布日志、changelog、release notes、未发布改动、Conventional Commits 或 Keep a Changelog 时使用；逐一阅读提交 diff，不可只复述提交信息。未提供发布版本号时，主动询问；保留既有 changelog 内容。
---

# 生成 Changelog

按 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，结合
[Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 语义更新发布记录。

## 流程

### 1. 确认版本号

用户未提供版本号时，先询问：

> 准备把上次 tag 之后的改动写入 CHANGELOG。此次发布的版本号是什么？例如 `0.3.0`。

接受 `1.2.3` 或 `v1.2.3`，标题统一使用 `1.2.3`。不要根据提交类型或
`package.json` 猜测版本。

### 2. 确定改动范围

```sh
git rev-parse --show-toplevel
git describe --tags --abbrev=0 HEAD
git log --reverse --format='%H%x09%s%x09%b' <previous-tag>..HEAD
```

以最近可达 tag 的 `<previous-tag>..HEAD` 为范围。没有 tag 时，按首次发布处理；
没有新提交时，不写空的版本记录。

### 3. 阅读每个提交的实际改动

对范围中的每个非 merge commit 执行：

```sh
git show --format='commit %H%n%s%n%b' --stat --find-renames --find-copies <commit>
git show --format= --find-renames --find-copies --find-copies-harder <commit>
```

必要时读取关联代码或测试。合并提交以最终 release diff 为准。不得把密钥、令牌、
私钥或大段生成内容写入 changelog。

### 4. 整理面向用户的条目

仅保留用户可感知的改动；测试、格式化、CI、构建和纯内部重构通常省略。合并同一功能的
多个提交，避免逐条罗列 commit。

按以下顺序使用非空分组：

1. `Added`
2. `Changed`
3. `Deprecated`
4. `Removed`
5. `Fixed`
6. `Security`

常见映射：`feat` → Added，`fix` → Fixed，影响行为的 `perf`/`refactor` → Changed。
`type!:` 或 `BREAKING CHANGE:` 是破坏性变更：放入对应分组，并以
`**Breaking:**` 开头；若 diff 已明确迁移方式，一并说明。

条目语言应与现有文件一致，简洁描述能力或问题，不写 commit hash、作者或 scope，除非
既有格式已有这些内容。

### 5. 写入文件

```sh
rg --files -g 'CHANGELOG*'
```

- 没有文件时，在根目录创建 `CHANGELOG.md`，包含标准说明、`## [Unreleased]` 和新版本。
- 有 `## [Unreleased]` 时，将新版本插入其后。
- 没有 `Unreleased` 时，将新版本放在最早的已发布版本之前。
- 不修改历史条目，不重排版本，不删除手写内容。

版本标题格式：`## [<version>] - YYYY-MM-DD`。日期使用本地当天，除非用户指定其他日期。
写入前给出简短预览（基准 tag、版本号、分组和条目）；用户明确要求直接生成时可直接写入。

新文件模板：

```md
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-07-15
```

### 6. 校验与交付

```sh
git diff --check
git diff -- CHANGELOG.md
```

报告基准 tag、提交范围、目标版本、文件路径和刻意省略的非用户改动。除非用户另行要求，
不要修改 `package.json` 版本、创建 tag、提交、推送或发布。

## 特殊情况

- 多个 changelog 文件且无法判断主文件：询问用户。
- 改动范围很大：先看 `--stat`，仍需逐提交阅读 diff。
- 提交不符合 Conventional Commits：依据 diff 分类。
- 工作区有未提交改动：默认排除，并在可能造成困惑时说明。
