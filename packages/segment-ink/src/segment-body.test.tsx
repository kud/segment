import { EventEmitter } from "node:events"
import { describe, it, expect, vi } from "vitest"
import { render } from "ink-testing-library"
import { render as inkRender } from "ink"
import { SegmentBody } from "./segment-body.js"
import { FIXTURE_AMPLITUDE_API_KEY, createMockClient } from "./mock-client.js"
import type { SegmentLike } from "./lib/segment-like.js"

// Ink renders asynchronously and the body loads on mount, so assertions need a
// tick before the first frame means anything.
const settled = () => new Promise((resolve) => setTimeout(resolve, 60))

// Written as escapes rather than raw bytes: a literal ESC in a source file is
// invisible in a diff and is the first thing lost to anything that normalises
// the text on its way through.
const RIGHT = "\u001B[C"
const LEFT = "\u001B[D"

const spied = (): SegmentLike => {
  const base = createMockClient()
  return {
    listSources: vi.fn(base.listSources),
    getSource: vi.fn(base.getSource),
    listSourceDestinations: vi.fn(base.listSourceDestinations),
    listDestinationMetadata: vi.fn(base.listDestinationMetadata),
    getDestinationMetadata: vi.fn(base.getDestinationMetadata),
  }
}

const mount = (props: Partial<Parameters<typeof SegmentBody>[0]> = {}) =>
  render(
    <SegmentBody onExit={() => {}} client={createMockClient()} {...props} />,
  )

describe("mounting", () => {
  it("leaves loading and lists the workspace's sources", async () => {
    const { lastFrame } = mount()
    await settled()
    const frame = lastFrame() ?? ""
    expect(frame).not.toContain("Loading")
    expect(frame).toContain("Marketing Site")
    expect(frame).toContain("Orders Service")
  })

  it("offers no per-source tabs until a source is chosen", async () => {
    const { lastFrame } = mount()
    await settled()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Sources")
    expect(frame).toContain("Catalog")
    expect(frame).not.toContain("Destinations")
  })

  // Setting the view without fetching lands on a tab that never loaded, which
  // on screen is indistinguishable from a genuinely empty catalog.
  it("opens on the catalog with its data already read", async () => {
    const client = spied()
    const { lastFrame } = mount({ client, screen: "catalog" })
    await settled()
    expect(client.listDestinationMetadata).toHaveBeenCalled()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("google-analytics-4")
    expect(frame).toContain("5 destination types")
    expect(frame).not.toContain("Marketing Site")
  })

  it("opens straight into a source when given one", async () => {
    const client = spied()
    const { lastFrame } = mount({ client, sourceId: "src_01website" })
    await settled()
    expect(client.listSourceDestinations).toHaveBeenCalledWith("src_01website")
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Destinations")
    expect(frame).toContain("Ops Webhook")
  })
})

describe("navigating", () => {
  it("drills into a source with the right arrow and loads its destinations", async () => {
    const client = spied()
    const { lastFrame, stdin } = mount({ client })
    await settled()
    stdin.write(RIGHT)
    await settled()
    expect(client.listSourceDestinations).toHaveBeenCalledWith("src_01website")
    expect(lastFrame()).toContain("Amplitude")
  })

  it("comes back out to the source list with the left arrow", async () => {
    const { lastFrame, stdin } = mount({ sourceId: "src_01website" })
    await settled()
    stdin.write(LEFT)
    await settled()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Orders Service")
    expect(frame).not.toContain("Destinations")
  })

  it("switches to Info and shows the full write keys", async () => {
    const { lastFrame, stdin } = mount({ sourceId: "src_01website" })
    await settled()
    stdin.write("\t")
    await settled()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("wk_mkt_9f2a41c7b8d0")
    expect(frame).toContain("Javascript")
  })

  it("reads a catalog entry's schema on enter rather than trusting the row", async () => {
    const client = spied()
    const { lastFrame, stdin } = mount({ client, screen: "catalog" })
    await settled()
    stdin.write("\r")
    await settled()
    expect(client.getDestinationMetadata).toHaveBeenCalledWith("meta_amplitude")
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Amplitude settings")
    expect(frame).toContain("Residency Server")
  })

  it("shows a destination's settings in its detail panel", async () => {
    const { lastFrame, stdin } = mount({ sourceId: "src_01website" })
    await settled()
    stdin.write("\r")
    await settled()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("trackAllPages")
    expect(frame).toContain(FIXTURE_AMPLITUDE_API_KEY)
  })

  it("quits through onExit rather than owning the terminal", async () => {
    let exited = false
    const { stdin } = mount({ onExit: () => (exited = true) })
    await settled()
    stdin.write("q")
    expect(exited).toBe(true)
  })
})

