import fs from 'node:fs'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import brandlen from '../src/index.js'

import { configNames, hasNodeGlobals, withProject } from './test-utils.js'

describe.sequential('brandlen config factory', () => {
    it('keeps the prototype rules and import sorting rules', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            const configs = brandlen({ vue: false, react: false, nest: false })
            const typedConfig = configs.find((config) => config.name === 'brandlen/ts-type-aware')
            const importConfig = configs.find((config) => config.name === 'brandlen/imports')

            expect(typedConfig?.rules).toMatchObject({
                '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports', prefer: 'type-imports' }],
                'lines-between-class-members': ['warn', 'always'],
                '@typescript-eslint/no-deprecated': 'warn',
                '@typescript-eslint/no-unnecessary-type-assertion': 'error',
                '@typescript-eslint/unified-signatures': ['error', { ignoreDifferentlyNamedParameters: true }],
                '@typescript-eslint/no-non-null-assertion': 'off',
            })
            expect(importConfig?.rules).toMatchObject({
                'simple-import-sort/imports': 'error',
                'simple-import-sort/exports': 'error',
                'sort-imports': 'off',
                'import/order': 'off',
                'import/exports-last': 'error',
                'import/no-duplicates': 'error',
                'import/no-self-import': 'error',
                'import/no-useless-path-segments': 'error',
                'import/no-mutable-exports': 'error',
                'import/no-empty-named-blocks': 'error',
                'import/no-import-module-exports': 'error',
                'import/max-dependencies': ['error', { max: 20 }],
                'import/export': 'error',
            })
        })
    })

    it('honours explicit feature switches', () => {
        withProject({ name: 'plain-ts', dependencies: {} }, () => {
            expect(() => brandlen({ react: true })).toThrow('React is enabled')
            expect(configNames(brandlen({ vue: false, react: false, nest: false }))).not.toContain('brandlen/react')
        })
    })

    it('detects Vue 3, React, and Nest from installed project dependencies', () => {
        withProject({ name: 'full-stack', dependencies: {} }, (project) => {
            project.addPackage('vue', '3.5.0')
            project.addPackage('react', '19.2.0')
            project.addPackage('@nestjs/common', '11.1.0')

            const names = configNames(brandlen())

            expect(names).toContain('brandlen/vue-type-aware')
            expect(names).toContain('brandlen/react')
            expect(names).toContain('brandlen/nest')
        })
    })

    it('lets explicit false override installed framework dependencies', () => {
        withProject({ name: 'full-stack-disabled', dependencies: {} }, (project) => {
            project.addPackage('vue', '3.5.0')
            project.addPackage('react', '19.2.0')
            project.addPackage('@nestjs/common', '11.1.0')

            const names = configNames(brandlen({ vue: false, react: false, nest: false }))

            expect(names).not.toContain('brandlen/vue-type-aware')
            expect(names).not.toContain('brandlen/react')
            expect(names).not.toContain('brandlen/nest')
        })
    })

    it('does not provide Node globals to ordinary source files by default', async () => {
        await withProject({ name: 'plain-ts', dependencies: {} }, async (project) => {
            const sourceFile = project.writeFile('src/feature.ts', 'export const value = process.pid\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })

            expect(hasNodeGlobals(await eslint.calculateConfigForFile(sourceFile))).toBe(false)
        })
    })

    it('provides Node globals to all managed file types when node is enabled', async () => {
        await withProject({ name: 'node-project', dependencies: {} }, async (project) => {
            const sourceFiles = ['script.js', 'feature.ts', 'Component.vue']
                .map((file) => project.writeFile(file, 'export const value = process.pid\n'))

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ node: true, vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })

            await Promise.all(sourceFiles.map(async (file) => {
                expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
            }))
        })
    })

    it('provides Node globals only to conventional Nest files', async () => {
        await withProject({ name: 'nest-project', dependencies: {} }, async (project) => {
            project.addPackage('@nestjs/common', '11.1.0')
            const nestFiles = ['src/users.controller.ts', 'src/users.service.ts', 'src/users.module.ts', 'src/auth.guard.ts']
                .map((file) => project.writeFile(file, 'export const value = process.pid\n'))
            const otherFile = project.writeFile('src/users.repository.ts', 'export const value = process.pid\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false }),
                overrideConfigFile: true,
            })

            await Promise.all(nestFiles.map(async (file) => {
                expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
            }))
            expect(hasNodeGlobals(await eslint.calculateConfigForFile(otherFile))).toBe(false)
        })
    })

    it('rejects Vue 2 when auto detection finds it', () => {
        withProject({ name: 'vue-two', dependencies: {} }, (project) => {
            project.addPackage('vue', '2.7.16')

            expect(() => brandlen()).toThrow('only Vue 3 is supported')
        })
    })

    it('lints Vue 3 SFCs with the Vue TypeScript adapter', async () => {
        await withProject({ name: 'vue-three', dependencies: {} }, async (project) => {
            project.addPackage('vue', '3.5.0')
            const sourceFile = project.writeFile('Component.vue', '<script setup lang="ts">\nconst message: string = \'hello\'\n</script>\n\n<template>{{ message }}</template>\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: true, react: false, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.fatalErrorCount).toBe(0)
        })
    })

    it('lints TSX with browser globals and React hooks rules', async () => {
        await withProject({ name: 'react-project', dependencies: {} }, async (project) => {
            project.addPackage('react', '19.2.0')
            const sourceFile = project.writeFile('Component.tsx', [
                "import { useEffect } from 'react'",
                '',
                'interface Props {',
                '    enabled: boolean',
                '}',
                '',
                'export function Component({ enabled }: Props) {',
                '    if (enabled) {',
                '        useEffect(() => {',
                "            window.localStorage.setItem('status', 'enabled')",
                '        }, [])',
                '    }',
                '',
                '    return <div>{window.location.href}</div>',
                '}',
                '',
            ].join('\n'))

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: true, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.fatalErrorCount).toBe(0)
            expect(result?.messages).toContainEqual(expect.objectContaining({ ruleId: 'react-hooks/rules-of-hooks' }))
            expect(result?.messages).not.toContainEqual(expect.objectContaining({ ruleId: 'no-undef' }))
        })
    })

    it('requires non-root TypeScript files to belong to a tsconfig project', async () => {
        await withProject(
            { name: 'strict-ts-project', dependencies: {} },
            async (project) => {
                project.writeFile('included.ts', 'export const included = true\n')
                const sourceFile = project.writeFile('src/outside.ts', 'export const outside = true\n')

                const eslint = new ESLint({
                    cwd: project.directory,
                    overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                    overrideConfigFile: true,
                })
                const [result] = await eslint.lintFiles([sourceFile])

                expect(result?.fatalErrorCount).toBe(1)
            },
            { compilerOptions: { strict: true }, files: ['included.ts'] },
        )
    })

    it('applies the consumer project .gitignore', async () => {
        await withProject({ name: 'ignored-file', dependencies: {} }, async (project) => {
            project.writeFile('.gitignore', 'generated.ts\n')
            const sourceFile = project.writeFile('generated.ts', 'export const generated = true\n')

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
            })
            const [result] = await eslint.lintFiles([sourceFile])

            expect(result?.warningCount).toBe(1)
            expect(result?.messages[0]?.message).toContain('ignore pattern')
        })
    })

    it('runs typed linting and fixes simple import sorting', async () => {
        await withProject({ name: 'plain-ts', dependencies: {} }, async (project) => {
            const sourceFile = project.writeFile('example.ts', "import z from 'z'\nimport a from 'a'\n\nconst value: string = 'done'\nconst redundantValue = value as string\n\nexport { z, a, redundantValue }\n")

            const eslint = new ESLint({
                cwd: project.directory,
                overrideConfig: brandlen({ vue: false, react: false, nest: false }),
                overrideConfigFile: true,
                fix: true,
            })
            const results = await eslint.lintFiles([sourceFile])
            await ESLint.outputFixes(results)

            const output = fs.readFileSync(sourceFile, 'utf8')
            expect(results[0]?.messages.map((message) => `${message.ruleId}: ${message.message}`)).toEqual([])
            expect(output).toContain("import a from 'a'\nimport z from 'z'")
            expect(output).not.toContain('as string')
        })
    })
})
