import type {
  ChatRequest,
  ChatResponse,
  Citation,
  CompareItem,
  CompareRequest,
  CompareResponse,
  Graph,
} from "@/domain/types"
import { getQuickMeta } from "@/domain/knowledge"
import { mockDatasets, mockRelations, mockStudies, mockStudyDetails } from "./data"

function notFound(code: string, message: string) {
  return Response.json(
    { error: { code, message, request_id: "mock-req", details: [] } },
    { status: 404 },
  )
}

function buildGraph(studyId?: string, depth = 1): Graph {
  const titleMap = new Map(mockStudies.map((s) => [s.id, s.title]))
  const selected = new Set<string>()
  if (!studyId) {
    mockStudies.slice(0, 50).forEach((s) => selected.add(s.id))
  } else {
    selected.add(studyId)
    let frontier = new Set<string>([studyId])
    for (let d = 0; d < depth; d++) {
      const next = new Set<string>()
      for (const rel of mockRelations) {
        if (frontier.has(rel.from_study_id) && !selected.has(rel.to_study_id)) next.add(rel.to_study_id)
        if (frontier.has(rel.to_study_id) && !selected.has(rel.from_study_id)) next.add(rel.from_study_id)
      }
      next.forEach((id) => selected.add(id))
      frontier = next
    }
  }
  const nodes = Array.from(selected)
    .sort()
    .map((id) => ({ id, type: "study" as const, label: titleMap.get(id) ?? id }))
  const edges = mockRelations
    .filter((r) => selected.has(r.from_study_id) && selected.has(r.to_study_id))
    .map((r) => ({
      id: r.id,
      source: r.from_study_id,
      target: r.to_study_id,
      type: r.relation_type,
      explanation: r.explanation,
      source_id: r.source_id,
      source_url: r.source_url,
      evidence: r.evidence,
    }))
  return { nodes, edges, truncated: false }
}

