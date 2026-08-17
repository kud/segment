// Screens the interactive browser can open on. `--screen list` prints these, and
// @kud/cli-shot uses that output to screenshot every screen without knowing
// anything about this CLI's structure — so the list and the parser must read
// from one constant rather than drifting apart.
export const SCREENS = ["sources", "catalog"] as const

export type Screen = (typeof SCREENS)[number]

export type ParsedArgv =
  | { kind: "screen-list" }
  | { kind: "interactive"; screen?: Screen; mock: boolean }
  | { kind: "commander" }
  | { kind: "error"; message: string }

// Long flags that consume the following argument. Getting this set wrong is the
// documented failure: discounting `--screen` but not its value leaves `sources`
// sitting in the residual args, so a bare `segment --screen sources` is judged a
// subcommand invocation and dies with "unknown command" instead of opening the
// browser.
const VALUE_FLAGS = new Set(["--screen", "--token", "--region", "--timeout"])

const HELP_FLAGS = new Set(["--help", "-h", "--version", "-V"])

const BOOLEAN_FLAGS = new Set([
  "--mock",
  "--json",
  "--pretty",
  "--color",
  "--no-color",
])

const isScreen = (value: string): value is Screen =>
  (SCREENS as readonly string[]).includes(value)

/**
 * Decide what a raw argv means before commander sees it.
 *
 * Commander is never given the bare form — it has no concept of "no subcommand"
 * that can be distinguished from a parse error — so the interactive launch has
 * to be resolved here, against the global flags that may legitimately accompany
 * it.
 */
export const parseArgv = (argv: string[]): ParsedArgv => {
  const args = argv.slice(2)

  // Help and version are the one class of bare-looking invocation that must not
  // open the browser. They leave no residual argument behind, so the residual
  // test alone reads `segment --help` as bare and launches the TUI over the
  // help text.
  if (args.some((arg) => HELP_FLAGS.has(arg))) return { kind: "commander" }
  const residual: string[] = []
  let screenValue: string | undefined
  let mock = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] as string

    if (arg.startsWith("--") && arg.includes("=")) {
      const [flag, value] = [
        arg.slice(0, arg.indexOf("=")),
        arg.slice(arg.indexOf("=") + 1),
      ]
      if (flag === "--screen") screenValue = value
      continue
    }

    if (VALUE_FLAGS.has(arg)) {
      if (arg === "--screen") screenValue = args[index + 1]
      index += 1
      continue
    }

    if (BOOLEAN_FLAGS.has(arg)) {
      if (arg === "--mock") mock = true
      continue
    }

    if (arg.startsWith("-")) continue

    residual.push(arg)
  }

  if (screenValue === "list") return { kind: "screen-list" }

  if (residual.length > 0) return { kind: "commander" }

  if (screenValue !== undefined && !isScreen(screenValue)) {
    return {
      kind: "error",
      message: `unknown screen "${screenValue}" — expected one of: ${SCREENS.join(", ")}, list`,
    }
  }

  return { kind: "interactive", screen: screenValue, mock }
}
