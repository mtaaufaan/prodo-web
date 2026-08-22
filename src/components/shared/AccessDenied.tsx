interface AccessDeniedProps {
  message?: string
}

// S2-15, US-003: state 403 inline yang bisa dipakai halaman mana pun saat
// API mengembalikan 403 (bukan cuma di /403 route, lihat pages/Forbidden.tsx
// yang membungkus komponen ini untuk kasus route-level).
export function AccessDenied({ message = 'Anda tidak memiliki akses untuk melihat halaman ini.' }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">403 — Akses Ditolak</span>
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
    </div>
  )
}
