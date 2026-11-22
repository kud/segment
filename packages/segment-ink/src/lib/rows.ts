// Rows available to the list, once the chrome and any overlay have taken their
// share. Split out as a pure function because the interesting cases are the
// degenerate ones, and they cannot be reproduced by rendering: a pty harness,
// and some CI and multiplexer contexts, report `rows: 0` rather than omitting
// it, while a test renderer omits it entirely. Treating that zero as a real
// height collapses the list to one row while the header still reports the full
// count — a screen that looks correct and is quietly missing most of its data.
export const listRows = (
  terminalRows: number | undefined,
  chromeRows: number,
  overlayRows: number,
  fallbackRows = 24,
): number =>
  Math.max(1, (terminalRows || fallbackRows) - chromeRows - overlayRows)

// How many entries a detail panel may draw, given everything else the screen
// has to keep. The panel used to size itself from its content alone, capped at
// a constant, and the list was the only thing that gave way — so on a short
// terminal the list collapsed to its one-row floor and the panel still pushed
// the footer off the bottom. The panel has to yield too: the list keeps its
// selected row (the panel is about that row), the panel keeps its frame and
// fixed lines, and the entries get what is left, down to none.
export const detailRows = ({
  terminalRows,
  chromeRows,
  panelChromeRows,
  fixedRows,
  entries,
  maxEntries,
  fallbackRows = 24,
}: {
  terminalRows: number | undefined
  chromeRows: number
  /** The panel's border, the margin above it and its heading. */
  panelChromeRows: number
  /** Lines the panel always draws besides its entries. */
  fixedRows: number
  entries: number
  maxEntries: number
  fallbackRows?: number
}): number => {
  const spare =
    (terminalRows || fallbackRows) - chromeRows - 1 - panelChromeRows - fixedRows
  return Math.max(0, Math.min(entries, maxEntries, spare))
}
