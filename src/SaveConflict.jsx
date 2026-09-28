import { motion } from 'framer-motion'
import { formatNum } from './game'

function Summary({ title, s }) {
  return (
    <div className="save-conflict-side">
      <div className="tt-title">{title}</div>
      <div className="confirm-rows">
        <div>
          <span className="muted">Or gagné</span>
          <b>{formatNum(s.gold)}</b>
        </div>
        <div>
          <span className="muted">Portes ouvertes</span>
          <b>{formatNum(s.opened)}</b>
        </div>
        <div>
          <span className="muted">Clés</span>
          <b>{formatNum(s.keys)}</b>
        </div>
      </div>
    </div>
  )
}

// choix forcé quand l'appareil et le compte ont chacun une progression réelle et différente : pas de
// bouton « Annuler », il faut trancher (voir App.jsx pour la détection du conflit)
export default function SaveConflict({ local, remote, onKeepLocal, onKeepRemote }) {
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="reveal save-conflict"
        role="dialog"
        aria-modal="true"
        aria-label="Deux parties trouvées"
        style={{ '--c': 'var(--accent)' }}
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <div className="reveal-title">Deux parties trouvées</div>
        <p className="muted">
          Cet appareil et ton compte n'ont pas la même progression. Laquelle veux-tu garder ? L'autre sera
          définitivement remplacée.
        </p>

        <div className="save-conflict-grid">
          <Summary title="Cet appareil" s={local} />
          <Summary title="Ton compte" s={remote} />
        </div>

        <div className="confirm-actions">
          <button className="btn ghost" onClick={onKeepLocal}>
            Garder cet appareil
          </button>
          <button className="btn" autoFocus onClick={onKeepRemote}>
            Charger celle du compte
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
