import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Androids spelare öppnas BARA via appens openNativePlayer (@/lib/plugin-sdk).
 *
 * Bygget bakar in appens egen funktion, och den skickar spelarinställningarna
 * med varje open: "Tillåt mjukvaruavkodning" (allowSoftwareVideo) och
 * bildfrekvensmatchningen. En egen kopia här — ett eget `cmd: 'open'` mot
 * spelarbryggan — skulle tyst tappa dem, så kanaler och VOD i Live TV fick
 * andra avkodarregler än resten av appen.
 */
const runtimeDir = join(__dirname)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sources(full)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

describe('openNativePlayer kommer från appen', () => {
  const files = sources(runtimeDir).map((file) => ({ file: relative(runtimeDir, file), src: readFileSync(file, 'utf8') }))

  it('ingen körningsfil skickar ett eget open-kommando till spelarbryggan', () => {
    const own = files.filter(({ src }) => /cmd:\s*['"]open['"]/.test(src)).map(({ file }) => file)
    expect(own).toEqual([])
  })

  it('ingen körningsfil definierar en egen openNativePlayer', () => {
    const own = files
      .filter(({ src }) => /(function|const|let)\s+openNativePlayer\b/.test(src))
      .map(({ file }) => file)
    expect(own).toEqual([])
  })

  it('spelarytorna importerar openNativePlayer ur plugin-sdk', () => {
    const users = files.filter(({ src }) => /\bopenNativePlayer\s*\(/.test(src))
    expect(users.length).toBeGreaterThan(0)
    for (const { src } of users) {
      expect(src).toMatch(/import\s*\{[^}]*\bopenNativePlayer\b[^}]*\}\s*from\s*'@\/lib\/plugin-sdk'/)
    }
  })
})
