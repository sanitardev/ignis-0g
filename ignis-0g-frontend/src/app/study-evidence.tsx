import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { studyQueries } from "@/api/queries"
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Cpu,
  Download,
  FlaskConical,
  Globe,
  Network,
  ShieldCheck,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { getSafetyEnrichment } from "@/domain/knowledge"
import type { Dataset, Media, SafetyImplication } from "@/domain/types"
import { QueryFailure, QueryLoading } from "./query-feedback"

const format = new Intl.NumberFormat("ru", { maximumFractionDigits: 3 })

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportDatasetCsv(dataset: Dataset) {
  const header = ["series_id", "series_label", dataset.x_label, `${dataset.y_label}${dataset.units.y ? ` (${dataset.units.y})` : ""}`]
  const rows = dataset.series.flatMap((s) =>
    s.points.map((p) => [s.id, s.label, String(p.x), p.y === null ? "" : String(p.y)]),
  )
  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  downloadFile(`${dataset.id}.csv`, csv, "text/csv;charset=utf-8")
}

function exportDatasetJson(dataset: Dataset) {
  downloadFile(`${dataset.id}.json`, JSON.stringify(dataset, null, 2), "application/json;charset=utf-8")
}

export function StudyMeasurements({ studyId, chart = false }: { studyId: string; chart?: boolean }) {
  const query = useQuery(studyQueries.datasets(studyId))
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("")
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("")

  const datasets = query.data ?? []
  const dataset = datasets.find((d) => d.id === selectedDatasetId) ?? datasets[0]
  const activeSeries =
    dataset?.series.find((s) => s.id === selectedSeriesId) ?? dataset?.series[0]

  const maxY = useMemo(() => {
    if (!activeSeries) return 1
    const vals = activeSeries.points.map((p) => p.y).filter((y): y is number => y !== null && Number.isFinite(y))
    return vals.length ? Math.max(...vals, 0.001) : 1
  }, [activeSeries])

  if (query.isPending) return <QueryLoading label="Загрузка наборов данных…" />
  if (query.isError) {
    return (
      <QueryFailure
        label="Не удалось загрузить экспериментальные данные."
        fetching={query.isFetching}
        retry={() => void query.refetch()}
      />
    )
  }

  return (
    <section className="panel panel-padding measurement-panel">
      <div className="panel-head-row">
        <h2>
          {chart ? <ChartNoAxesCombined size={17} /> : <FlaskConical size={17} />}
          {chart ? "Визуализация рядов данных" : "Экспериментальные данные и экспорт"}
        </h2>
        {dataset && (
          <div className="export-actions">
            <Button type="button" variant="outline" size="sm" onClick={() => exportDatasetCsv(dataset)}>
              <Download size={14} /> CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => exportDatasetJson(dataset)}>
              <Download size={14} /> JSON
            </Button>
          </div>
        )}
      </div>

      {!dataset ? (
        <p className="muted">
          Для этого исследования в базе пока нет оцифрованных числовых рядов. Вы можете изучить текстовые выводы, условия среды или запросить данные у ИИ-ассистента.
        </p>
      ) : (
        <>
          <p className="muted">
            {dataset.title} · Происхождение: <strong>{dataset.provenance}</strong>
            {dataset.locator ? ` · ${dataset.locator}` : ""}
          </p>
          {dataset.notes && <p className="muted">{dataset.notes}</p>}

          <div className="data-toolbar">
            {datasets.length > 1 && (
              <label>
                Набор данных
                <select
                  value={dataset.id}
                  onChange={(e) => {
                    setSelectedDatasetId(e.target.value)
                    setSelectedSeriesId("")
                  }}
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {dataset.series.length > 1 && activeSeries && (
              <label>
                Серия измерений
                <select value={activeSeries.id} onChange={(e) => setSelectedSeriesId(e.target.value)}>
                  {dataset.series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {activeSeries && chart ? (
            <>
              <div className="measurement-axis" aria-hidden="true">
                <span>{dataset.x_label}</span>
                <div>
                  <span>0</span>
                  <span>{format.format(maxY / 2)}</span>
                  <span>
                    {format.format(maxY)} {dataset.units.y ?? ""}
                  </span>
                </div>
              </div>
              <ul className="measurement-chart" aria-label={dataset.title}>
                {activeSeries.points.map((point, idx) => (
                  <li key={`${String(point.x)}-${idx}`}>
                    <span>
                      {String(point.x)}
                      {dataset.units.x ? ` ${dataset.units.x}` : ""}
                    </span>
                    <div className="measurement-track" aria-hidden="true">
                      <div
                        style={{
                          width: point.y !== null ? `${Math.max(2, (point.y / maxY) * 100)}%` : "0%",
                        }}
                      />
                    </div>
                    <strong>
                      {point.y !== null
                        ? `${format.format(point.y)}${dataset.units.y ? ` ${dataset.units.y}` : ""}`
                        : "н/д"}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          ) : activeSeries ? (
            <table className="measurement-table">
              <thead>
                <tr>
                  <th scope="col">
                    {dataset.x_label}
                    {dataset.units.x ? `, ${dataset.units.x}` : ""}
                  </th>
                  <th scope="col">
                    {dataset.y_label}
                    {dataset.units.y ? `, ${dataset.units.y}` : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeSeries.points.map((point, idx) => (
                  <tr key={`${String(point.x)}-${idx}`}>
                    <th scope="row">{String(point.x)}</th>
                    <td>{point.y !== null ? format.format(point.y) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </section>
  )
}

const relationLabels: Record<string, string> = {
  supports: "подтверждает",
  contradicts: "опровергает / уточняет",
  complements: "дополняет",
  similar: "схоже с",
}

export function StudyNexusGraph({
  studyId,
  onSelectStudy,
}: {
  studyId: string
  onSelectStudy: (id: string) => void
}) {
  const graphQuery = useQuery(studyQueries.graph(studyId, 1))

  const { nodes, edges } = useMemo(() => {
    const data = graphQuery.data
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] }
    const others = data.nodes.filter((n) => n.id !== studyId)
    const radius = Math.max(170, others.length * 36)
    const flowNodes: Node[] = data.nodes.map((n) => {
      if (n.id === studyId) {
        return {
          id: n.id,
          position: { x: 240, y: 150 },
          data: { label: n.label },
          style: {
            background: "#fff0f7",
            borderColor: "#d60060",
            color: "#8f0042",
            fontWeight: 600,
            borderRadius: 12,
            padding: 8,
            width: 190,
          },
        }
      }
      const idx = others.findIndex((o) => o.id === n.id)
      const angle = (2 * Math.PI * idx) / Math.max(others.length, 1) - Math.PI / 2
      return {
        id: n.id,
        position: {
          x: Math.round(240 + Math.cos(angle) * radius),
          y: Math.round(150 + Math.sin(angle) * (radius * 0.62)),
        },
        data: { label: n.label },
        style: {
          background: "#ffffff",
          borderColor: "#d8dde6",
          borderRadius: 12,
          padding: 8,
          width: 175,
          cursor: "pointer",
        },
      }
    })
    const flowEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: relationLabels[e.type] ?? e.type,
      animated: e.type === "supports" || e.type === "complements",
      style: { stroke: e.type === "contradicts" ? "#ad1834" : "#818a9a" },
    }))
    return { nodes: flowNodes, edges: flowEdges }
  }, [graphQuery.data, studyId])

  if (graphQuery.isPending) return <QueryLoading label="Загрузка графа связей Nexus…" />
  if (graphQuery.isError) {
    return (
      <QueryFailure
        label="Не удалось загрузить граф связей."
        fetching={graphQuery.isFetching}
        retry={() => void graphQuery.refetch()}
      />
    )
  }

  return (
    <section className="panel panel-padding">
      <h2>
        <Network size={17} /> Граф научных связей (Nexus)
      </h2>
      <p className="muted">Нажмите на соседний узел, чтобы перейти к связанному исследованию.</p>
      {nodes.length <= 1 ? (
        <p className="muted">Проверенные межэкспериментальные связи для этого узла пока не добавлены.</p>
      ) : (
        <div className="nexus-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesConnectable={false}
            onNodeClick={(_, node) => {
              if (node.id !== studyId) onSelectStudy(node.id)
            }}
          >
            <Background gap={18} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </section>
  )
}

export function StudySafety({
  studyId,
  category,
  tags,
  implications,
}: {
  studyId: string
  category: string
  tags: string[]
  implications: SafetyImplication[]
}) {
  const enrichment = getSafetyEnrichment(studyId, category, tags)

  return (
    <div className="safety-grid">
      <section className="panel panel-padding">
        <h2>
          <ShieldCheck size={17} /> Космическая пожарная безопасность
        </h2>
        {implications.length > 0 ? (
          <ul className="safety-list">
            {implications.map((imp) => (
              <li key={imp.finding_id}>{imp.text}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Прямые рекомендации по безопасности формируются на основе выводов исследования.</p>
        )}
      </section>

      <section className="panel panel-padding">
        <h2>
          <Cpu size={17} /> Системы контроля нового поколения
        </h2>
        <ul className="safety-list">
          {enrichment.spaceControls.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel-padding">
        <h2>
          <Globe size={17} /> Применение на Земле (Earth Spin-offs)
        </h2>
        <ul className="safety-list">
          {enrichment.earthApplications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function StudyVideo({ studyId, media }: { studyId: string; media: Media[] }) {
  const isFlex1 = studyId === "flex-1" || studyId === "flex"
  const images = media.filter((m) => m.media_type === "image")
  const videos = media.filter((m) => m.media_type === "video")
  if (!isFlex1 && videos.length === 0 && images.length === 0) return null

  return (
    <section className="panel panel-padding study-video">
      <h2>Материалы NASA</h2>
      {images.length > 0 && (
        <div className="study-media-grid">
          {images.map((image) => (
            <figure key={image.id} className="study-media-card">
              <a href={image.url} target="_blank" rel="noreferrer" aria-label={`Открыть изображение: ${image.caption}`}>
                <img src={image.url} alt={image.caption} loading="lazy" />
              </a>
              <figcaption>{image.caption}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {isFlex1 && (
        <a href="https://svs.gsfc.nasa.gov/11318/" target="_blank" rel="noreferrer">
          Видео FLEX на NASA SVS <ArrowUpRight size={14} />
        </a>
      )}
      {videos.map((v) => (
        <div key={v.id} className="media-link-row">
          <a href={v.url} target="_blank" rel="noreferrer">
            {v.caption || "Видеозапись эксперимента"} <ArrowUpRight size={14} />
          </a>
        </div>
      ))}
    </section>
  )
}
