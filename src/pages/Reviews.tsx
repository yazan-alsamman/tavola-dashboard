import { useRef, useState, type FormEvent } from 'react'
import { isApiError } from '@/api/errors'
import {
  reviewImageId,
  reviewImageUrl,
  type ReviewDto,
  type ReviewImageDto,
} from '@/api/reviews'
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
  DataTableRowActions,
} from '@/components/ui/DataTable'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { FilterChip } from '@/components/ui/FilterChip'
import { StatCard } from '@/components/ui/StatCard'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useReviewsSummaryQuery } from '@/hooks/useAnalyticsQueries'
import { useRestaurantReviewsQuery } from '@/hooks/useReviewQueries'
import {
  useDeleteReviewMutation,
  useRemoveReviewImageMutation,
  useReplyToReviewMutation,
  useUploadReviewImageMutation,
} from '@/hooks/useReviewMutations'
import { useCanReplyToReviews } from '@/hooks/usePermissions'
import { extractReviewStats } from '@/lib/analyticsPayload'
import { formatDateTime, formatNumber } from '@/lib/format'

const PAGE_SIZE = 20

function reviewId(review: ReviewDto): string {
  return review.reviewId ?? review.id ?? ''
}

function reviewImages(review: ReviewDto): ReviewImageDto[] {
  return Array.isArray(review.images) ? review.images : []
}

