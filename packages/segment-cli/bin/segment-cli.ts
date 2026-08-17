#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import chalk from "chalk"
import { Command } from "commander"
import {
  HttpError,
  SegmentClient,
  resolveConfig,
  saveConfig,
  normalizeRegion,
  type Region,
} from "@kud/segment"
import type {
  Destination,
  DestinationMetadata,
  Source,
} from "@kud/segment"
import {
  formatBool,
  formatKeyValueList,
  formatTable,
  maskToken,
  truncate,
} from "../src/format.js"

type GlobalOptions = {
  token?: string
  region?: string
  json?: boolean
  pretty?: boolean
  color?: boolean
  timeout?: string
}

const resolveVersion = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(dir, "package.json")
    if (existsSync(candidate)) {
      const pkg = JSON.parse(readFileSync(candidate, "utf8")) as {
        version?: string
      }
      if (pkg.version) return pkg.version
    }
    dir = dirname(dir)
  }
  return "0.0.0"
}

const configureColor = (opts: GlobalOptions): void => {
  if (opts.json) {
    chalk.level = 0
    return
  }
  if (opts.pretty) {
    chalk.level = chalk.level > 0 ? chalk.level : 1
    return
  }
  if (opts.color === false) {
    chalk.level = 0
  }
}

const globalOptsOf = (command: Command): GlobalOptions =>
  command.optsWithGlobals<GlobalOptions>()

const buildClient = (opts: GlobalOptions): SegmentClient => {
  const resolved = resolveConfig({
    token: opts.token,
    region: opts.region,
    timeout: opts.timeout ? Number(opts.timeout) : undefined,
  })
  if (!resolved.token) {
    throw new Error(
      "no Segment API token configured — set SEGMENT_API_TOKEN, run `segment config set --token <token>`, or pass --token",
    )
  }
  return new SegmentClient(resolved.token, {
    region: resolved.region,
    timeout: resolved.timeout,
  })
}

const printJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2))
}

const withErrorHandling =
  <Args extends unknown[]>(fn: (...args: Args) => Promise<void>) =>
  async (...args: Args): Promise<void> => {
    try {
      await fn(...args)
    } catch (error) {
      const message =
        error instanceof HttpError || error instanceof Error
          ? error.message
          : String(error)
      process.stderr.write(`${chalk.red("error:")} ${message}\n`)
      process.exit(1)
    }
  }

const sourceWriteKeyCell = (source: Source): string => {
  if (source.writeKeys.length === 0) return "—"
  const first = truncate(source.writeKeys[0] ?? "", 12)
  const extra = source.writeKeys.length - 1
  return extra > 0 ? `${first} (+${extra})` : first
}

const printSourcesTable = (sources: Source[]): void => {
  console.log(
    formatTable(
      ["ID", "NAME", "SLUG", "ENABLED", "WRITE KEY"],
      sources.map((source) => [
        source.id,
        source.name,
        source.slug,
        formatBool(source.enabled),
        sourceWriteKeyCell(source),
      ]),
    ),
  )
}

const printSourceDetail = (source: Source): void => {
  console.log(
    formatKeyValueList([
      ["ID", source.id],
      ["Name", source.name],
      ["Slug", source.slug],
      ["Enabled", formatBool(source.enabled)],
      ["Workspace", source.workspaceId],
      ["Write keys", source.writeKeys.join(", ") || "—"],
      ...(source.metadata
        ? ([["Type", `${source.metadata.name} (${source.metadata.slug})`]] as [
            string,
            string,
          ][])
        : []),
    ]),
  )
}

const printDestinationsTable = (destinations: Destination[]): void => {
  console.log(
    formatTable(
      ["ID", "NAME", "TYPE", "ENABLED", "SOURCE"],
      destinations.map((destination) => [
        destination.id,
        destination.name,
        destination.metadata.slug,
        formatBool(destination.enabled),
        destination.sourceId,
      ]),
    ),
  )
}

const printDestinationDetail = (destination: Destination): void => {
  console.log(
    formatKeyValueList([
      ["ID", destination.id],
      ["Name", destination.name],
      ["Enabled", formatBool(destination.enabled)],
      ["Source", destination.sourceId],
      [
        "Type",
        `${destination.metadata.name} (${destination.metadata.slug}) — ${destination.metadata.id}`,
      ],
    ]),
  )
  console.log()
  console.log(chalk.bold("Settings:"))
  console.log(JSON.stringify(destination.settings, null, 2))
}

