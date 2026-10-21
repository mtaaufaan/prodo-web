import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import AccountSettingsPage from './AccountSettingsPage'

// S7A-11 (IG-157): Pengaturan Akun role Approver di dalam frame Approver -- 5 tab sesuai "User Pengaturan Akun.dc.html".
const m = vi.hoisted(() => {
  const idle = () => ({ mutate: vi.fn(), isPending: false })
  return {
    idle,
    profile: {
      id: 'u1', email: 'approver@prodo.local', display_name: 'Adit Approver', title: 'Product Delivery', phone: '+62 812 4400 118',
      avatar_url: null, platform_role: 'none', locale: 'id', mfa_enabled: false, last_login_at: null, created_at: '2026-09-01T00:00:00Z',
    },
    prefs: ['comment.mention', 'task.pic_assigned', 'task.assigned', 'task.due_date', 'approval.pending', 'account.security_activity'].map((event_type) => ({
      event_type, in_app: true, push: false, email: true,
    })),
  }
})

vi.mock('@/features/account-settings/hooks', () => ({
  useProfile: () => ({ data: m.profile, isLoading: false }),
  useUpdateProfile: m.idle,
  useChangePassword: m.idle,
  useSetupSelfMFA: m.idle,
  useVerifySelfMFA: m.idle,
  useRegenerateBackupCodes: m.idle,
  useUpdateNotificationPreference: m.idle,
  useNotificationPreferences: () => ({ data: m.prefs, isLoading: false }),
}))
vi.mock('@/features/context/hooks', () => ({
  useMyContext: () => ({
    data: {
      platform_role: 'none',
      workspace_memberships: [
        { workspace_id: 'ws-1', name: 'IT - Eldwin', org_name: 'RDS', role: 'approver', joined_at: '2026-09-01' },
        { workspace_id: 'ws-2', name: 'Marketing', org_name: 'RDS', role: 'viewer', joined_at: '2026-09-10' },
      ],
      project_scoped_projects: [],
    },
  }),
}))
vi.mock('@/pages/SessionsPage', () => ({ SessionsPanel: () => <div>DAFTAR SESI</div> }))

function Frame({ view }: { view: string }) {
  return <Outlet context={{ view }} />
}
const show = (view: string) =>
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/account']}>
      <Routes>
        <Route element={<Frame view={view} />}>
          <Route path="/workspaces/:wsId/account" element={<AccountSettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('Pengaturan Akun role Approver (5 tab)', () => {
  it('Profil: kartu identitas, role APPROVER, workspace aktif, email terkunci, tanpa kontrol zona waktu', () => {
    show('Profil')
    expect(screen.getByText('APPROVER')).toBeInTheDocument()
    expect(screen.getByText('WORKSPACE AKTIF')).toBeInTheDocument()
    expect(screen.getByText('IT - Eldwin · RDS')).toBeInTheDocument()
    expect(screen.getByText('DATA PRIBADI')).toBeInTheDocument()
    expect(screen.getByDisplayValue('approver@prodo.local')).toBeDisabled()
    expect(screen.getByDisplayValue('Adit Approver')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Simpan Perubahan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Batalkan' })).toBeInTheDocument() // selalu tampil, seperti desain
    expect(screen.queryByText(/ZONA WAKTU/i)).not.toBeInTheDocument() // keputusan IG-59
  })

  it('Workspace & Role: satu baris per workspace, yang aktif ditandai', () => {
    show('Workspace & Role')
    expect(screen.getByText('ROLE SAYA PER WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText('IT - Eldwin')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('● AKTIF')).toBeInTheDocument()
    expect(screen.getByText('TERSEDIA')).toBeInTheDocument()
    expect(screen.getByText('APPROVER', { selector: 'span' })).toHaveClass('text-violet')
  })

  it('Keamanan: ganti password dan MFA opsional (dianjurkan) untuk role workspace', () => {
    show('Keamanan')
    expect(screen.getByText('GANTI PASSWORD')).toBeInTheDocument()
    expect(screen.getByText('NONAKTIF · DIANJURKAN')).toBeInTheDocument()
  })

  it('Sesi & Perangkat: panel sesi tampil di frame', () => {
    show('Sesi & Perangkat')
    expect(screen.getByText('DAFTAR SESI')).toBeInTheDocument()
  })

  it('Notifikasi: enam jenis notifikasi workspace, in-app selalu aktif', () => {
    show('Notifikasi')
    expect(screen.getByText('KANAL NOTIFIKASI SAYA')).toBeInTheDocument()
    for (const label of [
      'Mention pada komentar',
      'Penunjukan PIC & permintaan acknowledge',
      'Task ditugaskan ke saya',
      'Due date & keterlambatan',
      'Antrean approval',
      'Aktivitas keamanan akun',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('IN-APP')).toHaveLength(6)
  })
})
