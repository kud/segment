import { useEffect, useState } from "react"
import { useStdout } from "ink"

export type TerminalSize = {
  rows: number | undefined
  columns: number | undefined
}

// Ink 8 types `useStdout().stdout` as a plain `NodeJS.WritableStream`, so the
// TTY-only `rows`/`columns` are no longer in its type. They are still there at
// runtime on a real terminal, and absent on a pipe, which is the case the
// budgeting fallbacks already cover.
type MaybeTty = { rows?: number; columns?: number }

const read = (stdout: NodeJS.WritableStream | undefined) => {
  const tty = stdout as MaybeTty | undefined
  return { rows: tty?.rows, columns: tty?.columns }
}

// The terminal size, re-read on every resize. Reading `stdout.rows` during
// render only picks up a new size when something else happens to re-render:
// Ink re-lays out the existing tree on resize but never re-runs components, so
// a window shrunk while the screen sat idle kept the old row budget and pushed
// the footer off the bottom until the next keypress. The raw values are kept —
// undefined or 0 included — because the budgeting functions own the fallbacks.
export const useTerminalSize = (): TerminalSize => {
  const { stdout } = useStdout()
  const [size, setSize] = useState<TerminalSize>(() => read(stdout))

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setSize(read(stdout))
    stdout.on("resize", onResize)
    return () => {
      stdout.off("resize", onResize)
    }
  }, [stdout])

  return size
}
