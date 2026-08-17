import { useEffect, useState } from "react"
import { Box, Text, useInput, useStdout } from "ink"
import {
  FooterHints,
  KeyValue,
  Spinner,
  StatusMessage,
  Tabs,
  colors,
  type Hint,
  type TabItem,
} from "@kud/ink-ui"
import type {
  Destination,
  DestinationMetadata,
  SegmentClient,
  Source,
} from "@kud/segment"
import { listRows } from "./lib/rows.js"
import type { SegmentLike } from "./lib/segment-like.js"
import { enabledBadge } from "./lib/enabled.js"
import { SourceList } from "./components/source-list.js"
import { DestinationList } from "./components/destination-list.js"
import { CatalogList } from "./components/catalog-list.js"
import { OptionTable } from "./components/option-table.js"

export type SegmentBodyProps = {
  /** Called when the user quits. The host owns the terminal lifecycle. */
  onExit: () => void
  /** An authenticated client. The host resolves credentials and injects it. */
  client: SegmentClient | SegmentLike
  /** Optional initial view, so a host can open straight onto a screen. */
  screen?: "sources" | "catalog"
  /** Optional initial source id, to open straight into one source. */
  sourceId?: string
}

// Three axes, and the first two are the navigation model. `View` is the depth —
// you are either picking a source or inside one — and `Tab` only means anything
// at one of those depths, because a source's destinations belong to that source
// while the catalog sits beside the whole source list rather than under any of
// them. `Phase` is orthogonal to both: what the screen is doing right now.
// Keeping them separate is what lets a single useInput dispatch by phase, then
// view, with no focus manager and no nested handlers.
type View = "sources" | "source"
type Tab = "sources" | "catalog" | "destinations" | "info"
type Phase = "loading" | "browsing" | "error"

// The detail panels are not a fourth view. They read the row already selected
// rather than navigating anywhere, so making them a `View` would mean a second
// cursor and a second back-stack for something the user closes with the same
// key they opened it with.
type Detail = "destination" | "catalog" | null

const ROOT_TABS: TabItem<Tab>[] = [
  { value: "sources", label: "Sources" },
  { value: "catalog", label: "Catalog" },
]

const SOURCE_TABS: TabItem<Tab>[] = [
  { value: "destinations", label: "Destinations" },
  { value: "info", label: "Info" },
]

const tabsFor = (view: View): TabItem<Tab>[] =>
  view === "sources" ? ROOT_TABS : SOURCE_TABS

const TAB_HINTS: Record<Tab, Hint[]> = {
  sources: [
    ["↑↓", "navigate"],
    ["↵/→", "open"],
    ["tab", "switch"],
    ["r", "reload"],
    ["q", "quit"],
  ],
  catalog: [
    ["↑↓", "navigate"],
    ["↵", "settings"],
    ["tab", "switch"],
    ["r", "reload"],
    ["q", "quit"],
  ],
  destinations: [
    ["↑↓", "navigate"],
    ["↵", "detail"],
    ["tab", "switch"],
    ["←", "sources"],
    ["r", "reload"],
    ["q", "quit"],
  ],
  info: [
    ["tab", "switch"],
    ["←", "sources"],
    ["r", "reload"],
    ["q", "quit"],
  ],
}

const DETAIL_HINTS: Hint[] = [
  ["←/esc", "close"],
  ["q", "quit"],
]

// Chrome is the tab strip, the subtitle, the footer and their margins. The list
// gives up rows to any open detail panel because the panels are siblings here,
// not absolutely positioned — a panel that is not budgeted for pushes the
// footer off the bottom of the screen instead of covering the list.
const CHROME_ROWS = 8
// Only used when stdout reports no size at all — a pipe, or a test harness.
const FALLBACK_ROWS = 24
// A panel's border, the margin above it, and its heading.
const DETAIL_CHROME_ROWS = 4
const DETAIL_MAX_ROWS = 10

const clock = (at: Date): string => at.toTimeString().slice(0, 8)

const describeValue = (value: unknown): string =>
  value === null || value === undefined
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value)

