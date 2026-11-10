import { useEffect, useRef } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useNow } from '@/hooks/useNow'
import { usePendingReservationsWatchQuery } from '@/hooks/useReservationQueries'
import { playChime } from '@/lib/chime'
import { formatTime } from '@/lib/format'
import { approvalMinutesLeft } from '@/lib/reservationInsights'
import { getTodayISO } from '@/lib/utils'

/** Warn once when a pending booking has this many minutes (or fewer) left to be answered. */
export const APPROVAL_WARNING_MINUTES = 10

/**
 * Chimes and shows an alert when a new booking arrives for the selected
 * branch, and once more shortly before a pending booking's approval window
 * runs out. The first load only records what is already pending, so opening
 * the dashboard never replays old bookings.
 */
export function usePendingReservationAlerts(): void {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { selectedBranchId } = useRestaurantScope()
  const now = useNow(30_000)
  const query = usePendingReservationsWatchQuery(getTodayISO())

  const branchRef = useRef<string | null>(null)
  const seenRef = useRef<Set<string> | null>(null)
  const warnedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (branchRef.current !== selectedBranchId) {
      branchRef.current = selectedBranchId
      seenRef.current = null
      warnedRef.current = new Set()
    }
  }, [selectedBranchId])

  useEffect(() => {
    const items = query.data
    if (!items) return
    if (seenRef.current === null) {
      seenRef.current = new Set(items.map((item) => item.reservationId))
      return
    }
    const fresh = items.filter((item) => !seenRef.current!.has(item.reservationId))
    if (fresh.length === 0) return
    fresh.forEach((item) => seenRef.current!.add(item.reservationId))
    playChime()
    for (const item of fresh) {
      toast(
        'info',
        t.reservations.alerts.newTitle,
        t.reservations.alerts.newBody
          .replace('{name}', item.customerName ?? t.reservations.board.guest)
          .replace('{guests}', String(item.guests))
          .replace('{time}', formatTime(item.reservationStartTime, locale)),
      )
    }
  }, [locale, query.data, t, toast])

  useEffect(() => {
    const items = query.data ?? []
    const due = items.filter((item) => {
      const left = approvalMinutesLeft(item, now)
      return (
        left !== null &&
        left > 0 &&
        left <= APPROVAL_WARNING_MINUTES &&
        !warnedRef.current.has(item.reservationId)
      )
    })
    if (due.length === 0) return
    playChime()
    for (const item of due) {
      warnedRef.current.add(item.reservationId)
      toast(
        'warning',
        t.reservations.alerts.deadlineTitle,
        t.reservations.alerts.deadlineBody
          .replace('{name}', item.customerName ?? t.reservations.board.guest)
          .replace('{n}', String(approvalMinutesLeft(item, now))),
      )
    }
  }, [now, query.data, t, toast])
}
