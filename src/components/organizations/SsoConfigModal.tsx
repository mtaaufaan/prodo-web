import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Organization } from '@/features/organizations/types'
import { useSsoConfig, useUpdateSsoConfig } from '@/features/sso-config/hooks'
import type { SsoProtocol } from '@/features/sso-config/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PROTOCOLS: { value: SsoProtocol; label: string }[] = [
  { value: 'oidc', label: 'OIDC' },
  { value: 'saml2', label: 'SAML 2.0' },
]

interface SsoConfigModalProps {
  organization: Organization | null
  onClose: () => void
}

// SsoConfigModal (US-074, Track S4G S4G-24) -- freehand, TIDAK ADA file
// desain. Semula GroupSsoSettingsPage (halaman berdiri sendiri di route
// /organizations/:orgId/sso-config); diubah jadi popup (permintaan user,
// 2026-09-09) memakai standar Dialog shadcn yang sama dipakai
// WebhookFormModal/ManageOrganizationModal, supaya pengaturan SSO tidak
// perlu pindah halaman -- dibuka langsung dari link "Konfigurasi SSO ->"
// di ManageOrganizationModal. Logic form (validasi protokol, client secret
// "kosongkan untuk mempertahankan") tidak berubah dari versi halaman.
export default function SsoConfigModal({ organization, onClose }: SsoConfigModalProps) {
  const orgId = organization?.id ?? ''
  const open = organization !== null
  const config = useSsoConfig(orgId)
  const update = useUpdateSsoConfig(orgId)

  const [protocol, setProtocol] = useState<SsoProtocol>('oidc')
  const [idpEntityId, setIdpEntityId] = useState('')
  const [idpMetadataUrl, setIdpMetadataUrl] = useState('')
  const [idpMetadataXml, setIdpMetadataXml] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [discoveryUrl, setDiscoveryUrl] = useState('')
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config.data) {
      setProtocol(config.data.protocol ?? 'oidc')
      setIdpEntityId(config.data.idp_entity_id ?? '')
      setIdpMetadataUrl(config.data.idp_metadata_url ?? '')
      setIdpMetadataXml(config.data.idp_metadata_xml ?? '')
      setClientId(config.data.client_id ?? '')
      setClientSecret('')
      setDiscoveryUrl(config.data.discovery_url ?? '')
      setSsoEnabled(config.data.sso_enabled)
    }
  }, [config.data])

  const handleClose = () => {
    setSaved(false)
    update.reset()
    onClose()
  }

  const onSave = () => {
    setSaved(false)
    update.mutate(
      {
        protocol,
        idp_entity_id: idpEntityId,
        idp_metadata_url: idpMetadataUrl,
        idp_metadata_xml: idpMetadataXml,
        client_id: clientId,
        client_secret: clientSecret,
        discovery_url: discoveryUrl,
        sso_enabled: ssoEnabled,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  const errorMessage = update.error instanceof ApiError ? update.error.message : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Konfigurasi SSO -- {organization?.name ?? '...'}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[calc(100vh-260px)] flex-col gap-4 overflow-y-auto px-5 py-4">
          {config.isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {config.isError && <p className="text-sm text-destructive">Gagal memuat konfigurasi SSO.</p>}

          {config.data && (
            <>
              <div className="border border-line-strong bg-panel p-4">
                <label className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-text-bone">
                  <input type="checkbox" checked={ssoEnabled} onChange={(e) => setSsoEnabled(e.target.checked)} />
                  SSO Aktif untuk Organisasi Ini
                </label>
                <p className="font-mono text-[9px] leading-relaxed text-text-dim">
                  {ssoEnabled
                    ? 'Seluruh member organisasi ini WAJIB login lewat SSO -- kredensial lokal (email/password) tidak berlaku lagi.'
                    : 'Member organisasi ini tetap login dengan kredensial lokal (email/password).'}
                </p>
              </div>

              <div className="border border-line-strong bg-panel p-4">
                <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-text-dim">PROTOKOL</div>
                <div className="flex gap-1.5">
                  {PROTOCOLS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setProtocol(p.value)}
                      className={cn(
                        'border px-3 py-1.5 font-mono text-[10px] font-semibold',
                        protocol === p.value ? 'border-signal bg-signal/10 text-signal' : 'border-line-strong text-text-muted',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {protocol === 'oidc' ? (
                <div className="border border-line-strong bg-panel p-4">
                  <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-text-dim">METADATA OIDC</div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">DISCOVERY URL · WAJIB</label>
                      <input
                        value={discoveryUrl}
                        onChange={(e) => setDiscoveryUrl(e.target.value)}
                        placeholder="https://idp.contoh.com/.well-known/openid-configuration"
                        className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">CLIENT ID</label>
                      <input
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">
                        CLIENT SECRET {config.data.has_client_secret && '· TERSIMPAN, KOSONGKAN UNTUK MEMPERTAHANKAN'}
                      </label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={config.data.has_client_secret ? '••••••••' : ''}
                        className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-line-strong bg-panel p-4">
                  <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-text-dim">METADATA SAML 2.0</div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">IDP ENTITY ID</label>
                      <input
                        value={idpEntityId}
                        onChange={(e) => setIdpEntityId(e.target.value)}
                        className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">METADATA URL</label>
                      <input
                        value={idpMetadataUrl}
                        onChange={(e) => setIdpMetadataUrl(e.target.value)}
                        placeholder="https://idp.contoh.com/metadata"
                        className="w-full border border-line-strong bg-input-bg px-3 py-2 font-mono text-[11px] text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim">
                        METADATA XML · WAJIB DIISI KALAU METADATA URL KOSONG
                      </label>
                      <textarea
                        value={idpMetadataXml}
                        onChange={(e) => setIdpMetadataXml(e.target.value)}
                        placeholder="<EntityDescriptor ...>...</EntityDescriptor>"
                        className="h-28 w-full resize-y border border-line-strong bg-input-bg px-3 py-2 font-mono text-[10.5px] leading-relaxed text-text-bone outline-none focus-visible:border-signal"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-line-strong bg-panel p-4">
                <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-text-dim">STATUS KONEKSI</div>
                <p className="font-mono text-[10px] text-text-muted">
                  {config.data.is_tested && config.data.last_test_at
                    ? `Terakhir diuji ${new Date(config.data.last_test_at).toLocaleString('id-ID')}`
                    : 'Belum pernah diuji.'}
                </p>
              </div>

              {errorMessage && <p className="text-[11px] text-destructive">⚠ {errorMessage}</p>}
              {saved && <p className="border border-mint p-2.5 font-mono text-[10px] text-mint">✓ Konfigurasi SSO disimpan.</p>}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={update.isPending || !config.data}
            onClick={onSave}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
          >
            {update.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
