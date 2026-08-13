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
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase()) || url.protocol !== 'https:' || url.port) {
    throw new GitHubError('Use an HTTPS github.com repository URL.', 'invalid_url')
  }
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2 || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) {
    throw new GitHubError('The URL must look like https://github.com/owner/repository.', 'invalid_url')
  }
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/i, '')
  if (!repo) throw new GitHubError('The repository name is missing.', 'invalid_url')
  return { owner, repo, fullName: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}` }
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

export async function inspectRepository(input, onProgress = () => {}) {
  const parsed = parseGitHubUrl(input)
  onProgress('Reading repository metadata')
  const repo = await request(`/repos/${parsed.owner}/${parsed.repo}`)
  if (!repo || repo.private) throw new GitHubError('Only public GitHub repositories can be analyzed.', 'not_found')
  const branch = repo.default_branch
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
  const candidates = recentCommits.map(commit => {
    const signals = [...new Set((commit.message.match(FIX_TERMS) || []).map(x => x.toLowerCase()))]
    return { ...commit, signals, score: signals.length + (/^(fix|hotfix)/i.test(commit.message) ? 1 : 0) }
  }).filter(c => c.signals.length).sort((a, b) => b.score - a.score).slice(0, 6)

  onProgress('Gathering evidence from likely fixes')
  const historicalFixes = []
  for (const candidate of candidates) {
    const detail = await request(`/repos/${parsed.owner}/${parsed.repo}/commits/${candidate.sha}`)
    const files = (detail?.files || []).slice(0, 25).map(file => file.filename)
    const confidence = Math.min(0.94, 0.48 + candidate.signals.length * 0.12 + (files.length ? 0.08 : 0))
    historicalFixes.push({ ...candidate, files, confidence, heuristic: true })
  }

  return {
    repository: { owner: parsed.owner, name: parsed.repo, fullName: repo.full_name, url: repo.html_url, description: repo.description,
      defaultBranch: branch, language: repo.language || 'Unknown', stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.updated_at },
    recentCommits, historicalFixes, tree,
  }
}
