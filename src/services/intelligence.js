const DOMAINS = [
  ['auth', 'Authentication', ['auth','login','logout','session','token','oauth','permission','role','user']],
  ['security', 'Security', ['security','secret','encrypt','password','csrf','xss','sanitize','vulnerability']],
  ['data', 'Data integrity', ['data','persist','save','delete','update','validation','duplicate','transaction']],
  ['api', 'API', ['api','endpoint','route','request','response','http','graphql','rest']],
  ['database', 'Database', ['database','db','sql','query','migration','schema','model']],
  ['performance', 'Performance', ['performance','cache','slow','memory','batch','latency','optimize']],
  ['state', 'State management', ['state','store','context','redux','hook','event']],
  ['errors', 'Error handling', ['error','exception','fallback','retry','failure','crash']],
  ['concurrency', 'Concurrency', ['async','queue','race','concurrent','worker','lock','thread']],
  ['configuration', 'Configuration', ['config','environment','env','flag','setting']],
  ['deployment', 'Deployment', ['deploy','docker','ci','build','release','workflow']],
  ['dependencies', 'Dependencies', ['dependency','package','library','upgrade','version']],
  ['testing', 'Testing', ['test','spec','coverage','mock','fixture']],
]

const words = value => new Set((value.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []).filter(w => !['the','and','for','with','from','this','that','into','will','change','add','use'].includes(w)))
const pathWords = path => [...words(path.replace(/[/.\\_-]/g, ' '))]
const severityFor = id => ['security','auth','data','database','concurrency'].includes(id) ? 'high' : ['api','deployment','errors','performance'].includes(id) ? 'medium' : 'low'
const severityRank = { low: 1, medium: 2, high: 3 }

export function analyzeIntelligence(change, inspection, modes) {
  const changeWords = words(change)
  const allPaths = inspection.tree.paths.filter(p => p.type === 'file').map(p => p.path)
  const domainMatches = DOMAINS.map(([id, category, terms]) => {
    const termHits = terms.filter(term => changeWords.has(term) || change.toLowerCase().includes(term))
    const files = allPaths.filter(path => {
      const lower = path.toLowerCase()
      return termHits.some(term => lower.includes(term)) || [...changeWords].some(term => term.length > 3 && lower.includes(term))
    }).slice(0, 8)
    const repoSignals = allPaths.filter(path => terms.some(term => path.toLowerCase().includes(term))).slice(0, 5)
    return { id, category, termHits, files: files.length ? files : repoSignals }
  })

  let futureRisks = []
  if (modes.includes('future')) {
    const relevant = domainMatches.filter(d => d.termHits.length || d.files.length).sort((a,b) => (b.termHits.length + b.files.length) - (a.termHits.length + a.files.length)).slice(0, 7)
    futureRisks = (relevant.length ? relevant : domainMatches.filter(d => ['errors','testing','configuration'].includes(d.id))).map(d => {
      const severity = severityFor(d.id)
      const confidence = Math.min(.88, .38 + d.termHits.length * .1 + Math.min(d.files.length, 4) * .06)
      return { title: `Potential ${d.category.toLowerCase()} risk`, category: d.category, severity, confidence, predicted: true,
        explanation: `The proposed change intersects ${d.category.toLowerCase()} concerns. This is a predicted risk, not a confirmed defect.`,
        evidence: [...(d.termHits.length ? [`Change terms: ${d.termHits.join(', ')}`] : []), ...(d.files.length ? [`Repository paths: ${d.files.join(', ')}`] : ['No direct path match; included as a general change safeguard.'])],
        affectedAreas: d.files, prevention: `Review ${d.category.toLowerCase()} boundaries and failure behavior before merging.`,
        suggestedTest: `Add a focused test covering the proposed behavior and an adverse ${d.category.toLowerCase()} case.` }
    })
  }

  let resurrectionRisks = []
  if (modes.includes('history')) {
    resurrectionRisks = inspection.historicalFixes.map(fix => {
      const fixWords = words(`${fix.message} ${fix.files.join(' ')}`)
      const sharedKeywords = [...changeWords].filter(w => fixWords.has(w)).slice(0, 10)
      const domains = DOMAINS.filter(([, , terms]) => terms.some(t => changeWords.has(t)) && terms.some(t => fixWords.has(t))).map(([,name]) => name)
      const matchedFiles = fix.files.filter(file => pathWords(file).some(w => changeWords.has(w))).slice(0, 8)
      const score = sharedKeywords.length + domains.length * 2 + matchedFiles.length * 2
      if (!score) return null
      const confidence = Math.min(.93, .4 + sharedKeywords.length * .06 + domains.length * .1 + matchedFiles.length * .1)
      return { oldCommit: fix.sha, oldFixDescription: fix.message, date: fix.date, files: fix.files, relationship: 'Historical overlap detected',
        title: 'Potential resurrection risk', confidence, severity: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low', commitUrl: fix.url,
        evidence: [...(sharedKeywords.length ? [`Shared keywords: ${sharedKeywords.join(', ')}`] : []), ...(domains.length ? [`Shared domains: ${domains.join(', ')}`] : []), ...(matchedFiles.length ? [`Path overlap: ${matchedFiles.join(', ')}`] : [])],
        prevention: `Review the historical fix and preserve its intent when implementing the proposed change.` }
    }).filter(Boolean).sort((a,b) => b.confidence - a.confidence)
  }

  const discoveredPaths = [...new Set([...futureRisks.flatMap(r => r.affectedAreas), ...resurrectionRisks.flatMap(r => r.files)])]
  const allFindings = [...futureRisks, ...resurrectionRisks]
  const maxSeverity = allFindings.reduce((max, item) => Math.max(max, severityRank[item.severity]), 0)
  const overallRisk = maxSeverity === 3 ? 'high' : maxSeverity === 2 ? 'medium' : maxSeverity === 1 ? 'low' : 'undetermined'
  const preventionPlan = [...futureRisks.map(r => ({ action: r.prevention, test: r.suggestedTest, source: r.title })), ...resurrectionRisks.map(r => ({ action: r.prevention, source: r.oldFixDescription }))]
  return { futureRisks, resurrectionRisks, blastRadius: discoveredPaths.slice(0, 30), overallRisk, preventionPlan }
}
