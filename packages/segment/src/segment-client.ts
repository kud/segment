import type { Destination, DestinationMetadata, Source } from "./types.js"
import type { Region } from "./config.js"

export class HttpError extends Error {
  status: number
  body?: string

  constructor(message: string, status: number, body?: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.body = body
  }
}

type SegmentClientOptions = {
  region?: Region
  timeout?: number
  retries?: number
}

type Envelope<T> = { data: T }

type Pagination = {
  count: number
  next?: { cursor: string } | null
}

type PaginatedEnvelope<Key extends string, Item> = {
  data: Record<Key, Item[]> & { pagination?: Pagination }
}

const BASE_URLS: Record<Region, string> = {
  us: "https://api.segmentapis.com",
  eu: "https://eu1.api.segmentapis.com",
}

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_RETRIES = 0
const RETRY_BASE_DELAY_MS = 500
const PAGE_SIZE = 200

const getFetch = () => globalThis.fetch as typeof fetch

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const parseErrorMessage = (bodyText: string): string | undefined => {
  try {
    const parsed = JSON.parse(bodyText) as {
      errors?: Array<{ message?: string }>
    }
    return parsed.errors?.[0]?.message
  } catch {
    return undefined
  }
}

export class SegmentClient {
  #token: string
  #baseUrl: string
  #timeout: number
  #retries: number

  constructor(token: string, opts: SegmentClientOptions = {}) {
    this.#token = token
    this.#baseUrl = BASE_URLS[opts.region ?? "us"]
    this.#timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS
    this.#retries = opts.retries ?? DEFAULT_RETRIES
  }

  async #requestOnce<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.#timeout)

    try {
      const response = await getFetch()(`${this.#baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.#token}`,
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      })

      if (!response.ok) {
        const bodyText = await response.text()
        const parsedMessage = parseErrorMessage(bodyText)
        throw new HttpError(
          this.#describeError(response.status, parsedMessage),
          response.status,
          bodyText,
        )
      }

      if (response.status === 204) return undefined as T
      const json = (await response.json()) as Envelope<T>
      return json.data
    } finally {
      clearTimeout(timer)
    }
  }

  #describeError(status: number, message?: string): string {
    if (status === 401) {
      return message
        ? `${message} — check SEGMENT_API_TOKEN`
        : "unauthorized — check SEGMENT_API_TOKEN"
    }
    if (status === 403) {
      return message
        ? `${message} — the token may lack the required workspace permission`
        : "forbidden — the token may lack the required workspace permission"
    }
    return message ?? `request failed with status ${status}`
  }

  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let attempt = 0
    for (;;) {
      try {
        return await this.#requestOnce<T>(path, init)
      } catch (error) {
        const isRetryableStatus =
          error instanceof HttpError && error.status >= 500
        const isNetworkError = !(error instanceof HttpError)
        const canRetry =
          (isRetryableStatus || isNetworkError) && attempt < this.#retries

        if (!canRetry) throw error
        await wait(RETRY_BASE_DELAY_MS * 2 ** attempt)
        attempt += 1
      }
    }
  }

  async #listAllPages<Key extends string, Item>(
    path: string,
    key: Key,
  ): Promise<Item[]> {
    const items: Item[] = []
    let cursor: string | undefined

    for (;;) {
      const query = new URLSearchParams({
        "pagination.count": String(PAGE_SIZE),
      })
      if (cursor) query.set("pagination.cursor", cursor)

      const data = await this.#request<PaginatedEnvelope<Key, Item>["data"]>(
        `${path}?${query.toString()}`,
      )
      items.push(...data[key])

      const next = data.pagination?.next
      if (!next?.cursor) break
      cursor = next.cursor
    }

    return items
  }

  listSources(): Promise<Source[]> {
    return this.#listAllPages("/sources", "sources")
  }

  getSource(id: string): Promise<Source> {
    return this.#request(`/sources/${id}`)
  }

  listSourceDestinations(sourceId: string): Promise<Destination[]> {
    return this.#request(`/sources/${sourceId}/destinations`)
  }

  listDestinations(): Promise<Destination[]> {
    return this.#listAllPages("/destinations", "destinations")
  }

  getDestination(id: string): Promise<Destination> {
    return this.#request(`/destinations/${id}`)
  }

  createDestination(input: {
    sourceId: string
    metadataId: string
    name?: string
    enabled?: boolean
    settings: Record<string, unknown>
  }): Promise<Destination> {
    return this.#request("/destinations", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }

  updateDestination(
    id: string,
    patch: {
      name?: string
      enabled?: boolean
      settings?: Record<string, unknown>
    },
  ): Promise<Destination> {
    return this.#request(`/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
  }

  async deleteDestination(id: string): Promise<void> {
    await this.#request(`/destinations/${id}`, { method: "DELETE" })
  }

  getDestinationMetadata(metadataId: string): Promise<DestinationMetadata> {
    return this.#request(`/catalog/destinations/${metadataId}`)
  }

  listDestinationMetadata(): Promise<DestinationMetadata[]> {
    return this.#listAllPages("/catalog/destinations", "destinations")
  }
}
