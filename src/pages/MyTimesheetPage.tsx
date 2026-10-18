import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import LogTimeModal from '@/components/my-timesheet/LogTimeModal'
import Grid1Pager from '@/components/shared/Grid1Pager'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { useWorkspaceCapabilities } from '@/features/context/hooks'
import { useLogTime, useMyHours } from '@/features/my-timesheet/hooks'
import { groupByWeek, weekBars } from '@/features/my-timesheet/timesheetMath'
import { describeChildError } from '@/features/tasks/moveError'
import { formatDateDMY } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const PER_PAGE = 10
const NOTICE_MS = 15000

// Strip kemampuan per role -- CAPS di "TM Timesheet.dc.html" (teks persis desain).
const CAPS = {
  editor: { label: 'AKSES EDITOR', tone: 'border-mint text-mint', note: 'Dapat mengubah task yang ditugaskan, mencatat waktu, dan berkomentar. Tidak dapat menyetujui atau mengubah struktur project.' },
  approver: { label: 'AKSES APPROVER', tone: 'border-violet text-violet', note: 'Dapat menyetujui atau menolak task pada tahap review dan berkomentar. Tidak dapat mengubah isi task.' },
  viewer: { label: 'AKSES VIEWER · HANYA BACA', tone: 'border-text-muted text-text-muted', note: 'Hanya dapat melihat task, board, dan laporan. Tidak dapat membuat, mengubah, atau berkomentar.' },
} as const

