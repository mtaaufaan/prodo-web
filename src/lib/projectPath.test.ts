import { describe, expect, it } from 'vitest'

import { projectIdFromPath, switchProjectPath } from './projectPath'

describe('projectIdFromPath', () => {
  it('mengambil id project dari URL halaman project', () => {
    expect(projectIdFromPath('/workspaces/ws1/projects/p1/board', 'ws1')).toBe('p1')
    expect(projectIdFromPath('/workspaces/ws1/projects/p1', 'ws1')).toBe('p1')
  })
  it('null untuk halaman non-project atau workspace lain', () => {
    expect(projectIdFromPath('/workspaces/ws1/performance', 'ws1')).toBeNull()
    expect(projectIdFromPath('/workspaces/ws1/projects', 'ws1')).toBeNull()
    expect(projectIdFromPath('/workspaces/ws2/projects/p1/board', 'ws1')).toBeNull()
  })
})

describe('switchProjectPath', () => {
  it('mengganti project dan mempertahankan halaman + query', () => {
    expect(switchProjectPath('/workspaces/ws1/projects/p1/sprints', '?q=1', 'ws1', 'p2')).toBe('/workspaces/ws1/projects/p2/sprints?q=1')
    expect(switchProjectPath('/workspaces/ws1/projects/p1', '', 'ws1', 'p2')).toBe('/workspaces/ws1/projects/p2')
  })
  it('null kalau halaman sekarang bukan halaman project', () => {
    expect(switchProjectPath('/workspaces/ws1/performance', '', 'ws1', 'p2')).toBeNull()
    expect(switchProjectPath('/workspaces/ws1/projects', '', 'ws1', 'p2')).toBeNull()
  })
})
