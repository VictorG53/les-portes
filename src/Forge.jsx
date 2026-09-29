import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, Zap } from 'lucide-react'
import {
  ENHANCE_RATES,
  ENHANCE_STEP,
  MAX_ENHANCE,
  RARITIES,
  abilityText,
  enhanceCost,
  itemIncome,
  keyOf,
  parseKey,
  rarityClass,
  starsText,
} from './data'
import { formatNum } from './game'
import { play } from './sound'

const SPIN_MS = 3400 // durée du tour de roue (le résultat s'affiche à son arrêt)
const SPIN_TURNS = 5
const rand = () => Math.random()

// point du cercle (rayon r, angle a en degrés, 0 = en haut, sens horaire) dans le repère 200×200 de la roue
const polar = (r, a) => [100 + r * Math.sin((a * Math.PI) / 180), 100 - r * Math.cos((a * Math.PI) / 180)]
const wedge = (from, to) => {
  const [x0, y0] = polar(92, from)
  const [x1, y1] = polar(92, to)
  return `M100 100 L${x0} ${y0} A92 92 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
}
// libellé posé le long du rayon, au milieu de la part, toujours lisible (retourné sur la moitié gauche)
function WedgeLabel({ from, to, children }) {
  const mid = (from + to) / 2
  const flip = mid > 180
  return (
    <text
      transform={`translate(100 100) rotate(${flip ? mid + 90 : mid - 90})`}
      x={flip ? -62 : 62}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="15"
      fontWeight="800"
      fill="#fff"
      style={{ letterSpacing: '.02em' }}
    >
      {children}
    </text>
  )
}

// roue : une part verte « Réussi » (proportionnelle aux chances) et une part rouge « Cassé ». Le repère
// (triangle) est fixe en haut, la roue tourne et s'arrête sur la part tirée.
function ForgeWheel({ rate, rotation, spinning, emoji, broken }) {
  const successEnd = rate * 360
  return (
    <div className="forge-wheel" aria-hidden="true">
      <div className="forge-pointer" />
      <motion.svg
        viewBox="0 0 200 200"
        className="forge-wheel-disc"
        animate={{ rotate: rotation }}
        transition={spinning ? { duration: SPIN_MS / 1000, ease: [0.1, 0.65, 0.12, 1] } : { duration: 0 }}
      >
        <path d={wedge(0, successEnd)} fill="var(--good)" />
        <path d={wedge(successEnd, 360)} fill="var(--danger)" />
        <path d={`M100 100 L100 8 M100 100 L${polar(92, successEnd)[0]} ${polar(92, successEnd)[1]}`} stroke="var(--surface)" strokeWidth="3" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--surface)" strokeWidth="4" />
        <WedgeLabel from={0} to={successEnd}>Réussi</WedgeLabel>
        <WedgeLabel from={successEnd} to={360}>Cassé</WedgeLabel>
      </motion.svg>
      <div className="forge-hub" style={{ opacity: broken ? 0.3 : 1 }}>{emoji}</div>
    </div>
  )
}

// fenêtre de la forge : on tente d'améliorer un exemplaire (risque de le perdre)
export default function Forge({ startKey, liveState, onEnhance, onFreeze, onUnfreeze, onClose }) {
  const [key, setKey] = useState(startKey)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { success, level } après une tentative
  const [rotation, setRotation] = useState(0)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const { item, tier, shiny, level } = parseKey(key)
  const r = RARITIES[item.rarity]
  const owned = liveState.inventory[key] ?? 0
  const maxed = level >= MAX_ENHANCE
  const cost = maxed ? 0 : enhanceCost(item, tier, shiny, level)
  const rate = maxed ? 0 : ENHANCE_RATES[level]
  const canPay = liveState.gold >= cost
  const canTry = !busy && !maxed && owned > 0 && canPay

  const attempt = () => {
    if (!canTry) return
    onFreeze()
    const plan = onEnhance(key)
    if (!plan) {
      onUnfreeze()
      return
    }
    setBusy(true)
    setResult(null)
    play('enhanceStart')
    // le résultat est déjà tiré (plan.success) : la roue s'arrête en un point au hasard de la part correspondante
    const end = rate * 360
    const [from, to] = plan.success ? [0, end] : [end, 360]
    const landing = from + (to - from) * (0.12 + 0.76 * rand()) // angle de la roue sous le repère
    const base = Math.floor(rotation / 360) * 360
    setRotation(base + SPIN_TURNS * 360 + (360 - landing))
    timer.current = setTimeout(() => {
      setBusy(false)
      setResult({ success: plan.success, level: plan.level + 1, lost: !plan.success })
      play(plan.success ? 'enhanceOk' : 'enhanceFail')
      if (plan.success) {
        setKey(keyOf(item.id, tier, shiny, plan.level + 1))
        setRotation(0) // nouvelle roue (les chances changent) : elle repart de sa position de départ
      }
      onUnfreeze()
    }, SPIN_MS)
  }

  const before = itemIncome(item, tier, shiny, level)
  const after = itemIncome(item, tier, shiny, level + 1)
  const state = busy ? 'busy' : result ? (result.success ? 'ok' : 'fail') : 'idle'

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => !busy && onClose()}
    >
      <motion.div
        className={`reveal forge forge-${state}`}
        style={{ '--c': r.color }}
        initial={{ scale: 0.85, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Forge"
      >
        <div className="reveal-title">Forge</div>

        {maxed ? (
          <div className="reveal-badge">{item.emoji}</div>
        ) : (
          <ForgeWheel rate={rate} rotation={rotation} spinning={busy} emoji={item.emoji} broken={state === 'fail'} />
        )}

        <div className="reveal-name">
          {item.name} {level > 0 && <span className="lvl">+{level}</span>}
        </div>
        <div className="tt-tags">
          <span className={`chip ${rarityClass(item.rarity)}`}>{r.label}</span>
          {shiny && <span className="chip shiny-chip">Shiny</span>}
          {tier > 1 && <span className="stars">{starsText(tier)}</span>}
        </div>

        {result && (
          <div className={`forge-result ${result.success ? 'ok' : 'fail'}`}>
            {result.success
              ? `Réussi ! ${item.name} passe à +${result.level}.`
              : `Échec... l'exemplaire s'est brisé.`}
          </div>
        )}

        {maxed ? (
          <div className="muted">Niveau maximum atteint (+{MAX_ENHANCE}).</div>
        ) : (
          <div className="confirm-rows">
            <div>
              <span className="muted">Chances de réussite</span>
              <b>{Math.round(rate * 100)} %</b>
            </div>
            <div className="progress">
              <i style={{ width: `${rate * 100}%` }} />
            </div>
            <div>
              <span className="muted">Coût</span>
              <b style={{ color: canPay ? 'var(--gold)' : 'var(--danger)' }}>
                <Coins size={14} strokeWidth={2.25} /> {formatNum(cost)} <span className="muted">(tu as {formatNum(liveState.gold)})</span>
              </b>
            </div>
            <div>
              <span className="muted">{item.ability ? 'Effet' : 'Revenu'}</span>
              <b>
                {item.ability
                  ? `+${Math.round(ENHANCE_STEP * 100)} % de puissance`
                  : `${formatNum(before)} → ${formatNum(after)} or/s`}
              </b>
            </div>
            <div>
              <span className="muted">Exemplaires de cette pile</span>
              <b>{owned}</b>
            </div>
          </div>
        )}
        {item.ability && !maxed && <div className="ability"><Zap size={13} strokeWidth={2.25} /> {abilityText(item, tier, shiny, level)}</div>}
        {!maxed && (
          <div className="forge-warning">En cas d'échec, l'exemplaire est détruit. L'or dépensé est perdu.</div>
        )}

        <div className="confirm-actions">
          <button className="btn ghost" disabled={busy} onClick={onClose}>
            Fermer
          </button>
          <button className="btn" autoFocus disabled={!canTry} onClick={attempt}>
            {busy ? 'Forge en cours…' : owned < 1 ? 'Plus d’exemplaire' : maxed ? 'Niveau maximum' : `Tenter +${level + 1}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
