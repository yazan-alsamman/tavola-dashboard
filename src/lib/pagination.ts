/**
 * Shared pagination helpers aligned with Postman (`page` + `pageSize`).
 * Response DTOs may still expose `limit` on older shapes — normalize both.
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export function toPageQuery(params: PaginationParams = {}): {
  page: number
  pageSize: number
} {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  }
}

/** Normalize envelope list payloads that use `limit` or `pageSize`. */
export function normalizePaginated<T>(raw: {
  items: T[]
  page: number
  total: number
  limit?: number
  pageSize?: number
}): PaginatedResult<T> {
  return {
    items: raw.items ?? [],
    page: raw.page ?? 1,
    pageSize: raw.pageSize ?? raw.limit ?? 20,
    total: raw.total ?? 0,
  }
}
