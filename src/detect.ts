import { createRequire } from 'node:module'
import path from 'node:path'

import type { Enabled } from './types.js'

interface InstalledPackage {
  version: string
}

function isInstalledPackage(value: unknown): value is InstalledPackage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'string'
  )
}

/**
 * 基于目标项目目录创建一个 `require` 函数，使后续 `require.resolve`
 * 能够以项目自身路径为基准解析其 node_modules 中的依赖。
 *
 * 之所以使用一个不存在的虚拟文件名作为锚点，是因为 `createRequire`
 * 需要一个文件路径来确定解析起点，而该路径仅需提供正确的目录上下文即可。
 */
function getProjectRequire(cwd: string): NodeJS.Require {
  return createRequire(path.join(cwd, '__brandlen_eslint_config__.cjs'))
}

/**
 * 尝试在目标项目中解析指定包的 `package.json`，返回其版本信息；
 * 若包未安装则返回 `undefined`，不抛错以便调用方做容错处理。
 */
function findInstalledPackage(packageName: string, cwd: string): InstalledPackage | undefined {
  try {
    const packageJsonPath = getProjectRequire(cwd).resolve(`${packageName}/package.json`)
    const packageJson: unknown = getProjectRequire(cwd)(packageJsonPath)
    return isInstalledPackage(packageJson) ? packageJson : undefined
  } catch {
    return undefined
  }
}

/**
 * 构造当「显式启用某特性但对应依赖缺失」时的错误提示信息。
 */
function describeFeature(feature: string, dependency: string): string {
  return `@brandlen/eslint-config: ${feature} is enabled, but ${dependency} is not installed from ${process.cwd()}.`
}

/**
 * 根据用户选项与实际安装情况决定是否启用某框架特性。
 *
 * 选项语义：
 * - `false`：显式关闭，直接返回 `false`
 * - `true`：显式开启，若依赖未安装则抛错
 * - `'auto'` / 未传：依据依赖是否安装自动决定
 */
function resolveFeature(
  option: Enabled | undefined,
  feature: string,
  dependency: string,
  cwd: string,
): boolean {
  if (option === false) {
    return false
  }

  const installed = findInstalledPackage(dependency, cwd)

  if (option === true && !installed) {
    throw new Error(describeFeature(feature, dependency))
  }

  return installed !== undefined
}

/**
 * 决定是否注入 TypeScript 配置。
 *
 * 与框架配置不同，显式传入 `true` 时不预检依赖，保持配置工厂同步，
 * 让 TypeScript parser 在实际 lint 文件时给出其原生错误。
 */
function resolveTypeScript(option: Enabled | undefined, cwd: string): boolean {
  if (option === false) {
    return false
  }

  return option === true || findInstalledPackage('typescript', cwd) !== undefined
}

/**
 * 在 `resolveFeature` 的基础上增加对 Vue 版本的校验：当前仅支持 Vue 3。
 * 若探测到 Vue 2 或解析失败，将抛出明确的错误信息。
 */
function resolveVue(option: Enabled | undefined, cwd: string): boolean {
  if (option === false) {
    return false
  }

  const vue = findInstalledPackage('vue', cwd)

  if (option === true && !vue) {
    throw new Error(describeFeature('Vue', 'vue'))
  }

  if (!vue) {
    return false
  }

  const majorVersion = Number.parseInt(vue.version.split('.')[0] ?? '', 10)
  if (majorVersion !== 3) {
    throw new Error(
      `@brandlen/eslint-config: only Vue 3 is supported, but found vue@${vue.version}.`,
    )
  }

  return true
}

export { findInstalledPackage, resolveFeature, resolveTypeScript, resolveVue }
