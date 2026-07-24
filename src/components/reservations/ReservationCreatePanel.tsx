import { useRef, useState } from 'react'
import {
  createReservation,
  createIdempotencyKey,
  searchAvailability,
  type ReservationDto,
  type TableAvailabilityDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { branchLocalDateTimeToUtcIso, formatInstantInTimeZone } from '@/lib/branchDateTime'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Num } from '@/components/ui/Num'

function mapCreateError(
  error: unknown,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (!isApiError(error)) return t.reservations.errors.unknown
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return t.reservations.errors.validation
    case 'CONFLICT':
    case 'RESERVATION_CONFLICT':
    case 'TABLE_UNAVAILABLE':
      return t.reservations.errors.conflict
    case 'IDEMPOTENCY_KEY_CONFLICT':
      return t.reservations.errors.idempotencyConflict
    case 'NOT_FOUND':
      return t.reservations.errors.notFound
    case 'FORBIDDEN':
      return t.reservations.errors.forbidden
    case 'RATE_LIMIT_EXCEEDED':
      return t.reservations.errors.rateLimited
    default:
      return t.reservations.errors.unknown
  }
}

/**
 * Staff-facing availability search + Online create against live Phase 7.1 APIs.
 * Creates as the authenticated user (customer Online contract) — not phone/walk-in guest booking.
 */
export function ReservationCreatePanel() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const {
    selectedBranch,
    selectedBranchId,
    status: scopeStatus,
  } = useRestaurantScope()

  const [localStart, setLocalStart] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [notes, setNotes] = useState('')
  const [tables, setTables] = useState<TableAvailabilityDto[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [lastCreated, setLastCreated] = useState<ReservationDto | null>(null)

  /** Stable across retries of the same logical create submission. */
  const idempotencyKeyRef = useRef<string | null>(null)

  const branchTimezone = selectedBranch?.timezone ?? 'UTC'
  const canOperate =
    scopeStatus === 'ready' && Boolean(selectedBranchId) && Boolean(selectedBranch)

  const handleSearch = async (): Promise<void> => {
    if (!selectedBranchId || !localStart) {
      setFormError(t.reservations.create.missingFields)
      return
    }
    setFormError('')
    setSearching(true)
    setSelectedTableId(null)
    setLastCreated(null)
    idempotencyKeyRef.current = null

    try {
      const startIso = branchLocalDateTimeToUtcIso(localStart, branchTimezone)
      const result = await searchAvailability({
        branchId: selectedBranchId,
        reservationStartTime: startIso,
        partySize,
      })
      setTables(result)
      if (result.length === 0) {
        setFormError(t.reservations.create.noTables)
      }
    } catch (err) {
      setTables([])
      setFormError(mapCreateError(err, t))
    } finally {
      setSearching(false)
    }
  }

  const handleCreate = async (): Promise<void> => {
    if (!selectedBranchId || !localStart || !selectedTableId || submitting) return

    setFormError('')
    setSubmitting(true)

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey()
    }
    const idempotencyKey = idempotencyKeyRef.current

    try {
      const startIso = branchLocalDateTimeToUtcIso(localStart, branchTimezone)
      const reservation = await createReservation(
        {
          branchId: selectedBranchId,
          tableId: selectedTableId,
          reservationStartTime: startIso,
          guests: partySize,
          notes: notes.trim() || null,
        },
        idempotencyKey,
      )
      setLastCreated(reservation)
      toast('success', t.reservations.create.successTitle, t.reservations.create.successBody)
      idempotencyKeyRef.current = null
      setSelectedTableId(null)
      setTables([])
    } catch (err) {
      setFormError(mapCreateError(err, t))
      // Keep idempotency key so a retry of the same submit does not mint a new key.
    } finally {
      setSubmitting(false)
    }
  }

  if (!canOperate) {
    return null
  }

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 md:p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <MaterialIcon name="event_available" size={22} className="text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-headline-md text-on-surface">{t.reservations.create.title}</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {t.reservations.create.subtitle}
          </p>
          <p className="text-label-sm text-on-surface-variant mt-2">
            {t.reservations.create.timezoneHint}: {branchTimezone}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md text-on-surface-variant">{t.reservations.date}</span>
          <input
            type="datetime-local"
            value={localStart}
            onChange={(e) => {
              setLocalStart(e.target.value)
              idempotencyKeyRef.current = null
            }}
            className="rounded-lg bg-surface-container-low px-3 py-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md text-on-surface-variant">{t.reservations.guests}</span>
          <input
            type="number"
            min={1}
            max={100}
            value={partySize}
            onChange={(e) => {
              setPartySize(Number(e.target.value) || 1)
              idempotencyKeyRef.current = null
            }}
            className="rounded-lg bg-surface-container-low px-3 py-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 md:col-span-1">
          <span className="text-label-md text-on-surface-variant">{t.reservations.notes}</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              idempotencyKeyRef.current = null
            }}
            className="rounded-lg bg-surface-container-low px-3 py-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t.reservations.create.notesPlaceholder}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button type="button" onClick={() => void handleSearch()} disabled={searching || !localStart}>
          {searching ? t.common.loading : t.reservations.create.searchAvailability}
        </Button>
      </div>

      {formError && (
        <p className="text-body-sm text-error mb-4" role="alert">
          {formError}
        </p>
      )}

      {tables.length > 0 && (
        <div className="mb-4">
          <p className="text-label-md text-on-surface-variant mb-2">
            {t.reservations.create.selectTable}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tables.map((table) => {
              const selected = selectedTableId === table.tableId
              return (
                <button
                  key={table.tableId}
                  type="button"
                  onClick={() => setSelectedTableId(table.tableId)}
                  className={`text-start rounded-lg border px-3 py-3 transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-on-surface">
                      {table.tableNumber}
                    </span>
                    <span
                      className={`text-label-sm ${
                        table.isAvailable ? 'text-success' : 'text-warning'
                      }`}
                    >
                      {table.isAvailable
                        ? t.reservations.create.available
                        : t.reservations.create.unavailableHint}
                    </span>
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    <Num>{table.capacity}</Num> {t.common.seats} · {table.shape}
                  </p>
                </button>
              )
            })}
          </div>
          <p className="text-label-sm text-on-surface-variant mt-2">
            {t.reservations.create.availabilityDisclaimer}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!selectedTableId || submitting}
            >
              {submitting ? t.common.loading : t.reservations.create.submit}
            </Button>
          </div>
        </div>
      )}

      {lastCreated && (
        <div className="mt-4 rounded-lg bg-success/10 border border-success/20 p-4 text-body-md">
          <p className="font-semibold text-on-surface">{t.reservations.create.createdLabel}</p>
          <p className="text-on-surface-variant mt-1">
            {lastCreated.reservationId} · {lastCreated.status} · {lastCreated.source}
          </p>
          <p className="text-on-surface-variant">
            {formatInstantInTimeZone(
              lastCreated.reservationStartTime,
              branchTimezone,
              locale === 'ar' ? 'ar' : 'en',
            )}
            {' · '}
            <Num>{lastCreated.guests}</Num> {t.common.guests}
          </p>
        </div>
      )}
    </section>
  )
}
