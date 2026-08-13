import { ArrowRight, Check, GitBranch, History, Radar, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'

const modes = [
  { id: 'future', icon: Radar, label: 'Future Risk', detail: 'Explore possible failure paths introduced by the proposed change.' },
  { id: 'history', icon: History, label: 'Bug Resurrection', detail: 'Look for relationships to bugs previously fixed in Git history.' },
]

export default function Analyze() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(['future', 'history'])
  const toggle = (id) => setSelected(s => s.includes(id) ? (s.length > 1 ? s.filter(x => x !== id) : s) : [...s, id])
  const submit = (event) => { event.preventDefault(); navigate('/analysis') }
  return <PageShell className="analyze-page">
    <section className="page-intro narrow"><span className="signal"><span/> ANALYSIS SETUP</span><h1>Inspect a proposed change.</h1><p>Give ForkSight the context for your next change and choose how you want to examine it.</p></section>
    <div className="form-layout section-wrap">
      <form className="analysis-form" onSubmit={submit}>
        <div className="form-heading"><span>01</span><div><h2>Repository context</h2><p>Define where the change will live.</p></div></div>
        <label>GitHub repository URL <small>REQUIRED</small><div className="input-wrap"><GitBranch size={18}/><input type="url" required placeholder="https://github.com/organization/repository" /></div></label>
        <label>Proposed change or feature <small>REQUIRED</small><textarea required rows="6" placeholder="Describe what you plan to change, why it is needed, and which parts of the system it may touch..."/><span className="field-help">Specific intent will help focus a future analysis.</span></label>
        <div className="form-heading mode-heading"><span>02</span><div><h2>Analysis modes</h2><p>Select one direction or run both together.</p></div><button type="button" className="both-button" onClick={() => setSelected(['future','history'])}>Run both</button></div>
        <div className="mode-grid">{modes.map(({id, icon: Icon, label, detail}) => { const active = selected.includes(id); return <button type="button" className={`mode-card ${active ? 'selected' : ''}`} onClick={() => toggle(id)} key={id}><span className="check-box">{active && <Check size={14}/>}</span><Icon/><strong>{label}</strong><p>{detail}</p></button>})}</div>
        <div className="form-notice"><ShieldAlert size={18}/><p><strong>Frontend preview only.</strong> Continuing opens an empty analysis workspace. No repository is accessed and no real scan or analysis has been run.</p></div>
        <button className="button submit-button" type="submit">Open analysis workspace <ArrowRight size={17}/></button>
      </form>
      <aside className="form-aside"><span className="aside-kicker">WHAT TO EXPECT</span><h3>One workspace.<br/>Two timelines.</h3><div className="aside-diagram"><div><Radar/><span>FORWARD</span></div><i/><div><History/><span>BACKWARD</span></div></div><ul><li><Check/> A shell for future risk findings</li><li><Check/> A home for historical bug matches</li><li><Check/> No data leaves your browser in this milestone</li></ul></aside>
    </div>
  </PageShell>
}
