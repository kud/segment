import { render } from "ink"
import { SegmentClient, resolveConfig } from "@kud/segment"
import {
  SegmentBody,
  createMockClient,
  type SegmentLike,
} from "@kud/segment-ink"

import type { Screen } from "./argv.js"

// The browser itself lives in @kud/segment-ink so another host — a dashboard
// pane, a different CLI — can mount the same component rather than shelling out
// to `segment`. What remains here is the terminal lifecycle, which only a
// standalone CLI should own, and resolving the credential before any of it
// starts.
//
// The token is read here rather than left to the component. A missing token
// throws, and a throw inside the render happens after the alternate screen is
// already up — its message lands in a buffer torn down microseconds later, so
// the command looks like it exited silently. The guidance only survives if it
// precedes the switch.
export type BrowseOptions = {
  screen?: Screen
  mock: boolean
}

const NO_TOKEN_GUIDANCE = [
  "No Segment API token configured.",
  "",
  "Create a Public API token (not the legacy Config API token):",
  "  Segment dashboard → Settings → Access Management → Tokens → +Create Token",
  "",
  "Then supply it any of these ways:",
  "  export SEGMENT_API_TOKEN=<token>",
  "  segment config set --token <token>",
  "  segment --token <token>",
  "",
  "Or explore the interface with fixture data and no credential:",
  "  segment --mock",
].join("\n")

const resolveClient = (mock: boolean): SegmentLike | null => {
  if (mock) return createMockClient()

  const { token, region, timeout } = resolveConfig()
  if (!token) return null

  return new SegmentClient(token, { region, timeout })
}

// Ink puts stdin into raw mode to read keys, which a pipe, a CI runner or a
// sandbox cannot provide. It throws from inside the React commit, so the failure
// reaches the user as an uncaught stack trace through react-reconciler rather
// than anything they can act on. Refuse before mounting instead.
const NO_TTY_GUIDANCE = [
  "The interactive browser needs an interactive terminal, and stdin is not a TTY.",
  "",
  "Use a subcommand instead, which works fine when piped:",
  "  segment sources list --json",
].join("\n")

export const startBrowse = async ({
  screen,
  mock,
}: BrowseOptions): Promise<void> => {
  if (!process.stdin.isTTY) {
    process.stderr.write(`${NO_TTY_GUIDANCE}\n`)
    process.exitCode = 1
    return
  }

  const client = resolveClient(mock)

  if (!client) {
    process.stderr.write(`${NO_TOKEN_GUIDANCE}\n`)
    process.exitCode = 1
    return
  }

  const { unmount, waitUntilExit } = render(
    <SegmentBody client={client} screen={screen} onExit={() => unmount()} />,
    { alternateScreen: true },
  )

  await waitUntilExit()
}
