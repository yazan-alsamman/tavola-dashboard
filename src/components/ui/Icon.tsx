import { cn } from '@/lib/utils'

interface MaterialIconProps {
  name: string
  filled?: boolean
  className?: string
  size?: number
}

export function MaterialIcon({ name, filled, className, size = 20 }: MaterialIconProps) {
  return (
    <span
      className={cn(
        'material-symbols-outlined leading-none shrink-0',
        filled && 'material-symbols-filled',
        className,
      )}
      style={{ fontSize: size }}
      aria-hidden
    >
      {name}
    </span>
  )
}

export const iconProps = { size: 20 } as const
export const iconPropsSm = { size: 16 } as const
export const iconPropsLg = { size: 24 } as const
export const iconPropsHero = { size: 32 } as const
