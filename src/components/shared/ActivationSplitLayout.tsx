import type { ReactNode } from 'react'

// Panel branding untuk alur aktivasi/reset password (S1-10/11), dicocokkan
// dari source asli "Set Password.dc.html" (dibaca via DesignSync, bukan
// tebakan) -- dipakai bersama oleh Activate.tsx dan ActivateMfaSetup.tsx
// karena keduanya berbagi persis panel kiri yang sama (cuma heroTitle/
// heroBody yang beda per langkah).
interface InfoRow {
  label: string
  value: string
}

function LogoMark() {
  return (
    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center bg-signal font-sans text-[17px] font-black text-bg-deep">
      P
    </div>
  )
}

export function ActivationSplitLayout({
  heroTitle,
  heroBody,
  infoRows = [],
  children,
}: {
  heroTitle: string
  heroBody: string
  // Kosong di step 1 (Activate.tsx) -- identitas invitee (email/nama) baru
  // diketahui backend SETELAH password disetel (respons /auth/activate),
  // tidak ada endpoint terpisah untuk "intip" invitation sebelum submit.
  // Terisi mulai step 2 (ActivateMfaSetup.tsx) lewat router state.
  infoRows?: InfoRow[]
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen bg-bg-deep md:grid-cols-[1fr_470px]">
      <div
        className="hidden flex-col justify-between border-line p-11 text-text-bone md:flex md:border-r"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 40px, oklch(0.21 0.008 60) 40px, oklch(0.21 0.008 60) 41px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted">PRODO · OPS LEDGER</span>
        </div>

        <div>
          <h1 className="text-[36px] font-extrabold uppercase leading-[1.08] tracking-[-0.03em]">{heroTitle}</h1>
          <p className="mt-4 max-w-[380px] text-sm leading-relaxed text-text-muted">{heroBody}</p>

          {infoRows.length > 0 && (
            <div className="mt-[26px] max-w-[380px] space-y-1 border border-line bg-input-bg p-3.5 font-mono text-[10.5px] leading-[1.8] text-text-muted">
              {infoRows.map((row) => (
                <div key={row.label}>
                  {row.label} · {row.value}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-faint">
          ONE-TIME LINK · TERCATAT DI AUDIT TRAIL
        </p>
      </div>

      <div className="flex items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-[352px] py-8">{children}</div>
      </div>
    </div>
  )
}

// Indikator 2 langkah aktivasi (Set Password.dc.html) -- step 1 = set
// password, step 2 = setup MFA (wajib untuk Group Admin, satu-satunya alur
// yang sudah dibangun sejauh ini, jadi selalu 2 langkah, tidak kondisional
// seperti di source aslinya yang juga melayani role tanpa MFA).
export function ActivationStepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.1em]">
      <span
        className={
          step === 1
            ? 'bg-signal px-2.5 py-1 font-bold text-bg-deep'
            : 'border border-mint px-2.5 py-1 text-mint'
        }
      >
        1 · PASSWORD{step === 2 && ' ✓'}
      </span>
      <div className="h-px flex-1 bg-line" />
      <span
        className={
          step === 2
            ? 'bg-signal px-2.5 py-1 font-bold text-bg-deep'
            : 'border border-line-strong px-2.5 py-1 text-text-dim'
        }
      >
        2 · SETUP MFA
      </span>
    </div>
  )
}
