import { apiClient } from './client'
import type { AdminUser, PaginatedResult } from '@/types/api'

export function list(params?: { page?: number; pageSize?: number; search?: string }) {
  return apiClient
    .get<PaginatedResult<AdminUser>>('/admin/users', { params })
    .then((r) => r.data)
}
