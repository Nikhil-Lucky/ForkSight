const API = 'https://api.github.com'

export class GitHubError extends Error {
  constructor(message, code = 'github_error') {
    super(message)
    this.name = 'GitHubError'
    this.code = code
  }
}

export function parseGitHubUrl(value) {
  let url
  try { url = new URL(value.trim()) } catch { throw new GitHubError('Enter a valid GitHub repository URL.', 'invalid_url') }
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase()) || !['https:', 'http:'].includes(url.protocol)) {
    throw new GitHubError('Use a public github.com repository or pull request URL.', 'invalid_url')
  }
  const parts = url.pathname.split('/').filter(Boolean)
  const isPull = parts[2] === 'pull' && /^\d+$/.test(parts[3] || '')
  if (parts.length < 2 || (!isPull && parts.length > 2) || (isPull && parts.length > 4) || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) {
    throw new GitHubError('The URL must identify a GitHub repository or pull request.', 'invalid_url')
  }
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/i, '')
  if (!repo) throw new GitHubError('The repository name is missing.', 'invalid_url')
  const pullNumber = isPull ? Number(parts[3]) : null
  return { owner, repo, pullNumber, kind: isPull ? 'pull_request' : 'repository', fullName: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}${pullNumber ? `/pull/${pullNumber}` : ''}` }
}

async function request(path) {
  let response
  try {
    response = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
  } catch { throw new GitHubError('Could not reach GitHub. Check your connection and try again.', 'network') }
  if (response.status === 404) throw new GitHubError('Repository not found. It may be private, deleted, or the URL may be incorrect.', 'not_found')
  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get('x-ratelimit-reset')
    const suffix = reset ? ` Try again after ${new Date(Number(reset) * 1000).toLocaleTimeString()}.` : ' Please wait and try again.'
    throw new GitHubError(`GitHub's public API rate limit was reached.${suffix}`, 'rate_limit')
  }
  if (response.status === 409) return null
  if (!response.ok) throw new GitHubError(`GitHub returned an unexpected error (${response.status}).`, 'github_error')
  return response.json()
}

async function fetchBoundedTree(owner, repo, branch) {
  const queue = ['']
  const paths = []
  let directoriesInspected = 0
  while (queue.length && directoriesInspected < 6 && paths.length < 500) {
    const path = queue.shift()
    const encodedPath = path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : ''
    const contents = await request(`/repos/${owner}/${repo}/contents${encodedPath}?ref=${encodeURIComponent(branch)}`)
    directoriesInspected += 1
    if (!Array.isArray(contents)) continue
    for (const item of contents) {
      if (paths.length >= 500) break
      paths.push({ path: item.path, type: item.type, size: item.size || 0 })
      if (item.type === 'dir' && queue.length < 20) queue.push(item.path)
    }
  }
  return { paths, directoriesInspected, truncated: queue.length > 0 || paths.length >= 500 }
}

const FIX_TERMS = /\b(fix(?:e[ds])?|bug(?:fix)?|regression|crash|error|hotfix|security|auth|timeout|duplicate|race|resolv(?:e[ds]?|ing))\b/gi

const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|php|cs|vue|svelte)$/i
const EXCLUDED_PATH = /(^|\/)(?:vendor|dist|build|coverage|node_modules|\.next|generated|fixtures?)\//i
const termSet = value => new Set((value.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []).filter(term => !['the','and','for','with','from','this','that','change','support','additional'].includes(term)))

