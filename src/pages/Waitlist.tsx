import { useState } from 'react'
import { isApiError } from '@/api/errors'
import type { BranchWaitlistItemDto } from '@/api/waitlist'
import { Drawer } from '@/components/ui/Drawer'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useBranchWaitlistQuery,
  useCancelWaitlistEntryMutation,
  useJoinWaitlistMutation,
  usePromoteWaitlistEntryMutation,
} from '@/hooks/useWaitlistQueries'
import { formatDate, formatRelative, formatTime } from '@/lib/format'
import { cn, getTodayISO } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

/** Still in the queue: everything else (seated, cancelled, expired) has left it. */
const ACTIVE_STATUSES = new Set(['Waiting', 'Notified'])

function clockLabel(value: string, locale: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return formatTime(value, locale)
  return formatTime(new Date(2000, 0, 1, Number(match[1]), Number(match[2])), locale)
}

export function WaitlistPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { selectedRestaurantId, selectedBranchId, status: scopeStatus } = useRestaurantScope()

  const [day, setDay] = useState(getTodayISO)
  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('SY')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [partySize, setPartySize] = useState('2')
  const [preferredDate, setPreferredDate] = useState(getTodayISO)
  const [preferredTimeFrom, setPreferredTimeFrom] = useState('')
  const [preferredTimeTo, setPreferredTimeTo] = useState('')
  const [notes, setNotes] = useState('')
  const [actionEntryId, setActionEntryId] = useState<string | null>(null)
  const [cancelEntryId, setCancelEntryId] = useState<string | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)

  const canOperate = scopeStatus === 'ready' && Boolean(selectedRestaurantId && selectedBranchId)

  const waitlistQuery = useBranchWaitlistQuery(
    canOperate ? selectedRestaurantId : null,
    canOperate ? selectedBranchId : null,
    day,
  )
  const joinMutation = useJoinWaitlistMutation()
  const promoteMutation = usePromoteWaitlistEntryMutation()
  const cancelMutation = useCancelWaitlistEntryMutation()

  const errorMessage = (err: unknown): string =>
    isApiError(err) ? err.message : t.waitlist.errors.unknown

  const handleJoin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedBranchId || joinMutation.isPending) return
    try {
      await joinMutation.mutateAsync({
        branchId: selectedBranchId,
        partySize: parseInt(partySize, 10) || 1,
        preferredDate,
        preferredTimeFrom,
        ...(preferredTimeTo ? { preferredTimeTo } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        reservationGuest: {
          fullName: fullName.trim(),
          countryCode: countryCode.trim(),
          phoneNumber: phoneNumber.trim(),
        },
      })
      toast('success', t.waitlist.joinSuccess)
      setFullName('')
      setPhoneNumber('')
      setNotes('')
      setPreferredTimeTo('')
      setDay(preferredDate)
      setJoinOpen(false)
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  const handlePromote = async (): Promise<void> => {
    if (!actionEntryId || promoteMutation.isPending) return
    try {
      await promoteMutation.mutateAsync(actionEntryId)
      toast('success', t.waitlist.promoteSuccess)
      setActionEntryId(null)
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  const handleCancel = async (): Promise<void> => {
    if (!cancelEntryId || cancelMutation.isPending) return
    try {
      await cancelMutation.mutateAsync(cancelEntryId)
      toast('info', t.waitlist.cancelSuccess)
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setCancelEntryId(null)
    }
  }

  const activeEntries: BranchWaitlistItemDto[] = (waitlistQuery.data ?? []).filter((entry) =>
    ACTIVE_STATUSES.has(entry.status ?? ''),
  )

  return (
    <div>
      <PageHeader
        title={t.waitlist.title}
        subtitle={t.waitlist.subtitle}
        actions={
          <Button type="button" onClick={() => setJoinOpen(true)} disabled={!canOperate}>
            <MaterialIcon name="person_add" size={18} />
            {t.waitlist.join}
          </Button>
        }
      />

      <Drawer
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title={t.waitlist.join}
        closeLabel={t.common.close}
      >
        {!canOperate ? (
          <p className="text-body-sm text-on-surface-variant">{t.scope.noBranchesBody}</p>
        ) : (
          <form onSubmit={(e) => void handleJoin(e)} className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.guestName}</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
              <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.partySize}</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.preferredDate}</span>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.preferredTimeFrom}</span>
              <Input
                type="time"
                value={preferredTimeFrom}
                onChange={(e) => setPreferredTimeFrom(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.preferredTimeTo}</span>
              <Input
                type="time"
                value={preferredTimeTo}
                onChange={(e) => setPreferredTimeTo(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-sm font-medium text-on-surface-variant">{t.reservations.notes}</span>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <Button type="submit" disabled={joinMutation.isPending} className="h-11">
              {joinMutation.isPending ? t.common.loading : t.waitlist.join}
            </Button>
          </form>
        )}
      </Drawer>

      <div className="mb-6 flex items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t.waitlist.day}</span>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
      </div>

      {!canOperate ? (
        <EmptyState icon="store" title={t.scope.noBranchesTitle} description={t.scope.noBranchesBody} />
      ) : waitlistQuery.isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : waitlistQuery.isError ? (
        <EmptyState
          icon="error"
          title={t.waitlist.errors.loadFailed}
          description={errorMessage(waitlistQuery.error)}
          action={
            <Button type="button" onClick={() => void waitlistQuery.refetch()}>
              {t.common.retry}
            </Button>
          }
        />
      ) : activeEntries.length === 0 ? (
        <EmptyState title={t.ops.allClear} description={t.waitlist.empty} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeEntries.map((entry, index) => (
            <Card key={entry.entryId} className={index === 0 ? 'ring-2 ring-primary/30' : ''}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm',
                      index === 0 ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary',
                    )}
                  >
                    #<Num>{index + 1}</Num>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">
                      {entry.customer.name ?? '—'}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      <Num>{entry.partySize ?? '—'}</Num> {t.common.guests}
                      {entry.customer.phone ? (
                        <>
                          {' · '}
                          <span dir="ltr">{entry.customer.phone}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {entry.customer.type === 'User' ? t.waitlist.fromApp : t.waitlist.addedByStaff}
                    </p>
                    {entry.createdAt && (
                      <p className="text-label-md text-primary">
                        {t.waitlist.waiting} {formatRelative(entry.createdAt, locale)}
                      </p>
                    )}
                  </div>
                </div>
                {entry.status && (
                  <span className="text-label-sm font-medium text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-lg">
                    {t.waitlist.statuses[entry.status as keyof typeof t.waitlist.statuses] ??
                      entry.status}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant mb-2">
                {entry.preferredDate ? formatDate(entry.preferredDate, locale) : ''}
                {entry.preferredTimeFrom
                  ? ` · ${clockLabel(entry.preferredTimeFrom, locale)}`
                  : ''}
                {entry.preferredTimeTo
                  ? ` – ${clockLabel(entry.preferredTimeTo, locale)}`
                  : ''}
              </p>
              {entry.notes && (
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{entry.notes}</p>
              )}
              {entry.convertedReservationId && (
                <p className="text-xs text-success mb-4">
                  {t.waitlist.converted}: {entry.convertedReservationId}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setActionEntryId(entry.entryId)}
                >
                  <MaterialIcon name="how_to_reg" size={14} /> {t.waitlist.promote}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  label={t.waitlist.cancel}
                  onClick={() => setCancelEntryId(entry.entryId)}
                >
                  <MaterialIcon name="cancel" size={16} className="text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!actionEntryId}
        onClose={() => setActionEntryId(null)}
        onConfirm={() => void handlePromote()}
        title={t.waitlist.promote}
        message={t.waitlist.promoteConfirm}
        confirmLabel={t.waitlist.promote}
        variant="primary"
        busy={promoteMutation.isPending}
        closeOnConfirm={false}
      />

      <ConfirmDialog
        open={!!cancelEntryId}
        onClose={() => setCancelEntryId(null)}
        onConfirm={() => void handleCancel()}
        title={t.waitlist.cancel}
        message={t.common.confirm}
        confirmLabel={t.waitlist.cancel}
        variant="danger"
        busy={cancelMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}
