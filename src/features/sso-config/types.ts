// Konfigurasi SSO per Organisasi (US-074, Track S4G S4G-23/24, freehand --
// tidak ada file desain, lihat sprint_backlog.md). Cakupan sengaja lebih
// kecil dari draft S12-27..33: test koneksi IdP, enforcement auth_mode,
// reset password massal, dan registrasi Keycloak dinamis TIDAK termasuk.
export type SsoProtocol = 'saml2' | 'oidc'

export interface SsoConfig {
  organization_id: string
  configured: boolean
  sso_enabled: boolean
  protocol: SsoProtocol | null
  idp_entity_id: string | null
  idp_metadata_url: string | null
  idp_metadata_xml: string | null
  client_id: string | null
  has_client_secret: boolean
  discovery_url: string | null
  is_tested: boolean
  last_test_at: string | null
  updated_at: string | null
}

export interface SsoConfigFormValues {
  protocol: SsoProtocol
  idp_entity_id: string
  idp_metadata_url: string
  idp_metadata_xml: string
  client_id: string
  client_secret: string
  discovery_url: string
  sso_enabled: boolean
}
