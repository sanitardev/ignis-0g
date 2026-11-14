import { ArrowUpRight } from "@/components/ui/icons"
import type { Source, SourceType } from "@/domain/types"

const kinds: Record<SourceType, string> = {
  article: "Статья",
  report: "Отчёт NASA",
  webpage: "Веб-страница",
  dataset: "Набор данных",
  video: "Видео",
  other: "Документ",
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return <p className="muted">Для этого эксперимента пока нет источников.</p>
  return (
    <ul className="source-list">
      {sources.map((source) => (
        <li key={source.id}>
          <span className="muted">{kinds[source.source_type] ?? "Документ"}</span>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
              <ArrowUpRight size={14} />
            </a>
          ) : (
            <span>{source.title}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
