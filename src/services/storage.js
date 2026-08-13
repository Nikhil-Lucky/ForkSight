export const SCAN_KEY = 'forksight.latestScan.v2'

export function saveScan(scan) {
  const value = JSON.stringify(scan)
  sessionStorage.setItem(SCAN_KEY, value)
  try { localStorage.setItem(SCAN_KEY, value) } catch { /* session copy remains available */ }
}

export function loadScan() {
  const value = sessionStorage.getItem(SCAN_KEY) || localStorage.getItem(SCAN_KEY)
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}
