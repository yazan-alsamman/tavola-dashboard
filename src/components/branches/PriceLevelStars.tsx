import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'

const LEVELS = [1, 2, 3, 4] as const

/** ADR-046: a branch's computed price level (1-4) as stars, or "not computed yet". */
export function PriceLevelStars({ level }: { level: number | null | undefined }) {
  const { t } = useLocale()
  if (level == null) {
    return <span className="text-on-surface-variant">{t.menu.priceLevel.none}</span>
  }
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${t.menu.priceLevel.title}: ${level} / 4`}
    >
      {LEVELS.map((value) => (
        <MaterialIcon
          key={value}
          name="star"
          size={16}
          className={value <= level ? 'fill-current text-warning' : 'text-outline-variant'}
        />
      ))}
    </span>
  )
}
