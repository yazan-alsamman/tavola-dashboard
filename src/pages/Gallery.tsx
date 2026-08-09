import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'
import {
  addRestaurantGalleryImage,
  listRestaurantGallery,
  removeRestaurantGalleryImage,
  type GalleryItemDto,
} from '@/api/restaurants'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { PageHeader } from '@/components/ui/PageHeader'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

function galleryKeys(restaurantId: string) {
  return ['restaurants', restaurantId, 'gallery'] as const
}

export function GalleryPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { selectedRestaurantId, selectedRestaurant, status: scopeStatus } =
    useRestaurantScope()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removeTarget, setRemoveTarget] = useState<GalleryItemDto | null>(null)

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
      await queryClient.invalidateQueries({
        queryKey: galleryKeys(selectedRestaurantId!),
      })
      toast('success', t.gallery.uploadSuccess)
    },
    onError: (err) => {
      toast('error', isApiError(err) ? err.message : t.gallery.errors.unknown)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedRestaurantId) return
    uploadMutation.mutate(file)
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

      <p className="text-body-sm text-on-surface-variant mb-6 max-w-2xl">
        {t.gallery.hint}
      </p>

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
          <div className="flex items-center justify-between mb-4">
            <p className="text-label-sm text-on-surface-variant">
              <Num>{items.length}</Num> {t.gallery.photoCount}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.galleryItemId}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl',
                  'border border-outline-variant/30 bg-surface-container-low',
                  'shadow-sm transition-shadow hover:shadow-md',
                )}
              >
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </a>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-on-surface-variant">
                    <MaterialIcon name="image" size={32} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full"
                    disabled={removeMutation.isPending}
                    onClick={() => setRemoveTarget(item)}
                  >
                    <MaterialIcon name="delete" size={16} className="me-1" />
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'aspect-square rounded-xl border-2 border-dashed border-outline-variant/50',
                'flex flex-col items-center justify-center gap-2',
                'text-on-surface-variant hover:border-primary/50 hover:text-primary',
                'hover:bg-primary/5 transition-colors',
                uploadMutation.isPending && 'opacity-60 pointer-events-none',
              )}
            >
              <MaterialIcon name="add_a_photo" size={28} />
              <span className="text-label-sm font-medium px-3 text-center">
                {t.gallery.upload}
              </span>
            </button>
          </div>
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
