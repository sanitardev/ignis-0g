import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  ChartNoAxesCombined,
  Flame,
  Rocket,
  ShieldCheck,
  Wind,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { CREW_ENVIRONMENTS, getQuickMeta, type MissionScenarioId } from "@/domain/knowledge"
import type { StudySummary } from "@/domain/types"

interface EnvPreset {
  id: string
  label: string
  o2Pct: number
  pressurePsi: number
  gravityG: number
  flowCms: number
}

const ENV_PRESETS: EnvPreset[] = [
  { id: "earth", label: "Земля · 1g", o2Pct: 21, pressurePsi: 14.7, gravityG: 1.0, flowCms: 0 },
  { id: "iss", label: "Отсек МКС · 0g", o2Pct: 21, pressurePsi: 14.7, gravityG: 0.0, flowCms: 12 },
  { id: "lunar-sea", label: "Луна / Ровер SEA", o2Pct: 34, pressurePsi: 8.2, gravityG: 0.16, flowCms: 10 },
  { id: "mars-hab", label: "Марс · База", o2Pct: 34, pressurePsi: 8.2, gravityG: 0.38, flowCms: 10 },
  { id: "eva", label: "Скафандр EVA", o2Pct: 100, pressurePsi: 4.3, gravityG: 0.16, flowCms: 5 },
  { id: "cfi-g", label: "CFI-G Макс O₂", o2Pct: 85, pressurePsi: 14.7, gravityG: 0.0, flowCms: 0 },
]

interface ChartStudyPoint {
  id: string
  label: string
  psi: number
  o2Min: number
  o2Max: number
  psiMin?: number
  psiMax?: number
}

const CHART_STUDIES: ChartStudyPoint[] = [
  { id: "bass-bass-ii-bass-m", label: "BASS-II", psi: 14.7, o2Min: 13.6, o2Max: 21 },
  { id: "saffire-i-iii", label: "Saffire", psi: 14.7, o2Min: 21, o2Max: 21 },
  { id: "sofie-mist", label: "SoFIE", psi: 10.1, o2Min: 21, o2Max: 34, psiMin: 5.8, psiMax: 14.5 },
  { id: "acme-bre", label: "ACME BRE", psi: 11.0, o2Min: 21, o2Max: 34, psiMin: 7.4, psiMax: 14.7 },
  { id: "flex-2-cfi", label: "FLEX-2", psi: 14.7, o2Min: 10, o2Max: 50, psiMin: 7.4, psiMax: 20.0 },
  { id: "acme-cfi-g", label: "CFI-G", psi: 11.0, o2Min: 21, o2Max: 85, psiMin: 7.4, psiMax: 14.7 },
]

const CHART = {
  width: 560,
  height: 320,
  left: 54,
  right: 22,
  top: 18,
  bottom: 42,
}

function xToPx(psi: number) {
  const pw = CHART.width - CHART.left - CHART.right
  const clamped = Math.max(0, Math.min(20, psi))
  return CHART.left + (clamped / 20) * pw
}

function yToPx(o2: number) {
  const ph = CHART.height - CHART.top - CHART.bottom
  const clamped = Math.max(0, Math.min(100, o2))
  return CHART.top + (1 - clamped / 100) * ph
}

