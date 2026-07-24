/**
 * Persistence helpers for restaurant/branch selection IDs.
 * IDs alone are UX convenience — always revalidate against backend lists.
 */

const RESTAURANT_KEY = 'tavla-selected-restaurant-id'
const BRANCH_KEY = 'tavla-selected-branch-id'

function read(key: string): string | null {
  try {
    const value = localStorage.getItem(key)
    return value && value.trim().length > 0 ? value : null
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // private mode / unavailable storage
  }
}

export const scopePersistence = {
  getRestaurantId(): string | null {
    return read(RESTAURANT_KEY)
  },
  setRestaurantId(id: string | null): void {
    write(RESTAURANT_KEY, id)
  },
  getBranchId(): string | null {
    return read(BRANCH_KEY)
  },
  setBranchId(id: string | null): void {
    write(BRANCH_KEY, id)
  },
  clear(): void {
    write(RESTAURANT_KEY, null)
    write(BRANCH_KEY, null)
  },
}

export { RESTAURANT_KEY as SCOPE_RESTAURANT_STORAGE_KEY, BRANCH_KEY as SCOPE_BRANCH_STORAGE_KEY }
