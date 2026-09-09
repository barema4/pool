import { apiClient } from './client'
import type { BudgetCategory } from '@/types/api'

export function listForEvent(eventId: string) {
  return apiClient
    .get<BudgetCategory[]>('/budget-categories', { params: { eventId } })
    .then((r) => r.data)
}

export function create(payload: { eventId: string; name: string; estimatedCost?: number }) {
  return apiClient.post<BudgetCategory>('/budget-categories', payload).then((r) => r.data)
}

export function update(
  budgetCategoryId: string,
  payload: { name?: string; estimatedCost?: number },
) {
  return apiClient
    .patch<BudgetCategory>(`/budget-categories/${budgetCategoryId}`, payload)
    .then((r) => r.data)
}

export function allocate(budgetCategoryId: string, payload: { amount: number }) {
  return apiClient
    .post(`/budget-categories/${budgetCategoryId}/allocate`, payload)
    .then((r) => r.data)
}
