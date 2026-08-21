export interface SessionDeviceInfo {
  browser: string
  os: string
  ip: string
}

export interface SessionSummary {
  jti: string
  device_info: SessionDeviceInfo
  created_at: string
  last_active_at: string
  is_current: boolean
}
