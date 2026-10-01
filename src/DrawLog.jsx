import { useState } from 'react'
import { History } from 'lucide-react'
import { RARITIES, RARITY_ORDER, rarityClass } from './data'

const NOTABLE = RARITY_ORDER.indexOf('secret') // à partir de cette rareté, une ligne est mise en avant

// journal des derniers tirages de la session (le plus récent en haut)
export default function DrawLog({ entries }) {
  const [open, setOpen] = useState(true)
  if (entries.length === 0) return null
  return (
    <section className="draw-log">
      <button className="link draw-log-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <History size={14} strokeWidth={2.25} /> Journal des tirages <span className="muted">· {entries.length} derniers</span>
      </button>
      {open && (
        <ul>
          {entries.map((e) => {
            const r = RARITIES[e.item.rarity]
            return (
              <li key={e.id} className={RARITY_ORDER.indexOf(e.item.rarity) >= NOTABLE ? 'notable' : ''}>
                <span className="emoji">{e.item.emoji}</span>
                <span className={rarityClass(e.item.rarity)} style={{ color: r.color }}>{e.item.name}</span>
                {e.shiny && <span title="Shiny">✨</span>}
                {e.isNew && <span className="chip reward">Nouveau</span>}
                <span className="muted">{e.door}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
