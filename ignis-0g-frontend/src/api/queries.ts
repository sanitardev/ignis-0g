import { queryOptions } from "@tanstack/react-query"
import { api, type ListStudiesParams } from "./client"

const studiesKey = ["studies"] as const
const studyKey = (id: string) => [...studiesKey, "detail", id] as const

export const studyQueries = {
  all: studiesKey,
  list: (params: ListStudiesParams = { limit: 100, offset: 0 }) =>
    queryOptions({
      queryKey: [...studiesKey, "list", params],
      queryFn: ({ signal }) => api.listStudies(params, signal),
    }),
  filters: () =>
    queryOptions({
      queryKey: [...studiesKey, "filters"],
      queryFn: ({ signal }) => api.getFilters(signal),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: studyKey(id),
      queryFn: ({ signal }) => api.getStudy(id, signal),
      enabled: Boolean(id),
    }),
  datasets: (id: string) =>
    queryOptions({
      queryKey: [...studyKey(id), "datasets"],
      queryFn: ({ signal }) => api.listDatasets(id, signal),
      enabled: Boolean(id),
    }),
  relations: (id: string) =>
    queryOptions({
      queryKey: [...studyKey(id), "relations"],
      queryFn: ({ signal }) => api.listRelations(id, signal),
      enabled: Boolean(id),
    }),
  graph: (studyId?: string, depth = 1) =>
    queryOptions({
      queryKey: ["nexus", "graph", studyId ?? "all", depth],
      queryFn: ({ signal }) => api.getGraph(studyId, depth, signal),
    }),
}