const printCatalogTable = (entries: DestinationMetadata[]): void => {
  console.log(
    formatTable(
      ["ID", "NAME", "SLUG", "CATEGORIES"],
      entries.map((entry) => [
        entry.id,
        entry.name,
        entry.slug,
        entry.categories?.join(", ") || "—",
      ]),
    ),
  )
}

const printCatalogDetail = (metadata: DestinationMetadata): void => {
  console.log(
    formatKeyValueList([
      ["ID", metadata.id],
      ["Name", metadata.name],
      ["Slug", metadata.slug],
      ["Description", metadata.description || "—"],
      ["Website", metadata.website || "—"],
      ["Status", metadata.status || "—"],
      ["Categories", metadata.categories?.join(", ") || "—"],
    ]),
  )
  console.log()
  console.log(chalk.bold("Settings schema:"))
  console.log(
    formatTable(
      ["NAME", "TYPE", "REQUIRED", "DESCRIPTION"],
      metadata.options.map((option) => [
        option.name,
        option.type,
        formatBool(option.required),
        option.description || option.label || "—",
      ]),
    ),
  )
}

const parseSettingsJson = (raw: string): Record<string, unknown> => {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error("--settings must be valid JSON")
  }
}

const matchesSearch = (
  metadata: DestinationMetadata,
  term: string,
): boolean => {
  const needle = term.toLowerCase()
  return (
    metadata.name.toLowerCase().includes(needle) ||
    metadata.slug.toLowerCase().includes(needle)
  )
}

const program = new Command()

program
  .name("segment")
  .description(
    "Fast, modern Segment CLI — inspect sources, manage destinations, and read the catalog.",
  )
  .version(resolveVersion())
  .option("--token <token>", "Segment Public API token")
  .option("--region <us|eu>", "Segment API region")
  .option("--json", "emit raw JSON and nothing else")
  .option("--pretty", "force colour output")
  .option("--no-color", "disable colour output")
  .option("--timeout <ms>", "request timeout in milliseconds")
  .hook("preAction", (_thisCommand, actionCommand) => {
    configureColor(globalOptsOf(actionCommand))
  })

const sourcesCommand = program
  .command("sources")
  .description("inspect Segment sources")

sourcesCommand
  .command("list")
  .description("list all sources in the workspace")
  .action(
    withErrorHandling(async (_opts: object, command: Command) => {
      const opts = globalOptsOf(command)
      const client = buildClient(opts)
      const sources = await client.listSources()
      if (opts.json) return printJson(sources)
      printSourcesTable(sources)
    }),
  )

sourcesCommand
  .command("get <sourceId>")
  .description("show details for a single source")
  .action(
    withErrorHandling(
      async (sourceId: string, _opts: object, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const source = await client.getSource(sourceId)
        if (opts.json) return printJson(source)
        printSourceDetail(source)
      },
    ),
  )

sourcesCommand
  .command("destinations <sourceId>")
  .description("list destinations connected to a source")
  .action(
    withErrorHandling(
      async (sourceId: string, _opts: object, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destinations = await client.listSourceDestinations(sourceId)
        if (opts.json) return printJson(destinations)
        printDestinationsTable(destinations)
      },
    ),
  )

const destinationsCommand = program
  .command("destinations")
  .description("manage Segment destinations")

destinationsCommand
  .command("list")
  .description("list destinations, optionally filtered to a source")
  .option("--source <sourceId>", "only show destinations for this source")
  .action(
    withErrorHandling(
      async (localOpts: { source?: string }, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destinations = localOpts.source
          ? await client.listSourceDestinations(localOpts.source)
          : await client.listDestinations()
        if (opts.json) return printJson(destinations)
        printDestinationsTable(destinations)
      },
    ),
  )

destinationsCommand
  .command("get <destinationId>")
  .description("show details for a single destination")
  .action(
    withErrorHandling(
      async (destinationId: string, _opts: object, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destination = await client.getDestination(destinationId)
        if (opts.json) return printJson(destination)
        printDestinationDetail(destination)
      },
    ),
  )

