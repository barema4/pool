import { apiClient } from './client'
import type { BudgetCategory, PaginatedResult } from '@/types/api'

export interface ListBudgetCategoriesParams {
  eventId: string
  page?: number
  pageSize?: number
}

export function listForEvent(params: ListBudgetCategoriesParams) {
  return apiClient
    .get<PaginatedResult<BudgetCategory>>('/budget-categories', { params })
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

export function remove(budgetCategoryId: string) {
  return apiClient.delete(`/budget-categories/${budgetCategoryId}`).then((r) => r.data)
}

// Which vendor gets paid for this line item — null unassigns. Not gated by
// the budget-approval lock (unlike name/estimatedCost changes above): this
// is meant to happen once the budget is FUNDED, well past the DRAFT/
// DECLINED window that update() requires.
export function assignVendor(budgetCategoryId: string, vendorId: string | null) {
  return apiClient
    .patch<BudgetCategory>(`/budget-categories/${budgetCategoryId}/vendor`, { vendorId })
    .then((r) => r.data)
}

export function pay(budgetCategoryId: string) {
  return apiClient.post(`/budget-categories/${budgetCategoryId}/pay`).then((r) => r.data)
}
