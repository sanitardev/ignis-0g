import type {
  CatalogFilters,
  ChatResponse,
  Citation,
  CompareItem,
  CompareResponse,
  Dataset,
  DatasetSummary,
  Finding,
  Graph,
  GraphEdge,
  GraphNode,
  Media,
  Relation,
  SafetyImplication,
  Source,
  StudyDetail,
  StudyList,
  StudySummary,
} from "@/domain/types"

type Validator<T> = (value: unknown) => value is T

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
  } catch {
    return false
  }
}

export function isStudySummary(value: unknown): value is StudySummary {
  return isRecord(value) && isId(value.id) && isId(value.title) &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    Array.isArray(value.tags) && value.tags.every((t) => typeof t === "string") &&
    (value.thumbnail_url === null || isWebUrl(value.thumbnail_url))
}

export function isStudyList(value: unknown): value is StudyList {
  return isRecord(value) &&
    Array.isArray(value.items) && value.items.every(isStudySummary) &&
    typeof value.total === "number" &&
    typeof value.limit === "number" &&
    typeof value.offset === "number"
}

export function isCatalogFilters(value: unknown): value is CatalogFilters {
  return isRecord(value) &&
    Array.isArray(value.categories) && value.categories.every((c) => typeof c === "string") &&
    Array.isArray(value.tags) && value.tags.every((t) => typeof t === "string")
}

export function isSource(value: unknown): value is Source {
  return isRecord(value) && isId(value.id) && isId(value.study_id) && isId(value.title) &&
    isWebUrl(value.url) &&
    (value.source_type === "article" || value.source_type === "report" || value.source_type === "webpage" ||
      value.source_type === "dataset" || value.source_type === "video" || value.source_type === "other")
}

export function isFinding(value: unknown): value is Finding {
  return isRecord(value) && isId(value.id) && isId(value.source_id) &&
    typeof value.claim === "string" && typeof value.evidence === "string" &&
    isNullableString(value.locator) && isNullableString(value.safety_impact)
}

export function isMedia(value: unknown): value is Media {
  return isRecord(value) && isId(value.id) && isId(value.source_id) &&
    (value.media_type === "image" || value.media_type === "video" || value.media_type === "link") &&
    isWebUrl(value.url) && typeof value.caption === "string"
}

export function isDatasetSummary(value: unknown): value is DatasetSummary {
  return isRecord(value) && isId(value.id) && isId(value.source_id) && isId(value.title) &&
    (value.chart_type === "line" || value.chart_type === "scatter" || value.chart_type === "bar") &&
    isNullableString(value.locator) && isNullableString(value.notes)
}

export function isSafetyImplication(value: unknown): value is SafetyImplication {
  return isRecord(value) && isId(value.finding_id) && isId(value.source_id) && typeof value.text === "string"
}

export function isStudyDetail(value: unknown): value is StudyDetail {
  return isStudySummary(value) &&
    isNullableString((value as StudyDetail).methodology) &&
    isRecord((value as StudyDetail).conditions) &&
    Array.isArray((value as StudyDetail).findings) && (value as StudyDetail).findings.every(isFinding) &&
    Array.isArray((value as StudyDetail).sources) && (value as StudyDetail).sources.every(isSource) &&
    Array.isArray((value as StudyDetail).media) && (value as StudyDetail).media.every(isMedia) &&
    Array.isArray((value as StudyDetail).datasets) && (value as StudyDetail).datasets.every(isDatasetSummary) &&
    Array.isArray((value as StudyDetail).safety_implications) && (value as StudyDetail).safety_implications.every(isSafetyImplication)
}

export function isDataset(value: unknown): value is Dataset {
  return isDatasetSummary(value) &&
    typeof (value as Dataset).x_label === "string" &&
    typeof (value as Dataset).y_label === "string" &&
    isRecord((value as Dataset).units) &&
    isNullableString((value as Dataset).units.x) &&
    isNullableString((value as Dataset).units.y) &&
    Array.isArray((value as Dataset).series) &&
    ((value as Dataset).provenance === "reported" || (value as Dataset).provenance === "digitized" || (value as Dataset).provenance === "derived")
}

function isRelationType(value: unknown): value is Relation["relation_type"] {
  return value === "supports" || value === "contradicts" || value === "complements" || value === "similar"
}

export function isRelation(value: unknown): value is Relation {
  return isRecord(value) && isId(value.id) && isId(value.from_study_id) && isId(value.to_study_id) &&
    isRelationType(value.relation_type) && typeof value.explanation === "string" &&
    isId(value.source_id) && isWebUrl(value.source_url) &&
    isRecord(value.evidence) && typeof value.evidence.excerpt === "string" && isNullableString(value.evidence.locator)
}

function isGraphNode(value: unknown): value is GraphNode {
  return isRecord(value) && isId(value.id) && value.type === "study" && typeof value.label === "string"
}

function isGraphEdge(value: unknown): value is GraphEdge {
  return isRecord(value) && isId(value.id) && isId(value.source) && isId(value.target) &&
    isRelationType(value.type) && typeof value.explanation === "string" &&
    isId(value.source_id) && isWebUrl(value.source_url) &&
    isRecord(value.evidence) && typeof value.evidence.excerpt === "string" && isNullableString(value.evidence.locator)
}

export function isGraph(value: unknown): value is Graph {
  return isRecord(value) &&
    Array.isArray(value.nodes) && value.nodes.every(isGraphNode) &&
    Array.isArray(value.edges) && value.edges.every(isGraphEdge) &&
    typeof value.truncated === "boolean"
}

function isCitation(value: unknown): value is Citation {
  return isRecord(value) && isId(value.chunk_id) && isId(value.source_id) &&
    typeof value.title === "string" && isWebUrl(value.url) &&
    typeof value.excerpt === "string" && isNullableString(value.locator)
}

export function isChatResponse(value: unknown): value is ChatResponse {
  return isRecord(value) &&
    (value.status === "answered" || value.status === "insufficient_evidence") &&
    typeof value.answer === "string" &&
    Array.isArray(value.citations) && value.citations.every(isCitation) &&
    Array.isArray(value.related_study_ids) && value.related_study_ids.every(isId) &&
    Array.isArray(value.suggested_questions) && value.suggested_questions.every((q) => typeof q === "string")
}

function isCompareItem(value: unknown): value is CompareItem {
  return isRecord(value) && typeof value.text === "string" &&
    Array.isArray(value.citation_indices) && value.citation_indices.every((i) => typeof i === "number")
}

export function isCompareResponse(value: unknown): value is CompareResponse {
  return isRecord(value) &&
    (value.status === "answered" || value.status === "insufficient_evidence") &&
    typeof value.summary === "string" &&
    Array.isArray(value.similarities) && value.similarities.every(isCompareItem) &&
    Array.isArray(value.differences) && value.differences.every(isCompareItem) &&
    Array.isArray(value.limitations) && value.limitations.every((l) => typeof l === "string") &&
    Array.isArray(value.citations) && value.citations.every(isCitation)
}

export function isArrayOf<T>(validate: Validator<T>): Validator<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(validate)
}
