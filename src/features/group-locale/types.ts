// Bahasa & Format Regional lanjutan (Track S4G S4G-27/28, US-010, desain
// "GA Bahasa Lokal.dc.html"). Format LEVEL GRUP -- beda dari
// organizations.default_language (S3-29-31, per-organisasi, tab "Bahasa
// Default" reuse itu apa adanya).
export const DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'] as const
export const TIME_FORMATS = ['24h', '12h'] as const
export const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'] as const
export const NUMBER_FORMATS = ['id-ID', 'en-US'] as const

export type DateFormat = (typeof DATE_FORMATS)[number]
export type TimeFormat = (typeof TIME_FORMATS)[number]
export type Timezone = (typeof TIMEZONES)[number]
export type NumberFormat = (typeof NUMBER_FORMATS)[number]

export interface GroupLocale {
  group_id: string
  date_format: DateFormat
  time_format: TimeFormat
  timezone: Timezone
  number_format: NumberFormat
}

export type GroupLocaleFormValues = Pick<GroupLocale, 'date_format' | 'time_format' | 'timezone' | 'number_format'>
