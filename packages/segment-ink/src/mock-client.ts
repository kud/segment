import type { Destination, DestinationMetadata, Source } from "@kud/segment"
import type { SegmentLike } from "./lib/segment-like.js"

// Deliberately unmistakable: a fixture that looks like a real credential trips
// secret scanners and teaches every reader after you to ignore them. Named so
// assertions reference the role rather than the literal, which is what let an
// earlier value change break a test that had nothing to do with it.
export const FIXTURE_AMPLITUDE_API_KEY = "FIXTURE-not-a-real-key"

// A fixture workspace, no network and nothing that moves: no randomness, no
// clock, no ids derived from anything but these literals. It backs the CLI's
// --mock flag, and a screenshot taken through that flag has to be reproducible
// a month later or it is not documentation, it is a photograph.
//
// It implements every method of SegmentLike deliberately. A half-mocked client
// falls back to the real one on whatever it missed, and the result is a
// screenshot showing invented sources beside a real workspace's destinations —
// which nobody can tell apart afterwards.

const WORKSPACE_ID = "wsp_29lz0mockworkspace"

const SOURCES: Source[] = [
  {
    id: "src_01website",
    slug: "marketing-site",
    name: "Marketing Site",
    enabled: true,
    workspaceId: WORKSPACE_ID,
    writeKeys: ["wk_mkt_9f2a41c7b8d0", "wk_mkt_legacy_3311ab"],
    metadata: { id: "meta_javascript", name: "Javascript", slug: "javascript" },
  },
  {
    id: "src_02ios",
    slug: "ios-app",
    name: "iOS App",
    enabled: true,
    workspaceId: WORKSPACE_ID,
    writeKeys: ["wk_ios_5c1e77a0f43b"],
    metadata: { id: "meta_ios", name: "Swift", slug: "swift" },
  },
  {
    id: "src_03android",
    slug: "android-app",
    name: "Android App",
    enabled: false,
    workspaceId: WORKSPACE_ID,
    writeKeys: ["wk_and_b40d92ee1c65"],
    metadata: { id: "meta_android", name: "Kotlin", slug: "kotlin" },
  },
  {
    id: "src_04server",
    slug: "orders-service",
    name: "Orders Service",
    enabled: true,
    workspaceId: WORKSPACE_ID,
    writeKeys: ["wk_srv_7a3f18d5e290"],
    metadata: { id: "meta_node", name: "Node.js", slug: "node" },
  },
]

const DESTINATIONS: Destination[] = [
  {
    id: "dst_01amplitude",
    name: "Amplitude",
    enabled: true,
    sourceId: "src_01website",
    metadata: { id: "meta_amplitude", name: "Amplitude", slug: "amplitude" },
    settings: {
      apiKey: FIXTURE_AMPLITUDE_API_KEY,
      trackAllPages: true,
      groupTypeTrait: "company",
      residencyServer: "standard",
    },
  },
  {
    id: "dst_02ga4",
    name: "Google Analytics 4",
    enabled: true,
    sourceId: "src_01website",
    metadata: {
      id: "meta_ga4",
      name: "Google Analytics 4 Web",
      slug: "google-analytics-4",
    },
    settings: { measurementId: "G-8QF2LM03KD", enableConsentMode: false },
  },
  {
    id: "dst_03webhook",
    name: "Ops Webhook",
    enabled: false,
    sourceId: "src_01website",
    metadata: { id: "meta_webhooks", name: "Webhooks", slug: "webhooks" },
    settings: {
      globalHook: "https://hooks.example.internal/segment",
      sharedSecret: "shh_2f81",
    },
  },
  {
    id: "dst_04amplitude-ios",
    name: "Amplitude",
    enabled: true,
    sourceId: "src_02ios",
    metadata: { id: "meta_amplitude", name: "Amplitude", slug: "amplitude" },
    settings: { apiKey: FIXTURE_AMPLITUDE_API_KEY, trackSessionEvents: true },
  },
  {
    id: "dst_05android-mixpanel",
    name: "Mixpanel",
    enabled: false,
    sourceId: "src_03android",
    metadata: { id: "meta_mixpanel", name: "Mixpanel", slug: "mixpanel" },
    settings: { token: "mx_0b7c" },
  },
  {
    id: "dst_06s3",
    name: "Orders Archive",
    enabled: true,
    sourceId: "src_04server",
    metadata: { id: "meta_s3", name: "Amazon S3", slug: "amazon-s3" },
    settings: { bucket: "acme-segment-archive", region: "eu-west-1" },
  },
]

