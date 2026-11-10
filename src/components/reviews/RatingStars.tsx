import { MaterialIcon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  /** 0–5; rounds to whole stars for display. */
  value: number
  label: string
  size?: number
  className?: string
}

/** Five stars, the first `value` (rounded) filled. */
export function RatingStars({ value, label, size = 16, className }: RatingStarsProps) {
  const filled = Math.round(Math.min(5, Math.max(0, value)))
  return (
    <span role="img" aria-label={label} className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <MaterialIcon
          key={i}
          name="star"
          size={size}
          filled={i < filled}
          className={i < filled ? 'fill-current text-warning' : 'text-outline-variant/50'}
        />
      ))}
    </span>
  )
}
