import { useState } from 'react'

import ErasureConfirmModal from '@/components/ErasureConfirmModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useErasureRequests, useExecuteErasureRequest, useRejectErasureRequest } from '@/features/platform-admin/hooks'
import type { ErasureRequestEntry } from '@/features/platform-admin/types'
import { ApiError } from '@/lib/api'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: ErasureRequestEntry['status'] }) {
  if (status === 'DONE') return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-text-muted">✓ SELESAI</span>
  if (status === 'REJECTED') return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-text-muted">✕ DIBATALKAN</span>
  return null
}

// ErasureRequestsPage -- S4P-33, US-060. Diterjemahkan langsung dari desain
// "PA Right To Erasure" (kolom, footer) + "PA Erasure Confirm" (modal,
// diperluas 2 langkah untuk execute -- lihat ErasureConfirmModal).
function ErasureRequestsPageContent() {
  const { data, isLoading, isError } = useErasureRequests()
  const executeMutation = useExecuteErasureRequest()
  const rejectMutation = useRejectErasureRequest()

  const [modal, setModal] = useState<{ mode: 'execute' | 'reject'; entry: ErasureRequestEntry } | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const closeModal = () => {
    setModal(null)
    setModalError(null)
  }

  const handleConfirm = () => {
    if (!modal) return
    setModalError(null)
    const mutation = modal.mode === 'execute' ? executeMutation.mutateAsync({ id: modal.entry.id, confirmation: 'KONFIRMASI' }) : rejectMutation.mutateAsync(modal.entry.id)
    mutation
      .then(() => closeModal())
      .catch((err: unknown) => {
        setModalError(err instanceof ApiError ? err.message : 'Gagal memproses permintaan. Coba lagi.')
      })
  }

  const isPending = executeMutation.isPending || rejectMutation.isPending

  return (
    <div className="space-y-3.5 p-6">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Right to Erasure · UU PDP Pasal 43</div>
        <div className="mt-1.5 text-base font-bold">{data?.length ?? 0} permintaan tercatat</div>
      </div>

      {isLoading && <p className="font-mono text-sm text-text-muted">Memuat...</p>}
      {isError && <p className="font-mono text-sm text-destructive">Gagal memuat antrian erasure.</p>}

      {data && (
        <div className="overflow-x-auto border border-pa-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pa-header text-left">
                {['Subjek Data', 'Organisasi', 'Diajukan Oleh', 'Tgl Request', 'Aksi'].map((h) => (
                  <th key={h} className="py-2.5 pl-3.5 pr-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0">
                  <td className="py-3 pl-3.5 pr-4 text-[13px] text-text-body">{entry.subject}</td>
                  <td className="py-3 pr-4 font-mono text-[11px] text-text-muted">{entry.org}</td>
                  <td className="py-3 pr-4 font-mono text-[11px] text-text-muted">{entry.requested_by}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-0.5 font-mono text-[10.5px] text-text-dim">
                      <span>{formatDate(entry.requested_at)}</span>
                      {entry.processed_at && (
                        <span className="text-[9px] text-text-dim">
                          {entry.status === 'REJECTED' ? 'Dibatalkan' : 'Dieksekusi'} {formatDate(entry.processed_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {entry.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'execute', entry })}
                          className="inline-flex w-fit items-center gap-1.5 border border-destructive px-3 py-1.5 font-mono text-[10px] tracking-[0.04em] text-destructive"
                        >
                          ⌦ EKSEKUSI
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'reject', entry })}
                          className="inline-flex w-fit items-center gap-1.5 border border-pa-border px-3 py-1.5 font-mono text-[10px] tracking-[0.04em] text-text-muted"
                        >
                          ✕ BATALKAN
                        </button>
                      </div>
                    ) : (
                      <StatusBadge status={entry.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="p-4 font-mono text-[11px] text-text-muted">Belum ada permintaan erasure.</p>}
        </div>
      )}

      <p className="font-mono text-[9.5px] leading-relaxed text-text-dim">
        Eksekusi = pseudonymization pada data akun (identitas → token anonim) + revoke sesi + hapus MFA. Record aktivitas
        organisasi tetap dipertahankan.
      </p>

      {modal && (
        <ErasureConfirmModal
          open
          mode={modal.mode}
          subject={modal.entry.subject}
          onClose={closeModal}
          onConfirm={handleConfirm}
          isPending={isPending}
          errorMessage={modalError}
        />
      )}
    </div>
  )
}

export default function ErasureRequestsPage() {
  return (
    <ErrorBoundary>
      <ErasureRequestsPageContent />
    </ErrorBoundary>
  )
}
