import assert from "node:assert/strict"
import { test } from "node:test"
import { HttpError, SegmentClient } from "../src/segment-client.js"

type MockResponse = {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
  text?: () => Promise<string>
}

const mockFetchSequence = (responses: MockResponse[]) => {
  let call = 0
  const calls: Array<{ url: string }> = []
  const fn = async (url: string | URL) => {
    calls.push({ url: String(url) })
    const response = responses[call]
    call += 1
    if (!response) throw new Error("no more mock responses queued")
    return {
      ok: response.ok,
      status: response.status,
      json: response.json ?? (async () => ({})),
      text: response.text ?? (async () => ""),
    } as unknown as Response
  }
  return { fn: fn as unknown as typeof fetch, calls }
}

test("unwraps the data envelope", async () => {
  const { fn } = mockFetchSequence([
    {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: "src_1",
          slug: "s",
          name: "N",
          enabled: true,
          workspaceId: "w",
          writeKeys: [],
        },
      }),
    },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token")
  const source = await client.getSource("src_1")
  assert.equal(source.id, "src_1")
  assert.equal("data" in source, false)
})

test("follows cursor pagination and concatenates results", async () => {
  const { fn, calls } = mockFetchSequence([
    {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          sources: [{ id: "1" }],
          pagination: { count: 1, next: { cursor: "abc" } },
        },
      }),
    },
    {
      ok: true,
      status: 200,
      json: async () => ({
        data: { sources: [{ id: "2" }], pagination: { count: 1, next: null } },
      }),
    },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token")
  const sources = await client.listSources()
  assert.deepEqual(
    sources.map((source) => source.id),
    ["1", "2"],
  )
  assert.equal(calls.length, 2)
  assert.match(calls[1]?.url ?? "", /pagination\.cursor=abc/)
})

test("throws HttpError carrying the response status", async () => {
  const { fn } = mockFetchSequence([
    { ok: false, status: 404, text: async () => "" },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token")
  await assert.rejects(
    () => client.getSource("missing"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError)
      assert.equal(error.status, 404)
      return true
    },
  )
})

test("surfaces the message from a Segment errors body", async () => {
  const { fn } = mockFetchSequence([
    {
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          errors: [{ type: "bad_request", message: "sourceId is invalid" }],
        }),
    },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token")
  await assert.rejects(
    () => client.getSource("bad"),
    (error: unknown) => {
      assert.ok(error instanceof HttpError)
      assert.match((error as Error).message, /sourceId is invalid/)
      return true
    },
  )
})

test("maps the eu region to the eu base URL", async () => {
  const { fn, calls } = mockFetchSequence([
    {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "x" } }),
    },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token", { region: "eu" })
  await client.getSource("x")
  assert.match(calls[0]?.url ?? "", /^https:\/\/eu1\.api\.segmentapis\.com/)
})

test("maps the us region to the default base URL", async () => {
  const { fn, calls } = mockFetchSequence([
    {
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "x" } }),
    },
  ])
  globalThis.fetch = fn
  const client = new SegmentClient("token", { region: "us" })
  await client.getSource("x")
  assert.match(calls[0]?.url ?? "", /^https:\/\/api\.segmentapis\.com/)
})
