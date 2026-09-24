// Logo de l'app : une porte entrouverte qui laisse passer la lumière. Le même dessin existe dans public/logo.svg.
export default function Logo({ size = 34, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Les Portes">
      <rect width="64" height="64" rx="15" fill="#1e1712" />
      <circle cx="34" cy="34" r="22" fill="#ffc94d" opacity=".12" />
      <path d="M14 55V29C14 19.6 22.1 12 32 12s18 7.6 18 17v26z" fill="#ffc94d" />
      <path d="M18.5 55V29.5C18.5 22.1 24.5 16.5 32 16.5s13.5 5.6 13.5 13V55z" fill="#fff0bd" />
      <path d="M28 55l17-9v9z" fill="#ffc94d" opacity=".55" />
      <path d="M18.5 55V29.5c0-4.9 2.6-8.9 6.5-11.3L31 21v29z" fill="#d0552b" />
      <path d="M18.5 55V29.5c0-4.9 2.6-8.9 6.5-11.3L26 19v33z" fill="#a8401d" />
      <circle cx="28.5" cy="37" r="1.7" fill="#ffc94d" />
      <path d="M46 9l1.4 3.6L51 14l-3.6 1.4L46 19l-1.4-3.6L41 14l3.6-1.4z" fill="#fff0bd" />
    </svg>
  )
}
