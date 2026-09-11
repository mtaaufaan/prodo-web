import { useState } from 'react'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
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

// GA Pengaturan Akun (Track S4G, desain "GA Pengaturan Akun.dc.html") --
// dijadwalkan tapi tidak pernah dibangun (lihat catatan di
// GroupAdminLayout.tsx dan implementation_gaps.md IG-59). Halaman standalone
// dengan tab strip sendiri (bukan bagian dari sidebar GroupAdminLayout),
// dibuka lewat tombol ⚙ topbar (GroupAdminLayout) -- pola sama
// SessionsPage/tombol lain yang berdiri sendiri di luar shell nav utama.
//
// Field "ZONA WAKTU TAMPILAN" pada desain SENGAJA tidak dibangun -- tidak
// ada kolom backend maupun pipeline render tanggal/waktu ber-timezone di
// mana pun pada konsol GA saat ini (IG-30 sengaja membatasi cakupan i18n ke
// Platform Admin saja), jadi kontrol itu akan murni kosmetik. Dicatat di
// implementation_gaps.md IG-59, bukan dihilangkan diam-diam.
const TABS = ['Profil', 'Keamanan', 'Sesi & Perangkat', 'Notifikasi'] as const
type Tab = (typeof TABS)[number]

function AccountSettingsPageContent() {
  const [tab, setTab] = useState<Tab>('Profil')

  return (
    <div className="min-h-screen bg-bg-deep">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Pengaturan Akun</h1>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'border px-[15px] py-[9px] font-mono text-[10px] uppercase tracking-[0.08em]',
                tab === t ? 'border-signal bg-signal text-bg-deep' : 'border-line text-text-muted hover:border-line-strong',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Profil' && <ProfilTab />}
        {tab === 'Keamanan' && <KeamananTab />}
        {tab === 'Sesi & Perangkat' && <SessionsPanel />}
        {tab === 'Notifikasi' && <NotifikasiTab />}
      </div>
    </div>
  )
}

function SectionCard({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
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

function ProfilTab() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
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
        <div>
          <div className="font-mono text-[8.5px] tracking-[0.14em] text-text-muted">ROLE</div>
          <div className="mt-1 font-mono text-[12px] text-signal">GROUP ADMIN</div>
        </div>
      </div>

      <SectionCard
        title="DATA PRIBADI"
        note="Nama, telepon, dan jabatan dapat Anda ubah sendiri. Email login ditetapkan Platform Admin -- hubungi tim PRODO untuk perubahannya."
      >
        <div className="flex flex-wrap gap-3.5">
          <Field label="Nama Lengkap">
            <Input value={current.displayName} onChange={(e) => setForm({ ...current, displayName: e.target.value })} />
          </Field>
          <Field label="Email Login · Dikelola Platform Admin">
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

function passwordScore(pw: string): number {
  let n = 0
  if (pw.length >= 12) n += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n += 1
  if (/[0-9]/.test(pw)) n += 1
  if (/[^A-Za-z0-9]/.test(pw)) n += 1
  return n
}

function KeamananTab() {
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

      {profile && <MfaSection mfaEnabled={profile.mfa_enabled} />}
    </div>
  )
}

function MfaSection({ mfaEnabled }: { mfaEnabled: boolean }) {
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
        showToast('QR baru diterbitkan -- MFA lama nonaktif sampai perangkat baru terverifikasi di bawah.')
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
        <span className="h-fit border border-mint px-2 py-1 font-mono text-[9px] font-semibold text-mint">
          {mfaEnabled ? 'AKTIF · WAJIB' : 'BELUM AKTIF'}
        </span>
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-text-muted">
        MFA tidak dapat dinonaktifkan untuk akun Group Admin. Yang dapat Anda lakukan: memindahkan MFA ke perangkat baru, atau membuat
        ulang kode pemulihan.
      </p>

      {!pending && (
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={startReset}
            disabled={setupMFA.isPending}
            className="border-mint font-mono text-[10px] uppercase tracking-[0.06em] text-mint hover:bg-mint/10"
          >
            Pindahkan ke Perangkat Baru
          </Button>
          <Button
            variant="outline"
            onClick={regenerate}
            disabled={regenerateCodes.isPending}
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            Buat Ulang Kode Pemulihan
          </Button>
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

const NOTIF_DEFS: { key: string; label: string; note: string }[] = [
  { key: 'org.storage_quota_threshold', label: 'Ambang kuota storage organisasi', note: 'Peringatan 80% dan kritis 95% per organisasi' },
  { key: 'webhook.delivery_failed', label: 'Kegagalan webhook', note: 'Seluruh 3 retry gagal dalam 30 menit' },
  { key: 'retention.deletion_scheduled', label: 'Jadwal penghapusan data', note: 'Peringatan H-60 dan pengingat final H-80' },
  { key: 'csv_import.completed', label: 'Hasil import CSV', note: 'Ringkasan baris berhasil dan dilewati' },
  { key: 'account.security_activity', label: 'Aktivitas keamanan akun', note: 'Login perangkat baru, ganti password, reset MFA' },
]

function NotifikasiTab() {
  const { data: prefs, isLoading } = useNotificationPreferences()
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
      note="Group Admin menerima notifikasi level grup: ambang kuota storage, kegagalan webhook, jadwal penghapusan data, dan hasil import. In-app selalu aktif."
    >
      <div className="flex flex-col">
        {NOTIF_DEFS.map((def) => {
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
        Perubahan preferensi tersimpan otomatis dan tercatat di Audit Trail.
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
