import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

const DropdownCloseContext = createContext<() => void>(() => undefined)

export function DropdownMenu({
  label,
  children,
  align = 'end',
}: {
  label: string
  children: ReactNode
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <DropdownCloseContext.Provider value={() => setOpen(false)}>
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant',
          'hover:bg-surface-container-high hover:text-on-surface',
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <MaterialIcon name="more_horiz" size={18} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-outline-variant/60',
            'bg-surface-container-lowest p-1 elev-3',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
    </DropdownCloseContext.Provider>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: ReactNode
  onSelect: () => void
  destructive?: boolean
}) {
  const close = useContext(DropdownCloseContext)
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center rounded-lg px-3 py-2 text-start text-label-md',
        destructive
          ? 'text-error hover:bg-error-container'
          : 'text-on-surface hover:bg-surface-container-high',
      )}
      onClick={() => {
        onSelect()
        close()
      }}
    >
      {children}
    </button>
  )
}
