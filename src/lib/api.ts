import axios from 'axios'

import { useAuthStore } from '@/store/useAuthStore'
import { useStepUpStore } from '@/store/useStepUpStore'
import { useUIStore } from '@/store/useUIStore'

interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown }
}

// ApiError carries the backend's error `code` (docs/API_CONTRACT.md §1)
// so callers can branch on it (e.g. INVALID_OR_EXPIRED_TOKEN) instead of
// parsing the message string.
export class ApiError extends Error {
  code: string
  details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

const instance = axios.create()

// Bearer token dari useAuthStore (S1-25 -- sebelumnya baca localStorage
// mentah langsung, sekarang lewat Zustand supaya satu sumber kebenaran
// dipakai bareng AuthGuard).
instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// access_token cuma berlaku 5 menit (Keycloak) -- decode jti-nya sendiri
// (tanpa verifikasi, cuma dipakai sbg kunci lookup opaque di endpoint
// refresh) supaya tidak perlu simpan jti terpisah di useAuthStore.
function decodeJti(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json).jti ?? null
  } catch {
    return null
  }
}

function clearSessionWithToast() {
  useAuthStore.getState().clearSession()
  useUIStore.getState().showToast('Sesi Anda telah diakhiri.')
}

// Dedup refresh -- kalau beberapa request 401 bersamaan, cuma satu panggilan
// /auth/refresh yang jalan, sisanya menunggu promise yang sama.
let refreshPromise: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { accessToken, refreshToken } = useAuthStore.getState()
      const jti = accessToken ? decodeJti(accessToken) : null
      if (!refreshToken || !jti) return null
      try {
        const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken, jti })
        const data = res.data?.data
        useAuthStore.getState().setSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: useAuthStore.getState().user!,
        })
        return data.access_token as string
      } catch {
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

instance.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  async (error) => {
    const body = error?.response?.data as ApiErrorBody | undefined
    const original = error?.config
    // Token ditolak (expired/invalid) saat request TERAUTENTIKASI -- coba
    // refresh SEKALI dan ulangi request asli sebelum menyerah. Kalau
    // refresh sendiri gagal (refresh_token juga basi/sesi di-revoke server-
    // side, mis. jti masuk blacklist S1-33/34/35), baru bersihkan sesi
    // supaya AuthGuard redirect balik ke /login (toast S1-37).
    if (error?.response?.status === 401 && useAuthStore.getState().accessToken && original && !original._retried) {
      original._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return instance(original)
      }
      clearSessionWithToast()
    }
    // S16-04/05, Track S4G: 403 STEP_UP_REQUIRED -- tampilkan dialog OTP
    // (StepUpModal, dipicu lewat useStepUpStore) dan retry request asli
    // SEKALI setelah verifikasi sukses. Beda dari 401 di atas: token tetap
    // valid, cuma butuh bukti OTP tambahan -- tidak ada refresh token yang
    // terlibat. Kalau user membatalkan dialog, request() reject dan error
    // asli diteruskan apa adanya ke caller.
    if (body?.error?.code === 'STEP_UP_REQUIRED' && original && !original._stepUpRetried) {
      original._stepUpRetried = true
      try {
        await useStepUpStore.getState().request()
        return instance(original)
      } catch {
        // user membatalkan -- lanjut ke penanganan error biasa di bawah
      }
    }
    if (body?.error) {
      return Promise.reject(new ApiError(body.error.code, body.error.message, body.error.details))
    }
    return Promise.reject(error instanceof Error ? error : new Error('Request gagal'))
  },
)

// ponytail: generic axios types (Promise<AxiosResponse<T>>) tidak cocok
// dengan runtime sesungguhnya (interceptor di atas resolve ke `.data`
// langsung, bukan AxiosResponse) -- di-cast eksplisit di sini supaya
// pemanggil dapat `Promise<T>` sesuai konvensi docs/coding-conventions.md
// §4.4 (`apiClient.get<Task[]>(url)` langsung mengembalikan array-nya).
export const apiClient = instance as unknown as {
  get<T>(url: string, config?: Parameters<typeof instance.get>[1]): Promise<T>
  post<T>(url: string, data?: unknown, config?: Parameters<typeof instance.post>[1]): Promise<T>
  put<T>(url: string, data?: unknown, config?: Parameters<typeof instance.put>[1]): Promise<T>
  patch<T>(url: string, data?: unknown, config?: Parameters<typeof instance.patch>[1]): Promise<T>
  delete<T>(url: string, config?: Parameters<typeof instance.delete>[1]): Promise<T>
}
