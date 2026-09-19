import { apiClient } from './client'
import type { CheckoutResult, PaymentMethod, MobileMoneyProvider } from '@/types/api'

export function initiate(
  eventId: string,
  payload: {
    amount: number
    // Kenya: 'card' | 'mobile_money'. Uganda: which network (MTN/Airtel) —
    // phoneNumber is then required too, see DepositView.vue.
    paymentMethod?: PaymentMethod | MobileMoneyProvider
    phoneNumber?: string
  },
) {
  return apiClient.post<CheckoutResult>(`/events/${eventId}/deposits`, payload).then((r) => r.data)
}
