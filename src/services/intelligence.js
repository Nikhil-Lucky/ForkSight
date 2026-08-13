const RISK_RULES = [
  { id: 'input', category: 'Input Validation', direct: ['validate', 'validation', 'sanitize', 'parse', 'parsing', 'malformed', 'invalid', 'url format', 'input format'], code: ['validator', 'validation', 'parser', 'parse', 'sanitize'] },
  { id: 'api-reliability', category: 'API Reliability', direct: ['api failure', 'api unavailable', 'api reliability', 'github is unavailable', 'github unavailable', 'service unavailable', 'upstream failure', 'http error', 'network failure'], code: ['client', 'fetch', 'http', 'request', 'api'] },
  { id: 'rate-limit', category: 'Rate Limiting', direct: ['rate limit', 'rate-limit', 'ratelimit', 'throttle', 'quota', '429'], code: ['ratelimit', 'rate-limit', 'throttle', 'quota'] },
  { id: 'cache', category: 'Caching / Stale Data', direct: ['cache', 'caching', 'cached', 'stale', 'ttl', 'invalidation', 'memoize'], code: ['cache', 'memo', 'redis'] },
  { id: 'compatibility', category: 'Compatibility / Regression', direct: ['compatibility', 'backward compatible', 'backwards compatible', 'regression', 'additional format', 'new format', 'support additional', 'legacy'], code: ['compat', 'adapter', 'legacy', 'migration'] },
  { id: 'errors', category: 'Error Handling', direct: ['error handling', 'handle error', 'fallback', 'retry', 'failure', 'unavailable', 'exception', 'timeout'], code: ['error', 'exception', 'fallback', 'retry'] },
  { id: 'security-boundary', category: 'Security Boundary', direct: ['security boundary', 'trust boundary', 'untrusted', 'sanitize', 'url parsing', 'custom port', 'protocol', 'hostname', 'redirect', 'injection', 'xss', 'csrf', 'secret'], code: ['security', 'sanitize', 'url', 'proxy', 'cors'] },
  { id: 'auth', category: 'Authentication / Authorization', direct: ['authentication', 'authorization', 'oauth', 'login', 'logout', 'access token', 'api token', 'permission', 'role based', 'session cookie'], code: ['auth', 'oauth', 'login', 'permission', 'session'] },
  { id: 'data-integrity', category: 'Data Integrity', direct: ['data integrity', 'transaction', 'duplicate record', 'data loss', 'corruption', 'persist', 'database migration', 'schema migration'], code: ['transaction', 'schema', 'migration', 'database', 'repository'] },
  { id: 'performance', category: 'Performance', direct: ['performance', 'latency', 'slow', 'memory leak', 'optimize', 'throughput', 'large batch'], code: ['performance', 'benchmark', 'batch'] },
  { id: 'configuration', category: 'Configuration', direct: ['configuration', 'config', 'environment variable', 'feature flag', 'setting'], code: ['config', 'settings', 'environment'] },
  { id: 'dependency', category: 'Dependency Failure', direct: ['dependency failure', 'dependency upgrade', 'package upgrade', 'library upgrade', 'version conflict', 'third party failure'], code: ['package.json', 'lockfile', 'dependencies'] },
  { id: 'concurrency', category: 'Concurrency', direct: ['concurrency', 'concurrent', 'race condition', 'deadlock', 'lock', 'worker queue', 'parallel'], code: ['queue', 'worker', 'mutex', 'lock'] },
  { id: 'testing', category: 'Testing Gap', direct: ['missing test', 'without test', 'no test', 'testing gap', 'coverage gap', 'untested'], code: [] },
]

