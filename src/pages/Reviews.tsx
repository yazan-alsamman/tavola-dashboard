import { useState, type FormEvent } from 'react'
import { isApiError } from '@/api/errors'
import type { ReviewDto } from '@/api/reviews'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useRestaurantReviewsQuery } from '@/hooks/useReviewQueries'
import {
  useDeleteReviewMutation,
  useReplyToReviewMutation,
} from '@/hooks/useReviewMutations'
import { useCanReplyToReviews } from '@/hooks/usePermissions'

const PAGE_SIZE = 20

function reviewId(review: ReviewDto): string {
  return review.reviewId ?? review.id ?? ''
}

function formatInstant(iso: string | undefined, locale: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function RatingStars({ rating }: { rating: number | undefined }) {
  const value = Math.min(5, Math.max(0, rating ?? 0))
  return (
    <div className="flex items-center gap-0.5 text-warning" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <MaterialIcon
          key={i}
          name="star"
          size={16}
          filled={i < value}
          className={i < value ? 'text-warning' : 'text-outline-variant/40'}
        />
      ))}
    </div>
  )
}

export function ReviewsPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { selectedRestaurantId, status: scopeStatus } = useRestaurantScope()
  const canReply = useCanReplyToReviews()

  const [page, setPage] = useState(1)
  const [replyTarget, setReplyTarget] = useState<ReviewDto | null>(null)
  const [replyText, setReplyText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ReviewDto | null>(null)

  const enabled = scopeStatus === 'ready' && Boolean(selectedRestaurantId)
  const listQuery = useRestaurantReviewsQuery(
    selectedRestaurantId ?? undefined,
    page,
    PAGE_SIZE,
    enabled,
  )

  const replyMutation = useReplyToReviewMutation()
  const deleteMutation = useDeleteReviewMutation()

  const mapError = (err: unknown): string =>
    isApiError(err) ? err.message : t.reviews.errors.unknown

  const openReply = (review: ReviewDto) => {
    setReplyTarget(review)
    setReplyText(review.reply ?? '')
  }

  const closeReply = () => {
    if (replyMutation.isPending) return
    setReplyTarget(null)
    setReplyText('')
  }

  const handleReply = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!replyTarget || !selectedRestaurantId || !canReply) return
    const id = reviewId(replyTarget)
    if (!id) return

    try {
      await replyMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: id,
        body: { comment: replyText.trim() },
      })
      toast('success', t.reviews.replySuccess)
      closeReply()
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget || !selectedRestaurantId) return
    const id = reviewId(deleteTarget)
    if (!id) return

    try {
      await deleteMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: id,
      })
      toast('success', t.reviews.deleteSuccess)
      setDeleteTarget(null)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  if (!enabled) {
    return (
      <div>
        <PageHeader title={t.reviews.title} subtitle={t.reviews.subtitle} />
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

  return (
    <div>
      <PageHeader title={t.reviews.title} subtitle={t.reviews.subtitle} />

      {listQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.common.loading}
        </p>
      )}

      {listQuery.isError && (
        <EmptyState
          icon="error"
          title={t.reviews.errorTitle}
          description={t.reviews.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void listQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {listQuery.isSuccess && reviews.length === 0 && (
        <EmptyState
          icon="rate_review"
          title={t.reviews.emptyTitle}
          description={t.reviews.emptyBody}
        />
      )}

      {listQuery.isSuccess && reviews.length > 0 && (
        <>
          <DataTable className="mb-4">
            <DataTableHead>
              <tr>
                <DataTableHeader>{t.reviews.columns.rating}</DataTableHeader>
                <DataTableHeader>{t.reviews.columns.comment}</DataTableHeader>
                <DataTableHeader className="hidden md:table-cell">
                  {t.reviews.columns.date}
                </DataTableHeader>
                <DataTableHeader className="text-end">
                  {t.common.actions}
                </DataTableHeader>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {reviews.map((review) => {
                const id = reviewId(review)
                return (
                  <DataTableRow key={id}>
                    <DataTableCell>
                      <RatingStars rating={review.rating} />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="max-w-md space-y-2">
                        {review.comment ? (
                          <p className="text-body-md text-on-surface">{review.comment}</p>
                        ) : (
                          <p className="text-body-md text-on-surface-variant italic">
                            {t.reviews.noComment}
                          </p>
                        )}
                        {review.reply && (
                          <div className="rounded-lg bg-surface-container-low px-3 py-2 border-s-2 border-primary">
                            <p className="text-label-sm font-semibold text-primary mb-0.5">
                              {t.reviews.replyLabel}
                            </p>
                            <p className="text-body-sm text-on-surface-variant">
                              {review.reply}
                            </p>
                          </div>
                        )}
                        <p className="text-label-sm text-on-surface-variant md:hidden">
                          {formatInstant(review.createdAt, locale)}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="hidden md:table-cell">
                      {formatInstant(review.createdAt, locale)}
                    </DataTableCell>
                    <DataTableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {canReply && (
                          <button
                            type="button"
                            className="p-2 rounded-lg text-primary hover:bg-primary/10"
                            title={t.reviews.reply}
                            onClick={() => openReply(review)}
                          >
                            <MaterialIcon name="reply" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-2 rounded-lg text-error hover:bg-error/10"
                          title={t.common.delete}
                          onClick={() => setDeleteTarget(review)}
                        >
                          <MaterialIcon name="delete" size={18} />
                        </button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-label-sm text-on-surface-variant">
                {t.reviews.page} <Num>{page}</Num> {t.reviews.of} <Num>{totalPages}</Num>
                {' · '}
                <Num>{total}</Num> {t.reviews.totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.reviews.previous}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t.reviews.next}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(replyTarget)}
        onClose={closeReply}
        title={t.reviews.replyTitle}
        description={t.reviews.replySubtitle}
      >
        <form onSubmit={(e) => void handleReply(e)} className="space-y-4">
          {replyTarget?.comment && (
            <blockquote className="text-body-sm text-on-surface-variant border-s-2 border-outline-variant/30 ps-3">
              {replyTarget.comment}
            </blockquote>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">
              {t.reviews.replyPlaceholder}
            </span>
            <textarea
              className="w-full min-h-[100px] rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
              placeholder={t.reviews.replyPlaceholder}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeReply}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={replyMutation.isPending}>
              {replyMutation.isPending ? t.common.loading : t.reviews.reply}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={t.reviews.deleteTitle}
        message={t.reviews.deleteMessage}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={deleteMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}
