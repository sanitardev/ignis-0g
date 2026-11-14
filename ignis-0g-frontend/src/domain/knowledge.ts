import type { StudyConditions, StudySummary } from "./types"

export type MissionScenarioId =
  | "all"
  | "lunar-base"
  | "spacesuit"
  | "iss-cabin"
  | "detection"
  | "suppression"
  | "modeling"

export interface MissionScenario {
  id: MissionScenarioId
  label: string
  shortLabel: string
  description: string
  targetAtmosphere: string
}

export const MISSION_SCENARIOS: MissionScenario[] = [
  {
    id: "all",
    label: "Все исследования PSI",
    shortLabel: "Все",
    description: "Полный каталог экспериментов NASA PSI по горению и пожарной безопасности в микрогравитации.",
    targetAtmosphere: "0g · 40–304 кПа · 10–85% O₂",
  },
  {
    id: "lunar-base",
    label: "Лунная база и роверы (≥30% O₂, ≤10.2 psi)",
    shortLabel: "Луна / Роверы",
    description: "Повышенная концентрация кислорода (30–34% O₂) при пониженном давлении (≤70 кПа / 8.2–10.2 psi) для сокращения десатурации перед EVA.",
    targetAtmosphere: "30–34% O₂ · 56.5–70 кПа · 1/6g / 0g",
  },
  {
    id: "spacesuit",
    label: "Скафандры и шлюзы (100% O₂, 4.3 psi)",
    shortLabel: "Скафандры",
    description: "Чистый кислород при низком давлении и экстремальные кислородные режимы (CFI-G до 85% O₂, воспламенение материалов).",
    targetAtmosphere: "до 85–100% O₂ · ~30 кПа",
  },
  {
    id: "iss-cabin",
    label: "Обитаемый отсек МКС (21% O₂, 14.7 psi)",
    shortLabel: "Отсек МКС",
    description: "Стандартная атмосфера 1 атм с принудительной вентиляцией HVAC (5–20 см/с), где слабый поток усиливает горючесть.",
    targetAtmosphere: "21% O₂ · 101.3 кПа · 5–20 см/с",
  },
  {
    id: "detection",
    label: "Обнаружение дыма и пыли (Detection)",
    shortLabel: "Обнаружение",
    description: "Возраст и морфология частиц дыма в микрогравитации, фотоэлектрические и ионизационные датчики, контроль пыли.",
    targetAtmosphere: "Аэрозоли · Тефлон / Каптон / Целлюлоза",
  },
  {
    id: "suppression",
    label: "Подавление и тушение (Suppression)",
    shortLabel: "Тушение",
    description: "Разбавление атмосферы инертными газами (CO₂, He, N₂), холодное пламя (cool flames), повторное воспламенение и активное управление полем.",
    targetAtmosphere: "N₂ / CO₂ / He / Xe · Локальное тушение",
  },
  {
    id: "modeling",
    label: "Прогностическое моделирование (CFD)",
    shortLabel: "Моделирование",
    description: "Эталонные 1D/2D данные по сферическому и ламинарному пламени, радиационному тушению и скоростям горения для валидации моделей.",
    targetAtmosphere: "Эталонные горелки · Газ / Капли / Твёрдые тела",
  },
]

export interface StudyQuickMeta {
  facility: string
  fuelMaterial: string
  fuelState: "liquid" | "solid" | "gas" | "aerosol_pyrolysis" | "reference"
  sampleSizeMm?: string
  conditions: StudyConditions
  pi?: string
}