const COMMON_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'will', 'change', 'add', 'use', 'user', 'service', 'request', 'github', 'data', 'file', 'api'])
const words = value => new Set((value.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []).filter(word => !COMMON_WORDS.has(word)))
const pathWords = path => [...words(path.replace(/[/.\\_-]/g, ' '))]
const severityRank = { low: 1, medium: 2, high: 3 }
const includesSignal = (value, signal) => signal.includes(' ') || signal.includes('-') ? value.includes(signal) : words(value).has(signal)
const matchingSignals = (value, signals) => signals.filter(signal => includesSignal(value, signal))
const sourceEntries = inspection => (inspection.deepEvidence || inspection.sourceSignals || []).map(entry => typeof entry === 'string' ? { text: entry, path: '' } : { text: `${entry.signal || ''} ${entry.content || ''} ${entry.snippet || ''} ${(entry.signals || []).join(' ')}`, path: entry.path || entry.file || '' })
const withoutInternalStrength = risk => Object.fromEntries(Object.entries(risk).filter(([key]) => key !== '_strength'))

function mentionedPaths(change, paths) {
  const normalized = change.toLowerCase().replace(/\\/g, '/')
  return paths.filter(path => {
    const lower = path.toLowerCase().replace(/\\/g, '/')
    const basename = lower.split('/').pop()
    return normalized.includes(lower) || (basename.includes('.') && normalized.includes(basename))
  })
}

function buildRiskMatch(rule, change, inspection, allPaths) {
  const directHits = matchingSignals(change.toLowerCase(), rule.direct)
  const explicitlyMentioned = mentionedPaths(change, allPaths)
  const changeTerms = words(change)
  const pathHits = allPaths.filter(path => matchingSignals(path.toLowerCase(), rule.code).length && (
    explicitlyMentioned.includes(path) || pathWords(path).some(word => changeTerms.has(word))
  )).slice(0, 8)
  const relevantMentionedPaths = explicitlyMentioned.filter(path =>
    directHits.length || matchingSignals(path.toLowerCase(), rule.code).length
  )
  const deepHits = sourceEntries(inspection).filter(entry => matchingSignals(`${entry.path} ${entry.text}`.toLowerCase(), [...rule.direct, ...rule.code]).length).slice(0, 5)
  const historyHits = inspection.historicalFixes.filter(fix => matchingSignals(`${fix.message} ${fix.files.join(' ')}`.toLowerCase(), [...rule.direct, ...rule.code]).length).slice(0, 3)

  // A path is corroboration, not a reason to invent a category from generic folders.
  const strongPathHits = pathHits.filter(path => rule.code.some(signal => signal.length >= 5 && includesSignal(path.toLowerCase(), signal)))
  const hasStrongSource = directHits.length > 0 || deepHits.length > 0 || strongPathHits.length > 0 || historyHits.length > 0
  if (!hasStrongSource) return null

  const affectedAreas = [...new Set([...relevantMentionedPaths, ...deepHits.map(hit => hit.path).filter(Boolean), ...strongPathHits])].slice(0, 8)
  const sourceCount = [directHits.length > 0, deepHits.length > 0, (strongPathHits.length > 0 || relevantMentionedPaths.length > 0), historyHits.length > 0].filter(Boolean).length
  const strength = directHits.length * 3 + deepHits.length * 2 + Math.min(strongPathHits.length, 2) * 2 + Math.min(relevantMentionedPaths.length, 1) + Math.min(historyHits.length, 2) * 2
  const severity = directHits.length && strength >= 7 && sourceCount >= 2 ? 'high' : strength >= 4 ? 'medium' : 'low'
  const confidence = Math.min(0.9, 0.42 + Math.min(strength, 8) * 0.055 + (sourceCount - 1) * 0.03)
  const evidence = []
  if (directHits.length) evidence.push(`Direct change signals: ${directHits.join(', ')}`)
  if (deepHits.length) evidence.push(`Deep Evidence signals: ${deepHits.map(hit => hit.path || hit.text.trim()).join(', ')}`)
  if (relevantMentionedPaths.length) evidence.push(`Proposed repository paths: ${relevantMentionedPaths.join(', ')}`)
  if (strongPathHits.length) evidence.push(`Matching repository paths: ${strongPathHits.join(', ')}`)
  if (historyHits.length) evidence.push(`Historical fix evidence: ${historyHits.map(fix => `${fix.sha.slice(0, 7)} ${fix.message}`).join('; ')}`)

  return {
    title: `Potential ${rule.category.toLowerCase()} risk`, category: rule.category, severity, confidence, predicted: true,
    explanation: `Specific ${rule.category.toLowerCase()} signals overlap the proposed change or bounded repository evidence. This is a predicted risk, not a confirmed defect.`,
    evidence, affectedAreas,
    prevention: `Review the identified ${rule.category.toLowerCase()} behavior and its failure boundaries before merging.`,
    suggestedTest: `Add a focused test for the proposed behavior and an adverse ${rule.category.toLowerCase()} case.`,
    _strength: strength,
  }
}

