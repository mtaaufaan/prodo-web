import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { badgeLabel, notificationHref, notificationMeta, relativeTime } from '@/features/notifications/format'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/hooks'
import type { AppNotification } from '@/features/notifications/types'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="border-y border-line bg-raised-1 px-3.5 py-1.5 font-mono text-[8.5px] tracking-[0.14em] text-text-dim">{children}</div>
}

function Item({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const meta = notificationMeta(n.type)
  const where = [n.task_code, n.project_name].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        'flex w-full gap-3 border-b border-line-subtle px-3.5 py-3 text-left hover:bg-raised-1',
        !n.is_read && 'border-l-2 border-l-signal bg-signal/5',
      )}
    >
      <span className={cn('mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center border font-mono text-[12px]', meta.tone)} title={meta.label}>
        {meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-snug text-text-bone">
          {n.actor_name && <b className="font-bold">{n.actor_name} </b>}
          {n.title}
        </span>
        {n.body && <span className="mt-0.5 block truncate text-[11px] text-text-muted">{n.body}</span>}
        <span className="mt-1 flex items-center gap-2 font-mono text-[8.5px] text-text-dim">
          {where && <span className="truncate text-signal">{where}</span>}
          <span className="ml-auto flex-shrink-0">{relativeTime(n.created_at)}</span>
        </span>
      </span>
    </button>
  )
}

// NotificationBell -- lonceng topbar + panel notifikasi in-app (US-034, S6E-13, IG-144). Tombol + badge amber mengikuti
// "Master UI User.dc.html"; panel dirancang dari AC US-034 (desain tidak memuat markup panel): grup Belum Dibaca/Sudah Dibaca,
// Tandai Semua Dibaca, klik membuka task, "Muat lebih banyak". Data dari GET /me/notifications (S6E-14; sebelum itu mock).
export default function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate()
  const showToast = useUIStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const query = useNotifications(workspaceId)
  const markRead = useMarkNotificationRead(workspaceId)
  const markAll = useMarkAllNotificationsRead(workspaceId)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const unread = query.data?.pages[0]?.unread_count ?? 0
  const unreadItems = items.filter((n) => !n.is_read)
  const readItems = items.filter((n) => n.is_read)
  const badge = query.isError ? '' : badgeLabel(unread)

  const openItem = (n: AppNotification) => {
    const href = notificationHref(n, workspaceId)
    const go = () => {
      setOpen(false)
      if (href) navigate(href)
    }
    if (n.is_read) {
      go()
      return
    }
    markRead.mutate(n.id, {
      onSuccess: go,
      onError: () => showToast('Gagal menandai notifikasi dibaca.'),
    })
  }

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
        title="Notifikasi"
        className="relative flex h-[34px] w-[34px] items-center justify-center border border-line text-[14px] text-text-muted hover:border-line-strong"
      >
        🔔
        {badge && (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[16px] place-items-center bg-amber px-1 font-mono text-[9px] font-bold text-bg-deep">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Panel notifikasi" className="absolute right-0 top-[42px] z-50 flex max-h-[520px] w-[380px] max-w-[92vw] flex-col border border-line-strong bg-panel shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-muted">NOTIFIKASI</span>
            <span className="font-mono text-[9px] text-text-dim">· {unread} BELUM DIBACA</span>
            <button
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate(undefined, { onError: () => showToast('Gagal menandai semua notifikasi dibaca.') })}
              className="ml-auto font-mono text-[9px] tracking-[0.06em] text-signal hover:underline disabled:cursor-not-allowed disabled:text-text-dim disabled:no-underline"
            >
              TANDAI SEMUA DIBACA
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.isLoading && <p className="p-5 font-mono text-[10.5px] text-text-muted">Memuat...</p>}
            {query.isError && <p className="p-5 font-mono text-[10.5px] text-destructive">⚠ Gagal memuat notifikasi.</p>}
            {!query.isLoading && !query.isError && items.length === 0 && (
              <p className="p-6 text-center font-mono text-[10.5px] text-text-muted">Belum ada notifikasi.</p>
            )}
            {unreadItems.length > 0 && (
              <>
                <GroupLabel>BELUM DIBACA · {unreadItems.length}</GroupLabel>
                {unreadItems.map((n) => <Item key={n.id} n={n} onOpen={openItem} />)}
              </>
            )}
            {readItems.length > 0 && (
              <>
                <GroupLabel>SUDAH DIBACA</GroupLabel>
                {readItems.map((n) => <Item key={n.id} n={n} onOpen={openItem} />)}
              </>
            )}
            {query.hasNextPage && (
              <button
                type="button"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
                className="w-full border-t border-line px-3.5 py-2.5 font-mono text-[9.5px] tracking-[0.06em] text-text-muted hover:text-signal disabled:opacity-50"
              >
                {query.isFetchingNextPage ? 'Memuat...' : 'MUAT LEBIH BANYAK'}
              </button>
            )}
          </div>
          <div className="border-t border-line px-3.5 py-2 font-mono text-[8.5px] text-text-dim">Notifikasi lebih dari 30 hari dihapus otomatis dari panel.</div>
        </div>
      )}
    </div>
  )
}
