import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ className, padding = 'md', children, ...props }: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding]

  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm',
        paddingClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 bg-surface-container-low/30 -mx-5 -mt-5 mb-4 rounded-t-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-headline-md text-on-surface flex items-center gap-2', className)} {...props}>
      {children}
    </h3>
  )
}
