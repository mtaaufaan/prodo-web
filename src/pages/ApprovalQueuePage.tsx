import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import ApprovalDecisionModal from '@/components/approvals/ApprovalDecisionModal'
import ApprovalRow from '@/components/approvals/ApprovalRow'
import Grid1Pager from '@/components/shared/Grid1Pager'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { decisionNotice, describeDecisionError } from '@/features/approvals/approvalRules'
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks'
import type { ApprovalDecision, ApprovalItem, ApprovalView } from '@/features/approvals/types'
import { useMyContext, useMyProjects } from '@/features/context/hooks'
import { cn } from '@/lib/utils'

const PER_PAGE = 10
const NOTICE_MS = 15000

const APPROVER_CAP_NOTE = 'Dapat menyetujui atau menolak task pada tahap review dan berkomentar. Tidak dapat mengubah isi task.'

// ApprovalQueuePage -- "TM Antrean Approval.dc.html" (S7A-03, Sprint 7 Approver Console).
// Cakupan = project aktif di URL (switcher sidebar). Data dari GET /me/approvals (kontrak usulan, IG-149;
// mock MSW sampai S7A-04): baris satu halaman, total, dan 4 kartu dihitung server.
export default function ApprovalQueuePage() {
  const { wsId = '', projectId = '' } = useParams<{ wsId: string; projectId: string }>()
  const { view } = useOutletContext<WorkspaceOutletContext>()
  const approvalView: ApprovalView = view === 'Sudah Diputuskan' ? 'decided' : 'pending'

  const ctx = useMyContext()
  const membership = ctx.data?.workspace_memberships.find((w) => w.workspace_id === wsId) ?? ctx.data?.project_scoped_projects.find((p) => p.workspace_id === wsId)
  const canDecide = Boolean(membership?.capabilities.approve_task)

  const projects = useMyProjects(wsId)
  const projectName = projects.data?.find((p) => p.id === projectId)?.name ?? '—'
  const [page, setPage] = useState(1)
  const approvals = useApprovals(projectId, approvalView, page, PER_PAGE)
  const decide = useDecideApproval()

  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>()
  const [pending, setPending] = useState<{ item: ApprovalItem; mode: ApprovalDecision } | null>(null)

  const showNotice = (text: string) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS)
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), [])
  useEffect(() => setPage(1), [approvalView, projectId])

  const rows = approvals.data?.items ?? []
  const total = approvals.data?.total ?? 0
  const stats = approvals.data?.stats ?? { pending: 0, decided: 0, total_tasks: 0, late: 0 }

  const submit = async (note: string): Promise<string> => {
    if (!pending) return ''
    const { item, mode } = pending
    try {
      await decide.mutateAsync({ taskId: item.task_id, decision: mode, note })
    } catch (err) {
      return describeDecisionError(err)
    }
    setPending(null)
    showNotice(decisionNotice(mode, item.task_code))
    return ''
  }

  const cards = [
    { label: 'MENUNGGU SAYA', value: String(stats.pending), note: 'PERLU KEPUTUSAN', tone: 'text-amber' },
    { label: 'DIPUTUSKAN', value: String(stats.decided), note: 'RIWAYAT SAYA', tone: 'text-mint' },
    { label: 'TOTAL TASK', value: String(stats.total_tasks), note: projectName.toUpperCase(), tone: 'text-text-bone' },
    { label: 'TERLAMBAT', value: String(stats.late), note: 'LEWAT DUE DATE', tone: 'text-red' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-content p-6">
      <div className="flex flex-wrap items-center gap-[9px] px-0.5 pb-3">
        <span className={cn('border px-2 py-1 font-mono text-[8.5px] tracking-[0.12em]', canDecide ? 'border-violet text-violet' : 'border-text-muted text-text-muted')}>
          AKSES {(membership?.role ?? 'approver').toUpperCase().replace(/_/g, ' ')}
        </span>
        <span className="font-mono text-[8.5px] leading-[1.6] text-text-dim">{APPROVER_CAP_NOTE}</span>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-line">
        <div className="flex-1 overflow-auto">
          {approvals.isLoading && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-text-dim">Memuat...</div>}
          {approvals.isError && <div className="p-[30px_14px] text-center font-mono text-[10.5px] text-red">Gagal memuat antrean approval.</div>}
          {rows.map((item) => (
            <ApprovalRow key={item.task_id} item={item} canDecide={canDecide} onDecide={(it, mode) => setPending({ item: it, mode })} />
          ))}
          {approvals.isSuccess && total === 0 && (
            <div className="p-[30px_14px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">
              {approvalView === 'decided' ? 'Belum ada task yang Anda putuskan.' : 'Tidak ada task menunggu keputusan Anda.'}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-raised px-3.5 py-[11px] font-mono text-[9px] leading-[1.8] text-text-muted">
          Approver hanya dapat menyetujui atau menolak — isi task, assignee, dan due date tidak dapat diubah dari sini.
        </div>
        <Grid1Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
      </div>

      {pending && (
        <ApprovalDecisionModal
          mode={pending.mode}
          code={pending.item.task_code}
          taskTitle={pending.item.title}
          pic={pending.item.pic_names.join(', ')}
          onConfirm={submit}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}
