const SIDEBAR_STORAGE_KEY = 'seed.sidebar.collapsed';

export function readSidebarCollapsed(): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'; }
  catch { return false; }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed)); }
  catch { /* Navigation still works when browser storage is unavailable. */ }
}
