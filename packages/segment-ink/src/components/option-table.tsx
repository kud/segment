import { Box, Text } from "ink"
import { Table, colors, type Column } from "@kud/ink-ui"
import type { DestinationMetadataOption } from "@kud/segment"
import { windowSlice } from "../lib/window.js"

export type OptionTableProps = {
  options: DestinationMetadataOption[]
  rows: number
  emptyText?: string
}

type OptionRow = {
  name: string
  type: string
  required: string
  description: string
}

const COLUMNS: Column<OptionRow>[] = [
  { key: "name", header: "NAME", width: 24 },
  { key: "type", header: "TYPE", width: 12 },
  { key: "required", header: "REQUIRED", width: 10 },
  { key: "description", header: "DESCRIPTION", width: 40 },
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
  emptyText = "No documented settings",
}: OptionTableProps) => {
  if (!options.length) return <Text color={colors.muted}>{emptyText}</Text>

  // Reuses the list windowing rather than a bare slice so the overflow line
  // below can never disagree with what was actually drawn.
  const { items: visible } = windowSlice(options, 0, rows)
  const hidden = options.length - visible.length

  return (
    <Box flexDirection="column">
      <Table data={visible.map(toRow)} columns={COLUMNS} />
      {hidden > 0 && (
        <Text color={colors.muted}>{`… ${hidden} more settings`}</Text>
      )}
    </Box>
  )
}
