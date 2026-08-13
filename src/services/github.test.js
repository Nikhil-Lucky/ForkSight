import assert from 'node:assert/strict'
import test from 'node:test'
import { GitHubError, parseGitHubUrl } from './github.js'

test('parses repository URLs with git suffixes and custom ports', () => {
  const parsed = parseGitHubUrl('https://github.com:8443/Nikhil-Lucky/ForkSight.git')
  assert.equal(parsed.fullName, 'Nikhil-Lucky/ForkSight')
  assert.equal(parsed.kind, 'repository')
})

test('parses public pull request URLs', () => {
  const parsed = parseGitHubUrl('https://github.com/owner/repo/pull/123')
  assert.equal(parsed.pullNumber, 123)
  assert.equal(parsed.kind, 'pull_request')
})

test('rejects unrelated GitHub paths', () => {
  assert.throws(() => parseGitHubUrl('https://github.com/owner/repo/issues/1'), GitHubError)
})