export function analyzeIntelligence(change, inspection, modes) {
  const changeWords = words(change)
  const allPaths = inspection.tree.paths.filter(path => path.type === 'file').map(path => path.path)
  let futureRisks = []
  if (modes.includes('future')) {
    futureRisks = RISK_RULES.map(rule => buildRiskMatch(rule, change, inspection, allPaths)).filter(Boolean)
      .sort((a, b) => b._strength - a._strength).slice(0, 7)
      .map(withoutInternalStrength)
  }

  let resurrectionRisks = []
  if (modes.includes('history')) {
    resurrectionRisks = inspection.historicalFixes.map(fix => {
      const fixWords = words(`${fix.message} ${fix.files.join(' ')}`)
      const sharedKeywords = [...changeWords].filter(word => fixWords.has(word)).slice(0, 10)
      const domains = RISK_RULES.filter(rule => rule.direct.some(term => includesSignal(change.toLowerCase(), term)) && rule.direct.some(term => includesSignal(`${fix.message} ${fix.files.join(' ')}`.toLowerCase(), term))).map(rule => rule.category)
      const matchedFiles = fix.files.filter(file => pathWords(file).some(word => changeWords.has(word))).slice(0, 8)
      const score = sharedKeywords.length + domains.length * 2 + matchedFiles.length * 2
      if (!score) return null
      const confidence = Math.min(.93, .4 + sharedKeywords.length * .06 + domains.length * .1 + matchedFiles.length * .1)
      return { oldCommit: fix.sha, oldFixDescription: fix.message, date: fix.date, files: fix.files, relationship: 'Historical overlap detected',
        title: 'Potential resurrection risk', confidence, severity: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low', commitUrl: fix.url,
        evidence: [...(sharedKeywords.length ? [`Shared keywords: ${sharedKeywords.join(', ')}`] : []), ...(domains.length ? [`Shared domains: ${domains.join(', ')}`] : []), ...(matchedFiles.length ? [`Path overlap: ${matchedFiles.join(', ')}`] : [])],
        prevention: 'Review the historical fix and preserve its intent when implementing the proposed change.' }
    }).filter(Boolean).sort((a, b) => b.confidence - a.confidence)
  }

  const discoveredPaths = [...new Set([...futureRisks.flatMap(risk => risk.affectedAreas), ...resurrectionRisks.flatMap(risk => risk.files)])]
  const allFindings = [...futureRisks, ...resurrectionRisks]
  const maxSeverity = allFindings.reduce((max, item) => Math.max(max, severityRank[item.severity]), 0)
  const overallRisk = maxSeverity === 3 ? 'high' : maxSeverity === 2 ? 'medium' : maxSeverity === 1 ? 'low' : 'undetermined'
  const preventionPlan = [...futureRisks.map(risk => ({ action: risk.prevention, test: risk.suggestedTest, source: risk.title })), ...resurrectionRisks.map(risk => ({ action: risk.prevention, source: risk.oldFixDescription }))]
  return { futureRisks, resurrectionRisks, blastRadius: discoveredPaths.slice(0, 30), overallRisk, preventionPlan }
}
