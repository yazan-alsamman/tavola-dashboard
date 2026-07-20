import { MaterialIcon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon = 'search', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4">
        <MaterialIcon name={icon} size={24} />
      </div>
      <h3 className="text-body-md font-semibold text-on-surface">{title}</h3>
      {description && <p className="text-body-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
