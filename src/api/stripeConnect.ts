import { apiClient } from './client'

export function createOrgOnboardingLink(organizationId: string) {
  return apiClient
    .post<{ url: string }>(`/organizations/${organizationId}/stripe-connect/onboarding-link`)
    .then((r) => r.data)
}

export function createUserOnboardingLink() {
  return apiClient
    .post<{ url: string }>('/users/me/stripe-connect/onboarding-link')
    .then((r) => r.data)
}
