import { EDITOR_PERMISSION_CHIPS } from '@/components/workspaceNav'
import { cn } from '@/lib/utils'

// Kerangka halaman menu Editor yang belum dibangun (S6E-01): meniru area
// placeholder "Master UI User.dc.html" -- label, judul, penjelasan, chip izin
// role. Diganti halaman sungguhan di S6E-03 (Task Saya), S6E-09 (Timesheet),
// S6E-11 (Lampiran Saya).
export default function EditorPlaceholderPage({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[360px] p-4">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3.5 border border-dashed border-line-strong p-8 text-center">
        <div className="font-mono text-[9px] tracking-[0.18em] text-text-dim">{label.toUpperCase()} · EDITOR</div>
        <div className="max-w-[520px] text-[17px] font-bold leading-snug text-text-bone">Modul “{label}” — diisi pada tahap berikutnya</div>
        <div className="max-w-[560px] font-mono text-[10px] leading-[1.8] text-text-muted">
          Kerangka ini menetapkan rail, sidebar konteks workspace, topbar, sub-tab, dan area konten. Setiap modul dibuat sebagai file terpisah lalu
          dihubungkan ke shell ini.
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {EDITOR_PERMISSION_CHIPS.map((c) => (
            <span
              key={c.label}
              className={cn('border px-2 py-1 font-mono text-[9px] tracking-[0.06em]', c.allowed ? 'border-mint text-mint' : 'border-red text-red')}
            >
              {c.allowed ? '✓' : '✕'} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
