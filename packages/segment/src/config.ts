import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

export type Region = "us" | "eu"

export type SegmentConfig = {
  token?: string
  region?: Region
}

export type ResolvedConfig = {
  token?: string
  region: Region
  timeout?: number
}

export type ConfigOverrides = {
  token?: string
  region?: string
  timeout?: number
}

const xdgConfigHome =
  process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config")

export const CONFIG_FILE = join(xdgConfigHome, "segment-cli", "config.json")

export const normalizeRegion = (value: string): Region => {
  const lower = value.toLowerCase()
  if (lower === "us" || lower === "eu") return lower
  throw new Error(`invalid region "${value}" — expected "us" or "eu"`)
}

export const loadConfig = (): SegmentConfig => {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as SegmentConfig
  } catch {
    return {}
  }
}

export const saveConfig = (partial: SegmentConfig): SegmentConfig => {
  const merged = { ...loadConfig(), ...partial }
  mkdirSync(dirname(CONFIG_FILE), { recursive: true })
  writeFileSync(CONFIG_FILE, `${JSON.stringify(merged, null, 2)}\n`)
  return merged
}

const cleanString = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value

export const resolveConfig = (
  overrides: ConfigOverrides = {},
): ResolvedConfig => {
  const file = loadConfig()
  const envToken = cleanString(process.env["SEGMENT_API_TOKEN"])
  const envRegion = cleanString(process.env["SEGMENT_API_REGION"])
  const envTimeout = cleanString(process.env["SEGMENT_TIMEOUT"])

  const token = overrides.token ?? envToken ?? file.token
  const regionInput = overrides.region ?? envRegion ?? file.region ?? "us"
  const timeout =
    overrides.timeout ?? (envTimeout ? Number(envTimeout) : undefined)

  return {
    token,
    region: normalizeRegion(regionInput),
    timeout,
  }
}
