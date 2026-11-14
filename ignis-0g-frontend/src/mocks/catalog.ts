import type { StudySummary } from "@/domain/types"
import { mockStudies } from "./data"

export const topics = [
  "Prevention",
  "Detection",
  "Suppression",
  "Fundamental",
  "Exploration Atmospheres",
] as const

export const catalog: Record<string, { code: string; topics: number[]; subject: string; facility: string }> = {
  "flex-1": { code: "FLEX-1", topics: [2, 3], subject: "Droplet combustion", facility: "ISS · CIR / MDCA" },
  "bass-bass-ii-bass-m": { code: "BASS-II", topics: [0], subject: "Solid materials", facility: "ISS · MSG / SPICE" },
  "saffire-i-iii": { code: "SAFFIRE", topics: [0, 1], subject: "Large-scale fire spread", facility: "Cygnus" },
  "acme-bre": { code: "ACME BRE", topics: [0, 4], subject: "Porous burner emulator", facility: "ISS · CIR / CIA" },
  "sofie-mist": { code: "SoFIE", topics: [0, 4], subject: "Subatmospheric solids", facility: "ISS · CIR / SoFIE" },
  "same-same-r": { code: "SAME", topics: [1], subject: "Smoke & aerosols", facility: "ISS · MSG" },
}

export function catalogEntry(id: string) {
  return Object.hasOwn(catalog, id) ? catalog[id] : undefined
}

export const research: StudySummary[] = mockStudies.filter((s) => Object.hasOwn(catalog, s.id))
