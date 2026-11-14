import { useEffect, useRef, type ReactNode } from "react"
import { X } from "@/components/ui/icons"

export function WorkspacePane({ id, label, className, breakpoint, expanded, drawer, onClose, children }: {
  id: string
  label: string
  className: string
  breakpoint: number
  expanded: boolean
  drawer: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`)
    function sync() {
      const dialog = ref.current
      if (!dialog) return
      const modal = query.matches && drawer
      const visible = query.matches ? drawer : expanded
      if (dialog.open && (!visible || dialog.matches(":modal") !== modal)) dialog.close()
      if (!visible || dialog.open) return
      if (modal) dialog.showModal()
      else {
        const focused = document.activeElement
        dialog.show()
        if (focused instanceof HTMLElement && focused !== document.body) focused.focus()
        else if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      }
    }

    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [breakpoint, expanded, drawer])

  return (
    <dialog id={id} ref={ref} className={className} aria-label={label}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && event.currentTarget.matches(":modal")) onClose() }}>
      <div className="pane-drawer-heading">
        <strong>{label}</strong>
        <button type="button" className="icon-button" aria-label={`Закрыть: ${label}`} onClick={onClose}><X size={18} /></button>
      </div>
      {children}
    </dialog>
  )
}
