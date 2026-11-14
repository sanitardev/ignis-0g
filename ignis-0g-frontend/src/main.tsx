import { Component, lazy, StrictMode, Suspense, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource/ibm-plex-mono/latin-400.css"
import "@fontsource/ibm-plex-mono/cyrillic-400.css"
import "./index.css"

const isExplorer = window.location.pathname.replace(/\/$/, "") === "/explorer"
const Page = isExplorer
  ? lazy(() => import("@/app/explorer"))
  : lazy(() => import("@/landing/landing").then(({ Landing }) => ({ default: Landing })))

document.documentElement.lang = isExplorer ? "ru" : "en"
document.title = isExplorer ? "IGNIS 0G — Explorer" : "IGNIS 0G — Microgravity Research Explorer"

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="page-state">
      <p role="alert">{isExplorer ? "Не удалось открыть страницу." : "Unable to open the page."}</p>
      <button type="button" onClick={() => window.location.reload()}>{isExplorer ? "Перезагрузить" : "Reload page"}</button>
    </main>
  }
}

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PageBoundary>
        <Suspense fallback={<p className="page-state" role="status">{isExplorer ? "Загрузка…" : "Loading…"}</p>}>
          <Page />
        </Suspense>
      </PageBoundary>
    </StrictMode>,
  )
}
