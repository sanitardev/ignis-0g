import { useMemo, useState } from "react"
import { ArrowRight, FlaskConical, GitCompare, Search } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { getQuickMeta } from "@/domain/knowledge"
import type { StudySummary } from "@/domain/types"

const pillars = ["Все", "Prevention", "Detection", "Suppression", "Fundamental", "Reference"] as const

const programDescriptions: Record<string, string> = {
  FLEX: "Горение и тушение капель жидкого топлива (CIR / MDCA)",
  BASS: "Твёрдые материалы и ткани при слабом потоке (MSG / SPICE)",
  ACME: "Газовые пламёна, сферические горелки и электрополе (CIR / CIA)",
  Saffire: "Полномасштабные пожары на борту корабля Cygnus",
  SAME: "Обнаружение дыма и морфология аэрозолей (MSG)",
  SoFIE: "Воспламенение твёрдых тел при пониженном давлении (CIR / SoFIE)",
  Reference: "Нормативные профили атмосферы МКС, Земли и Луны",
}

export function StudiesDirectory({
  studies,
  compareIds,
  onToggleCompare,
  onSelectStudy,
}: {
  studies: StudySummary[]
  compareIds: string[]
  onToggleCompare: (id: string) => void
  onSelectStudy: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [pillar, setPillar] = useState<string>("Все")

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = studies.filter((s) => {
      if (pillar !== "Все" && !s.tags.some((t) => t.toLowerCase().includes(pillar.toLowerCase()))) return false
      if (q) {
        const meta = getQuickMeta(s.id)
        const hay = `${s.id} ${s.title} ${s.description} ${s.category} ${s.tags.join(" ")} ${meta?.facility ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const map = new Map<string, StudySummary[]>()
    for (const study of filtered) {
      const list = map.get(study.category) ?? []
      list.push(study)
      map.set(study.category, list)
    }
    return Array.from(map.entries())
  }, [studies, query, pillar])

  return (
    <div className="section-view">
      <div className="dashboard-hero">
        <div>
          <h1>Все исследования и эксперименты NASA PSI</h1>
          <p className="muted">
            Эксперименты сгруппированы по программам и бортовым установкам. Нажмите на карточку, чтобы открыть параметры, данные и источники.
          </p>
        </div>
      </div>

      <section className="filter-bar" aria-label="Фильтр исследований">
        <label className="search-field ranking-search">
          <Search size={15} />
          <input
            type="search"
            placeholder="Поиск по названию, топливу, стойке…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="pillar-pills" role="group" aria-label="Направление безопасности">
          {pillars.map((p) => (
            <button
              key={p}
              type="button"
              className="chip-btn"
              aria-pressed={pillar === p}
              onClick={() => setPillar(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {grouped.length === 0 && (
        <section className="panel panel-padding">
          <p className="muted">По заданным фильтрам исследования не найдены.</p>
        </section>
      )}

      <div className="directory-columns">
        {grouped.map(([program, items]) => (
          <section key={program} className="directory-column">
            <header className="directory-column-header">
              <div className="directory-column-title">
                <FlaskConical size={16} />
                <h2>{program}</h2>
                <span className="directory-count">{items.length}</span>
              </div>
              {programDescriptions[program] && <p className="muted">{programDescriptions[program]}</p>}
            </header>

            <div className="directory-column-cards">
              {items.map((study) => {
                const meta = getQuickMeta(study.id)
                const isCompared = compareIds.includes(study.id)
                const o2 = meta?.conditions.o2_pct
                const o2Label = o2 && o2[0] != null ? `${o2[0]}–${o2[1] ?? o2[0]}% O₂` : null

                return (
                  <article key={study.id} className="panel directory-study-card">
                    <div className="ranking-badges">
                      {study.tags.map((t) => (
                        <span key={t} className="badge-pillar">
                          {t}
                        </span>
                      ))}
                      {meta?.facility && <span className="badge-program">{meta.facility}</span>}
                    </div>
                    <h3>
                      <button type="button" className="card-title-btn" onClick={() => onSelectStudy(study.id)}>
                        {study.title}
                      </button>
                    </h3>
                    <p className="ranking-desc">{study.description}</p>
                    {o2Label && <span className="directory-o2-chip">{o2Label}</span>}
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
          </section>
        ))}
      </div>
    </div>
  )
}
