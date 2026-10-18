import { useState } from 'react'

import { sanitizeHours, parseHours, validateLog } from '@/features/my-timesheet/timesheetMath'
import type { TimesheetTask } from '@/features/my-timesheet/types'
import { cn } from '@/lib/utils'

// LogTimeModal -- "TM Catat Waktu.dc.html": overlay + kartu border signal, pilih task aktif milik saya, JAM
// (maks 12), CATATAN opsional, validasi, teks aturan. Dipakai halaman Timesheet (S6E-09).
interface LogTimeModalProps {
  userName: string
  // Task aktif milik saya (lintas project).
  tasks: TimesheetTask[]
  // Mengembalikan pesan galat dari server ('' = sukses) supaya modal tetap terbuka saat gagal.
  onSubmit: (taskId: string, hours: number, note: string) => Promise<string>
  onClose: () => void
}

export default function LogTimeModal({ userName, tasks, onSubmit, onClose }: LogTimeModalProps) {
  const [taskId, setTaskId] = useState('')
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const invalid = validateLog(taskId, hours)
    if (invalid) {
      setError(invalid)
      return
    }
    setPending(true)
    const serverError = await onSubmit(taskId, parseHours(hours), note.trim())
    setPending(false)
    if (serverError) setError(serverError)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center bg-[oklch(0.1_0.008_60/0.68)] p-7">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Catat waktu kerja"
        className="flex max-h-[calc(100vh-56px)] w-[520px] max-w-full flex-col overflow-auto border border-signal bg-panel"
      >
        <div className="flex items-start gap-3.5 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 font-mono text-[9px] tracking-[0.16em] text-signal">CATAT WAKTU KERJA</div>
            <div className="text-[15px] font-bold leading-[1.35]">Catat jam kerja</div>
            <div className="mt-[5px] font-mono text-[9.5px] leading-[1.6] text-text-muted">Pencatatan atas nama {userName} · masuk ke timesheet minggu ini</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="font-mono text-[14px] leading-none text-text-muted hover:text-text-bone">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3.5 px-5 py-[18px]">
          <div>
            <div className="mb-[7px] font-mono text-[9px] tracking-[0.14em] text-text-dim">TASK YANG DIKERJAKAN</div>
            <div role="listbox" aria-label="Task yang dikerjakan" className="flex max-h-[190px] flex-col overflow-auto border border-line">
              {tasks.map((t) => {
                const on = taskId === t.task_id
                return (
                  <div
                    key={t.task_id}
                    role="option"
                    aria-selected={on}
                    tabIndex={0}
                    onClick={() => {
                      setTaskId(t.task_id)
                      setError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setTaskId(t.task_id)
                        setError('')
                      }
                    }}
                    className={cn('flex cursor-pointer items-center gap-[9px] border-t border-line px-3 py-2.5 first:border-t-0', on && 'bg-signal/10')}
                  >
                    <span className={cn('font-mono text-[10px]', on ? 'text-signal' : 'text-text-dim')}>{on ? '◉' : '○'}</span>
                    <span className="font-mono text-[8.5px] text-text-muted">{t.task_code}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-bone" title={t.project_name}>
                      {t.title}
                    </span>
                    <span className="font-mono text-[8.5px] text-text-dim">
                      {t.logged_hours}J / {t.estimate_hours ?? '—'}J
                    </span>
                  </div>
                )
              })}
              {tasks.length === 0 && (
                <div className="px-3 py-4 font-mono text-[9.5px] text-text-dim">Tidak ada task aktif yang ditugaskan kepada Anda.</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-[110px]">
              <label htmlFor="log-hours" className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-text-dim">
                JAM
              </label>
              <input
                id="log-hours"
                value={hours}
                onChange={(e) => {
                  setHours(sanitizeHours(e.target.value))
                  setError('')
                }}
                placeholder="2.5"
                className={cn('w-full border bg-input-bg px-[11px] py-2.5 font-mono text-[12px] text-text-bone outline-none', error ? 'border-red' : 'border-line')}
              />
            </div>
            <div className="min-w-[170px] flex-1">
              <label htmlFor="log-note" className="mb-[7px] block font-mono text-[9px] tracking-[0.14em] text-text-dim">
                CATATAN · OPSIONAL
              </label>
              <input
                id="log-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Perbaikan validasi & uji ulang"
                className="w-full border border-line bg-input-bg px-[11px] py-2.5 text-[12.5px] text-text-bone outline-none"
              />
            </div>
          </div>
          {error && <div className="border border-red px-3 py-2.5 font-mono text-[9.5px] leading-[1.7] text-red">⚠ {error}</div>}
          <div className="font-mono text-[9px] leading-[1.8] text-text-dim">
            Maksimal 12 jam per entri. Jam yang sudah dicatat tidak dapat dihapus sendiri — koreksi melalui Project Manager. Setiap pencatatan masuk
            Audit Trail.
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-signal px-[19px] py-[11px] font-mono text-[10.5px] font-bold tracking-[0.08em] text-[oklch(0.15_0.008_60)] disabled:opacity-60"
          >
            CATAT WAKTU
          </button>
          <button type="button" onClick={onClose} className="border border-line-strong px-[19px] py-[11px] font-mono text-[10.5px] tracking-[0.08em] text-text-muted">
            BATAL
          </button>
        </div>
      </div>
    </div>
  )
}
