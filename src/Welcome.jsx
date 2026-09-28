import { motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import { formatNum } from './game'
import { play } from './sound'

function duration(sec) {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} j ${h} h`
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`
  return `${Math.max(1, m)} min`
}

// écran affiché au retour du joueur : récapitulatif du gain hors ligne
export default function Welcome({ seconds, gain, rate, capHours, onClose }) {
  const capped = seconds > capHours * 3600
  const close = () => {
    play('sell')
    onClose()
  }

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <motion.div
        className="reveal welcome"
        style={{ '--c': 'var(--gold)' }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reveal-title">Bon retour !</div>
        <div className="muted">Tu étais absent depuis {duration(seconds)}.</div>
        <div className="welcome-gain">+{formatNum(gain)} <Coins size={30} strokeWidth={2} /></div>
        <div className="muted">
          Tes objets équipés ont continué à rapporter à {Math.round(rate * 100)} % de leur revenu, jusqu'à{' '}
          {+capHours.toFixed(1)} h d'absence.
          {capped && ' Le reste de ton absence n’a pas été compté.'}
        </div>
        <button className="btn" onClick={close}>
          Récupérer
        </button>
      </motion.div>
    </motion.div>
  )
}
