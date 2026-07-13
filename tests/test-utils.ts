import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ESLint } from 'eslint'

import brandlen from '../src/index.js'

const originalCwd = process.cwd()

export interface ProjectHandle {
    directory: string
    addPackage(packageName: string, version: string): void
    writeFile(relativePath: string, content: string): string
}

function isThenable(value: unknown): value is Promise<unknown> {
    return value !== null && typeof (value as { then?: unknown })?.then === 'function'
}

export function withProject<T>(
    packageJson: object,
    test: (handle: ProjectHandle) => T,
    tsconfig: object = { compilerOptions: { strict: true } },
): T {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brandlen-eslint-'))
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(packageJson))
    fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify(tsconfig))
    process.chdir(directory)

    const handle: ProjectHandle = {
        directory,
        addPackage(packageName: string, version: string): void {
            const packageDirectory = path.join(directory, 'node_modules', ...packageName.split('/'))
            fs.mkdirSync(packageDirectory, { recursive: true })
            fs.writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify({ name: packageName, version }))
            fs.writeFileSync(path.join(packageDirectory, 'index.js'), `module.exports = { version: '${version}' }\n`)
        },
        writeFile(relativePath: string, content: string): string {
            const filePath = path.join(directory, relativePath)
            fs.mkdirSync(path.dirname(filePath), { recursive: true })
            fs.writeFileSync(filePath, content)
            return filePath
        },
    }

    const cleanup = (): void => {
        process.chdir(originalCwd)
        fs.rmSync(directory, { recursive: true, force: true })
    }

    try {
        const result = test(handle)
        if (isThenable(result)) {
            return result.finally(cleanup) as T
        }
        cleanup()
        return result
    } catch (error) {
        cleanup()
        throw error
    }
}

export function configNames(configs: ReturnType<typeof brandlen>): string[] {
    return configs.flatMap((config) => config.name === undefined ? [] : [config.name])
}

export function hasNodeGlobals(config: Awaited<ReturnType<ESLint['calculateConfigForFile']>> | undefined): boolean {
    return config?.languageOptions?.globals?.process !== undefined
}
