import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'
import {
  addRestaurantGalleryImage,
  listRestaurantGallery,
  removeRestaurantGalleryImage,
  reorderRestaurantGallery,
  type GalleryItemDto,
} from '@/api/restaurants'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { PageHeader } from '@/components/ui/PageHeader'
import { RestaurantCoverSection } from '@/components/gallery/RestaurantCoverSection'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { moveTo } from '@/lib/reorder'
import { cn } from '@/lib/utils'

function galleryKeys(restaurantId: string) {
  return ['restaurants', restaurantId, 'gallery'] as const
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_GALLERY_BYTES = 5 * 1024 * 1024

export function GalleryPage() {
  const { t, isRTL } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { selectedRestaurantId, selectedRestaurant, status: scopeStatus } =
    useRestaurantScope()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removeTarget, setRemoveTarget] = useState<GalleryItemDto | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  /** The order shown while a reorder is being saved; null = the server's order. */
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const enabled = scopeStatus === 'ready' && Boolean(selectedRestaurantId)

  const galleryQuery = useQuery({
    queryKey: galleryKeys(selectedRestaurantId ?? ''),
    queryFn: () => listRestaurantGallery(selectedRestaurantId!),
    enabled,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      addRestaurantGalleryImage(selectedRestaurantId!, file),
    onSuccess: async () => {
      setUploadError(null)
      await queryClient.invalidateQueries({
        queryKey: galleryKeys(selectedRestaurantId!),
      })
      toast('success', t.gallery.uploadSuccess)
    },
    onError: (err) => {
      const message = isApiError(err) ? err.message : t.gallery.errors.unknown
      setUploadError(message)
      toast('error', message)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (galleryItemId: string) =>
      removeRestaurantGalleryImage(selectedRestaurantId!, galleryItemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: galleryKeys(selectedRestaurantId!),
      })
      toast('success', t.gallery.removeSuccess)
      setRemoveTarget(null)
    },
    onError: (err) => {
      toast('error', isApiError(err) ? err.message : t.gallery.errors.unknown)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (galleryItemIds: string[]) =>
      reorderRestaurantGallery(selectedRestaurantId!, galleryItemIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: galleryKeys(selectedRestaurantId!),
      })
      toast('success', t.gallery.reorderSuccess)
    },
    onError: (err) => {
      toast('error', isApiError(err) ? err.message : t.gallery.errors.unknown)
    },
    onSettled: () => setPendingOrder(null),
  })

  const reorder = (from: number, to: number): void => {
    const ids = moveTo(
      orderedItems.map((item) => item.galleryItemId),
      from,
      to,
    )
    if (from === to || reorderMutation.isPending) return
    setPendingOrder(ids)
    reorderMutation.mutate(ids)
  }

  const acceptFile = (file: File | undefined): void => {
    if (!file || !selectedRestaurantId) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      setUploadError(t.gallery.unsupportedType)
      return
    }
    if (file.size > MAX_GALLERY_BYTES) {
      setUploadError(t.gallery.fileTooLarge)
      return
    }
    setUploadError(null)
    uploadMutation.mutate(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    acceptFile(file)
  }

  if (!enabled) {
    return (
      <div>
        <PageHeader title={t.gallery.title} subtitle={t.gallery.subtitle} />
        <EmptyState
          icon="photo_library"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      </div>
    )
  }

  const items = galleryQuery.data ?? []
  const orderedItems = pendingOrder
    ? pendingOrder
        .map((id) => items.find((item) => item.galleryItemId === id))
        .filter((item): item is GalleryItemDto => item !== undefined)
    : items

  return (
    <div>
      <PageHeader
        title={t.gallery.title}
        subtitle={
          selectedRestaurant
            ? `${t.gallery.subtitle} — ${selectedRestaurant.name}`
            : t.gallery.subtitle
        }
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <MaterialIcon name="add_a_photo" size={18} className="me-2" />
              {uploadMutation.isPending
                ? t.common.loading
                : t.gallery.upload}
            </Button>
          </>
        }
      />

      <RestaurantCoverSection restaurantId={selectedRestaurantId!} />

      <p className="text-body-sm text-on-surface-variant mb-2 max-w-2xl">
        {t.gallery.hint}
      </p>
      <details className="mb-4 max-w-2xl rounded-lg bg-surface-container-low px-4 py-2 text-body-sm text-on-surface-variant">
        <summary className="cursor-pointer font-medium text-on-surface">
          {t.gallery.tipsTitle}
        </summary>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          {t.gallery.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </details>

      <div
        className={cn(
          'mb-6 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/50 bg-surface-container-low',
          uploadMutation.isPending && 'opacity-80',
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          acceptFile(event.dataTransfer.files?.[0])
        }}
      >
        <MaterialIcon name="add_a_photo" size={28} className="mx-auto text-on-surface-variant" />
        <p className="mt-2 text-body-md text-on-surface">{t.gallery.dropTitle}</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">{t.gallery.dropHint}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {t.gallery.upload}
        </Button>
        {uploadMutation.isPending && (
          <div className="mx-auto mt-4 max-w-xs" role="status" aria-live="polite">
            <p className="text-label-sm text-on-surface-variant">{t.gallery.uploading}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            </div>
          </div>
        )}
        {uploadError && (
          <p className="mt-3 text-label-sm text-error" role="alert">
            {uploadError}
          </p>
        )}
      </div>

      {galleryQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-16 text-center">
          {t.common.loading}
        </p>
      )}

      {galleryQuery.isError && (
        <EmptyState
          icon="error"
          title={t.gallery.errorTitle}
          description={t.gallery.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void galleryQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {galleryQuery.isSuccess && items.length === 0 && (
        <EmptyState
          icon="photo_library"
          title={t.gallery.emptyTitle}
          description={t.gallery.emptyBody}
          action={
            <Button
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <MaterialIcon name="add_a_photo" size={18} className="me-2" />
              {t.gallery.upload}
            </Button>
          }
        />
      )}

      {galleryQuery.isSuccess && items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-label-sm text-on-surface-variant">
              <Num>{items.length}</Num> {t.gallery.photoCount}
            </p>
            {items.length > 1 && (
              <p className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                <MaterialIcon name="drag_indicator" size={16} />
                {t.gallery.reorderHint}
              </p>
            )}
          </div>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orderedItems.map((item, index) => (
              <li
                key={item.galleryItemId}
                draggable={!reorderMutation.isPending}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDraggingId(item.galleryItemId)
                }}
                onDragOver={(event) => {
                  if (draggingId) event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const from = orderedItems.findIndex((i) => i.galleryItemId === draggingId)
                  setDraggingId(null)
                  if (from >= 0) reorder(from, index)
                }}
                onDragEnd={() => setDraggingId(null)}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl cursor-grab',
                  'border border-outline-variant/30 bg-surface-container-low',
                  'shadow-sm transition-shadow hover:shadow-md',
                  draggingId === item.galleryItemId && 'opacity-50',
                  reorderMutation.isPending && 'cursor-progress',
                )}
              >
                <span className="absolute top-2 start-2 rounded-md bg-surface-container-lowest/90 px-2 py-0.5 text-label-sm font-semibold text-on-surface shadow-sm">
                  <Num>{index + 1}</Num>
                </span>
                {item.imageUrl ? (
                  <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block h-full w-full">
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </a>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-on-surface-variant">
                    <MaterialIcon name="image" size={32} />
                  </div>
                )}
                <button
                  type="button"
                  className="absolute top-2 end-2 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-error shadow-sm"
                  aria-label={t.common.delete}
                  disabled={removeMutation.isPending}
                  onClick={() => setRemoveTarget(item)}
                >
                  <MaterialIcon name="delete" size={18} />
                </button>
                {orderedItems.length > 1 && (
                  <div className="absolute bottom-2 inset-x-2 flex justify-between">
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-on-surface shadow-sm disabled:opacity-40"
                      aria-label={t.gallery.moveEarlier}
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => reorder(index, index - 1)}
                    >
                      <MaterialIcon name={isRTL ? 'chevron_right' : 'chevron_left'} size={18} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-on-surface shadow-sm disabled:opacity-40"
                      aria-label={t.gallery.moveLater}
                      disabled={index === orderedItems.length - 1 || reorderMutation.isPending}
                      onClick={() => reorder(index, index + 1)}
                    >
                      <MaterialIcon name={isRTL ? 'chevron_left' : 'chevron_right'} size={18} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}


      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.galleryItemId)
        }}
        title={t.gallery.removeTitle}
        message={t.gallery.removeMessage}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={removeMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}
