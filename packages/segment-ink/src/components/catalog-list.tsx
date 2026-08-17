import { Box, Text } from "ink"
import { SelectableRow, colors } from "@kud/ink-ui"
import type { DestinationMetadata } from "@kud/segment"
import { windowSlice } from "../lib/window.js"
import { fit } from "../lib/fit.js"

export type CatalogListProps = {
  entries: DestinationMetadata[]
  selected?: number
  rows: number
  emptyText?: string
}

export const CatalogList = ({
  entries,
  selected = -1,
  rows,
  emptyText = "No catalog entries",
}: CatalogListProps) => {
  if (!entries.length) return <Text color={colors.muted}>{emptyText}</Text>

  const { items: visible, offset } = windowSlice(
    entries,
    Math.max(0, selected),
    rows,
  )

  return (
    <Box flexDirection="column">
      {visible.map((entry, i) => {
        const idx = offset + i
        return (
          <SelectableRow key={entry.id || idx} active={idx === selected}>
            <Text wrap="truncate-end">
              <Text bold>{fit(entry.name, 30)}</Text>
              <Text color={colors.muted}>{fit(entry.slug, 26)}</Text>
              <Text color={colors.info}>
                {(entry.categories ?? []).join(", ") || "—"}
              </Text>
            </Text>
          </SelectableRow>
        )
      })}
    </Box>
  )
}
