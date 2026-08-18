import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import { queryClient } from './lib/query-client'
import './index.css'
import './i18n'

// MSW hanya aktif di `npm run dev:mock` (Vite --mode mock) -- dev normal
// (`npm run dev`) tetap bicara ke backend Fiber asli lewat proxy /api.
async function enableMocking() {
  if (import.meta.env.MODE !== 'mock') return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
})
