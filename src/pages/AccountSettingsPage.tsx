import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { GroupAdminOutletContext } from '@/components/GroupAdminLayout'
import type { WorkspaceOutletContext } from '@/components/WorkspaceLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMyContext } from '@/features/context/hooks'
import { ApiError } from '@/lib/api'
import { formatDateDMY } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'
import {
  useChangePassword,
  useNotificationPreferences,
  useProfile,
  useRegenerateBackupCodes,
  useSetupSelfMFA,
  useUpdateNotificationPreference,
  useUpdateProfile,
  useVerifySelfMFA,
} from '@/features/account-settings/hooks'
import { SessionsPanel } from '@/pages/SessionsPage'

// Pengaturan Akun (desain "User Pengaturan Akun.dc.html" role workspace,
// "GA Pengaturan Akun.dc.html" Group Admin).
//
// Field "ZONA WAKTU TAMPILAN" pada desain SENGAJA tidak dibangun -- tidak
// ada kolom backend maupun pipeline render tanggal/waktu ber-timezone di
// mana pun pada konsol GA saat ini (IG-30 sengaja membatasi cakupan i18n ke
// Platform Admin saja), jadi kontrol itu akan murni kosmetik. Dicatat di
// implementation_gaps.md IG-59, bukan dihilangkan diam-diam.
//
// Selalu dirender di dalam kerangka aplikasi (mode `embedded` desain): sub-tab di
// topbar kerangka, dibaca dari outlet context `view`; TIDAK ada halaman berdiri
// sendiri lagi (implementation_gaps.md IG-115/IG-116). Dua mode, dibedakan oleh
// :wsId di URL:
// - workspace (/workspaces/:wsId/account, WorkspaceLayout): 5 tab termasuk
//   "Workspace & Role", teks versi Admin Workspace, 6 jenis notifikasi workspace.
// - group (/account-settings, GroupAdminLayout): 4 tab, kartu GRUP · TIER, teks
//   versi Platform Admin, 5 jenis notifikasi Group Admin.
const WORKSPACE_TABS = ['Profil', 'Workspace & Role', 'Keamanan', 'Sesi & Perangkat', 'Notifikasi'] as const
const GROUP_TABS = ['Profil', 'Keamanan', 'Sesi & Perangkat', 'Notifikasi'] as const
type Tab = (typeof WORKSPACE_TABS)[number]

function AccountSettingsPageContent() {
  const { wsId } = useParams<{ wsId: string }>()
  const workspaceMode = !!wsId
  // Tanpa outlet context (mis. Platform Admin membuka rute ini langsung -- tidak
  // ada tautannya) tab tetap di Profil, tidak error.
  const outlet = useOutletContext<WorkspaceOutletContext | GroupAdminOutletContext | null>()
  const tabs: readonly Tab[] = workspaceMode ? WORKSPACE_TABS : GROUP_TABS
  const activeTab: Tab = tabs.find((t) => t === outlet?.view) ?? 'Profil'

  return (
    <div className="flex flex-col gap-4 p-6">
      {activeTab === 'Profil' && <ProfilTab workspaceMode={workspaceMode} />}
      {activeTab === 'Workspace & Role' && <WorkspaceRoleTab />}
      {activeTab === 'Keamanan' && <KeamananTab workspaceMode={workspaceMode} />}
      {activeTab === 'Sesi & Perangkat' && <SessionsPanel />}
      {activeTab === 'Notifikasi' && <NotifikasiTab workspaceMode={workspaceMode} />}
    </div>
  )
}

