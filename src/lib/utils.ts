import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// localeForLanguage -- konversi i18n.language ('id'/'en'/dll.) ke locale
// Intl (toLocaleDateString/toLocaleString) supaya nama bulan dan format
// tanggal ikut berubah bersama toggle bahasa, bukan cuma label statis
// (2026-08-29, cakupan penuh alih bahasa Platform Admin).
export function localeForLanguage(language: string): string {
  return language.startsWith('en') ? 'en-US' : 'id-ID'
}

// logoBgClass -- monogram warna deterministik dari id (S4G-03, dipakai
// OrganizationManagementPage; diekstrak ke sini S4G-05 supaya WorkspaceListPage
// bisa reuse persis, bukan duplikasi). BUKAN logo upload sungguhan -- backend
// tidak punya kolom warna/logo sama sekali, cuma dekorasi visual konsisten
// per-render.
const LOGO_PALETTE = ['bg-signal', 'bg-mint', 'bg-violet', 'bg-amber', 'bg-blue', 'bg-text-muted'] as const

export function logoBgClass(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return LOGO_PALETTE[hash % LOGO_PALETTE.length]
}
