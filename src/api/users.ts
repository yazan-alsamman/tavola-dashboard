import { apiRequest } from './client'

/**
 * Profile payload from GET /users/me.
 * Confirmed: profile fields only — no permissions, org role, or branch scope.
 */
export interface UserProfile {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  language: string
  preferredCurrency: string | null
  createdAt: string
  updatedAt: string
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me')
}
