import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/lib/queryClient'
import { useInventoryCacheIsolation } from '@/hooks/useInventoryQueries'
import type { ReactNode } from 'react'

function InventoryCacheGuard({ children }: { children: ReactNode }) {
  useInventoryCacheIsolation()
  return children
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createAppQueryClient())

  return (
    <QueryClientProvider client={client}>
      <InventoryCacheGuard>{children}</InventoryCacheGuard>
    </QueryClientProvider>
  )
}
