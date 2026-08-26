import { apiClient } from './client'
import type { Transaction } from '@/types/api'

export function listForEvent(eventId: string) {
  return apiClient.get<Transaction[]>('/transactions', { params: { eventId } }).then((r) => r.data)
}
