import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const HANDLER_NAMES = ['onPointerEnter', 'onPointerLeave', 'onFocus', 'onBlur', 'onPointerDown', 'onPointerUp', 'onPointerCancel', 'onClickCapture', 'onContextMenu']
const LONG_PRESS_MS = 450 // appui long (tactile) qui affiche l'infobulle
const TOUCH_SHOW_MS = 2800 // durée d'affichage de l'infobulle sur écran tactile

// Infobulle au style de l'app. Sans `wrap`, elle s'attache directement à l'enfant ;
// avec `wrap`, elle l'entoure d'un <span> (utile pour un bouton désactivé, qui ne reçoit pas la souris).
//
// Souris : survol. Clavier : focus (visible). Écran tactile : appui long — un simple appui n'affiche rien
// (sinon l'infobulle surgirait à chaque clic sur un bouton), sauf sur un bouton désactivé, où il explique pourquoi.
export default function Tip({ content, children, wrap = false, className = '' }) {
  const [rect, setRect] = useState(null)
  // état mutable propre à ce composant (minuteries, drapeau d'appui long) : il ne provoque jamais de nouveau rendu
  const [touch] = useState(() => ({
    press: null, // minuterie de l'appui long
    autoHide: null, // minuterie de masquage automatique (tactile)
    longPressed: false, // l'infobulle vient d'être ouverte par un appui long : le clic qui suit est ignoré
  }))

  useEffect(
    () => () => {
      clearTimeout(touch.press)
      clearTimeout(touch.autoHide)
    },
    [touch],
  )

  const show = (el) => setRect(el.getBoundingClientRect())
  const hide = () => {
    clearTimeout(touch.press)
    clearTimeout(touch.autoHide)
    setRect(null)
  }
  const showThenHide = (el) => {
    show(el)
    clearTimeout(touch.autoHide)
    touch.autoHide = setTimeout(() => setRect(null), TOUCH_SHOW_MS)
  }

  const handlers = {
    onPointerEnter: (e) => e.pointerType === 'mouse' && show(e.currentTarget),
    onPointerLeave: (e) => e.pointerType === 'mouse' && hide(),
    // le focus n'affiche l'infobulle que pour la navigation au clavier (pas après un simple clic ou appui)
    onFocus: (e) => e.target.matches?.(':focus-visible') && show(e.currentTarget),
    onBlur: hide,
    onPointerDown: (e) => {
      touch.longPressed = false
      if (e.pointerType === 'mouse') return hide()
      hide()
      const el = e.currentTarget
      touch.press = setTimeout(() => {
        touch.longPressed = true
        showThenHide(el)
      }, LONG_PRESS_MS)
    },
    onPointerUp: (e) => {
      if (e.pointerType === 'mouse') return
      clearTimeout(touch.press)
      // simple appui sur un bouton désactivé : on affiche pourquoi il ne fait rien
      if (!touch.longPressed && e.currentTarget.querySelector?.('button:disabled')) showThenHide(e.currentTarget)
    },
    onPointerCancel: () => clearTimeout(touch.press),
    // après un appui long, on n'exécute pas l'action du bouton (le doigt qui se lève ne doit rien déclencher)
    onClickCapture: (e) => {
      if (touch.longPressed) {
        e.stopPropagation()
        e.preventDefault()
        touch.longPressed = false
      }
    },
    onContextMenu: (e) => touch.longPressed && e.preventDefault(),
  }
  const popover = rect && content ? <Popover rect={rect}>{content}</Popover> : null

  if (wrap) {
    return (
      <>
        <span className={`tip-wrap ${className}`} {...handlers}>
          {children}
        </span>
        {popover}
      </>
    )
  }

  const p = children.props
  const merged = {}
  for (const name of HANDLER_NAMES) {
    merged[name] = (e) => {
      p[name]?.(e)
      handlers[name](e)
    }
  }
  return (
    <>
      {cloneElement(children, merged)}
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
