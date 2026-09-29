import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastAction {
  undoLabel?: string
  onUndo?: () => void
}

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  onUndo?: () => void
  undoLabel?: string
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const icons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'cancel',
  info: 'info',
  warning: 'warning',
}

const styles = {
  success: 'border-success/30 bg-success-light',
  error: 'border-error/30 bg-error-container',
  info: 'border-primary/30 bg-primary-container/10',
  warning: 'border-warning/30 bg-warning-light',
}

const iconStyles = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-primary',
  warning: 'text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, message?: string, action?: ToastAction) => {
    const id = `toast-${Date.now()}`
    setToasts((prev) => [
      ...prev,
      { id, type, title, message, onUndo: action?.onUndo, undoLabel: action?.undoLabel },
    ])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, action?.onUndo ? 6000 : 4000)
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none md:bottom-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated',
              'bg-surface-container-lowest animate-slide-up',
              styles[item.type],
            )}
            role="alert"
          >
            <MaterialIcon name={icons[item.type]} size={20} className={cn('shrink-0 mt-0.5', iconStyles[item.type])} filled />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-semibold text-on-surface">{item.title}</p>
              {item.message && <p className="text-body-sm text-on-surface-variant mt-0.5">{item.message}</p>}
            </div>
            {item.onUndo && (
              <button
                type="button"
                className="text-label-md text-primary"
                onClick={() => {
                  item.onUndo?.()
                  dismiss(item.id)
                }}
              >
                {item.undoLabel ?? t.common.undo}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-outline hover:text-on-surface text-lg leading-none"
              aria-label={t.common.close}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
