import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Brand from './Brand'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <header className="navbar">
    <div className="nav-inner">
      <Brand />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
      <nav className={open ? 'nav-links open' : 'nav-links'}>
        <NavLink to="/" onClick={close}>Product</NavLink>
        <NavLink to="/graveyard" onClick={close}>Bug Graveyard</NavLink>
        <NavLink to="/analysis" onClick={close}>Workspace</NavLink>
        <Link className="button button-small" to="/analyze" onClick={close}>Analyze repository</Link>
      </nav>
    </div>
  </header>
}
