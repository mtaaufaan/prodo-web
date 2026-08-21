import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Error boundary wajib di setiap route-level page (docs/coding-conventions.md §4.10).
// React error boundaries harus class component -- tidak ada versi hook.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-destructive">Terjadi kesalahan</h1>
            <p className="mt-2 text-muted-foreground">Silakan muat ulang halaman.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
