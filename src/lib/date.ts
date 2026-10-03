// formatDateDMY -- tanggal DATE dari API ("YYYY-MM-DD", atau timestamp yang
// diawali bagian tanggalnya) ditampilkan "dd/MM/yyyy". Murni potong string,
// TIDAK lewat Date, supaya tidak bergeser sehari akibat timezone browser.
// null/kosong/format tak dikenal -> "—".
export function formatDateDMY(value: string | null | undefined): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}
