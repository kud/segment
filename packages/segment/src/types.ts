export type Source = {
  id: string
  slug: string
  name: string
  enabled: boolean
  workspaceId: string
  writeKeys: string[]
  metadata?: {
    id: string
    name: string
    slug: string
  }
}

export type Destination = {
  id: string
  name: string
  enabled: boolean
  sourceId: string
  metadata: {
    id: string
    name: string
    slug: string
  }
  settings: Record<string, unknown>
}

export type DestinationMetadataOption = {
  name: string
  type: string
  required: boolean
  description?: string
  label?: string
}

export type DestinationMetadata = {
  id: string
  name: string
  slug: string
  description?: string
  website?: string
  status?: string
  categories?: string[]
  options: DestinationMetadataOption[]
}
