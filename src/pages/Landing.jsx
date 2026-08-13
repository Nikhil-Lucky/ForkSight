import { ArrowRight, Binary, GitCompareArrows, History, Network, Radar, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import SectionHeader from '../components/SectionHeader'

const features = [
  { icon: Radar, title: 'Future Risk', text: 'Examine the shape and intent of a proposed change before it reaches production.' },
  { icon: History, title: 'Bug Resurrection', text: 'Connect new work to failure patterns that were previously fixed in repository history.' },
  { icon: Network, title: 'Blast Radius', text: 'Understand which systems, paths, and ownership boundaries may be affected.' },
  { icon: ShieldCheck, title: 'Prevention Plan', text: 'Turn findings into focused engineering safeguards and validation steps.' },
]

export default function Landing() {
  return <div><Navbar />
    <main>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <span className="signal"><span /> Pre-merge engineering intelligence</span>
          <h1>See the failure path<br/><em>before it ships.</em></h1>
          <p className="hero-tagline">Predict what breaks next. Prevent what broke before.</p>
          <p className="hero-description">ForkSight helps engineering teams reason about future software risk and recognize when a change may revive a bug buried in Git history.</p>
          <div className="hero-actions"><Link className="button" to="/analyze">Analyze repository <ArrowRight size={17}/></Link><a className="text-link" href="#how">Explore the workflow</a></div>
          <div className="trust-row"><span><ShieldCheck size={15}/> Pre-ship perspective</span><span><GitCompareArrows size={15}/> History-aware reasoning</span></div>
        </div>
        <div className="hero-visual" aria-label="ForkSight risk pipeline preview">
          <div className="window-bar"><span/><span/><span/><code>forksight / change-intelligence</code></div>
          <div className="visual-body">
            <div className="scan-header"><span className="repo-icon"><Binary size={21}/></span><div><small>PROPOSED CHANGE</small><strong>payments/retry-policy</strong></div><span className="status-chip">AWAITING SCAN</span></div>
            <div className="flow-line"><i/><i/><i/></div>
            <div className="visual-grid"><div className="visual-card cyan"><Radar/><small>01 / FORESIGHT</small><strong>Future risk surface</strong><p>Map what could break next.</p></div><div className="visual-card"><History/><small>02 / HISTORY</small><strong>Resurrection check</strong><p>Trace what broke before.</p></div></div>
            <div className="terminal-line"><span>$</span> forksight inspect <b>--before-merge</b><i className="cursor"/></div>
          </div>
        </div>
      </section>

      <section className="thesis section-wrap">
        <div className="thesis-label">THE ENGINEERING GAP</div><p>Most tools explain what is broken <em>now.</em> ForkSight is designed to help teams investigate what could break <em>next</em>—and whether they have already fought that failure once before.</p>
      </section>

      <section id="how" className="section-wrap content-section">
        <SectionHeader eyebrow="How it works" title="A clearer view before the merge" copy="One workflow brings proposed intent, repository structure, and historical failures into focus." align="center" />
        <div className="steps">
          <article><span>01</span><div className="step-icon"><GitCompareArrows/></div><h3>Point to the change</h3><p>Provide a repository and describe the feature or modification you plan to make.</p></article>
          <article><span>02</span><div className="step-icon"><Radar/></div><h3>Inspect both timelines</h3><p>Explore forward-looking risk alongside signals from previously fixed bugs.</p></article>
          <article><span>03</span><div className="step-icon"><ShieldCheck/></div><h3>Plan prevention</h3><p>Organize findings into an actionable workspace for safer implementation.</p></article>
        </div>
      </section>

      <section className="section-wrap content-section features-section">
        <SectionHeader eyebrow="Two directions. One view." title="Intelligence grounded in how software actually fails" copy="Look forward at emerging risk and backward at the defects your codebase has already survived." />
        <div className="feature-grid">{features.map(({icon: Icon, title, text}, index) => <article className="feature-card" key={title}><div className="feature-top"><span><Icon/></span><small>0{index+1}</small></div><h3>{title}</h3><p>{text}</p><div className="card-line"/></article>)}</div>
      </section>

      <section className="cta section-wrap"><div><span className="eyebrow">Start with intent</span><h2>Make the next change with<br/>more context.</h2><p>Set up a repository analysis workspace. No real scan runs in this frontend milestone.</p></div><Link className="button light" to="/analyze">Open analysis setup <ArrowRight size={17}/></Link></section>
    </main><Footer />
  </div>
}
