import { useState, type FormEvent } from 'react'
import { REVIEW_AXES, type ReviewAxis, type ReviewDto } from '@/api/reviews'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { ReviewSummary } from '@/components/reviews/ReviewSummary'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterChip } from '@/components/ui/FilterChip'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useReviewsSummaryQuery } from '@/hooks/useAnalyticsQueries'
import { useCanManageReviews } from '@/hooks/usePermissions'
import { useRestaurantReviewsQuery } from '@/hooks/useReviewQueries'
import { useReopenReviewMutation, useReplyToReviewMutation } from '@/hooks/useReviewMutations'
import { apiErrorText } from '@/lib/apiErrorText'

const PAGE_SIZE = 20
const STARS = [5, 4, 3, 2, 1] as const

export function ReviewsPage() {
  const { t } = useLocale()
  const copy = t.reviews
  const { toast } = useToast()
  const { selectedRestaurantId, status: scopeStatus } = useRestaurantScope()
  const canManage = useCanManageReviews()

  const [page, setPage] = useState(1)
  const [axis, setAxis] = useState<ReviewAxis | undefined>()
  const [stars, setStars] = useState<number | undefined>()
  const [replyTarget, setReplyTarget] = useState<ReviewDto | null>(null)
  const [replyText, setReplyText] = useState('')
  const [reopenTarget, setReopenTarget] = useState<ReviewDto | null>(null)

  const enabled = scopeStatus === 'ready' && Boolean(selectedRestaurantId)
  const summaryQuery = useReviewsSummaryQuery(enabled)
  const listQuery = useRestaurantReviewsQuery(
    selectedRestaurantId ?? undefined,
    { page, pageSize: PAGE_SIZE, axis, stars },
    canManage,
    enabled,
  )
  const replyMutation = useReplyToReviewMutation()
  const reopenMutation = useReopenReviewMutation()

  const errorMessage = (err: unknown): string =>
    apiErrorText(err, t, copy.errors.unknown)

  const filterBy = (next: { axis?: ReviewAxis; stars?: number }) => {
    setAxis(next.axis)
    setStars(next.stars)
    setPage(1)
  }

  const closeReply = () => {
    if (replyMutation.isPending) return
    setReplyTarget(null)
    setReplyText('')
  }

  const submitReply = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!replyTarget || !selectedRestaurantId) return
    try {
      await replyMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: replyTarget.reviewId,
        body: { comment: replyText.trim() },
      })
      toast('success', copy.replySuccess)
      closeReply()
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  const confirmReopen = async (): Promise<void> => {
    if (!reopenTarget || !selectedRestaurantId) return
    try {
      await reopenMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: reopenTarget.reviewId,
      })
      toast('success', copy.reopenSuccess)
      setReopenTarget(null)
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  if (!enabled) {
    return (
      <div>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <EmptyState
          icon="rate_review"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      </div>
    )
  }

  const reviews = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = axis !== undefined || stars !== undefined
  const hasAnyReview = (summaryQuery.data?.activeReviewCount ?? total) > 0 || filtered

  return (
    <div>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      {summaryQuery.data && <ReviewSummary summary={summaryQuery.data} />}

      {hasAnyReview && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.axesTitle}>
            <FilterChip
              label={copy.filterAllAxes}
              active={axis === undefined}
              onClick={() => filterBy({ stars })}
            />
            {REVIEW_AXES.map((key) => (
              <FilterChip
                key={key}
                label={copy.axes[key]}
                active={axis === key}
                onClick={() => filterBy({ axis: key, stars })}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.ratingTitle}>
            <FilterChip
              label={copy.filterAllStars}
              active={stars === undefined}
              onClick={() => filterBy({ axis })}
            />
            {STARS.map((value) => (
              <FilterChip
                key={value}
                label={copy.starFilter.replace('{n}', String(value))}
                active={stars === value}
                onClick={() => filterBy({ axis, stars: value })}
              />
            ))}
          </div>
          {canManage && (
            <p className="flex items-start gap-1.5 text-label-sm text-on-surface-variant">
              <MaterialIcon name="info" size={14} className="mt-0.5" />
              {copy.noDeleteHint}
            </p>
          )}
        </div>
      )}

      {listQuery.isLoading && (
        <p className="py-12 text-center text-body-md text-on-surface-variant">{t.common.loading}</p>
      )}

      {listQuery.isError && (
        <EmptyState
          icon="error"
          title={copy.errorTitle}
          description={copy.errorBody}
          action={
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              {t.scope.retry}
            </Button>
          }
        />
      )}

      {listQuery.isSuccess && reviews.length === 0 && (
        filtered ? (
          <EmptyState
            icon="star"
            title={copy.filterEmptyTitle}
            description={copy.filterEmptyBody}
            action={
              <Button variant="outline" onClick={() => filterBy({})}>
                {copy.clearFilter}
              </Button>
            }
          />
        ) : (
          <EmptyState icon="rate_review" title={copy.emptyTitle} description={copy.emptyBody} />
        )
      )}

      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.reviewId}
              review={review}
              canManage={canManage}
              onReply={(target) => {
                setReplyTarget(target)
                setReplyText('')
              }}
              onReopen={setReopenTarget}
            />
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-label-sm text-on-surface-variant">
            {copy.page} <Num>{page}</Num> {copy.of} <Num>{totalPages}</Num>
            {' · '}
            <Num>{total}</Num> {copy.totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {copy.previous}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || listQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {copy.next}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(replyTarget)}
        onClose={closeReply}
        title={copy.replyTitle}
        description={copy.replySubtitle}
      >
        <form onSubmit={(event) => void submitReply(event)} className="space-y-4">
          {replyTarget?.comment && (
            <blockquote className="border-s-2 border-outline-variant/30 ps-3 text-body-sm text-on-surface-variant">
              {replyTarget.comment}
            </blockquote>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">{copy.replyLabel}</span>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              required
              maxLength={2000}
              placeholder={copy.replyPlaceholder}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeReply}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={replyMutation.isPending} disabled={!replyText.trim()}>
              {copy.reply}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        onConfirm={() => void confirmReopen()}
        title={copy.reopenTitle}
        message={copy.reopenMessage}
        confirmLabel={copy.reopenConfirm}
        cancelLabel={t.common.cancel}
        busy={reopenMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}
