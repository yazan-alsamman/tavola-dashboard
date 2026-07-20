import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative w-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal',
          'animate-scale-in',
          sizes[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between p-5 border-b border-outline-variant/30">
          <div>
            <h2 id="modal-title" className="text-headline-md text-on-surface">{title}</h2>
            {description && <p className="text-body-sm text-on-surface-variant mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
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
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-body-sm text-on-surface-variant mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={cn(
            'px-4 py-2 rounded-lg text-label-md transition-colors',
            variant === 'danger'
              ? 'bg-error text-on-error hover:opacity-90'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