export const STUDY_QUICK_META: Record<string, StudyQuickMeta> = {
  "flex-1": {
    facility: "CIR / MDCA",
    fuelMaterial: "n-гептан, метанол",
    fuelState: "liquid",
    sampleSizeMm: "1.5–4.2 мм",
    conditions: { flow_regime: "quiescent", pressure_kpa: [50.7, 304.0], o2_pct: [12.0, 34.0], flow_cms: [0, 0], diluents: ["N2", "CO2", "He", "Xe"], loi_pct: "14.0–15.0" },
    pi: "F. A. Williams, F. L. Dryer, D. L. Dietrich, V. Nayagam",
  },
  "flex-2-cfi": {
    facility: "CIR / MDCA",
    fuelMaterial: "n-октан, n-декан, смеси гептан/изооктан",
    fuelState: "liquid",
    sampleSizeMm: "1.5–4.2 мм",
    conditions: { flow_regime: "quiescent", pressure_kpa: [50.7, 304.0], o2_pct: [10.0, 50.0], flow_cms: [0, 0], diluents: ["N2", "CO2", "He", "Xe"] },
    pi: "F. A. Williams, F. L. Dryer, D. L. Dietrich, V. Nayagam, P. V. Ferkul",
  },
  "flex-2j-jaxa": {
    facility: "CIR / MDCA",
    fuelMaterial: "n-декан (массивы капель)",
    fuelState: "liquid",
    sampleSizeMm: "0.5–2.0 мм",
    conditions: { flow_regime: "quiescent", pressure_kpa: [101.0, 101.3], o2_pct: [14.0, 21.0], flow_cms: [0, 0], diluents: ["N2", "CO2"] },
    pi: "M. Mikami (JAXA)",
  },
  "flex-ice-ga": {
    facility: "CIR / MDCA",
    fuelMaterial: "гептан/этанол, декан/1-гексанол",
    fuelState: "liquid",
    sampleSizeMm: "1.5–3.5 мм",
    conditions: { flow_regime: "quiescent", pressure_kpa: [101.0, 202.7], o2_pct: [15.0, 21.0], flow_cms: [0, 0], diluents: ["N2", "CO2"] },
    pi: "P. Massoli (CNR-IM), D. L. Dietrich",
  },
  "bass-bass-ii-bass-m": {
    facility: "MSG / SPICE",
    fuelMaterial: "SIBAL (хлопок/стекловолокно), PMMA, Nomex, Ultem",
    fuelState: "solid",
    sampleSizeMm: "0.125–12.7 мм",
    conditions: { flow_regime: "coflow; opposed", pressure_kpa: [101.0, 101.3], o2_pct: [13.6, 21.0], flow_cms: [0, 53.0], diluents: ["N2"], loi_pct: "13.6" },
    pi: "S. L. Olson, F. J. Miller",
  },
  "bass-m-milliken": {
    facility: "MSG / SPICE",
    fuelMaterial: "10 огнестойких тканей FR (хлопок, нейлон, Nomex)",
    fuelState: "solid",
    sampleSizeMm: "0.2–1.0 мм",
    conditions: { flow_regime: "opposed; concurrent", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [1.0, 50.0], diluents: ["N2"] },
    pi: "Milliken & Co., S. L. Olson, P. V. Ferkul",
  },
  "acme-bre": {
    facility: "CIR (Porous Burner)",
    fuelMaterial: "этилен, метан (эмуляция бумаги, пластика, спирта)",
    fuelState: "gas",
    sampleSizeMm: "25–50 мм",
    conditions: { flow_regime: "quiescent", pressure_kpa: [50.7, 101.3], o2_pct: [21.0, 34.0], flow_cms: [0, 0], diluents: ["N2"] },
    pi: "J. G. Quintiere, P. B. Sunderland",
  },
  "acme-s-flame": {
    facility: "CIR (Spherical Burner)",
    fuelMaterial: "H₂, CH₄, C₂H₄",
    fuelState: "gas",
    sampleSizeMm: "6.35–12.7 мм",
    conditions: { flow_regime: "spherical_flow", pressure_kpa: [50.7, 101.3], o2_pct: [15.0, 35.0], flow_cms: [0, 0], diluents: ["N2", "He", "CO2"] },
    pi: "C. K. Law",
  },
  "acme-e-field-flames": {
    facility: "CIR (High-Voltage Mesh)",
    fuelMaterial: "CH₄, C₂H₄ (электрополе до 10 кВ)",
    fuelState: "gas",
    sampleSizeMm: "2.1 / 25 мм",
    conditions: { flow_regime: "coflow_jet", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [10.0, 40.0], diluents: ["N2"] },
    pi: "D. Dunn-Rankin",
  },
  "acme-cfi-g": {
    facility: "CIR (Spherical Burner)",
    fuelMaterial: "пропан, н-бутан, н-пентан (обратное пламя)",
    fuelState: "gas",
    sampleSizeMm: "6.35–12.7 мм",
    conditions: { flow_regime: "spherical_flow", pressure_kpa: [50.7, 101.3], o2_pct: [21.0, 85.0], flow_cms: [0, 0], diluents: ["N2"] },
    pi: "NASA GRC ACME CFI-G Team",
  },
  "acme-flame-design": {
    facility: "CIR (Spherical Burner)",
    fuelMaterial: "C₂H₄, CH₄",
    fuelState: "gas",
    sampleSizeMm: "6.35–12.7 мм",
    conditions: { flow_regime: "spherical_flow", pressure_kpa: [50.7, 101.3], o2_pct: [18.0, 50.0], flow_cms: [0, 0], diluents: ["N2", "He"] },
    pi: "R. L. Axelbaum",
  },
  "acme-cld-flame": {
    facility: "CIR (Coflow Burner)",
    fuelMaterial: "CH₄, C₂H₄ (разбавленные N₂)",
    fuelState: "gas",
    sampleSizeMm: "2.1 / 25 мм",
    conditions: { flow_regime: "coflow_jet", pressure_kpa: [101.0, 300.0], o2_pct: [21.0, 21.0], flow_cms: [10.0, 40.0], diluents: ["N2"] },
    pi: "M. B. Long, M. D. Smooke",
  },
  "acme-program-overview-6-experiments": {
    facility: "CIR (ACME CIA)",
    fuelMaterial: "H₂, CH₄, C₂H₄, пропан, бутан, пентан",
    fuelState: "gas",
    sampleSizeMm: "0.4–50.0 мм",
    conditions: { flow_regime: "quiescent / spherical / coflow", pressure_kpa: [50.0, 304.0], o2_pct: [15.0, 85.0], flow_cms: [0, 40.0], diluents: ["N2", "He", "CO2"] },
    pi: "NASA GRC ACME Project",
  },
  "slice-acme-cld-precursor": {
    facility: "MSG / SPICE",
    fuelMaterial: "CH₄, C₂H₄ (струйная диффузия)",
    fuelState: "gas",
    sampleSizeMm: "1.0–3.2 мм",
    conditions: { flow_regime: "coflow_jet", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [5.0, 40.0], diluents: ["N2"] },
    pi: "M. B. Long, M. D. Smooke",
  },
  "saffire-i-iii": {
    facility: "Cygnus Cargo Vehicle",
    fuelMaterial: "SIBAL (40×100 см), Nomex, акрил/PMMA",
    fuelState: "solid",
    sampleSizeMm: "400×1000 мм",
    conditions: { flow_regime: "forced_duct", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [null, null], diluents: ["N2"] },
    pi: "D. L. Urban, G. A. Ruff",
  },
  "saffire-iv-v": {
    facility: "Cygnus Cargo Vehicle",
    fuelMaterial: "PMMA (40×18 см), хлопок и SIBAL (40×50 см)",
    fuelState: "solid",
    sampleSizeMm: "400×180–500 мм",
    conditions: { flow_regime: "forced_duct", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [null, null], diluents: ["N2"] },
    pi: "D. L. Urban, G. A. Ruff",
  },
  "same-same-r": {
    facility: "MSG",
    fuelMaterial: "Тефлон, Каптон, пена Pyrell, целлюлоза, силикон",
    fuelState: "aerosol_pyrolysis",
    conditions: { flow_regime: "forced_duct", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [0, 8.1], diluents: ["N2"] },
    pi: "D. L. Urban, M. E. Meyer",
  },
  "sofie-gel": {
    facility: "CIR / SoFIE",
    fuelMaterial: "сферы PMMA (внутренний нагрев)",
    fuelState: "solid",
    conditions: { flow_regime: "low_flow", pressure_kpa: [40.0, 100.0], o2_pct: [null, null], flow_cms: [null, null], diluents: ["N2"] },
    pi: "P. V. Ferkul / NASA GRC",
  },
  "sofie-mist": {
    facility: "CIR / SoFIE",
    fuelMaterial: "стержни чёрного литого PMMA (+ 0–3.3 кВт/м²)",
    fuelState: "solid",
    sampleSizeMm: "6.4–12.7 мм",
    conditions: { flow_regime: "opposed_flow", pressure_kpa: [40.0, 100.0], o2_pct: [null, null], flow_cms: [10.0, 10.0], diluents: ["N2"], loi_pct: "ниже 1g" },
    pi: "F. J. Miller / NASA GRC",
  },
  "earth-baseline-nasa-std-6001-test-1": {
    facility: "Ground 1g Lab",
    fuelMaterial: "Стандартный тест восходящего распространения пламени",
    fuelState: "reference",
    conditions: { flow_regime: "buoyancy_1g", pressure_kpa: [101.3, 101.3], o2_pct: [21.0, 21.0], flow_cms: [null, null], diluents: ["N2"] },
    pi: "NASA",
  },
  "iss-cabin-atmosphere": {
    facility: "ISS Orbit 0g",
    fuelMaterial: "Номинальный обитаемый отсек",
    fuelState: "reference",
    conditions: { flow_regime: "hvac_low_flow", pressure_kpa: [101.0, 101.3], o2_pct: [21.0, 21.0], flow_cms: [5.0, 20.0], diluents: ["N2"] },
    pi: "NASA",
  },
  "exploration-atmosphere-sea-lunar-mars": {
    facility: "Gateway / Lunar Surface / Rover",
    fuelMaterial: "Обитаемые модули (1/6g или 0g)",
    fuelState: "reference",
    conditions: { flow_regime: "hvac_low_flow", pressure_kpa: [56.5, 56.5], o2_pct: [34.0, 34.0], flow_cms: [null, null], diluents: ["N2"] },
    pi: "NASA EAWG",
  },
}

