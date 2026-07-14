import type { Linter } from 'eslint'

import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

import brandlen from '../src/index.js'
import { withProject } from './test-utils.js'

describe('prettier rule interaction with unloaded plugins', () => {
    it('does not error when prettier is auto-detected without vue/react', async () => {
        await withProject({ name: 'prettier-no-frameworks', dependencies: {} }, async (project) => {
            project.addPackage('prettier', '3.3.0')
            const jsFile = project.writeFile('sample.js', 'var x = 1\n')
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false, typescript: false, node: true }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([jsFile])
            expect(result?.fatalErrorCount).toBe(0)
        })
    })
    it('does not error when prettier auto + vue enabled but no react', async () => {
        await withProject({ name: 'prettier-vue', dependencies: {} }, async (project) => {
            project.addPackage('prettier', '3.3.0')
            project.addPackage('vue', '3.5.0')
            const vueFile = project.writeFile('Comp.vue', '<script setup>\nconst x = 1\n</script>\n<template>{{ x }}</template>\n')
            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: true, react: false, nest: false, typescript: false, node: true }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([vueFile])
            expect(result?.fatalErrorCount).toBe(0)
        })
    })
})