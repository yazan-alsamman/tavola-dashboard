import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createStaffReservationWithIdempotency,
  searchAvailability,
  type ReservationDto,
  type TableAvailabilityDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { branchLocalDateTimeToUtcIso, formatInstantInTimeZone } from '@/lib/branchDateTime'
import { cn } from '@/lib/utils'

function mapWalkInError(
  error: unknown,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (!isApiError(error)) return t.walkIn.errors.unknown
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return t.walkIn.errors.validation
    case 'CONFLICT':
    case 'RESERVATION_CONFLICT':
    case 'TABLE_UNAVAILABLE':
      return t.walkIn.errors.conflict
    case 'FORBIDDEN':
      return t.walkIn.errors.forbidden
    default:
      return t.walkIn.errors.unknown
  }
}

export function WalkInPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    selectedRestaurantId,
    selectedBranch,
    selectedBranchId,
    status: scopeStatus,
  } = useRestaurantScope()

  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('SY')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [localStart, setLocalStart] = useState('')
  const [notes, setNotes] = useState('')
  const [tables, setTables] = useState<TableAvailabilityDto[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [lastCreated, setLastCreated] = useState<ReservationDto | null>(null)

  const idempotencyKeyRef = useRef<string | null>(null)

  const branchTimezone = selectedBranch?.timezone ?? 'UTC'
  const canOperate =
    scopeStatus === 'ready' &&
    Boolean(selectedRestaurantId) &&
    Boolean(selectedBranchId) &&
    Boolean(selectedBranch)

  const handleSearch = async (): Promise<void> => {
    if (!selectedRestaurantId || !selectedBranchId || !localStart) {
      setFormError(t.walkIn.errors.missingFields)
      return
    }
    setFormError('')
    setSearching(true)
    setSelectedTableId(null)
    setLastCreated(null)
    idempotencyKeyRef.current = null

    try {
      const date = localStart.slice(0, 10)
      const result = await searchAvailability({
        restaurantId: selectedRestaurantId,
        branchId: selectedBranchId,
        date,
        partySize,
      })
      setTables(result)
      if (result.length === 0) {
        setFormError(t.walkIn.errors.noTables)
      }
    } catch (err) {
      setTables([])
      setFormError(mapWalkInError(err, t))
    } finally {
      setSearching(false)
    }
  }

  const handleSeat = async (): Promise<void> => {
    if (!selectedBranchId || !localStart || !selectedTableId || !fullName.trim() || !phoneNumber.trim()) {
      setFormError(t.walkIn.errors.missingFields)
      return
    }
    if (submitting) return

    setFormError('')
    setSubmitting(true)

    try {
      const startIso = branchLocalDateTimeToUtcIso(localStart, branchTimezone)
      const { reservation } = await createStaffReservationWithIdempotency({
        branchId: selectedBranchId,
        tableId: selectedTableId,
        reservationStartTime: startIso,
        guests: partySize,
        source: 'WalkIn',
        reservationGuest: {
          fullName: fullName.trim(),
          countryCode: countryCode.trim(),
          phoneNumber: phoneNumber.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
        notes: notes.trim() || null,
      })
      setLastCreated(reservation)
      toast('success', t.walkIn.successTitle, t.walkIn.successBody)
      idempotencyKeyRef.current = null
      navigate(`/app/reservations/${reservation.reservationId}`)
    } catch (err) {
      setFormError(mapWalkInError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  if (!canOperate) {
    return (
      <div>
        <PageHeader title={t.walkIn.title} subtitle={t.walkIn.subtitle} />
        <EmptyState icon="store" title={t.scope.noBranchesTitle} description={t.scope.noBranchesBody} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t.walkIn.title} subtitle={t.walkIn.subtitle} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-2">
          <CardTitle className="mb-6 flex items-center gap-2">
            <MaterialIcon name="person_add" size={20} className="text-primary" />
            {t.walkIn.register}
          </CardTitle>
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.customers.name}</span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.customers.name}
                required
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-on-surface-variant">{t.walkIn.countryCode}</span>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="SY"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 col-span-2">
                <span className="text-sm font-medium text-on-surface-variant">{t.reservations.phone}</span>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="900000001"
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.customers.email}</span>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t.walkIn.emailOptional}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.reservations.guests}</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value) || 1)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.reservations.date}</span>
              <input
                type="datetime-local"
                value={localStart}
                onChange={(e) => {
                  setLocalStart(e.target.value)
                  idempotencyKeyRef.current = null
                }}
                className="rounded-lg bg-surface-container-low px-3 py-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary/20 w-full"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.reservations.notes}</span>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <p className="text-label-sm text-on-surface-variant">
              {t.reservations.create.timezoneHint}: {branchTimezone}
            </p>
            <Button type="button" onClick={() => void handleSearch()} disabled={searching || !localStart}>
              {searching ? t.common.loading : t.reservations.create.searchAvailability}
            </Button>
            {formError && (
              <p className="text-body-sm text-error" role="alert">
                {formError}
              </p>
            )}
            {lastCreated && (
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-body-md">
                <p className="font-semibold text-on-surface">{t.walkIn.createdLabel}</p>
                <p className="text-on-surface-variant mt-1">
                  {lastCreated.reservationId} · {lastCreated.status}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardTitle className="mb-4">{t.reservations.create.selectTable}</CardTitle>
          {tables.length === 0 ? (
            <EmptyState
              icon="restaurant"
              title={t.walkIn.searchFirstTitle}
              description={t.walkIn.searchFirstBody}
              className="py-10"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {tables.map((table) => (
                  <button
                    key={table.tableId}
                    type="button"
                    onClick={() => setSelectedTableId(table.tableId)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-start transition-all duration-200',
                      selectedTableId === table.tableId
                        ? 'border-primary bg-primary-light shadow-card scale-[1.02]'
                        : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40',
                    )}
                  >
                    <p className="font-semibold text-on-surface">{table.tableNumber}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      <Num>{table.capacity}</Num> {t.common.seats} · {table.shape}
                    </p>
                    <p
                      className={cn(
                        'text-label-sm mt-1',
                        table.isAvailable ? 'text-success' : 'text-warning',
                      )}
                    >
                      {table.isAvailable
                        ? t.reservations.create.available
                        : t.reservations.create.unavailableHint}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-label-sm text-on-surface-variant mb-4">
                {t.reservations.create.availabilityDisclaimer}
              </p>
              <Button
                type="button"
                onClick={() => void handleSeat()}
                disabled={!selectedTableId || submitting || !fullName.trim() || !phoneNumber.trim()}
              >
                <MaterialIcon name="group" size={16} />{' '}
                {submitting ? t.common.loading : t.ops.seatGuest}
              </Button>
              {lastCreated && (
                <p className="text-sm text-on-surface-variant mt-4">
                  {formatInstantInTimeZone(
                    lastCreated.reservationStartTime,
                    branchTimezone,
                    locale === 'ar' ? 'ar' : 'en',
                  )}
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