export function getQuickMeta(id: string): StudyQuickMeta | undefined {
  return Object.hasOwn(STUDY_QUICK_META, id) ? STUDY_QUICK_META[id] : undefined
}

export function scoreStudyForScenario(
  study: StudySummary,
  scenario: MissionScenarioId,
  conditionsOverride?: StudyConditions,
): { score: number; reasons: string[] } {
  const meta = getQuickMeta(study.id)
  const cond = conditionsOverride ?? meta?.conditions ?? {}
  const tagsLower = study.tags.map((t) => t.toLowerCase())
  const text = `${study.id} ${study.title} ${study.description} ${study.category} ${study.tags.join(" ")}`.toLowerCase()
  const o2Max = Array.isArray(cond.o2_pct) ? cond.o2_pct[1] ?? cond.o2_pct[0] : null
  const pMin = Array.isArray(cond.pressure_kpa) ? cond.pressure_kpa[0] : null

  if (scenario === "all") {
    let base = 72
    if (study.category !== "Reference") base += 12
    if (tagsLower.some((t) => t.includes("prevention") || t.includes("detection") || t.includes("suppression"))) base += 8
    return { score: Math.min(98, base), reasons: ["Входит в базовый каталог NASA PSI"] }
  }

  let score = 30
  const reasons: string[] = []

  if (scenario === "lunar-base") {
    if (study.id.includes("exploration-atmosphere")) {
      score += 68
      reasons.push("Норматив EAWG для Луны и роверов (34% O₂, 56.5 кПа)")
    }
    if (study.id.startsWith("sofie")) {
      score += 60
      reasons.push("Пониженное давление 40–100 кПа и твёрдые материалы для SEA")
    }
    if (study.id === "acme-bre") {
      score += 56
      reasons.push("Испытания при 21–34% O₂ и 50.7–101.3 кПа в штилевой атмосфере")
    }
    if (o2Max !== null && o2Max >= 30) {
      score += 18
      reasons.push(`Покрывает повышенный кислород (до ${o2Max}% O₂)`)
    }
    if (pMin !== null && pMin <= 70) {
      score += 14
      reasons.push(`Покрывает пониженное давление (от ${pMin} кПа)`)
    }
    if (study.id.includes("e-field")) {
      score += 24
      reasons.push("Имитация частичной гравитации с помощью электрополя")
    }
    if (tagsLower.some((t) => t.includes("prevention"))) score += 10
  }

  if (scenario === "spacesuit") {
    if (study.id === "acme-cfi-g") {
      score += 65
      reasons.push("Максимальный уровень кислорода в PSI (до 85% O₂)")
    }
    if (o2Max !== null && o2Max >= 45) {
      score += 35
      reasons.push(`Испытания в высококислородной среде (до ${o2Max}% O₂)`)
    }
    if (text.includes("flame design") || text.includes("flex-2")) {
      score += 25
      reasons.push("Исследует режимы с обогащением окислителем до 50% O₂")
    }
    if (study.id.includes("exploration-atmosphere") || study.id.startsWith("sofie")) {
      score += 20
      reasons.push("Оценка риска воспламенения при пониженном давлении")
    }
  }

  if (scenario === "iss-cabin") {
    if (study.id === "iss-cabin-atmosphere") {
      score += 68
      reasons.push("Эталон атмосферы МКС (21% O₂, 101.3 кПа, HVAC 5–20 см/с)")
    }
    if (study.id.startsWith("bass")) {
      score += 60
      reasons.push("U-образный предел горючести при слабом потоке HVAC (1–53 см/с)")
    }
    if (study.id.startsWith("saffire")) {
      score += 56
      reasons.push("Полномасштабное распространение огня и токсичных газов на борту")
    }
    if (study.id.startsWith("same")) {
      score += 48
      reasons.push("Калибровка датчиков дыма в отсеке МКС")
    }
  }

  if (scenario === "detection") {
    if (tagsLower.some((t) => t.includes("detection"))) {
      score += 58
      reasons.push("Прямое направление Detection в NASA PSI")
    }
    if (study.id.startsWith("same")) {
      score += 38
      reasons.push("Распределение размеров частиц дыма и сравнение датчиков МКС/Shuttle")
    }
    if (study.id.startsWith("saffire")) {
      score += 30
      reasons.push("Задержка срабатывания дымовых извещателей в большом объёме")
    }
    if (text.includes("soot") || text.includes("аэрозол") || text.includes("smoke")) {
      score += 18
      reasons.push("Данные по сажеобразованию и аэрозолям")
    }
  }

  if (scenario === "suppression") {
    if (tagsLower.some((t) => t.includes("suppression"))) {
      score += 55
      reasons.push("Прямое направление Suppression в NASA PSI")
    }
    if (study.id.startsWith("flex")) {
      score += 35
      reasons.push("Разбавление CO₂ / He / Xe и невидимое холодное пламя (cool flames)")
    }
    if (study.id === "acme-e-field-flames") {
      score += 32
      reasons.push("Активное нехимическое управление пламенем и сажей")
    }
    if (study.id === "saffire-iv-v") {
      score += 28
      reasons.push("Прототипы систем очистки воздуха от дыма и CO₂")
    }
  }

  if (scenario === "modeling") {
    if (study.category === "ACME" || study.category === "FLEX") {
      score += 48
      reasons.push("Эталонные 1D/2D данные для валидации CFD и кинетики")
    }
    if (tagsLower.some((t) => t.includes("fundamental"))) {
      score += 22
      reasons.push("Фундаментальная кинетика без влияния плавучести")
    }
    if (study.id === "acme-s-flame" || study.id === "acme-cld-flame" || study.id === "acme-bre") {
      score += 24
      reasons.push("Пористая/сферическая горелка с точными граничными условиями")
    }
  }

  if (!reasons.length) {
    reasons.push("Смежное исследование горения в микрогравитации")
  }

  return { score: Math.min(99, score), reasons }
}

