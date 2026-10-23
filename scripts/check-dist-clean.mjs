// Penjaga bundel produksi (S7A-14, IG-160): `dist` tidak boleh memuat data/worker mock (MSW) yang hanya
// dipakai `npm run dev:mock`. Jalankan setelah `npm run build`; keluar dengan kode 1 bila ada jejak.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (!existsSync(dist)) {
  console.error('dist/ tidak ada -- jalankan `npm run build` dulu.')
  process.exit(2)
}

// Penanda yang hanya mungkin muncul bila kode/data mock ikut terbundel.
const FORBIDDEN = ['mockServiceWorker', 'setupWorker', 'VITE_MOCK_ROLE', 'mock-approver-id', 'mock-editor-id', 'mock-proj-', 'mock-ws-1']

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const hits = []
for (const file of walk(dist)) {
  if (/mockServiceWorker\.js$/.test(file)) hits.push(`${path.relative(dist, file)} (berkas worker MSW)`)
  if (!/\.(js|css|html|map)$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const marker of FORBIDDEN) if (text.includes(marker)) hits.push(`${path.relative(dist, file)} memuat "${marker}"`)
}

if (hits.length > 0) {
  console.error('Bundel produksi TIDAK bersih dari mock:\n - ' + hits.join('\n - '))
  process.exit(1)
}
console.log(`dist bersih dari mock (${walk(dist).length} berkas diperiksa).`)
