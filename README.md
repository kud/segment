<div align="center">

🔌

# Segment

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fsegment-cli?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**Segment Public API tooling — a surface-agnostic core and a thin CLI for inspecting sources, managing destinations, and reading the catalog.**

[Features](#-features) • [Packages](#-packages) • [Quick Start](#-quick-start) • [Authentication](#-authentication) • [CLI Reference](#-cli-reference) • [Development](#-development)

</div>

## 🌟 Features

- 🔍 **Source inspection** — list every source in a workspace, or drill into one for its write keys and connected type
- 🔌 **Destination management** — list, get, create, update, and delete destinations, scriptable end to end
- 📚 **Catalog browsing** — search destination types and read a type's full settings schema before you wire anything up
- 🌐 **Region-aware** — talks to either the `us` or `eu` Segment Public API host, per call or per config
- 🧩 **Zero-dependency core** — `@kud/segment` ships no runtime dependencies at all, built on the global `fetch`
- 🖇 **Instant workspace linking** — the CLI consumes the core straight from source in development, no publish step in the loop
- 🤖 **Scriptable output** — `--json` on every command for piping into `jq` or another tool

## 📦 Packages

This is an npm workspaces monorepo with two published packages:

| Package                                    | What it is                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`@kud/segment`](packages/segment)         | Surface-agnostic core — `SegmentClient`, config resolution, types. Zero runtime dependencies. |
| [`@kud/segment-cli`](packages/segment-cli) | Thin CLI over the core. Binary name: `segment`.                                               |

## 🚀 Quick Start

Install the CLI globally:

```sh
npm install -g @kud/segment-cli
```

