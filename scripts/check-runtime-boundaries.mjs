import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const pluginsRoot = path.join(repoRoot, 'plugins')

const STRICT = process.argv.includes('--strict')
const ALLOWED_APP_ALIAS_IMPORTS = new Set(['@/lib/plugin-sdk'])

const LEGACY_ALLOWLIST = new Map([
  ['plugins/homekit/runtime/index.ts::@/components/settings/homekit-section', 'Move HomeKit settings UI into the plugin runtime.'],
  ['plugins/live-tv/runtime/index.ts::@/components/settings/live-tv-settings-section', 'Move Live TV settings UI into the plugin runtime.'],
  ['plugins/live-tv/runtime/index.ts::@/lib/plugins/live-tv/live-tv-home-override', 'Move Live TV home override into the plugin runtime.'],
  ['plugins/plex/runtime/index.ts::@/components/settings/plex-section', 'Move Plex settings UI into the plugin runtime.'],
  ['plugins/plex/runtime/index.ts::@/lib/plugins/plex/plex-home-override', 'Move Plex home override into the plugin runtime.'],
  ['plugins/plex/runtime/index.ts::@/lib/plugins/plex/sync-identity-provider', 'Move Plex sync identity provider into the plugin runtime or expose a generic host contract.'],
  ['plugins/plex/runtime/playback-capability-provider.ts::@/lib/playback-capabilities', 'Move Plex matching/playability logic into the plugin runtime or a generic host contract.'],
  ['plugins/trakt/runtime/index.ts::@/components/settings/trakt-section', 'Move Trakt settings UI into the plugin runtime.'],
])

const IMPORT_PATTERN =
  /import\s+(?:type\s+)?(?:[\w*\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/g

function isRelativeImport(source) {
  return source.startsWith('./') || source.startsWith('../')
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(absolute))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute)
  }
  return files
}

const runtimeFiles = await walk(pluginsRoot)
const runtimeSourceFiles = runtimeFiles.filter((file) => file.includes(`${path.sep}runtime${path.sep}`))

const violations = []
const legacyHits = new Set()

for (const file of runtimeSourceFiles) {
  const relativeFile = path.relative(repoRoot, file).split(path.sep).join('/')
  const source = await readFile(file, 'utf8')

  let match
  while ((match = IMPORT_PATTERN.exec(source)) !== null) {
    const specifier = match[1]
    if (isRelativeImport(specifier)) continue
    if (!specifier.startsWith('@/')) continue
    if (ALLOWED_APP_ALIAS_IMPORTS.has(specifier)) continue

    const allowlistKey = `${relativeFile}::${specifier}`
    const legacyNote = LEGACY_ALLOWLIST.get(allowlistKey)
    if (legacyNote) {
      legacyHits.add(allowlistKey)
      violations.push({
        file: relativeFile,
        specifier,
        state: 'legacy',
        note: legacyNote,
      })
      continue
    }

    violations.push({
      file: relativeFile,
      specifier,
      state: 'forbidden',
      note: 'Runtime code may only import from @/lib/plugin-sdk or relative plugin-local files.',
    })
  }
}

const staleAllowlistEntries = [...LEGACY_ALLOWLIST.keys()].filter((key) => !legacyHits.has(key))

if (violations.length === 0 && staleAllowlistEntries.length === 0) {
  console.log('[plugin-boundary] OK: runtime imports are within the declared SDK boundary.')
  process.exit(0)
}

console.log('[plugin-boundary] Runtime boundary report')
for (const violation of violations) {
  const prefix = violation.state === 'legacy' ? 'LEGACY' : 'ERROR'
  console.log(`- ${prefix} ${violation.file}`)
  console.log(`  import: ${violation.specifier}`)
  console.log(`  note: ${violation.note}`)
}

for (const key of staleAllowlistEntries) {
  console.log(`- STALE allowlist entry ${key}`)
}

if (STRICT && (violations.some((entry) => entry.state === 'forbidden') || staleAllowlistEntries.length > 0)) {
  process.exit(1)
}
