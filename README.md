[English](./README.md) | [简体中文](./README.zh-CN.md)

# @brandlen/eslint-config

A personal ESLint 9+ Flat Config: enables JavaScript baseline rules and TypeScript type-aware linting out of the box, with auto-detection of Vue 3, React, or Nest adapters based on project dependencies.

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    node: true,
    react: false,
    nest: false,
})
```

`vue`, `react`, and `nest` accept `true`, `false`, or `'auto'` (default); `node` defaults to `false`. Setting a switch to `true` requires the corresponding dependency to be present, while `'auto'` enables it based on project dependencies.

TypeScript type-aware linting and import sorting (with `--fix` support) are integrated by default.

## Development

- `pnpm build`: Generates artifacts and validates public `exports`, declaration files, and the publishable package.
- `pnpm lint` / `pnpm lint:fix`: Lints the project source using the built config. After modifying ESLint config internals, run `pnpm build` first so dogfooding uses the latest artifacts.
- `pnpm verify`: Full validation shared by CI and release; does not modify repository files.

## Release

Ensure the working tree is clean and switch to `main`, then run:

```sh
pnpm release
```

It interactively selects a SemVer version, runs full validation before committing, then creates and pushes a commit with a tag. GitHub Actions' `publish.yml` is the sole release source; it re-runs full validation after the tag is pushed and publishes to npm on success — nothing is published on failure.