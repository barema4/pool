import { apiClient } from './client'
import type { Organization, OrganizationWithRole, OrganizationMember, OrgRole } from '@/types/api'

export function listMine() {
  return apiClient.get<OrganizationWithRole[]>('/organizations').then((r) => r.data)
}

export function getOne(organizationId: string) {
  return apiClient.get<Organization>(`/organizations/${organizationId}`).then((r) => r.data)
}

export function listMembers(organizationId: string) {
  return apiClient
    .get<OrganizationMember[]>(`/organizations/${organizationId}/members`)
    .then((r) => r.data)
}

// Note: unlike listMine(), the backend's create response doesn't include a
// flat `role` — it returns the raw Prisma `memberships` relation instead.
// The caller (organizations store) knows the creator is always
// MAIN_ORGANIZER and adds that field itself.
export function create(payload: { name: string; type: Organization['type'] }) {
  return apiClient.post<Organization>('/organizations', payload).then((r) => r.data)
}

export function inviteMember(organizationId: string, payload: { email: string; role: OrgRole }) {
  return apiClient.post(`/organizations/${organizationId}/members`, payload).then((r) => r.data)
}
