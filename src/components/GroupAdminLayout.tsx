import { useCallback, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useGroups } from '@/features/platform-admin/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// Kerangka konsol Group Admin -- dibangun ulang 2026-08-31 setelah user
// menunjukkan versi awal (S4G-01, H12) terlalu disederhanakan dibanding
// sumber desain "Master UI Group Admin.dc.html" (dibaca ulang langsung
// via DesignSync, bukan dari ringkasan riset -- lihat memory
// claude-design-prodo-project.md). Versi awal cuma satu sidebar; ini
// mengikuti struktur asli: icon rail + sidebar konteks + topbar + baris
// tab tampilan.
//
// TIDAK disalin dari desain (chrome dokumentasi tool desain, sama kelas
// dengan panel swatch TYPE yang sudah dihilangkan dari halaman lain):
// header besar "Application Shell -- Group Admin" / "Master UI -- Group
// Admin" di atas kotak shell.
//
// Disengaja tetap non-fungsional (SEGERA/inert, bukan link mati) karena
// tidak ada data/endpoint nyata untuk itu sama sekali di backend saat ini:
// - Search bar (⌘K) -- tidak ada endpoint pencarian lintas-entity.
// - Ikon notifikasi -- tidak ada GET /notifications (in-app notification
//   CUMA ditulis saat AssignRole, S2-05, tidak pernah dibaca ulang).
// - Ikon pengaturan di icon rail + dropdown profil (bahasa/pengaturan akun)
//   -- halaman "GA Pengaturan Akun" belum dibangun; toggle bahasa GA area
//   belum di-wire ke i18next (sama keterbatasan PlatformAdminLayout, IG-30
//   sengaja membatasi cakupan i18n ke PA saja).
// Tombol CTA topbar (S4G-03 fix, ditemukan user 2026-08-31 lewat login
// sungguhan ke demo interaktif "PRODO Alur Aplikasi - Standalone.html"):
// desain menaruh SATU tombol create di topbar (beda label per menu aktif,
// ctaMap di Master UI Group Admin.dc.html), konten halaman TIDAK pernah
// punya judul/tombol duplikat sendiri. Percobaan awal (S4G-01) menyimpulkan
// sebaliknya (CTA di halaman, topbar kosong) -- salah baca, dibalik di sini.
// Halaman anak mendaftarkan handler-nya sendiri lewat `registerCta` di
// outlet context (lihat OrganizationManagementPage) -- shell tidak perlu
// tahu apa pun soal CreateOrganizationModal, pola yang sama akan dipakai
// nav lain begitu halamannya nyata (mis. "+ Workspace" untuk Workspace).
const NAV_ITEMS = [
  { key: 'kinerja', icon: '◎', label: 'Performance Dashboard', to: null as string | null, tabs: null as string[] | null, cta: null as string | null },
  { key: 'ringkasan', icon: '◧', label: 'Ringkasan', to: null, tabs: null, cta: null },
  { key: 'organisasi', icon: '▤', label: 'Organisasi', to: '/organizations', tabs: ['Semua', 'Aktif', 'Nonaktif'], cta: '+ Buat Organisasi' },
  { key: 'workspace', icon: '◫', label: 'Workspace', to: null, tabs: null, cta: null },
  { key: 'storage', icon: '▦', label: 'Storage & Kuota', to: null, tabs: null, cta: null },
  { key: 'members', icon: '◉', label: 'Members & Roles', to: null, tabs: null, cta: null },
  { key: 'retensi', icon: '◷', label: 'Data Retention', to: null, tabs: null, cta: null },
  { key: 'import', icon: '⬇', label: 'Import Data', to: null, tabs: null, cta: null },
  { key: 'webhook', icon: '⌗', label: 'Webhook', to: null, tabs: null, cta: null },
  { key: 'bahasa', icon: '🌐', label: 'Bahasa & Lokal', to: null, tabs: null, cta: null },
  { key: 'audit', icon: '☰', label: 'Audit Trail', to: null, tabs: null, cta: null },
]

