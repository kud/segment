import { colors } from "@kud/ink-ui"

// Enabled and disabled differ by glyph and by word, with colour only
// reinforcing. A green dot beside a red one is a single shape in two hues:
// indistinguishable to a colourblind reader, and to anyone piping this through
// a monochrome terminal or a screenshot that lost its palette.
export const enabledBadge = (
  enabled: boolean,
): { text: string; color: string } =>
  enabled
    ? { text: "✓ enabled", color: colors.success }
    : { text: "✗ disabled", color: colors.muted }
