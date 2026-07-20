import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-headline-lg text-on-surface">{title}</h1>
        {subtitle && <p className="text-body-md text-on-surface-variant mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