// Konteks diteruskan ke halaman yang dibungkus lewat <Outlet context=.../>
// -- `view` (S4G-03 fix) untuk baris tab tampilan (Semua/Aktif/Nonaktif),
// `registerCta` (S4G-03 fix) supaya halaman anak mendaftarkan aksi tombol
// CTA topbar tanpa shell perlu tahu detail halamannya. `groupId` (S4G-32,
// group switcher) -- grup yang SEDANG AKTIF dipilih, satu-satunya sumber
// kebenaran dipakai halaman anak (mis. OrganizationManagementPage,
// CreateOrganizationModal) supaya tidak perlu resolve grup sendiri-sendiri.
export interface GroupAdminOutletContext {
  view: string
  registerCta: (handler: (() => void) | null) => void
  groupId: string
}

function GroupAdminNavItem({ icon, label, to }: { icon: string; label: string; to: string | null }) {
  if (!to) {
    return (
      <div className="flex cursor-not-allowed items-center gap-2.5 border-l-2 border-transparent px-3 py-2.5 text-[12.5px] text-text-dim">
        <span className="w-4 font-mono text-[11px]">{icon}</span>
        {label}
        <span className="ml-auto font-mono text-[9px] tracking-[0.08em]">SEGERA</span>
      </div>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-[12.5px]',
          isActive ? 'border-signal bg-bg-deep text-text-bone' : 'border-transparent text-text-muted hover:text-text-bone',
        )
      }
    >
      <span className="w-4 font-mono text-[11px]">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function GroupAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const platformRole = useAuthStore((state) => state.user?.platform_role)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const groups = useGroups('')
  const [view, setView] = useState('Semua')
  const [ctaHandler, setCtaHandler] = useState<(() => void) | null>(null)
  const registerCta = useCallback((handler: (() => void) | null) => setCtaHandler(() => handler), [])

  const activeNav = useMemo(() => NAV_ITEMS.find((n) => n.to && location.pathname.startsWith(n.to)) ?? null, [location.pathname])

  // Group switcher (S4G-32, Track S4G): sebagian besar GA cuma punya 1
  // grup (switcher tidak dirender sama sekali di kasus itu) -- tapi
  // group_admin_assignments many-to-many (DATABASE_SCHEMA.md §5.6, bisa
  // terjadi lewat TransferGroup S4P-03) mengizinkan lebih dari satu. `?
  // group_id=` di URL (bukan state React biasa) supaya bisa di-refresh/
  // dibagikan dan tidak hilang saat pindah halaman dalam shell ini.
  const groupIdParam = searchParams.get('group_id')
  const activeGroup = useMemo(
    () => groups.data?.find((g) => g.id === groupIdParam) ?? groups.data?.[0] ?? null,
    [groups.data, groupIdParam],
  )
  const hasMultipleGroups = (groups.data?.length ?? 0) > 1
  const handleSwitchGroup = (groupId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('group_id', groupId)
    setSearchParams(next)
  }

  if (platformRole === 'platform_admin') {
    return <Outlet />
  }

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }

  const group = activeGroup
  const groupName = group?.name ?? '—'
  const tierShort = (group?.tier ?? '—').slice(0, 3).toUpperCase()
  const monogram = (user?.display_name ?? '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-bg-deep p-6 text-text-body">
      <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1540px] overflow-hidden border border-line bg-panel">
        {/* ICON RAIL */}
        <div className="flex w-[58px] flex-shrink-0 flex-col items-center gap-1.5 border-r border-line py-3.5">
          <div className="mb-2.5 flex h-[34px] w-[34px] items-center justify-center bg-signal text-[16px] font-black text-bg-deep">
            P
          </div>
          <button
            type="button"
            disabled
            title="Pencarian lintas organisasi belum tersedia"
            className="flex h-[38px] w-[38px] cursor-not-allowed items-center justify-center border-l-2 border-transparent font-mono text-[15px] text-text-dim"
          >
            ⌕
          </button>
          <button
            type="button"
            disabled
            title="Pengaturan akun belum tersedia"
            className="flex h-[38px] w-[38px] cursor-not-allowed items-center justify-center border-l-2 border-transparent font-mono text-[15px] text-text-dim"
          >
            ⚙
          </button>
          <div className="mt-auto flex flex-col items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-violet font-mono text-[11px] font-bold text-bg-deep"
              title={user?.display_name ?? ''}
            >
              {monogram || '—'}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Keluar"
              className="flex h-[34px] w-[34px] items-center justify-center border border-line-strong text-[14px] text-text-muted hover:border-signal hover:text-signal"
            >
              ⏻
            </button>
          </div>
        </div>

        {/* CONTEXT SIDEBAR */}
        <aside className="flex w-60 flex-shrink-0 flex-col border-r border-line">
          <div className="flex h-[58px] flex-shrink-0 items-center gap-2.5 border-b border-line px-3.5">
            <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center bg-signal text-[14px] font-extrabold text-bg-deep">
              {groupName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-muted">GRUP</div>
              {hasMultipleGroups ? (
                <select
                  value={activeGroup?.id ?? ''}
                  onChange={(e) => handleSwitchGroup(e.target.value)}
                  title="Ganti grup aktif"
                  className="w-full truncate border-none bg-transparent text-[14px] font-bold text-text-bone outline-none"
                >
                  {groups.data?.map((g) => (
                    <option key={g.id} value={g.id} className="bg-panel text-text-body">
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="truncate text-[14px] font-bold">{groupName}</div>
              )}
            </div>
            <span className="border border-mint px-1.5 py-0.5 font-mono text-[8px] tracking-[0.06em] text-mint">
              {tierShort}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-auto px-1.5 py-3">
            <div className="px-2.5 pb-1 pt-1.5 font-mono text-[9px] tracking-[0.14em] text-text-faint">KELOLA GRUP</div>
            {NAV_ITEMS.map((item) => (
              <GroupAdminNavItem key={item.key} icon={item.icon} label={item.label} to={item.to} />
            ))}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2.5 border-t border-line px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center border border-signal bg-[oklch(0.24_0.03_45)] font-mono text-[13px] text-signal">
              ◈
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12.5px] font-semibold">{user?.display_name ?? '—'}</div>
              <div className="font-mono text-[9px] text-text-muted">Group Admin</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[58px] flex-shrink-0 items-center gap-4 border-b border-line px-5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
              <span>{groupName}</span>
              <span className="text-text-faint">/</span>
              <span className="text-text-bone">{activeNav ? `${activeNav.label} · ${view}` : 'Ringkasan'}</span>
            </div>
            <div className="flex-1" />
            <input
              disabled
              title="Pencarian lintas organisasi belum tersedia"
              placeholder="Cari nama, email, organisasi…"
              className="hidden max-w-[220px] flex-1 cursor-not-allowed border border-line bg-transparent px-3 py-1.5 font-mono text-[11px] text-text-dim outline-none placeholder:text-text-dim md:block"
            />
            <button
              type="button"
              disabled
              title="Notifikasi belum tersedia"
              className="flex h-[34px] w-[34px] flex-shrink-0 cursor-not-allowed items-center justify-center border border-line text-[14px] text-text-dim"
            >
              🔔
            </button>
            {activeNav?.cta && ctaHandler && (
              <button
                type="button"
                onClick={ctaHandler}
                className="flex-shrink-0 whitespace-nowrap bg-signal px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-bg-deep"
              >
                {activeNav.cta}
              </button>
            )}
          </div>

          {activeNav?.tabs && (
            <div className="flex h-[46px] flex-shrink-0 items-stretch gap-0.5 border-b border-line px-3.5">
              {activeNav.tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setView(tab)}
                  className={cn(
                    'flex items-center border-b-2 px-3.5 font-mono text-[11px] tracking-[0.04em]',
                    view === tab ? 'border-signal text-text-bone' : 'border-transparent text-text-muted',
                  )}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto bg-content">
            <Outlet context={{ view, registerCta, groupId: activeGroup?.id ?? '' } satisfies GroupAdminOutletContext} />
          </div>
        </main>
      </div>
    </div>
  )
}
