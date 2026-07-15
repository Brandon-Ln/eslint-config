import { defineConfig, type VersionBumpOptions } from 'bumpp'

const config: Partial<VersionBumpOptions> = defineConfig({
  commit: 'chore(release): v%s',
  execute: 'pnpm verify',
  noGitCheck: false,
  tag: 'v%s',
})

export default config
