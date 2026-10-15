// Definisi menu sidebar per role di dalam workspace (dipindah dari WorkspaceLayout.tsx
// 2026-10-15, S6E-01, supaya bisa dites sebagai fungsi murni -- tes regresi nav
// PM/AW).

export interface WorkspaceNavItemDef {
  key: string
  icon: string
  label: string
  to: string | null
  tabs: string[] | null
  cta: string | null
  adminOnly?: boolean
}

// to: null berarti belum ada halaman ("SEGERA"). Path ABSOLUT (bukan
// relatif) -- route anak WorkspaceLayout dideklarasikan sebagai path penuh
// /workspaces/:wsId/... di AppRouter (lihat komentar lama, masih berlaku).
export function awNavItems(workspaceId: string): WorkspaceNavItemDef[] {
  return [
    // Performance Dashboard SENGAJA di posisi PALING AWAL (dipindah
    // 2026-09-22, dikonfirmasi user) -- sebelumnya urutan ketiga (setelah
    // Project/Members), sekarang jadi landing pertama yang dilihat AW.
    {
      key: 'kinerja',
      icon: '◎',
      label: 'Performance Dashboard',
      to: `/workspaces/${workspaceId}/performance`,
      tabs: ['Project Health', 'Member Performance', 'Flow Efficiency'],
      cta: null,
    },
    { key: 'project', icon: '▤', label: 'Project', to: `/workspaces/${workspaceId}/projects`, tabs: ['Semua', 'Aktif', 'Arsip'], cta: '+ Project' },
    { key: 'members', icon: '◉', label: 'Members & Roles', to: `/workspaces/${workspaceId}/members`, tabs: null, cta: '+ Undang Member' },
    {
      key: 'cooldown',
      icon: '◷',
      label: 'Cooldown Mention',
      to: `/workspaces/${workspaceId}/cooldown-mention`,
      tabs: null,
      cta: null,
      adminOnly: true,
    },
    {
      key: 'status',
      icon: '◫',
      label: 'Custom Status',
      to: `/workspaces/${workspaceId}/statuses`,
      tabs: ['Semua', 'Sistem', 'Kustom', 'Per Project'],
      cta: '+ Tambah Status',
      adminOnly: true,
    },
    {
      key: 'rule',
      icon: '⌗',
      label: 'Rule Automation',
      to: `/workspaces/${workspaceId}/rules`,
      tabs: ['Rule Aktif', 'Template Library', 'Log Eksekusi'],
      cta: '+ Rule',
      adminOnly: true,
    },
    {
      key: 'webhook',
      icon: '⇄',
      label: 'Webhook',
      to: `/workspaces/${workspaceId}/webhooks`,
      tabs: ['Endpoint', 'Log Pengiriman'],
      cta: '+ Webhook',
      adminOnly: true,
    },
    {
      key: 'docs',
      icon: '▧',
      label: 'Dokumen & Lampiran',
      to: `/workspaces/${workspaceId}/documents`,
      tabs: null,
      cta: null,
      adminOnly: true,
    },
    {
      key: 'audit',
      icon: '☰',
      label: 'Audit Trail Workspace',
      to: `/workspaces/${workspaceId}/audit-trail`,
      // tabs: null (2026-09-21, dibangun ulang meniru GroupAuditTrailPage
      // persis) -- tab Semua Aktivitas/Akses & Keamanan sekarang dirender
      // DI DALAM AwAuditTrailPage sendiri, sama seperti GroupAdminLayout's
      // 'audit' nav item (tabs: null juga).
      tabs: null,
      cta: null,
      adminOnly: true,
    },
  ]
}