export function EnvironmentsView({
  studies,
  onOpenScenario,
  onSelectStudy,
}: {
  studies: StudySummary[]
  onOpenScenario: (scenario: MissionScenarioId) => void
  onSelectStudy: (id: string) => void
}) {
  const [o2Pct, setO2Pct] = useState(34)
  const [pressurePsi, setPressurePsi] = useState(8.2)
  const [gravityG, setGravityG] = useState(0.16)
  const [flowCms, setFlowCms] = useState(10)

  const pressureKpa = +(pressurePsi * 6.89476).toFixed(1)
  const po2Psi = +(pressurePsi * (o2Pct / 100)).toFixed(2)
  const po2Kpa = +(pressureKpa * (o2Pct / 100)).toFixed(1)

  const effectiveLoiPct = useMemo(() => {
    let loi = 16.5
    if (gravityG < 0.4 && flowCms >= 2 && flowCms <= 25) {
      loi -= 2.5
    }
    if (pressurePsi < 10) {
      loi += 0.5
    }
    return +loi.toFixed(1)
  }, [gravityG, flowCms, pressurePsi])

  const verdict = useMemo(() => {
    if (o2Pct < effectiveLoiPct) {
      return {
        tone: "low" as const,
        label: "Ниже предела горения (Затухание / Гипоксия)",
        detail: `Концентрация ${o2Pct}% O₂ ниже расчётного порога LOI (~${effectiveLoiPct}%) для тонких материалов. Возможны лишь кратковременные холодные/тлеющие режимы.`,
      }
    }
    if (o2Pct <= 23 && po2Psi <= 3.5) {
      return {
        tone: "nominal" as const,
        label: "Номинальный режим (Стандарт МКС / Земли)",
        detail:
          flowCms >= 2 && flowCms <= 25 && gravityG < 0.4
            ? `Даже при 21% O₂ слабый поток ${flowCms} см/с в сниженной гравитации понижает предел тушения (эффект BASS/SoFIE).`
            : "Умеренная скорость распространения пламени, сопоставимая с нормативами обитаемых отсеков.",
      }
    }
    if (o2Pct <= 40) {
      return {
        tone: "elevated" as const,
        label: "Повышенный риск SEA (+40% O₂ к Земле — быстрое распространение пламени)",
        detail: `Парциальное давление O₂ = ${po2Psi} psi (${po2Kpa} кПа). Режим лунной базы/ровера существенно облегчает воспламенение полимеров и тканей; требуется валидация через SoFIE и ACME BRE.`,
      }
    }
    return {
      tone: "critical" as const,
      label: "Экстремальная кислородная опасность (Мгновенное воспламенение материалов)",
      detail: `При ${o2Pct}% O₂ и ${pressurePsi.toFixed(1)} psi допускаются только сертифицированные кислородно-стойкие материалы (NASA-STD-6001) либо изолированные стенды уровня CFI-G.`,
    }
  }, [o2Pct, effectiveLoiPct, po2Psi, po2Kpa, flowCms, gravityG, pressurePsi])

  const partialGravityGap = gravityG > 0.02 && gravityG < 0.9

  const matchingStudies = useMemo(() => {
    return studies
      .map((study) => {
        const meta = getQuickMeta(study.id)
        const o2Range = meta?.conditions.o2_pct
        const pRange = meta?.conditions.pressure_kpa
        let score = 0

        if (Array.isArray(o2Range)) {
          const minO2 = o2Range[0] ?? 0
          const maxO2 = o2Range[1] ?? o2Range[0] ?? 100
          if (o2Pct >= minO2 - 5 && o2Pct <= maxO2 + 5) score += 2
        }
        if (Array.isArray(pRange)) {
          const minP = pRange[0] ?? 0
          const maxP = pRange[1] ?? pRange[0] ?? 400
          if (pressureKpa >= minP - 20 && pressureKpa <= maxP + 20) score += 2
        }
        if (partialGravityGap && (study.id.includes("e-field") || study.id.startsWith("sofie"))) {
          score += 2
        }
        return { study, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.study)
  }, [studies, o2Pct, pressureKpa, partialGravityGap])

  function applyPreset(preset: EnvPreset) {
    setO2Pct(preset.o2Pct)
    setPressurePsi(preset.pressurePsi)
    setGravityG(preset.gravityG)
    setFlowCms(preset.flowCms)
  }

  const markerX = xToPx(pressurePsi)
  const markerY = yToPx(o2Pct)

  return (
    <div className="section-view">
      <div>
        <h1>Среды обитания экипажа и атмосфера</h1>
        <p className="muted">
          Концентрация кислорода, давление, гравитация и скорость вентиляции критически меняют пределы воспламенения. Изучите 2D-конверт для лунной базы (34% O₂) или выберите среду ниже.
        </p>
      </div>

      <section className="panel panel-padding envelope-section">
        <div className="panel-head-row">
          <div>
            <h2>
              <ChartNoAxesCombined size={18} /> Калькулятор среды и 2D-конверт воспламеняемости (O₂ vs Давление)
            </h2>
            <p className="muted">
              Проблема 34% кислорода: чтобы сократить время десатурации перед выходом в скафандре (100% O₂, 4.3 psi), на Луне планируют атмосферу ≥30–34% O₂ при ≤10.2 psi.
            </p>
          </div>
          <div className="envelope-preset-pills" role="group" aria-label="Пресеты атмосферы">
            {ENV_PRESETS.map((preset) => {
              const active =
                o2Pct === preset.o2Pct &&
                Math.abs(pressurePsi - preset.pressurePsi) < 0.05 &&
                Math.abs(gravityG - preset.gravityG) < 0.01
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={active ? "pill-active" : ""}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="envelope-simulator-grid">
          <div className="envelope-controls">
            <div className="envelope-slider-group">
              <label htmlFor="sim-o2">
                <span>Концентрация O₂</span>
                <strong>{o2Pct}%</strong>
              </label>
              <input
                id="sim-o2"
                type="range"
                min={10}
                max={100}
                step={1}
                value={o2Pct}
                onChange={(e) => setO2Pct(Number(e.target.value))}
              />
              <small className="muted">LOI оценки в текущем режиме: ~{effectiveLoiPct}% O₂</small>
            </div>

            <div className="envelope-slider-group">
              <label htmlFor="sim-psi">
                <span>Давление камеры / отсека</span>
                <strong>
                  {pressurePsi.toFixed(1)} psi ({pressureKpa} кПа)
                </strong>
              </label>
              <input
                id="sim-psi"
                type="range"
                min={3.0}
                max={20.0}
                step={0.1}
                value={pressurePsi}
                onChange={(e) => setPressurePsi(Number(e.target.value))}
              />
              <small className="muted">
                Парциальное давление pO₂: {po2Psi} psi ({po2Kpa} кПа)
              </small>
            </div>

            <div className="envelope-slider-group">
              <label htmlFor="sim-g">
                <span>Гравитация</span>
                <strong>{gravityG.toFixed(2)} g</strong>
              </label>
              <input
                id="sim-g"
                type="range"
                min={0}
                max={1.0}
                step={0.02}
                value={gravityG}
                onChange={(e) => setGravityG(Number(e.target.value))}
              />
              <small className="muted">0g МКС · 0.16g Луна · 0.38g Марс · 1.00g Земля</small>
            </div>

            <div className="envelope-slider-group">
              <label htmlFor="sim-flow">
                <span>Обдув / вентиляция</span>
                <strong>{flowCms} см/с</strong>
              </label>
              <input
                id="sim-flow"
                type="range"
                min={0}
                max={50}
                step={1}
                value={flowCms}
                onChange={(e) => setFlowCms(Number(e.target.value))}
              />
              <small className="muted">Слабый поток 5–20 см/с в 0g критичнее полного штиля</small>
            </div>
          </div>

          <div className="envelope-chart-box">
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className="envelope-svg"
              role="img"
              aria-label="2D фазовая диаграмма воспламеняемости: давление (psi) по оси X и концентрация кислорода (%) по оси Y"
            >
              {/* Hazard shading >40% O2 */}
              <rect
                x={CHART.left}
                y={yToPx(100)}
                width={CHART.width - CHART.left - CHART.right}
                height={yToPx(40) - yToPx(100)}
                fill="var(--error-surface)"
              />
              {/* Hypoxic / extinction shading <14% O2 */}
              <rect
                x={CHART.left}
                y={yToPx(14)}
                width={CHART.width - CHART.left - CHART.right}
                height={yToPx(0) - yToPx(14)}
                fill="var(--success-surface)"
              />
              {/* SEA Lunar / Rover target envelope (7.5-10.5 psi, 30-36% O2) */}
              <rect
                x={xToPx(7.5)}
                y={yToPx(36)}
                width={xToPx(10.5) - xToPx(7.5)}
                height={yToPx(30) - yToPx(36)}
                fill="var(--warning-surface)"
                stroke="var(--combustion)"
                strokeWidth="1.6"
                strokeDasharray="4 3"
                rx="4"
              />
              <text x={xToPx(7.5) + 4} y={yToPx(36) - 5} fontSize="10" fontWeight="700" fill="var(--combustion)">
                SEA Луна/Ровер (30–34% O₂)
              </text>

              {/* Grid lines */}
              {[0, 20, 40, 60, 80, 100].map((yVal) => (
                <g key={yVal}>
                  <line
                    x1={CHART.left}
                    y1={yToPx(yVal)}
                    x2={CHART.width - CHART.right}
                    y2={yToPx(yVal)}
                    stroke="var(--border)"
                    strokeDasharray={yVal === 0 ? undefined : "2 3"}
                  />
                  <text
                    x={CHART.left - 8}
                    y={yToPx(yVal) + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--muted-foreground)"
                  >
                    {yVal}%
                  </text>
                </g>
              ))}
              {[0, 5, 10, 15, 20].map((xVal) => (
                <g key={xVal}>
                  <line
                    x1={xToPx(xVal)}
                    y1={CHART.top}
                    x2={xToPx(xVal)}
                    y2={CHART.height - CHART.bottom}
                    stroke="var(--border)"
                    strokeDasharray={xVal === 0 ? undefined : "2 3"}
                  />
                  <text
                    x={xToPx(xVal)}
                    y={CHART.height - CHART.bottom + 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--muted-foreground)"
                  >
                    {xVal}
                  </text>
                </g>
              ))}

              {/* Zone labels */}
              <text x={CHART.width - CHART.right - 6} y={yToPx(92)} textAnchor="end" fontSize="10" fill="var(--color-error)" fontWeight="600">
                Высокий риск O₂ (&gt;40%)
              </text>
              <text x={CHART.width - CHART.right - 6} y={yToPx(5)} textAnchor="end" fontSize="10" fill="var(--color-success)" fontWeight="600">
                Порог затухания (&lt;14% O₂)
              </text>

              {/* Axis titles */}
              <text
                x={(CHART.left + CHART.width - CHART.right) / 2}
                y={CHART.height - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--muted-foreground)"
              >
                Давление (psi) · Земля = 14.7 psi
              </text>
              <text
                x={14}
                y={(CHART.top + CHART.height - CHART.bottom) / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--muted-foreground)"
                transform={`rotate(-90 14 ${(CHART.top + CHART.height - CHART.bottom) / 2})`}
              >
                Кислород O₂ (%)
              </text>

              {/* Plotted PSI study coverage */}
              {CHART_STUDIES.map((pt) => {
                const cx = xToPx(pt.psi)
                const y1 = yToPx(pt.o2Max)
                const y2 = yToPx(pt.o2Min)
                const midY = (y1 + y2) / 2
                const exists = studies.some((s) => s.id === pt.id)
                return (
                  <g
                    key={pt.id}
                    className={exists ? "envelope-study-marker clickable" : "envelope-study-marker"}
                    onClick={() => exists && onSelectStudy(pt.id)}
                  >
                    {pt.psiMin !== undefined && pt.psiMax !== undefined && (
                      <rect
                        x={xToPx(pt.psiMin)}
                        y={y1}
                        width={Math.max(4, xToPx(pt.psiMax) - xToPx(pt.psiMin))}
                        height={Math.max(4, y2 - y1)}
                        fill="color-mix(in srgb, var(--muted-foreground) 8%, transparent)"
                        stroke="var(--input)"
                        strokeWidth="1"
                        rx="3"
                      />
                    )}
                    {pt.o2Max > pt.o2Min && (
                      <line x1={cx} y1={y1} x2={cx} y2={y2} stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
                    )}
                    <circle cx={cx} cy={midY} r={4} fill="var(--muted-foreground)" stroke="var(--background)" strokeWidth="1.5" />
                    <text x={cx + 6} y={midY + 3} fontSize="9.5" fontWeight="600" fill="var(--foreground)">
                      {pt.label}
                    </text>
                  </g>
                )
              })}

              {/* Reference environment pins */}
              <g>
                <circle cx={xToPx(14.7)} cy={yToPx(21)} r={4.5} fill="var(--foreground)" stroke="var(--background)" strokeWidth="1.5" />
                <text x={xToPx(14.7) + 6} y={yToPx(21) - 5} fontSize="9.5" fill="var(--foreground)" fontWeight="700">
                  Земля/МКС
                </text>
                <circle cx={xToPx(4.3)} cy={yToPx(98)} r={4.5} fill="var(--color-error)" stroke="var(--background)" strokeWidth="1.5" />
                <text x={xToPx(4.3) + 6} y={yToPx(96)} fontSize="9.5" fill="var(--color-error)" fontWeight="700">
                  Скафандр (4.3 psi)
                </text>
              </g>

              {/* Live crosshair & pulsing target dot */}
              <line
                x1={markerX}
                y1={CHART.top}
                x2={markerX}
                y2={CHART.height - CHART.bottom}
                stroke="var(--combustion)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <line
                x1={CHART.left}
                y1={markerY}
                x2={CHART.width - CHART.right}
                y2={markerY}
                stroke="var(--combustion)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <circle cx={markerX} cy={markerY} r={11} fill="color-mix(in srgb, var(--combustion) 24%, transparent)" className="envelope-pulse-ring" />
              <circle cx={markerX} cy={markerY} r={6} fill="var(--combustion)" stroke="var(--background)" strokeWidth="2" />
              <rect
                x={Math.min(CHART.width - 134, markerX + 10)}
                y={Math.max(CHART.top + 2, markerY - 22)}
                width="118"
                height="20"
                rx="6"
                fill="var(--combustion)"
              />
              <text
                x={Math.min(CHART.width - 134, markerX + 10) + 6}
                y={Math.max(CHART.top + 2, markerY - 22) + 13}
                fontSize="10"
                fontWeight="700"
                fill="var(--accent-ink)"
              >
                {pressurePsi.toFixed(1)} psi · {o2Pct}% O₂
              </text>
            </svg>
          </div>
        </div>

        <div className={`envelope-verdict-bar verdict-${verdict.tone}`}>
          <div className="envelope-verdict-title">
            <Flame size={17} />
            <strong>{verdict.label}</strong>
          </div>
          <p>{verdict.detail}</p>
        </div>

        {partialGravityGap && (
          <div className="partial-g-inline-alert">
            <AlertTriangle size={16} />
            <div>
              <strong>Пробел данных PSI при {gravityG.toFixed(2)}g:</strong> в архиве пока нет прямых орбитальных экспериментов для Луны (0.16g) и Марса (0.38g) — они ожидаются с миссиями <strong>LUCI</strong> и <strong>FM2</strong>. Ближайшую оценку дают границы <strong>0g / 1g</strong> и эксперимент <strong>ACME E-FIELD Flames</strong>.
            </div>
          </div>
        )}

        {matchingStudies.length > 0 && (
          <div className="envelope-matches">
            <span className="muted">Релевантные эксперименты PSI для {o2Pct}% O₂ · {pressureKpa} кПа:</span>
            <div className="hardware-links">
              {matchingStudies.map((study) => (
                <button key={study.id} type="button" className="chip-btn" onClick={() => onSelectStudy(study.id)}>
                  {study.title.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="env-grid">
        {CREW_ENVIRONMENTS.map((env) => (
          <article key={env.id} className="panel panel-padding env-card">
            <div className="env-card-head">
              <Rocket size={18} />
              <div>
                <h2>{env.title}</h2>
                <span className="muted">{env.subtitle}</span>
              </div>
            </div>

            <dl className="parameters env-params">
              <div>
                <dt>Кислород (O₂)</dt>
                <dd>{env.o2}</dd>
              </div>
              <div>
                <dt>Давление</dt>
                <dd>{env.pressure}</dd>
              </div>
              <div>
                <dt>Гравитация</dt>
                <dd>{env.gravity}</dd>
              </div>
            </dl>

            <p className="env-risk">
              <ShieldCheck size={15} /> {env.riskNote}
            </p>

            <div className="env-studies">
              <span className="muted">Ключевые исследования:</span>
              <div className="hardware-links">
                {env.keyStudyIds.map((id) => {
                  const s = studies.find((item) => item.id === id)
                  if (!s) return null
                  return (
                    <button key={id} type="button" className="chip-btn" onClick={() => onSelectStudy(id)}>
                      {s.title.split(" (")[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button type="button" size="sm" onClick={() => onOpenScenario(env.scenarioId)}>
              Ранжировать исследования для этой среды <ArrowRight size={14} />
            </Button>
          </article>
        ))}
      </div>

      <section className="panel panel-padding">
        <h2>
          <Wind size={17} /> Почему лунная атмосфера (≥30% O₂, ≤10.2 psi) опаснее земной?
        </h2>
        <p className="study-prose">
          В скафандрах используется 100% кислород при давлении 4.3 psi. Чтобы астронавтам не требовалась длительная десатурация (вымывание азота против кессонной болезни) перед каждым выходом, в лунных базах и герметичных роверах планируется промежуточная атмосфера: концентрация O₂ 30–34% при давлении 8.2–10.2 psi. Это более чем на 40% выше земного уровня кислорода (21%), что резко снижает порог воспламенения тканей и пластиков и требует валидации через эксперименты <strong>SoFIE</strong> и <strong>ACME BRE</strong>.
        </p>
      </section>
    </div>
  )
}
