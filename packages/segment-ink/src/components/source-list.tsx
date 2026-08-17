import { Box, Text } from "ink"
import { SelectableRow, colors } from "@kud/ink-ui"
import type { Source } from "@kud/segment"
import { windowSlice } from "../lib/window.js"
import { fit } from "../lib/fit.js"
import { enabledBadge } from "../lib/enabled.js"

export type SourceListProps = {
  sources: Source[]
  selected?: number
  rows: number
  emptyText?: string
}

// Eight characters is enough to tell two sources apart at a glance and short of
// the whole credential, which is what a screenshot of this list would otherwise
// carry off with it. The full keys live on the Info tab — one deliberate step
// away rather than on the screen everybody leaves open.
const shortKey = (keys: string[] = []): string =>
  keys[0] ? `${keys[0].slice(0, 8)}…` : "—"

export const SourceList = ({
  sources,
  selected = -1,
  rows,
  emptyText = "No sources",
}: SourceListProps) => {
  if (!sources.length) return <Text color={colors.muted}>{emptyText}</Text>

  const { items: visible, offset } = windowSlice(
    sources,
    Math.max(0, selected),
    rows,
  )

  return (
    <Box flexDirection="column">
      {visible.map((source, i) => {
        const idx = offset + i
        const state = enabledBadge(source.enabled)
        return (
          <SelectableRow key={source.id || idx} active={idx === selected}>
            <Text wrap="truncate-end">
              <Text bold>{fit(source.name, 28)}</Text>
              <Text color={colors.muted}>{fit(source.slug, 24)}</Text>
              <Text color={state.color}>{fit(state.text, 12)}</Text>
              <Text color={colors.info}>{shortKey(source.writeKeys)}</Text>
            </Text>
          </SelectableRow>
        )
      })}
    </Box>
  )
}
