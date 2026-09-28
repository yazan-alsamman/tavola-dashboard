import { useRef, useState } from 'react'
import { isApiError } from '@/api/errors'
import {
  reviewImageId,
  reviewImageUrl,
  type ReviewDto,
  type ReviewImageDto,
} from '@/api/reviews'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useRestaurantReviewsQuery } from '@/hooks/useReviewQueries'
import {
  useRemoveReviewImageMutation,
  useUploadReviewImageMutation,
} from '@/hooks/useReviewMutations'

const PAGE_SIZE = 20
const MAX_REVIEW_IMAGES = 5
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function reviewKey(review: ReviewDto): string {
  return review.reviewId ?? review.id ?? ''
}

function reviewImages(review: ReviewDto): ReviewImageDto[] {
  return Array.isArray(review.images) ? review.images : []
}

function reviewerLabel(review: ReviewDto, guestLabel: string): string {
  const name = review.reviewerUsername
  return typeof name === 'string' && name.trim() ? name.trim() : guestLabel
}

export function ReviewImagesSection() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { selectedRestaurantId } = useRestaurantScope()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{
    reviewId: string
    image: ReviewImageDto
  } | null>(null)

  const listQuery = useRestaurantReviewsQuery(
    selectedRestaurantId ?? undefined,
    page,
    PAGE_SIZE,
    Boolean(selectedRestaurantId),
  )
  const uploadMutation = useUploadReviewImageMutation()
  const removeMutation = useRemoveReviewImageMutation()

  const copy = t.gallery.reviewImages
  const reviews = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const mapError = (err: unknown): string =>
    isApiError(err) ? err.message : t.reviews.errors.unknown

  const startUpload = (reviewId: string) => {
    setUploadTargetId(reviewId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const reviewId = uploadTargetId
    setUploadTargetId(null)
    if (!file || !reviewId || !selectedRestaurantId) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast('error', copy.unsupportedType)
      return
    }
    if (file.size > MAX_BYTES) {
      toast('error', copy.fileTooLarge)
      return
    }
    try {
      await uploadMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId,
        file,
      })
      toast('success', t.reviews.imageUploadSuccess)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  const confirmRemove = async (): Promise<void> => {
    if (!removeTarget || !selectedRestaurantId) return
    const imageId = reviewImageId(removeTarget.image)
    if (!imageId) return
    try {
      await removeMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        reviewId: removeTarget.reviewId,
        reviewImageId: imageId,
      })
      toast('success', t.reviews.imageRemoveSuccess)
      setRemoveTarget(null)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  return (
    <section className="mt-10 space-y-4">
      <div>
        <h2 className="text-headline-sm text-on-surface">{copy.title}</h2>
        <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
          {copy.hint}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />

      {listQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-10 text-center">
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
          title={copy.emptyTitle}
          description={copy.emptyBody}
        />
      )}

      {listQuery.isSuccess && reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const id = reviewKey(review)
            const images = reviewImages(review)
            const atLimit = images.length >= MAX_REVIEW_IMAGES
            const uploading =
              uploadMutation.isPending && uploadMutation.variables?.reviewId === id
            return (
              <li
                key={id}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-label-md font-semibold text-on-surface">
                      {reviewerLabel(review, copy.guest)}
                      <span className="ms-2 text-on-surface-variant font-normal">
                        <Num>{review.rating ?? 0}</Num>/5
                      </span>
                    </p>
                    <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                      {review.comment?.trim() ? review.comment : t.reviews.noComment}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!id || atLimit || uploading}
                    onClick={() => startUpload(id)}
                  >
                    <MaterialIcon name="add_a_photo" size={16} className="me-2" />
                    {uploading ? t.common.loading : copy.add}
                  </Button>
                </div>
                {atLimit && (
                  <p className="text-label-sm text-on-surface-variant mt-2">
                    {copy.limitReached}
                  </p>
                )}
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((image) => {
                      const imgId = reviewImageId(image)
                      const url = reviewImageUrl(image)
                      return (
                        <div key={imgId || url} className="relative group">
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              className="h-20 w-20 rounded-lg object-cover border border-outline-variant/30"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                              <MaterialIcon name="image" size={20} />
                            </div>
                          )}
                          {imgId && (
                            <button
                              type="button"
                              className="absolute -top-1.5 -end-1.5 h-6 w-6 rounded-full bg-error text-on-error flex items-center justify-center shadow"
                              title={t.reviews.removeImage}
                              onClick={() =>
                                setRemoveTarget({ reviewId: id, image })
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
              </li>
            )
          })}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-label-sm text-on-surface-variant">
            {t.reviews.page} <Num>{page}</Num> {t.reviews.of} <Num>{totalPages}</Num>
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t.reviews.previous}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || listQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              {t.reviews.next}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => {
          if (!removeMutation.isPending) setRemoveTarget(null)
        }}
        onConfirm={() => void confirmRemove()}
        title={t.reviews.removeImageTitle}
        message={t.reviews.removeImageMessage}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={removeMutation.isPending}
        closeOnConfirm={false}
      />
    </section>
  )
}
