import { Button } from "@/components/ui/button"

export function QueryLoading({ label }: { label: string }) {
  return <div className="query-loading" role="status">
    <span>{label}</span>
    <div className="query-skeleton" aria-hidden="true" />
  </div>
}

export function QueryFailure({ label, retry, fetching }: {
  label: string
  retry: () => void
  fetching: boolean
}) {
  return <div className="query-failure">
    <p role="alert">{label}</p>
    <Button type="button" size="sm" variant="outline" disabled={fetching} onClick={retry}>
      {fetching ? "Загрузка…" : "Повторить"}
    </Button>
  </div>
}
