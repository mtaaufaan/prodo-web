import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/lib/api'
import { useCompletePlatformMfaSetup, usePlatformLogin } from '@/features/platform-auth/hooks'
import { isMfaSetupRequired } from '@/features/platform-auth/types'

// S4P-19 (implementation_gaps.md IG-20): halaman login KHUSUS Platform
// Admin, dicocokkan LANGSUNG dari source asli "Platform Admin
// Login.dc.html" (dibaca via DesignSync dari project Claude Design user,
// project 90027a31-819b-4d24-8a13-a09c45731292) -- nilai oklch/pixel di
// bawah ini persis dari sana, bukan perkiraan. Sebelumnya (implementasi
// pertama H1) halaman ini SALAH DIBANGUN dengan layout split-panel hasil
// adaptasi Login.tsx TANPA mengecek DesignSync lebih dulu -- ditemukan
// user lewat screenshot, diperbaiki di sini.
//
// Sengaja TIDAK direplikasi dari file desain:
// - Panel "TYPE / Archivo · Plex Mono" + swatch warna di header -> chrome
//   dokumentasi tool desain (anotasi untuk reviewer), bukan bagian UI
//   produk (pola sama seperti Login.tsx mengecualikan panel serupa).
// - Navbar step "1 LOGIN+MFA / 2 PLATFORM CONSOLE" + "SCOPE"/"AKHIRI SESI"
//   di atas -> itu chrome dari file WRAPPER terpisah ("PRODO Alur
//   Platform Admin.dc.html", demo navigation antar-layar untuk reviewer),
//   BUKAN bagian "Platform Admin Login.dc.html" itu sendiri.
// - Link "← ULANGI DEMO" -> murni kontrol demo/prototipe (reset state
//   lokal), tidak relevan untuk aplikasi sungguhan.
// - Toggle bahasa ID/EN -> tampil sesuai desain tapi TIDAK di-wire ke
//   i18next (sama seperti Login.tsx, halaman ini belum diterjemahkan).
// - "Referensi PRD §2.1, §4.1, §4.5." di deskripsi header -> anotasi
//   dokumentasi desain (rujukan spek untuk reviewer), bukan salinan
//   produk yang perlu ditampilkan ke pengguna sungguhan.
//
// Ditambahkan MELEBIHI cakupan file desain (yang mengasumsikan MFA sudah
// terpasang di seluruh demo -- tidak pernah memodelkan skenario "belum
// pernah setup"): step enrolasi MFA pertama kali (QR code + secret) dan
// tampilan kode cadangan + checkbox konfirmasi. Keduanya WAJIB secara
// backend (S4P-14, AuthService.VerifyMFA) karena akun Platform Admin
// tidak melalui alur invite+aktivasi seperti Group Admin (US-073) --
// "belum ada MFA" adalah kondisi normal login pertama, bukan kondisi
// yang bisa diasumsikan sudah beres seperti di demo. Gaya visual step
// tambahan ini mengikuti bahasa desain yang sama (kartu gelap, aksen
// oklch(0.72 0.15 25)), bukan diklaim sebagai bagian file desain asli.
//
// ⚠️ Teks "Session timeout: 10 menit idle · sliding disabled" persis dari
// desain, TAPI belum diimplementasikan backend (S4P-15, dijadwalkan Hari
// 2) -- pola sama seperti catatan lockout/audit-trail di Login.tsx:
// copy produk tetap ditampilkan sesuai desain, gap-nya dicatat terpisah
// (implementation_gaps.md), bukan diubah sepihak.

const C = {
  bg: 'oklch(0.13 0.006 60)',
  card: 'oklch(0.16 0.006 60)',
  border: 'oklch(0.32 0.02 25)',
  text: 'oklch(0.93 0.01 80)',
  accent: 'oklch(0.72 0.15 25)',
  mint: 'oklch(0.78 0.12 165)',
  dim: 'oklch(0.55 0.01 70)',
  dimmer: 'oklch(0.5 0.01 70)',
  faint: 'oklch(0.42 0.008 60)',
  inputBg: 'oklch(0.12 0.006 60)',
  inputBorder: 'oklch(0.3 0.008 60)',
  errorBg: 'oklch(0.24 0.03 45 / 0.12)',
  infoBg: 'oklch(0.19 0.01 25)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.inputBg,
  border: `1px solid ${C.inputBorder}`,
  color: C.text,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  padding: '12px 13px',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  background: C.accent,
  color: C.bg,
  border: 'none',
  padding: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9.5,
  letterSpacing: '0.14em',
  color: C.dimmer,
  marginBottom: 8,
}

