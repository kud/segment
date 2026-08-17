import assert from "node:assert/strict"
import { test } from "node:test"

import { SCREENS, parseArgv } from "../src/argv.js"

const argv = (...args: string[]) => ["node", "segment", ...args]

test("a bare invocation opens the interactive browser", () => {
  assert.deepEqual(parseArgv(argv()), {
    kind: "interactive",
    screen: undefined,
    mock: false,
  })
})

test("--mock stays a bare invocation", () => {
  assert.deepEqual(parseArgv(argv("--mock")), {
    kind: "interactive",
    screen: undefined,
    mock: true,
  })
})

// The documented trap: discounting `--screen` without also discounting the value
// after it leaves "sources" looking like a subcommand, and the CLI dies with
// "unknown command" instead of opening the browser.
test("--screen <name> does not leak its value as a subcommand", () => {
  assert.deepEqual(parseArgv(argv("--screen", "sources")), {
    kind: "interactive",
    screen: "sources",
    mock: false,
  })
})

test("--screen=<name> is handled too", () => {
  assert.deepEqual(parseArgv(argv("--screen=catalog")), {
    kind: "interactive",
    screen: "catalog",
    mock: false,
  })
})

test("--screen list asks for the screen names", () => {
  assert.deepEqual(parseArgv(argv("--screen", "list")), {
    kind: "screen-list",
  })
})

// Every value-taking global flag has to be discounted, not just --screen, or an
// auth override turns a bare invocation into a bogus subcommand.
test("value-taking global flags stay a bare invocation", () => {
  assert.deepEqual(parseArgv(argv("--token", "abc", "--region", "eu")), {
    kind: "interactive",
    screen: undefined,
    mock: false,
  })
})

test("a real subcommand routes to commander", () => {
  assert.equal(parseArgv(argv("sources", "list")).kind, "commander")
})

test("a subcommand behind global flags still routes to commander", () => {
  assert.equal(
    parseArgv(argv("--json", "--token", "abc", "sources")).kind,
    "commander",
  )
})

test("an unknown screen is rejected rather than silently ignored", () => {
  const parsed = parseArgv(argv("--screen", "nope"))
  assert.equal(parsed.kind, "error")
  assert.match(parsed.kind === "error" ? parsed.message : "", /unknown screen/)
})

test("every advertised screen parses", () => {
  for (const screen of SCREENS) {
    assert.deepEqual(parseArgv(argv("--screen", screen)), {
      kind: "interactive",
      screen,
      mock: false,
    })
  }
})

// --help and --version leave no residual argument, so the residual test alone
// reads them as a bare invocation and opens the TUI over the help text.
test("--help routes to commander rather than opening the browser", () => {
  assert.equal(parseArgv(argv("--help")).kind, "commander")
  assert.equal(parseArgv(argv("-h")).kind, "commander")
})

test("--version routes to commander", () => {
  assert.equal(parseArgv(argv("--version")).kind, "commander")
  assert.equal(parseArgv(argv("-V")).kind, "commander")
})

test("help on a subcommand still routes to commander", () => {
  assert.equal(parseArgv(argv("destinations", "--help")).kind, "commander")
})
