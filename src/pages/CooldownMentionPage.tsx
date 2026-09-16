import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { useProjects } from '@/features/projects/hooks'
import { useUpdateMentionSettings, useWorkspace } from '@/features/workspaces/hooks'
import { MENTION_COOLDOWN_OPTIONS, type MentionCooldownMinutes } from '@/features/workspaces/types'
import { cn } from '@/lib/utils'

// buildTimeline -- pola waktu PERSIS "AW Cooldown Mention.dc.html"
// __vals() (bukan diperkirakan ulang): 5 event tetap, jam ke-2/3
// dihitung proporsional dari cooldown supaya simulasi terasa hidup saat
// AW ganti pilihan menit.
function buildTimeline(cooldown: number, digest: boolean) {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return [
    { at: '09:00', event: '@Nadia disebut di RIL-142 oleh Dimas', note: 'Push notification DIKIRIM -- jendela cooldown mulai', tone: 'mint' as const },
    { at: `09:0${Math.min(9, Math.round(cooldown / 4))}`, event: '@Nadia disebut lagi di RIL-142', note: 'DITAHAN -- diakumulasi', tone: 'amber' as const },
    { at: `09:${pad2(Math.round(cooldown / 2))}`, event: '@Nadia disebut di MIG-018', note: 'DITAHAN -- diakumulasi (2 mention tertahan)', tone: 'amber' as const },
    {
      at: `09:${pad2(cooldown)}`,
      event: digest ? 'Ringkasan "2 mention baru" dikirim' : 'Jendela berakhir tanpa ringkasan',
      note: digest ? 'Satu push notification menggantikan dua' : 'Mention tertahan hanya terlihat di notification bell',
      tone: digest ? ('mint' as const) : ('dim' as const),
    },
    { at: `09:${pad2(cooldown + 3)}`, event: '@Nadia ditugaskan sebagai assignee RIL-155', note: 'DIKIRIM SEGERA -- penugasan langsung dikecualikan', tone: 'signal' as const },
  ]
}

const TONE_TEXT: Record<'mint' | 'amber' | 'dim' | 'signal', string> = {
  mint: 'text-mint',
  amber: 'text-amber',
  dim: 'text-text-muted',
  signal: 'text-signal',
}
const TONE_DOT: Record<'mint' | 'amber' | 'dim' | 'signal', string> = {
  mint: 'bg-mint',
  amber: 'bg-amber',
  dim: 'bg-text-muted',
  signal: 'bg-signal',
}

