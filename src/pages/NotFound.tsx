import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Halaman tidak ditemukan.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-signal underline">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  )
}