function SectionCard({ title, note, children }: { title?: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[15px] border border-line p-[18px_20px]">
      {title && (
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-signal">{title}</div>
          {note && <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-muted">{note}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[200px] flex-1">
      <label className="mb-[7px] block font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</label>
      {children}
      {hint && <div className="mt-1.5 font-mono text-[9px] leading-relaxed text-text-muted">{hint}</div>}
    </div>
  )
}

function roleLabelOf(code: string | undefined): string {
  return (code ?? '—').toUpperCase().replace(/_/g, ' ')
}

// Role + workspace aktif akun ini di workspace yang sedang dibuka (URL
// :wsId). Fallback ke role platform untuk GA/PA yang context-switch tanpa
// baris workspace_members.
function useActiveWorkspaceIdentity() {
  const { wsId } = useParams<{ wsId: string }>()
  const ctx = useMyContext().data
  const membership = ctx?.workspace_memberships.find((w) => w.workspace_id === wsId)
  const scoped = ctx?.project_scoped_projects.find((p) => p.workspace_id === wsId)
  return {
    role: roleLabelOf(membership?.role ?? scoped?.role ?? ctx?.platform_role),
    wsName: membership?.name ?? scoped?.workspace_name ?? '—',
    orgName: membership?.org_name ?? scoped?.org_name ?? '—',
  }
}

function ProfilTab({ workspaceMode }: { workspaceMode: boolean }) {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const identity = useActiveWorkspaceIdentity()
  const groupCtx = useOutletContext<GroupAdminOutletContext | null>()
  const tier = groupCtx?.tierName ?? '—'
  const showToast = useUIStore((s) => s.showToast)
  const [form, setForm] = useState<{ displayName: string; phone: string; title: string; locale: string } | null>(null)

  if (isLoading || !profile) return <p className="text-sm text-text-muted">Memuat...</p>

  const current = form ?? {
    displayName: profile.display_name,
    phone: profile.phone ?? '',
    title: profile.title ?? '',
    locale: profile.locale,
  }

  const monogram = profile.display_name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const submit = () => {
    if (current.displayName.trim().length < 2) {
      showToast('Nama tampil minimal 2 karakter.')
      return
    }
    updateProfile.mutate(
      { display_name: current.displayName.trim(), phone: current.phone.trim(), title: current.title.trim(), locale: current.locale },
      {
        onSuccess: () => {
          setForm(null)
          showToast('Perubahan profil tersimpan. Tercatat di Audit Trail.')
        },
        onError: () => showToast('Gagal menyimpan perubahan profil.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 border border-line bg-panel p-[18px_20px]">
        <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center bg-signal text-[19px] font-extrabold text-bg-deep">
          {monogram || '—'}
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="text-[17px] font-bold text-text-bone">{profile.display_name}</div>
          <div className="mt-[5px] font-mono text-[10px] text-text-muted">{profile.email}</div>
        </div>
        <div className="flex flex-wrap gap-[22px]">
          <div>
            <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-muted">ROLE</div>
            <div className="mt-[5px] font-mono text-[12px] text-signal">{workspaceMode ? identity.role : 'GROUP ADMIN'}</div>
          </div>
          <div>
            <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-muted">{workspaceMode ? 'WORKSPACE AKTIF' : 'GRUP · TIER'}</div>
            <div className="mt-[5px] font-mono text-[12px] text-mint">
              {workspaceMode
                ? `${identity.wsName} · ${identity.orgName}`
                : `${groupCtx?.groupName ?? '—'} · ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`}
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="DATA PRIBADI"
        note={
          workspaceMode
            ? 'Nama, telepon, dan jabatan dapat Anda ubah sendiri. Email login dan role workspace ditetapkan Admin Workspace -- hubungi admin workspace Anda untuk perubahannya.'
            : 'Nama, telepon, dan jabatan dapat Anda ubah sendiri. Email login, nama grup, dan tier ditetapkan Platform Admin -- hubungi tim PRODO untuk perubahannya.'
        }
      >
        <div className="flex flex-wrap gap-3.5">
          <Field label="Nama Lengkap">
            <Input value={current.displayName} onChange={(e) => setForm({ ...current, displayName: e.target.value })} />
          </Field>
          <Field label={workspaceMode ? 'Email Login · Dikelola Admin Workspace' : 'Email Login · Dikelola Platform Admin'}>
            <Input value={profile.email} readOnly disabled />
          </Field>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Field label="No. Telepon">
            <Input
              value={current.phone}
              onChange={(e) => setForm({ ...current, phone: e.target.value })}
              placeholder="+62 811 1900 210"
            />
          </Field>
          <Field label="Jabatan">
            <Input
              value={current.title}
              onChange={(e) => setForm({ ...current, title: e.target.value })}
              placeholder="Chief Information Officer"
            />
          </Field>
        </div>
        <Field label="Bahasa Antarmuka" hint="Pilihan pribadi -- disimpan untuk akun Anda, dipakai server untuk komunikasi seperti email.">
          <select
            value={current.locale}
            onChange={(e) => setForm({ ...current, locale: e.target.value })}
            className="h-9 w-full max-w-[240px] border border-line bg-input-bg px-2.5 font-mono text-[12px] text-text-body focus-visible:border-signal focus-visible:outline-none"
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </Field>
        <div className="flex gap-2.5 pt-1">
          <Button
            onClick={submit}
            disabled={updateProfile.isPending}
            className="bg-signal font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg-deep hover:bg-signal-hover"
          >
            {updateProfile.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
          {form && (
            <Button variant="outline" onClick={() => setForm(null)} className="font-mono text-[10.5px] uppercase tracking-[0.06em]">
              Batalkan
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

const ROLE_CHIP: Record<string, string> = {
  admin_workspace: 'border-signal text-signal',
  project_manager: 'border-blue text-blue',
  approver: 'border-violet text-violet',
  editor: 'border-mint text-mint',
}
const WS_ROLE_GRID = 'grid grid-cols-[minmax(140px,1.6fr)_minmax(120px,1.3fr)_minmax(112px,1.1fr)_minmax(76px,0.7fr)] gap-x-3'

// Tab "Workspace & Role" (desain "User Pengaturan Akun.dc.html"): role akun
// ini di SETIAP workspace tempat dia ditugaskan -- satu role aktif per
// workspace, ditetapkan Admin Workspace (read-only di sini). Sumber:
// GET /me/context. Workspace yang cuma terhubung lewat keanggotaan project
// (project-scoped-only) ikut ditampilkan, tanpa tanggal bergabung.
function WorkspaceRoleTab() {
  const { wsId } = useParams<{ wsId: string }>()
  const ctx = useMyContext().data
  if (!ctx) return <p className="text-sm text-text-muted">Memuat...</p>

  const rows = [
    ...ctx.workspace_memberships.map((w) => ({
      id: w.workspace_id, name: w.name, org: w.org_name, role: w.role, joined: formatDateDMY(w.joined_at),
    })),
    ...ctx.project_scoped_projects
      .filter((p) => !ctx.workspace_memberships.some((w) => w.workspace_id === p.workspace_id))
      .filter((p, i, all) => all.findIndex((x) => x.workspace_id === p.workspace_id) === i)
      .map((p) => ({ id: p.workspace_id, name: p.workspace_name, org: p.org_name, role: p.role, joined: null })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="ROLE SAYA PER WORKSPACE"
        note="Satu akun dapat memegang role berbeda di workspace berbeda; dalam satu workspace hanya ada satu role aktif. Role ditetapkan Admin Workspace dan tidak dapat Anda ubah sendiri."
      />
      <div className="overflow-auto border border-line">
        <div className="min-w-[560px]">
          <div className={cn(WS_ROLE_GRID, 'bg-raised-2 px-4 py-[11px] font-mono text-[9px] tracking-[0.1em] text-text-muted')}>
            <span>WORKSPACE</span>
            <span>ORGANISASI</span>
            <span>ROLE SAYA</span>
            <span>KONTEKS</span>
          </div>
          {rows.map((r) => {
            const active = r.id === wsId
            return (
              <div key={r.id} className={cn(WS_ROLE_GRID, 'items-center border-t border-line px-4 py-[13px]')}>
                <div className="min-w-0 leading-[1.35]">
                  <div className="truncate text-[13px] text-text-bone">{r.name}</div>
                  {r.joined && <div className="mt-1 font-mono text-[8.5px] text-text-dim">BERGABUNG {r.joined}</div>}
                </div>
                <span className="truncate font-mono text-[10px] text-text-muted">{r.org}</span>
                <span
                  className={cn(
                    'w-fit border px-2 py-[3px] font-mono text-[9.5px] font-semibold',
                    ROLE_CHIP[r.role] ?? 'border-text-dim text-text-dim',
                  )}
                >
                  {roleLabelOf(r.role)}
                </span>
                <span className={cn('font-mono text-[9px]', active ? 'text-mint' : 'text-text-dim')}>
                  {active ? '● AKTIF' : 'TERSEDIA'}
                </span>
              </div>
            )
          })}
          {rows.length === 0 && (
            <div className="border-t border-line px-4 py-[30px] text-center font-mono text-[10.5px] leading-[1.8] text-text-dim">
              Belum ada penugasan workspace pada akun ini.
            </div>
          )}
        </div>
      </div>
      <p className="font-mono text-[9px] leading-[1.8] text-text-dim">
        Berpindah workspace lewat switcher di sidebar akan otomatis mengganti role aktif beserta menu, sub-tab, dan aksi yang tersedia.
      </p>
    </div>
  )
}

function passwordScore(pw: string): number {
  let n = 0
  if (pw.length >= 12) n += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n += 1
  if (/[0-9]/.test(pw)) n += 1
  if (/[^A-Za-z0-9]/.test(pw)) n += 1
  return n
}

function KeamananTab({ workspaceMode }: { workspaceMode: boolean }) {
  const { data: profile } = useProfile()
  const showToast = useUIStore((s) => s.showToast)
  const changePassword = useChangePassword()
  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')

  const score = passwordScore(pwNew)
  const strengthLabels = [
    'Password baru belum memenuhi syarat.',
    'Lemah -- tambah panjang dan variasi karakter.',
    'Sedang -- belum memuat semua jenis karakter.',
    'Kuat -- hampir memenuhi seluruh syarat.',
    'Sangat kuat -- memenuhi seluruh syarat.',
  ]

  const submitPassword = () => {
    if (!pwOld) return setPwError('Password saat ini wajib diisi.')
    if (pwNew.length < 12) return setPwError('Password baru minimal 12 karakter.')
    if (score < 4) return setPwError('Password baru harus memuat huruf besar, huruf kecil, angka, dan simbol.')
    if (pwNew !== pwConfirm) return setPwError('Ulangi password baru belum sama.')
    if (pwNew === pwOld) return setPwError('Password baru tidak boleh sama dengan password saat ini.')
    setPwError('')

    changePassword.mutate(
      { current_password: pwOld, new_password: pwNew },
      {
        onSuccess: (res) => {
          setPwOld('')
          setPwNew('')
          setPwConfirm('')
          showToast(`Password diganti. ${res.revoked_other_sessions} sesi di perangkat lain diakhiri.`)
        },
        onError: (err) => {
          setPwError(err instanceof ApiError && err.code === 'INVALID_CURRENT_PASSWORD' ? err.message : 'Gagal mengganti password.')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="GANTI PASSWORD"
        note="Minimal 12 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol. Mengganti password mengakhiri seluruh sesi di perangkat lain."
      >
        <div className="flex flex-wrap gap-3.5">
          <Field label="Password Saat Ini">
            <Input type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} placeholder="••••••••••••" />
          </Field>
          <Field label="Password Baru">
            <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="••••••••••••" />
          </Field>
          <Field label="Ulangi Password Baru">
            <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="••••••••••••" />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn('h-[5px] flex-1', pwNew && i < score ? (score >= 4 ? 'bg-mint' : score >= 2 ? 'bg-amber' : 'bg-red') : 'bg-line')}
              />
            ))}
          </div>
          <div className="font-mono text-[9px] leading-relaxed text-text-muted">{strengthLabels[pwNew ? score : 0]}</div>
        </div>
        {pwError && (
          <div className="border border-red p-[11px_13px] font-mono text-[10px] leading-relaxed text-red">⚠ {pwError}</div>
        )}
        <div>
          <Button
            onClick={submitPassword}
            disabled={changePassword.isPending}
            className="bg-signal font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg-deep hover:bg-signal-hover"
          >
            {changePassword.isPending ? 'Memproses...' : 'Ganti Password'}
          </Button>
        </div>
      </SectionCard>

      {profile && <MfaSection mfaEnabled={profile.mfa_enabled} workspaceMode={workspaceMode} />}
    </div>
  )
}

// workspaceMode (role workspace, desain "User Pengaturan Akun.dc.html"): MFA
// OPSIONAL tapi dianjurkan -- beda dari Group Admin (wajib). Belum ada
// endpoint menonaktifkan MFA mandiri, jadi tombol "Nonaktifkan MFA" desain
// tidak dibangun (implementation_gaps.md IG-115).
function MfaSection({ mfaEnabled, workspaceMode }: { mfaEnabled: boolean; workspaceMode: boolean }) {
  const showToast = useUIStore((s) => s.showToast)
  const setupMFA = useSetupSelfMFA()
  const verifyMFA = useVerifySelfMFA()
  const regenerateCodes = useRegenerateBackupCodes()
  const [pending, setPending] = useState<{ qr: string; secret: string } | null>(null)
  const [otp, setOtp] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const startReset = () => {
    setupMFA.mutate(undefined, {
      onSuccess: (res) => {
        setPending({ qr: res.totp_qr_url, secret: res.totp_secret })
        showToast(
          mfaEnabled
            ? 'QR baru diterbitkan -- MFA lama nonaktif sampai perangkat baru terverifikasi di bawah.'
            : 'QR MFA diterbitkan -- pindai di authenticator app lalu konfirmasi kode OTP di bawah.',
        )
      },
      onError: () => showToast('Gagal memulai reset MFA.'),
    })
  }

  const confirmReset = () => {
    verifyMFA.mutate(otp, {
      onSuccess: (res) => {
        setPending(null)
        setOtp('')
        setBackupCodes(res.backup_codes)
        showToast('MFA aktif di perangkat baru. Kode cadangan baru diterbitkan.')
      },
      onError: () => showToast('Kode OTP tidak valid atau sudah kedaluwarsa.'),
    })
  }

  const regenerate = () => {
    regenerateCodes.mutate(undefined, {
      onSuccess: (res) => {
        setBackupCodes(res.backup_codes)
        showToast('10 kode pemulihan baru dibuat. Kode lama tidak lagi berlaku.')
      },
      onError: () => showToast('Gagal membuat ulang kode pemulihan.'),
    })
  }

  return (
    <SectionCard>
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-mint">MULTI-FACTOR AUTHENTICATION</div>
          <div className="mt-1.5 text-[14px] font-bold text-text-bone">Authenticator app</div>
        </div>
        <span
          className={cn(
            'h-fit border px-2 py-1 font-mono text-[9px] font-semibold',
            workspaceMode && !mfaEnabled ? 'border-amber text-amber' : 'border-mint text-mint',
          )}
        >
          {workspaceMode ? (mfaEnabled ? 'AKTIF · OPSIONAL' : 'NONAKTIF · DIANJURKAN') : mfaEnabled ? 'AKTIF · WAJIB' : 'BELUM AKTIF'}
        </span>
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-text-muted">
        {workspaceMode
          ? 'MFA bersifat opsional untuk role workspace, tetapi sangat dianjurkan -- terutama untuk Project Manager dan Admin Workspace. Group Admin dan Platform Admin wajib mengaktifkannya.'
          : 'MFA tidak dapat dinonaktifkan untuk akun Group Admin. Yang dapat Anda lakukan: memindahkan MFA ke perangkat baru, atau membuat ulang kode pemulihan.'}
      </p>

      {!pending && (
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={startReset}
            disabled={setupMFA.isPending}
            className="border-mint font-mono text-[10px] uppercase tracking-[0.06em] text-mint hover:bg-mint/10"
          >
            {workspaceMode && !mfaEnabled ? 'Aktifkan MFA' : 'Pindahkan ke Perangkat Baru'}
          </Button>
          {(!workspaceMode || mfaEnabled) && (
            <Button
              variant="outline"
              onClick={regenerate}
              disabled={regenerateCodes.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
            >
              Buat Ulang Kode Pemulihan
            </Button>
          )}
        </div>
      )}

      {pending && (
        <div className="flex flex-col items-start gap-2.5 border border-line p-3.5">
          <img src={pending.qr} alt="QR setup MFA" className="h-[160px] w-[160px] bg-white p-1.5" />
          <div className="font-mono text-[9px] text-text-muted">Kunci manual: {pending.secret}</div>
          <div className="flex items-end gap-2.5">
            <Field label="Kode OTP dari Perangkat Baru">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="123456" />
            </Field>
            <Button onClick={confirmReset} disabled={verifyMFA.isPending} className="bg-mint font-mono text-[10px] uppercase text-bg-deep">
              Konfirmasi
            </Button>
          </div>
        </div>
      )}

      {backupCodes && (
        <div className="border border-amber p-3.5 font-mono text-[11px] text-amber">
          <div className="mb-2 uppercase tracking-[0.08em]">Kode pemulihan baru -- simpan sekarang, tidak akan ditampilkan lagi</div>
          <div className="grid grid-cols-2 gap-1.5">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// Kunci event = backend (repository.GroupAdminNotificationEvents /
// WorkspaceNotificationEvents); label+catatan dari desain.
const GROUP_NOTIF_DEFS: { key: string; label: string; note: string }[] = [
  { key: 'org.storage_quota_threshold', label: 'Ambang kuota storage organisasi', note: 'Peringatan 80% dan kritis 95% per organisasi' },
  { key: 'webhook.delivery_failed', label: 'Kegagalan webhook', note: 'Seluruh 3 retry gagal dalam 30 menit' },
  { key: 'retention.deletion_scheduled', label: 'Jadwal penghapusan data', note: 'Peringatan H-60 dan pengingat final H-80' },
  { key: 'csv_import.completed', label: 'Hasil import CSV', note: 'Ringkasan baris berhasil dan dilewati' },
  { key: 'account.security_activity', label: 'Aktivitas keamanan akun', note: 'Login perangkat baru, ganti password, reset MFA' },
]
const WORKSPACE_NOTIF_DEFS: { key: string; label: string; note: string }[] = [
  { key: 'comment.mention', label: 'Mention pada komentar', note: 'Saat nama Anda di-tag @; tunduk pada cooldown mention workspace' },
  { key: 'task.pic_assigned', label: 'Penunjukan PIC & permintaan acknowledge', note: 'Saat Anda dipilih sebagai PIC fase berikutnya' },
  { key: 'task.assigned', label: 'Task ditugaskan ke saya', note: 'Assignee baru atau perubahan assignee pada task Anda' },
  { key: 'task.due_date', label: 'Due date & keterlambatan', note: 'Pengingat H-1 dan saat task melewati due date' },
  { key: 'approval.pending', label: 'Antrean approval', note: 'Task masuk ke tahap yang menunggu keputusan Anda' },
  { key: 'account.security_activity', label: 'Aktivitas keamanan akun', note: 'Login perangkat baru, ganti password, perubahan MFA' },
]

function NotifikasiTab({ workspaceMode }: { workspaceMode: boolean }) {
  const { data: prefs, isLoading } = useNotificationPreferences(workspaceMode ? 'workspace' : 'group')
  const defs = workspaceMode ? WORKSPACE_NOTIF_DEFS : GROUP_NOTIF_DEFS
  const update = useUpdateNotificationPreference()
  const showToast = useUIStore((s) => s.showToast)

  if (isLoading || !prefs) return <p className="text-sm text-text-muted">Memuat...</p>

  const toggle = (eventType: string, channel: 'push' | 'email') => {
    const current = prefs.find((p) => p.event_type === eventType)
    if (!current) return
    update.mutate(
      { event_type: eventType, push: channel === 'push' ? !current.push : current.push, email: channel === 'email' ? !current.email : current.email },
      { onError: () => showToast('Gagal memperbarui preferensi notifikasi.') },
    )
  }

  return (
    <SectionCard
      title="KANAL NOTIFIKASI SAYA"
      note={
        workspaceMode
          ? 'Notifikasi mengikuti task dan workspace tempat Anda bekerja. In-app selalu aktif dan tidak dapat dimatikan.'
          : 'Group Admin menerima notifikasi level grup: ambang kuota storage, kegagalan webhook, jadwal penghapusan data, dan hasil import. In-app selalu aktif.'
      }
    >
      <div className="flex flex-col">
        {defs.map((def) => {
          const p = prefs.find((x) => x.event_type === def.key)
          return (
            <div key={def.key} className="flex flex-wrap items-center gap-3.5 border-t border-line py-3.5 first:border-t-0">
              <div className="min-w-[200px] flex-1">
                <div className="text-[13px] text-text-bone">{def.label}</div>
                <div className="mt-1 font-mono text-[9px] text-text-muted">{def.note}</div>
              </div>
              <div className="flex gap-2">
                <span className="border border-mint bg-mint/10 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.06em] text-mint">
                  IN-APP
                </span>
                <button
                  type="button"
                  onClick={() => toggle(def.key, 'push')}
                  className={cn(
                    'border px-3 py-1.5 font-mono text-[9.5px] tracking-[0.06em]',
                    p?.push ? 'border-signal bg-signal text-bg-deep' : 'border-line text-text-muted',
                  )}
                >
                  PUSH
                </button>
                <button
                  type="button"
                  onClick={() => toggle(def.key, 'email')}
                  className={cn(
                    'border px-3 py-1.5 font-mono text-[9.5px] tracking-[0.06em]',
                    p?.email ? 'border-signal bg-signal text-bg-deep' : 'border-line text-text-muted',
                  )}
                >
                  EMAIL
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="font-mono text-[9px] leading-relaxed text-text-muted">
        Push notification hanya berlaku untuk mobile client. Perubahan preferensi tersimpan otomatis dan tercatat di Audit Trail.
      </div>
    </SectionCard>
  )
}

export default function AccountSettingsPage() {
  return (
    <ErrorBoundary>
      <AccountSettingsPageContent />
    </ErrorBoundary>
  )
}
