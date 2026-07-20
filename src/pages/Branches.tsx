import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLocale } from '@/context/LocaleContext'
import { branches } from '@/data/mockData'
import { cn } from '@/lib/utils'

export function BranchesPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader
        title={t.branches.title}
        subtitle={t.branches.subtitle}
        actions={
          <Button size="sm">
            <MaterialIcon name="add" size={16} /> {t.branches.addBranch}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className={cn(!branch.active && 'opacity-60')}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <MaterialIcon name="location_on" size={20} />
              </div>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  branch.active ? 'bg-success-light text-success' : 'bg-surface-container-lowest text-on-surface-variant',
                )}
              >
                {branch.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="font-semibold text-on-surface">{branch.name}</h3>
            <p className="text-sm text-on-surface-variant mt-1">{branch.address}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1">{t.common.edit}</Button>
              <Button variant="ghost" size="sm" className="flex-1">{t.common.view}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
