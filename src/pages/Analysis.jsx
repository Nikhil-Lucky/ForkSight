import { Activity, Boxes, FileClock, History, LayoutDashboard, Network, Radar, Scale, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import Brand from '../components/Brand'

const tabs = [
  { name: 'Overview', icon: LayoutDashboard }, { name: 'Future Risks', icon: Radar }, { name: 'Bug Resurrection', icon: History },
  { name: 'Blast Radius', icon: Network }, { name: 'Agent Debate', icon: Scale }, { name: 'Prevention Plan', icon: ShieldCheck },
]

export default function Analysis() {
  const [active, setActive] = useState('Overview')
  return <div className="workspace">
    <aside className="workspace-sidebar"><Brand/><div className="workspace-label">ANALYSIS WORKSPACE</div><nav>{tabs.map(({name, icon: Icon}) => <button className={active === name ? 'active' : ''} onClick={() => setActive(name)} key={name}><Icon size={17}/><span>{name}</span></button>)}</nav><div className="side-status"><span/><div><strong>Workspace idle</strong><small>No scan has been run</small></div></div></aside>
    <main className="workspace-main">
      <header className="workspace-header"><div><small>REPOSITORY / NOT CONNECTED</small><h1>{active}</h1></div><div className="workspace-actions"><span className="empty-badge"><i/> EMPTY WORKSPACE</span><a href="/analyze" className="button button-small">New analysis</a></div></header>
      <div className="workspace-content">
        <div className="context-bar"><div><Boxes/><span><small>REPOSITORY</small>Not configured</span></div><div><FileClock/><span><small>PROPOSED CHANGE</small>Not provided</span></div><div><Activity/><span><small>STATUS</small>Waiting for setup</span></div></div>
        <section className="workspace-empty">
          <div className="radar-empty"><div className="orbit one"/><div className="orbit two"/><div className="orbit three"/><Radar/></div>
          <span className="eyebrow">{active} / Waiting state</span><h2>Nothing to inspect yet.</h2><p>This workspace is ready to organize {active.toLowerCase()} when a real analysis engine is connected. No findings have been generated or implied.</p><a href="/analyze" className="button">Configure an analysis</a>
          <div className="empty-command"><span>$</span> forksight status <b>— awaiting repository context</b></div>
        </section>
      </div>
    </main>
  </div>
}
