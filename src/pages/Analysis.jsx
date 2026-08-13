import { Activity, AlertTriangle, Boxes, Check, Clipboard, ExternalLink, FileClock, FlaskConical, History, LayoutDashboard, Network, Radar, Scale, ShieldCheck, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import { loadScan } from '../services/storage'

const tabs = [
  { name: 'Overview', icon: LayoutDashboard }, { name: 'Failure Path', icon: Workflow }, { name: 'Future Risks', icon: Radar },
  { name: 'Bug Resurrection', icon: History }, { name: 'Blast Radius', icon: Network }, { name: 'What-If Simulator', icon: FlaskConical },
  { name: 'Evidence Perspectives', icon: Scale }, { name: 'Guardrail Pack', icon: ShieldCheck }, { name: 'Test Pack', icon: Check },
]
const percent = n => `${Math.round(n * 100)}%`
const shortDate = value => value ? new Date(value).toLocaleDateString() : 'Unknown date'
const unique = items => [...new Set(items.filter(Boolean).map(item => item.trim()))]
const list = items => items.length ? items.map(item => `- ${item}`).join('\n') : '- None found in the bounded scan'

function RiskCard({ risk }) {
  return <article className="finding-card"><div className="finding-top"><span className={`severity ${risk.severity}`}>{risk.severity}</span><span>{percent(risk.confidence)} confidence</span></div><h3>{risk.title}</h3><p>{risk.explanation}</p><h4>Evidence</h4><ul>{risk.evidence.map(item => <li key={item}>{item}</li>)}</ul>{risk.affectedAreas.length > 0 && <div className="path-list">{risk.affectedAreas.map(path => <code key={path}>{path}</code>)}</div>}<div className="finding-action"><strong>Prevention</strong><p>{risk.prevention}</p><strong>Suggested test</strong><p>{risk.suggestedTest}</p></div><small>Predicted / potential risk — heuristic, not a confirmed defect</small></article>
}

function ResurrectionCard({ risk }) {
  return <article className="finding-card resurrection"><div className="finding-top"><span className={`severity ${risk.severity}`}>{risk.severity}</span><span>{percent(risk.confidence)} confidence</span></div><h3>{risk.title}</h3><p><strong>{risk.relationship}</strong> with a likely historical fix.</p><a className="commit-link" href={risk.commitUrl} target="_blank" rel="noreferrer"><code>{risk.oldCommit.slice(0, 7)}</code> {risk.oldFixDescription} <ExternalLink size={13}/></a><p className="finding-date">{shortDate(risk.date)}</p><h4>Evidence</h4><ul>{risk.evidence.map(item => <li key={item}>{item}</li>)}</ul><div className="path-list">{risk.files.map(path => <code key={path}>{path}</code>)}</div><div className="finding-action"><strong>Prevention</strong><p>{risk.prevention}</p></div><small>Potential resurrection risk — historical overlap is heuristic, not proof</small></article>
}

function CopyButton({ label, text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  return <button className="button button-small copy-button" type="button" onClick={copy}><Clipboard size={14}/>{copied ? 'Copied' : label}</button>
}

const buildPacks = scan => {
  const affected = unique(scan.blastRadius)
  const guardrails = unique([
    ...scan.futureRisks.flatMap(r => [r.prevention, r.suggestedTest]),
    ...scan.resurrectionRisks.map(r => r.prevention),
    ...affected.map(path => `Review changes affecting ${path}.`),
  ])
  const focused = unique(scan.futureRisks.map(r => r.suggestedTest))
  const regressions = unique(scan.resurrectionRisks.map(r => `Regression: preserve the behavior fixed by ${r.oldCommit.slice(0, 7)} (${r.oldFixDescription}) in ${r.files.join(', ')}.`))
  return { affected, guardrails, focused, regressions }
}

const scenarios = [
  { name: 'Malformed / untrusted input', terms: ['security','auth','data','validation','api'], pathTerms: ['parse','input','api','route','service'] },
  { name: 'Dependency / API failure', terms: ['api','dependencies','errors'], pathTerms: ['api','service','client','request','package'] },
  { name: 'High traffic / load', terms: ['performance','concurrency','database'], pathTerms: ['server','api','queue','cache','database'] },
  { name: 'Configuration mistake', terms: ['configuration','deployment'], pathTerms: ['config','env','workflow','docker'] },
  { name: 'Compatibility regression', terms: ['api','dependencies','testing'], pathTerms: ['package','service','adapter','parse'] },
]

function applicableScenarios(scan) {
  const change = scan.change.toLowerCase()
  return scenarios.map(scenario => {
    const risks = scan.futureRisks.filter(r => scenario.terms.includes(r.category.toLowerCase().split(' ')[0]) || scenario.pathTerms.some(term => `${r.title} ${r.affectedAreas.join(' ')}`.toLowerCase().includes(term)))
    const areas = unique([...risks.flatMap(r => r.affectedAreas), ...scan.blastRadius.filter(path => scenario.pathTerms.some(term => path.toLowerCase().includes(term)))])
    const relevant = risks.length > 0 || areas.length > 0 || scenario.pathTerms.some(term => change.includes(term))
    return { ...scenario, risks, areas, relevant }
  }).filter(s => s.relevant)
}

function evidencePerspectives(scan) {
  const definitions = [
    ['Security', ['security','authentication','data integrity'], 'Validate trust boundaries and add adverse-input coverage.'],
    ['Reliability', ['error handling','performance','concurrency','api','database'], 'Review failure behavior and operational fallbacks before merging.'],
    ['QA / Testing', ['testing'], 'Run focused behavior and regression tests for every affected area.'],
    ['History / Regression', [], 'Read the matched historical fix and preserve its intent.'],
  ]
  return definitions.map(([name, categories, fallback]) => {
    const risks = name === 'History / Regression' ? scan.resurrectionRisks : scan.futureRisks.filter(r => categories.includes(r.category.toLowerCase()))
    const max = risks.some(r => r.severity === 'high') ? 'high' : risks.some(r => r.severity === 'medium') ? 'medium' : 'low'
    const stance = !risks.length ? 'Low concern' : max === 'high' ? 'Block before merge' : 'Review'
    const evidence = risks.length ? (name === 'History / Regression' ? risks.map(r => `${r.oldCommit.slice(0, 7)}: ${r.oldFixDescription}`) : risks.flatMap(r => r.evidence)).slice(0, 3) : ['No matching signal found in the bounded scan.']
    const area = unique(risks.flatMap(r => r.affectedAreas || r.files || []))[0] || scan.blastRadius[0] || 'No evidence-backed area identified'
    const action = risks[0]?.prevention || fallback
    return { name, stance, evidence, area, action }
  })
}

function failureRows(scan) {
  const fallbackFix = scan.resurrectionRisks[0]
  const rows = scan.futureRisks.map(risk => {
    const historical = scan.resurrectionRisks.find(old => old.files.some(file => risk.affectedAreas.includes(file))) || fallbackFix
    return { risk, historical }
  })
  if (!rows.length && fallbackFix) rows.push({ risk: null, historical: fallbackFix })
  return rows
}

function reportFor(scan, packs, rows) {
  const failure = rows.map(({ risk, historical }) => `- ${scan.change} → ${(risk?.affectedAreas || historical?.files || []).join(', ') || 'No evidence-backed area'} → ${risk?.title || 'Potential resurrection risk'} → ${historical ? `${historical.oldCommit.slice(0, 7)} ${historical.oldFixDescription}` : 'No Historical Match'} → ${risk?.explanation || 'Historical behavior could regress'} → ${risk?.prevention || historical?.prevention}`).join('\n') || '- No evidence-backed failure path generated'
  return `# ForkSight Analysis Report\n\n**Repository:** ${scan.repository.fullName}\n**Proposed change:** ${scan.change}\n**Overall predicted risk:** ${scan.overallRisk}\n**Inspected:** ${scan.tree.paths.length} paths, ${scan.recentCommits.length} commits\n\n## Future Risks\n${list(scan.futureRisks.map(r => `${r.title} (${r.severity}, ${percent(r.confidence)}): ${r.explanation}`))}\n\n## Bug Resurrection\n${list(scan.resurrectionRisks.map(r => `${r.oldCommit.slice(0, 7)} — ${r.oldFixDescription}; ${r.prevention}`))}\n\n## Failure Path\n${failure}\n\n## Blast Radius\n${list(packs.affected)}\n\n## Guardrail Pack\n${list(packs.guardrails.map(item => `[ ] ${item}`))}\n\n## Test Pack\n### Focused tests\n${list(packs.focused)}\n### Historical regressions\n${list(packs.regressions)}\n\n> ForkSight reports potential / predicted risk and potential resurrection risk using deterministic heuristics over bounded real GitHub evidence. This is heuristic simulation, not proof or a confirmed defect.`
}

export default function Analysis() {
  const [active, setActive] = useState('Overview')
  const [scan] = useState(loadScan)
  const [scenario, setScenario] = useState('')
  const packs = useMemo(() => scan ? buildPacks(scan) : null, [scan])
  const paths = useMemo(() => scan ? failureRows(scan) : [], [scan])
  const simulations = useMemo(() => scan ? applicableScenarios(scan) : [], [scan])
  if (!scan) return <div className="workspace"><aside className="workspace-sidebar"><Brand/></aside><main className="workspace-main"><section className="workspace-empty"><Radar/><h2>No analysis found.</h2><p>Run a repository analysis first. ForkSight does not show sample or fabricated findings.</p><Link to="/analyze" className="button">Configure an analysis</Link></section></main></div>
  const report = reportFor(scan, packs, paths)
  const summary = <div className="summary-grid"><article><strong>{scan.recentCommits.length}</strong><span>Commits inspected</span></article><article><strong>{scan.tree.paths.length}</strong><span>Paths inspected</span></article><article><strong>{scan.historicalFixes.length}</strong><span>Likely historical fixes</span></article><article><strong className={`risk-text ${scan.overallRisk}`}>{scan.overallRisk}</strong><span>Overall predicted risk</span></article></div>
  let content
  if (active === 'Overview') content = <><section className="repo-summary"><div><span className="eyebrow">Repository summary</span><h2>{scan.repository.fullName}</h2><p>{scan.repository.description || 'No repository description provided.'}</p></div><dl><div><dt>Default branch</dt><dd>{scan.repository.defaultBranch}</dd></div><div><dt>Language</dt><dd>{scan.repository.language}</dd></div><div><dt>Tree scope</dt><dd>{scan.tree.truncated ? 'Bounded / truncated' : 'Complete within inspected directories'}</dd></div></dl></section>{summary}<section className="results-section"><h2>Evidence snapshot</h2><div className="two-columns"><div><h3>Potential future risks</h3>{scan.futureRisks.slice(0,3).map(r => <RiskCard risk={r} key={r.title}/>)}{!scan.futureRisks.length && <p className="no-findings">This mode was not selected or no supported risk signal was found.</p>}</div><div><h3>Historical fixes & overlap</h3>{scan.resurrectionRisks.slice(0,3).map(r => <ResurrectionCard risk={r} key={r.oldCommit}/>)}{!scan.resurrectionRisks.length && <p className="no-findings">No historical overlap was detected in the bounded recent history.</p>}</div></div></section></>
  if (active === 'Failure Path') content = <section className="results-section"><span className="eyebrow">Evidence-linked chain</span><h2>Failure Path</h2><p className="section-note">Potential paths assembled only from this scan’s proposed change, findings, discovered areas, and historical fixes.</p><div className="failure-paths">{paths.map(({risk,historical}, i) => <article className="failure-path" key={`${risk?.title || 'history'}-${i}`}>{[['Proposed Change',scan.change],['Affected Files / Areas',(risk?.affectedAreas || historical?.files || []).join(', ') || 'No evidence-backed area'],['Potential Risk',risk?.title || 'Potential resurrection risk'],['Historical Fix',historical ? `${historical.oldCommit.slice(0,7)} — ${historical.oldFixDescription}` : 'No Historical Match'],['Possible Failure',risk?.explanation || 'Previously fixed behavior could regress.'],['Prevention',risk?.prevention || historical?.prevention]].map(([label,value], index) => <div className="failure-step" key={label}><small>{label}</small><p>{value}</p>{index < 5 && <span>→</span>}</div>)}</article>)}{!paths.length && <p className="no-findings">No evidence-backed finding was available. No Historical Match.</p>}</div></section>
  if (active === 'Future Risks') content = <section className="results-section"><span className="eyebrow">Predicted / potential risks</span><h2>Future Risks</h2><p className="section-note">Generated from proposed-change terms, discovered paths, and repository evidence. These are not confirmed bugs.</p><div className="cards-grid">{scan.futureRisks.map(r => <RiskCard risk={r} key={r.title}/>)}</div>{!scan.futureRisks.length && <p className="no-findings">Future Risk mode was not run.</p>}</section>
  if (active === 'Bug Resurrection') content = <section className="results-section"><span className="eyebrow">Historical overlap detected</span><h2>Bug Resurrection evidence</h2><p className="section-note">Likely fixes are inferred from commit messages and compared with change domains, keywords, and paths.</p><div className="cards-grid">{scan.resurrectionRisks.map(r => <ResurrectionCard risk={r} key={r.oldCommit}/>)}</div>{!scan.resurrectionRisks.length && <p className="no-findings">No overlap was detected, or Bug Resurrection mode was not run.</p>}</section>
  if (active === 'Blast Radius') content = <section className="results-section"><span className="eyebrow">Real discovered paths only</span><h2>Potential blast radius</h2><p className="section-note">These paths come only from the bounded GitHub tree or changed files in real candidate commits.</p><div className="blast-list">{scan.blastRadius.map(path => <code key={path}>{path}</code>)}</div>{!scan.blastRadius.length && <p className="no-findings">No evidence-backed path could be associated with this change.</p>}</section>
  if (active === 'What-If Simulator') { const selected = simulations.find(s => s.name === scenario); content = <section className="results-section"><span className="eyebrow">Heuristic simulation — not proof</span><h2>What-If Simulator</h2><p className="section-note">Choose a relevant scenario to highlight existing potential risks and areas. This does not create new evidence.</p><div className="scenario-tabs">{simulations.map(s => <button className={scenario === s.name ? 'active' : ''} onClick={() => setScenario(s.name)} key={s.name}>{s.name}</button>)}</div>{selected && <article className="simulation-result"><h3>{selected.name}</h3><p><strong>Applicable existing risks</strong></p>{selected.risks.length ? <ul>{selected.risks.map(r => <li key={r.title}>{r.title}: {r.explanation}</li>)}</ul> : <p>No categorized risk matched; relevance comes from the proposed change or discovered path.</p>}<p><strong>Highlighted areas</strong></p><div className="path-list">{selected.areas.map(a => <code key={a}>{a}</code>)}</div><small>Heuristic simulation, not proof.</small></article>}{!simulations.length && <p className="no-findings">No supported scenario was relevant to the evidence in this scan.</p>}</section> }
  if (active === 'Evidence Perspectives') content = <section className="results-section"><span className="eyebrow">Rule-based evidence review</span><h2>Evidence Perspectives</h2><p className="section-note">Four deterministic perspectives summarize the same scan evidence. No AI agents ran.</p><div className="perspectives">{evidencePerspectives(scan).map(p => <article key={p.name}><div className="perspective-top"><h3>{p.name}</h3><span className={`stance ${p.stance.startsWith('Block') ? 'block' : p.stance === 'Review' ? 'review' : 'low'}`}>{p.stance}</span></div><strong>Supporting evidence</strong><ul>{p.evidence.map(e => <li key={e}>{e}</li>)}</ul><strong>Key file / area</strong><code>{p.area}</code><strong>Recommended action</strong><p>{p.action}</p></article>)}</div></section>
  if (active === 'Guardrail Pack') content = <section className="results-section"><div className="section-title-row"><div><span className="eyebrow">Actionable pre-merge checklist</span><h2>Guardrail Pack</h2></div><CopyButton label="Copy Guardrail Pack" text={packs.guardrails.map(i => `- [ ] ${i}`).join('\n')}/></div><div className="checklist">{packs.guardrails.map((item,i) => <label key={item}><input type="checkbox"/><span><b>{String(i+1).padStart(2,'0')}</b>{item}</span></label>)}</div>{!packs.guardrails.length && <p className="no-findings">No evidence-backed guardrails were generated.</p>}</section>
  if (active === 'Test Pack') content = <section className="results-section"><div className="section-title-row"><div><span className="eyebrow">Consolidated and deduplicated</span><h2>Test Pack</h2></div><CopyButton label="Copy Test Plan" text={`# Focused tests\n${list(packs.focused)}\n\n# Historical regression tests\n${list(packs.regressions)}`}/></div><div className="test-groups"><article><h3>Focused suggested tests</h3>{packs.focused.map(t => <p key={t}><Check size={15}/>{t}</p>)}{!packs.focused.length && <p>No suggested tests found.</p>}</article><article><h3>Historical regression evidence</h3>{packs.regressions.map(t => <p key={t}><History size={15}/>{t}</p>)}{!packs.regressions.length && <p>No historical regression match found.</p>}</article></div></section>
  return <div className="workspace"><aside className="workspace-sidebar"><Brand/><div className="workspace-label">ANALYSIS WORKSPACE</div><nav>{tabs.map(({name, icon: Icon}) => <button className={active === name ? 'active' : ''} onClick={() => setActive(name)} key={name}><Icon size={17}/><span>{name}</span></button>)}</nav><div className="side-status"><span className="live-dot"/><div><strong>Analysis complete</strong><small>{shortDate(scan.createdAt)}</small></div></div></aside><main className="workspace-main"><header className="workspace-header"><div><small>REPOSITORY / {scan.repository.fullName.toUpperCase()}</small><h1>{active}</h1></div><div className="workspace-actions"><span className={`risk-badge ${scan.overallRisk}`}><AlertTriangle size={12}/> {scan.overallRisk} risk</span><CopyButton label="Copy Report" text={report}/><Link to="/analyze" className="button button-small">New analysis</Link></div></header><div className="workspace-content"><div className="context-bar"><div><Boxes/><span><small>REPOSITORY</small>{scan.repository.fullName} · {scan.repository.language}</span></div><div><FileClock/><span><small>PROPOSED CHANGE</small>{scan.change}</span></div><div><Activity/><span><small>EVIDENCE</small>{scan.recentCommits.length} commits · {scan.tree.paths.length} paths</span></div></div>{content}</div></main></div>
}
