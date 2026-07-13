import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ESLint } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'

import brandlen from '../src/index.js'

const originalCwd = process.cwd()
const temporaryDirectories: string[] = []

function createProject(packageJson: object, tsconfig: object = { compilerOptions: { strict: true } }): string {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brandlen-eslint-'))
    temporaryDirectories.push(directory)
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(packageJson))
    fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify(tsconfig))
    return directory
}

function addInstalledPackage(directory: string, packageName: string, version: string): void {
    const packageDirectory = path.join(directory, 'node_modules', ...packageName.split('/'))
    fs.mkdirSync(packageDirectory, { recursive: true })
    fs.writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify({ name: packageName, version }))
    fs.writeFileSync(path.join(packageDirectory, 'index.js'), `module.exports = { version: '${version}' }\n`)
}

function configNames(configs: ReturnType<typeof brandlen>): string[] {
    return configs.flatMap((config) => config.name === undefined ? [] : [config.name])
}

function hasNodeGlobals(config: Awaited<ReturnType<ESLint['calculateConfigForFile']>> | undefined): boolean {
    return config?.languageOptions?.globals?.process !== undefined
}

afterEach(() => {
    process.chdir(originalCwd)
    for (const directory of temporaryDirectories.splice(0)) {
        fs.rmSync(directory, { recursive: true, force: true })
    }
})

