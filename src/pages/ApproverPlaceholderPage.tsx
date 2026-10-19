// Kerangka sementara menu Approver yang halamannya belum dibangun (S7A-01): Antrean Approval
// diganti di S7A-02, Task Saya di S7A-07. Sengaja polos (tanpa chip izin, UI demo prototipe).
export default function ApproverPlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-text-bone">{title}</h1>
      <p className="mt-2 max-w-xl font-mono text-[11px] text-text-muted">{note}</p>
    </div>
  )
}
