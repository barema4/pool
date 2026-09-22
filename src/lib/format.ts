// Optional currency prefix — pass it wherever an amount's country isn't
// implicit from context, now that both KES and UGX exist in the app.
export function formatMoney(value: string | number | null | undefined, currency?: string): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? Number(value) : value
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? `${currency} ${formatted}` : formatted
}

// Live preview only, for an open-amount link where the payer hasn't chosen
// an amount yet — the actual charge is always computed authoritatively by
// the backend. Mirrors calculatePlatformFee in the NestJS backend.
export function calculatePlatformFee(baseAmount: number, feePercent: number): number {
  return Math.round(baseAmount * (feePercent / 100) * 100) / 100
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Consistent semantic coloring for status/role pills across the app —
// green for "done", amber for "in progress", red for "failed/expired",
// babyblue as the neutral default for everything else.
const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  SUCCESS: 'bg-green-100 text-green-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-babyblue-100 text-babyblue-700',
  DRAFT: 'bg-babyblue-100 text-babyblue-700',
  EXPIRED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-amber-100 text-amber-700',
  // Budget approval workflow
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  FUNDED: 'bg-green-100 text-green-700',
  // Disbursements
  QUEUED: 'bg-amber-100 text-amber-700',
}

export function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? 'bg-babyblue-100 text-babyblue-700'
}
