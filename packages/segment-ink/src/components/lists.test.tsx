import { describe, it, expect } from "vitest"
import { render } from "ink-testing-library"
import type { Destination, DestinationMetadata, Source } from "@kud/segment"
import { SourceList } from "./source-list.js"
import { DestinationList } from "./destination-list.js"
import { CatalogList } from "./catalog-list.js"
import { OptionTable } from "./option-table.js"

const SOURCES = [
  {
    id: "src_a",
    slug: "marketing-site",
    name: "Marketing Site",
    enabled: true,
    workspaceId: "wsp_1",
    writeKeys: ["wk_abcdefgh_secret_tail"],
  },
  {
    id: "src_b",
    slug: "ios-app",
    name: "iOS App",
    enabled: false,
    workspaceId: "wsp_1",
    writeKeys: [],
  },
] as Source[]

const DESTINATIONS = [
  {
    id: "dst_a",
    name: "Amplitude",
    enabled: true,
    sourceId: "src_a",
    metadata: { id: "meta_amp", name: "Amplitude", slug: "amplitude" },
    settings: {},
  },
] as Destination[]

const CATALOG = [
  {
    id: "meta_amp",
    name: "Amplitude",
    slug: "amplitude",
    categories: ["Analytics", "Product Analytics"],
    options: [],
  },
] as DestinationMetadata[]

describe("SourceList", () => {
  it("renders the rows it is given", () => {
    const { lastFrame } = render(
      <SourceList sources={SOURCES} selected={0} rows={10} />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Marketing Site")
    expect(frame).toContain("ios-app")
  })

  // The two states must survive a palette being stripped, so each carries a
  // glyph and a word rather than only a colour.
  it("separates enabled from disabled by text, not only by colour", () => {
    const frame =
      render(<SourceList sources={SOURCES} selected={0} rows={10} />)
        .lastFrame() ?? ""
    expect(frame).toContain("✓ enabled")
    expect(frame).toContain("✗ disabled")
  })

  it("shows only the head of a write key", () => {
    const frame =
      render(<SourceList sources={SOURCES} selected={0} rows={10} />)
        .lastFrame() ?? ""
    expect(frame).toContain("wk_abcde")
    expect(frame).not.toContain("secret_tail")
  })

  it("says so rather than rendering nothing when there is nothing", () => {
    const { lastFrame } = render(<SourceList sources={[]} rows={10} />)
    expect(lastFrame()).toContain("No sources")
  })
})

describe("DestinationList", () => {
  it("renders the name and the integration slug", () => {
    const { lastFrame } = render(
      <DestinationList destinations={DESTINATIONS} selected={0} rows={10} />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Amplitude")
    expect(frame).toContain("amplitude")
  })
})

describe("CatalogList", () => {
  it("renders the categories alongside the entry", () => {
    const { lastFrame } = render(
      <CatalogList entries={CATALOG} selected={0} rows={10} />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Amplitude")
    expect(frame).toContain("Product Analytics")
  })
})

describe("OptionTable", () => {
  it("spells the required column out both ways", () => {
    const { lastFrame } = render(
      <OptionTable
        rows={10}
        options={[
          { name: "apiKey", type: "string", required: true },
          { name: "secretKey", type: "string", required: false },
        ]}
      />,
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("✓ yes")
    expect(frame).toContain("· no")
  })

  it("declares what it hid rather than dropping it silently", () => {
    const options = Array.from({ length: 8 }, (_, i) => ({
      name: `opt${i}`,
      type: "string",
      required: false,
    }))
    const { lastFrame } = render(<OptionTable options={options} rows={3} />)
    expect(lastFrame()).toContain("5 more settings")
  })
})