// CooldownMentionPage (S4W-07/08, US-033, "AW Cooldown Mention.dc.html")
// -- pengaturan cooldown push notification @mention level workspace.
// HANYA Admin Workspace (+GA/PA bypass) yang bisa menyimpan -- nav-nya
// sendiri sudah digerbangi adminOnly di WorkspaceLayout. Pengaturan
// TERSIMPAN saja untuk sekarang -- belum ada logic pengiriman
// notifikasi sungguhan (US-032, di luar cakupan track ini).
export default function CooldownMentionPage() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceId = wsId ?? ''
  const { data: workspace } = useWorkspace(workspaceId)
  const projects = useProjects(workspaceId)
  const updateSettings = useUpdateMentionSettings(workspaceId)

  const [cooldown, setCooldown] = useState<MentionCooldownMinutes>(10)
  const [digest, setDigest] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (workspace) {
      setCooldown(workspace.mention_cooldown_minutes as MentionCooldownMinutes)
      setDigest(workspace.mention_digest_enabled)
    }
  }, [workspace])

  if (!workspace) {
    return <div className="p-6 font-mono text-[11px] text-text-muted">Memuat...</div>
  }

  const dirty = cooldown !== workspace.mention_cooldown_minutes || digest !== workspace.mention_digest_enabled

  const handleSave = () => {
    setError('')
    updateSettings.mutate(
      { cooldown_minutes: cooldown, digest_enabled: digest },
      {
        onSuccess: () =>
          setNotice(`Cooldown mention disetel ${cooldown} menit${digest ? ' dengan ringkasan akumulasi' : ' tanpa ringkasan'} untuk seluruh project workspace. Tercatat di Audit Trail.`),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan.'),
      },
    )
  }

  const handleReset = () => {
    setCooldown(workspace.mention_cooldown_minutes as MentionCooldownMinutes)
    setDigest(workspace.mention_digest_enabled)
    setNotice('')
    setError('')
  }

  const timeline = buildTimeline(cooldown, digest)
  const projectList = projects.data ?? []

  return (
    <div className="flex flex-wrap items-start gap-3.5 p-6">
      <div className="min-w-[280px] flex-1 border border-line bg-panel px-[19px] py-[18px]">
        {!dirty && notice && (
          <div className="relative mb-3.5 border border-mint px-3.5 py-3 font-mono text-[10px] leading-relaxed text-mint">✓ {notice}</div>
        )}
        {error && (
          <div className="relative mb-3.5 border border-destructive px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">⚠ {error}</div>
        )}

        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-signal">Cooldown Push Notification @Mention</div>
        <div className="mt-1.5 text-[15.5px] font-bold text-text-bone">Berlaku di seluruh project workspace {workspace.name}</div>
        <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
          Bila seseorang di-mention lebih dari sekali dalam jendela cooldown, hanya notifikasi pertama yang dikirim. Mention
          berikutnya diakumulasi dan dikirim sebagai satu ringkasan setelah jendela berakhir.
        </p>

        <div className="mt-[18px]">
          <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Jendela Cooldown · Rentang PRD 10-30 Menit</div>
          <div className="flex flex-wrap gap-2.5">
            {MENTION_COOLDOWN_OPTIONS.map((v) => {
              const active = cooldown === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setCooldown(v)
                    setNotice('')
                  }}
                  className={cn(
                    'min-w-[88px] flex-1 border px-3 py-3 text-center',
                    active ? 'border-signal bg-accent-wash' : 'border-line-strong bg-transparent',
                  )}
                >
                  <div className={cn('text-[21px] font-extrabold', active ? 'text-signal' : 'text-text-body')}>{v}</div>
                  <div className={cn('mt-1 font-mono text-[8.5px] tracking-[0.1em]', active ? 'text-signal' : 'text-text-dim')}>
                    MENIT{v === 10 ? ' · DEFAULT' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-[18px]">
          <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">Ringkasan Akumulasi</div>
          <div
            onClick={() => {
              setDigest((d) => !d)
              setNotice('')
            }}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 border px-3.5 py-3',
              digest ? 'border-amber bg-accent-wash' : 'border-line-strong bg-transparent',
            )}
          >
            <span className={cn('font-mono text-[12px] leading-tight', digest ? 'text-signal' : 'text-text-muted')}>{digest ? '☑' : '☐'}</span>
            <div className="leading-relaxed">
              <div className={cn('font-mono text-[10.5px] tracking-[0.05em]', digest ? 'text-text-bone' : 'text-text-body')}>
                Kirim Ringkasan Setelah Cooldown
              </div>
              <div className="mt-1 text-[11.5px] text-text-muted">
                Bila nonaktif, mention yang tertahan tidak dikirim ulang -- hanya terlihat di notification bell.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[18px] border-t border-line pt-4">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-amber">Selalu Dikirim Segera · Tidak Terkena Cooldown</div>
          <div className="flex flex-col gap-1.5 font-mono text-[9.5px] leading-relaxed text-text-muted">
            <span>· Mention yang menyertai penugasan langsung (assignee baru)</span>
            <span>· Mention kepada PIC fase yang sedang aktif (phase handoff)</span>
            <span>· Notifikasi deadline dan eskalasi dari rule automation</span>
          </div>
        </div>

        {dirty && (
          <p className="mt-[18px] border border-amber p-2 font-mono text-[10px] leading-relaxed text-amber">
            Ada perubahan yang belum disimpan. Tekan &quot;Simpan Pengaturan&quot; untuk menerapkan.
          </p>
        )}
        <div className={cn('flex gap-2.5', !dirty && 'mt-[18px]')}>
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
          <Button variant="outline" onClick={handleReset} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Kembalikan
          </Button>
        </div>
      </div>

      <div className="flex min-w-[260px] flex-1 flex-col gap-3.5">
        <div className="border border-line bg-panel px-[18px] py-[17px]">
          <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Simulasi · {cooldown} Menit</div>
          <div className="flex flex-col">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-[46px] flex-shrink-0 pt-0.5 text-right font-mono text-[9px] text-text-dim">{t.at}</div>
                <div className="flex w-[9px] flex-shrink-0 flex-col items-center">
                  <span className={cn('mt-1.5 block h-[7px] w-[7px]', TONE_DOT[t.tone])} />
                  {i < timeline.length - 1 && <span className="w-px flex-1 bg-line" style={{ minHeight: 22 }} />}
                </div>
                <div className="min-w-0 flex-1 pb-3 leading-relaxed">
                  <div className="text-[12px] text-text-bone">{t.event}</div>
                  <div className={cn('mt-1 font-mono text-[8.5px]', TONE_TEXT[t.tone])}>{t.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line bg-panel px-[18px] py-[17px]">
          <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">Override Level Project</div>
          <p className="mb-3 font-mono text-[9.5px] leading-relaxed text-text-muted">
            Project Manager dapat menimpa nilai ini untuk project-nya sendiri. Nilai workspace berlaku pada project yang
            belum diatur.
          </p>
          <div className="flex flex-col gap-2.5">
            {projects.isLoading && <div className="font-mono text-[10px] text-text-muted">Memuat...</div>}
            {!projects.isLoading && projectList.length === 0 && (
              <div className="font-mono text-[10px] text-text-muted">Belum ada project di workspace ini.</div>
            )}
            {projectList.map((p) => {
              const overridden = p.mention_cooldown_minutes != null
              const label = p.is_archived ? 'ARSIP' : overridden ? `PROJECT SENDIRI · ${p.mention_cooldown_minutes} MENIT` : `IKUT WORKSPACE · ${cooldown} MENIT`
              const cls = p.is_archived ? 'border-line-strong text-text-muted' : overridden ? 'border-amber text-amber' : 'border-mint text-mint'
              return (
                <div key={p.id} className="flex items-center gap-2.5">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text-body">{p.name}</span>
                  <span className={cn('flex-shrink-0 whitespace-nowrap border px-1.5 py-1 font-mono text-[9px] font-semibold', cls)}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
