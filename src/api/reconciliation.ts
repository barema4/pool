import { apiClient } from './client'
import type { ReconciliationReport } from '@/types/api'

export function check() {
  return apiClient.get<ReconciliationReport>('/reconciliation').then((r) => r.data)
}
