import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function Input({ className, icon, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-outline">
          {icon}
        </div>
      )}
      <input
        className={cn(
          'w-full h-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-md',
          'placeholder:text-outline/50 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          icon ? 'ps-10 pe-4' : 'px-4',
          className,
        )}
        {...props}
      />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-10 rounded-lg border-none bg-surface-container-low text-on-surface-variant text-label-md px-3',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        'transition-colors duration-200 cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
