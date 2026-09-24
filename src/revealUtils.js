import { RARITY_ORDER } from './data'

// au-delà de ce nombre de portes ouvertes d'un coup, les résultats identiques sont regroupés
const GROUP_ABOVE = 10

// regroupe les résultats (même objet, même variante) et les trie : objets d'or puis talismans, et dans chaque type
// la meilleure rareté d'abord, shiny en premier
export function groupResults(results) {
  const rarity = (r) => RARITY_ORDER.indexOf(r.item.rarity)
  const kind = (r) => (r.item.ability ? 1 : 0)
  const sorted = [...results].sort((a, b) => kind(a) - kind(b) || rarity(b) - rarity(a) || Number(b.shiny) - Number(a.shiny))
  if (results.length <= GROUP_ABOVE) return sorted.map((r) => ({ ...r, count: 1 }))
  const map = new Map()
  for (const r of sorted) {
    const k = `${r.item.id}|${r.shiny}`
    const g = map.get(k)
    if (g) {
      g.count++
      g.isNew ||= r.isNew
      g.isNewShiny ||= r.isNewShiny
    } else map.set(k, { ...r, count: 1 })
  }
  return [...map.values()]
}

// délai entre deux tuiles : raccourci quand il y en a beaucoup, pour que l'animation reste courte
export const revealStep = (tiles) => Math.min(0.07, 1.4 / Math.max(1, tiles))
