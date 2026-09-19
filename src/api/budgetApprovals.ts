import { apiClient } from './client'
import type { BudgetApproval } from '@/types/api'

export function getStatus(eventId: string) {
  return apiClient.get<BudgetApproval>(`/events/${eventId}/budget-approval`).then((r) => r.data)
}

export function submit(eventId: string) {
  return apiClient
    .post<BudgetApproval>(`/events/${eventId}/budget-approval/submit`)
    .then((r) => r.data)
}

export function decide(eventId: string, payload: { approve: boolean; reason?: string }) {
  return apiClient
    .post<BudgetApproval>(`/events/${eventId}/budget-approval/decide`, payload)
    .then((r) => r.data)
}

export function fund(eventId: string) {
  return apiClient
    .post<BudgetApproval>(`/events/${eventId}/budget-approval/fund`)
    .then((r) => r.data)
}
