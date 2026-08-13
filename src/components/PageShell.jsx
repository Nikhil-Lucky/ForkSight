import Navbar from './Navbar'

export default function PageShell({ children, className = '' }) {
  return <><Navbar /><main className={`page ${className}`}>{children}</main></>
}
