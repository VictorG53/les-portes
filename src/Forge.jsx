import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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

const SUSPENSE_MS = 1100

// fenêtre de la forge : on tente d'améliorer un exemplaire (risque de le perdre)
export default function Forge({ startKey, liveState, onEnhance, onFreeze, onUnfreeze, onClose }) {
  const [key, setKey] = useState(startKey)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { success, level } après une tentative
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
    timer.current = setTimeout(() => {
      setBusy(false)
      setResult({ success: plan.success, level: plan.level + 1, lost: !plan.success })
      play(plan.success ? 'enhanceOk' : 'enhanceFail')
      if (plan.success) setKey(keyOf(item.id, tier, shiny, plan.level + 1))
      onUnfreeze()
    }, SUSPENSE_MS)
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

        <motion.div
          className="reveal-badge"
          animate={
            busy
              ? { x: [0, -6, 6, -6, 6, -3, 3, 0], rotate: [0, -4, 4, -4, 4, 0], transition: { duration: SUSPENSE_MS / 1000, ease: 'linear' } }
              : state === 'fail'
                ? { opacity: 0.25, scale: 0.85 }
                : state === 'ok'
                  ? { scale: [1, 1.18, 1] }
                  : { y: [0, -5, 0], transition: { repeat: Infinity, duration: 2.2 } }
          }
        >
          {item.emoji}
        </motion.div>

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
                🪙 {formatNum(cost)} <span className="muted">(tu as {formatNum(liveState.gold)})</span>
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
        {item.ability && !maxed && <div className="ability">⚡ {abilityText(item, tier, shiny, level)}</div>}
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
