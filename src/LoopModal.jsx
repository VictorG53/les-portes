import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DOORS, QUANTITIES, RARITIES, RARITY_ORDER, rarityClass } from './data'
import { doorPrice, formatNum } from './game'
import { play, playReveal } from './sound'

const STEP_MS = 160 // une ouverture toutes les 160 ms

// ouverture en boucle : ouvre des portes à la chaîne, sans écran de résultat, jusqu'à une condition d'arrêt.
// `getLive` renvoie l'état de jeu courant (jamais périmé), `bonus` ses bonus, `openDoor` ouvre vraiment.
export default function LoopModal({ getLive, bonus, maxSeenDoor, batchMax, openDoor, onResults, onClose }) {
  const available = DOORS.filter((_, i) => i <= maxSeenDoor)
  const [doorId, setDoorId] = useState(available[available.length - 1]?.id ?? DOORS[0].id)
  const [qty, setQty] = useState(1)
  const [keep, setKeep] = useState(0) // or à ne pas dépenser
  const [stopAt, setStopAt] = useState('none') // rareté qui arrête la boucle
  const [limit, setLimit] = useState(1000)
  const [run, setRun] = useState(null) // { opened, spent, byRarity, best, news, reason, running }
  const stop = useRef(null) // raison d'arrêt demandée
  const acc = useRef({ opened: 0, best: null }) // ouvertures faites et meilleur résultat de la boucle en cours
  const cfg = useRef({})
  cfg.current = { doorId, qty, keep, stopAt, limit, bonus, onResults, getLive }

  const door = DOORS.find((d) => d.id === doorId)
  const price = doorPrice(door, bonus.discount, bonus.permanent)
  const running = !!run?.running

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const { doorId, qty, keep, stopAt, limit, bonus, onResults, getLive } = cfg.current
      const live = getLive()
      const cost = doorPrice(DOORS.find((d) => d.id === doorId), bonus.discount, bonus.permanent) * qty
      let reason = stop.current
      if (!reason && live.gold < cost) reason = 'Plus assez d’or.'
      else if (!reason && live.gold - cost < keep) reason = 'Réserve d’or atteinte.'
      if (!reason) {
        const results = openDoor(doorId, qty)
        if (!results) reason = 'Plus assez d’or.'
        else {
          onResults(doorId, results)
          setRun((r) => {
            const byRarity = { ...r.byRarity }
            let best = r.best
            for (const x of results) {
              byRarity[x.item.rarity] = (byRarity[x.item.rarity] ?? 0) + 1
              if (!best || RARITY_ORDER.indexOf(x.item.rarity) > RARITY_ORDER.indexOf(best.item.rarity)) best = x
            }
            return {
              ...r,
              opened: r.opened + results.length,
              spent: r.spent + cost,
              byRarity,
              best,
              news: r.news + results.filter((x) => x.isNew).length,
              shinies: r.shinies + results.filter((x) => x.shiny).length,
            }
          })
          acc.current.opened += results.length
          for (const x of results) {
            const b = acc.current.best
            if (!b || RARITY_ORDER.indexOf(x.item.rarity) > RARITY_ORDER.indexOf(b.item.rarity)) acc.current.best = x
          }
          const hit = stopAt !== 'none' && results.some((x) => RARITY_ORDER.indexOf(x.item.rarity) >= RARITY_ORDER.indexOf(stopAt))
          if (hit) reason = `${RARITIES[stopAt].label} (ou mieux) obtenu !`
          else if (acc.current.opened >= limit) reason = 'Maximum d’ouvertures atteint.'
        }
      }
      if (reason) {
        stop.current = null
        setRun((r) => ({ ...r, running: false, reason }))
        if (acc.current.best) playReveal([acc.current.best])
      }
    }, STEP_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const start = () => {
    acc.current = { opened: 0, best: null }
    stop.current = null
    setRun({ running: true, opened: 0, spent: 0, byRarity: {}, best: null, news: 0, shinies: 0, reason: null })
    play('open')
  }

  const rarities = RARITY_ORDER.filter((r) => run?.byRarity[r])
  const best = run?.best

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !running && onClose()}>
      <motion.div
        className="reveal settings loop"
        role="dialog"
        aria-modal="true"
        aria-label="Ouverture en boucle"
        style={{ '--c': 'var(--accent)' }}
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reveal-title">Ouverture en boucle</div>
        <p className="muted loop-intro">Ouvre des portes à la chaîne, sans écran de résultat, jusqu'à ce qu'une condition t'arrête.</p>

        <div className="settings-group">
          <div className="settings-row">
            <div className="settings-label"><b>Porte</b><span className="muted">{formatNum(price)} or l'unité</span></div>
            <div className="settings-control">
              <select className="select" disabled={running} aria-label="Porte" value={doorId} onChange={(e) => setDoorId(e.target.value)}>
                {available.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-label"><b>Lot</b><span className="muted">Portes par ouverture</span></div>
            <div className="settings-control">
              <select className="select" disabled={running} aria-label="Lot" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                {QUANTITIES.filter((q) => q <= batchMax).map((q) => <option key={q} value={q}>×{q}</option>)}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-label"><b>Garder de l'or</b><span className="muted">S'arrête avant de passer sous ce montant</span></div>
            <div className="settings-control">
              <input className="input num" type="number" min="0" disabled={running} aria-label="Or à garder" value={keep} onChange={(e) => setKeep(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-label"><b>S'arrêter sur</b><span className="muted">Dès qu'une rareté est obtenue</span></div>
            <div className="settings-control">
              <select className="select" disabled={running} aria-label="Rareté d'arrêt" value={stopAt} onChange={(e) => setStopAt(e.target.value)}>
                <option value="none">Aucune</option>
                {RARITY_ORDER.slice(2).map((r) => <option key={r} value={r}>{RARITIES[r].label} ou mieux</option>)}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-label"><b>Maximum</b><span className="muted">Nombre de portes ouvertes</span></div>
            <div className="settings-control">
              <input className="input num" type="number" min="1" disabled={running} aria-label="Nombre maximum d'ouvertures" value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
        </div>

        {run && (
          <div className="loop-result">
            <div className="loop-stats">
              <span><b>{run.opened}</b> portes</span>
              <span><b>{formatNum(run.spent)}</b> or dépensés</span>
              <span><b>{run.news}</b> nouveaux</span>
              {run.shinies > 0 && <span><b>{run.shinies}</b> shiny</span>}
            </div>
            <div className="loop-rarities">
              {rarities.map((r) => (
                <span key={r} className="chip" style={{ '--c': RARITIES[r].color }}>
                  <span className={rarityClass(r)} style={{ color: RARITIES[r].color }}>{RARITIES[r].label}</span> ×{run.byRarity[r]}
                </span>
              ))}
            </div>
            {best && (
              <div className="muted">
                Meilleur : {best.item.emoji} <b className={rarityClass(best.item.rarity)} style={{ color: RARITIES[best.item.rarity].color }}>{best.item.name}</b>
                {best.shiny && ' ✨'}
              </div>
            )}
            {run.reason && <div className="loop-reason">{run.reason}</div>}
          </div>
        )}

        <div className="confirm-actions">
          {running ? (
            <button className="btn danger" onClick={() => (stop.current = 'Arrêté.')}>Arrêter</button>
          ) : (
            <>
              <button className="btn ghost" onClick={onClose}>Fermer</button>
              <button className="btn" autoFocus onClick={start}>{run ? 'Relancer' : 'Lancer'}</button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
