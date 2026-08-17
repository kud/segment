import type {
  Destination,
  DestinationMetadata,
  Source,
} from "@kud/segment"

// The structural subset of SegmentClient that these components actually call.
// Typing against the shape rather than the concrete class is what lets a
// fixture satisfy it without subclassing — SegmentClient carries private state
// and a constructor that demands a real token, so a mock could never extend it.
// Anything added here must also be added to createMockClient, or --mock renders
// a screen that is half fixture and half crash.
export type SegmentLike = {
  listSources: () => Promise<Source[]>
  getSource: (id: string) => Promise<Source>
  listSourceDestinations: (sourceId: string) => Promise<Destination[]>
  listDestinationMetadata: () => Promise<DestinationMetadata[]>
  getDestinationMetadata: (metadataId: string) => Promise<DestinationMetadata>
}
