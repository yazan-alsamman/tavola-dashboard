import { Button } from '@/components/ui/Button'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useOfferImpactQuery } from '@/hooks/useOfferQueries'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

interface OfferImpactCardProps {
  restaurantId: string
  offerId: string
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-container-low px-4 py-3">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 text-headline-sm font-semibold text-on-surface">{value}</p>
    </div>
  )
}

/** ADR-047: the impact card of one offer (CR "بطاقة أثر لكل عرض"). */
export function OfferImpactCard({ restaurantId, offerId }: OfferImpactCardProps) {
  const { t, locale } = useLocale()
  const copy = t.offers.impact
  const query = useOfferImpactQuery(restaurantId, offerId)

  if (query.isLoading) {
    return <p className="py-8 text-center text-body-md text-on-surface-variant">{t.common.loading}</p>
  }
  if (query.isError || !query.data) {
    return (
      <div className="py-6 text-center">
        <p className="text-body-md text-error">{copy.error}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => void query.refetch()}>
          {t.scope.retry}
        </Button>
      </div>
    )
  }

  const impact = query.data
  const { comparison } = impact
  const started = comparison.from !== null
  const percent = (value: number | null) =>
    value === null ? '—' : `${formatNumber(value, locale)}%`
  const signed = (value: number) =>
    `${value > 0 ? '+' : ''}${formatNumber(value, locale)}%`

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={copy.views} value={<Num>{impact.views}</Num>} />
        <Stat label={copy.bookings} value={<Num>{impact.bookings}</Num>} />
        <Stat label={copy.persons} value={<Num>{impact.persons}</Num>} />
        <Stat label={copy.attended} value={<Num>{impact.attended}</Num>} />
        <Stat label={copy.newCustomers} value={percent(impact.newCustomerPercent)} />
      </div>

      <section className="space-y-2">
        <h3 className="text-body-md font-semibold text-on-surface">{copy.comparisonTitle}</h3>
        {!started ? (
          <p className="text-body-sm text-on-surface-variant">{copy.notStarted}</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-2 text-body-md sm:grid-cols-3">
              <div className="rounded-lg border border-outline-variant/40 px-3 py-2">
                <dt className="text-label-sm text-on-surface-variant">{copy.inSlots}</dt>
                <dd className="font-semibold text-on-surface">
                  <Num>{comparison.bookingsInOfferSlots}</Num>
                </dd>
              </div>
              <div className="rounded-lg border border-outline-variant/40 px-3 py-2">
                <dt className="text-label-sm text-on-surface-variant">{copy.usual}</dt>
                <dd className="font-semibold text-on-surface">
                  {comparison.usualBookings === null ? '—' : <Num>{comparison.usualBookings}</Num>}
                </dd>
              </div>
              <div className="rounded-lg border border-outline-variant/40 px-3 py-2">
                <dt className="text-label-sm text-on-surface-variant">{copy.lift}</dt>
                <dd
                  className={cn(
                    'font-semibold',
                    comparison.liftPercent === null
                      ? 'text-on-surface-variant'
                      : comparison.liftPercent >= 0
                        ? 'text-success'
                        : 'text-error',
                  )}
                >
                  {comparison.liftPercent === null ? (
                    copy.noBaseline
                  ) : (
                    <bdi dir="ltr">{signed(comparison.liftPercent)}</bdi>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-label-sm text-on-surface-variant">
              {copy.baselineHint.replace('{weeks}', formatNumber(comparison.baselineWeeks, locale))}
            </p>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-body-md font-semibold text-on-surface">{copy.costTitle}</h3>
        {impact.estimatedCost.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">{copy.noCost}</p>
        ) : (
          <ul className="space-y-1">
            {impact.estimatedCost.map((cost) => (
              <li key={cost.currency ?? 'none'} className="text-body-md text-on-surface">
                <span className="font-semibold">
                  <Num>{cost.amount}</Num>
                  {cost.currency ? ` ${cost.currency}` : ''}
                </span>
                {cost.partial && (
                  <span className="ms-2 text-label-sm text-warning">{copy.partial}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-label-sm text-on-surface-variant">{copy.costHint}</p>
      </section>
    </div>
  )
}
