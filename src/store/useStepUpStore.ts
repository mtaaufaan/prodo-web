import { create } from 'zustand'

// Step-up auth (S16-04/05, forward-pull Track S4G, desain "GA Step Up.dc.html"):
// dipicu dari axios interceptor (src/lib/api.ts) di luar komponen React,
// sama pola useUIStore.getState() yang sudah dipakai interceptor itu.
// request() dipanggil interceptor saat menerima 403 STEP_UP_REQUIRED,
// mengembalikan Promise yang menggantung sampai StepUpModal memanggil
// resolve() (verifikasi OTP sukses, request asli di-retry) atau reject()
// (user membatalkan dialog).
interface StepUpState {
  open: boolean
  pending: { resolve: () => void; reject: (reason: Error) => void } | null
  request: () => Promise<void>
  resolve: () => void
  cancel: () => void
}

export const useStepUpStore = create<StepUpState>((set, get) => ({
  open: false,
  pending: null,
  request: () =>
    new Promise<void>((resolve, reject) => {
      set({ open: true, pending: { resolve, reject } })
    }),
  resolve: () => {
    const { pending } = get()
    set({ open: false, pending: null })
    pending?.resolve()
  },
  cancel: () => {
    const { pending } = get()
    set({ open: false, pending: null })
    pending?.reject(new Error('Verifikasi step-up dibatalkan'))
  },
}))
