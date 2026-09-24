import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ACHIEVEMENTS_BY_ID } from './achievements'
import { play } from './sound'

const MAX_VISIBLE = 2 // les autres attendent leur tour, pour ne pas recouvrir l'écran

function Toast({ item, onDone }) {
  const a = ACHIEVEMENTS_BY_ID[item.id]
  // onDone change à chaque rendu : on le range dans une ref pour que le son et le minuteur ne partent qu'une fois
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    play('achievement')
    const t = setTimeout(() => done.current(), 5500)
    return () => clearTimeout(t)
  }, [])
  if (!a) return null
  return (
    <motion.div
      layout
      className="toast"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      onClick={onDone}
    >
      <span className="toast-icon">{a.icon}</span>
      <div>
        <div className="toast-label">Succès débloqué</div>
        <b>{a.name}</b>
        <div className="muted">
          {a.desc} · +{Math.round(a.reward * 100)} % de revenu
        </div>
      </div>
    </motion.div>
  )
}

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.slice(0, MAX_VISIBLE).map((t) => (
          <Toast key={t.key} item={t} onDone={() => onDismiss(t.key)} />
        ))}
      </AnimatePresence>
      {toasts.length > MAX_VISIBLE && (
        <div className="toast-more">+{toasts.length - MAX_VISIBLE} autre{toasts.length - MAX_VISIBLE > 1 ? 's' : ''} succès à annoncer</div>
      )}
    </div>
  )
}
