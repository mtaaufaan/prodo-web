import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { updateGroupLocale } from '@/features/group-locale/api'
import { useGroupLocale, groupLocaleKeys } from '@/features/group-locale/hooks'
import { DATE_FORMATS, NUMBER_FORMATS, TIME_FORMATS, TIMEZONES } from '@/features/group-locale/types'
import type { DateFormat, GroupLocaleFormValues, NumberFormat, TimeFormat, Timezone } from '@/features/group-locale/types'
import { organizationKeys, useOrganizationList } from '@/features/organizations/hooks'
import { updateOrganizationSettings } from '@/features/organizations/api'
import { ApiError } from '@/lib/api'
import { cn, logoBgClass } from '@/lib/utils'

type ViewTab = 'Bahasa Default' | 'Cakupan Terjemahan'

const TIMEZONE_LABELS: Record<Timezone, string> = {
  'Asia/Jakarta': 'Asia/Jakarta (UTC+7)',
  'Asia/Makassar': 'Asia/Makassar (UTC+8)',
  'Asia/Jayapura': 'Asia/Jayapura (UTC+9)',
  UTC: 'UTC',
}
const TIME_FORMAT_LABELS: Record<TimeFormat, string> = { '24h': '24 jam', '12h': '12 jam (AM/PM)' }
const NUMBER_FORMAT_LABELS: Record<NumberFormat, string> = { 'id-ID': '1.234,56', 'en-US': '1,234.56' }

function formatSampleDate(fmt: DateFormat): string {
  const d = new Date(2026, 6, 28)
  if (fmt === 'YYYY-MM-DD') return '2026-07-28'
  if (fmt === 'DD MMM YYYY') return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  return '28/07/2026'
}

// Cakupan Terjemahan -- KONTEN STATIS mencerminkan status i18n SESUNGGUHNYA
// di codebase ini (bukan angka ilustratif "100%/96%" dari mock desain "GA
// Bahasa Lokal.dc.html", yang datanya acak/bukan hasil audit nyata, sama
// alasan Performance Dashboard tidak meniru rumus mock apa adanya). i18next
// SENGAJA dibatasi ke konsol Platform Admin saja (implementation_gaps.md
// IG-30) -- Group Admin, Admin Workspace/Project Manager, notifikasi, dan
// email sistem 100% hardcoded Bahasa Indonesia, TIDAK ada dukungan EN sama
// sekali. Menampilkan angka mock yang menyiratkan cakupan EN 96-100% di
// area itu akan menyesatkan pengguna.
const COVERAGE_ROWS = [
  { area: 'Konsol Platform Admin', note: 'Menu, tombol, tabel, form -- toggle ID/EN berfungsi penuh', id: '100%', en: '100%', status: 'LENGKAP', tone: 'text-mint' },
  { area: 'Konsol Group Admin', note: 'Termasuk halaman ini -- hardcoded Bahasa Indonesia', id: '100%', en: '—', status: 'TIDAK DITERJEMAHKAN', tone: 'text-text-dim' },
  { area: 'Admin Workspace & Project Manager', note: 'Papan Kanban, Timesheet, Rule Automation, dst', id: '100%', en: '—', status: 'TIDAK DITERJEMAHKAN', tone: 'text-text-dim' },
  { area: 'Notifikasi in-app & email sistem', note: 'Undangan, peringatan kuota, perubahan role', id: '100%', en: '—', status: 'TIDAK DITERJEMAHKAN', tone: 'text-text-dim' },
  { area: 'Konten buatan pengguna', note: 'Judul task, deskripsi, komentar', id: '—', en: '—', status: 'TIDAK DITERJEMAHKAN OTOMATIS', tone: 'text-text-dim' },
] as const

function GroupLocalePageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { groupId } = outletContext ?? { groupId: undefined }
  const gid = isBareRender ? '' : (groupId ?? '')

  const [tab, setTab] = useState<ViewTab>('Bahasa Default')
  const [draftLang, setDraftLang] = useState<Record<string, string>>({})
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h')
  const [timezone, setTimezone] = useState<Timezone>('Asia/Jakarta')
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('id-ID')
  const [notice, setNotice] = useState('')

  const orgList = useOrganizationList(isBareRender ? undefined : groupId)
  const orgs = orgList.data?.organizations ?? []
  const locale = useGroupLocale(gid)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (locale.data) {
      setDateFormat(locale.data.date_format)
      setTimeFormat(locale.data.time_format)
      setTimezone(locale.data.timezone)
      setNumberFormat(locale.data.number_format)
    }
  }, [locale.data])

  const langOf = (orgId: string, current: string) => draftLang[orgId] ?? current
  const countId = orgs.filter((o) => langOf(o.id, o.default_language) === 'id').length
  const countEn = orgs.length - countId

  const regionalChanged =
    !!locale.data &&
    (dateFormat !== locale.data.date_format ||
      timeFormat !== locale.data.time_format ||
      timezone !== locale.data.timezone ||
      numberFormat !== locale.data.number_format)
  const langChanges = Object.entries(draftLang).filter(([orgId, lang]) => {
    const org = orgs.find((o) => o.id === orgId)
    return org && lang !== org.default_language
  })
  const dirty = langChanges.length > 0 || regionalChanged

  const saveAll = useMutation({
    mutationFn: async () => {
      await Promise.all(langChanges.map(([orgId, lang]) => updateOrganizationSettings(orgId, lang)))
      if (regionalChanged) {
        const values: GroupLocaleFormValues = { date_format: dateFormat, time_format: timeFormat, timezone, number_format: numberFormat }
        await updateGroupLocale(gid, values)
      }
    },
    onSuccess: () => {
      const parts: string[] = []
      if (langChanges.length) parts.push(`Bahasa default tersimpan untuk ${langChanges.length} organisasi.`)
      if (regionalChanged) parts.push('Format regional grup tersimpan.')
      setNotice(parts.join(' ') || 'Tidak ada perubahan.')
      setDraftLang({})
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      queryClient.invalidateQueries({ queryKey: groupLocaleKeys.detail(gid) })
    },
  })

  const errorMessage = saveAll.error instanceof ApiError ? saveAll.error.message : null

  const sampleDate = formatSampleDate(dateFormat)
  const sampleTime = timeFormat === '24h' ? '15:40' : '3:40 PM'
  const sampleNumber = numberFormat === 'id-ID' ? '1.234,56 GB' : '1,234.56 GB'
  const sampleEmail = countId >= countEn ? 'Anda diundang bergabung...' : 'You have been invited...'

  return (
    <div className="space-y-3.5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['Bahasa Default', 'Cakupan Terjemahan'] as ViewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em]',
                tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line-strong text-text-muted hover:text-text-bone',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'Bahasa Default' && (
          <button
            type="button"
            disabled={!dirty || saveAll.isPending}
            onClick={() => saveAll.mutate()}
            className={cn(
              'border border-signal px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em]',
              dirty ? 'bg-signal text-bg-deep' : 'text-signal opacity-50',
            )}
          >
            {saveAll.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        )}
      </div>

      {tab === 'Bahasa Default' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border border-line-strong bg-panel p-4">
            <div className="max-w-[520px]">
              <div className="font-mono text-[9px] tracking-[0.14em] text-text-dim">BAHASA DEFAULT PER ORGANISASI</div>
              <div className="mt-1.5 text-[15px] font-bold text-text-bone">Preferensi awal untuk pengguna baru</div>
              <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-text-dim">
                Bahasa default menentukan tampilan antarmuka, email undangan, dan notifikasi bagi pengguna yang belum menetapkan preferensinya
                sendiri. Mengubahnya tidak mengubah preferensi pengguna yang sudah ada.
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="font-mono text-[9px] tracking-[0.1em] text-text-dim">BAHASA INDONESIA</div>
                <div className="mt-1 text-[22px] font-extrabold text-signal">{countId}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] tracking-[0.1em] text-text-dim">ENGLISH</div>
                <div className="mt-1 text-[22px] font-extrabold text-mint">{countEn}</div>
              </div>
            </div>
          </div>

          <div className="border border-line-strong">
            <div className="grid grid-cols-[2.2fr_1.6fr_1fr] gap-3 border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Organisasi</span>
              <span>Bahasa Default</span>
              <span>Member</span>
            </div>
            {orgList.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
            {orgs.map((o) => {
              const cur = langOf(o.id, o.default_language)
              return (
                <div key={o.id} className="grid grid-cols-[2.2fr_1.6fr_1fr] items-center gap-3 border-t border-line px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center text-[12px] font-extrabold text-bg-deep',
                        logoBgClass(o.id),
                      )}
                    >
                      {o.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-[12.5px] text-text-bone">{o.name}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['id', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setDraftLang((prev) => ({ ...prev, [o.id]: l }))
                          setNotice('')
                        }}
                        className={cn(
                          'border px-2.5 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.04em]',
                          cur === l ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                        )}
                      >
                        {l === 'id' ? 'INDONESIA' : 'ENGLISH'}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-text-muted">{o.member_count} member</span>
                </div>
              )
            })}
          </div>

          <div className="border border-line-strong">
            <div className="border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Format Regional Grup
            </div>
            <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block font-mono text-[9px] tracking-[0.12em] text-text-dim">FORMAT TANGGAL</label>
                <select
                  value={dateFormat}
                  onChange={(e) => {
                    setDateFormat(e.target.value as DateFormat)
                    setNotice('')
                  }}
                  className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-bone outline-none focus-visible:border-signal"
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-mono text-[9px] text-text-dim">Dipakai pada due date, laporan, dan ekspor.</p>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[9px] tracking-[0.12em] text-text-dim">FORMAT WAKTU</label>
                <select
                  value={timeFormat}
                  onChange={(e) => {
                    setTimeFormat(e.target.value as TimeFormat)
                    setNotice('')
                  }}
                  className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-bone outline-none focus-visible:border-signal"
                >
                  {TIME_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {TIME_FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-mono text-[9px] text-text-dim">Timestamp audit trail selalu ditampilkan dalam UTC.</p>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[9px] tracking-[0.12em] text-text-dim">ZONA WAKTU OPERASIONAL</label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value as Timezone)
                    setNotice('')
                  }}
                  className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-bone outline-none focus-visible:border-signal"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {TIMEZONE_LABELS[tz]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-mono text-[9px] text-text-dim">Menentukan batas hari untuk due date dan laporan harian.</p>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[9px] tracking-[0.12em] text-text-dim">FORMAT ANGKA</label>
                <select
                  value={numberFormat}
                  onChange={(e) => {
                    setNumberFormat(e.target.value as NumberFormat)
                    setNotice('')
                  }}
                  className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-bone outline-none focus-visible:border-signal"
                >
                  {NUMBER_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {NUMBER_FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-mono text-[9px] text-text-dim">Dipakai pada storage, timesheet, dan laporan.</p>
              </div>
            </div>
          </div>

          <div className="border border-line-strong">
            <div className="border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Pratinjau
            </div>
            <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'DUE DATE TASK', value: `${sampleDate} · ${sampleTime}` },
                { label: 'STORAGE', value: sampleNumber },
                { label: 'EMAIL UNDANGAN', value: sampleEmail },
                { label: 'ZONA WAKTU', value: TIMEZONE_LABELS[timezone] },
              ].map((p) => (
                <div key={p.label} className="border border-line-strong p-3">
                  <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">{p.label}</div>
                  <div className="mt-1.5 font-mono text-[12.5px] text-text-bone">{p.value}</div>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && <p className="text-[11px] text-destructive">⚠ {errorMessage}</p>}
          {notice && <p className="border border-mint p-2.5 font-mono text-[10px] text-mint">✓ {notice}</p>}
          {dirty && !notice && (
            <p className="border border-amber p-2.5 font-mono text-[10px] leading-relaxed text-amber">
              Ada perubahan yang belum disimpan. Tekan SIMPAN untuk menerapkan ke seluruh organisasi terkait.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">BAHASA DIDUKUNG</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-text-bone">2</div>
            </div>
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">AREA BILINGUAL PENUH</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-mint">1 / 5</div>
            </div>
            <div className="min-w-[150px] flex-1 border border-line-strong bg-panel p-3.5">
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-dim">INDONESIA SAJA</div>
              <div className="mt-1.5 text-[22px] font-extrabold text-text-dim">4 / 5</div>
            </div>
          </div>

          <div className="border border-line-strong">
            <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_1.1fr] gap-3 border-b border-line-strong bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span>Area Antarmuka</span>
              <span>Indonesia</span>
              <span>English</span>
              <span>Status</span>
            </div>
            {COVERAGE_ROWS.map((c) => (
              <div key={c.area} className="grid grid-cols-[2.2fr_0.8fr_0.8fr_1.1fr] items-center gap-3 border-t border-line px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-text-bone">{c.area}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-text-dim">{c.note}</div>
                </div>
                <span className="font-mono text-[11px] text-text-muted">{c.id}</span>
                <span className="font-mono text-[11px] text-text-muted">{c.en}</span>
                <span className={cn('font-mono text-[9px] font-semibold', c.tone)}>● {c.status}</span>
              </div>
            ))}
            <p className="border-t border-line-strong px-4 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
              KONTEN BUATAN PENGGUNA -- JUDUL TASK, DESKRIPSI, DAN KOMENTAR -- TIDAK DITERJEMAHKAN OTOMATIS. DUKUNGAN EN DI LUAR KONSOL PLATFORM
              ADMIN BELUM DIBANGUN (implementation_gaps.md IG-30).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupLocalePage() {
  return (
    <ErrorBoundary>
      <GroupLocalePageContent />
    </ErrorBoundary>
  )
}
