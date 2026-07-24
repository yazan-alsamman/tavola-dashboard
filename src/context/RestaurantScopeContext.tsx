import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { formatBranchLabel, listAllBranches, type BranchDto } from '@/api/branches'
import { isApiError, type ApiError } from '@/api/errors'
import { listAllRestaurants, type RestaurantDto } from '@/api/restaurants'
import { useAuth } from '@/context/AuthContext'
import { scopePersistence } from '@/lib/scopePersistence'
import { selectBranchId, selectRestaurantId } from '@/lib/scopeSelection'

export type ScopeStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty_restaurants'
  | 'empty_branches'
  | 'forbidden'
  | 'error'

interface RestaurantScopeValue {
  status: ScopeStatus
  error: ApiError | null
  restaurants: RestaurantDto[]
  branches: BranchDto[]
  selectedRestaurant: RestaurantDto | null
  selectedBranch: BranchDto | null
  selectedRestaurantId: string | null
  selectedBranchId: string | null
  selectRestaurant: (restaurantId: string) => void
  selectBranch: (branchId: string) => void
  refreshScope: () => void
  formatBranchLabel: (branch: BranchDto) => string
}

const RestaurantScopeContext = createContext<RestaurantScopeValue | null>(null)

export function RestaurantScopeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [status, setStatus] = useState<ScopeStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantDto[]>([])
  const [branches, setBranches] = useState<BranchDto[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const restaurantsRequestId = useRef(0)
  const branchesRequestId = useRef(0)
  const restaurantsAbort = useRef<AbortController | null>(null)
  const branchesAbort = useRef<AbortController | null>(null)
  /** Tracks prior auth identity so we clear persistence on logout / account switch, not on idle mount. */
  const previousUserIdRef = useRef<string | null>(null)

  const userId = user?.userId ?? null
  const authRestaurantHint = user?.restaurantId ?? null
  const authBranchHintsKey = (user?.branchIds ?? []).join(',')
  const authBranchHintsRef = useRef<string[]>([])
  authBranchHintsRef.current = user?.branchIds ?? []

  const clearScope = useCallback((): void => {
    restaurantsAbort.current?.abort()
    branchesAbort.current?.abort()
    restaurantsRequestId.current += 1
    branchesRequestId.current += 1
    setRestaurants([])
    setBranches([])
    setSelectedRestaurantId(null)
    setSelectedBranchId(null)
    setError(null)
    setStatus('idle')
  }, [])

  const loadBranchesForRestaurant = useCallback(
    async (
      restaurantId: string,
      options: {
        authBranchHints: string[]
        preferBranchId?: string | null
      },
    ): Promise<void> => {
      branchesAbort.current?.abort()
      const controller = new AbortController()
      branchesAbort.current = controller
      const requestId = ++branchesRequestId.current

      setStatus('loading')
      setError(null)
      setBranches([])
      setSelectedBranchId(null)

      try {
        const list = await listAllBranches(restaurantId, 100, controller.signal)
        if (requestId !== branchesRequestId.current) return

        setBranches(list)

        if (list.length === 0) {
          setSelectedBranchId(null)
          scopePersistence.setBranchId(null)
          setStatus('empty_branches')
          return
        }

        const chosen = selectBranchId(
          list,
          options.preferBranchId ?? scopePersistence.getBranchId(),
          options.authBranchHints,
        )
        setSelectedBranchId(chosen)
        scopePersistence.setBranchId(chosen)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        if (requestId !== branchesRequestId.current) return

        const apiError = isApiError(err) ? err : null
        setBranches([])
        setSelectedBranchId(null)
        setError(apiError)
        setStatus(apiError?.code === 'FORBIDDEN' ? 'forbidden' : 'error')
      }
    },
    [],
  )

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated || !userId) {
      clearScope()
      // Only wipe persisted IDs after a real authenticated session ends — not on first idle mount.
      if (previousUserIdRef.current !== null) {
        scopePersistence.clear()
      }
      previousUserIdRef.current = null
      return
    }

    if (
      previousUserIdRef.current !== null &&
      previousUserIdRef.current !== userId
    ) {
      scopePersistence.clear()
    }
    previousUserIdRef.current = userId

    restaurantsAbort.current?.abort()
    const controller = new AbortController()
    restaurantsAbort.current = controller
    const requestId = ++restaurantsRequestId.current

    setStatus('loading')
    setError(null)

    void (async () => {
      try {
        const list = await listAllRestaurants(100, controller.signal)
        if (requestId !== restaurantsRequestId.current) return

        setRestaurants(list)

        if (list.length === 0) {
          setSelectedRestaurantId(null)
          setSelectedBranchId(null)
          setBranches([])
          scopePersistence.setRestaurantId(null)
          scopePersistence.setBranchId(null)
          setStatus('empty_restaurants')
          return
        }

        const restaurantId = selectRestaurantId(
          list,
          scopePersistence.getRestaurantId(),
          authRestaurantHint,
        )
        setSelectedRestaurantId(restaurantId)
        scopePersistence.setRestaurantId(restaurantId)

        if (!restaurantId) {
          setStatus('empty_restaurants')
          return
        }

        await loadBranchesForRestaurant(restaurantId, {
          authBranchHints: authBranchHintsRef.current,
          preferBranchId: scopePersistence.getBranchId(),
        })
      } catch (err) {
        if (controller.signal.aborted) return
        if (requestId !== restaurantsRequestId.current) return

        const apiError = isApiError(err) ? err : null
        setRestaurants([])
        setBranches([])
        setSelectedRestaurantId(null)
        setSelectedBranchId(null)
        setError(apiError)
        setStatus(apiError?.code === 'FORBIDDEN' ? 'forbidden' : 'error')
      }
    })()

    return () => {
      controller.abort()
    }
  }, [
    authLoading,
    isAuthenticated,
    userId,
    authRestaurantHint,
    authBranchHintsKey,
    reloadToken,
    clearScope,
    loadBranchesForRestaurant,
  ])

  const selectRestaurant = useCallback(
    (restaurantId: string): void => {
      if (!restaurants.some((r) => r.restaurantId === restaurantId)) {
        return
      }
      if (restaurantId === selectedRestaurantId) {
        return
      }

      setSelectedRestaurantId(restaurantId)
      scopePersistence.setRestaurantId(restaurantId)
      scopePersistence.setBranchId(null)

      void loadBranchesForRestaurant(restaurantId, {
        authBranchHints: authBranchHintsRef.current,
        preferBranchId: null,
      })
    },
    [restaurants, selectedRestaurantId, loadBranchesForRestaurant],
  )

  const selectBranch = useCallback(
    (branchId: string): void => {
      if (!branches.some((b) => b.branchId === branchId)) {
        return
      }
      setSelectedBranchId(branchId)
      scopePersistence.setBranchId(branchId)
      setStatus('ready')
    },
    [branches],
  )

  const refreshScope = useCallback((): void => {
    setReloadToken((value) => value + 1)
  }, [])

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.restaurantId === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId],
  )

  const selectedBranch = useMemo(
    () => branches.find((b) => b.branchId === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  )

  const value = useMemo<RestaurantScopeValue>(
    () => ({
      status,
      error,
      restaurants,
      branches,
      selectedRestaurant,
      selectedBranch,
      selectedRestaurantId,
      selectedBranchId,
      selectRestaurant,
      selectBranch,
      refreshScope,
      formatBranchLabel,
    }),
    [
      status,
      error,
      restaurants,
      branches,
      selectedRestaurant,
      selectedBranch,
      selectedRestaurantId,
      selectedBranchId,
      selectRestaurant,
      selectBranch,
      refreshScope,
    ],
  )

  return (
    <RestaurantScopeContext.Provider value={value}>
      {children}
    </RestaurantScopeContext.Provider>
  )
}

export function useRestaurantScope(): RestaurantScopeValue {
  const ctx = useContext(RestaurantScopeContext)
  if (!ctx) {
    throw new Error('useRestaurantScope must be used within RestaurantScopeProvider')
  }
  return ctx
}
