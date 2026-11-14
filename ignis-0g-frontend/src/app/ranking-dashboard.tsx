import { useMemo } from "react"
import { ArrowRight, ChevronRight, GitCompare, ShieldCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  MISSION_SCENARIOS,
  getQuickMeta,
  scoreStudyForScenario,
  type MissionScenarioId,
} from "@/domain/knowledge"
import type { StudySummary } from "@/domain/types"

export function RankingDashboard({
  studies,
  scenario,
  onScenarioChange,
  compareIds,
  onToggleCompare,
  onSelectStudy,
  onOpenCompare,
  onOpenEnvironments,
  onOpenAllStudies,
}: {
  studies: StudySummary[]
  scenario: MissionScenarioId
  onScenarioChange: (scenario: MissionScenarioId) => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
  onSelectStudy: (id: string) => void
  onOpenCompare: () => void
  onOpenEnvironments: () => void
  onOpenAllStudies: () => void
}) {
  const activeScenario = MISSION_SCENARIOS.find((s) => s.id === scenario) ?? MISSION_SCENARIOS[0]

  const ranked = useMemo(() => {
    return studies
      .map((study) => ({
        study,
        meta: getQuickMeta(study.id),
        ranking: scoreStudyForScenario(study, scenario),
      }))
      .sort((a, b) => b.ranking.score - a.ranking.score || a.study.title.localeCompare(b.study.title))
  }, [studies, scenario])

  const topStudies = ranked.slice(0, 6)
  const avgRelevance = ranked.length
    ? Math.round(ranked.reduce((sum, item) => sum + item.ranking.score, 0) / ranked.length)
    : 0

  return (
    <div className="section-view">
      <div className="feed-section-head">
        <span>ФОКУС МИССИИ</span>
        <button type="button" onClick={onOpenEnvironments}>
          Среды обитания <ChevronRight size={14} />
        </button>
      </div>

      <section className="mission-spotlight-banner">
        <div className="mission-spotlight-content">
          <span className="spotlight-tag">Artemis · Exploration Atmosphere (SEA)</span>
          <h2>Пожарная безопасность на Луне: ≥30–34% O₂ при ≤10.2 psi</h2>
          <p>
            Повышенный кислород ускоряет выход в скафандрах, но снижает порог воспламенения материалов. Выберите сценарий ниже, чтобы увидеть ключевые эксперименты.
          </p>
        </div>
        <button type="button" className="spotlight-cta" onClick={() => onScenarioChange("lunar-base")}>
          Ранжировать под Луну <ArrowRight size={15} />
        </button>
      </section>

      <section className="panel panel-padding summary-hero-card">
        <div className="summary-hero-top">
          <div>
            <h1>Каталог пожарной безопасности NASA PSI</h1>
            <p className="muted">
              Сценарий: <strong>{activeScenario.label}</strong> · {activeScenario.targetAtmosphere}
            </p>
          </div>
          {compareIds.length >= 2 && (
            <Button type="button" size="sm" onClick={onOpenCompare}>
              <GitCompare size={15} /> Сравнить ({compareIds.length})
            </Button>
          )}
        </div>

        <div className="metric-tiles">
          <div className="metric-tile">
            <strong>{studies.length}</strong>
            <span>Исследований PSI</span>
          </div>
          <div className="metric-tile">
            <strong>3</strong>
            <span>Столпа (P / D / S)</span>
          </div>
          <div className="metric-tile">
            <strong>4</strong>
            <span>Стойки (CIR, MSG, Cygnus)</span>
          </div>
          <div className="metric-tile metric-tile-accent">
            <strong>10–85%</strong>
            <span>Диапазон O₂</span>
          </div>
        </div>

        <div className="coverage-row">
          <div className="coverage-meta">
            <span>Релевантность подборки: <strong>{avgRelevance}%</strong></span>
            <span className="muted">Показаны топ-6 для сценария «{activeScenario.shortLabel}»</span>
          </div>
          <div className="coverage-track">
            <div style={{ width: `${avgRelevance}%` }} />
          </div>
        </div>

        <div className="scenario-pills" role="group" aria-label="Выбор сценария ранжирования">
          {MISSION_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="scenario-pill"
              aria-pressed={scenario === item.id}
              onClick={() => onScenarioChange(item.id)}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
      </section>

      <div className="feed-section-head">
        <h2 className="ranking-heading">Рейтинг исследований ({topStudies.length} из {studies.length})</h2>
        <button type="button" onClick={onOpenAllStudies}>
          Все исследования по колонкам <ChevronRight size={14} />
        </button>
      </div>

      <div className="ranking-grid">
        {topStudies.map(({ study, meta, ranking }, index) => {
          const isCompared = compareIds.includes(study.id)
          const o2 = meta?.conditions.o2_pct
          const o2Label = o2 && o2[0] != null ? `${o2[0]}–${o2[1] ?? o2[0]}% O₂` : null

          return (
            <article key={study.id} className="panel ranking-card">
              <div className="ranking-card-top">
                <div className="ranking-badges">
                  <span className="rank-index">#{index + 1}</span>
                  <span className="badge-program">{study.category}</span>
                  {study.tags.slice(0, 1).map((t) => (
                    <span key={t} className="badge-pillar">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="relevance-meter" title="Индекс релевантности выбранному сценарию">
                  <span>{ranking.score}%</span>
                  <div className="relevance-bar">
                    <div style={{ width: `${ranking.score}%` }} />
                  </div>
                </div>
              </div>

              <h3>
                <button type="button" className="card-title-btn" onClick={() => onSelectStudy(study.id)}>
                  {study.title}
                </button>
              </h3>
              <p className="ranking-desc">{study.description}</p>

              <div className="ranking-reason">
                <ShieldCheck size={14} />
                <span>{ranking.reasons[0]}</span>
              </div>

              <div className="ranking-meta-chips">
                {meta?.facility && <span>{meta.facility}</span>}
                {o2Label && <span>{o2Label}</span>}
              </div>

              <div className="ranking-card-actions">
                <Button type="button" size="sm" onClick={() => onSelectStudy(study.id)}>
                  Открыть <ArrowRight size={14} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isCompared ? "default" : "outline"}
                  onClick={() => onToggleCompare(study.id)}
                >
                  <GitCompare size={14} /> {isCompared ? "В сравнении" : "Сравнить"}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="home-view-all-row">
        <Button type="button" variant="outline" onClick={onOpenAllStudies}>
          Открыть все {studies.length} исследований по колонкам <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}
