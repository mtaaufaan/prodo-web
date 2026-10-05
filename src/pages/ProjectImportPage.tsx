import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { downloadProjectImportReport, downloadProjectImportTemplate } from '@/features/project-import/api'
import { useExecuteProjectImport, useProjectImportHistory, useValidateProjectImport } from '@/features/project-import/hooks'
import { sprintRowNote, sprintRowTitle } from '@/features/project-import/rows'
import type { ProjectImport, ProjectImportKind, ProjectImportValidateResult } from '@/features/project-import/types'
import { useProjects } from '@/features/projects/hooks'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type ViewTab = 'Unggah CSV' | 'Riwayat'

// Kolom yang dikenali per jenis ("PM Import CSV.dc.html" KOLOM YANG DIKENALI).
const SPRINT_COLUMNS: { key: string; desc: string; required?: boolean }[] = [
  { key: 'code*', desc: 'Kode sprint — wajib, unik per project, maksimal 20 karakter (huruf/angka/titik/strip). Dipakai import task untuk menunjuk sprint.', required: true },
  { key: 'name*', desc: 'Nama sprint — wajib, unik per project.', required: true },
  { key: 'start_date', desc: 'Format DD/MM/YYYY.' },
  { key: 'end_date', desc: 'Format DD/MM/YYYY; tidak boleh lebih awal dari start_date.' },
  { key: 'goal', desc: 'Tujuan sprint (opsional).' },
  { key: 'status', desc: 'backlog / active / done; kosong = backlog. Hanya satu sprint active per project.' },
]

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Notice({ tone, children, onClose }: { tone: 'mint' | 'destructive'; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className={cn(
        'relative border px-3.5 py-2.5 pr-8 font-mono text-[10px] leading-[1.7]',
        tone === 'mint' ? 'border-mint text-mint' : 'border-destructive text-destructive',
      )}
    >
      {children}
      {onClose && (
        <button type="button" onClick={onClose} title="Tutup" className="absolute right-1.5 top-1.5 px-1 py-0.5 text-[11px] leading-none opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  )
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  return fallback
}

// ProjectImportPage (Import CSV PM, "PM Import CSV.dc.html", IG-120) --
// tahap (a): import SPRINT (kode sprint jadi kunci penghubung import task
// tahap berikutnya). Tab 'Unggah CSV'/'Riwayat' dari shell (sama pola
// halaman PM lain). Chip project di desain tidak dibangun -- project aktif
// ditentukan switcher shell.
function ProjectImportPageContent() {
  const { wsId, projectId } = useParams<{ wsId: string; projectId: string }>()
  const workspaceId = wsId ?? ''
  const pid = projectId ?? ''
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const tab: ViewTab = view === 'Riwayat' ? 'Riwayat' : 'Unggah CSV'

  const projects = useProjects(workspaceId)
  const project = projects.data?.find((p) => p.id === pid) ?? null
  const kind: ProjectImportKind = 'sprint'

  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ProjectImportValidateResult | null>(null)
  const [error, setError] = useState('')
  const [rateLimit, setRateLimit] = useState<{ message: string; retryAfter: number } | null>(null)
  const [templateNotice, setTemplateNotice] = useState('')
  const [resultMsg, setResultMsg] = useState('')
  const [logNotice, setLogNotice] = useState('')

  const validate = useValidateProjectImport(pid)
  const execute = useExecuteProjectImport(pid)
  const history = useProjectImportHistory(pid)

  useEffect(() => {
    if (!templateNotice && !resultMsg && !logNotice) return
    const t = setTimeout(() => {
      setTemplateNotice('')
      setResultMsg('')
      setLogNotice('')
    }, 15000)
    return () => clearTimeout(t)
  }, [templateNotice, resultMsg, logNotice])

  const reset = () => {
    setFileName('')
    setPreview(null)
    setError('')
    setRateLimit(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    setResultMsg('')
    setError('')
    setRateLimit(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Hanya berkas .csv yang diterima.')
      return
    }
    setFileName(file.name)
    setPreview(null)
    validate.mutate(
      { kind, file },
      {
        onSuccess: (res) => setPreview(res),
        onError: (err) => {
          setFileName('')
          setError(errorMessage(err, 'Gagal memvalidasi berkas CSV.'))
        },
      },
    )
  }

  const onTemplate = async () => {
    try {
      const blob = await downloadProjectImportTemplate(pid, kind)
      triggerDownload(blob, 'sprint-import-template.csv')
      setTemplateNotice('Template sprint-import-template.csv diunduh — kolom: code, name, start_date, end_date, goal, status.')
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengunduh template.'))
    }
  }

  const onExecute = () => {
    if (!preview) return
    setError('')
    setRateLimit(null)
    execute.mutate(preview.import_id, {
      onSuccess: (imp) => {
        reset()
        setResultMsg(
          `${imp.success_count ?? 0} sprint diimpor ke ${project?.name ?? 'project ini'}, ${imp.failed_count ?? 0} baris dilewati. Tercatat di Audit Trail.`,
        )
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
          const retry = (err.details as { retry_after?: number } | undefined)?.retry_after ?? 60
          setRateLimit({ message: err.message, retryAfter: retry })
          return
        }
        setError(errorMessage(err, 'Gagal menjalankan import.'))
      },
    })
  }

  const onDownloadLog = async (imp: ProjectImport) => {
    try {
      const blob = await downloadProjectImportReport(pid, imp.id, true)
      triggerDownload(blob, `${imp.filename.replace(/\.csv$/i, '')}-skipped.csv`)
      setLogNotice(
        `${imp.failed_count ?? 0} baris dilewati diunduh sebagai ${imp.filename.replace(/\.csv$/i, '')}-skipped.csv — kolom: nomor baris, isi, alasan. Tercatat di Audit Trail.`,
      )
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengunduh log.'))
    }
  }

  return (
    <div className="flex flex-col gap-3.5 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">JENIS</span>
        <span className="border border-signal bg-signal px-2.5 py-1.5 font-mono text-[9.5px] text-bg-deep">SPRINT</span>
        <span
          title="Import task menyusul — impor sprint dulu agar kode sprint bisa dirujuk."
          className="cursor-not-allowed border border-line-strong px-2.5 py-1.5 font-mono text-[9.5px] text-text-dim opacity-60"
        >
          TASK · SEGERA
        </span>
        <span className="font-mono text-[9px] text-text-dim">PROJECT {(project?.name ?? '...').toUpperCase()}</span>
      </div>

      {error && <Notice tone="destructive" onClose={() => setError('')}>⚠ {error}</Notice>}

      {tab === 'Unggah CSV' && (
        <div className="flex flex-wrap items-start gap-3.5">
          <div className="min-w-[300px] flex-1 border border-line bg-panel px-[19px] py-[18px]">
            <div className="mb-1.5 font-mono text-[9px] tracking-[0.14em] text-signal">IMPORT SPRINT KE PROJECT {(project?.name ?? '...').toUpperCase()}</div>
            <p className="mb-4 mt-1.5 text-[12px] leading-relaxed text-text-muted">
              Berkas CSV UTF-8, pemisah koma, maksimal 5.000 baris per unggahan. Baris yang gagal validasi dilewati — sisanya tetap diimpor.
            </p>
            <div className="mb-3.5 flex flex-wrap gap-2.5">
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={validate.isPending}
                className="bg-signal px-[15px] py-2.5 font-mono text-[10px] font-bold tracking-[0.06em] text-bg-deep disabled:opacity-60"
              >
                ⬆ PILIH BERKAS CSV
              </button>
              <button
                type="button"
                onClick={onTemplate}
                className="border border-line-strong px-[15px] py-2.5 font-mono text-[10px] tracking-[0.06em] text-text-muted"
              >
                ⬇ UNDUH TEMPLATE
              </button>
            </div>
            {templateNotice && <div className="mb-3.5"><Notice tone="mint" onClose={() => setTemplateNotice('')}>✓ {templateNotice}</Notice></div>}
            {fileName && (
              <div className="mb-3.5 border border-line-strong px-3.5 py-3 font-mono text-[10px] leading-[1.7] text-text-bone">
                📄 {fileName}
                {validate.isPending && ' · memvalidasi...'}
              </div>
            )}
            <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">KOLOM YANG DIKENALI</div>
            <div className="flex flex-col gap-[7px]">
              {SPRINT_COLUMNS.map((c) => (
                <div key={c.key} className="flex items-baseline gap-2.5">
                  <span className={cn('min-w-[88px] font-mono text-[10px]', c.required ? 'text-signal' : 'text-text-bone')}>{c.key}</span>
                  <span className="text-[11.5px] leading-snug text-text-muted">{c.desc}</span>
                </div>
              ))}
            </div>
            {rateLimit && (
              <div className="mt-3.5">
                <Notice tone="destructive" onClose={() => setRateLimit(null)}>
                  ⚠ HTTP 429 — TOO MANY REQUESTS
                  <br />
                  {rateLimit.message}
                  <br />
                  <span className="text-text-dim">Retry-After: {rateLimit.retryAfter} detik.</span>
                </Notice>
              </div>
            )}
          </div>

          <div className="flex min-w-[300px] flex-1 flex-col border border-line bg-panel">
            <div className="border-b border-line px-4 py-3.5">
              <div className="font-mono text-[9px] tracking-[0.14em] text-text-muted">PRATINJAU VALIDASI</div>
              {preview && (
                <div className="mt-[11px] flex flex-wrap gap-3.5">
                  {[
                    { label: 'BARIS TERBACA', value: preview.total_rows, tone: 'text-text-bone' },
                    { label: 'VALID', value: preview.valid_count, tone: 'text-mint' },
                    { label: 'DILEWATI', value: preview.skipped_count, tone: 'text-amber' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className={cn('text-[19px] font-extrabold', s.tone)}>{s.value}</div>
                      <div className="mt-[3px] font-mono text-[8.5px] tracking-[0.1em] text-text-dim">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="min-h-[150px] flex-1 overflow-auto">
              {!preview && (
                <div className="px-4 py-[34px] text-center font-mono text-[10px] leading-[1.9] text-text-dim">
                  Belum ada berkas dipilih.
                  <br />
                  Pratinjau menampilkan baris valid dan alasan setiap baris yang dilewati sebelum import dieksekusi.
                </div>
              )}
              {preview?.preview.map((r) => (
                <div key={r.row} className="flex items-start gap-2.5 border-t border-line px-3.5 py-[11px]">
                  <span
                    className={cn(
                      'flex-shrink-0 border px-[5px] py-[3px] font-mono text-[8.5px] font-semibold',
                      r.status === 'valid' ? 'border-mint text-mint' : 'border-destructive text-destructive',
                    )}
                  >
                    {r.status === 'valid' ? 'OK' : 'SKIP'}
                  </span>
                  <div className="min-w-0 flex-1 leading-[1.45]">
                    <div className="truncate text-[12px] text-text-bone">{sprintRowTitle(r)}</div>
                    <div className={cn('mt-1 font-mono text-[8.5px] leading-[1.7]', r.status === 'valid' ? 'text-text-dim' : 'text-destructive')}>{sprintRowNote(r)}</div>
                  </div>
                </div>
              ))}
              {preview && preview.total_rows > preview.preview.length && (
                <div className="border-t border-line px-3.5 py-2.5 font-mono text-[9px] text-text-dim">
                  Menampilkan {preview.preview.length} baris pertama dari {preview.total_rows}.
                </div>
              )}
            </div>
            {preview && (
              <div className="flex flex-wrap gap-2.5 border-t border-line px-4 py-3.5">
                <button
                  type="button"
                  onClick={onExecute}
                  disabled={execute.isPending || preview.valid_count === 0}
                  className="bg-signal px-5 py-[11px] font-mono text-[10.5px] font-bold tracking-[0.08em] text-bg-deep disabled:opacity-50"
                >
                  {execute.isPending ? 'MENJALANKAN...' : 'JALANKAN IMPORT'}
                </button>
                <button type="button" onClick={reset} className="border border-line-strong px-5 py-[11px] font-mono text-[10.5px] tracking-[0.06em] text-text-muted">
                  TUTUP
                </button>
              </div>
            )}
            {resultMsg && (
              <div className="border-t border-line p-3">
                <Notice tone="mint" onClose={() => setResultMsg('')}>✓ {resultMsg}</Notice>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Riwayat' && (
        <div className="flex flex-col border border-line">
          {history.isLoading && <p className="p-4 text-sm text-text-muted">Memuat...</p>}
          {(history.data ?? []).map((h) => (
            <div key={h.id} className="flex flex-col gap-[7px] border-t border-line px-[15px] py-[13px] first:border-t-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="border border-mint px-1.5 py-[3px] font-mono text-[9px] font-semibold text-mint">{h.kind.toUpperCase()}</span>
                <span className="text-[12.5px] font-semibold text-text-bone">{h.filename}</span>
                <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-text-dim">{h.status === 'completed' ? 'SELESAI' : h.status.toUpperCase()}</span>
              </div>
              <div className="font-mono text-[8.5px] leading-[1.8] text-text-dim">
                OLEH {h.imported_by_name.toUpperCase()} · {new Date(h.created_at).toLocaleString('id-ID')} · TUJUAN {(project?.name ?? '').toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="font-mono text-[9.5px] text-mint">✓ {h.success_count ?? 0} BERHASIL</span>
                <span className={cn('font-mono text-[9.5px]', (h.failed_count ?? 0) > 0 ? 'text-amber' : 'text-text-dim')}>⚠ {h.failed_count ?? 0} DILEWATI</span>
                {(h.failed_count ?? 0) > 0 && (
                  <button type="button" onClick={() => onDownloadLog(h)} className="font-mono text-[9.5px] text-signal hover:underline">
                    ⤓ UNDUH LOG BARIS DILEWATI
                  </button>
                )}
              </div>
            </div>
          ))}
          {!history.isLoading && (history.data ?? []).length === 0 && (
            <div className="px-3.5 py-[30px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">Belum ada import untuk project ini.</div>
          )}
          {logNotice && (
            <div className="border-t border-line p-3">
              <Notice tone="mint" onClose={() => setLogNotice('')}>✓ {logNotice}</Notice>
            </div>
          )}
          <div className="border-t border-line bg-raised-2 px-3.5 py-[11px] font-mono text-[9px] leading-[1.8] text-text-dim">
            Setiap import tercatat di Audit Trail dengan aktor, berkas, jumlah baris berhasil dan dilewati. Import tidak dapat dibatalkan — sprint yang salah
            harus dihapus manual.
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectImportPage() {
  return (
    <ErrorBoundary>
      <ProjectImportPageContent />
    </ErrorBoundary>
  )
}
