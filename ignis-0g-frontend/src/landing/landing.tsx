import { useEffect, useRef, useState } from "react"
import { ArrowRight, BookOpen, FlaskConical, Menu, Network, Search, X } from "@/components/ui/icons"
import flame from "@/assets/flex-flame.webp"
import { catalogEntry, research, topics } from "@/mocks/catalog"
import { ResearchFlow, WorkflowFlow, studyUrl } from "./research-flow"
import "./landing.css"

const summaries: Record<string, string> = {
  "flex-1": "How droplets of liquid fuel burn, form cool flames, and extinguish in microgravity.",
  "bass-bass-ii-bass-m": "How airflow affects burning and extinguishment in solid materials.",
  "saffire-i-iii": "How fire spreads in a full-scale cargo spacecraft.",
  "acme-bre": "How a gaseous porous burner emulates solid material flammability in still air.",
  "sofie-mist": "How reduced pressure and oxygen concentration affect solid fuel ignition.",
  "same-same-r": "How microgravity smoke particle size distribution affects spacecraft fire detection.",
}

const navigation = [
  { href: "#start", label: "Quickstart" },
  { href: "#workflow", label: "Workflow" },
  { href: "#catalog", label: "Experiments" },
  { href: "#about", label: "About" },
]

function Brand() {
  return (
    <a className="landing-brand" href="/" aria-label="IGNIS 0G home">
      <img src="/ignis-logo.png" alt="" width={28} height={28} style={{ borderRadius: 6 }} />
      <span>
        <span style={{ color: "#000000" }}>IGNIS</span>{" "}
        <span style={{ color: "var(--brand)" }}>0G</span>
      </span>
    </a>
  )
}

