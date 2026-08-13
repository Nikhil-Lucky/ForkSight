import { GitFork } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Brand({ compact = false }) {
  return <Link className="brand" to="/" aria-label="ForkSight home">
    <span className="brand-mark"><GitFork size={compact ? 17 : 20} /></span>
    <span>ForkSight</span>
  </Link>
}
