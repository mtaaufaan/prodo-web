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
