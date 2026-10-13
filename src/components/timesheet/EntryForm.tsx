import { useState } from 'react'

import { validateManualEntry } from '@/features/timesheet/analytics'

export interface EntryFormValues {
  taskId: string
  started_at: string // ISO
  ended_at: string // ISO
  note?: string
}

interface EntryFormProps {
  // tasks != null -> mode tambah (pilih task); null -> mode ubah (task tetap).
  tasks: { id: string; task_code: string | null; title: string }[] | null
  initial?: { startLocal: string; endLocal: string; note: string }
  submitLabel: string
  busy: boolean
  serverError: string
  onSubmit: (values: EntryFormValues) => void
  onCancel: () => void
}

const FIELD = 'border border-line-strong bg-input-bg px-2 py-1.5 text-[11px] text-text-bone outline-none focus-visible:border-signal'

// Form entri waktu manual (US-037): validasi lengkap sebelum kirim, pesan
// galat tampil di atas tombol (backend tetap memvalidasi ulang, mis. overlap).
export default function EntryForm({ tasks, initial, submitLabel, busy, serverError, onSubmit, onCancel }: EntryFormProps) {
  const [taskId, setTaskId] = useState('')
  const [start, setStart] = useState(initial?.startLocal ?? '')
  const [end, setEnd] = useState(initial?.endLocal ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')

  const submit = () => {
    const problem = validateManualEntry(tasks ? taskId : 'edit', start, end)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    onSubmit({ taskId, started_at: new Date(start).toISOString(), ended_at: new Date(end).toISOString(), note: note.trim() || undefined })
  }

  return (
    <div className="flex flex-col gap-2 border border-line-strong bg-bg-deep p-3">
      <div className="flex flex-wrap gap-2">
        {tasks && (
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
            Task
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={FIELD}>
              <option value="">— pilih task —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.task_code ? `${t.task_code} · ` : ''}
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
          Mulai
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
          Selesai
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
        Deskripsi (opsional)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Apa yang dikerjakan..." maxLength={500} className={FIELD} />
      </label>
      {(error || serverError) && <p className="font-mono text-[9.5px] text-destructive">⚠ {error || serverError}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="border border-signal px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase text-signal disabled:opacity-40">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="border border-line-strong px-3 py-1.5 font-mono text-[9.5px] uppercase text-text-muted">
          Batal
        </button>
      </div>
      <p className="font-mono text-[8.5px] leading-[1.7] text-text-dim">Entri manual masuk status &quot;Menunggu&quot; dan baru dihitung ke jam tercatat setelah disetujui PM.</p>
    </div>
  )
}
