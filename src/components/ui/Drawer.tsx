import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

/**
 * A side panel. `end` sits on the inline end, so it opens from the right in
 * English and from the left in Arabic.
 */
export function Drawer({
  open,
  onClose,
  title,
  closeLabel,
  children,
  side = 'end',
}: {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
  side?: 'start' | 'end'
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-inverse-surface/50"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-md flex-col bg-surface-container-lowest elev-4',
          side === 'end' ? 'end-0' : 'start-0',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 px-4 py-3">
          <h2 id={titleId} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label={closeLabel} onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
