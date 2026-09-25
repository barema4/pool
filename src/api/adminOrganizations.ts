import { apiClient } from './client'
import type { Organization, PaginatedResult } from '@/types/api'

export function list(params?: {
  page?: number
  pageSize?: number
  search?: string
  includeArchived?: boolean
}) {
  return apiClient
    .get<PaginatedResult<Organization>>('/admin/organizations', { params })
    .then((r) => r.data)
}

export function setArchived(organizationId: string, archived: boolean) {
  return apiClient
    .patch<Organization>(`/admin/organizations/${organizationId}/archive`, { archived })
    .then((r) => r.data)
}