export interface CrewEnvironmentCard {
  id: string
  title: string
  subtitle: string
  o2: string
  pressure: string
  gravity: string
  riskNote: string
  scenarioId: MissionScenarioId
  keyStudyIds: string[]
}

export const CREW_ENVIRONMENTS: CrewEnvironmentCard[] = [
  {
    id: "iss",
    title: "Обитаемый отсек МКС",
    subtitle: "Номинальная атмосфера орбитальной станции",
    o2: "21% O₂",
    pressure: "14.7 psi (101.3 кПа)",
    gravity: "0g (микрогравитация)",
    riskNote: "Отсутствие конвекции + слабый поток HVAC (5–20 см/с) смещают предел горючести ниже 1g (SIBAL горит при 13.6% O₂).",
    scenarioId: "iss-cabin",
    keyStudyIds: ["iss-cabin-atmosphere", "bass-bass-ii-bass-m", "saffire-i-iii", "same-same-r"],
  },
  {
    id: "lunar-base",
    title: "Лунная база и герметичные роверы",
    subtitle: "Exploration Atmosphere (NASA EAWG SEA)",
    o2: "≥ 30–34% O₂",
    pressure: "≤ 10.2 psi (56.5–70 кПа)",
    gravity: "1/6g (Луна) · ~0g (перелёт)",
    riskNote: "Концентрация O₂ выше земной более чем на 40%, что резко повышает горючесть материалов при сокращении времени десатурации.",
    scenarioId: "lunar-base",
    keyStudyIds: ["exploration-atmosphere-sea-lunar-mars", "sofie-mist", "sofie-gel", "acme-bre"],
  },
  {
    id: "spacesuit",
    title: "Скафандры и шлюзовые камеры (EVA)",
    subtitle: "Максимальная кислородная нагрузка",
    o2: "100% O₂ (аналог CFI-G до 85%)",
    pressure: "4.3 psi (29.6 кПа)",
    gravity: "0g / 1/6g / 3/8g",
    riskNote: "Чистый кислород требует жесткого отбора негорючих материалов и исключения источников зажигания.",
    scenarioId: "spacesuit",
    keyStudyIds: ["acme-cfi-g", "acme-flame-design", "flex-2-cfi"],
  },
  {
    id: "partial-g",
    title: "Частичная гравитация (Луна 1/6g, Марс 3/8g)",
    subtitle: "Пробел данных в PSI и пути его закрытия",
    o2: "21–34% O₂",
    pressure: "56.5–101.3 кПа",
    gravity: "0.16g (Луна) · 0.38g (Марс)",
    riskNote: "Прямых данных частичной гравитации в PSI пока нет (ожидаются LUCI и FM2). Границы задают 0g + 1g и аналог E-FIELD Flames.",
    scenarioId: "lunar-base",
    keyStudyIds: ["acme-e-field-flames", "earth-baseline-nasa-std-6001-test-1", "sofie-mist"],
  },
]