// MyTimesheetPage -- "TM Timesheet.dc.html" (S6E-09, Sprint 6 Editor Console). Lintas project di workspace
// (keputusan sprint); tab "Minggu Ini" mengikuti desain, tab "Riwayat" tidak ada di desain (IG-140) dan dibuat dengan
// bahasa visual yang sama. Data dari GET /me/timesheets (S6E-10; sebelum itu mock).
export default function MyTimesheetPage() {
  const { wsId = '' } = useParams<{ wsId: string }>()
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const history = view === 'Riwayat'
  const { role, capabilities } = useWorkspaceCapabilities(wsId)
  const userName = useAuthStore((s) => s.user?.display_name) || 'Pengguna'

  const [page, setPage] = useState(1)
  const data = useMyHours(wsId, history ? 'history' : 'week', page, PER_PAGE)
  const logTime = useLogTime()

  const [logOpen, setLogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(noticeTimer.current), [])
  useEffect(() => setPage(1), [history, wsId])

  const showNotice = (text: string) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS)
  }

  const cap = capabilities?.manage_project || capabilities?.log_time ? CAPS.editor : role === 'approver' ? CAPS.approver : CAPS.viewer
  const canLog = Boolean(capabilities?.log_time)
  const stats = data.data?.stats ?? { logged_hours: 0, estimate_hours: 0, over_count: 0, active_count: 0 }
  const tasks = data.data?.tasks ?? []
  const bars = weekBars(tasks)
  const groups = groupByWeek(data.data?.items ?? [])
  const total = data.data?.total ?? 0

  const submit = async (taskId: string, hours: number, note: string): Promise<string> => {
    try {
      const res = await logTime.mutateAsync({ taskId, hours, note })
      setLogOpen(false)
      showNotice(`${res.hours} jam dicatat pada ${res.task_code}. Total menjadi ${res.task_total_hours.toFixed(1)} jam. Tercatat di Audit Trail.`)
      return ''
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code === 'NOT_YOUR_TASK') return 'Anda hanya dapat mencatat waktu pada task yang ditugaskan kepada Anda.'
      if (code === 'VALIDATION_ERROR') return 'Jam harus lebih dari 0 dan maksimal 12 per pencatatan.'
      if (code === 'DAILY_LIMIT') return 'Total jam tercatat hari ini tidak boleh melebihi 24 jam.'
      return describeChildError(err, 'Gagal mencatat waktu. Coba lagi.')
    }
  }

  const cards = [
    { label: 'JAM TERCATAT', value: stats.logged_hours.toFixed(1), note: 'PADA TASK SAYA', tone: 'text-violet' },
    { label: 'ESTIMASI', value: stats.estimate_hours.toFixed(1), note: 'TOTAL JAM', tone: 'text-text-bone' },
    { label: 'MELEBIHI ESTIMASI', value: String(stats.over_count), note: 'TASK', tone: 'text-red' },
    { label: 'TASK AKTIF', value: String(stats.active_count), note: 'DAPAT DICATAT', tone: 'text-blue' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-content p-6">
      <div className="flex flex-wrap items-center gap-[9px] px-0.5 pb-3">
        <span className={cn('border px-2 py-1 font-mono text-[8.5px] tracking-[0.12em]', cap.tone)}>{cap.label}</span>
        <span className="font-mono text-[8.5px] leading-[1.6] text-text-dim">{cap.note}</span>
      </div>

      {notice && (
        <div className="relative mb-3 border border-mint p-[11px_34px_11px_13px] font-mono text-[10px] leading-[1.7] text-mint">
          ✓ {notice}
          <button type="button" onClick={() => setNotice('')} title="Tutup" className="absolute right-[7px] top-[5px] px-[5px] py-[3px] font-mono text-[11px] leading-none opacity-60">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-0.5 pb-3.5">
        {cards.map((c) => (
          <div key={c.label} className="min-w-[104px] flex-1 border border-line bg-panel px-[15px] py-[13px]">
            <div className="font-mono text-[9px] tracking-[0.12em] text-text-muted">{c.label}</div>
            <div className={cn('mt-[5px] text-[23px] font-extrabold', c.tone)}>{c.value}</div>
            <div className="mt-[5px] font-mono text-[8.5px] text-text-dim">{c.note}</div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {canLog && (
          <div className="flex flex-wrap items-center gap-3 border border-line bg-panel px-[15px] py-3">
            <span className="min-w-[220px] flex-1 font-mono text-[9.5px] leading-[1.7] text-text-muted">
              Catat jam kerja pada task yang ditugaskan kepada Anda. Maksimal 12 jam per entri.
            </span>
            <button
              type="button"
              onClick={() => {
                setNotice('')
                setLogOpen(true)
              }}
              className="bg-signal px-[18px] py-2.5 font-mono text-[10.5px] font-bold tracking-[0.08em] text-[oklch(0.16_0.008_60)]"
            >
              + CATAT WAKTU
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-[280px] flex-1 flex-col border border-line bg-panel">
            <div className="border-b border-line px-[15px] py-[13px] font-mono text-[9px] tracking-[0.14em] text-text-muted">
              {history ? 'RIWAYAT JAM SAYA' : 'JAM SAYA MINGGU INI'}
            </div>
            <div className="flex-1 overflow-auto">
              {data.isLoading && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-text-dim">Memuat...</div>}
              {data.isError && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-red">Gagal memuat timesheet.</div>}

              {!history &&
                bars.map(({ task: t, width, over }) => (
                  <div key={t.task_id} className="flex flex-col gap-1.5 border-t border-line px-[15px] py-3 first:border-t-0">
                    <div className="flex items-center gap-[9px]">
                      <span className="font-mono text-[8.5px] text-text-muted">{t.task_code}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-text-bone">{t.title}</span>
                      <span className="font-mono text-[10.5px] font-semibold text-text-bone">{t.week_hours.toFixed(1)} J</span>
                    </div>
                    <div className="h-1.5 bg-input-bg" role="img" aria-label={`${t.week_hours.toFixed(1)} jam minggu ini${over ? ', melebihi estimasi' : ''}`}>
                      <div className={cn('h-full', over ? 'bg-red' : 'bg-mint')} style={{ width }} />
                    </div>
                    <div className="font-mono text-[8.5px] text-text-dim">
                      ESTIMASI {t.estimate_hours ?? '—'} JAM · TOTAL {t.logged_hours.toFixed(1)} J · {t.status_name} · {t.project_name.toUpperCase()}
                    </div>
                  </div>
                ))}
              {!history && data.isSuccess && bars.length === 0 && (
                <div className="p-[30px_14px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">Belum ada jam tercatat minggu ini.</div>
              )}

              {history &&
                groups.map((g) => (
                  <div key={g.weekStart}>
                    <div className="flex items-center gap-2.5 border-t border-line bg-raised px-[15px] py-2 font-mono text-[8.5px] tracking-[0.12em] text-text-muted first:border-t-0">
                      <span>{g.label}</span>
                      <span className="ml-auto text-text-bone">{g.totalHours.toFixed(1)} J</span>
                    </div>
                    {g.entries.map((e) => (
                      <div key={e.id} className="flex items-center gap-[9px] border-t border-line px-[15px] py-2.5">
                        <span className="w-[74px] font-mono text-[9px] text-text-dim">{formatDateDMY(e.entry_date)}</span>
                        <span className="font-mono text-[8.5px] text-text-muted">{e.task_code}</span>
                        {e.is_estimate && (
                          <span className="border border-blue px-1.5 py-0.5 font-mono text-[8px] tracking-[0.06em] text-blue" title="Estimasi dari riwayat tanggal status hasil import">
                            ESTIMASI
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] text-text-bone">{e.task_title}</div>
                          <div className="truncate font-mono text-[8.5px] text-text-dim">
                            {e.project_name.toUpperCase()}
                            {e.note ? ` · ${e.note}` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-[10.5px] font-semibold text-text-bone">{e.hours.toFixed(1)} J</span>
                      </div>
                    ))}
                  </div>
                ))}
              {history && data.isSuccess && total === 0 && (
                <div className="p-[30px_14px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">Belum ada riwayat jam tercatat.</div>
              )}
            </div>
            <div className="border-t border-line bg-raised px-[15px] py-[11px] font-mono text-[9px] leading-[1.8] text-text-muted">
              Jam yang sudah dicatat tidak dapat dihapus sendiri — hubungi Project Manager untuk koreksi. Setiap pencatatan masuk Audit Trail.
            </div>
            {history && <Grid1Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />}
          </div>
        </div>
      </div>

      {logOpen && <LogTimeModal userName={userName} tasks={tasks.filter((t) => t.is_active)} onSubmit={submit} onClose={() => setLogOpen(false)} />}
    </div>
  )
}
