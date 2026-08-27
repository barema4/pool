import { apiClient } from './client'
import type { EventRecord, EventDetail, EventStatus, PayoutDetails } from '@/types/api'

export function listForOrganization(organizationId: string) {
  return apiClient.get<EventRecord[]>('/events', { params: { organizationId } }).then((r) => r.data)
}

export function getOne(eventId: string) {
  return apiClient.get<EventDetail>(`/events/${eventId}`).then((r) => r.data)
}

export function create(payload: {
  organizationId: string
  title: string
  description?: string
  coverImageUrl?: string
  targetGoal?: number
  isPermanent?: boolean
}) {
  return apiClient.post<EventRecord>('/events', payload).then((r) => r.data)
}

export function createQuick(payload: { title: string; description?: string; targetGoal?: number }) {
  return apiClient.post<EventRecord>('/events/quick', payload).then((r) => r.data)
}

export function update(
  eventId: string,
  payload: Partial<{
    title: string
    description: string
    coverImageUrl: string
    targetGoal: number
  }>,
) {
  return apiClient.patch<EventRecord>(`/events/${eventId}`, payload).then((r) => r.data)
}

export function updateStatus(eventId: string, status: EventStatus) {
  return apiClient.patch<EventRecord>(`/events/${eventId}/status`, { status }).then((r) => r.data)
}

export function setPayout(
  eventId: string,
  payload: { bankCode: string; bankName: string; accountNumber: string },
) {
  return apiClient
    .patch<EventRecord & PayoutDetails>(`/events/${eventId}/payout`, payload)
    .then((r) => r.data)
}