Set your token (see [Authentication](#-authentication) for how to get one):

```sh
export SEGMENT_API_TOKEN="<your Public API token>"
```

List the sources in your workspace:

```sh
segment sources list
```

```console
$ segment sources list
ID           NAME              SLUG              ENABLED  WRITE KEY
─────────    ──────────────    ──────────────    ───────  ────────────
src_9f2k1a   Marketing Site    marketing-site    yes      k3f8s2…9d1a
src_7c4m2b   Mobile App        mobile-app        yes      p9x1q7…2m3b
```

## 🔑 Authentication

> [!WARNING]
> `segment` needs a **Public API token**, not the legacy Config API token. The two are separate credentials in different parts of the dashboard, and a Config API token will fail with a 401 or 403 on every call here.

Create one in the Segment dashboard: **Settings → Access Management → Tokens → "+Create Token"**, then select **Public API token**.

The token is picked up in this order — first one found wins:

| Source                                   | Example                                   |
| ---------------------------------------- | ----------------------------------------- |
| `--token` flag                           | `segment sources list --token tkn_abc123` |
| `SEGMENT_API_TOKEN` environment variable | `export SEGMENT_API_TOKEN="tkn_abc123"`   |
| Local config file                        | `segment config set --token tkn_abc123`   |

The region works the same way, via `--region` or `SEGMENT_API_REGION`, and accepts `us` (default) or `eu`. EU workspaces are served from `eu1.api.segmentapis.com`; `us` uses `api.segmentapis.com`.

```sh
segment config set --token tkn_abc123 --region eu
```

Config lives at `$XDG_CONFIG_HOME/segment-cli/config.json`, falling back to `~/.config/segment-cli/config.json`. Check what's currently resolved (the token is masked):

```sh
segment config show
```

## 📖 CLI Reference

Every command accepts `--json` (raw JSON, no formatting), `--timeout <ms>`, and the auth flags above.

### Sources

| Command                                   | Description                             |
| ----------------------------------------- | --------------------------------------- |
| `segment sources list`                    | List all sources in the workspace       |
| `segment sources get <sourceId>`          | Show details for a single source        |
| `segment sources destinations <sourceId>` | List destinations connected to a source |

### Destinations

| Command                                                                 | Description                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `segment destinations list [--source <sourceId>]`                       | List destinations, optionally filtered to one source    |
| `segment destinations get <destinationId>`                              | Show details for a single destination                   |
| `segment destinations create <sourceId> <metadataId> --settings <json>` | Connect a new destination to a source                   |
| `segment destinations update <destinationId>`                           | Update a destination's name, settings, or enabled state |
| `segment destinations delete <destinationId> --yes`                     | Delete a destination                                    |

`create` also takes `--name <name>` and `--disabled`. `update` takes `--settings <json>`, `--name <name>`, and one of `--enable` / `--disable`.

> [!WARNING]
> `destinations delete` refuses to run without `--yes`. Run it without the flag first — it prints the destination's details so you can confirm you're about to delete the right one.

### Catalog

| Command                                          | Description                                         |
| ------------------------------------------------ | --------------------------------------------------- |
| `segment catalog destinations [--search <term>]` | List catalog destination types, optionally filtered |
| `segment catalog destination <metadataId>`       | Show a destination type's full settings schema      |

### Config

| Command                                           | Description                                               |
| ------------------------------------------------- | --------------------------------------------------------- |
| `segment config set [--token <t>] [--region <r>]` | Write token and/or region to the local config file        |
| `segment config show`                             | Print the currently resolved configuration (token masked) |

## 🎯 Worked example: wiring up Amplitude

The everyday reason to reach for this CLI: check whether a source already has Amplitude connected, and if not, connect it.

Check the source's existing destinations:

```sh
segment sources destinations src_9f2k1a
```

Nothing came back for Amplitude, so look up what its destination type needs before creating one — Amplitude's catalog `metadataId` is `54521fd525e721e32a72ee91`:

```sh
segment catalog destination 54521fd525e721e32a72ee91
```

```console
$ segment catalog destination 54521fd525e721e32a72ee91
ID:           54521fd525e721e32a72ee91
Name:         Amplitude
Slug:         amplitude
Description:  Amplitude is a product analytics tool...
Website:      https://amplitude.com
Status:       PUBLIC
Categories:   A/B Testing, Analytics

Settings schema:
NAME              TYPE     REQUIRED  DESCRIPTION
────────────────  ───────  ────────  ──────────────────────────────
apiKey            string   yes       Your Amplitude API Key
secretKey         string   no        Your Amplitude Secret Key
traitsToIncrement  array   no        Traits to increment as Amplitude user properties
```

`apiKey` is the only required setting, so create the destination with just that:

```sh
segment destinations create src_9f2k1a 54521fd525e721e32a72ee91 --settings '{"apiKey":"YOUR_AMPLITUDE_API_KEY"}'
```

```console
$ segment destinations create src_9f2k1a 54521fd525e721e32a72ee91 --settings '{"apiKey":"YOUR_AMPLITUDE_API_KEY"}'
ID:       dst_4k9p2w
Name:     Amplitude
Enabled:  yes
Source:   src_9f2k1a
Type:     Amplitude (amplitude) — 54521fd525e721e32a72ee91

Settings:
{
  "apiKey": "YOUR_AMPLITUDE_API_KEY"
}
```

## 📦 Using `@kud/segment` programmatically

The core has no CLI dependency and no runtime dependencies of its own — it's a thin wrapper around `fetch`, so any Node 22+ ESM project can consume it directly:

```ts
import { SegmentClient } from "@kud/segment"

const client = new SegmentClient(process.env.SEGMENT_API_TOKEN!, {
  region: "us",
})

const sources = await client.listSources()
const destinations = await client.listSourceDestinations(sources[0].id)
const amplitude = destinations.find((d) => d.metadata.slug === "amplitude")
```

`resolveConfig()` and `saveConfig()` from the same package handle the token/region/config-file resolution the CLI uses — reach for them directly if you're building another surface (an MCP server, a Raycast extension) on top of the core.

## 🔧 Development

```sh
git clone https://github.com/kud/segment.git
```

```sh
cd segment
```

```sh
npm install
```

Builds, type-checks, and tests run across every workspace from the root:

```sh
npm run build
```

```sh
npm run typecheck
```

```sh
npm test
```

A change to `@kud/segment` is picked up by the CLI immediately via npm workspace linking — no publish, no version bump, just re-run `npm run build` (or `npm run dev` inside `packages/segment-cli` for a live `tsx` run).

| Script                     | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `npm run build`            | Build every workspace (`tsc -p .` per package)               |
| `npm run typecheck`        | Type-check every workspace with no emit                      |
| `npm test`                 | Run every workspace's test suite                             |
| `npm run changeset`        | Record a version bump for the next release                   |
| `npm run version-packages` | Apply pending changesets to package versions                 |
| `npm run release`          | Build and publish changed packages (used by CI, not by hand) |

Releases are independent per package and publish to npm over GitHub Actions OIDC trusted publishing on every push to `main` — no `NPM_TOKEN` involved. Record a change with `npm run changeset` before merging anything that should ship.

## 🏗 Tech Stack

| Category             | Technology                                  |
| -------------------- | ------------------------------------------- |
| Language             | TypeScript 5.9                              |
| Runtime              | Node.js ≥ 22, ESM only                      |
| CLI framework        | Commander 14                                |
| Terminal styling     | chalk 5                                     |
| HTTP                 | global `fetch` — no HTTP dependency         |
| Monorepo tooling     | npm workspaces                              |
| Versioning & release | Changesets, independent per package         |
| CI/CD                | GitHub Actions, npm OIDC trusted publishing |

---

MIT © [kud](https://github.com/kud) — Made with ❤️
