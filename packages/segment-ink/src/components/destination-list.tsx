import { Box, Text } from "ink"
import { SelectableRow, colors } from "@kud/ink-ui"
import type { Destination } from "@kud/segment"
import { windowSlice } from "../lib/window.js"
import { fit } from "../lib/fit.js"
import { enabledBadge } from "../lib/enabled.js"

export type DestinationListProps = {
  destinations: Destination[]
  selected?: number
  rows: number
  emptyText?: string
}

export const DestinationList = ({
  destinations,
  selected = -1,
  rows,
  emptyText = "No destinations",
}: DestinationListProps) => {
  if (!destinations.length)
    return <Text color={colors.muted}>{emptyText}</Text>

  const { items: visible, offset } = windowSlice(
    destinations,
    Math.max(0, selected),
    rows,
  )

  return (
    <Box flexDirection="column">
      {visible.map((destination, i) => {
        const idx = offset + i
        const state = enabledBadge(destination.enabled)
        return (
          <SelectableRow key={destination.id || idx} active={idx === selected}>
            <Text wrap="truncate-end">
              <Text bold>{fit(destination.name, 30)}</Text>
              {/* The metadata slug, not the destination id: it is what names
                  the integration in the catalog, in the docs and in every
                  support thread, so it is the handle worth carrying here. */}
              <Text color={colors.accent}>
                {fit(destination.metadata.slug, 24)}
              </Text>
              <Text color={state.color}>{state.text}</Text>
            </Text>
          </SelectableRow>
        )
      })}
    </Box>
  )
}
