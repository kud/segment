# @kud/segment-cli

Fast, modern CLI over the [Segment Public API](https://segment.com/docs/api/public-api/) — inspect sources, manage destinations, and read the catalog from the terminal.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fsegment-cli?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

Built on [`@kud/segment`](https://www.npmjs.com/package/@kud/segment), the surface-agnostic core client — reach for that instead if you're building your own tool (an MCP server, a Raycast extension) on the same API. Part of the [`kud/segment`](https://github.com/kud/segment) monorepo.

## Install

```sh
npm install -g @kud/segment-cli
```

This installs a binary named `segment`.

## Quick start

Set your token (see [Authentication](#authentication) below for how to get one):

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

## Authentication

> [!WARNING]
> `segment` needs a **Public API token**, not the legacy Config API token. The two are separate credentials in different parts of the Segment dashboard, and a Config API token will fail with a 401 or 403 on every call here.

Create one in the Segment dashboard: **Settings → Access Management → Tokens → "+ Create Token"**, then select **Public API token**.

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

## Command reference

Every command accepts `--json` (raw JSON, no formatting), `--timeout <ms>`, and the auth flags above (`--token`, `--region`).

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

## Worked example: wiring up Amplitude

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

## Scripting

`--json` is available on every command, so output pipes cleanly into `jq` or another tool:

```sh
segment sources list --json | jq '.[] | select(.enabled == false)'
```

## Development

This package lives inside the [`kud/segment`](https://github.com/kud/segment) npm workspaces monorepo, alongside `@kud/segment`. See the [monorepo README](https://github.com/kud/segment) for the full clone → install → build → test workflow, including live `tsx` development via `npm run dev` inside this package.

---

MIT © [kud](https://github.com/kud) — Made with ❤️
