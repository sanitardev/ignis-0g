export type UUID = string
export type StudyId = string
export type SourceType = "article" | "report" | "webpage" | "dataset" | "video" | "other"
export type RelationType = "supports" | "contradicts" | "complements" | "similar"

export interface StudyConditions {
  flow_regime?: string | null
  pressure_kpa?: [number | null, number | null] | null
  o2_pct?: [number | null, number | null] | null
  flow_cms?: [number | null, number | null] | null
  diluents?: string[] | null
  loi_pct?: string | number | null
  [key: string]: unknown
}

export interface StudySummary {
  id: StudyId
  title: string
  description: string
  category: string
  tags: string[]
  thumbnail_url: string | null
}

export interface Source {
  id: UUID
  study_id: StudyId
  title: string
  url: string
  source_type: SourceType
}

export interface Finding {
  id: UUID
  source_id: UUID
  claim: string
  evidence: string
  locator: string | null
  safety_impact: string | null
}

export interface Media {
  id: UUID
  source_id: UUID
  media_type: "image" | "video" | "link"
  url: string
  caption: string
}

export interface DatasetSummary {
  id: UUID
  source_id: UUID
  title: string
  chart_type: "line" | "scatter" | "bar"
  locator: string | null
  notes: string | null
}

export interface SafetyImplication {
  finding_id: UUID
  source_id: UUID
  text: string
}

export interface StudyDetail extends StudySummary {
  methodology: string | null
  conditions: StudyConditions
  findings: Finding[]
  sources: Source[]
  media: Media[]
  datasets: DatasetSummary[]
  safety_implications: SafetyImplication[]
}

export interface StudyList {
  items: StudySummary[]
  total: number
  limit: number
  offset: number
}

export interface CatalogFilters {
  categories: string[]
  tags: string[]
}

export interface DataPoint {
  x: number | string
  y: number | null
}

export interface DataSeries {
  id: string
  label: string
  points: DataPoint[]
}

export interface Dataset extends DatasetSummary {
  x_label: string
  y_label: string
  units: { x: string | null; y: string | null }
  series: DataSeries[]
  provenance: "reported" | "digitized" | "derived"
}

export interface RelationEvidence {
  excerpt: string
  locator: string | null
}

export interface Relation {
  id: UUID
  from_study_id: StudyId
  to_study_id: StudyId
  relation_type: RelationType
  explanation: string
  source_id: UUID
  source_url: string
  evidence: RelationEvidence
}

export interface GraphNode {
  id: StudyId
  type: "study"
  label: string
}

export interface GraphEdge {
  id: UUID
  source: StudyId
  target: StudyId
  type: RelationType
  explanation: string
  source_id: UUID
  source_url: string
  evidence: RelationEvidence
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  truncated: boolean
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatRequest {
  message: string
  study_id?: StudyId | null
  history?: ChatMessage[]
  scope?: "study" | "global"
}

export interface Citation {
  chunk_id: UUID
  source_id: UUID
  title: string
  url: string
  excerpt: string
  locator: string | null
}

export interface ChatResponse {
  status: "answered" | "insufficient_evidence"
  answer: string
  citations: Citation[]
  related_study_ids: StudyId[]
  suggested_questions: string[]
}

export interface CompareRequest {
  study_ids: StudyId[]
  focus?: string | null
}

export interface CompareItem {
  text: string
  citation_indices: number[]
}

export interface CompareResponse {
  status: "answered" | "insufficient_evidence"
  summary: string
  similarities: CompareItem[]
  differences: CompareItem[]
  limitations: string[]
  citations: Citation[]
}

export interface BackendErrorResponse {
  error: {
    code: string
    message: string
    request_id: string
    details: { field: string; message: string }[]
  }
}