function relevance(path, context) {
  const lower = path.toLowerCase()
  const basename = lower.split('/').pop()
  let score = context.toLowerCase().includes(lower) || context.toLowerCase().includes(basename) ? 20 : 0
  for (const term of termSet(context)) if (lower.includes(term)) score += 2
  if (/(src|lib|app)\//i.test(path)) score += 1
  return score
}

function decodeContent(content) {
  try {
    const binary = atob(content.replace(/\n/g, ''))
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
  } catch { return '' }
}

function sourceEvidence(path, content, htmlUrl) {
  const lines = content.split(/\r?\n/)
  const signalPattern = /\b(?:export\s+(?:default\s+)?|class\s+|function\s+|const\s+|async\s+function\s+)([A-Za-z_$][\w$]*)|\b(fetch|request|parse|validate|throw|catch|URL)\b/
  const hits = lines.map((line, index) => ({ line, index })).filter(item => signalPattern.test(item.line)).slice(0, 4)
  const anchor = hits[0]?.index ?? 0
  const start = Math.max(0, anchor - 2)
  const end = Math.min(lines.length, start + 12)
  const symbols = [...new Set(hits.map(item => item.line.match(signalPattern)?.[1]).filter(Boolean))].slice(0, 6)
  return { path, symbols, signals: hits.map(item => item.line.trim()).slice(0, 5), snippet: lines.slice(start, end).join('\n').slice(0, 1800), startLine: start + 1, endLine: end, url: `${htmlUrl}#L${start + 1}-L${end}` }
}

export async function inspectRepository(input, proposedChange = '', onProgress = () => {}) {
  const parsed = parseGitHubUrl(input)
  onProgress('Reading repository metadata')
  const repo = await request(`/repos/${parsed.owner}/${parsed.repo}`)
  if (!repo || repo.private) throw new GitHubError('Only public GitHub repositories can be analyzed.', 'not_found')
  let pullRequest = null
  if (parsed.pullNumber) {
    onProgress('Reading pull request changes')
    const pull = await request(`/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}`)
    const files = (await request(`/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}/files?per_page=100`)) || []
    pullRequest = { number: pull.number, title: pull.title, body: pull.body || '', author: pull.user?.login || 'Unknown', url: pull.html_url,
      baseBranch: pull.base?.ref, headBranch: pull.head?.ref, headSha: pull.head?.sha, additions: pull.additions, deletions: pull.deletions, changedFiles: pull.changed_files,
      files: files.slice(0, 100).map(file => ({ path: file.filename, status: file.status, additions: file.additions, deletions: file.deletions, patch: file.patch?.slice(0, 5000) || '' })) }
  }
  const branch = pullRequest?.headSha || repo.default_branch
  if (!branch) throw new GitHubError('This repository is empty and has no default branch to inspect.', 'empty')

  onProgress('Inspecting recent commit history')
  const commits = (await request(`/repos/${parsed.owner}/${parsed.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=30`)) || []
  if (!commits.length) throw new GitHubError('This repository has no commits to analyze.', 'empty')
  const recentCommits = commits.map(c => ({
    sha: c.sha, message: c.commit.message.split('\n')[0], date: c.commit.author?.date || c.commit.committer?.date,
    author: c.commit.author?.name || c.author?.login || 'Unknown', url: c.html_url,
  }))

  onProgress('Mapping a bounded repository tree')
  const tree = await fetchBoundedTree(parsed.owner, parsed.repo, branch)
  for (const file of pullRequest?.files || []) {
    if (!tree.paths.some(item => item.path === file.path)) tree.paths.push({ path: file.path, type: 'file', size: 0, pullRequestChange: true })
  }
  const candidates = recentCommits.map(commit => {
    const signals = [...new Set((commit.message.match(FIX_TERMS) || []).map(x => x.toLowerCase()))]
    return { ...commit, signals, score: signals.length + (/^(fix|hotfix)/i.test(commit.message) ? 1 : 0) }
  }).filter(c => c.signals.length).sort((a, b) => b.score - a.score).slice(0, 6)

  onProgress('Gathering evidence from likely fixes')
  const historicalFixes = []
  for (const candidate of candidates) {
    const detail = await request(`/repos/${parsed.owner}/${parsed.repo}/commits/${candidate.sha}`)
    const detailFiles = (detail?.files || []).slice(0, 25)
    const files = detailFiles.map(file => file.filename)
    const confidence = Math.min(0.94, 0.48 + candidate.signals.length * 0.12 + (files.length ? 0.08 : 0))
    historicalFixes.push({ ...candidate, files, patches: detailFiles.filter(file => file.patch).slice(0, 5).map(file => ({ path: file.filename, patch: file.patch.slice(0, 3500) })), confidence, heuristic: true })
  }

  onProgress('Reading relevant source evidence')
  const context = `${pullRequest?.title || ''} ${pullRequest?.body || ''} ${pullRequest?.files.map(file => file.path).join(' ') || ''}`
  const proposedContext = `${proposedChange} ${context}`
  const candidatesForSource = tree.paths.filter(item => item.type === 'file' && (item.pullRequestChange || (item.size > 0 && item.size <= 100000)) && SOURCE_EXTENSIONS.test(item.path) && !EXCLUDED_PATH.test(item.path))
    .sort((a, b) => relevance(b.path, proposedContext) - relevance(a.path, proposedContext)).slice(0, 5)
  const deepEvidence = []
  for (const file of candidatesForSource) {
    const item = await request(`/repos/${parsed.owner}/${parsed.repo}/contents/${file.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`)
    const content = item?.encoding === 'base64' ? decodeContent(item.content || '') : ''
    if (content && !content.includes('\0')) deepEvidence.push(sourceEvidence(file.path, content, item.html_url))
  }

  return {
    repository: { owner: parsed.owner, name: parsed.repo, fullName: repo.full_name, url: repo.html_url, description: repo.description,
      defaultBranch: repo.default_branch, language: repo.language || 'Unknown', stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.updated_at },
    pullRequest, recentCommits, historicalFixes, tree, deepEvidence,
  }
}
