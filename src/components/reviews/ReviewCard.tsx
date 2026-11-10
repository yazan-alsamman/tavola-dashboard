import { REVIEW_AXES, type ReviewDto } from '@/api/reviews'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { formatDateTime, formatNumber } from '@/lib/format'
import { RatingStars } from './RatingStars'

interface ReviewCardProps {
  review: ReviewDto
  /** Owner/Admin: reply once, and open the review for re-rating. */
  canManage: boolean
  onReply: (review: ReviewDto) => void
  onReopen: (review: ReviewDto) => void
}

/**
 * One guest review: overall score, the three axes with their comments, the
 * guest's photos, the private note (restaurant only) and the reply. The
 * restaurant can reply once and let the guest rate again; it never deletes.
 */
export function ReviewCard({ review, canManage, onReply, onReopen }: ReviewCardProps) {
  const { t, locale } = useLocale()
  const copy = t.reviews
  const score = formatNumber(review.score, locale, {
    minimumFractionDigits: review.axes ? 1 : 0,
    maximumFractionDigits: 2,
  })

  return (
    <article className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={review.score} label={copy.scoreLabel.replace('{n}', score)} />
        <span className="text-label-lg font-semibold text-on-surface">{score}</span>
        <span className="text-label-md text-on-surface-variant">
          {review.reviewerUsername?.trim() || copy.guest}
        </span>
        <span className="text-label-sm text-on-surface-variant">
          {formatDateTime(review.createdAt, locale)}
        </span>
        {review.reratedAt && (
          <span className="rounded-full bg-primary-container/30 px-2 py-0.5 text-label-sm font-semibold text-primary">
            {copy.rerated}
          </span>
        )}
      </header>

      {review.axes && (
        <dl className="grid gap-2 sm:grid-cols-3">
          {REVIEW_AXES.map((axis) => {
            const item = review.axes![axis]
            return (
              <div key={axis} className="rounded-lg bg-surface-container-low px-3 py-2">
                <dt className="flex items-center justify-between gap-2 text-label-md font-semibold text-on-surface">
                  {copy.axes[axis]}
                  <RatingStars
                    value={item.rating}
                    size={14}
                    label={copy.scoreLabel.replace('{n}', formatNumber(item.rating, locale))}
                  />
                </dt>
                {item.comment && (
                  <dd className="mt-1 text-body-sm text-on-surface-variant">{item.comment}</dd>
                )}
              </div>
            )
          })}
        </dl>
      )}

      {review.comment ? (
        <p className="text-body-md text-on-surface">{review.comment}</p>
      ) : (
        !review.axes && <p className="text-body-md italic text-on-surface-variant">{copy.noComment}</p>
      )}

      {review.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.images
            .filter((image) => image.imageUrl)
            .map((image) => (
              <a
                key={image.reviewImageId}
                href={image.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={image.imageUrl}
                  alt=""
                  className="size-16 rounded-lg border border-outline-variant/30 object-cover"
                />
              </a>
            ))}
        </div>
      )}

      {review.privateNote && (
        <div className="rounded-lg border border-warning/30 bg-warning-light px-3 py-2">
          <p className="flex items-center gap-1.5 text-label-sm font-semibold text-on-surface">
            <MaterialIcon name="lock" size={14} />
            {copy.privateNote}
            <span className="font-normal text-on-surface-variant">· {copy.privateNoteHint}</span>
          </p>
          <p className="mt-1 text-body-sm text-on-surface">{review.privateNote}</p>
        </div>
      )}

      {review.reply && (
        <div className="rounded-lg border-s-2 border-primary bg-surface-container-low px-3 py-2">
          <p className="mb-0.5 text-label-sm font-semibold text-primary">{copy.replyLabel}</p>
          <p className="text-body-sm text-on-surface-variant">{review.reply.comment}</p>
        </div>
      )}

      {review.openForRerating && (
        <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
          <MaterialIcon name="hourglass_empty" size={16} />
          {copy.openForRerating}
        </p>
      )}

      {canManage && (!review.reply || !review.openForRerating) && (
        <footer className="flex flex-wrap justify-end gap-2">
          {!review.openForRerating && (
            <Button type="button" size="sm" variant="outline" className="h-11" onClick={() => onReopen(review)}>
              <MaterialIcon name="redo" size={16} />
              {copy.reopen}
            </Button>
          )}
          {!review.reply && (
            <Button type="button" size="sm" className="h-11" onClick={() => onReply(review)}>
              <MaterialIcon name="reply" size={16} />
              {copy.reply}
            </Button>
          )}
        </footer>
      )}
    </article>
  )
}
