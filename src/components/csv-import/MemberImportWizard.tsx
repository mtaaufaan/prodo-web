import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadImportReport } from '@/features/csv-import/api'
import { useCSVImportStatus, useExecuteImport, useValidateMemberImport } from '@/features/csv-import/hooks'
import type { ValidateResult } from '@/features/csv-import/types'
import type { Organization } from '@/features/organizations/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MemberImportWizardProps {
  open: boolean
  onClose: () => void
  groupId: string
  orgs: Organization[]
}

const STEP_LABELS = ['1 · UNGGAH', '2 · PREVIEW DRY-RUN', '3 · HASIL']

const STATUS_LABEL: Record<string, string> = { valid: 'VALID', existing: 'ADA', skipped: 'DILEWATI' }
const STATUS_TONE: Record<string, string> = { valid: 'text-mint', existing: 'text-blue', skipped: 'text-destructive' }

// MemberImportWizard (Import Data, desain "GA Import Data.dc.html") -- 3
// langkah: unggah, preview dry-run, hasil. Dry-run SINKRON (langsung
// dapat hasil), eksekusi lewat job Asynq -- step 3 polling status sampai
// completed/failed (useCSVImportStatus), dikonfirmasi user.
export default function MemberImportWizard({ open, onClose, groupId, orgs }: MemberImportWizardProps) {
  const [step, setStep] = useState(1)
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState(false)
  const [result, setResult] = useState<ValidateResult | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const validate = useValidateMemberImport(groupId)
  const execute = useExecuteImport(groupId)
  const status = useCSVImportStatus(groupId, step === 3 ? result?.import_id ?? null : null)

  // orgs sering masih [] saat wizard pertama mount (useOrganizationList
  // belum resolve) -- useState(orgs[0]?.id) di atas cuma jalan SEKALI, jadi
  // orgId tetap '' selamanya kalau itu terjadi (select tampak terisi nama
  // org pertama karena fallback native <select>, TAPI value sungguhan kosong
  // -- ditemukan+diperbaiki saat verifikasi live: POST validate 422 "invalid
  // input" walau form terlihat benar terisi).
  useEffect(() => {
    if (!orgId && orgs.length > 0) setOrgId(orgs[0].id)
  }, [orgs, orgId])

  const reset = () => {
    setStep(1)
    setOrgId(orgs[0]?.id ?? '')
    setFile(null)
    setFileError(false)
    setResult(null)
    setReportError(null)
    validate.reset()
    execute.reset()
  }
  const handleClose = () => {
    reset()
    onClose()
  }

  const handleDryRun = () => {
    if (!file) {
      setFileError(true)
      return
    }
    validate.mutate(
      { orgId, file },
      {
        onSuccess: (r) => {
          setResult(r)
          setStep(2)
        },
      },
    )
  }

  const handleExecute = () => {
    if (!result) return
    execute.mutate(result.import_id, { onSuccess: () => setStep(3) })
  }

  const handleDownloadReport = async () => {
    if (!result) return
    setReportError(null)
    try {
      const blob = await downloadImportReport(groupId, result.import_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'laporan-import.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setReportError('Gagal mengunduh laporan.')
    }
  }

  const validateErrorMessage = validate.error instanceof ApiError ? validate.error.message : null
  const executeErrorMessage = execute.error instanceof ApiError ? execute.error.message : null
  const executeRateLimited = execute.error instanceof ApiError && execute.error.code === 'RATE_LIMITED'
  const executeRetryAfter = executeRateLimited ? (execute.error as ApiError).details as { retry_after?: number } | undefined : undefined

  const imp = status.data
  const jobDone = imp?.status === 'completed' || imp?.status === 'failed'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Unggah berkas CSV' : step === 2 ? 'Preview dry-run sebelum eksekusi' : 'Hasil import'}</DialogTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {STEP_LABELS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  'border px-2 py-0.5 font-mono text-[9px] tracking-[0.06em]',
                  i + 1 === step ? 'border-signal text-signal' : i + 1 < step ? 'border-mint text-mint' : 'border-line-strong text-text-dim',
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-320px)] flex-col gap-4 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Organisasi Tujuan</label>
                  <select
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className="w-full border border-line-strong bg-input-bg px-3 py-2.5 font-mono text-[11.5px] text-text-body outline-none"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Berkas CSV</label>
                <label
                  className={cn(
                    'block cursor-pointer border border-dashed p-6 text-center',
                    fileError ? 'border-destructive' : 'border-line-strong hover:border-signal',
                  )}
                >
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null)
                      setFileError(false)
                    }}
                  />
                  <div className="font-mono text-[11px] text-text-body">{file ? file.name : 'Klik untuk memilih berkas'}</div>
                  <div className="mt-1.5 font-mono text-[9px] text-text-muted">UTF-8 · pemisah koma · maks 5.000 baris / 10 MB</div>
                </label>
                {fileError && <p className="mt-1.5 text-[10px] text-destructive">⚠ Pilih berkas CSV terlebih dahulu.</p>}
                {validateErrorMessage && <p className="mt-1.5 text-[10px] text-destructive">⚠ {validateErrorMessage}</p>}
              </div>

              <div className="border-t border-line pt-3 font-mono text-[9px] leading-relaxed text-text-dim">
                Kolom wajib: email, role, workspace (nama opsional). Email yang belum terdaftar menerima email
                invitation; email yang sudah terdaftar ditambahkan langsung ke workspace tujuan.
              </div>
            </>
          )}

          {step === 2 && result && (
            <>
              <div className="flex gap-2.5">
                <div className="flex-1 border border-line p-3">
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">Total Baris</div>
                  <div className="mt-1 text-xl font-extrabold">{result.total_rows}</div>
                </div>
                <div className="flex-1 border border-line p-3">
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">Siap Diproses</div>
                  <div className="mt-1 text-xl font-extrabold text-mint">{result.valid_count + result.existing_count}</div>
                </div>
                <div className="flex-1 border border-line p-3">
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">Akan Dilewati</div>
                  <div className="mt-1 text-xl font-extrabold text-destructive">{result.skipped_count}</div>
                </div>
              </div>

              <div className="border border-line">
                <div className="border-b border-line bg-raised-2 px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  Preview Dry-run · {result.preview.length} Baris Pertama
                </div>
                {result.preview.map((r) => (
                  <div key={r.row} className="grid grid-cols-[32px_1.6fr_1fr_0.8fr] items-center gap-2.5 border-t border-line px-3.5 py-2.5">
                    <span className="font-mono text-[9.5px] text-text-dim">{r.row}</span>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10.5px] text-text-body">{r.email}</div>
                      {r.reason && <div className={cn('mt-0.5 text-[9px] leading-relaxed', STATUS_TONE[r.status])}>{r.reason}</div>}
                    </div>
                    <span className="truncate font-mono text-[9.5px] text-text-muted">
                      {r.role} · {r.workspace}
                    </span>
                    <span className={cn('font-mono text-[9px] font-semibold', STATUS_TONE[r.status])}>● {STATUS_LABEL[r.status]}</span>
                  </div>
                ))}
              </div>

              {executeRateLimited && (
                <p className="border border-destructive p-3 text-[11px] text-destructive">
                  ⚠ Terlalu banyak eksekusi import dalam waktu singkat (maks 2 permintaan/menit).
                  {executeRetryAfter?.retry_after ? ` Coba lagi dalam ${executeRetryAfter.retry_after} detik.` : ''}
                </p>
              )}
              {executeErrorMessage && !executeRateLimited && <p className="text-[11px] text-destructive">{executeErrorMessage}</p>}

              <p className="font-mono text-[9px] leading-relaxed text-text-dim">
                Baris tidak valid dilewati saat eksekusi; sisanya tetap diproses. Email yang sudah terdaftar menerima
                penambahan organisasi tanpa email registrasi ulang; sisanya menerima email invitation berlaku 72 jam.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              {!jobDone && <p className="text-sm text-text-muted">Memproses import di latar belakang...</p>}
              {jobDone && imp && (
                <>
                  <div className="border border-mint p-3.5 font-mono text-[10px] leading-relaxed text-mint">
                    ✓ Import {imp.status === 'completed' ? 'selesai' : 'gagal'}. {imp.success_count} dari {imp.total_rows} baris
                    diproses.
                  </div>
                  <div className="flex gap-2.5">
                    <div className="flex-1 border border-line p-3">
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">Record Berhasil</div>
                      <div className="mt-1 text-xl font-extrabold text-mint">{imp.success_count}</div>
                    </div>
                    <div className="flex-1 border border-line p-3">
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">Baris Dilewati</div>
                      <div className="mt-1 text-xl font-extrabold text-destructive">{imp.failed_count}</div>
                    </div>
                  </div>
                  {reportError && <p className="text-[11px] text-destructive">{reportError}</p>}
                  <p className="border-t border-line pt-3 font-mono text-[9px] leading-relaxed text-text-dim">
                    Laporan CSV memuat baris yang berhasil dan baris yang dilewati beserta alasan per baris. Proses
                    tercatat di Audit Trail.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {step === 1 && (
            <Button
              type="button"
              disabled={validate.isPending}
              onClick={handleDryRun}
              className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
            >
              {validate.isPending ? 'Memproses...' : 'Jalankan Dry-Run'}
            </Button>
          )}
          {step === 2 && (
            <>
              <Button
                type="button"
                disabled={execute.isPending}
                onClick={handleExecute}
                className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
              >
                {execute.isPending ? 'Memulai...' : 'Setujui & Eksekusi Import'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Kembali
              </Button>
            </>
          )}
          {step === 3 && jobDone && (
            <Button
              type="button"
              onClick={handleDownloadReport}
              className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
            >
              ⬇ Unduh Laporan CSV
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