// pmNavItems -- master frame Project Manager (2026-09-22, sebelum Track
// S5 dimulai, "seperti biasa" pola S4P/S4G/S4W: bangun shell+menu dulu,
// sambungkan halaman satu-satu seiring track berjalan). 11 item PERSIS
// `NAV['Project Manager']` di "Master UI User.dc.html" (dibaca langsung
// via DesignSync, BUKAN ditebak) -- HAMPIR SEMUA project-scoped (butuh
// activeProjectId dari switcher project baru di sidebar), KECUALI
// Performance Dashboard yang tetap level workspace (halaman SAMA dengan
// AW, `PerformanceDashboardPage` sudah menangani mode PM sendiri lewat
// deteksi pm_user_id -- tidak perlu halaman/rute terpisah). activeProjectId
// null (PM belum py project SAMA SEKALI, atau belum termuat) -> seluruh
// item project-scoped jatuh ke "SEGERA" sampai ada project aktif.
//
// Status per 2026-09-28: 'kinerja' (reuse AW), 'board' (Kanban Phase 1,
// S4-05 dst/IG-46-49), 'pmmembers' (ProjectMembersPage, S3-24/IG-17),
// 'sprint' (dibangun lengkap Track S5, IG-92), 'status' (Track S5B,
// US-019, "PM Custom Status.dc.html" -- salinan independen per-project,
// lihat ProjectStatusSettingsPage.tsx), dan 'rule' (Track S5B, "Rule
// Builder.dc.html" -- rule level PROJECT, berdampingan/aditif dengan Rule
// Automation AW level workspace, lihat ProjectRuleAutomationPage.tsx)
// sudah py halaman sungguhan, begitu juga 'picgroup' (US-017b, IG-117,
// "PM PIC Group.dc.html" -- ProjectPicGroupPage.tsx), dan 'import' (Import
// CSV PM, IG-120 -- tahap (a): import sprint), dan 'docs' (Dokumen &
// Lampiran level PROJECT, IG-123 -- DocumentsView cakupan project, beda dari
// AW Documents yang workspace-wide). 'analytics' (Timesheet & Analitik, IG-128, "PM Timesheet.dc.html" --
// TimesheetPage). 'audit' (Audit Trail PM, IG-130 -- aktivitas project aktif,
// komponen AuditTrailView yang sama dengan Audit Trail Workspace AW).
// Seluruh 11 item nav PM kini punya halaman.
export function pmNavItems(workspaceId: string, activeProjectId: string | null): WorkspaceNavItemDef[] {
  const p = activeProjectId
  return [
    {
      key: 'kinerja',
      icon: '◎',
      label: 'Performance Dashboard',
      // PM: dashboard PER PROJECT sesuai project aktif switcher.
      to: p ? `/workspaces/${workspaceId}/projects/${p}/performance` : `/workspaces/${workspaceId}/performance`,
      tabs: ['Project Health', 'Member Performance', 'Flow Efficiency'],
      cta: null,
    },
    {
      key: 'sprint',
      icon: '◧',
      label: 'Sprint',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/sprints` : null,
      tabs: ['Semua', 'Aktif', 'Backlog', 'Selesai'],
      cta: '+ Sprint',
    },
    {
      key: 'pmmembers',
      icon: '◉',
      label: 'Member Project',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/members` : null,
      tabs: null,
      cta: '+ Member',
    },
    {
      key: 'board',
      icon: '▦',
      label: 'Board',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/board` : null,
      tabs: ['Kanban', 'Daftar', 'Gantt', 'Riwayat'],
      cta: '+ Task',
    },
    {
      key: 'status',
      icon: '◫',
      label: 'Custom Status Project',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/statuses` : null,
      tabs: ['Status Project'],
      cta: '+ Status',
    },
    {
      key: 'picgroup',
      icon: '◈',
      label: 'PIC Group per Status',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/pic-groups` : null,
      tabs: ['Konfigurasi'],
      cta: null,
    },
    {
      key: 'rule',
      icon: '⌗',
      label: 'Rule Automation',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/rules` : null,
      tabs: ['Rule Aktif', 'Template Library', 'Log Eksekusi'],
      cta: '+ Rule',
    },
    { key: 'import', icon: '⇪', label: 'Import CSV', to: p ? `/workspaces/${workspaceId}/projects/${p}/import` : null, tabs: ['Unggah CSV', 'Riwayat'], cta: null },
    { key: 'docs', icon: '▧', label: 'Dokumen & Lampiran', to: p ? `/workspaces/${workspaceId}/projects/${p}/documents` : null, tabs: null, cta: null },
    {
      key: 'analytics',
      icon: '◔',
      label: 'Timesheet & Analitik',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/timesheet` : null,
      tabs: ['Ringkasan', 'Per-Member', 'Persetujuan', 'Timesheet Saya'],
      cta: null,
    },
    // Audit Trail PM (IG-130): aktivitas project aktif; tab Semua Aktivitas/Akses & Keamanan di dalam halaman (pola AW).
    { key: 'audit', icon: '☰', label: 'Audit Trail', to: p ? `/workspaces/${workspaceId}/projects/${p}/audit` : null, tabs: null, cta: null },
  ]
}

// editorNavItems -- master frame Editor (S6E-01, Sprint 6 "Editor Console"):
// 4 item PERSIS `NAV.Editor` di "Master UI User.dc.html" (dibaca langsung via
// DesignSync). Board project-scoped (butuh project aktif dari switcher);
// Task Saya/Timesheet/Lampiran Saya LINTAS project (level workspace -- rute
// `my-*`, jadi tidak bentrok dengan rute PM `/projects/:p/timesheet`).
// Halaman Task Saya/Timesheet/Lampiran Saya dibangun S6E-02/06/09; sampai itu
// rute-nya menampilkan placeholder kerangka (sama pola desain). CTA "+ Task"
// pada Task Saya disambungkan halamannya di S6E-02 (tombol tersembunyi sampai
// halaman mendaftarkan handler).
export function editorNavItems(workspaceId: string, activeProjectId: string | null): WorkspaceNavItemDef[] {
  const p = activeProjectId
  return [
    {
      key: 'board',
      icon: '▦',
      label: 'Board',
      to: p ? `/workspaces/${workspaceId}/projects/${p}/board` : `/workspaces/${workspaceId}/board`,
      tabs: ['Kanban', 'Daftar'],
      cta: '+ Task',
    },
    { key: 'mytask', icon: '◉', label: 'Task Saya', to: `/workspaces/${workspaceId}/my-tasks`, tabs: ['Ditugaskan', 'Diikuti'], cta: '+ Task' },
    { key: 'timesheet', icon: '◷', label: 'Timesheet', to: `/workspaces/${workspaceId}/my-timesheet`, tabs: ['Minggu Ini', 'Riwayat'], cta: null },
    { key: 'docs', icon: '▧', label: 'Lampiran Saya', to: `/workspaces/${workspaceId}/my-attachments`, tabs: ['Semua File'], cta: null },
  ]
}

// Panel role sidebar Editor (desain: label role terkunci + NOTES.Editor +
// kalimat "Role ini mengikuti akun yang masuk"). Chip izin (PERMS) di desain
// hanya tampil di area konten placeholder, BUKAN sidebar -- lihat IG-132.
export const EDITOR_ROLE_NOTE =
  'Konteks task: buat/edit task, attachment, komentar, timesheet. Role ini mengikuti akun yang masuk — ubah lewat Admin Workspace.'
export const EDITOR_PERMISSION_CHIPS: { label: string; allowed: boolean }[] = [
  { label: 'BUAT & EDIT TASK', allowed: true },
  { label: 'KOMENTAR & ATTACHMENT', allowed: true },
  { label: 'TIMESHEET', allowed: true },
  { label: 'KELOLA RULE', allowed: false },
]

// isEditorPath -- rute yang boleh dibuka Editor di dalam workspace; selain itu
// diarahkan ke Board (rute milik PM/AW: sprint, member, rule, import, status,
// audit, timesheet PM, performance, dst). Backend tetap penjaga akses sebenarnya.
export function isEditorPath(pathname: string, workspaceId: string): boolean {
  const base = `/workspaces/${workspaceId}`
  if (['/board', '/my-tasks', '/my-timesheet', '/my-attachments', '/account'].some((x) => pathname === base + x || pathname.startsWith(`${base}${x}/`))) {
    return true
  }
  return new RegExp(`^${base}/projects/[^/]+/board/?$`).test(pathname)
}
