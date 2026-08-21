import axios from 'axios'

import { useAuthStore } from '@/store/useAuthStore'

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

instance.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    const body = error?.response?.data as ApiErrorBody | undefined
    // Token ditolak (expired/invalid) saat request TERAUTENTIKASI --
    // bersihkan sesi supaya AuthGuard (reaktif ke store) redirect balik
    // ke /login alih-alih diam-diam terus gagal dengan token basi.
    if (error?.response?.status === 401 && useAuthStore.getState().accessToken) {
      useAuthStore.getState().clearSession()
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
}
