import { Box, Text } from "ink"
import { Table, colors, type Column } from "@kud/ink-ui"
import type { DestinationMetadataOption } from "@kud/segment"
import { windowSlice } from "../lib/window.js"

export type OptionTableProps = {
  options: DestinationMetadataOption[]
  rows: number
  /** The width the table must fit, when it sits inside a bordered panel. */
  maxWidth?: number
  emptyText?: string
}

type OptionRow = {
  name: string
  type: string
  required: string
  description: string
}

// Name and description size to their content and give way first on a narrow
// terminal; a fixed `width` is a floor Table never shrinks below, so four fixed
// columns came to 92 cells and ran through the panel border at 80 columns.
const COLUMNS: Column<OptionRow>[] = [
  { key: "name", header: "NAME", minWidth: 12 },
  { key: "type", header: "TYPE", width: 8 },
  { key: "required", header: "REQUIRED", width: 8 },
  { key: "description", header: "DESCRIPTION", minWidth: 12 },
]

// "yes"/"no" rather than a tick against a blank cell: a cell whose only content
// is a mark reads as empty when the mark is missing, so the absent case has to
// say something too.
const toRow = (option: DestinationMetadataOption): OptionRow => ({
  name: option.label || option.name,
  type: option.type,
  required: option.required ? "✓ yes" : "· no",
  description: option.description ?? "—",
})

export const OptionTable = ({
  options,
  rows,
  maxWidth,
  emptyText = "No documented settings",
}: OptionTableProps) => {
  if (!options.length) return <Text color={colors.muted}>{emptyText}</Text>

  // Reuses the list windowing rather than a bare slice so the overflow line
  // below can never disagree with what was actually drawn.
  const { items: visible } = windowSlice(options, 0, rows)
  const hidden = options.length - visible.length

  return (
    <Box flexDirection="column">
      <Table data={visible.map(toRow)} columns={COLUMNS} maxWidth={maxWidth} />
      {hidden > 0 && (
        <Text color={colors.muted}>{`… ${hidden} more settings`}</Text>
      )}
    </Box>
  )
}
