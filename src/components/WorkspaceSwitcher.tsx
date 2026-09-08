import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useMyContext, useSwitchContext } from '@/features/context/hooks'
import { cn } from '@/lib/utils'

interface WorkspaceSwitcherProps {
  activeWorkspaceId: string
}

// WorkspaceSwitcher (S16-01/02/03, forward-pull Track S4G, desain
// "Master UI User.dc.html" -- komentar kode desain: "Context switching
// (PRD §2.1 · US-085): akun yang juga memegang hak Group Admin melihat GA
// Console sebagai item khusus di ATAS daftar workspace"). BEDA dari
// dropdown "ROLE AKTIF · DEMO" (rolePickerVisible) yang sengaja tidak
// dibangun -- itu alat preview desainer, ini fitur produk sungguhan.
//
// Tidak render apa pun kalau user cuma punya SATU konteks (bukan GA, atau
// GA tanpa workspace membership sama sekali) -- tidak ada yang bisa
// dipindah ke mana pun.
export default function WorkspaceSwitcher({ activeWorkspaceId }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ctx = useMyContext()
  const switchContext = useSwitchContext()
  const navigate = useNavigate()

  const data = ctx.data
  if (!data) return null
  const { ga_console_enabled, workspace_memberships } = data
  if (!ga_console_enabled && workspace_memberships.length <= 1) return null

  const activeWorkspace = workspace_memberships.find((w) => w.workspace_id === activeWorkspaceId)

  const goToGaConsole = async () => {
    setOpen(false)
    await switchContext.mutateAsync('ga_console')
    navigate('/organizations')
  }
  const goToWorkspace = async (workspaceId: string) => {
    setOpen(false)
    if (workspaceId === activeWorkspaceId) return
    await switchContext.mutateAsync('workspace')
    navigate(`/workspaces/${workspaceId}/projects`)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-line px-3 py-1.5 text-left hover:border-line-strong"
      >
        <div className="leading-tight">
          <div className="font-mono text-[8.5px] tracking-[0.1em] text-text-dim">WORKSPACE · {workspace_memberships.length} DITUGASKAN</div>
          <div className="text-[13px] font-bold text-text-bone">{activeWorkspace?.name ?? '—'}</div>
        </div>
        <span className="font-mono text-[10px] text-text-dim">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 border border-line-strong bg-panel shadow-lg">
            {ga_console_enabled && (
              <button
                type="button"
                onClick={goToGaConsole}
                className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-3 text-left hover:bg-raised-2"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-signal bg-[oklch(0.24_0.03_45)] font-mono text-[13px] text-signal">
                  ⚙
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold text-text-bone">Konsol Group Admin</div>
                  <div className="font-mono text-[9.5px] text-text-muted">KONTEKS GRUP</div>
                </div>
                <span className="ml-auto font-mono text-[11px] text-text-dim">→</span>
              </button>
            )}
            <div className="px-3.5 pb-1 pt-2.5 font-mono text-[9px] tracking-[0.1em] text-text-faint">
              PINDAH WORKSPACE · {workspace_memberships.length} DITUGASKAN KE ANDA
            </div>
            {workspace_memberships.map((w) => {
              const active = w.workspace_id === activeWorkspaceId
              return (
                <button
                  key={w.workspace_id}
                  type="button"
                  onClick={() => goToWorkspace(w.workspace_id)}
                  className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-raised-2', active && 'bg-raised-2')}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-signal text-[11px] font-extrabold text-bg-deep">
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[9.5px] text-text-muted">{w.org_name}</div>
                    <div className="truncate text-[12.5px] text-text-bone">{w.name}</div>
                    <div className="font-mono text-[9px] text-text-dim">ROLE ANDA · {w.role.toUpperCase().replace(/_/g, ' ')}</div>
                  </div>
                  {active && <span className="font-mono text-[9px] text-mint">● AKTIF</span>}
                </button>
              )
            })}
            <p className="border-t border-line px-3.5 py-2 text-[10px] text-text-dim">
              Perpindahan konteks tercatat di Audit Trail workspace.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
