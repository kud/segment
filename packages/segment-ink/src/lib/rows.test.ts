import { describe, it, expect } from "vitest"
import { detailRows, listRows } from "./rows.js"

const panel = {
  chromeRows: 8,
  panelChromeRows: 4,
  fixedRows: 5,
  maxEntries: 10,
}

describe("listRows", () => {
  it("treats a reported height of zero as unknown, not as no room", () => {
    expect(listRows(0, 8, 0)).toBe(16)
    expect(listRows(undefined, 8, 0)).toBe(16)
  })

  it("never drops below the selected row", () => {
    expect(listRows(10, 8, 20)).toBe(1)
  })
})

describe("detailRows", () => {
  it("draws every entry when the terminal has room", () => {
    expect(detailRows({ ...panel, terminalRows: 40, entries: 4 })).toBe(4)
  })

  it("stops at the cap however tall the terminal is", () => {
    expect(detailRows({ ...panel, terminalRows: 80, entries: 30 })).toBe(10)
  })

  // 20 rows less the chrome, the list's one row, the panel frame and its fixed
  // lines leaves two: the panel gives way rather than the footer.
  it("gives up entries on a short terminal instead of the footer", () => {
    expect(detailRows({ ...panel, terminalRows: 20, entries: 4 })).toBe(2)
  })

  it("goes to none, never negative, when nothing is left", () => {
    expect(detailRows({ ...panel, terminalRows: 12, entries: 4 })).toBe(0)
  })

  it("budgets against the fallback when the height is unknown", () => {
    expect(detailRows({ ...panel, terminalRows: 0, entries: 30 })).toBe(6)
  })
})
