import { cloneElement, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RARITIES, SHINY_MULT, abilityText, dropShare, itemIncome, rankInfo, rarityClass, starsText } from './data'
import { formatNum } from './game'

const GAP = 8
const MARGIN = 8
const TOP_LIMIT = 92 // sous l'en-tête fixe : au-dessus de cette limite, l'infobulle passe sous l'élément

function Popover({ rect, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let top = rect.top - height - GAP
    if (top < TOP_LIMIT) top = rect.bottom + GAP // pas de place au-dessus : on passe dessous
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN))
    setPos({ top, left })
  }, [rect, children])

  return createPortal(
    <div
      ref={ref}
      className="tooltip"
      role="tooltip"
      style={pos ? { top: pos.top, left: pos.left, opacity: 1 } : { top: 0, left: 0, opacity: 0 }}
    >
      {children}
    </div>,
    document.body,
  )
}

// Infobulle au style de l'app. Sans `wrap`, elle s'attache directement à l'enfant ;
// avec `wrap`, elle l'entoure d'un <span> (utile pour un bouton désactivé, qui ne reçoit pas la souris).
export default function Tip({ content, children, wrap = false, className = '' }) {
  const [rect, setRect] = useState(null)
  const show = (e) => setRect(e.currentTarget.getBoundingClientRect())
  const hide = () => setRect(null)
  const popover = rect && content ? <Popover rect={rect}>{content}</Popover> : null

  if (wrap) {
    return (
      <>
        <span
          className={`tip-wrap ${className}`}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          onPointerDown={hide}
        >
          {children}
        </span>
        {popover}
      </>
    )
  }

  const p = children.props
  const chain = (own, fn) => (e) => {
    own?.(e)
    fn(e)
  }
  return (
    <>
      {cloneElement(children, {
        onMouseEnter: chain(p.onMouseEnter, show),
        onMouseLeave: chain(p.onMouseLeave, hide),
        onFocus: chain(p.onFocus, show),
        onBlur: chain(p.onBlur, hide),
        onPointerDown: chain(p.onPointerDown, hide),
      })}
      {popover}
    </>
  )
}

// contenu standard pour un objet (tuile du sac, carte de la réserve...)
export function ItemTip({ item, tier = 1, shiny = false, level = 0, hint, lines = [] }) {
  const r = RARITIES[item.rarity]
  return (
    <div className="tt-item" style={{ '--c': r.color }}>
      <div className="tt-title">
        <span>{item.emoji}</span>
        {item.name}
        {level > 0 && <span className="lvl">+{level}</span>}
        {shiny && <span>✨</span>}
      </div>
      <div className="tt-tags">
        <span className={`chip ${rarityClass(item.rarity)}`}>{r.label}</span>
        {shiny && <span className="chip shiny-chip">Shiny</span>}
        {tier > 1 && <span className="stars">{starsText(tier)}</span>}
      </div>
      <div className="tt-muted">
        {item.ability
          ? `Talisman · ${Math.round(dropShare(item) * 100)} % des tirages de sa rareté`
          : `Rang ${rankInfo(item).rank}/${rankInfo(item).count} de sa rareté · ${Math.round(dropShare(item) * 100)} % des tirages`}
      </div>
      {item.ability ? (
        <div className="tt-row">Talisman : ne rapporte pas d'or</div>
      ) : (
        <div className="tt-row">
          Revenu <b>+{formatNum(itemIncome(item, tier, shiny, level))} or/s</b>
        </div>
      )}
      {item.ability && <div className="ability">⚡ {abilityText(item, tier, shiny, level)}</div>}
      {shiny && <div className="tt-muted">Version shiny : revenu et capacité ×{SHINY_MULT}</div>}
      {lines.map((l) => (
        <div key={l} className="tt-muted">
          {l}
        </div>
      ))}
      {hint && <div className="tt-hint">{hint}</div>}
    </div>
  )
}

export function Text({ title, children }) {
  return (
    <div>
      {title && <div className="tt-title">{title}</div>}
      <div className="tt-muted">{children}</div>
    </div>
  )
}
