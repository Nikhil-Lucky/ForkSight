import { ArrowRight, Bug, GitCommitHorizontal, SearchCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell'

export default function Graveyard() {
  return <PageShell className="graveyard-page">
    <section className="graveyard-hero section-wrap">
      <div className="graveyard-copy"><span className="signal"><span/> HISTORICAL FAILURE INTELLIGENCE</span><h1>The bugs you buried.<br/><em>Kept in sight.</em></h1><p>The Bug Graveyard will surface previously fixed defects discovered from Git history—so new changes do not unknowingly bring them back.</p><Link className="button" to="/analyze">Set up an analysis <ArrowRight size={17}/></Link></div>
      <div className="grave-visual"><div className="commit-rail"><i/><i/><i/><i/></div><div className="grave-card back"><small>FIX / ARCHIVED</small><span/></div><div className="grave-card front"><Bug size={30}/><span className="grave-id">BUG HISTORY / EMPTY</span><h3>No ghosts in the machine.</h3><p>Historical bug records will be catalogued here after repository analysis is available.</p><div className="grave-meta"><span><GitCommitHorizontal/> commit —</span><span>status <b>awaiting scan</b></span></div></div></div>
    </section>
    <section className="graveyard-empty section-wrap"><div className="empty-rule"><span>GRAVEYARD INDEX</span><i/></div><SearchCode size={36}/><h2>The archive is waiting.</h2><p>No repository history has been examined. Once analysis is connected, fixed defects and their relevant code paths will appear here—without fabricated placeholders.</p><div className="grave-stats"><div><strong>—</strong><span>Historical bugs</span></div><div><strong>—</strong><span>Resurrection matches</span></div><div><strong>—</strong><span>Commits inspected</span></div></div></section>
  </PageShell>
}
