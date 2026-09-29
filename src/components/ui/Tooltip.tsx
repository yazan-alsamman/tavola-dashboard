import { useId, useState, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shows a label on hover and keyboard focus. The trigger keeps its own
 * accessible name; this text is extra, not a replacement for aria-label.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode
  children: ReactElement
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute start-1/2 top-full z-[80] mt-1.5 -translate-x-1/2 rtl:translate-x-1/2',
            'max-w-56 rounded-md bg-inverse-surface px-2 py-1 text-center text-label-sm text-inverse-on-surface',
            'whitespace-nowrap',
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