function handleChat(body: ChatRequest): ChatResponse {
  const q = body.message.toLowerCase()
  const detail = body.study_id ? mockStudyDetails[body.study_id] : undefined
  if (body.study_id && !detail) {
    return {
      status: "insufficient_evidence",
      answer: "Исследование не найдено в локальном каталоге.",
      citations: [],
      related_study_ids: [],
      suggested_questions: [],
    }
  }

  if (detail) {
    const meta = getQuickMeta(detail.id)
    const src = detail.sources[0]
    const citation: Citation = {
      chunk_id: `chunk-${detail.id}`,
      source_id: src.id,
      title: src.title,
      url: src.url,
      excerpt: detail.findings[0]?.evidence ?? detail.description,
      locator: detail.findings[0]?.locator ?? null,
    }
    const o2 = meta?.conditions.o2_pct
    const p = meta?.conditions.pressure_kpa
    const o2Text = o2 && o2[0] !== null ? `${o2[0]}–${o2[1] ?? o2[0]}% O₂` : "диапазон O₂ уточняется"
    const pText = p && p[0] !== null ? `${p[0]}–${p[1] ?? p[0]} кПа` : "давление уточняется"

    let answer = `${detail.description} [1]\n\n**Ключевое влияние на пожарную безопасность:** ${detail.safety_implications[0]?.text ?? "см. отчёт NASA."}`
    if (/услови|кислород|o2|давлен|поток|топлив|оборуд|стойк|cir|msg/i.test(q)) {
      answer = `**Условия и установка (${detail.title}):**\n- Установка: ${meta?.facility ?? "МКС"}\n- Топливо/образец: ${meta?.fuelMaterial ?? "см. методологию"}\n- Атмосфера: ${o2Text}, ${pText}\n- Методология: ${detail.methodology ?? "—"} [1]`
    } else if (/вывод|результат|итог|безопасн|лун|земл/i.test(q)) {
      answer = `**Основные выводы (${detail.title}):**\n${detail.description} [1]\n\n**Практическое значение:** ${detail.safety_implications[0]?.text ?? ""}`
    }

    const relatedIds = mockRelations
      .filter((r) => r.from_study_id === detail.id || r.to_study_id === detail.id)
      .map((r) => (r.from_study_id === detail.id ? r.to_study_id : r.from_study_id))
      .slice(0, 3)

    return {
      status: "answered",
      answer,
      citations: [citation],
      related_study_ids: relatedIds,
      suggested_questions: [
        `Какие условия O₂ и давления использовались в ${detail.category}?`,
        "Как эти результаты влияют на пожарную безопасность лунной базы?",
      ],
    }
  }

  // Global search across mockStudies
  const tokens = q.split(/\s+/).filter((t) => t.length > 2)
  const ranked = mockStudies
    .map((s) => {
      const hay = `${s.id} ${s.title} ${s.description} ${s.category} ${s.tags.join(" ")}`.toLowerCase()
      const hits = tokens.filter((t) => hay.includes(t)).length
      return { study: s, hits }
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)

  if (!ranked.length) {
    return {
      status: "insufficient_evidence",
      answer: "В доступных источниках PSI недостаточно совпадений по вашему запросу. Попробуйте уточнить эксперимент (например: FLEX, BASS, ACME BRE, Saffire, SAME, SoFIE) или параметр (кислород, лунная база, дым).",
      citations: [],
      related_study_ids: [],
      suggested_questions: [
        "Какие эксперименты наиболее важны для лунной базы (34% O₂)?",
        "Чем отличается обнаружение дыма в микрогравитации (SAME)?",
      ],
    }
  }

  const citations: Citation[] = ranked.map(({ study }) => {
    const det = mockStudyDetails[study.id]
    const src = det.sources[0]
    return {
      chunk_id: `chunk-${study.id}`,
      source_id: src.id,
      title: src.title,
      url: src.url,
      excerpt: study.description,
      locator: det.findings[0]?.locator ?? null,
    }
  })

  const lines = ranked.map(({ study }, idx) => `- **${study.title}** [${idx + 1}]: ${study.description}`)
  return {
    status: "answered",
    answer: `По базе NASA PSI найдены наиболее релевантные исследования:\n\n${lines.join("\n")}`,
    citations,
    related_study_ids: ranked.map((r) => r.study.id),
    suggested_questions: [
      "Сравни выбранные исследования по уровню кислорода и оборудованию",
      "Какие технологии применимы для пожарной безопасности на Земле?",
    ],
  }
}

function handleCompare(body: CompareRequest): CompareResponse {
  const details = body.study_ids.map((id) => mockStudyDetails[id]).filter(Boolean)
  if (details.length !== body.study_ids.length) {
    return {
      status: "insufficient_evidence",
      summary: "Одно или несколько исследований не найдены.",
      similarities: [],
      differences: [],
      limitations: ["Проверьте идентификаторы выбранных исследований."],
      citations: [],
    }
  }

  const citations: Citation[] = details.map((d) => ({
    chunk_id: `chunk-${d.id}`,
    source_id: d.sources[0].id,
    title: d.sources[0].title,
    url: d.sources[0].url,
    excerpt: d.description,
    locator: d.findings[0]?.locator ?? null,
  }))

  const similarities: CompareItem[] = []
  const differences: CompareItem[] = []
  const metas = details.map((d) => getQuickMeta(d.id))

  const sameCategory = new Set(details.map((d) => d.category)).size === 1
  if (sameCategory) {
    similarities.push({
      text: `Все выбранные исследования относятся к программе ${details[0].category}.`,
      citation_indices: details.map((_, i) => i + 1),
    })
  } else {
    differences.push({
      text: `Исследования принадлежат разным программам NASA: ${details.map((d) => d.category).join(" vs ")}.`,
      citation_indices: details.map((_, i) => i + 1),
    })
  }

  const facilities = metas.map((m) => m?.facility ?? "н/д")
  if (new Set(facilities).size === 1) {
    similarities.push({
      text: `Использована единая бортовая установка: ${facilities[0]}.`,
      citation_indices: details.map((_, i) => i + 1),
    })
  } else {
    differences.push({
      text: `Различаются экспериментальные установки: ${details.map((d, i) => `${d.category} (${facilities[i]})`).join(", ")}.`,
      citation_indices: details.map((_, i) => i + 1),
    })
  }

  const states = metas.map((m) => m?.fuelState ?? "н/д")
  if (new Set(states).size === 1) {
    similarities.push({
      text: `Одинаковое агрегатное состояние топлива/образцов (${states[0]}).`,
      citation_indices: details.map((_, i) => i + 1),
    })
  } else {
    differences.push({
      text: `Разные типы горючих сред: ${details.map((d, i) => `${d.title.split(" ")[0]} — ${metas[i]?.fuelMaterial ?? states[i]}`).join("; ")}.`,
      citation_indices: details.map((_, i) => i + 1),
    })
  }

  return {
    status: "answered",
    summary: `Сравнение ${details.map((d) => d.title.split(" (")[0]).join(" и ")} по условиям среды, оборудованию и выводам пожарной безопасности.`,
    similarities,
    differences,
    limitations: [
      "В базе PSI отсутствуют прямые испытания при частичной гравитации (1/6g Луна, 3/8g Марс); сопоставление выполнено по 0g и наземному 1g.",
    ],
    citations,
  }
}

export async function mockFetch(
  path: string,
  options: { method?: "GET" | "POST"; body?: string; signal?: AbortSignal } = {},
): Promise<Response> {
  options.signal?.throwIfAborted()
  const [pathname, search = ""] = path.split("?")
  const params = new URLSearchParams(search)

  if (pathname === "/studies" && (options.method ?? "GET") === "GET") {
    const q = (params.get("q") ?? "").trim().toLowerCase()
    const category = params.get("category")
    const tag = params.get("tag")
    const limit = Number(params.get("limit") ?? 100)
    const offset = Number(params.get("offset") ?? 0)

    const filtered = mockStudies.filter((s) => {
      if (category && s.category !== category) return false
      if (tag && !s.tags.includes(tag)) return false
      if (q) {
        const hay = `${s.id} ${s.title} ${s.description} ${s.category} ${s.tags.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return Response.json({
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    })
  }

  if (pathname === "/catalog/filters") {
    const categories = Array.from(new Set(mockStudies.map((s) => s.category))).sort()
    const tags = Array.from(new Set(mockStudies.flatMap((s) => s.tags))).sort()
    return Response.json({ categories, tags })
  }

  if (pathname === "/nexus/graph") {
    const studyId = params.get("study_id") ?? undefined
    const depth = Number(params.get("depth") ?? 1)
    if (studyId && !mockStudyDetails[studyId]) {
      return notFound("STUDY_NOT_FOUND", "Study not found")
    }
    return Response.json(buildGraph(studyId, depth))
  }

  if (pathname === "/assistant/chat" && options.method === "POST") {
    const body = JSON.parse(options.body ?? "{}") as ChatRequest
    return Response.json(handleChat(body))
  }

  if (pathname === "/assistant/compare" && options.method === "POST") {
    const body = JSON.parse(options.body ?? "{}") as CompareRequest
    return Response.json(handleCompare(body))
  }

  const match = /^\/studies\/([^/]+)(?:\/(datasets|relations))?$/.exec(pathname)
  if (!match) return notFound("NOT_FOUND", "Route not found")

  const id = decodeURIComponent(match[1])
  const sub = match[2]
  const detail = mockStudyDetails[id]
  if (!detail) return notFound("STUDY_NOT_FOUND", "Study not found")

  if (!sub) return Response.json(detail)
  if (sub === "datasets") return Response.json(mockDatasets[id] ?? [])
  if (sub === "relations") {
    return Response.json(mockRelations.filter((r) => r.from_study_id === id || r.to_study_id === id))
  }

  return notFound("NOT_FOUND", "Route not found")
}
