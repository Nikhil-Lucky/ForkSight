export const SCAN_KEY = 'forksight.latestScan.v2'
export const HISTORY_KEY = 'forksight.scanHistory.v1'

const parse = value => {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

export function loadHistory() {
  const scans = parse(localStorage.getItem(HISTORY_KEY))
  return Array.isArray(scans) ? scans : []
}

export function saveScan(scan) {
  const value = JSON.stringify(scan)
  sessionStorage.setItem(SCAN_KEY, value)
  try {
    localStorage.setItem(SCAN_KEY, value)
    const history = loadHistory().filter(item => item.id !== scan.id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify([scan, ...history]))
  } catch { /* session copy keeps latest-scan compatibility */ }
}

export function loadScan() {
  return parse(sessionStorage.getItem(SCAN_KEY) || localStorage.getItem(SCAN_KEY))
}

export function openHistoryScan(id) {
  const scan = loadHistory().find(item => item.id === id)
  if (!scan) return false
  sessionStorage.setItem(SCAN_KEY, JSON.stringify(scan))
  return true
}

export function deleteHistoryScan(id) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter(item => item.id !== id)))
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}
