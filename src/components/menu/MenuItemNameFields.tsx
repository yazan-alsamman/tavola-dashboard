import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'

interface MenuItemNameFieldsProps {
  nameAr: string
  nameEn: string
  onChange: (next: { nameAr: string; nameEn: string }) => void
  disabled?: boolean
}

/** ADR-046: the Arabic and English item names; at least one is required. */
export function MenuItemNameFields({ nameAr, nameEn, onChange, disabled }: MenuItemNameFieldsProps) {
  const { t } = useLocale()
  const copy = t.menu.items
  const missing = !nameAr.trim() && !nameEn.trim()
  return (
    <fieldset className="space-y-2 sm:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-label-sm text-on-surface-variant mb-1 block">{copy.nameAr}</span>
          <Input
            dir="rtl"
            lang="ar"
            value={nameAr}
            onChange={(e) => onChange({ nameAr: e.target.value, nameEn })}
            disabled={disabled}
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className="text-label-sm text-on-surface-variant mb-1 block">{copy.nameEn}</span>
          <Input
            dir="ltr"
            lang="en"
            value={nameEn}
            onChange={(e) => onChange({ nameAr, nameEn: e.target.value })}
            disabled={disabled}
            maxLength={200}
          />
        </label>
      </div>
      <p className={missing ? 'text-label-sm text-error' : 'text-label-sm text-on-surface-variant'}>
        {missing ? copy.nameRequired : copy.namesHint}
      </p>
    </fieldset>
  )
}
