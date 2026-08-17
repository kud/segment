import assert from "node:assert/strict"
import { test } from "node:test"

import { formatTable, maskToken, truncate } from "../src/format.js"

// A short token must not be partially revealed: slicing four characters from
// each end of an eight-character token would print the whole thing.
test("maskToken never reveals a short token", () => {
  assert.equal(maskToken("12345678"), "••••")
  assert.equal(maskToken(""), "••••")
})

test("maskToken keeps only the first and last four characters", () => {
  assert.equal(maskToken("sgp_abcdefghijklmnop"), "sgp_…mnop")
})

test("truncate leaves short values untouched", () => {
  assert.equal(truncate("abc", 10), "abc")
})

// Column width is measured on visible characters, so a coloured cell must not
// widen its column by the length of its escape codes.
test("formatTable aligns columns regardless of ANSI codes", () => {
  const esc = "\u001b"
  const plain = formatTable(["a", "b"], [["xx", "y"]])
  const coloured = formatTable(["a", "b"], [[`${esc}[32mxx${esc}[39m`, "y"]])
  const strip = (value: string) => value.split(/\u001b\[\d+m/).join("")
  assert.equal(strip(coloured), strip(plain))
})
