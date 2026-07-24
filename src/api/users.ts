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

/** PATCH /users/me — full-replace profile fields (Postman). */
export interface UpdateProfileRequest {
  firstName: string
  lastName: string
  countryCode: string
  phoneNumber: string
  language: string
  preferredCurrency: string
}

export interface UserPreferences {
  notificationOptIn: boolean
  marketingOptIn: boolean
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me')
}

export async function updateCurrentUser(
  body: UpdateProfileRequest,
): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me', {
    method: 'PATCH',
    body,
  })
}

export async function getMyPreferences(): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/users/me/preferences')
}

export async function updateMyPreferences(
  body: UserPreferences,
): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/users/me/preferences', {
    method: 'PATCH',
    body,
  })
}

/**
 * Multipart avatar upload (`file` field). JPEG/PNG/WebP, 5MB max.
 * Returns updated profile (or avatar metadata) from envelope `data`.
 */
export async function uploadMyAvatar(file: File): Promise<UserProfile> {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<UserProfile>('/users/me/avatar', {
    method: 'POST',
    body: form,
  })
}
