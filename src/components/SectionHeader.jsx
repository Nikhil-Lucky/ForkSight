export default function SectionHeader({ eyebrow, title, copy, align = 'left' }) {
  return <div className={`section-header ${align === 'center' ? 'center' : ''}`}>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h2>{title}</h2>{copy && <p>{copy}</p>}
  </div>
}
