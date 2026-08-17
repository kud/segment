# @kud/segment

Surface-agnostic client for the [Segment Public API](https://segment.com/docs/api/public-api/) — sources, destinations, and the destination catalog, behind a small TypeScript surface with zero runtime dependencies.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fsegment?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

This is the core of the [`kud/segment`](https://github.com/kud/segment) monorepo — it exists so anything can talk to Segment's Public API without dragging in a CLI, a terminal formatter, or an HTTP library it doesn't need. If you want a ready-made terminal tool instead, see [`@kud/segment-cli`](https://www.npmjs.com/package/@kud/segment-cli), which is built directly on top of this package.

## Who this is for

You, if you're building another surface on Segment's Public API: an MCP server, a Raycast extension, a TUI, a script in a CI job. `@kud/segment` handles authentication, pagination, retries, and typed responses — you handle presentation.

## Zero runtime dependencies

`@kud/segment` wraps the global `fetch`, available natively from Node 18 onward, and ships no `dependencies` of its own. There is nothing to audit, nothing to update when a transitive package moves, and nothing pulled into your bundle beyond your own code.

## Install

```sh
npm install @kud/segment
```

## Usage

```ts
import { SegmentClient } from "@kud/segment"

const client = new SegmentClient(process.env.SEGMENT_API_TOKEN!, {
  region: "us",
})

const sources = await client.listSources()
const destinations = await client.listSourceDestinations(sources[0].id)
const amplitude = destinations.find((d) => d.metadata.slug === "amplitude")
```

Every `SegmentClient` method returns already-unwrapped, typed data — pagination is handled internally, so `listSources()` and `listDestinations()` return the full collection rather than a single page.

## Authentication

`SegmentClient` takes a Segment **Public API token** as its first constructor argument. It does not read environment variables or config files itself — that resolution is what `resolveConfig` (below) is for, and it's on you if you're building your own surface directly against the class.

> [!WARNING]
> Segment has two separate token types: a legacy **Config API token** and a **Public API token**. This client only speaks to the Public API, so a Config API token will fail every call with a 401 or 403. Create a Public API token in the Segment dashboard under **Settings → Access Management → Tokens → "+ Create Token"**.

## Region

Pass `region: "eu"` in the constructor options for an EU workspace; the default is `"us"`.

| Region | Host                      |
| ------ | ------------------------- |
| `us`   | `api.segmentapis.com`     |
| `eu`   | `eu1.api.segmentapis.com` |

## API surface

### `SegmentClient`

| Method                                                                   | Description                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `listSources()`                                                          | List every source in the workspace, paginated internally      |
| `getSource(id)`                                                          | Fetch a single source                                         |
| `listSourceDestinations(sourceId)`                                       | List the destinations connected to a source                   |
| `listDestinations()`                                                     | List every destination in the workspace, paginated internally |
| `getDestination(id)`                                                     | Fetch a single destination                                    |
| `createDestination({ sourceId, metadataId, settings, name?, enabled? })` | Connect a new destination to a source                         |
| `updateDestination(id, { name?, enabled?, settings? })`                  | Patch an existing destination                                 |
| `deleteDestination(id)`                                                  | Delete a destination                                          |
| `getDestinationMetadata(metadataId)`                                     | Fetch a catalog destination type's full settings schema       |
| `listDestinationMetadata()`                                              | List every catalog destination type, paginated internally     |

Constructor options: `{ region?: "us" | "eu", timeout?: number, retries?: number }`. Every failed request throws an `HttpError` (also exported) carrying the HTTP `status` and response `body`; 401 and 403 responses get a message pointing at the likely cause — a missing or under-scoped token.

### Config helpers

`resolveConfig` and `saveConfig` are the same token/region/config-file resolution `@kud/segment-cli` uses — reach for them if your surface wants the same "flag, then env var, then config file" precedence rather than rolling your own.

```ts
import { resolveConfig, saveConfig } from "@kud/segment"

const resolved = resolveConfig({ token: cliFlag, region: cliFlag })
// resolved: { token, region, timeout }

saveConfig({ token: "tkn_abc123", region: "eu" })
```

`resolveConfig` reads, in order: an explicit override, then `SEGMENT_API_TOKEN` / `SEGMENT_API_REGION` / `SEGMENT_TIMEOUT`, then the config file at `$XDG_CONFIG_HOME/segment-cli/config.json` (falling back to `~/.config/segment-cli/config.json`). `saveConfig` merges its argument into that file.

### Types

`Source`, `Destination`, `DestinationMetadata`, and `DestinationMetadataOption` are exported from `@kud/segment` and describe the shapes above.

## Development

This package lives inside the [`kud/segment`](https://github.com/kud/segment) npm workspaces monorepo, alongside `@kud/segment-cli`. See the [monorepo README](https://github.com/kud/segment) for the full clone → install → build → test workflow.

---

MIT © [kud](https://github.com/kud) — Made with ❤️
