import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { useUpdateReservationInternalNote } from '@/hooks/useReservationMutations'

const MAX_LENGTH = 1000

/** Staff-only note on a reservation (special request, allergy). */
export function InternalNoteEditor({
  reservationId,
  initialNote,
}: {
  reservationId: string
  initialNote: string | null
}) {
  const { t } = useLocale()
  const { toast } = useToast()
  const [draft, setDraft] = useState(initialNote ?? '')
  const mutation = useUpdateReservationInternalNote()
  const dirty = draft.trim() !== (initialNote ?? '').trim()

  const save = (): void => {
    mutation.mutate(
      { reservationId, internalNote: draft.trim() || null },
      {
        onSuccess: () => toast('success', t.reservations.internalNote.saved),
        onError: () => toast('error', t.reservations.internalNote.failed),
      },
    )
  }

  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
      <h3 className="flex items-center gap-2 text-label-lg font-semibold text-on-surface">
        <MaterialIcon name="edit" size={18} className="text-primary" />
        {t.reservations.internalNote.title}
      </h3>
      <p className="mt-1 text-label-sm text-on-surface-variant">{t.reservations.internalNote.hint}</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder={t.reservations.internalNote.placeholder}
        aria-label={t.reservations.internalNote.title}
        className="mt-3 w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="mt-2 flex justify-end">
        <Button type="button" onClick={save} disabled={!dirty || mutation.isPending}>
          {mutation.isPending ? t.common.loading : t.reservations.internalNote.save}
        </Button>
      </div>
    </section>
  )
}
