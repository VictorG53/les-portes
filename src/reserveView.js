import { ITEMS, MAX_TIER, RARITIES, RARITY_ORDER, itemIncome, parseKey } from './data'
import { bagOf } from './game'

import { prefs } from './storage'

export const DEFAULT_VIEW = {
  q: '', // recherche par nom
  rarity: 'all',
  kind: 'all', // all | gold | charm
  variant: 'all', // all | normal | shiny | fused | enhanced
  status: 'all', // all | equipped | free | fusable | duplicate
  sort: 'default',
  showLocked: true, // afficher les objets pas encore découverts
}

export const SORTS = [
  ['default', 'Ordre du catalogue'],
  ['rarity', 'Rareté (la plus haute d’abord)'],
  ['income', 'Revenu (le plus haut d’abord)'],
  ['quantity', 'Quantité (la plus grande d’abord)'],
  ['tier', 'Niveau ★ (le plus haut d’abord)'],
  ['name', 'Nom (A → Z)'],
]
export const KINDS = [['all', 'Tous les types'], ['gold', 'Objets d’or'], ['charm', 'Talismans']]
export const VARIANTS = [
  ['all', 'Toutes les variantes'],
  ['normal', 'Normaux'],
  ['shiny', '✨ Shiny'],
  ['fused', '★ Fusionnés'],
  ['enhanced', '⚒ Améliorés'],
]
export const STATUSES = [
  ['all', 'Tous les états'],
  ['equipped', 'Équipés'],
  ['free', 'Non équipés'],
  ['fusable', 'Fusionnables'],
  ['duplicate', 'En double'],
]
export const RARITY_FILTERS = [['all', 'Toutes les raretés'], ...RARITY_ORDER.map((r) => [r, RARITIES[r].label])]

export const loadView = () => ({ ...DEFAULT_VIEW, ...prefs.get('reserve-view', {}) })

export const saveView = (view) => prefs.set('reserve-view', view)

// vrai si au moins un filtre ou un tri est actif (hors « afficher les non découverts »)
export const isFiltered = (v) =>
  v.q.trim() !== '' || ['rarity', 'kind', 'variant', 'status', 'sort'].some((k) => v[k] !== DEFAULT_VIEW[k])

const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// filtre et trie les cartes de la réserve.
// Cartes : { key } (possédé), { seen, item } (découvert mais plus possédé), { locked, item } (jamais découvert).
export function applyView(cards, state, view, fuseNeeded) {
  const q = norm(view.q)
  const info = (card) => {
    const p = parseKey(card.key)
    const n = state.inventory[card.key] ?? 0
    const e = bagOf(state, card.key)[card.key] ?? 0
    return { ...p, n, e }
  }

  const matchOwned = (card) => {
    const { item, tier, shiny, level, n, e } = info(card)
    if (q && !norm(item.name).includes(q)) return false
    if (view.rarity !== 'all' && item.rarity !== view.rarity) return false
    if (view.kind === 'gold' && item.ability) return false
    if (view.kind === 'charm' && !item.ability) return false
    if (view.variant === 'normal' && (shiny || tier > 1 || level > 0)) return false
    if (view.variant === 'shiny' && !shiny) return false
    if (view.variant === 'fused' && tier < 2) return false
    if (view.variant === 'enhanced' && level < 1) return false
    if (view.status === 'equipped' && e < 1) return false
    if (view.status === 'free' && n - e < 1) return false
    if (view.status === 'fusable' && !(n >= fuseNeeded && tier < MAX_TIER && level === 0)) return false
    if (view.status === 'duplicate' && n < 2) return false
    return true
  }

  // cartes découvertes mais non possédées / jamais découvertes : on ne filtre que sur ce qui est visible sur la carte
  const matchHidden = (card) => {
    const item = card.item
    if (!view.showLocked) return false
    if (view.variant !== 'all' || view.status !== 'all') return false
    if (view.rarity !== 'all' && item.rarity !== view.rarity) return false
    if (card.locked) return !q && view.kind === 'all' // le nom et le type sont cachés : on ne les compare pas
    if (q && !norm(item.name).includes(q)) return false
    if (view.kind === 'gold' && item.ability) return false
    if (view.kind === 'charm' && !item.ability) return false
    return true
  }

  const keep = cards.filter((c) => (c.key ? matchOwned(c) : matchHidden(c)))
  if (view.sort === 'default') return keep

  const owned = keep.filter((c) => c.key)
  const rest = keep.filter((c) => !c.key)
  const rarityIdx = (it) => RARITY_ORDER.indexOf(it.rarity)
  const cmp = {
    rarity: (a, b) => rarityIdx(b.item) - rarityIdx(a.item) || b.tier - a.tier || b.level - a.level,
    income: (a, b) =>
      (b.item.ability ? 0 : itemIncome(b.item, b.tier, b.shiny, b.level)) -
      (a.item.ability ? 0 : itemIncome(a.item, a.tier, a.shiny, a.level)),
    quantity: (a, b) => b.n - a.n,
    tier: (a, b) => b.tier - a.tier || b.level - a.level || Number(b.shiny) - Number(a.shiny),
    name: (a, b) => a.item.name.localeCompare(b.item.name, 'fr'),
  }[view.sort]
  owned.sort((a, b) => cmp(info(a), info(b)) || ITEMS.indexOf(a.item ?? parseKey(a.key).item) - ITEMS.indexOf(b.item ?? parseKey(b.key).item))
  return [...owned, ...rest]
}