destinationsCommand
  .command("create <sourceId> <metadataId>")
  .description("connect a new destination to a source")
  .requiredOption("--settings <json>", "destination settings as a JSON object")
  .option("--name <name>", "destination display name")
  .option("--disabled", "create the destination disabled")
  .action(
    withErrorHandling(
      async (
        sourceId: string,
        metadataId: string,
        localOpts: { settings: string; name?: string; disabled?: boolean },
        command: Command,
      ) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destination = await client.createDestination({
          sourceId,
          metadataId,
          name: localOpts.name,
          enabled: localOpts.disabled ? false : undefined,
          settings: parseSettingsJson(localOpts.settings),
        })
        if (opts.json) return printJson(destination)
        printDestinationDetail(destination)
      },
    ),
  )

destinationsCommand
  .command("update <destinationId>")
  .description("update an existing destination")
  .option("--settings <json>", "destination settings as a JSON object")
  .option("--name <name>", "destination display name")
  .option("--enable", "enable the destination")
  .option("--disable", "disable the destination")
  .action(
    withErrorHandling(
      async (
        destinationId: string,
        localOpts: {
          settings?: string
          name?: string
          enable?: boolean
          disable?: boolean
        },
        command: Command,
      ) => {
        if (localOpts.enable && localOpts.disable) {
          throw new Error("cannot pass both --enable and --disable")
        }
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destination = await client.updateDestination(destinationId, {
          name: localOpts.name,
          enabled: localOpts.enable
            ? true
            : localOpts.disable
              ? false
              : undefined,
          settings: localOpts.settings
            ? parseSettingsJson(localOpts.settings)
            : undefined,
        })
        if (opts.json) return printJson(destination)
        printDestinationDetail(destination)
      },
    ),
  )

destinationsCommand
  .command("delete <destinationId>")
  .description("delete a destination (requires --yes)")
  .option("--yes", "confirm the deletion")
  .action(
    withErrorHandling(
      async (
        destinationId: string,
        localOpts: { yes?: boolean },
        command: Command,
      ) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const destination = await client.getDestination(destinationId)

        if (!localOpts.yes) {
          if (opts.json) printJson(destination)
          else printDestinationDetail(destination)
          throw new Error(
            `refusing to delete "${destination.name}" (${destination.id}) without --yes`,
          )
        }

        await client.deleteDestination(destinationId)
        if (opts.json) return printJson({ deleted: destinationId })
        console.log(`deleted ${destination.name} (${destination.id})`)
      },
    ),
  )

const catalogCommand = program
  .command("catalog")
  .description("browse the Segment destination catalog")

catalogCommand
  .command("destinations")
  .description("list catalog destination types")
  .option("--search <term>", "filter by name or slug substring")
  .action(
    withErrorHandling(
      async (localOpts: { search?: string }, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const all = await client.listDestinationMetadata()
        const filtered = localOpts.search
          ? all.filter((entry) =>
              matchesSearch(entry, localOpts.search as string),
            )
          : all
        if (opts.json) return printJson(filtered)
        printCatalogTable(filtered)
      },
    ),
  )

catalogCommand
  .command("destination <metadataId>")
  .description("show a catalog destination's settings schema")
  .action(
    withErrorHandling(
      async (metadataId: string, _opts: object, command: Command) => {
        const opts = globalOptsOf(command)
        const client = buildClient(opts)
        const metadata = await client.getDestinationMetadata(metadataId)
        if (opts.json) return printJson(metadata)
        printCatalogDetail(metadata)
      },
    ),
  )

const configCommand = program
  .command("config")
  .description("manage local segment-cli configuration")

configCommand
  .command("set")
  .description(
    "write token and/or region to the local config file (use the global --token/--region flags)",
  )
  .action(
    withErrorHandling(async (_opts: object, command: Command) => {
      const opts = globalOptsOf(command)
      if (!opts.token && !opts.region) {
        throw new Error("pass at least one of --token or --region")
      }
      const region: Region | undefined = opts.region
        ? normalizeRegion(opts.region)
        : undefined
      saveConfig({
        ...(opts.token ? { token: opts.token } : {}),
        ...(region ? { region } : {}),
      })
      console.log("config updated")
    }),
  )

configCommand
  .command("show")
  .description("print the current resolved configuration")
  .action(
    withErrorHandling(async (_opts: object, command: Command) => {
      const opts = globalOptsOf(command)
      const resolved = resolveConfig({
        token: opts.token,
        region: opts.region,
      })
      const view = {
        token: resolved.token ? maskToken(resolved.token) : "—",
        region: resolved.region,
      }
      if (opts.json) return printJson(view)
      console.log(
        formatKeyValueList([
          ["Token", view.token],
          ["Region", view.region],
        ]),
      )
    }),
  )

await program.parseAsync()
