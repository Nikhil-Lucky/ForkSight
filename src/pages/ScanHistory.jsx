import { CalendarClock, ExternalLink, GitBranch, History, Play, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { clearHistory, deleteHistoryScan, loadHistory, openHistoryScan } from '../services/storage'

const dateTime = value => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function ScanHistory() {
  const navigate = useNavigate()
  const [scans, setScans] = useState(loadHistory)
  const stats = useMemo(() => ({
    repositories: new Set(scans.map(scan => scan.repository.fullName)).size,
    highRisk: scans.filter(scan => scan.overallRisk === 'high').length,
  }), [scans])
  const open = id => { if (openHistoryScan(id)) navigate('/analysis') }
  const rerun = scan => navigate('/analyze', { state: { rerun: { repoUrl: scan.repository.url, change: scan.change, modes: scan.modes } } })
  const remove = scan => {
    if (!window.confirm(`Delete the scan for ${scan.repository.fullName}?`)) return
    deleteHistoryScan(scan.id); setScans(loadHistory())
  }
  const clear = () => {
    if (!window.confirm('Clear all locally stored scan history? This cannot be undone.')) return
    clearHistory(); setScans([])
  }
  return <PageShell className="history-page">
    <section className="history-hero section-wrap"><div><span className="signal"><span/> LOCAL ANALYSIS ARCHIVE</span><h1>Scan History</h1><p>Reopen completed reports or repeat an analysis with the same inputs.</p></div>{scans.length > 0 && <button className="history-clear" onClick={clear}><Trash2 size={15}/> Clear History</button>}</section>
    <section className="history-content section-wrap">
      <div className="history-stats"><article><strong>{scans.length}</strong><span>Total scans</span></article><article><strong>{stats.repositories}</strong><span>Unique repositories</span></article><article><strong className="risk-text high">{stats.highRisk}</strong><span>High-risk scans</span></article></div>
      <div className="local-note"><ShieldAlert size={16}/><span>Scan history is stored locally in this browser.</span></div>
      {scans.length ? <div className="scan-list">{scans.map(scan => <article className="scan-card" key={scan.id}>
        <div className="scan-card-main"><div className="scan-repo"><GitBranch size={17}/><a href={scan.repository.url} target="_blank" rel="noreferrer">{scan.repository.fullName}<ExternalLink size={12}/></a></div><h2>{scan.change}</h2><div className="scan-meta"><span><CalendarClock size={14}/>{dateTime(scan.createdAt)}</span><span className={`risk-badge ${scan.overallRisk}`}>{scan.overallRisk} risk</span></div></div>
        <div className="scan-counts"><span><strong>{scan.futureRisks?.length || 0}</strong>Future risks</span><span><strong>{scan.resurrectionRisks?.length || 0}</strong>Resurrection risks</span><span><strong>{scan.historicalFixes?.length || 0}</strong>Historical fixes</span></div>
        <div className="scan-actions"><button className="button button-small" onClick={() => open(scan.id)}><ExternalLink size={14}/>Open Analysis</button><button className="secondary-button" onClick={() => rerun(scan)}><Play size={14}/>Run Again</button><button className="danger-button" aria-label={`Delete ${scan.repository.fullName} scan`} onClick={() => remove(scan)}><Trash2 size={15}/>Delete</button></div>
      </article>)}</div> : <div className="history-empty"><History size={34}/><h2>No completed scans yet</h2><p>Run an evidence analysis and it will appear here automatically.</p><button className="button" onClick={() => navigate('/analyze')}>Analyze a repository</button></div>}
    </section>
  </PageShell>
}