export const SegmentBody = ({
  onExit,
  client,
  screen,
  sourceId: initialSourceId,
}: SegmentBodyProps) => {
  const { stdout } = useStdout()
  const api = client as SegmentLike

  const [view, setView] = useState<View>(
    initialSourceId ? "source" : "sources",
  )
  const [tab, setTab] = useState<Tab>(
    initialSourceId ? "destinations" : screen === "catalog" ? "catalog" : "sources",
  )
  const [phase, setPhase] = useState<Phase>("loading")
  const [cursor, setCursor] = useState(0)
  const [detail, setDetail] = useState<Detail>(null)

  const [sources, setSources] = useState<Source[]>([])
  const [source, setSource] = useState<Source | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [catalog, setCatalog] = useState<DestinationMetadata[]>([])
  const [catalogDetail, setCatalogDetail] = useState<DestinationMetadata | null>(
    null,
  )
  const [message, setMessage] = useState("")
  const [readAt, setReadAt] = useState<Date | null>(null)

  const load = async (read: () => Promise<void>) => {
    setPhase("loading")
    try {
      await read()
      // A reload that finds identical data changes nothing on screen, so
      // without a timestamp `r` looks broken even though it re-read everything.
      setReadAt(new Date())
      setPhase("browsing")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      setPhase("error")
    }
  }

  const loadSources = () =>
    load(async () => setSources(await api.listSources()))

  const loadCatalog = () =>
    load(async () => setCatalog(await api.listDestinationMetadata()))

  // The source record and its destinations arrive together because the Info tab
  // and the breadcrumb both want the source itself, and fetching it lazily on
  // the tab switch left the breadcrumb reading the raw id until then.
  const loadSource = (id: string) =>
    load(async () => {
      const [detailed, dests] = await Promise.all([
        api.getSource(id),
        api.listSourceDestinations(id),
      ])
      setSource(detailed)
      setDestinations(dests)
    })

  const currentSourceId = (): string | null => source?.id ?? initialSourceId ?? null

  const reload = (): Promise<void> => {
    if (view === "source") {
      const id = currentSourceId()
      return id ? loadSource(id) : loadSources()
    }
    return tab === "catalog" ? loadCatalog() : loadSources()
  }

  const openSource = (id: string) => {
    setView("source")
    setTab("destinations")
    setCursor(0)
    setDetail(null)
    void loadSource(id)
  }

  const backToSources = () => {
    setView("sources")
    setTab("sources")
    setCursor(0)
    setDetail(null)
    setSource(null)
    void loadSources()
  }

  // Each tab owns what it loads, so switching never leaves the previous tab's
  // rows on screen under a new heading — and a tab reached through the `screen`
  // prop fetches exactly as it would have on a keypress. Setting the tab alone
  // would land on a screen that never fetched, which reads as a genuinely empty
  // workspace rather than as a missing call.
  const loadTab = (which: Tab): Promise<void> => {
    if (which === "sources") return loadSources()
    if (which === "catalog") return loadCatalog()
    const id = currentSourceId()
    return id ? loadSource(id) : loadSources()
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setCursor(0)
    setDetail(null)
    void loadTab(next)
  }

  useEffect(() => {
    void (initialSourceId ? loadSource(initialSourceId) : loadTab(tab))
  }, [])

  // The list response is lean by design on the real API, so the settings schema
  // is read per entry rather than assumed to have travelled with the row.
  const openCatalogDetail = () => {
    const entry = catalog[cursor]
    if (!entry) return
    setDetail("catalog")
    void load(async () =>
      setCatalogDetail(await api.getDestinationMetadata(entry.id)),
    )
  }

  const openDestinationDetail = () => {
    if (!destinations[cursor]) return
    setDetail("destination")
  }

  const closeDetail = () => {
    setDetail(null)
    setCatalogDetail(null)
  }

  const rowCount = (): number =>
    view === "sources"
      ? tab === "sources"
        ? sources.length
        : catalog.length
      : tab === "destinations"
        ? destinations.length
        : 0

  useInput((input, key) => {
    if (input === "q") return onExit()

    if (phase === "loading") return
    if (phase === "error") {
      if (input === "r") return void reload()
      setPhase("browsing")
      return
    }

    if (detail) {
      if (key.leftArrow || key.escape || key.return) closeDetail()
      return
    }

    if (input === "r") return void reload()
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1))
    if (key.downArrow)
      return setCursor((c) => Math.min(Math.max(0, rowCount() - 1), c + 1))

    if (key.tab) {
      const items = tabsFor(view)
      const at = items.findIndex((entry) => entry.value === tab)
      // Adding length before the modulo keeps shift+tab from going negative on
      // the first tab, where -1 % 2 is -1 rather than the last index.
      const step = key.shift ? items.length - 1 : 1
      switchTab(items[(at + step) % items.length]!.value)
      return
    }

    if (view === "sources") {
      if (tab === "sources") {
        // Enter and → agree here: both mean "go into this source", and there is
        // nothing else Enter could plausibly do on a source row.
        if (key.return || key.rightArrow) {
          const selected = sources[cursor]
          if (selected?.id) openSource(selected.id)
        }
        return
      }
      if (key.return) openCatalogDetail()
      return
    }

    if (key.leftArrow || key.escape) return backToSources()
    if (tab === "destinations" && key.return) return openDestinationDetail()
  })

  const selectedDestination = (): Destination | undefined => destinations[cursor]

  const detailBodyRows =
    detail === "catalog"
      ? Math.min(catalogDetail?.options.length ?? 0, DETAIL_MAX_ROWS) + 2
      : detail === "destination"
        ? Math.min(
            Object.keys(selectedDestination()?.settings ?? {}).length,
            DETAIL_MAX_ROWS,
          ) + 5
        : 0

  const overlayRows = detail ? DETAIL_CHROME_ROWS + detailBodyRows : 0
  const rows = listRows(stdout?.rows, CHROME_ROWS, overlayRows, FALLBACK_ROWS)

  const subtitle =
    view === "sources"
      ? tab === "sources"
        ? `${sources.length} sources`
        : `${catalog.length} destination types`
      : `${source?.name ?? currentSourceId() ?? "—"}  ·  ${destinations.length} destinations`

  return (
    <Box flexDirection="column" paddingX={1}>
      <Tabs active={tab} items={tabsFor(view)} />

      <Box marginBottom={1}>
        <Text color={colors.muted}>
          {subtitle}
          {readAt ? `  ·  read at ${clock(readAt)}` : ""}
        </Text>
      </Box>

      {phase === "loading" ? (
        <Spinner label="Loading…" />
      ) : phase === "error" ? (
        <StatusMessage variant="error">{message}</StatusMessage>
      ) : view === "sources" ? (
        tab === "sources" ? (
          <SourceList sources={sources} selected={cursor} rows={rows} />
        ) : (
          <CatalogList entries={catalog} selected={cursor} rows={rows} />
        )
      ) : tab === "destinations" ? (
        <DestinationList
          destinations={destinations}
          selected={cursor}
          rows={rows}
        />
      ) : (
        <Box flexDirection="column">
          <KeyValue label="Id" value={source?.id ?? "—"} />
          <KeyValue label="Slug" value={source?.slug ?? "—"} />
          <KeyValue label="Name" value={source?.name ?? "—"} />
          <KeyValue
            label="Enabled"
            value={enabledBadge(source?.enabled ?? false).text}
          />
          <KeyValue
            label="Write keys"
            value={(source?.writeKeys ?? []).join(", ") || "—"}
          />
          <KeyValue label="Metadata" value={source?.metadata?.name ?? "—"} />
        </Box>
      )}

      {detail === "destination" && phase === "browsing" && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={colors.accent}
          paddingX={1}
        >
          <Text bold color={colors.accent}>
            {selectedDestination()?.name ?? "—"}
          </Text>
          <KeyValue label="Id" value={selectedDestination()?.id ?? "—"} />
          <KeyValue
            label="Integration"
            value={selectedDestination()?.metadata.slug ?? "—"}
          />
          <KeyValue
            label="Enabled"
            value={enabledBadge(selectedDestination()?.enabled ?? false).text}
          />
          <Text color={colors.muted}>Settings</Text>
          {Object.entries(selectedDestination()?.settings ?? {})
            .slice(0, DETAIL_MAX_ROWS)
            .map(([name, value]) => (
              <KeyValue
                key={name}
                label={name}
                value={describeValue(value)}
                labelWidth={24}
              />
            ))}
        </Box>
      )}

      {detail === "catalog" && phase === "browsing" && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={colors.accent}
          paddingX={1}
        >
          <Text bold color={colors.accent}>
            {catalogDetail?.name ?? "—"} settings
          </Text>
          <OptionTable
            options={catalogDetail?.options ?? []}
            rows={DETAIL_MAX_ROWS}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <FooterHints hints={detail ? DETAIL_HINTS : TAB_HINTS[tab]} />
      </Box>
    </Box>
  )
}