export interface HardwareRackGroup {
  id: string
  title: string
  location: string
  description: string
  studyIds: string[]
}

export const HARDWARE_RACKS: HardwareRackGroup[] = [
  {
    id: "cir-acme",
    title: "CIR + ACME CIA (Стойка горения, газовые горелки)",
    location: "МКС · Модуль Destiny",
    description: "6 экспериментов с газообразным топливом на единой модульной вставке ACME (сферические, пористые, коаксиальные горелки и электроды).",
    studyIds: ["acme-bre", "acme-s-flame", "acme-e-field-flames", "acme-cfi-g", "acme-flame-design", "acme-cld-flame"],
  },
  {
    id: "cir-mdca",
    title: "CIR + MDCA (Аппаратура капельного горения)",
    location: "МКС · Модуль Destiny",
    description: "Исследования одиночных, двойных и массивов капель жидкого топлива (FLEX, FLEX-2/CFI, FLEX-2J, FLEX-ICE-GA).",
    studyIds: ["flex-1", "flex-2-cfi", "flex-2j-jaxa", "flex-ice-ga"],
  },
  {
    id: "cir-sofie",
    title: "CIR + SoFIE (Твёрдые материалы в CIR)",
    location: "МКС · Модуль Destiny",
    description: "Изучение воспламенения и затухания толстых твёрдых образцов при пониженном давлении и повышенном O₂.",
    studyIds: ["sofie-gel", "sofie-mist"],
  },
  {
    id: "msg-spice",
    title: "MSG + канал SPICE (Перчаточный бокс)",
    location: "МКС · Microgravity Science Glovebox",
    description: "Вентиляционный канал SPICE для твёрдых тканей/полимеров (BASS, BASS-II, BASS-M), газовых струй (SLICE) и аэрозолей (SAME).",
    studyIds: ["bass-bass-ii-bass-m", "bass-m-milliken", "slice-acme-cld-precursor", "same-same-r"],
  },
  {
    id: "cygnus",
    title: "Грузовой корабль Cygnus (Полномасштабные испытания)",
    location: "После расстыковки с МКС",
    description: "Крупномасштабные пожарные тесты в реальном объёме отсека (образцы до 40×100 см), токсичные газы и прототипы очистки воздуха.",
    studyIds: ["saffire-i-iii", "saffire-iv-v"],
  },
]

