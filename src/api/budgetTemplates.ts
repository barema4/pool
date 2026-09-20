import { apiClient } from './client'
import type { BudgetTemplate } from '@/types/api'

export function listForOrganization(organizationId: string) {
  return apiClient
    .get<BudgetTemplate[]>('/budget-templates', { params: { organizationId } })
    .then((r) => r.data)
}

export function createFromEvent(payload: { organizationId: string; eventId: string; name: string }) {
  return apiClient.post<BudgetTemplate>('/budget-templates/from-event', payload).then((r) => r.data)
}

export function apply(templateId: string, eventId: string) {
  return apiClient.post(`/budget-templates/${templateId}/apply`, { eventId }).then((r) => r.data)
}

export function remove(templateId: string) {
  return apiClient.delete(`/budget-templates/${templateId}`).then((r) => r.data)
}
