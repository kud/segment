# @kud/segment-ink

Ink (React for CLIs) components for browsing Segment sources, destinations, and the destination catalog — a source list, a destination list, a catalog list, a settings-schema table, and an assembled browser that wires them together.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fsegment-ink?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

Built on [`@kud/segment`](https://www.npmjs.com/package/@kud/segment), the surface-agnostic core client, and used by [`@kud/segment-cli`](https://www.npmjs.com/package/@kud/segment-cli) as its interactive `segment` browser. Part of the [`kud/segment`](https://github.com/kud/segment) monorepo. Reach for this package directly if you're embedding the same browsing UI somewhere other than a standalone terminal command — a dashboard pane, another Ink app, a different CLI entirely.

## The contract

Two different things live in this package, and they follow different rules.

The list components — `SourceList`, `DestinationList`, `CatalogList`, `OptionTable` — are **presentation-only**. Props in, rows out. None of them fetch data and none of them register their own `useInput` handler, so they compose equally well into a full-screen interactive browser or a single static pane inside a larger dashboard that owns its own input loop.

`SegmentBody` is the assembled, interactive browser built from those components, and it is **embeddable**. It does not call Ink's `render()` and does not put the terminal into raw mode or the alternate screen itself — it has no opinion on terminal lifecycle at all. Instead it reports "the user wants to quit" through a required `onExit` callback and leaves everything else — mounting, unmounting, `waitUntilExit`, alternate-screen mode — to the host. That host is `@kud/segment-cli` today, but it doesn't have to be.

## Install

```sh
npm install @kud/segment-ink
```

### Peer dependencies

`ink` and `react` are peer dependencies, not bundled dependencies — the host supplies them so there's exactly one copy of each in the final app.

| Peer    | Version |
| ------- | ------- |
| `ink`   | `>=7`   |
| `react` | `>=19`  |

## Usage

The host resolves a credential, mounts `SegmentBody` with `render()`, and unmounts on `onExit`:

```tsx
import { render } from "ink"
import { SegmentClient, resolveConfig } from "@kud/segment"
import { SegmentBody } from "@kud/segment-ink"

const { token, region, timeout } = resolveConfig()
const client = new SegmentClient(token!, { region, timeout })

const { unmount, waitUntilExit } = render(
  <SegmentBody client={client} onExit={() => unmount()} />,
  { alternateScreen: true },
)

await waitUntilExit()
```

`SegmentBody` also accepts an optional `screen` (`"sources"` or `"catalog"`) and `sourceId`, so a host can open the browser straight onto a given screen or source rather than always landing on the root source list.

## `SegmentLike`

`SegmentBody` (and the pure helpers below) type their client parameter against `SegmentLike`, a structural subset of `SegmentClient`, rather than the concrete class:

```ts
type SegmentLike = {
  listSources: () => Promise<Source[]>
  getSource: (id: string) => Promise<Source>
  listSourceDestinations: (sourceId: string) => Promise<Destination[]>
  listDestinationMetadata: () => Promise<DestinationMetadata[]>
  getDestinationMetadata: (metadataId: string) => Promise<DestinationMetadata>
}
```

Typing against the shape rather than the class is what lets a mock, a caching wrapper, or a partial client satisfy it without subclassing `SegmentClient` — which carries private state and a constructor that demands a real token, so a fixture could never extend it anyway. Any real `SegmentClient` instance already satisfies `SegmentLike` as-is.

## `createMockClient()`

A fixture `SegmentLike` implementation: a small mock workspace of sources, destinations, and catalog entries, no network calls, and nothing that varies between runs — no randomness, no clock, no generated ids.

```ts
import { createMockClient } from "@kud/segment-ink"

const client = createMockClient()
```

This is what backs `@kud/segment-cli`'s `segment --mock` flag, and it's what makes a screenshot of the browser reproducible — the same fixture data renders the same rows a month from now as it does today.

> [!NOTE]
> `createMockClient()` implements **every** `SegmentLike` method deliberately, on purpose, not as a convenience. A half-mocked client that's missing a method falls back to the real one for whatever it didn't cover, and the result is a screen mixing invented sources with a real workspace's actual destinations — a screenshot nobody can untangle after the fact. If you extend `SegmentLike` with a new method, extend the mock in the same change.

## Components

Every list component takes `rows` (how many rows it has to draw in) and an optional `selected` index (which row is active); none of them own scroll position or a cursor — the host tracks that and passes it in.

| Component         | Props                                                               | Renders                                              |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `SourceList`      | `sources: Source[]`, `selected?`, `rows`, `emptyText?`              | Name, slug, enabled state, and a truncated write key |
| `DestinationList` | `destinations: Destination[]`, `selected?`, `rows`, `emptyText?`    | Name, integration slug, and enabled state            |
| `CatalogList`     | `entries: DestinationMetadata[]`, `selected?`, `rows`, `emptyText?` | Name, slug, and categories                           |
| `OptionTable`     | `options: DestinationMetadataOption[]`, `rows`, `emptyText?`        | A destination type's settings schema as a table      |

`SourceList` deliberately shows only the first eight characters of a source's write key, not the full credential — the complete value is one step away, on the Info tab, rather than sitting on the screen everyone leaves open.

## Helpers

`windowSlice`, `fit`, `listRows`, and `enabledBadge` are exported alongside the components — they're what the components themselves are built from, so a host composing its own list scrolls, pads, and labels state identically rather than reimplementing any of the three.

| Helper                                                       | Does                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `windowSlice(items, selected, rows)`                         | Returns the visible slice that keeps the selected row in view, centred where possible, plus its offset — pure maths, no state                        |
| `fit(text, width)`                                           | Pads **and** truncates a string to an exact column width — `padEnd` alone only ever grows a string, so a long value spills into the next column      |
| `listRows(terminalRows, chromeRows, overlayRows, fallback?)` | Rows left for a list once chrome and any open detail panel have taken their share, handling a terminal that reports `0` rows rather than `undefined` |
| `enabledBadge(enabled)`                                      | Returns `{ text, color }` for enabled/disabled state — see below                                                                                     |

## Accessibility

Enabled and disabled state is always conveyed by glyph and word together — `✓ enabled` / `✗ disabled` — with colour only reinforcing, never carrying the distinction on its own. A green dot next to a red one is a single shape in two hues: indistinguishable to a colourblind reader, and to anyone piping this through a monochrome terminal or a screenshot that lost its palette.

## Development

This package lives inside the [`kud/segment`](https://github.com/kud/segment) npm workspaces monorepo, alongside `@kud/segment` and `@kud/segment-cli`. See the [monorepo README](https://github.com/kud/segment) for the full clone → install → build → test workflow.

---

MIT © [kud](https://github.com/kud) — Made with ❤️
