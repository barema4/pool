import { apiClient } from './client'
import type {
  ClientOrganization,
  AgencyClientAccessEntry,
  Organization,
  OrganizationCountry,
  OrgRole,
} from '@/types/api'

export function createClient(
  agencyOrganizationId: string,
  payload: { name: string; type: Organization['type']; country?: OrganizationCountry },
) {
  return apiClient
    .post<ClientOrganization>(`/organizations/${agencyOrganizationId}/clients`, payload)
    .then((r) => r.data)
}

export function listClients(agencyOrganizationId: string) {
  return apiClient
    .get<ClientOrganization[]>(`/organizations/${agencyOrganizationId}/clients`)
    .then((r) => r.data)
}

export function listAccess(agencyOrganizationId: string, clientOrganizationId: string) {
  return apiClient
    .get<AgencyClientAccessEntry[]>(
      `/organizations/${agencyOrganizationId}/clients/${clientOrganizationId}/access`,
    )
    .then((r) => r.data)
}

export function grantAccess(
  agencyOrganizationId: string,
  clientOrganizationId: string,
  payload: { userId: string; role: OrgRole },
) {
  return apiClient
    .post<AgencyClientAccessEntry>(
      `/organizations/${agencyOrganizationId}/clients/${clientOrganizationId}/access`,
      payload,
    )
    .then((r) => r.data)
}

export function revokeAccess(
  agencyOrganizationId: string,
  clientOrganizationId: string,
  userId: string,
) {
  return apiClient
    .delete(`/organizations/${agencyOrganizationId}/clients/${clientOrganizationId}/access/${userId}`)
    .then((r) => r.data)
}
