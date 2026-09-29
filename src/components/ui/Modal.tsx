import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Pinned action row. Scrolls independently of the body on short viewports. */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const { t } = useLocale()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const uid = useId()
  const titleId = `modal-title-${uid}`
  const descriptionId = `modal-description-${uid}`

  // Parents pass a fresh onClose after every keystroke. Reading it from a ref
  // keeps the open-dialog effect from running again and pulling focus off the field.
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      // Keep keyboard focus inside the dialog while it is open.
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (nodes.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    restoreFocusRef.current = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const firstField = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(firstField ?? panelRef.current)?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col bg-surface-container-lowest elev-4 animate-scale-in',
          'max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-outline-variant/60',
          'focus:outline-none',
          sizes[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6 border-b border-outline-variant/50">
          <div className="min-w-0">
            <h2 id={titleId} className="text-headline-md text-on-surface">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-body-sm text-on-surface-variant mt-1">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t.common.close}>
            <MaterialIcon name="close" size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 sm:px-6 border-t border-outline-variant/50 bg-surface-container-low/40 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  /** When true, confirm shows a spinner and cancel is blocked. */
  busy?: boolean
  /** Defaults true. Set false for async confirm flows that close after success. */
  closeOnConfirm?: boolean
  reasonLabel?: string
  reason?: string
  onReasonChange?: (value: string) => void
  reasonRequired?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  busy = false,
  closeOnConfirm = true,
  reasonLabel,
  reason = '',
  onReasonChange,
  reasonRequired = false,
}: ConfirmDialogProps) {
  const confirmBlocked = reasonRequired && reason.trim().length === 0
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            disabled={confirmBlocked}
            onClick={() => {
              onConfirm()
              if (closeOnConfirm) onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant leading-relaxed">{message}</p>
      {reasonLabel && (
        <label className="mt-4 block space-y-1">
          <span className="text-label-sm text-on-surface-variant">{reasonLabel}</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange?.(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
      )}
    </Modal>
  )
}
