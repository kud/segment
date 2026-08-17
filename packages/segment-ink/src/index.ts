// @kud/segment-ink — Ink components for browsing Segment sources, their
// destinations, and the destination catalog. The list components are
// presentation-only: props in, no data fetching, no app-level input, so they
// compose into a full-screen CLI or a single pane in a larger dashboard alike.
export { SourceList, type SourceListProps } from "./components/source-list.js"
export {
  DestinationList,
  type DestinationListProps,
} from "./components/destination-list.js"
export {
  CatalogList,
  type CatalogListProps,
} from "./components/catalog-list.js"
export {
  OptionTable,
  type OptionTableProps,
} from "./components/option-table.js"

// Pure helpers, exported so a host composing its own lists scrolls, pads and
// labels state identically rather than reimplementing any of the three.
export { windowSlice } from "./lib/window.js"
export { fit } from "./lib/fit.js"
export { listRows } from "./lib/rows.js"
export { enabledBadge } from "./lib/enabled.js"

// The client shape the body needs, and a fixture that satisfies it. The mock
// backs the CLI's --mock flag: deterministic data, no network, every method
// implemented.
export type { SegmentLike } from "./lib/segment-like.js"
export { createMockClient } from "./mock-client.js"

// The assembled interactive browser. Embeddable: it does not own the terminal
// or call render(), reporting quit through the required onExit callback, so a
// host — the CLI, a dashboard pane — mounts it as one component and keeps the
// terminal lifecycle to itself.
export { SegmentBody, type SegmentBodyProps } from "./segment-body.js"
