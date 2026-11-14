import {
  isArrayOf,
  isCatalogFilters,
  isChatResponse,
  isCompareResponse,
  isDataset,
  isGraph,
  isRelation,
  isStudyDetail,
  isStudyList,
} from "./validation"
import type {
  BackendErrorResponse,
  CatalogFilters,
  ChatRequest,
  ChatResponse,
  CompareRequest,
  CompareResponse,
  Dataset,
  Graph,
  Relation,
  StudyDetail,
  StudyList,
} from "@/domain/types"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly requestId?: string,
    readonly retryAfter?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface ListStudiesParams {
  q?: string
  category?: string
  tag?: string
  limit?: number
  offset?: number
}

interface ApiClient {
  listStudies(params?: ListStudiesParams, signal?: AbortSignal): Promise<StudyList>
  getFilters(signal?: AbortSignal): Promise<CatalogFilters>
  getStudy(id: string, signal?: AbortSignal): Promise<StudyDetail>
  listDatasets(studyId: string, signal?: AbortSignal): Promise<Dataset[]>
  listRelations(studyId: string, signal?: AbortSignal): Promise<Relation[]>
  getGraph(studyId?: string, depth?: number, signal?: AbortSignal): Promise<Graph>
  askAssistant(payload: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>
  compareStudies(payload: CompareRequest, signal?: AbortSignal): Promise<CompareResponse>
}

const rawBase = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "")
const apiBaseUrl = rawBase === "/api" ? "/api/v1" : rawBase
export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false"

async function request<T>(
  path: string,
  validate: (value: unknown) => value is T,
  options: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { method = "GET", body, signal, timeoutMs = 15_000 } = options
  const timeout = AbortSignal.timeout(timeoutMs)
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout

  try {
    requestSignal.throwIfAborted()
    const headers: Record<string, string> = { Accept: "application/json" }
    const serialized = body !== undefined ? JSON.stringify(body) : undefined
    if (serialized !== undefined) headers["Content-Type"] = "application/json"

    const response = useMocks
      ? await (await import("@/mocks/transport")).mockFetch(path, { method, body: serialized, signal: requestSignal })
      : await fetch(`${apiBaseUrl}${path}`, {
          method,
          body: serialized,
          signal: requestSignal,
          headers,
        })

    if (!response.ok) {
      let code: string | undefined
      let message = `${method} ${path}: HTTP ${response.status}`
      let requestId = response.headers.get("X-Request-ID") ?? undefined
      const retryHeader = response.headers.get("Retry-After")
      const retryAfter = retryHeader && Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : undefined
      try {
        const errJson = (await response.json()) as Partial<BackendErrorResponse>
        if (errJson?.error) {
          code = errJson.error.code
          message = errJson.error.message || message
          requestId = errJson.error.request_id || requestId
        }
      } catch {
        // Ignore non-JSON error body
      }
      throw new ApiError(response.status, message, code, requestId, retryAfter)
    }

    const data: unknown = await response.json()
    requestSignal.throwIfAborted()
    if (!validate(data)) throw new ApiError(422, `${method} ${path}: unexpected response`)
    return data
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof ApiError) throw error
    if (timeout.aborted) throw new ApiError(408, `${method} ${path}: timeout`)
    if (error instanceof SyntaxError) throw new ApiError(422, `${method} ${path}: invalid JSON`)
    if (error instanceof TypeError) throw new ApiError(0, `${method} ${path}: network failure`)
    throw error
  }
}

const studyPath = (id: string) => `/studies/${encodeURIComponent(id)}`

export const api: ApiClient = {
  listStudies(params = {}, signal) {
    const query = new URLSearchParams()
    if (params.q?.trim()) query.set("q", params.q.trim())
    if (params.category) query.set("category", params.category)
    if (params.tag) query.set("tag", params.tag)
    query.set("limit", String(params.limit ?? 100))
    query.set("offset", String(params.offset ?? 0))
    return request(`/studies?${query.toString()}`, isStudyList, { signal })
  },
  getFilters(signal) {
    return request("/catalog/filters", isCatalogFilters, { signal })
  },
  getStudy(id, signal) {
    return request(studyPath(id), (value): value is StudyDetail => isStudyDetail(value) && value.id === id, { signal })
  },
  listDatasets(id, signal) {
    return request(`${studyPath(id)}/datasets`, isArrayOf(isDataset), { signal })
  },
  listRelations(id, signal) {
    return request(`${studyPath(id)}/relations`, isArrayOf(isRelation), { signal })
  },
  getGraph(studyId, depth = 1, signal) {
    const query = new URLSearchParams()
    if (studyId) query.set("study_id", studyId)
    query.set("depth", String(depth))
    return request(`/nexus/graph?${query.toString()}`, isGraph, { signal })
  },
  askAssistant(payload, signal) {
    return request("/assistant/chat", isChatResponse, {
      method: "POST",
      body: payload,
      signal,
      timeoutMs: 42_000,
    })
  },
  compareStudies(payload, signal) {
    return request("/assistant/compare", isCompareResponse, {
      method: "POST",
      body: payload,
      signal,
      timeoutMs: 42_000,
    })
  },
}
