export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  }
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit
}
