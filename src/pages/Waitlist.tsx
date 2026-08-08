import { useCallback, useEffect, useState } from 'react'
import {
  cancelWaitlistEntry,
  joinWaitlist,
  promoteWaitlistEntry,
  type WaitlistEntryDto,
} from '@/api/waitlist'
import { isApiError } from '@/api/errors'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { cn, formatTime, formatTimeEn } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

const SESSION_STORAGE_KEY = 'tavola-waitlist-session'

type SessionWaitlistEntry = WaitlistEntryDto & { entryId: string }

function loadSessionEntries(): SessionWaitlistEntry[] {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SessionWaitlistEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSessionEntries(entries: SessionWaitlistEntry[]): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entries))
}

export function WaitlistPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { selectedBranchId, status: scopeStatus } = useRestaurantScope()

  const [entries, setEntries] = useState<SessionWaitlistEntry[]>(loadSessionEntries)
  const [partySize, setPartySize] = useState('2')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTimeFrom, setPreferredTimeFrom] = useState('')
  const [preferredTimeTo, setPreferredTimeTo] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionEntryId, setActionEntryId] = useState<string | null>(null)
  const [cancelEntryId, setCancelEntryId] = useState<string | null>(null)
  const [promoting, setPromoting] = useState(false)

  const canOperate = scopeStatus === 'ready' && Boolean(selectedBranchId)
  const formatLocalTime = locale === 'ar' ? formatTime : formatTimeEn

  useEffect(() => {
    persistSessionEntries(entries)
  }, [entries])

  const updateEntry = useCallback((entryId: string, patch: Partial<SessionWaitlistEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.entryId === entryId ? { ...entry, ...patch } : entry)),
    )
  }, [])

  const handleJoin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedBranchId || submitting) return

    setSubmitting(true)
    try {
      const created = await joinWaitlist({
        branchId: selectedBranchId,
        partySize: parseInt(partySize, 10) || 1,
        preferredDate,
        preferredTimeFrom,
        ...(preferredTimeTo ? { preferredTimeTo } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      const entryId = created.entryId
      if (!entryId) {
        toast('error', t.waitlist.errors.unknown)
        return
      }
      setEntries((prev) => [{ ...created, entryId }, ...prev])
      toast('success', t.waitlist.joinSuccess)
      setNotes('')
      setPreferredTimeTo('')
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.waitlist.errors.unknown)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromote = async (): Promise<void> => {
    if (!actionEntryId || promoting) return
    setPromoting(true)
    try {
      const updated = await promoteWaitlistEntry(actionEntryId)
      updateEntry(actionEntryId, updated)
      toast('success', t.waitlist.promoteSuccess)
      setActionEntryId(null)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.waitlist.errors.unknown)
    } finally {
      setPromoting(false)
    }
  }

  const handleCancel = async (): Promise<void> => {
    if (!cancelEntryId) return
    try {
      const updated = await cancelWaitlistEntry(cancelEntryId)
      updateEntry(cancelEntryId, { ...updated, status: updated.status ?? 'Cancelled' })
      toast('info', t.waitlist.cancelSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.waitlist.errors.unknown)
    } finally {
      setCancelEntryId(null)
    }
  }

  const activeEntries = entries.filter((e) => e.status !== 'Cancelled' && e.status !== 'Expired')

  return (
    <div>
      <PageHeader
        title={t.waitlist.title}
        subtitle={t.waitlist.subtitle}
        actions={
          <span className="text-sm font-semibold text-on-surface-variant">
            <Num>{activeEntries.length}</Num> {t.common.guests}
          </span>
        }
      />

      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <MaterialIcon name="person_add" size={20} className="text-primary" />
          {t.waitlist.join}
        </CardTitle>
        {!canOperate ? (
          <p className="text-sm text-on-surface-variant">{t.scope.noBranchesBody}</p>
        ) : (
          <form onSubmit={(e) => void handleJoin(e)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t.common.loading : t.waitlist.join}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <EmptyState
        icon="info"
        title={t.waitlist.noServerBoardTitle}
        description={t.waitlist.noServerBoardBody}
        className="mb-6 py-8"
      />

      {activeEntries.length === 0 ? (
        <EmptyState title={t.ops.allClear} description={t.waitlist.sessionEmpty} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeEntries.map((entry, index) => (
            <Card key={entry.entryId} className={index === 0 ? 'ring-2 ring-primary/30' : ''}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm',
                      index === 0 ? 'bg-primary text-white' : 'bg-primary-light text-primary',
                    )}
                  >
                    #<Num>{index + 1}</Num>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">
                      <Num>{entry.partySize ?? '—'}</Num> {t.common.guests}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono truncate max-w-[140px]">
                      {entry.entryId}
                    </p>
                  </div>
                </div>
                {entry.status && (
                  <span className="text-xs font-medium text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-lg capitalize">
                    {entry.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant mb-2">
                {entry.preferredDate}
                {entry.preferredTimeFrom
                  ? ` · ${formatLocalTime(entry.preferredTimeFrom)}`
                  : ''}
                {entry.preferredTimeTo
                  ? ` – ${formatLocalTime(entry.preferredTimeTo)}`
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
                  disabled={entry.status === 'Converted' || entry.status === 'Cancelled'}
                  onClick={() => setActionEntryId(entry.entryId)}
                >
                  <MaterialIcon name="how_to_reg" size={14} /> {t.waitlist.promote}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={entry.status === 'Cancelled'}
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
        busy={promoting}
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
        closeOnConfirm={false}
      />
    </div>
  )
}