function ErrorBanner({ children }: { children: string }) {
  return (
    <div
      style={{
        border: `1px solid ${C.accent}`,
        background: C.errorBg,
        padding: '11px 13px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        color: C.accent,
        lineHeight: 1.6,
      }}
    >
      ⚠ {children}
    </div>
  )
}

type Step = 'credentials' | 'enroll-mfa' | 'backup-codes' | 'verify-otp' | 'success'

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const login = usePlatformLogin()
  const completeMfaSetup = useCompletePlatformMfaSetup()

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [enrollChallenge, setEnrollChallenge] = useState<{ qrUrl: string; secret: string } | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [savedAck, setSavedAck] = useState(false)
  const [credError, setCredError] = useState<string | null>(null)
  // Percobaan PERTAMA yang dibalas INVALID_OTP cuma prompt "sekarang
  // masukkan OTP" (rute ke step verify-otp), BUKAN error sungguhan --
  // banner error cuma boleh tampil setelah user benar-benar submit OTP
  // dari step ini sendiri.
  const [otpSubmitted, setOtpSubmitted] = useState(false)

  const onSubmitCredentials = () => {
    if (!email.trim() || !password.trim()) {
      setCredError('Email dan password wajib diisi.')
      return
    }
    setCredError(null)
    login.mutate(
      { email: email.trim(), password, mfaCode: '' },
      {
        onSuccess: (result) => {
          if (isMfaSetupRequired(result)) {
            setEnrollChallenge({ qrUrl: result.totp_qr_url, secret: result.totp_secret })
            setStep('enroll-mfa')
          } else {
            setStep('success')
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'INVALID_OTP') {
            // Akun SUDAH enrolled -- tinggal minta OTP, sesuai STEP 2/2 desain.
            setStep('verify-otp')
          } else if (err instanceof ApiError) {
            setCredError(err.message)
          }
        },
      },
    )
  }

  const onSubmitVerifyOtp = () => {
    setOtpSubmitted(true)
    login.mutate(
      { email: email.trim(), password, mfaCode: otpCode },
      {
        onSuccess: (result) => {
          if (!isMfaSetupRequired(result)) setStep('success')
        },
      },
    )
  }

  const onSubmitEnroll = () => {
    completeMfaSetup.mutate(
      { email: email.trim(), password, otpCode },
      {
        onSuccess: (result) => {
          setBackupCodes(result.backup_codes)
          setStep('backup-codes')
        },
      },
    )
  }

  const verifyOtpError = otpSubmitted && login.error instanceof ApiError ? login.error.message : null
  const enrollError = completeMfaSetup.error instanceof ApiError ? completeMfaSetup.error.message : null

  return (
    <div style={{ fontFamily: "'Archivo', sans-serif", background: C.bg, minHeight: '100vh', padding: 40, color: C.text }}>
      <div style={{ maxWidth: 900, margin: '0 auto 22px' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: C.accent,
            marginBottom: 10,
          }}
        >
          Platform Admin — Restricted Access
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
          PRODO Platform Console
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: C.dim, maxWidth: 560, lineHeight: 1.5 }}>
          Akses lintas-organisasi. Tidak menampilkan data task/workspace/project manapun. MFA wajib.
        </p>
      </div>

      <div
        style={{
          maxWidth: 460,
          margin: '0 auto',
          background: C.card,
          border: `1px solid ${C.border}`,
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              background: C.accent,
              color: C.bg,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            P
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.18em',
              color: C.dim,
              flex: 1,
            }}
          >
            PRODO PLATFORM ADMIN
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.08em', padding: '4px 8px', color: C.text, borderBottom: `1px solid ${C.accent}` }}>
            ID
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.08em', padding: '4px 8px', color: C.dimmer }}>
            EN
          </span>
        </div>

        {step === 'credentials' && (
          <>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: C.dim, marginBottom: 4 }}>
                STEP 1 / 2
              </div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Identitas Platform Admin</div>
            </div>

            {credError && <ErrorBanner>{credError}</ErrorBanner>}

            <div>
              <label style={labelStyle}>EMAIL PLATFORM</label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setCredError(null)
                }}
                placeholder="admin@prodo-platform.io"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>PASSWORD</label>
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setCredError(null)
                }}
                type="password"
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <button type="button" onClick={onSubmitCredentials} disabled={login.isPending} style={buttonStyle}>
              {login.isPending ? 'MEMPROSES...' : 'LANJUT KE VERIFIKASI MFA →'}
            </button>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.faint, lineHeight: 1.7 }}>
              SSO tidak tersedia untuk akun Platform Admin — kredensial dikelola langsung oleh tim operasional PRODO.
              Percobaan login dicatat di Platform Audit Trail (§4.1).
            </div>
          </>
        )}

        {step === 'enroll-mfa' && enrollChallenge && (
          <>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: C.dim, marginBottom: 4 }}>
                STEP 2 / 2 · WAJIB
              </div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Setup Multi-Faktor (Login Pertama)</div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>
                Akun ini belum pernah setup MFA. Pindai QR dengan authenticator app, lalu masukkan kode 6 digit.
              </p>
            </div>
            {enrollError && <ErrorBanner>{enrollError}</ErrorBanner>}
            <img
              src={enrollChallenge.qrUrl}
              alt="QR code setup MFA"
              style={{ width: 132, height: 132, alignSelf: 'center', border: `1px solid ${C.inputBorder}` }}
            />
            <p style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.08em', color: C.dim, wordBreak: 'break-all' }}>
              Kunci manual: {enrollChallenge.secret}
            </p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              maxLength={6}
              style={{ ...inputStyle, fontSize: 24, letterSpacing: '0.4em', textAlign: 'center', padding: 14 }}
            />
            <button
              type="button"
              onClick={onSubmitEnroll}
              disabled={completeMfaSetup.isPending || otpCode.length !== 6}
              style={buttonStyle}
            >
              {completeMfaSetup.isPending ? 'MEMVERIFIKASI...' : 'AKTIFKAN MFA & MASUK'}
            </button>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.faint, lineHeight: 1.7 }}>
              MFA tidak dapat dinonaktifkan untuk akun Platform Admin.
            </div>
          </>
        )}

        {step === 'backup-codes' && (
          <>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Simpan Kode Cadangan</div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>
                Sepuluh kode sekali pakai untuk masuk bila perangkat authenticator hilang. Kode ini TIDAK akan
                ditampilkan lagi.
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                border: `1px solid ${C.border}`,
                padding: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.05em',
              }}
            >
              {backupCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, lineHeight: 1.6, color: C.dim, cursor: 'pointer' }}>
              <input type="checkbox" checked={savedAck} onChange={(e) => setSavedAck(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Saya sudah menyimpan kode cadangan di tempat aman.</span>
            </label>
            <button type="button" onClick={() => setStep('success')} disabled={!savedAck} style={buttonStyle}>
              LANJUT
            </button>
          </>
        )}

        {step === 'verify-otp' && (
          <>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: C.dim, marginBottom: 4 }}>
                STEP 2 / 2 · WAJIB
              </div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Verifikasi Multi-Faktor</div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>
                Masukkan 6 digit kode dari authenticator app Anda.
              </p>
            </div>
            {verifyOtpError && <ErrorBanner>Kode salah atau kedaluwarsa. Coba lagi.</ErrorBanner>}
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              style={{ ...inputStyle, fontSize: 24, letterSpacing: '0.4em', textAlign: 'center', padding: 14 }}
            />
            <button type="button" onClick={onSubmitVerifyOtp} disabled={login.isPending || otpCode.length !== 6} style={buttonStyle}>
              {login.isPending ? 'MEMVERIFIKASI...' : 'VERIFIKASI & MASUK'}
            </button>
            <span
              onClick={() => {
                setStep('credentials')
                setOtpCode('')
                setOtpSubmitted(false)
              }}
              style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.dimmer, cursor: 'pointer' }}
            >
              ← KEMBALI
            </span>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.faint, lineHeight: 1.7 }}>
              MFA tidak dapat dinonaktifkan untuk akun Platform Admin.
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, background: C.mint, color: C.bg, display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                ✓
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Akses Platform Console diberikan</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: C.dim, marginTop: 2 }}>
                  Session timeout: 10 menit idle · sliding disabled
                </div>
              </div>
            </div>
            <div
              style={{
                border: `1px solid ${C.border}`,
                background: C.infoBg,
                padding: 13,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                color: 'oklch(0.62 0.01 70)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div>ROLE · PLATFORM ADMIN</div>
              <div>SCOPE · METADATA PLATFORM SAJA — TIDAK ADA AKSES KONTEN ORGANISASI</div>
              <div>MFA · TERVERIFIKASI</div>
            </div>
            <button type="button" onClick={() => navigate('/platform/group-admins')} style={buttonStyle}>
              MASUK KE PLATFORM CONSOLE →
            </button>
          </>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '22px 0 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', color: C.dimmer, lineHeight: 1.8 }}>
        BUKAN PLATFORM ADMIN?{' '}
        <a href="/login" style={{ color: C.accent, textDecoration: 'none' }}>
          GUNAKAN HALAMAN LOGIN BIASA →
        </a>
      </div>
    </div>
  )
}
