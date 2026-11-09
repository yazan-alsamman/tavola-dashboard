import type { ReviewsSummaryDto } from '@/api/analytics'
import { REVIEW_AXES } from '@/api/reviews'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RatingStars } from './RatingStars'

interface ReviewSummaryProps {
  summary: ReviewsSummaryDto
}

/**
 * The restaurant's rating as the owner should read it: the real 6-month
 * average, whether guests see it yet ("new on Tavola" below 5 reviews), and
 * each axis with the strongest (shown to guests) and weakest marked.
 */
export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const { t, locale } = useLocale()
  const copy = t.reviews
  const number = (value: number, digits = 1) =>
    formatNumber(value, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })

  const hint =
    summary.averageRating === null
      ? copy.ratingNoneHint
      : summary.isNew
        ? copy.ratingNewHint
        : copy.ratingShownHint
  const hasAxes = REVIEW_AXES.some((axis) => summary.axisAverages[axis] !== null)

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5">
        <p className="text-label-md text-on-surface-variant">{copy.ratingTitle}</p>
        {summary.averageRating === null ? (
          <p className="mt-2 text-headline-sm font-semibold text-on-surface">{copy.ratingNone}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-headline-lg font-bold text-on-surface">
              {number(summary.averageRating)}
            </span>
            <RatingStars
              value={summary.averageRating}
              size={20}
              label={copy.scoreLabel.replace('{n}', number(summary.averageRating))}
            />
          </div>
        )}
        <p className="mt-2 text-body-sm text-on-surface-variant">
          {copy.inWindow.replace('{n}', formatNumber(summary.windowReviewCount, locale))}
          {' · '}
          {copy.allTime.replace('{n}', formatNumber(summary.activeReviewCount, locale))}
        </p>
        <p
          className={cn(
            'mt-3 flex items-start gap-2 text-label-md',
            summary.isNew ? 'text-warning' : 'text-on-surface-variant',
          )}
        >
          <MaterialIcon name="info" size={16} className="mt-0.5 shrink-0" />
          {hint}
        </p>
      </div>

      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5">
        <p className="text-label-md text-on-surface-variant">{copy.axesTitle}</p>
        {hasAxes ? (
          <ul className="mt-3 space-y-3">
            {REVIEW_AXES.map((axis) => {
              const value = summary.axisAverages[axis]
              const strongest = summary.strongestAxis === axis
              const weakest = summary.weakestAxis === axis && !strongest
              return (
                <li key={axis} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-16 text-label-lg font-semibold text-on-surface">
                      {copy.axes[axis]}
                    </span>
                    <span className="text-label-lg text-on-surface">
                      {value === null ? '—' : number(value)}
                    </span>
                    {strongest && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-label-sm font-semibold text-success">
                        <MaterialIcon name="auto_awesome" size={14} />
                        {copy.strongBadge[axis]}
                        <span className="font-normal">· {copy.strongestHint}</span>
                      </span>
                    )}
                    {weakest && (
                      <span className="rounded-full bg-warning-light px-2 py-0.5 text-label-sm font-semibold text-warning">
                        {copy.weakestHint}
                      </span>
                    )}
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-container-high"
                    aria-hidden
                  >
                    <div
                      className={cn('h-full rounded-full', strongest ? 'bg-success' : 'bg-primary')}
                      style={{ width: `${((value ?? 0) / 5) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-body-sm text-on-surface-variant">{copy.axesEmpty}</p>
        )}
      </div>
    </section>
  )
}
