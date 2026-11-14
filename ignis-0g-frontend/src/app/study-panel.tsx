import { useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { Tabs } from "radix-ui"
import { studyQueries } from "@/api/queries"
import {
  ArrowUpRight,
  Bookmark,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Flame,
  FlaskConical,
  GitCompare,
  Layers3,
  Network,
  Share,
  ShieldCheck,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import flame from "@/assets/flex-flame.webp"
import { getQuickMeta } from "@/domain/knowledge"
import type { Finding, StudyConditions, StudyDetail, StudySummary } from "@/domain/types"
import { QueryFailure, QueryLoading } from "./query-feedback"
import { SourceList } from "./research-sources"
import { StudyMeasurements, StudyNexusGraph, StudySafety, StudyVideo } from "./study-evidence"

const views = [
  { id: "overview", name: "Обзор", icon: Layers3 },
  { id: "measurements", name: "Данные", icon: Database },
  { id: "visualization", name: "Графики", icon: ChartNoAxesCombined },
  { id: "findings", name: "Выводы", icon: Network },
  { id: "safety", name: "Безопасность", icon: ShieldCheck },
] as const

export type View = (typeof views)[number]["id"]

export function isStudyView(value: string): value is View {
  return views.some(({ id }) => id === value)
}

function formatRange(range: unknown, unit: string): string | undefined {
  if (!Array.isArray(range) || range.length === 0) return undefined
  const [min, max] = range as [number | null | undefined, number | null | undefined]
  if (min == null && max == null) return undefined
  if (min != null && max != null && min !== max) return `${min}–${max} ${unit}`
  return `${min ?? max} ${unit}`
}

function fuelStateLabel(state?: string) {
  switch (state) {
    case "liquid":
      return "Жидкие капли"
    case "solid":
      return "Твёрдые материалы"
    case "gas":
      return "Газовое пламя"
    case "aerosol_pyrolysis":
      return "Дым и аэрозоли"
    case "reference":
      return "Нормативный профиль"
    default:
      return "Микрогравитация"
  }
}

const relationLabels: Record<string, string> = {
  supports: "подтверждает",
  contradicts: "опровергает / уточняет",
  complements: "дополняет",
  similar: "схоже с",
}

function FindingsList({ findings }: { findings: Finding[] }) {
  if (!findings.length) return <p className="muted">Для этого эксперимента пока нет зафиксированных выводов.</p>
  return (
    <ul className="findings">
      {findings.map((finding) => (
        <li key={finding.id}>
          <CheckCircle2 size={16} />
          <div>
            <strong>{finding.claim}</strong>
            <p>{finding.evidence}{finding.locator ? ` (${finding.locator})` : ""}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function StudyActions({
  study,
  isCompared,
  onToggleCompare,
}: {
  study: StudySummary
  isCompared: boolean
  onToggleCompare: () => void
}) {
  const storageKey = `ignis-saved-study-${study.id}`
  const [saved, setSaved] = useState(() => localStorage.getItem(storageKey) === "true")
  const [notice, setNotice] = useState("")

  function toggleSaved() {
    if (saved) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, "true")
    setSaved(!saved)
    setNotice(saved ? "Удалено из закладок" : "Сохранено в закладках")
  }

  async function share() {
    const url = new URL("/explorer", window.location.origin)
    url.searchParams.set("study", study.id)
    try {
      await navigator.clipboard.writeText(url.href)
      setNotice("Ссылка скопирована")
    } catch {
      setNotice("Не удалось скопировать ссылку")
    }
  }

  return (
    <div className="study-actions">
      <Button
        type="button"
        variant={isCompared ? "default" : "outline"}
        size="sm"
        onClick={onToggleCompare}
        title="Добавить или убрать из матрицы сравнения"
      >
        <GitCompare size={15} /> {isCompared ? "В сравнении" : "Сравнить"}
      </Button>
      <button
        type="button"
        className="icon-button"
        aria-label="Сохранить исследование"
        aria-pressed={saved}
        title="Закладка"
        onClick={toggleSaved}
      >
        <Bookmark size={18} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Скопировать ссылку на исследование"
        title="Поделиться"
        onClick={() => void share()}
      >
        <Share size={18} />
      </button>
      <span className="study-action-notice" role="status">
        {notice}
      </span>
    </div>
  )
}

function ExperimentSchematic({
  study,
  conditions,
}: {
  study: StudySummary
  conditions: StudyConditions
}) {
  const meta = getQuickMeta(study.id)
  const isFlex1 = study.id === "flex-1" || study.id === "flex"
  const o2Text = formatRange(conditions.o2_pct ?? meta?.conditions.o2_pct, "% O₂") ?? "21% O₂"
  const pText = formatRange(conditions.pressure_kpa ?? meta?.conditions.pressure_kpa, "кПа") ?? "101.3 кПа"
  const flowText = formatRange(conditions.flow_cms ?? meta?.conditions.flow_cms, "см/с") ?? "Штиль / н/д"

  if (isFlex1) {
    return (
      <figure className="experiment-figure">
        <img src={flame} alt="Иллюстрация сферического пламени капли в микрогравитации" />
        <figcaption>FLEX-1 · Сферическое диффузионное пламя капли (CIR / MDCA)</figcaption>
      </figure>
    )
  }

  return (
    <figure className="experiment-figure schematic-card">
      <div className="schematic-visual">
        <div className="schematic-badge-row">
          <span className="schematic-pill">{meta?.facility ?? study.category}</span>
          <span className="schematic-pill">{fuelStateLabel(meta?.fuelState)}</span>
        </div>
        <div className="schematic-core">
          <Flame size={34} />
          <strong>{study.category}</strong>
          <span>{meta?.fuelMaterial ?? study.title}</span>
        </div>
        <dl className="schematic-metrics">
          <div>
            <dt>Кислород</dt>
            <dd>{o2Text}</dd>
          </div>
          <div>
            <dt>Давление</dt>
            <dd>{pText}</dd>
          </div>
          <div>
            <dt>Поток</dt>
            <dd>{flowText}</dd>
          </div>
        </dl>
      </div>
      <figcaption>Схема условий эксперимента · {meta?.facility ?? "NASA ISS / Ground"}</figcaption>
    </figure>
  )
}

export function StudyPanel({
  studySummary,
  isCompared,
  onToggleCompare,
  onSelectStudy,
  onBackToCatalog,
  onView,
}: {
  studySummary: StudySummary
  isCompared: boolean
  onToggleCompare: () => void
  onSelectStudy: (id: string) => void
  onBackToCatalog: () => void
  onView: (view: View) => void
}) {
  const [detailQuery, relationsQuery] = useQueries({
    queries: [studyQueries.detail(studySummary.id), studyQueries.relations(studySummary.id)],
  })

  const detail: StudyDetail | undefined = detailQuery.data
  const meta = getQuickMeta(studySummary.id)
  const conditions: StudyConditions = detail?.conditions ?? meta?.conditions ?? {}

  const o2Text = formatRange(conditions.o2_pct ?? meta?.conditions.o2_pct, "% O₂")
  const pText = formatRange(conditions.pressure_kpa ?? meta?.conditions.pressure_kpa, "кПа")
  const flowText = formatRange(conditions.flow_cms ?? meta?.conditions.flow_cms, "см/с")
  const diluents = Array.isArray(conditions.diluents)
    ? conditions.diluents.join(", ")
    : meta?.conditions.diluents?.join(", ")

  const parameters: [string, string | undefined][] = [
    ["Программа", studySummary.category],
    ["Направление (Pillar)", studySummary.tags.join(", ") || undefined],
    ["Установка (Facility)", meta?.facility],
    ["Топливо / образец", meta?.fuelMaterial],
    ["Размер образца", meta?.sampleSizeMm],
    ["Режим потока", typeof conditions.flow_regime === "string" ? conditions.flow_regime : undefined],
    ["Концентрация O₂", o2Text],
    ["Давление", pText],
    ["Скорость потока", flowText],
    ["Разбавители", diluents],
    ["LOI", conditions.loi_pct != null ? String(conditions.loi_pct) : undefined],
    ["Руководитель (PI)", meta?.pi],
  ]

  return (
    <>
      <header className="study-heading">
        <div className="breadcrumb">
          <button type="button" className="breadcrumb-link" onClick={onBackToCatalog}>
            Все исследования
          </button>
          <ChevronRight size={13} />
          <span>{studySummary.category}</span>
          <ChevronRight size={13} />
          <span>{studySummary.id}</span>
        </div>

        <div className="study-title-row">
          <h1>{studySummary.title}</h1>
          <StudyActions
            key={studySummary.id}
            study={studySummary}
            isCompared={isCompared}
            onToggleCompare={onToggleCompare}
          />
        </div>
        <p>{detail?.description ?? studySummary.description}</p>
        <ul className="study-topics" aria-label="Темы и направления">
          <li className="topic-program">{studySummary.category}</li>
          {studySummary.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>

        <Tabs.List aria-label="Разделы исследования" className="study-tabs study-tabs-inline">
          {views.map(({ id, name, icon: Icon }) => {
            let count = ""
            if (id === "measurements" && detail?.datasets.length) count = ` (${detail.datasets.length})`
            if (id === "findings" && detail?.findings.length) count = ` (${detail.findings.length})`
            return (
              <Tabs.Trigger key={id} value={id}>
                <Icon size={16} />
                {name}
                {count}
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
      </header>

      <Tabs.Content value="overview" className="study-content">
        <div className="overview-grid">
          <ExperimentSchematic study={studySummary} conditions={conditions} />
          <section className="study-block">
            <h2>
              <FlaskConical size={17} /> Условия и параметры
            </h2>
            <dl className="parameters">
              {parameters
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>

        {detail?.methodology && (
          <section className="study-block">
            <h2>Методология и аппаратура</h2>
            <p className="study-prose">{detail.methodology}</p>
          </section>
        )}

        <section className="overview-findings">
          <div className="panel-head-row">
            <h2>Выводы исследования</h2>
            <button type="button" className="reset-filter" onClick={() => onView("measurements")}>
              Перейти к данным <ChevronRight size={14} />
            </button>
          </div>
          {detailQuery.isPending && <QueryLoading label="Загрузка выводов…" />}
          {detailQuery.isError && (
            <QueryFailure
              label="Не удалось загрузить детали исследования."
              fetching={detailQuery.isFetching}
              retry={() => void detailQuery.refetch()}
            />
          )}
          {detail && <FindingsList findings={detail.findings} />}
        </section>

        <section className="study-block">
          <h2>
            <FileText size={17} /> Источники NASA
          </h2>
          {detailQuery.isPending && <QueryLoading label="Загрузка источников…" />}
          {detail && <SourceList sources={detail.sources} />}
        </section>
      </Tabs.Content>

      <Tabs.Content value="measurements" className="study-content">
        <StudyMeasurements studyId={studySummary.id} />
      </Tabs.Content>

      <Tabs.Content value="visualization" className="study-content">
        <StudyMeasurements studyId={studySummary.id} chart />
        <StudyVideo studyId={studySummary.id} media={detail?.media ?? []} />
        <StudyNexusGraph studyId={studySummary.id} onSelectStudy={onSelectStudy} />
      </Tabs.Content>

      <Tabs.Content value="findings" className="study-content">
        <section className="study-block">
          <h2>
            <CheckCircle2 size={17} /> Основные выводы и доказательства
          </h2>
          {detailQuery.isPending && <QueryLoading label="Загрузка выводов…" />}
          {detail && <FindingsList findings={detail.findings} />}
        </section>

        <section className="study-block">
          <h2>
            <Network size={17} /> Проверенные связи между исследованиями
          </h2>
          {relationsQuery.isPending && <QueryLoading label="Загрузка связей…" />}
          {relationsQuery.isError && (
            <QueryFailure
              label="Не удалось загрузить связи."
              fetching={relationsQuery.isFetching}
              retry={() => void relationsQuery.refetch()}
            />
          )}
          {relationsQuery.data?.length === 0 && (
            <p className="muted">Для этого эксперимента пока нет проверенных связей с другими исследованиями.</p>
          )}
          {relationsQuery.data && relationsQuery.data.length > 0 && (
            <ul className="relation-cards">
              {relationsQuery.data.map((rel) => {
                const otherId = rel.from_study_id === studySummary.id ? rel.to_study_id : rel.from_study_id
                return (
                  <li key={rel.id} className="relation-card">
                    <div className="relation-card-head">
                      <span className="relation-badge">{relationLabels[rel.relation_type] ?? rel.relation_type}</span>
                      <button type="button" className="chip-btn" onClick={() => onSelectStudy(otherId)}>
                        {otherId} <ChevronRight size={13} />
                      </button>
                    </div>
                    <p>{rel.explanation}</p>
                    <small className="muted">
                      Цитата: «{rel.evidence.excerpt}»{" "}
                      <a href={rel.source_url} target="_blank" rel="noreferrer">
                        Источник <ArrowUpRight size={12} />
                      </a>
                    </small>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </Tabs.Content>

      <Tabs.Content value="safety" className="study-content">
        <StudySafety
          studyId={studySummary.id}
          category={studySummary.category}
          tags={studySummary.tags}
          implications={detail?.safety_implications ?? []}
        />
      </Tabs.Content>
    </>
  )
}
