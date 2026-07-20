import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'
import { specialOccasions } from '@/data/mockData'
import { formatTime } from '@/lib/utils'

const occasionIcons: Record<string, string> = {
  birthday: 'cake',
  anniversary: 'local_florist',
  engagement: 'celebration',
  graduation: 'auto_awesome',
  custom: 'auto_awesome',
}

export function SpecialOccasionsPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader title={t.occasions.title} subtitle={t.occasions.subtitle} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specialOccasions.map((occasion) => {
          const iconName = occasionIcons[occasion.occasionType] ?? 'cake'
          return (
            <Card key={occasion.id}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-light text-primary shrink-0">
                  <MaterialIcon name={iconName} size={20} filled={iconName === 'cake'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-on-surface">{occasion.customerName}</p>
                      <p className="text-sm text-on-surface-variant capitalize">{occasion.occasionType}</p>
                    </div>
                    <StatusBadge
                      status={occasion.status}
                      label={occasion.status}
                      type="custom"
                    />
                  </div>
                  <p className="text-sm text-on-surface-variant mt-2">
                    {t.occasions.executionTime}: {formatTime(occasion.executionTime)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {occasion.services.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2 py-1 rounded-full bg-surface-container-lowest capitalize"
                      >
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">{occasion.notes}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
