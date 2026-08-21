import { useEffect } from 'react'

import { useUIStore } from '@/store/useUIStore'

// S1-37: notifikasi flat satu-pesan (bukan Radix Toast Provider/Viewport
// penuh -- belum ada kebutuhan menumpuk banyak toast sekaligus, cukup satu
// pesan global lewat useUIStore). Auto-dismiss 5 detik, z-70 sesuai
// design-system.md §6.1 (Toast di atas Modal).
const AUTO_DISMISS_MS = 5000

export default function Toaster() {
  const toast = useUIStore((state) => state.toast)
  const hideToast = useUIStore((state) => state.hideToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hideToast, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast, hideToast])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-3 border border-line-strong bg-panel px-4 py-3 font-mono text-[11px] text-text-body">
        <span>{toast}</span>
        <button onClick={hideToast} className="text-text-dim hover:text-text-bone" aria-label="Tutup">
          ✕
        </button>
      </div>
    </div>
  )
}
