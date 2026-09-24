import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RARITIES, RARITY_ORDER, abilityText, itemIncome, rarityClass } from './data'
import { formatNum } from './game'
import { playReveal } from './sound'
import { groupResults, revealStep } from './revealUtils'

const rarityIdx = (item) => RARITY_ORDER.indexOf(item.rarity)

export default function Reveal({ results, onClose }) {
  useEffect(() => playReveal(results), [results])

  const sorted = [...results].sort(
    (a, b) => rarityIdx(b.item) - rarityIdx(a.item) || Number(b.shiny) - Number(a.shiny),
  )
  const best = sorted[0].item
  const bestShiny = sorted[0].shiny
  const bestColor = RARITIES[best.rarity].color
  const single = results.length === 1
  const tiles = groupResults(results)
  const step = revealStep(tiles.length)
  // objets d'or et talismans sont présentés séparément quand le lot contient les deux
  const sections = [
    { key: 'gold', title: 'Objets', list: tiles.filter((t) => !t.item.ability) },
    { key: 'charm', title: 'Talismans', list: tiles.filter((t) => t.item.ability) },
  ].filter((s) => s.list.length > 0)
  // animations réduites : réglage de l'app (data-motion) ou préférence du système en mode « auto »
  const osReduced = useReducedMotion()
  const motionSetting = document.documentElement.dataset.motion
  const reduced = motionSetting === 'reduce' || (motionSetting !== 'full' && osReduced)

  // « Continuer » n'est actif qu'une fois tous les objets dévoilés (apparition de la dernière tuile + le temps de se poser)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const ms = reduced ? 250 : single ? 700 : (0.15 + tiles.length * step) * 1000 + 500
    const t = setTimeout(() => setReady(true), ms)
    return () => clearTimeout(t)
  }, [reduced, single, tiles.length, step])
  const close = ready ? onClose : undefined

  const newCount = results.filter((r) => r.isNew).length
  const shinyCount = results.filter((r) => r.shiny).length
  const totalIncome = results.reduce((sum, r) => sum + (r.item.ability ? 0 : itemIncome(r.item, 1, r.shiny)), 0)

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      {single ? (
        <motion.div
          className="reveal"
          style={{ '--c': bestColor }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tt-tags">
            <span className={`chip ${rarityClass(best.rarity)}`}>{RARITIES[best.rarity].label}</span>
            {bestShiny && <span className="chip shiny-chip">✨ Shiny</span>}
          </div>
          <motion.div
            className={`reveal-badge ${bestShiny ? 'shiny' : ''}`}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
          >
            {best.emoji}
          </motion.div>
          <div className="reveal-name">{best.name}</div>
          {results[0].isNew && <div className="new">NOUVEAU</div>}
          {!results[0].isNew && results[0].isNewShiny && <div className="new">✨ NOUVEAU SHINY</div>}
          <div className="muted">
            {best.ability ? 'Talisman : ne rapporte pas d\u2019or' : `+${formatNum(itemIncome(best, 1, bestShiny))} or/s`}
          </div>
          {best.ability && <div className="ability">⚡ {abilityText(best, 1, bestShiny)}</div>}
          <button className="btn" disabled={!ready} onClick={onClose}>
            Continuer
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="reveal multi"
          style={{ '--c': bestColor }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reveal-title">{results.length} portes ouvertes</div>
          {tiles.length < results.length && <div className="muted">{tiles.length} objets différents</div>}
          <div className="multi-body">
            {sections.map((section) => (
              <div key={section.key} className="multi-section">
                {sections.length > 1 && (
                  <div className="multi-title">
                    {section.title} <span>{section.list.reduce((n, t) => n + t.count, 0)}</span>
                  </div>
                )}
                <div className="multi-grid">
                  {section.list.map((r) => {
                    const i = tiles.indexOf(r) // rang d'apparition, pour l'animation et le son
                    const c = RARITIES[r.item.rarity].color
                    return (
                      <motion.div
                        key={i}
                        className={`mini ${r.shiny ? 'shiny' : ''}`}
                        style={{ '--c': c }}
                        initial={{ scale: 0, rotate: -15, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.15 + i * step, type: 'spring', stiffness: 260, damping: 14 }}
                        title={r.count > 1 ? `${r.item.name} ×${r.count}` : r.item.name}
                      >
                        {(r.isNew || r.isNewShiny) && <span className="mini-new">NEW</span>}
                        {r.count > 1 && <span className="mini-count">×{r.count}</span>}
                        {r.shiny && <span className="shiny-dot">✨</span>}
                        {r.item.ability && <span className="ab-dot">⚡</span>}
                        <span className="emoji">{r.item.emoji}</span>
                        <small className={rarityClass(r.item.rarity)}>{RARITIES[r.item.rarity].label}</small>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="muted">
            Meilleur : <b style={{ color: bestColor }}>{best.name}</b>
            {newCount > 0 && ` · ${newCount} nouveau${newCount > 1 ? 'x' : ''}`}
            {shinyCount > 0 && ` · ✨ ${shinyCount} shiny`}
          </div>
          <div className="muted">+{formatNum(totalIncome)} or/s au total</div>
          <button className="btn" disabled={!ready} onClick={onClose}>
            Continuer
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
