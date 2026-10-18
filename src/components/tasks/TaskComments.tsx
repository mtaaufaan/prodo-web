import { useState } from 'react'

import CommentModal from '@/components/my-tasks/CommentModal'
import { usePostComment } from '@/features/my-tasks/hooks'
import { validateComment } from '@/features/my-tasks/myTaskStats'
import { COMMENT_MAX } from '@/features/my-tasks/types'
import { describeCommentError, useDeleteComment, useEditComment, useTaskComments } from '@/features/tasks/comments'
import { cn } from '@/lib/utils'

interface TaskCommentsProps {
  taskId: string
  taskCode: string
  taskTitle: string
  canComment: boolean
}

// TaskComments -- seksi KOMENTAR di tab RINGKASAN Task Detail (S6E-07). Desain "PM Task Detail.dc.html"
// tidak punya tab Komentar (IG-138), jadi daftar komentar + tombol "+ KOMENTAR" (modal "TM Komentar.dc.html"
// dari S6E-03) ditaruh di sini. Edit/hapus hanya bila server mengizinkan (can_edit/can_delete).
export default function TaskComments({ taskId, taskCode, taskTitle, canComment }: TaskCommentsProps) {
  const comments = useTaskComments(taskId)
  const post = usePostComment()
  const edit = useEditComment(taskId)
  const remove = useDeleteComment(taskId)
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (text: string): Promise<string> => {
    try {
      const res = await post.mutateAsync({ taskId, body: text })
      setComposing(false)
      setNotice(`Komentar terkirim${res.notified ? ` · ${res.notified} mention diberi notifikasi.` : '.'}`)
      return ''
    } catch (err) {
      return describeCommentError(err, 'Gagal mengirim komentar. Coba lagi.')
    }
  }

  const saveEdit = (id: string) => {
    const invalid = validateComment(draft)
    if (invalid) {
      setError(invalid)
      return
    }
    edit.mutate(
      { id, body: draft.trim() },
      {
        onSuccess: () => {
          setEditingId(null)
          setError('')
          setNotice('Komentar diperbarui.')
        },
        onError: (err) => setError(describeCommentError(err, 'Gagal menyimpan komentar.')),
      },
    )
  }

  const confirmDelete = (id: string) =>
    remove.mutate(id, {
      onSuccess: () => {
        setDeleteId(null)
        setError('')
        setNotice('Komentar dihapus.')
      },
      onError: (err) => setError(describeCommentError(err, 'Gagal menghapus komentar.')),
    })

  const list = comments.data ?? []

  return (
    <div data-testid="task-comments">
      <div className="mb-2 flex items-baseline gap-2.5">
        <span className="font-mono text-[8.5px] tracking-[0.14em] text-text-dim">KOMENTAR</span>
        <span className="font-mono text-[9px] text-text-muted">{list.length}</span>
        {canComment && (
          <button
            type="button"
            onClick={() => {
              setNotice('')
              setComposing(true)
            }}
            className="ml-auto border border-blue px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-blue"
          >
            + Komentar
          </button>
        )}
      </div>
      {!canComment && <p className="mb-2 font-mono text-[9px] text-text-dim">Role Anda tidak dapat berkomentar pada task ini.</p>}
      {notice && <p className="mb-2 border border-mint p-2 font-mono text-[9.5px] text-mint">✓ {notice}</p>}
      {error && <p className="mb-2 font-mono text-[9.5px] text-destructive">⚠ {error}</p>}

      <div className="flex flex-col gap-1.5">
        {list.map((c) => (
          <div key={c.id} className="border border-line-strong bg-input-bg p-2.5">
            <div className="flex flex-wrap items-baseline gap-2 font-mono text-[9px] text-text-dim">
              <span className="text-[11px] font-semibold text-text-bone">{c.author_name || 'Anggota'}</span>
              <span>{new Date(c.created_at).toLocaleString('id-ID')}</span>
              {c.is_edited && <span>· diedit</span>}
              <span className="ml-auto flex gap-2.5">
                {c.can_edit && editingId !== c.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id)
                      setDraft(c.body)
                      setError('')
                    }}
                    className="text-text-muted hover:text-signal"
                  >
                    ✎ Ubah
                  </button>
                )}
                {c.can_delete && (
                  <button type="button" onClick={() => setDeleteId(c.id)} className="text-destructive hover:underline">
                    ✕ Hapus
                  </button>
                )}
              </span>
            </div>
            {editingId === c.id ? (
              <div className="mt-2">
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value.slice(0, COMMENT_MAX))
                    setError('')
                  }}
                  aria-label="Ubah komentar"
                  className={cn('min-h-[70px] w-full resize-y border bg-panel px-2.5 py-2 text-[12.5px] text-text-bone outline-none', error ? 'border-destructive' : 'border-line-strong')}
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(c.id)}
                    disabled={edit.isPending}
                    className="border border-signal px-3 py-1.5 font-mono text-[9px] font-bold uppercase text-signal disabled:opacity-40"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setError('')
                    }}
                    className="border border-line-strong px-3 py-1.5 font-mono text-[9px] uppercase text-text-muted"
                  >
                    Batal
                  </button>
                  <span className="ml-auto font-mono text-[8.5px] text-text-dim">
                    {draft.length} / {COMMENT_MAX}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-bone">{c.body}</div>
            )}
            {deleteId === c.id && (
              <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
                <span className="font-mono text-[9.5px] text-amber">Hapus komentar ini?</span>
                <button
                  type="button"
                  onClick={() => confirmDelete(c.id)}
                  disabled={remove.isPending}
                  className="border border-destructive px-2 py-1 font-mono text-[9px] font-bold uppercase text-destructive"
                >
                  Ya, Hapus
                </button>
                <button type="button" onClick={() => setDeleteId(null)} className="border border-line-strong px-2 py-1 font-mono text-[9px] uppercase text-text-muted">
                  Batal
                </button>
              </div>
            )}
          </div>
        ))}
        {!comments.isLoading && list.length === 0 && <p className="font-mono text-[9.5px] text-text-dim">Belum ada komentar.</p>}
      </div>

      {composing && <CommentModal code={taskCode} taskTitle={taskTitle} onSubmit={submit} onClose={() => setComposing(false)} />}
    </div>
  )
}
