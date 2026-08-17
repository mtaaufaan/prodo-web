import { create } from 'zustand'

// Skeleton UI store (S0-24). Real feature stores (task board, filters, etc.)
// get added per-feature from S1 onward -- this just proves the Zustand
// wiring works and gives the first real store a place to copy from.
interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