function ExperimentSearch({ dialog }: { dialog: { current: HTMLDialogElement | null } }) {
  const [query, setQuery] = useState("")
  const matches = research.filter(({ id, title }) =>
    `${catalogEntry(id)?.code} ${title} ${summaries[id]}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <dialog ref={dialog} className="landing-search-dialog" aria-labelledby="experiment-search-title" onClose={() => setQuery("")}
    onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <div>
      <div className="landing-search-heading"><h2 id="experiment-search-title">Search experiments</h2>
        <button type="button" aria-label="Close search" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      <label className="landing-search-input"><Search size={20} /><input autoFocus type="search" aria-label="Search by name or topic" placeholder="Search by name or topic…" value={query}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close() } }} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul>{matches.map(({ id, title }) => <li key={id}><a href={studyUrl(id)}><strong>{catalogEntry(id)?.code}</strong><span>{title}</span><ArrowRight size={17} /></a></li>)}</ul>
      {!matches.length && <p role="status">No experiments found.</p>}
    </div>
  </dialog>
}

export function Landing() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [featuredId, setFeaturedId] = useState("flex-1")
  const featured = research.find(({ id }) => id === featuredId) ?? research[0]

  useEffect(() => {
    function searchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        if (!dialog.current?.open) dialog.current?.showModal()
      }
    }
    window.addEventListener("keydown", searchShortcut)
    return () => window.removeEventListener("keydown", searchShortcut)
  }, [])

  return <div className="landing">
    <a className="landing-skip" href="#landing-main">Skip to content</a>
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Brand />
        <nav className="landing-desktop-nav" aria-label="Main navigation">{navigation.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}</nav>
        <div className="landing-header-actions">
          <button type="button" className="landing-search-trigger" aria-label="Search experiments" onClick={() => dialog.current?.showModal()}><Search size={18} /><span>Search</span><kbd>Ctrl K</kbd></button>
          <a className="landing-button landing-header-cta" href="/explorer"><Network size={17} /> Open Explorer</a>
          <button type="button" className="landing-menu-trigger" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="landing-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      <nav id="landing-mobile-nav" className="landing-mobile-nav" aria-label="Mobile navigation" hidden={!menuOpen}>
        {navigation.map(({ href, label }) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <a href="/explorer">Open Explorer <ArrowRight size={17} /></a>
      </nav>
    </header>
    <ExperimentSearch dialog={dialog} />

    <main id="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-container landing-hero-inner">
          <div className="landing-pitch">
            <h1 id="landing-title">Explore fire in<br /> <em>microgravity</em></h1>
            <p>Discover how flames take shape, spread, and go out through NASA experiments in space.</p>
            <div className="landing-actions">
              <a className="landing-button" href="/explorer"><Network size={19} /> Open Explorer</a>
              <a className="landing-button landing-outline" href="#catalog"><FlaskConical size={19} /> Browse experiments</a>
            </div>
          </div>
          <ResearchFlow />
        </div>
      </section>

      <section className="landing-container landing-stats" aria-label="Catalog overview">
        <dl>
          <div><dt>Experiments</dt><dd>{research.length}</dd></div>
          <div><dt>Research topics</dt><dd>{topics.length}</dd></div>
          <div><dt>Research program</dt><dd>NASA</dd></div>
        </dl>
        <div><p>IGNIS 0G brings together experiments on fire in space, their findings, and the sources behind them.</p><a className="landing-button landing-outline" href="#catalog"><BookOpen size={18} /> View catalog</a></div>
      </section>

      <section id="start" className="landing-container">
        <div className="landing-dark landing-quickstart">
          <h2>Getting started with IGNIS 0G</h2>
          <p>Pick an experiment to open its overview, findings, and sources.</p>
          <div className="landing-terminal">
            <div className="landing-terminal-dots" aria-hidden="true"><i /><i /><i /></div>
            <a href={studyUrl("flex-1")}>Open <strong>FLEX-1</strong> <ArrowRight size={17} /></a>
          </div>
          <a href="/explorer" className="landing-dark-footer">Open the research workspace <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className="landing-container landing-workflow" id="workflow" aria-label="Research workflow">
        <article className="landing-feature">
          <div><h2>Start with a question</h2><p>Search for an experiment by name or acronym, or narrow your search by topic.</p><button type="button" className="landing-button" onClick={() => dialog.current?.showModal()}>Search experiments</button></div>
          <WorkflowFlow />
        </article>
        <article className="landing-feature landing-feature-reverse">
          <div><h2>Read the evidence</h2><p>Review what a study tested, what it found, and where the results were published.</p><a className="landing-button" href={studyUrl("flex-1")}>Explore FLEX-1</a></div>
          <figure className="landing-feature-image"><img src={flame} alt="Illustration of a spherical blue flame surrounding a fuel droplet" loading="lazy" /><figcaption>FLEX · Flame illustration</figcaption></figure>
        </article>
        <article className="landing-feature">
          <div><h2>Follow the connections</h2><p>See how experiments relate to one another through shared conditions and findings.</p><a className="landing-button" href="/explorer?view=assistant">Ask the assistant</a></div>
          <WorkflowFlow overview />
        </article>
      </section>

      <section className="landing-container" id="catalog" aria-labelledby="catalog-title">
        <div className="landing-dark landing-showcase">
          <div className="landing-showcase-heading"><div><p>Experiment catalog</p><h2 id="catalog-title">Studying fire<br />in space</h2></div><div><p>From burning a single fuel droplet to tracking fire aboard a cargo spacecraft, each experiment answers a different question.</p><a className="landing-button landing-button-white" href="/explorer">Open catalog</a></div></div>
          <div className="landing-featured">
            <div className="landing-featured-grid" aria-hidden="true"><Network size={78} /></div>
            <div id="featured-experiment" aria-live="polite"><strong>{catalogEntry(featured.id)?.code}</strong><h3>{featured.title}</h3><p>{summaries[featured.id]}</p><a className="landing-button" href={studyUrl(featured.id)}>Open experiment <ArrowRight size={16} /></a></div>
          </div>
          <div className="landing-study-buttons" role="group" aria-label="Preview an experiment">{research.map(({ id }) => <button type="button" key={id} aria-pressed={id === featuredId} aria-controls="featured-experiment" onClick={() => setFeaturedId(id)}>{catalogEntry(id)?.code}</button>)}</div>
        </div>
      </section>

      <section className="landing-container landing-directory" aria-labelledby="directory-title">
        <h2 id="directory-title">All experiments</h2>
        <ul>{research.map(({ id, title }) => <li key={id}><a href={studyUrl(id)}><strong>{catalogEntry(id)?.code}</strong><span>{title}</span><ArrowRight size={17} /></a></li>)}</ul>
      </section>

      <section className="landing-container landing-about" id="about">
        <h2>About IGNIS 0G</h2>
        <p>IGNIS 0G is a research workspace for exploring combustion in microgravity and tracing findings back to their sources.</p>
        <a href="/explorer">Open Explorer <ArrowRight size={16} /></a>
      </section>
    </main>

    <footer className="landing-footer">
      <div className="landing-container">
        <div><Brand /><p>Explore combustion research in microgravity.</p></div>
        <nav aria-label="Footer navigation">{navigation.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}<a href="/explorer">Open Explorer <ArrowRight size={15} /></a></nav>
      </div>
    </footer>
  </div>
}