describe.sequential('brandlen config factory', () => {
    it('keeps the prototype rules and import sorting rules', () => {
        const directory = createProject({ name: 'plain-ts', dependencies: {} })
        process.chdir(directory)

        const configs = brandlen({ vue: false, react: false, nest: false })
        const typedConfig = configs.find((config) => config.name === 'brandlen/ts-type-aware')
        const sortConfig = configs.find((config) => config.name === 'brandlen/simple-import-sort')

        expect(typedConfig?.rules).toMatchObject({
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports', prefer: 'type-imports' }],
            'lines-between-class-members': ['warn', 'always'],
            '@typescript-eslint/no-deprecated': 'warn',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/unified-signatures': ['error', { ignoreDifferentlyNamedParameters: true }],
            '@typescript-eslint/no-non-null-assertion': 'off',
        })
        expect(sortConfig?.rules).toMatchObject({
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'sort-imports': 'off',
            'import/order': 'off',
        })
        expect(configs.find((config) => config.name === 'brandlen/imports')?.rules).toMatchObject({
            'import/exports-last': 'error',
        })
    })

    it('honours explicit feature switches', () => {
        const directory = createProject({ name: 'plain-ts', dependencies: {} })
        process.chdir(directory)

        expect(() => brandlen({ react: true })).toThrow('React is enabled')
        expect(configNames(brandlen({ vue: false, react: false, nest: false }))).not.toContain('brandlen/react')
    })

    it('detects Vue 3, React, and Nest from installed project dependencies', () => {
        const directory = createProject({ name: 'full-stack', dependencies: {} })
        addInstalledPackage(directory, 'vue', '3.5.0')
        addInstalledPackage(directory, 'react', '19.2.0')
        addInstalledPackage(directory, '@nestjs/common', '11.1.0')
        process.chdir(directory)

        const names = configNames(brandlen())

        expect(names).toContain('brandlen/vue-type-aware')
        expect(names).toContain('brandlen/react')
        expect(names).toContain('brandlen/nest')
    })

    it('lets explicit false override installed framework dependencies', () => {
        const directory = createProject({ name: 'full-stack-disabled', dependencies: {} })
        addInstalledPackage(directory, 'vue', '3.5.0')
        addInstalledPackage(directory, 'react', '19.2.0')
        addInstalledPackage(directory, '@nestjs/common', '11.1.0')
        process.chdir(directory)

        const names = configNames(brandlen({ vue: false, react: false, nest: false }))

        expect(names).not.toContain('brandlen/vue-type-aware')
        expect(names).not.toContain('brandlen/react')
        expect(names).not.toContain('brandlen/nest')
    })

    it('does not provide Node globals to ordinary source files by default', async () => {
        const directory = createProject({ name: 'plain-ts', dependencies: {} })
        const sourceFile = path.join(directory, 'src', 'feature.ts')
        fs.mkdirSync(path.dirname(sourceFile), { recursive: true })
        fs.writeFileSync(sourceFile, 'export const value = process.pid\n')
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: false, react: false, nest: false }),
            overrideConfigFile: true,
        })

        expect(hasNodeGlobals(await eslint.calculateConfigForFile(sourceFile))).toBe(false)
    })

    it('provides Node globals to all managed file types when node is enabled', async () => {
        const directory = createProject({ name: 'node-project', dependencies: {} })
        const sourceFiles = ['script.js', 'feature.ts', 'Component.vue'].map((file) => path.join(directory, file))
        sourceFiles.forEach((file) => fs.writeFileSync(file, 'export const value = process.pid\n'))
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ node: true, vue: false, react: false, nest: false }),
            overrideConfigFile: true,
        })

        await Promise.all(sourceFiles.map(async (file) => {
            expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
        }))
    })

    it('provides Node globals only to conventional Nest files', async () => {
        const directory = createProject({ name: 'nest-project', dependencies: {} })
        addInstalledPackage(directory, '@nestjs/common', '11.1.0')
        const sourceDirectory = path.join(directory, 'src')
        const nestFiles = ['users.controller.ts', 'users.service.ts', 'users.module.ts', 'auth.guard.ts']
            .map((file) => path.join(sourceDirectory, file))
        const otherFile = path.join(sourceDirectory, 'users.repository.ts')
        const files = [...nestFiles, otherFile]
        fs.mkdirSync(sourceDirectory)
        files.forEach((file) => fs.writeFileSync(file, 'export const value = process.pid\n'))
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: false, react: false }),
            overrideConfigFile: true,
        })

        await Promise.all(nestFiles.map(async (file) => {
            expect(hasNodeGlobals(await eslint.calculateConfigForFile(file))).toBe(true)
        }))
        expect(hasNodeGlobals(await eslint.calculateConfigForFile(otherFile))).toBe(false)
    })

    it('rejects Vue 2 when auto detection finds it', () => {
        const directory = createProject({ name: 'vue-two', dependencies: {} })
        addInstalledPackage(directory, 'vue', '2.7.16')
        process.chdir(directory)

        expect(() => brandlen()).toThrow('only Vue 3 is supported')
    })

    it('lints Vue 3 SFCs with the Vue TypeScript adapter', async () => {
        const directory = createProject({ name: 'vue-three', dependencies: {} })
        const sourceFile = path.join(directory, 'Component.vue')
        addInstalledPackage(directory, 'vue', '3.5.0')
        fs.writeFileSync(sourceFile, '<script setup lang="ts">\nconst message: string = \'hello\'\n</script>\n\n<template>{{ message }}</template>\n')
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: true, react: false, nest: false }),
            overrideConfigFile: true,
        })
        const [result] = await eslint.lintFiles([sourceFile])

        expect(result?.fatalErrorCount).toBe(0)
    })

    it('lints TSX with browser globals and React hooks rules', async () => {
        const directory = createProject({ name: 'react-project', dependencies: {} })
        const sourceFile = path.join(directory, 'Component.tsx')
        addInstalledPackage(directory, 'react', '19.2.0')
        fs.writeFileSync(sourceFile, [
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
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: false, react: true, nest: false }),
            overrideConfigFile: true,
        })
        const [result] = await eslint.lintFiles([sourceFile])

        expect(result?.fatalErrorCount).toBe(0)
        expect(result?.messages).toContainEqual(expect.objectContaining({ ruleId: 'react-hooks/rules-of-hooks' }))
        expect(result?.messages).not.toContainEqual(expect.objectContaining({ ruleId: 'no-undef' }))
    })

    it('requires non-root TypeScript files to belong to a tsconfig project', async () => {
        const directory = createProject(
            { name: 'strict-ts-project', dependencies: {} },
            { compilerOptions: { strict: true }, files: ['included.ts'] },
        )
        const includedFile = path.join(directory, 'included.ts')
        const sourceDirectory = path.join(directory, 'src')
        const sourceFile = path.join(sourceDirectory, 'outside.ts')
        fs.writeFileSync(includedFile, 'export const included = true\n')
        fs.mkdirSync(sourceDirectory)
        fs.writeFileSync(sourceFile, 'export const outside = true\n')
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: false, react: false, nest: false }),
            overrideConfigFile: true,
        })
        const [result] = await eslint.lintFiles([sourceFile])

        expect(result?.fatalErrorCount).toBe(1)
    })

    it('applies the consumer project .gitignore', async () => {
        const directory = createProject({ name: 'ignored-file', dependencies: {} })
        const sourceFile = path.join(directory, 'generated.ts')
        fs.writeFileSync(path.join(directory, '.gitignore'), 'generated.ts\n')
        fs.writeFileSync(sourceFile, 'export const generated = true\n')
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
            overrideConfig: brandlen({ vue: false, react: false, nest: false }),
            overrideConfigFile: true,
        })
        const [result] = await eslint.lintFiles([sourceFile])

        expect(result?.warningCount).toBe(1)
        expect(result?.messages[0]?.message).toContain('ignore pattern')
    })

    it('runs typed linting and fixes simple import sorting', async () => {
        const directory = createProject({ name: 'plain-ts', dependencies: {} })
        const sourceFile = path.join(directory, 'example.ts')
        fs.writeFileSync(sourceFile, "import z from 'z'\nimport a from 'a'\n\nconst value: string = 'done'\nconst redundantValue = value as string\n\nexport { z, a, redundantValue }\n")
        process.chdir(directory)

        const eslint = new ESLint({
            cwd: directory,
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
