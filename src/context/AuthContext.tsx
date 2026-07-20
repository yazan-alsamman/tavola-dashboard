import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_USER: User = {
  id: 'u1',
  name: 'George Naim',
  email: 'george@naranj.com',
  role: 'owner',
  restaurantId: 'rest-1',
  branchId: 'b1',
  initials: 'GN',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('tavla-user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((email: string, _password: string) => {
    if (email) {
      setUser({ ...DEMO_USER, email })
      sessionStorage.setItem('tavla-user', JSON.stringify({ ...DEMO_USER, email }))
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('tavla-user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
