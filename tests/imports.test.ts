import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import brandlen from '../src/index.js'

import { withProject } from './test-utils.js'

const baseConfig = {
  overrideConfig: brandlen({ vue: false, react: false, nest: false }),
  overrideConfigFile: true,
} satisfies ConstructorParameters<typeof ESLint>[0]

function ruleIds(messages: { ruleId: string | null }[]): string[] {
  return messages.map((message) => message.ruleId ?? '').filter(Boolean)
}

describe('brandlen/imports rules', () => {
  it('import/no-duplicates flags repeat import of the same module', async () => {
    await withProject({ name: 'no-duplicates', dependencies: {} }, async (project) => {
      project.writeFile('m.js', 'export const a = 1\nexport const b = 2\n')
      const sourceFile = project.writeFile(
        'main.ts',
        "import a from './m'\nimport { b } from './m'\n",
      )

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain('import/no-duplicates')
    })
  })

  it('import/no-duplicates is fixable into a single import statement', async () => {
    await withProject({ name: 'no-duplicates-fix', dependencies: {} }, async (project) => {
      project.writeFile('m.js', 'export const a = 1\nexport const b = 2\n')
      const sourceFile = project.writeFile(
        'main.ts',
        "import a from './m'\nimport { b } from './m'\n",
      )

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory, fix: true })
      const results = await eslint.lintFiles([sourceFile])
      await ESLint.outputFixes(results)

      const output = (await import('node:fs')).readFileSync(sourceFile, 'utf8')
      expect(output).toMatch(/import\s+a(?:\s*,\s*\{\s*b\s*\})?\s+from\s+'\.\/m'/)
    })
  })

  it('import/no-self-import flags a module importing itself', async () => {
    await withProject({ name: 'no-self-import', dependencies: {} }, async (project) => {
      const sourceFile = project.writeFile('self.js', "import self from './self'\n")

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain('import/no-self-import')
    })
  })

  it('import/no-useless-path-segments flags redundant path segments', async () => {
    await withProject({ name: 'no-useless-path', dependencies: {} }, async (project) => {
      project.writeFile('c.js', 'export const x = 1\n')
      const sourceFile = project.writeFile('main.ts', "import x from './b/../c'\n")

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain(
        'import/no-useless-path-segments',
      )
    })
  })

  it('import/no-useless-path-segments does not flag a clean relative path', async () => {
    await withProject({ name: 'no-useless-path-pass', dependencies: {} }, async (project) => {
      project.writeFile('c.js', 'export const x = 1\n')
      const sourceFile = project.writeFile('main.ts', "import x from './c'\n")

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(ruleIds(result?.messages ?? [])).not.toContain('import/no-useless-path-segments')
    })
  })

  it('import/no-mutable-exports flags mutable named export', async () => {
    await withProject({ name: 'no-mutable-exports', dependencies: {} }, async (project) => {
      const sourceFile = project.writeFile('main.ts', 'export let count = 0\n')

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain(
        'import/no-mutable-exports',
      )
    })
  })

  it('import/no-empty-named-blocks flags empty named import block', async () => {
    await withProject({ name: 'no-empty-named-blocks', dependencies: {} }, async (project) => {
      const sourceFile = project.writeFile('main.ts', "import {} from 'x'\n")

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      const message = result?.messages.find((m) => m.ruleId === 'import/no-empty-named-blocks')
      expect(message).toBeDefined()
      expect(message?.suggestions).toHaveLength(2)
    })
  })

  it('import/no-empty-named-blocks autofixes side-effect import with empty block', async () => {
    await withProject({ name: 'no-empty-named-blocks-fix', dependencies: {} }, async (project) => {
      const sourceFile = project.writeFile('main.js', "import a, {} from 'x'\n")

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory, fix: true })
      const results = await eslint.lintFiles([sourceFile])
      await ESLint.outputFixes(results)

      const output = (await import('node:fs')).readFileSync(sourceFile, 'utf8')
      expect(output).not.toContain('{}')
    })
  })

  it('import/no-import-module-exports flags import + CommonJS export mix', async () => {
    await withProject({ name: 'no-import-module-exports', dependencies: {} }, async (project) => {
      const sourceFile = project.writeFile(
        'src/lib.ts',
        "import x from 'y'\n\nmodule.exports = x\n",
      )

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain(
        'import/no-import-module-exports',
      )
    })
  })

  it('import/max-dependencies flags more than 20 imports', async () => {
    await withProject({ name: 'max-dependencies-over', dependencies: {} }, async (project) => {
      const lines = Array.from(
        { length: 21 },
        (_, index) => `import m${index} from 'mod-${index}'`,
      ).join('\n')
      const sourceFile = project.writeFile('main.ts', `${lines}\n`)

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain('import/max-dependencies')
    })
  })

  it('import/max-dependencies allows 20 or fewer imports', async () => {
    await withProject({ name: 'max-dependencies-pass', dependencies: {} }, async (project) => {
      const lines = Array.from(
        { length: 20 },
        (_, index) => `import m${index} from 'mod-${index}'`,
      ).join('\n')
      const sourceFile = project.writeFile('main.ts', `${lines}\n`)

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(ruleIds(result?.messages ?? [])).not.toContain('import/max-dependencies')
    })
  })

  it('import/export flags duplicate re-exports', async () => {
    await withProject({ name: 'export-duplicate', dependencies: {} }, async (project) => {
      project.writeFile('a.js', 'export const value = 1\n')
      project.writeFile('b.js', 'export const value = 2\n')
      const sourceFile = project.writeFile(
        'reexport.js',
        "export { value } from './a'\nexport { value } from './b'\n",
      )

      const eslint = new ESLint({ ...baseConfig, cwd: project.directory })
      const [result] = await eslint.lintFiles([sourceFile])

      expect(result?.messages.map((message) => message.ruleId)).toContain('import/export')
    })
  })
})
