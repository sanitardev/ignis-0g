import {
  FlaskConical,
  GitCompare,
  Layers3,
  Rocket,
  Search,
} from "@/components/ui/icons"

export const sections = [
  { name: "Дашборд и рейтинг", label: "Главная", icon: Layers3 },
  { name: "Исследования", label: "Исследования", icon: FlaskConical },
  { name: "Сравнение и установки", label: "Сравнение", icon: GitCompare },
  { name: "Среды обитания", label: "Среды О₂", icon: Rocket },
] as const

export type Section = (typeof sections)[number]["name"] | "ИИ-ассистент"

interface SidebarProps {
  studiesCount: number
  section: Section
  compareCount: number
  onSection: (section: Section) => void
  onOpenSearch: () => void
}

export function Sidebar({
  studiesCount,
  section,
  compareCount,
  onSection,
  onOpenSearch,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Навигация">
      <div className="sidebar-brand-row">
        <a className="workspace-title" href="/">
          <img src="/ignis-logo.png" alt="" className="brand-logo-img" />
          <span className="brand-wordmark">
            <span className="brand-ignis">IGNIS</span>{" "}
            <span className="brand-zero-g">0G</span>
          </span>
        </a>
      </div>

      <button type="button" className="sidebar-primary-cta" onClick={onOpenSearch}>
        <Search size={16} />
        <span>Быстрый поиск</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="sidebar-group-label">НАВИГАЦИЯ</div>
      <nav aria-label="Разделы" className="side-nav">
        {sections.map(({ name, label, icon: Icon }) => (
          <button
            key={name}
            type="button"
            aria-current={section === name ? "page" : undefined}
            onClick={() => onSection(name)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {name === "Исследования" && studiesCount > 0 && (
              <span className="nav-count-muted">{studiesCount}</span>
            )}
            {name === "Сравнение и установки" && compareCount > 0 && (
              <span className="nav-count">{compareCount}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
