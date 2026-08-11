import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const outputArgument = process.argv[2]
if (!outputArgument) {
  throw new Error('必须提供发布元数据输出路径。')
}

const workspaceRoot = process.cwd()
const outputPath = resolve(workspaceRoot, outputArgument)
const [lockfile, packageJson] = await Promise.all([
  readFile(resolve(workspaceRoot, 'pnpm-lock.yaml')),
  readFile(resolve(workspaceRoot, 'package.json'), 'utf8'),
])
const packageMetadata = JSON.parse(packageJson)
const commitSha = process.env.BUILD_SHA || process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown'

if (process.env.REQUIRE_BUILD_SHA === '1' && commitSha === 'unknown') {
  throw new Error('受控构建必须提供 BUILD_SHA。')
}

const metadata = {
  schemaVersion: 1,
  application: packageMetadata.name,
  version: process.env.APP_VERSION || packageMetadata.version,
  commitSha,
  buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_ID || process.env.CI_PIPELINE_ID || null,
  nodeVersion: process.version,
  lockfileSha256: createHash('sha256').update(lockfile).digest('hex'),
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`)
