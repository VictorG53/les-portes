import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GUIDE, HINTS } from './tutorial'

const GAP = 14
const MARGIN = 12

// position (rectangle) à l'écran de l'élément visé, mise à jour régulièrement (défilement, redimensionnement, rendu)
function useTargetRect(selector) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!selector) return undefined
    let scrolled = false
    const measure = () => {
      const el = document.querySelector(selector)
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      // on amène l'élément à l'écran une seule fois par étape (sous l'en-tête fixe, au-dessus de la barre du bas)
      if (!scrolled && (r.top < 96 || r.bottom > window.innerHeight - 90)) {
        scrolled = true
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      setRect((prev) =>
        prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height ? prev : r,
      )
    }
    measure()
    const id = setInterval(measure, 150)
    window.addEventListener('resize', measure)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
    }
  }, [selector])
  return selector ? rect : null
}

// bulle d'aide : ancrée sur un élément (avec un halo), ou centrée quand il n'y a pas de cible
function Coach({ step, index, total, guided, onNext, onSkip, onDismissHints }) {
  const rect = useTargetRect(step.target)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    if (!rect) {
      setPos({ top: Math.max(MARGIN, (window.innerHeight - height) / 2), left: (window.innerWidth - width) / 2 })
      return
    }
    let top = rect.bottom + GAP
    let arrow = 'up'
    if (top + height > window.innerHeight - MARGIN) {
      top = rect.top - height - GAP // pas de place dessous : au-dessus
      arrow = 'down'
    }
    if (top < MARGIN) {
      top = window.innerHeight - height - MARGIN // ni dessus ni dessous : en bas de l'écran
      arrow = null
    }
    const left = Math.max(MARGIN, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - MARGIN))
    setPos({ top, left, arrow, arrowLeft: Math.max(20, Math.min(rect.left + rect.width / 2 - left, width - 20)) })
  }, [rect, step.id])

  const centered = !step.target

  return createPortal(
    <>
      {centered && <div className="coach-backdrop" />}
      {rect && (
        <div
          className={`coach-halo ${guided ? 'dim' : ''}`}
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        ref={ref}
        className={`coach ${pos?.arrow ? `arrow-${pos.arrow}` : ''}`}
        role="dialog"
        aria-label={step.title}
        style={pos ? { top: pos.top, left: pos.left, '--arrow-left': `${pos.arrowLeft ?? 40}px`, opacity: 1 } : { top: 0, left: 0, opacity: 0 }}
      >
        <div className="coach-head">
          <b>{step.title}</b>
          {guided && (
            <span className="coach-count">
              {index + 1}/{total}
            </span>
          )}
        </div>
        <p>{step.text}</p>
        <div className="coach-actions">
          {guided ? (
            <button className="link" onClick={onSkip}>
              Passer le guide
            </button>
          ) : (
            <button className="link" onClick={onDismissHints}>
              Ne plus afficher les conseils
            </button>
          )}
          {(step.button || !guided) && (
            <button className="btn small" onClick={onNext}>
              {step.button ?? 'Compris'}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

// Didacticiel : guide de démarrage puis conseils contextuels. Ne bloque jamais le jeu (les clics passent à travers le halo).
export default function Tutorial({ state, tab, setTab, setTutorial, paused, hintsEnabled, onDisableHints }) {
  const t = state.tutorial
  const guideStep = !t.done ? GUIDE[t.step] : null
  const hint = !guideStep && hintsEnabled ? HINTS.find((h) => !t.seen[h.id] && h.when(state) && (!h.tab || h.tab === tab)) : null
  const current = guideStep ?? hint

  // une étape du guide qui a besoin d'un onglet y amène le joueur
  useEffect(() => {
    if (guideStep?.tab && tab !== guideStep.tab) setTab(guideStep.tab)
  }, [guideStep, tab, setTab])

  // étape franchie toute seule (ex. « ouvre une porte ») : on passe à la suivante
  useEffect(() => {
    if (guideStep?.done?.(state)) setTutorial({ step: t.step + 1 })
  })

  if (!current || paused) return null

  const next = () => {
    if (guideStep) {
      if (t.step + 1 >= GUIDE.length) setTutorial({ done: true })
      else setTutorial({ step: t.step + 1 })
    } else {
      setTutorial((cur) => ({ seen: { ...cur.seen, [hint.id]: true } }))
    }
  }

  return (
    <Coach
      step={current}
      index={t.step}
      total={GUIDE.length}
      guided={!!guideStep}
      onNext={next}
      onSkip={() => setTutorial({ done: true })}
      onDismissHints={onDisableHints}
    />
  )
}
