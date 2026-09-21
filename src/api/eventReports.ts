import { apiClient } from './client'

// Triggers a browser download of the event's close-out CSV report —
// authenticated, so it can't be a plain <a href> link; fetched as a blob
// and handed to the browser via a temporary object URL instead.
export async function downloadCloseoutReport(eventId: string, filename: string) {
  const response = await apiClient.get(`/events/${eventId}/reports/closeout`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
