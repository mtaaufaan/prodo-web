import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddProjectMember, useSearchGroupAccounts } from '@/features/project-members/hooks'
import { PROJECT_SCOPED_ROLES, type GroupAccount } from '@/features/project-members/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AddMemberModalProps {
  projectId: string
  open: boolean
  onClose: () => void
}

// S3-24, US-009b (pencarian lintas org via S3-20). ponytail: Group ID
// diketik manual -- halaman ini dibuka lewat projectId di URL langsung
// (belum ada fitur "daftar project" / ProjectListPage, project itu sendiri
// baru punya CRUD di S4), jadi tidak ada cara lain FE tahu grup mana yang
// harus dicari. Ganti begitu ada ProjectListPage yang tahu konteks
// organisasi/grup project ini.
export default function AddMemberModal({ projectId, open, onClose }: AddMemberModalProps) {
  const [groupId, setGroupId] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<GroupAccount | null>(null)
  const [role, setRole] = useState(PROJECT_SCOPED_ROLES[0].key)
  const search = useSearchGroupAccounts()
  const addMember = useAddProjectMember(projectId)

  const handleClose = () => {
    setGroupId('')
    setQuery('')
    setSelected(null)
    search.reset()
    addMember.reset()
    onClose()
  }

  const handleSearch = () => {
    if (!groupId) return
    search.mutate({ groupId, query })
  }

  const handleAdd = () => {
    if (!selected) return
    addMember.mutate({ userId: selected.user_id, role }, { onSuccess: handleClose })
  }

  const searchErrorMessage = search.error instanceof ApiError ? search.error.message : null
  const addErrorMessage = addMember.error instanceof ApiError ? addMember.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Member Project</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="pm-group-id">Group ID</Label>
            <Input id="pm-group-id" placeholder="UUID grup" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Cari nama atau email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="button" variant="outline" onClick={handleSearch} disabled={!groupId || search.isPending}>
              {search.isPending ? '...' : 'Cari'}
            </Button>
          </div>
          {searchErrorMessage && <p className="text-[11px] text-destructive">{searchErrorMessage}</p>}

          {search.data && (
            <div className="max-h-40 overflow-y-auto border border-line">
              {search.data.length === 0 && (
                <p className="p-3 text-[12px] text-text-muted">Tidak ada user ditemukan.</p>
              )}
              {search.data.map((account) => (
                <button
                  key={account.user_id}
                  type="button"
                  onClick={() => setSelected(account)}
                  className={cn(
                    'flex w-full flex-col border-t border-line-subtle px-3 py-2 text-left first:border-t-0',
                    selected?.user_id === account.user_id && 'bg-accent-wash',
                  )}
                >
                  <span className="text-[13px] text-text-body">{account.display_name || account.email}</span>
                  <span className="font-mono text-[9px] text-text-muted">
                    {account.email} · {account.org_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <Label className="mb-2 block">Role di Project Ini</Label>
            <div className="flex flex-col border border-line">
              {PROJECT_SCOPED_ROLES.map((r) => {
                const active = role === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={cn(
                      'flex items-center gap-2.5 border-t border-line-subtle px-3 py-2.5 text-left first:border-t-0',
                      active && 'bg-accent-wash',
                    )}
                  >
                    <span className={cn('font-mono text-[11px]', active ? 'text-signal' : 'text-text-muted')}>
                      {active ? '◉' : '○'}
                    </span>
                    <span className={cn('font-mono text-[10.5px] tracking-[0.06em]', active ? 'text-signal' : 'text-text-body')}>
                      {r.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {addErrorMessage && <p className="text-[11px] text-destructive">{addErrorMessage}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selected || addMember.isPending}
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            {addMember.isPending ? 'Menambahkan...' : 'Tambah Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
