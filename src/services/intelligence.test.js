import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeIntelligence } from './intelligence.js'

const inspection = {
  tree: { paths: [
    { type: 'file', path: 'src/services/github.js' },
    { type: 'file', path: 'src/services/storage.js' },
    { type: 'file', path: 'src/pages/Analysis.jsx' },
  ] },
  historicalFixes: [],
}

const categoriesFor = change => analyzeIntelligence(change, inspection, ['future']).futureRisks.map(risk => risk.category)

test('URL parsing change yields specific risks without inventing authentication', () => {
  const categories = categoriesFor('Modify GitHub repository URL parsing in src/services/github.js to support additional URL formats and custom ports.')
  assert.deepEqual(categories, ['Input Validation', 'Security Boundary', 'Compatibility / Regression'])
  assert.ok(!categories.includes('Authentication / Authorization'))
})

test('GitHub availability change yields reliability risks without inventing authentication', () => {
  const categories = categoriesFor('Add caching for GitHub API requests and improve behavior when GitHub is unavailable or rate limited.')
  for (const expected of ['API Reliability', 'Rate Limiting', 'Caching / Stale Data', 'Error Handling']) assert.ok(categories.includes(expected))
  assert.ok(!categories.includes('Authentication / Authorization'))
})

test('generic nouns alone do not produce risks', () => {
  assert.deepEqual(categoriesFor('Update user service API request data file.'), [])
})

test('high severity requires direct evidence corroborated by another strong source', () => {
  const weak = analyzeIntelligence('Add caching for responses.', inspection, ['future']).futureRisks[0]
  assert.notEqual(weak.severity, 'high')

  const corroborated = analyzeIntelligence('Fix cache invalidation in cache/redis.js.', {
    ...inspection,
    tree: { paths: [{ type: 'file', path: 'cache/redis.js' }] },
    deepEvidence: [{ path: 'cache/redis.js', signals: ['stale cache invalidation'] }],
  }, ['future']).futureRisks.find(risk => risk.category === 'Caching / Stale Data')
  assert.equal(corroborated.severity, 'high')
})
