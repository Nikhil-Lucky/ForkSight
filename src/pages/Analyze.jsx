import { ArrowRight, Check, GitBranch, History, LoaderCircle, Radar, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { inspectRepository } from '../services/github'
import { analyzeIntelligence } from '../services/intelligence'
import { saveScan } from '../services/storage'

const modes = [
  { id: 'future', icon: Radar, label: 'Future Risk', detail: 'Predict potential failure paths from repository structure and recent history.' },
  { id: 'history', icon: History, label: 'Bug Resurrection', detail: 'Compare the change with likely bug fixes found in recent Git history.' },
]

export default function Analyze() {
  const navigate = useNavigate()
  const location = useLocation()
  const rerun = location.state?.rerun
  const [selected, setSelected] = useState(rerun?.modes || ['future', 'history'])
  const [repoUrl, setRepoUrl] = useState(rerun?.repoUrl || '')
  const [change, setChange] = useState(rerun?.change || '')
  const [stage, setStage] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const toggle = (id) => setSelected(s => s.includes(id) ? (s.length > 1 ? s.filter(x => x !== id) : s) : [...s, id])
  const submit = async (event) => {
    event.preventDefault(); setError(''); setRunning(true)
    try {
      const inspection = await inspectRepository(repoUrl, setStage)
      setStage('Analyzing proposed change against evidence')
      await new Promise(resolve => setTimeout(resolve, 100))
      const intelligence = analyzeIntelligence(change, inspection, selected)
      const scan = { id: `${Date.now()}`, createdAt: new Date().toISOString(), change, modes: selected, ...inspection, ...intelligence }
      saveScan(scan)
      setStage('Analysis complete')
      navigate('/analysis')
    } catch (err) { setError(err instanceof Error ? err.message : 'Analysis failed unexpectedly.') } finally { setRunning(false) }
  }
  return <PageShell className="analyze-page">
    <section className="page-intro narrow"><span className="signal"><span/> LIVE REPOSITORY INTELLIGENCE</span><h1>Inspect a proposed change.</h1><p>ForkSight reads bounded public GitHub evidence in your browser. It never downloads or executes repository code.</p></section>
    <div className="form-layout section-wrap">
      <form className="analysis-form" onSubmit={submit}>
        <div className="form-heading"><span>01</span><div><h2>Repository context</h2><p>Define where the change will live.</p></div></div>
        <label>Public GitHub repository URL <small>REQUIRED</small><div className="input-wrap"><GitBranch size={18}/><input type="url" required value={repoUrl} onChange={e => setRepoUrl(e.target.value)} disabled={running} placeholder="https://github.com/organization/repository" /></div></label>
        <label>Proposed change or feature <small>REQUIRED</small><textarea required minLength="8" rows="6" value={change} onChange={e => setChange(e.target.value)} disabled={running} placeholder="Describe what you plan to change, why it is needed, and which parts of the system it may touch..."/><span className="field-help">Specific terms and areas improve evidence matching.</span></label>
        <div className="form-heading mode-heading"><span>02</span><div><h2>Analysis modes</h2><p>Select one direction or run both together.</p></div><button type="button" className="both-button" disabled={running} onClick={() => setSelected(['future','history'])}>Run both</button></div>
        <div className="mode-grid">{modes.map(({id, icon: Icon, label, detail}) => { const active = selected.includes(id); return <button type="button" disabled={running} className={`mode-card ${active ? 'selected' : ''}`} onClick={() => toggle(id)} key={id}><span className="check-box">{active && <Check size={14}/>}</span><Icon/><strong>{label}</strong><p>{detail}</p></button>})}</div>
        <div className="form-notice"><ShieldAlert size={18}/><p><strong>Heuristic analysis.</strong> Findings are evidence-based predictions, never certainty. GitHub public API rate limits apply; no key or secret is used.</p></div>
        {running && <div className="progress-stage" role="status"><LoaderCircle className="spinner" size={18}/><div><strong>Analyzing repository</strong><span>{stage}</span></div></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button submit-button" disabled={running} type="submit">{running ? 'Analysis in progress…' : 'Run evidence analysis'} {!running && <ArrowRight size={17}/>}</button>
      </form>
      <aside className="form-aside"><span className="aside-kicker">WHAT TO EXPECT</span><h3>One workspace.<br/>Two timelines.</h3><div className="aside-diagram"><div><Radar/><span>FORWARD</span></div><i/><div><History/><span>BACKWARD</span></div></div><ul><li><Check/> Up to 30 recent commits inspected</li><li><Check/> Bounded real repository paths</li><li><Check/> Strong fix candidates enriched with file evidence</li><li><Check/> Analysis stays in this browser</li></ul></aside>
    </div>
  </PageShell>
}