const CATALOG: DestinationMetadata[] = [
  {
    id: "meta_amplitude",
    name: "Amplitude",
    slug: "amplitude",
    description: "Product analytics for behavioural cohorts and funnels.",
    website: "https://amplitude.com",
    status: "PUBLIC",
    categories: ["Analytics", "Product Analytics"],
    options: [
      {
        name: "apiKey",
        label: "API Key",
        type: "string",
        required: true,
        description: "Found under Settings → Projects in Amplitude.",
      },
      {
        name: "secretKey",
        label: "Secret Key",
        type: "string",
        required: false,
        description: "Only needed for server-side deletions.",
      },
      {
        name: "trackAllPages",
        label: "Track All Pages",
        type: "boolean",
        required: false,
        description: "Send a Loaded a Page event for every page call.",
      },
      {
        name: "residencyServer",
        label: "Residency Server",
        type: "string",
        required: false,
        description: "standard or EU, matching your Amplitude region.",
      },
      {
        name: "groupTypeTrait",
        label: "Group Type Trait",
        type: "string",
        required: false,
        description: "Trait used as the Amplitude group type.",
      },
    ],
  },
  {
    id: "meta_ga4",
    name: "Google Analytics 4 Web",
    slug: "google-analytics-4",
    description: "Google's web and app analytics, event-based model.",
    website: "https://analytics.google.com",
    status: "PUBLIC",
    categories: ["Analytics"],
    options: [
      {
        name: "measurementId",
        label: "Measurement ID",
        type: "string",
        required: true,
        description: "The G-XXXXXXX id for the GA4 web stream.",
      },
      {
        name: "enableConsentMode",
        label: "Enable Consent Mode",
        type: "boolean",
        required: false,
        description: "Defer tags until consent is granted.",
      },
    ],
  },
  {
    id: "meta_mixpanel",
    name: "Mixpanel",
    slug: "mixpanel",
    description: "Event analytics with retention and funnel reporting.",
    website: "https://mixpanel.com",
    status: "PUBLIC",
    categories: ["Analytics", "Product Analytics"],
    options: [
      {
        name: "token",
        label: "Project Token",
        type: "string",
        required: true,
        description: "The Mixpanel project token.",
      },
      {
        name: "apiSecret",
        label: "API Secret",
        type: "string",
        required: false,
        description: "Required for server-side imports.",
      },
      {
        name: "euEndpoint",
        label: "Use EU Endpoint",
        type: "boolean",
        required: false,
        description: "Route events to Mixpanel's EU residency servers.",
      },
    ],
  },
  {
    id: "meta_webhooks",
    name: "Webhooks",
    slug: "webhooks",
    description: "Forward raw events to an HTTP endpoint you control.",
    status: "PUBLIC",
    categories: ["Raw Data"],
    options: [
      {
        name: "globalHook",
        label: "Webhook URL",
        type: "string",
        required: true,
        description: "Every event is POSTed here as JSON.",
      },
      {
        name: "sharedSecret",
        label: "Shared Secret",
        type: "string",
        required: false,
        description: "Signs the payload so the receiver can verify it.",
      },
    ],
  },
  {
    id: "meta_s3",
    name: "Amazon S3",
    slug: "amazon-s3",
    description: "Archive raw events to a bucket you own.",
    status: "PUBLIC",
    categories: ["Raw Data", "Warehouses"],
    options: [
      {
        name: "bucket",
        label: "Bucket",
        type: "string",
        required: true,
        description: "Destination bucket name, without the s3:// prefix.",
      },
      {
        name: "region",
        label: "Region",
        type: "string",
        required: true,
        description: "AWS region the bucket lives in.",
      },
    ],
  },
]

// Cloned on the way out so a caller that mutates what it was handed cannot
// change what the next call returns — the real client builds a fresh object per
// request, and a fixture that shares one would diverge from it silently.
const copy = <T>(value: T): T => structuredClone(value)

export const createMockClient = (): SegmentLike => ({
  listSources: async () => copy(SOURCES),

  getSource: async (id) => {
    const found = SOURCES.find((source) => source.id === id)
    if (!found) throw new Error(`no such source: ${id}`)
    return copy(found)
  },

  listSourceDestinations: async (sourceId) =>
    copy(
      DESTINATIONS.filter((destination) => destination.sourceId === sourceId),
    ),

  listDestinationMetadata: async () => copy(CATALOG),

  getDestinationMetadata: async (metadataId) => {
    const found = CATALOG.find((entry) => entry.id === metadataId)
    if (!found) throw new Error(`no such destination metadata: ${metadataId}`)
    return copy(found)
  },
})
