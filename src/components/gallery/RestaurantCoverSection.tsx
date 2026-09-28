import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'
import {
  getPublicRestaurantCover,
  uploadRestaurantCover,
} from '@/api/restaurants'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'

function coverKey(restaurantId: string) {
  return ['restaurants', restaurantId, 'cover'] as const
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function RestaurantCoverSection({ restaurantId }: { restaurantId: string }) {
  const { t } = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const copy = t.gallery.cover
  const role = user?.organization?.role
  const canUpload = role === 'Owner' || role === 'Admin'

  const coverQuery = useQuery({
    queryKey: coverKey(restaurantId),
    queryFn: ({ signal }) => getPublicRestaurantCover(restaurantId, signal),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadRestaurantCover(restaurantId, file),
    onSuccess: (cover) => {
      queryClient.setQueryData(coverKey(restaurantId), cover)
      toast('success', copy.success)
    },
    onError: (err) => {
      toast('error', isApiError(err) ? err.message : t.gallery.errors.unknown)
    },
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canUpload) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast('error', copy.unsupportedType)
      return
    }
    uploadMutation.mutate(file)
  }

  const coverUrl = coverQuery.data?.coverImageUrl ?? null

  return (
    <section className="mb-8 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-headline-sm text-on-surface">{copy.title}</h2>
          <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
            {copy.hint}
          </p>
        </div>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <MaterialIcon name="add_a_photo" size={18} className="me-2" />
              {uploadMutation.isPending
                ? t.common.loading
                : coverUrl
                  ? copy.replace
                  : copy.upload}
            </Button>
          </>
        )}
      </div>

      {coverQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-8 text-center">
          {t.common.loading}
        </p>
      )}

      {coverQuery.isError && (
        <p className="text-label-sm text-error" role="alert">
          {copy.loadError}{' '}
          <button
            type="button"
            className="font-semibold text-primary"
            onClick={() => void coverQuery.refetch()}
          >
            {t.scope.retry}
          </button>
        </p>
      )}

      {coverQuery.isSuccess && coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className="max-h-72 w-full rounded-xl border border-outline-variant/30 object-cover"
        />
      )}

      {coverQuery.isSuccess && !coverUrl && (
        <p className="text-body-sm text-on-surface-variant">{copy.empty}</p>
      )}

      {!canUpload && (
        <p className="text-label-sm text-on-surface-variant">{copy.readOnly}</p>
      )}
    </section>
  )
}
