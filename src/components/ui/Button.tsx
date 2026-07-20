import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-md shadow-primary/20 hover:opacity-95',
  secondary: 'bg-secondary-container text-on-secondary-container hover:opacity-80',
  ghost: 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary',
  danger: 'bg-error text-on-error hover:opacity-90',
  outline: 'border border-outline-variant/50 text-on-surface hover:bg-surface-variant/30',
}

const sizes = {
  sm: 'h-8 px-3 text-label-md gap-1.5',
  md: 'h-10 px-4 text-body-md gap-2',
  lg: 'h-12 px-6 text-body-lg gap-2',
  icon: 'h-10 w-10',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
