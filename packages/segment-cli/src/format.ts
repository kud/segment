import chalk from "chalk"

const ANSI_PATTERN = /\[[0-9;]*m/g

const visibleLength = (value: string): number =>
  value.replace(ANSI_PATTERN, "").length

export const truncate = (value: string, length: number): string =>
  value.length > length ? `${value.slice(0, length)}…` : value

export const maskToken = (token: string): string =>
  token.length <= 8 ? "••••" : `${token.slice(0, 4)}…${token.slice(-4)}`

export const formatBool = (value: boolean): string =>
  value ? chalk.green("yes") : chalk.red("no")

export const formatTable = (headers: string[], rows: string[][]): string => {
  const widths = headers.map((header, column) =>
    Math.max(
      visibleLength(header),
      ...rows.map((row) => visibleLength(row[column] ?? "")),
    ),
  )

  const pad = (value: string, width: number): string =>
    value + " ".repeat(Math.max(0, width - visibleLength(value)))

  const headerLine = headers
    .map((header, column) => chalk.bold(pad(header, widths[column] ?? 0)))
    .join("  ")

  const separator = widths.map((width) => "─".repeat(width)).join("  ")

  const bodyLines = rows.map((row) =>
    row.map((cell, column) => pad(cell, widths[column] ?? 0)).join("  "),
  )

  return [headerLine, separator, ...bodyLines].join("\n")
}

export const formatKeyValueList = (
  entries: Array<[string, string]>,
): string => {
  const width = Math.max(...entries.map(([key]) => key.length))
  return entries
    .map(
      ([key, value]) => `${chalk.bold(`${key}:`.padEnd(width + 1))} ${value}`,
    )
    .join("\n")
}
