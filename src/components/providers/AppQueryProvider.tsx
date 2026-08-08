import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/lib/queryClient'
import { useInventoryCacheIsolation } from '@/hooks/useInventoryQueries'
import { useMenuCacheIsolation } from '@/hooks/useMenuQueries'
import type { ReactNode } from 'react'

function QueryCacheGuard({ children }: { children: ReactNode }) {
  useInventoryCacheIsolation()
  useMenuCacheIsolation()
  return children
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createAppQueryClient())

  return (
    <QueryClientProvider client={client}>
      <QueryCacheGuard>{children}</QueryCacheGuard>
    </QueryClientProvider>
  )
}
