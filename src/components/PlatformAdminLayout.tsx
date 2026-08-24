import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

// Kerangka konsol Platform Admin -- diekstrak dari desain
// "Platform Admin Console.dc.html" (sidebar navigasi 4 tab + sign out),
// dibangun 2026-08-24 atas permintaan user supaya bentuk penuh menu PA
// terlihat sejak sekarang, tinggal disambung begitu task-nya selesai.
//
// TIDAK disalin dari desain: eyebrow "Platform Layer -- EPIC 1 · 4.5 ·
// 4.6" (anotasi dokumen desain, sama kelas dengan referensi "§" yang
// sudah dihilangkan dari PlatformLoginPage), panel swatch TYPE.
//
// Toggle bahasa ID/EN -- SEKARANG BENERAN BERFUNGSI (i18next), koreksi
// dari asumsi awal "belum terpasang" (ternyata sudah terpasang app-wide
// tapi tidak dipakai satu halaman pun, ditemukan user). Cakupan
// terjemahan SENGAJA dibatasi ke teks kerangka ini saja (judul, nav,
// sign out) -- isi halaman (form, tabel) di dalamnya belum diterjemahkan,
// itu pekerjaan i18n penuh yang terpisah.
//
// Item nav DIPERLUAS dari 4 tab asli desain (Group Admin Mgmt/Tier &
// Kuota/Right to Erasure/Audit Trail) dengan Direktori Grup (US-083) dan
// Pengaturan Keamanan (S4P-18) -- keduanya fitur nyata yang dijadwalkan
// setelah mockup asli dibuat. Item yang halamannya belum dibangun
// ditampilkan non-aktif ("SEGERA"), bukan link mati.
function useNavItems() {
  const { t } = useTranslation()
  return [
    { icon: '◉', label: t('platformAdminLayout.nav.groupAdmins'), to: '/platform/group-admins' },
    { icon: '▤', label: t('platformAdminLayout.nav.groupDirectory'), to: null },
    { icon: '▦', label: t('platformAdminLayout.nav.tiers'), to: null },
    { icon: '⌗', label: t('platformAdminLayout.nav.erasure'), to: null },
    { icon: '☰', label: t('platformAdminLayout.nav.auditTrail'), to: null },
    { icon: '◫', label: t('platformAdminLayout.nav.dashboard'), to: null },
    { icon: '⚙', label: t('platformAdminLayout.nav.securitySettings'), to: '/platform/security-settings' },
  ]
}

function PlatformNavItem({ icon, label, to, soonLabel }: { icon: string; label: string; to: string | null; soonLabel: string }) {
  if (!to) {
    return (
      <div className="flex cursor-not-allowed items-center gap-2.5 border-l-2 border-transparent px-3 py-2.5 text-[12.5px] text-text-dim">
        <span className="w-4 font-mono text-[11px]">{icon}</span>
        {label}
        <span className="ml-auto font-mono text-[9px] tracking-[0.08em]">{soonLabel}</span>
      </div>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-[12.5px]',
          isActive
            ? 'border-pa-accent bg-pa-step-active text-text-bone'
            : 'border-transparent text-text-muted hover:text-text-bone',
        )
      }
    >
      <span className="w-4 font-mono text-[11px]">{icon}</span>
      {label}
    </NavLink>
  )
}

function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith('en') ? 'en' : 'id'
  return (
    <div className="mt-3 flex gap-1.5 border-t border-pa-border pt-3 font-mono text-[10.5px] tracking-[0.08em]">
      {(['id', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          className={cn(
            'border px-2.5 py-1',
            current === lng ? 'border-pa-accent text-text-bone' : 'border-pa-border text-text-muted',
          )}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function PlatformAdminLayout() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const navigate = useNavigate()
  const clearSession = useAuthStore((state) => state.clearSession)

  const handleSignOut = () => {
    clearSession()
    navigate('/platform/login')
  }

  return (
    <div className="min-h-screen bg-pa-bg p-10">
      <div className="mx-auto mb-5 flex max-w-[1540px] flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">{t('platformAdminLayout.title')}</h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-text-muted">
            {t('platformAdminLayout.description')}
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1540px] overflow-hidden border border-pa-border bg-pa-header">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-pa-border">
          <div className="border-b border-pa-border p-4">
            <div className="font-mono text-[10px] tracking-[0.14em] text-text-muted">
              {t('platformAdminLayout.scope')}
            </div>
            <div className="mt-1 text-sm font-bold text-pa-accent">{t('platformAdminLayout.scopeValue')}</div>
            <LanguageToggle />
          </div>
          <nav className="flex flex-col gap-0.5 p-2">
            {navItems.map((item) => (
              <PlatformNavItem key={item.label} {...item} soonLabel={t('platformAdminLayout.soon')} />
            ))}
          </nav>
          <div className="mt-auto flex justify-end border-t border-pa-border p-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border border-pa-border px-3.5 py-2 font-mono text-[11px] tracking-[0.06em] text-pa-accent"
            >
              {t('platformAdminLayout.signOut')} ⏻
            </button>
          </div>
        </aside>
        <main className="min-h-[600px] flex-1 overflow-auto bg-pa-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
