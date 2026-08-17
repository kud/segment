import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const freshConfigModule = async (xdgConfigHome: string) => {
  process.env["XDG_CONFIG_HOME"] = xdgConfigHome
  return import(`../src/config.js?fresh=${Date.now()}-${Math.random()}`)
}

const withEnv = async (
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> => {
  const saved = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, process.env[key]]),
  )
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await fn()
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("resolveConfig precedence: file < env < overrides", async () => {
  const dir = mkdtempSync(join(tmpdir(), "segment-cli-test-"))
  const configDir = join(dir, "segment-cli")
  mkdirSync(configDir, { recursive: true })
  writeFileSync(
    join(configDir, "config.json"),
    JSON.stringify({ token: "file-token", region: "eu" }),
  )

  await withEnv(
    { SEGMENT_API_TOKEN: undefined, SEGMENT_API_REGION: undefined },
    async () => {
      const mod = await freshConfigModule(dir)

      const fileOnly = mod.resolveConfig()
      assert.equal(fileOnly.token, "file-token")
      assert.equal(fileOnly.region, "eu")

      await withEnv(
        { SEGMENT_API_TOKEN: "env-token", SEGMENT_API_REGION: "us" },
        async () => {
          const withEnvValues = mod.resolveConfig()
          assert.equal(withEnvValues.token, "env-token")
          assert.equal(withEnvValues.region, "us")

          const withOverrides = mod.resolveConfig({
            token: "override-token",
            region: "eu",
          })
          assert.equal(withOverrides.token, "override-token")
          assert.equal(withOverrides.region, "eu")
        },
      )
    },
  )
})

test("empty-string env vars do not clobber a real config-file value", async () => {
  const dir = mkdtempSync(join(tmpdir(), "segment-cli-test-"))
  const configDir = join(dir, "segment-cli")
  mkdirSync(configDir, { recursive: true })
  writeFileSync(
    join(configDir, "config.json"),
    JSON.stringify({ token: "file-token", region: "eu" }),
  )

  await withEnv({ SEGMENT_API_TOKEN: "", SEGMENT_API_REGION: "" }, async () => {
    const mod = await freshConfigModule(dir)
    const resolved = mod.resolveConfig()
    assert.equal(resolved.token, "file-token")
    assert.equal(resolved.region, "eu")
  })
})

test("normalizeRegion accepts only us or eu", async () => {
  const dir = mkdtempSync(join(tmpdir(), "segment-cli-test-"))
  const mod = await freshConfigModule(dir)
  assert.equal(mod.normalizeRegion("US"), "us")
  assert.equal(mod.normalizeRegion("eu"), "eu")
  assert.throws(() => mod.normalizeRegion("apac"))
})

test("resolveConfig throws for an invalid region", async () => {
  const dir = mkdtempSync(join(tmpdir(), "segment-cli-test-"))
  const mod = await freshConfigModule(dir)
  assert.throws(() => mod.resolveConfig({ region: "apac" }))
})