function formatInstant(iso: string | undefined, locale: string): string {
  if (!iso) return '—'
  return formatDateTime(iso, locale)
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [replyTarget, setReplyTarget] = useState<ReviewDto | null>(null)
  const [replyText, setReplyText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ReviewDto | null>(null)
  const [uploadTarget, setUploadTarget] = useState<ReviewDto | null>(null)
  const [removeImageTarget, setRemoveImageTarget] = useState<{
    review: ReviewDto
    image: ReviewImageDto
  } | null>(null)

  const enabled = scopeStatus === 'ready' && Boolean(selectedRestaurantId)
  const summaryQuery = useReviewsSummaryQuery(enabled)
  const listQuery = useRestaurantReviewsQuery(
    selectedRestaurantId ?? undefined,
    page,
    PAGE_SIZE,
    enabled,
  )

  const replyMutation = useReplyToReviewMutation()
  const deleteMutation = useDeleteReviewMutation()
  const uploadMutation = useUploadReviewImageMutation()
  const removeImageMutation = useRemoveReviewImageMutation()

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

  const startUpload = (review: ReviewDto) => {
    setUploadTarget(review)
    fileInputRef.current?.click()
  }

  const reviewActions = (review: ReviewDto) => (
    <DataTableRowActions
      primary={
        canReply ? (
          <Button size="sm" onClick={() => openReply(review)}>
            {review.reply ? t.reviews.editReply : t.reviews.reply}
          </Button>
        ) : undefined
      }
      menu={
        <DropdownMenu label={t.common.moreActions}>
          <DropdownMenuItem onSelect={() => startUpload(review)}>
            {t.reviews.uploadImage}
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => setDeleteTarget(review)}>
            {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenu>
      }
    />
  )

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadTarget || !selectedRestaurantId) {
      setUploadTarget(null)
      return
    }
    const id = reviewId(uploadTarget)
    if (!id) {
      setUploadTarget(null)
      return
    }
    try {
      await uploadMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: id,
        file,
      })
      toast('success', t.reviews.imageUploadSuccess)
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setUploadTarget(null)
    }
  }

  const confirmRemoveImage = async (): Promise<void> => {
    if (!removeImageTarget || !selectedRestaurantId) return
    const id = reviewId(removeImageTarget.review)
    const imageId = reviewImageId(removeImageTarget.image)
    if (!id || !imageId) return
    try {
      await removeImageMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: id,
        reviewImageId: imageId,
      })
      toast('success', t.reviews.imageRemoveSuccess)
      setRemoveImageTarget(null)
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
  const visibleReviews =
    ratingFilter == null
      ? reviews
      : reviews.filter((review) => review.rating === ratingFilter)
  const reviewStats = summaryQuery.data
    ? extractReviewStats(summaryQuery.data)
    : null
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title={t.reviews.title} subtitle={t.reviews.subtitle} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />

      {(reviewStats?.averageRating != null ||
        (reviewStats?.count != null && reviewStats.count > 0)) && (
        <div className="mb-4 max-w-sm">
          <StatCard
            icon="star"
            variant="warning"
            title={t.reviews.summaryTitle}
            value={
              reviewStats.averageRating != null
                ? formatNumber(reviewStats.averageRating, locale, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })
                : '—'
            }
            subtitle={
              reviewStats.count != null
                ? `${formatNumber(reviewStats.count, locale)} ${t.reviews.reviewCount}`
                : undefined
            }
          />
        </div>
      )}

      {listQuery.isSuccess && reviews.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label={t.common.all}
              active={ratingFilter == null}
              onClick={() => setRatingFilter(null)}
            />
            {[5, 4, 3, 2, 1].map((stars) => (
              <FilterChip
                key={stars}
                label={t.reviews.starFilter.replace('{n}', String(stars))}
                active={ratingFilter === stars}
                onClick={() => setRatingFilter(stars)}
              />
            ))}
          </div>
          <p className="text-label-sm text-on-surface-variant">{t.reviews.filterHint}</p>
        </div>
      )}

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
          {visibleReviews.length === 0 ? (
            <EmptyState
              icon="star"
              title={t.reviews.filterEmptyTitle}
              description={t.reviews.filterEmptyBody}
              action={
                <Button variant="outline" onClick={() => setRatingFilter(null)}>
                  {t.reviews.clearFilter}
                </Button>
              }
            />
          ) : (
          <DataTable
            className="mb-4"
            cards={
              <div className="mb-4 grid gap-3">
                {visibleReviews.map((review) => (
                  <article
                    key={reviewId(review)}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 space-y-3"
                  >
                    <RatingStars rating={review.rating} />
                    <p className="text-body-md text-on-surface">
                      {review.comment || t.reviews.noComment}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {formatInstant(review.createdAt, locale)}
                    </p>
                    {review.reply && (
                      <p className="text-body-sm text-on-surface-variant border-s-2 border-primary ps-3">
                        {review.reply}
                      </p>
                    )}
                    <div className="flex justify-end">{reviewActions(review)}</div>
                  </article>
                ))}
              </div>
            }
          >
            <DataTableHead>
              <DataTableHeader>{t.reviews.columns.rating}</DataTableHeader>
              <DataTableHeader>{t.reviews.columns.comment}</DataTableHeader>
              <DataTableHeader className="hidden md:table-cell">
                {t.reviews.columns.date}
              </DataTableHeader>
              <DataTableHeader className="text-end">
                {t.common.actions}
              </DataTableHeader>
            </DataTableHead>
            <DataTableBody>
              {visibleReviews.map((review) => {
                const id = reviewId(review)
                const images = reviewImages(review)
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
                        {images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {images.map((image) => {
                              const imgId = reviewImageId(image)
                              const url = reviewImageUrl(image)
                              return (
                                <div
                                  key={imgId || url || Math.random()}
                                  className="relative group"
                                >
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={url}
                                        alt=""
                                        className="h-14 w-14 rounded-lg object-cover border border-outline-variant/30"
                                      />
                                    </a>
                                  ) : (
                                    <div className="h-14 w-14 rounded-lg bg-surface-container-low flex items-center justify-center">
                                      <MaterialIcon name="image" size={18} />
                                    </div>
                                  )}
                                  {imgId && (
                                    <button
                                      type="button"
                                      className="absolute -top-1.5 -end-1.5 h-6 w-6 rounded-full bg-error text-on-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                      title={t.reviews.removeImage}
                                      onClick={() =>
                                        setRemoveImageTarget({ review, image })
                                      }
                                    >
                                      <MaterialIcon name="close" size={14} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
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
                      {reviewActions(review)}
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
          )}

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

      <ConfirmDialog
        open={Boolean(removeImageTarget)}
        onClose={() => setRemoveImageTarget(null)}
        onConfirm={() => void confirmRemoveImage()}
        title={t.reviews.removeImageTitle}
        message={t.reviews.removeImageMessage}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={removeImageMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}
