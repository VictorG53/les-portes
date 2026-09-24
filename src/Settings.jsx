import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { DEFAULT_SETTINGS } from './settings'
import { formatNumMode } from './game'
import { play } from './sound'

const MOTION = [['auto', 'Auto'], ['reduce', 'Réduites'], ['full', 'Complètes']]
const FORMATS = [['short', 'Abrégé'], ['scientific', 'Scientifique']]
const EXAMPLE = 1234567

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

function Row({ title, hint, children }) {
  return (
    <div className="settings-row">
      <div className="settings-label">
        <b>{title}</b>
        {hint && <span className="muted">{hint}</span>}
      </div>
      <div className="settings-control">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="track" />
    </label>
  )
}

// fenêtre des réglages de l'appareil (ils ne font pas partie de la sauvegarde de la partie)
export default function Settings({ settings, onChange, onClose, onResetGame, onReplayTutorial }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="reveal settings"
        role="dialog"
        aria-modal="true"
        aria-label="Réglages"
        style={{ '--c': 'var(--accent)' }}
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reveal-title">Réglages</div>

        <div className="settings-group">
          <div className="settings-title">Son</div>
          <Row title="Volume" hint={`${Math.round(settings.volume * 100)} %`}>
            <input
              className="range"
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(settings.volume * 100)}
              aria-label="Volume"
              onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
              onPointerUp={() => play('click')}
              onKeyUp={() => play('click')}
            />
          </Row>
          <Row title="Couper le son">
            <Toggle checked={settings.muted} onChange={(muted) => onChange({ muted })} label="Couper le son" />
          </Row>
        </div>

        <div className="settings-group">
          <div className="settings-title">Affichage</div>
          <Row title="Animations" hint="« Auto » suit le réglage de ton système.">
            <Segmented label="Animations" value={settings.motion} options={MOTION} onChange={(motion) => onChange({ motion })} />
          </Row>
          <Row title="Format des nombres" hint={`Exemple : ${formatNumMode(EXAMPLE, settings.numberFormat)}`}>
            <Segmented label="Format des nombres" value={settings.numberFormat} options={FORMATS} onChange={(numberFormat) => onChange({ numberFormat })} />
          </Row>
          <Row title="Notifications de succès" hint="Les succès sont débloqués même si elles sont masquées.">
            <Toggle checked={settings.toasts} onChange={(toasts) => onChange({ toasts })} label="Notifications de succès" />
          </Row>
        </div>

        <div className="settings-group">
          <div className="settings-title">Aide</div>
          <Row title="Conseils du jeu" hint="De courtes bulles qui expliquent une nouveauté quand elle apparaît.">
            <Toggle checked={settings.tips} onChange={(tips) => onChange({ tips })} label="Conseils du jeu" />
          </Row>
          <Row title="Guide de démarrage" hint="Refais le tour des bases.">
            <button className="btn small ghost" onClick={onReplayTutorial}>
              Revoir le guide
            </button>
          </Row>
        </div>

        <div className="settings-group">
          <div className="settings-title">Données</div>
          <Row title="Réglages par défaut" hint="Ne touche pas à ta partie.">
            <button className="btn small ghost" onClick={() => onChange(DEFAULT_SETTINGS)}>
              Réinitialiser
            </button>
          </Row>
          <Row title="Recommencer la partie" hint="Efface toute ta progression.">
            <button className="btn small danger" onClick={onResetGame}>
              Effacer la partie
            </button>
          </Row>
        </div>

        <button className="btn settings-close" onClick={onClose}>
          Fermer
        </button>
      </motion.div>
    </motion.div>
  )
}
