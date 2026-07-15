[English](./README.md) | [简体中文](./README.zh-CN.md)

# @brandlen/eslint-config

A personal ESLint 9+ Flat Config: enables JavaScript baseline rules, auto-detects TypeScript type-aware linting, and enables Vue 3, React, or Nest adapters from project dependencies.

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    node: true,
    react: false,
    nest: false,
})
```

`typescript`, `vue`, `react`, `nest`, and `prettier` support `true`, `false`, and `'auto'` (default); `node` defaults to `false`. In `'auto'` mode, TypeScript linting follows whether the project installs TypeScript; `false` ignores standalone TS files and `true` forces it on.

Enabled TypeScript keeps the existing mixed JS/TS rules and type-aware linting. Vue linting always remains active.

## Ignoring files

`brandlen` always emits a `brandlen/ignores` block that excludes agent skills directories and test directories, alongside any patterns inferred from your project's `.gitignore`. Pass `ignores` (an array, or a function that receives the built-in defaults and returns the final list) to extend or rewrite those defaults:

```js
// eslint.config.mjs
import brandlen from '@brandlen/eslint-config'

export default brandlen({
    ignores: ['dist/**', 'coverage/**'],
})

// or rewrite the defaults
export default brandlen({
    ignores: (defaults) => [...defaults, 'generated/**'],
})
```

To lint only a subset of directories, prefer scoping via the ESLint CLI rather than a shared config — e.g. `eslint src/ scripts/` in your `package.json` `lint` script. This keeps the config aligned with ESLint's flat-config philosophy (config matches files; the CLI selects what to run on).

## Prettier integration

`prettier` defaults to `'auto'`: when `prettier` is installed, `brandlen` appends [`eslint-config-prettier`](https://github.com/prettier/eslint-config-prettier) as the last config block, turning off formatting rules that conflict with Prettier. The dependency is bundled — just install `prettier` itself. Pass `prettier: false` to opt out.

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
