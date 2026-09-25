import { apiClient } from './client'
import type {
  Organization,
  OrganizationWithRole,
  OrganizationMember,
  OrgRole,
  OrganizationCountry,
  MobileMoneyProvider,
  InviteMemberResult,
  AuditLogEntry,
  PaginatedResult,
} from '@/types/api'

export function listMine(params?: {
  page?: number
  pageSize?: number
  search?: string
  includeArchived?: boolean
}) {
  return apiClient
    .get<PaginatedResult<OrganizationWithRole>>('/organizations', { params })
    .then((r) => r.data)
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
export function create(payload: {
  name: string
  type: Organization['type']
  country?: OrganizationCountry
}) {
  return apiClient.post<Organization>('/organizations', payload).then((r) => r.data)
}

export function inviteMember(organizationId: string, payload: { email: string; role: OrgRole }) {
  return apiClient
    .post<InviteMemberResult>(`/organizations/${organizationId}/members`, payload)
    .then((r) => r.data)
}

export function getAuditLog(
  organizationId: string,
  params?: { page?: number; pageSize?: number },
) {
  return apiClient
    .get<PaginatedResult<AuditLogEntry>>(`/organizations/${organizationId}/audit-log`, { params })
    .then((r) => r.data)
}

export function setPayout(
  organizationId: string,
  payload: { bankCode: string; bankName: string; accountNumber: string },
) {
  return apiClient
    .patch<Organization>(`/organizations/${organizationId}/payout`, payload)
    .then((r) => r.data)
}

export function setMobileMoneyPayout(
  organizationId: string,
  payload: { provider: MobileMoneyProvider; phoneNumber: string },
) {
  return apiClient
    .patch<Organization>(`/organizations/${organizationId}/payout-mobile-money`, payload)
    .then((r) => r.data)
}

export function setBranding(organizationId: string, payload: { logoUrl: string | null }) {
  return apiClient
    .patch<Organization>(`/organizations/${organizationId}/branding`, payload)
    .then((r) => r.data)
}

export function setArchived(organizationId: string, archived: boolean) {
  return apiClient
    .patch<Organization>(`/organizations/${organizationId}/archive`, { archived })
    .then((r) => r.data)
}
