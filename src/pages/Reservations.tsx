import { PageHeader } from '@/components/ui/PageHeader'
import { MaterialIcon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReservationCreatePanel } from '@/components/reservations/ReservationCreatePanel'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'

/**
 * Staff reservations hub.
 *
 * Backend Phase 7.1 only exposes availability search + Online create.
 * Staff list / detail / approve / reject / cancel / complete are not live.
 * Mock reservation lists and fake lifecycle mutations are intentionally removed.
 */
export function ReservationsPage() {
  const { t } = useLocale()
  const {
    selectedBranch,
    selectedBranchId,
    status: scopeStatus,
    formatBranchLabel,
  } = useRestaurantScope()

  return (
    <div>
      <PageHeader title={t.reservations.title} subtitle={t.reservations.subtitle} />

      <div className="mb-6 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex items-start gap-3">
          <MaterialIcon name="info" size={22} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-label-lg font-semibold text-on-surface">
              {t.reservations.backendGap.title}
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              {t.reservations.backendGap.body}
            </p>
            {selectedBranch && (
              <p className="text-label-sm text-on-surface-variant mt-2">
                {formatBranchLabel(selectedBranch)}
                {selectedBranchId ? ` · ${selectedBranchId.slice(0, 8)}…` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {(scopeStatus === 'ready' || scopeStatus === 'empty_branches') && (
        <ReservationCreatePanel />
      )}

      <EmptyState
        title={t.reservations.backendGap.listTitle}
        description={t.reservations.backendGap.listBody}
        icon="event_busy"
      />
    </div>
  )
}