export interface SafetyEnrichment {
  spaceControls: string[]
  earthApplications: string[]
}

export function getSafetyEnrichment(studyId: string, category: string, tags: string[]): SafetyEnrichment {
  const cat = category.toLowerCase()
  const isDetection = tags.some((t) => t.toLowerCase().includes("detection"))

  if (cat === "flex" || studyId.startsWith("flex")) {
    return {
      spaceControls: [
        "Увеличение расчётных концентраций инертных газов (CO₂, He) из-за риска невидимого холодного пламени (cool flames) и повторного воспламенения.",
        "Мониторинг CO и формальдегида (CH₂O) даже после визуального исчезновения горячего пламени.",
        "Внедрение систем пожаротушения тонкораспылённой водой (fine-water-mist) на МКС и перспективных кораблях.",
      ],
      earthApplications: [
        "Огнетушители с тонкораспылённой водой (fine-water-mist) для зданий, ЦОД и транспорта с минимальным ущербом от воды.",
        "Уточнение химической кинетики низкотемпературного сгорания (LTC / HCCI / RCCI) для более чистых и экономичных двигателей на Земле.",
      ],
    }
  }

  if (cat === "same" || isDetection) {
    return {
      spaceControls: [
        "Переход к многопараметрическим (multi-moment / multi-wavelength) датчикам дыма, отличающим мелкие частицы пиролиза Тефлона и Каптона от фоновой пыли (опыт SAME и DAFT).",
        "Учёт задержки распространения дыма в крупных обитаемых отсеках при проектировании вентиляции.",
      ],
      earthApplications: [
        "Усовершенствованные бытовые и промышленные датчики дыма с пониженным уровнем ложных срабатываний на пар и пыль.",
        "Системы раннего контроля качества воздуха и аэрозолей на опасных производствах и в шахтах.",
      ],
    }
  }

  if (cat === "bass" || cat === "sofie" || cat === "saffire") {
    return {
      spaceControls: [
        "Пересмотр земного стандарта NASA-STD-6001 Test 1 для условий слабого обдува (HVAC 1–10 см/с) и лунных атмосфер (34% O₂ / 56.5 кПа).",
        "Протоколы отключения вентиляции и послепожарной очистки воздуха от CO, HF и HCl (прототипы smoke eater и скрубберов из Saffire IV–V).",
      ],
      earthApplications: [
        "Огнестойкие ткани и защитная экипировка (PPE) для пожарных, спасателей и промышленного персонала.",
        "Облегчённые композитные воздушные баллоны (SCBA) и системы фильтрации токсичных продуктов горения.",
      ],
    }
  }

  return {
    spaceControls: [
      "Валидация 3D CFD-моделей распространения огня и радиационного тушения для замкнутых обитаемых объёмов.",
      "Активные и нехимические методы стабилизации и подавления сажи (например, электростатическое управление в E-FIELD Flames).",
    ],
    earthApplications: [
      "Проектирование малосажевых и экологически чистых промышленных горелок и камер сгорания.",
      "Эталонные кинетические модели без искажений от естественной конвекции для земной энергетики.",
    ],
  }
}
