import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'

const PLATFORM_APP_URL = import.meta.env.VITE_PLATFORM_APP_URL ?? 'http://localhost:5174/platform'

/** Shown on the restaurant app if someone still opens `/platform` here. */
export function PlatformMovedPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <PageHeader className="mb-4" title={t.platform.brand} subtitle={t.platform.moved.body} />
        <Card>
          <a href={PLATFORM_APP_URL}>
            <Button variant="primary">{t.platform.moved.openConsole}</Button>
          </a>
        </Card>
      </div>
    </div>
  )
}
