// Kode sprint (IG-120) -- format "SPR-NN". Logika murni di sisi FE hanya untuk
// PRATINJAU di form Sprint Baru; sumber kebenaran tetap backend.
const AUTO_CODE = /^SPR-(\d+)$/i

export function formatSprintCode(n: number): string {
  return `SPR-${String(n).padStart(2, '0')}`
}

// nextSprintNumber -- angka terbesar dari kode berpola SPR-<angka> + 1 (kode
// kustom diabaikan, SPR-00 -> berikutnya 1). Daftar kosong -> null (project
// belum punya sprint: penomoran harus dipilih, Sprint 0 atau Sprint 1).
export function nextSprintNumber(codes: string[]): number | null {
  if (codes.length === 0) return null
  let max = 0
  for (const c of codes) {
    const m = AUTO_CODE.exec(c.trim())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

// normalizeSprintCode -- huruf besar, tanpa spasi tepi (sama dengan backend).
export function normalizeSprintCode(raw: string): string {
  return raw.trim().toUpperCase()
}

// Format sah: huruf/angka di awal, lalu huruf/angka/titik/strip/garis bawah, maks 20.
export function isValidSprintCode(code: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/.test(code)
}
