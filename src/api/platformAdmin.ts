import { apiClient } from './client'
import type { PlatformStaffMember } from '@/types/api'

export function listStaff() {
  return apiClient.get<PlatformStaffMember[]>('/admin/staff').then((r) => r.data)
}

export function inviteStaff(email: string) {
  return apiClient
    .post<PlatformStaffMember | { status: 'invited'; email: string }>('/admin/staff/invite', {
      email,
    })
    .then((r) => r.data)
}

export function revokeStaff(userId: string) {
  return apiClient.delete<PlatformStaffMember>(`/admin/staff/${userId}`).then((r) => r.data)
}