describe("failure", () => {
  it("leaves the error on screen rather than an empty list", async () => {
    const client = spied()
    client.listSources = vi.fn(async () => {
      throw new Error("token expired")
    })
    const { lastFrame } = mount({ client })
    await settled()
    expect(lastFrame()).toContain("token expired")
  })
})

describe("the mock client", () => {
  // A gap here does not fail loudly — it falls through to whatever the host
  // injected instead, and the screenshot ends up half fixture, half workspace.
  it("implements every method the body can call", () => {
    const client = createMockClient()
    for (const method of [
      "listSources",
      "getSource",
      "listSourceDestinations",
      "listDestinationMetadata",
      "getDestinationMetadata",
    ] as const) {
      expect(typeof client[method]).toBe("function")
    }
  })

  it("carries an Amplitude destination, as the CLI's screenshots assume", async () => {
    const client = createMockClient()
    const destinations = await client.listSourceDestinations("src_01website")
    expect(
      destinations.some((entry) => entry.metadata.slug === "amplitude"),
    ).toBe(true)
  })

  it("returns the same data twice, so a screenshot is reproducible", async () => {
    const client = createMockClient()
    expect(await client.listSources()).toEqual(await client.listSources())
  })
})

// ink-testing-library reports no height and a fixed 100 columns, which is the
// one size where none of the layout budgeting is exercised. This stands in for
// a terminal of a given size, resizable the way a real one is.
class SizedStdout extends EventEmitter {
  isTTY = true
  frame = ""
  constructor(
    public columns: number,
    public rows: number,
  ) {
    super()
  }
  write = (frame: string) => {
    this.frame = frame
    return true
  }
  resize(columns: number, rows: number) {
    this.columns = columns
    this.rows = rows
    this.emit("resize")
  }
}

class KeyStdin extends EventEmitter {
  isTTY = true
  private data: string | null = null
  write = (data: string) => {
    this.data = data
    this.emit("readable")
    this.emit("data", data)
  }
  read = () => {
    const { data } = this
    this.data = null
    return data
  }
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g")

const mountSized = (
  columns: number,
  rows: number,
  props: Partial<Parameters<typeof SegmentBody>[0]> = {},
) => {
  const stdout = new SizedStdout(columns, rows)
  const stdin = new KeyStdin()
  const app = inkRender(
    <SegmentBody onExit={() => {}} client={createMockClient()} {...props} />,
    {
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
      debug: true,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  )
  const lines = () => stdout.frame.replace(ANSI, "").split("\n")
  return { app, stdout, stdin, lines }
}

const widest = (lines: string[]) =>
  Math.max(...lines.map((line) => [...line].length))

describe("layout at a real terminal size", () => {
  it("keeps the footer on screen with a destination open on a short terminal", async () => {
    const { app, stdin, lines } = mountSized(80, 16, {
      sourceId: "src_01website",
    })
    await settled()
    stdin.write("\r")
    await settled()
    expect(lines().length).toBeLessThanOrEqual(16)
    expect(lines().at(-1)).toContain("close")
    expect(lines().join("\n")).toContain("more settings")
    app.unmount()
  })

  it("keeps the footer on screen with a catalog entry open on a short terminal", async () => {
    const { app, stdin, lines } = mountSized(80, 16, { screen: "catalog" })
    await settled()
    stdin.write("\r")
    await settled()
    expect(lines().length).toBeLessThanOrEqual(16)
    expect(lines().at(-1)).toContain("close")
    app.unmount()
  })

  // Four fixed columns came to 92 cells and ran straight through the panel's
  // right border on an 80-column terminal.
  it("fits the catalog settings table inside its panel at 80 columns", async () => {
    const { app, stdin, lines } = mountSized(80, 30, { screen: "catalog" })
    await settled()
    stdin.write("\r")
    await settled()
    expect(lines().join("\n")).toContain("Residency Server")
    expect(widest(lines())).toBeLessThanOrEqual(80)
    app.unmount()
  })

  // Shrinking the window while the screen sits idle used to keep the old row
  // budget until the next keypress, so the footer was the first thing lost.
  it("re-budgets on resize without waiting for a keypress", async () => {
    const { app, stdout, stdin, lines } = mountSized(80, 40, {
      sourceId: "src_01website",
    })
    await settled()
    stdin.write("\r")
    await settled()
    expect(lines().join("\n")).toContain("residencyServer")
    stdout.resize(80, 16)
    await settled()
    expect(lines().length).toBeLessThanOrEqual(16)
    expect(lines().at(-1)).toContain("close")
    app.unmount()
  })
})
