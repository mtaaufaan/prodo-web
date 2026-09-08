import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import MemberImportWizard from '@/components/csv-import/MemberImportWizard'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { downloadImportReport, downloadMemberImportTemplate } from '@/features/csv-import/api'
import { useImportHistory } from '@/features/csv-import/hooks'
import { useOrganizationList } from '@/features/organizations/hooks'
import { cn } from '@/lib/utils'

type ViewTab = 'Unggah CSV' | 'Riwayat'

const STATUS_TONE: Record<string, string> = { pending: 'text-text-muted', running: 'text-amber', completed: 'text-mint', failed: 'text-destructive' }

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

// GroupImportDataPage (Import Data, Track S4G, desain "GA Import
// Data.dc.html") -- dua tab di dalam halaman sendiri (sama pola Storage &
// Kuota/Data Retention). CUMA kartu template "Member & Role" -- kartu
// "Task & Project" dari desain (migrasi task dari sistem lama) SENGAJA
// tidak dibangun, tabel tasks belum ada (dikonfirmasi user).
function GroupImportDataPageContent() {
  const outletContext = useOutletContext<GroupAdminOutletContext>()
  const isBareRender = !outletContext
  const { registerCta, groupId } = outletContext ?? { registerCta: () => {}, groupId: undefined }
  const [tab, setTab] = useState<ViewTab>('Unggah CSV')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const orgList = useOrganizationList(isBareRender ? undefined : groupId)
  const history = useImportHistory(isBareRender ? '' : (groupId ?? ''))
  const orgs = orgList.data?.organizations ?? []

  useEffect(() => {
    registerCta(() => setWizardOpen(true))
    return () => registerCta(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTemplate = async () => {
    setTemplateError(null)
    try {
      const blob = await downloadMemberImportTemplate(groupId ?? '')
      triggerDownload(blob, 'member-import-template.csv')
    } catch {
      setTemplateError('Gagal mengunduh template.')
    }
  }

  const handleReport = async (importId: string) => {
    setReportError(null)
    try {
      const blob = await downloadImportReport(groupId ?? '', importId)
      triggerDownload(blob, 'laporan-import.csv')
    } catch {
      setReportError('Gagal mengunduh laporan.')
    }
  }

  const items = history.data ?? []
  const totalOK = items.reduce((s, h) => s + h.success_count, 0)
  const totalSkipped = items.reduce((s, h) => s + h.failed_count, 0)

  return (
    <>
      <div className="space-y-3.5 p-6">
        <div className="flex gap-1.5">
          {(['Unggah CSV', 'Riwayat'] as ViewTab[]).map((t) => (
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

        {tab === 'Unggah CSV' ? (
          <>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-2.5 border border-line bg-panel p-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-mint">Member &amp; Role</div>
                  <div className="mt-1.5 text-[14.5px] font-bold">Import member massal</div>
                  <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-text-muted">
                    Menambahkan member ke organisasi beserta role dan workspace tujuan. Email yang belum terdaftar
                    menerima email invitation.
                  </p>
                </div>
                <div className="font-mono text-[8.5px] leading-relaxed text-text-dim">KOLOM: email, nama, role, workspace</div>
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={handleTemplate}
                    className="border border-line-strong px-3 py-2 font-mono text-[9.5px] text-text-muted hover:border-signal hover:text-signal"
                  >
                    ⬇ Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardOpen(true)}
                    className="bg-signal px-3 py-2 font-mono text-[9.5px] font-bold text-bg-deep"
                  >
                    Mulai Import
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-line">
              <div className="border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                Aturan Import
              </div>
              <div className="grid grid-cols-1 gap-3.5 p-4 font-mono text-[9.5px] leading-relaxed text-text-muted sm:grid-cols-3">
                <div>· Maksimum 5.000 baris per berkas, ukuran ≤ 10 MB.<br />· Encoding UTF-8, pemisah koma.<br />· Baris pertama wajib berisi nama kolom.</div>
                <div>· Preview dry-run wajib disetujui sebelum eksekusi.<br />· Baris tidak valid dilewati, bukan menggagalkan seluruh berkas.<br />· Eksekusi diproses di latar belakang.</div>
                <div>· Laporan hasil dapat diunduh sebagai CSV.<br />· Seluruh proses tercatat di Audit Trail.</div>
              </div>
            </div>

            {templateError && <p className="text-[11px] text-destructive">{templateError}</p>}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[150px] flex-1 border border-line bg-panel p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Total Import</div>
                <div className="mt-1.5 text-xl font-bold">{items.length}</div>
              </div>
              <div className="min-w-[150px] flex-1 border border-line bg-panel p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Record Berhasil</div>
                <div className="mt-1.5 text-xl font-bold text-mint">{totalOK}</div>
              </div>
              <div className="min-w-[150px] flex-1 border border-line bg-panel p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Baris Dilewati</div>
                <div className="mt-1.5 text-xl font-bold text-amber">{totalSkipped}</div>
              </div>
            </div>

            {reportError && <p className="text-[11px] text-destructive">{reportError}</p>}

            <div className="border border-line">
              <div className="grid grid-cols-[2.1fr_0.9fr_1.1fr_0.7fr_0.8fr] gap-3 border-b border-line bg-raised-2 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                <span>Berkas</span>
                <span>Jenis</span>
                <span>Hasil</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {items.length === 0 && <p className="p-4 text-sm text-text-muted">Belum ada riwayat import.</p>}
              {items.map((h) => (
                <div key={h.id} className="grid grid-cols-[2.1fr_0.9fr_1.1fr_0.7fr_0.8fr] items-center gap-3 border-t border-line px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] text-text-body">{h.filename}</div>
                    <div className="font-mono text-[9px] text-text-muted">{new Date(h.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  <span className="w-fit border border-mint px-1.5 py-0.5 font-mono text-[9.5px] text-mint">MEMBER</span>
                  <div className="font-mono text-[9.5px] leading-relaxed">
                    <div className="text-mint">{h.success_count} berhasil</div>
                    <div className={h.failed_count > 0 ? 'text-amber' : 'text-text-muted'}>{h.failed_count} dilewati</div>
                  </div>
                  <span className={cn('font-mono text-[9px] font-semibold uppercase', STATUS_TONE[h.status])}>● {h.status}</span>
                  <button
                    type="button"
                    disabled={h.status !== 'completed' && h.status !== 'failed'}
                    onClick={() => handleReport(h.id)}
                    className="w-fit font-mono text-[9.5px] text-text-muted hover:text-signal disabled:opacity-40"
                  >
                    ⬇ Laporan
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <MemberImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} groupId={groupId ?? ''} orgs={orgs} />
    </>
  )
}

export default function GroupImportDataPage() {
  return (
    <ErrorBoundary>
      <GroupImportDataPageContent />
    </ErrorBoundary>
  )
}
