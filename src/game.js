import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DOORS,
  FUSE_COUNT,
  keyMultiplier,
  SHINY_CHANCE,
  BASE_MAX_CHARM_SLOTS,
  BASE_MAX_SLOTS,
  BATCH_LIMITS,
  DOOR_PRICE_EXP,
  OFFLINE_BASE_HOURS,
  OFFLINE_BASE_RATE,
  OFFLINE_STEP_HOURS,
  OFFLINE_STEP_RATE,
  UPGRADES,
  UPGRADE_STEP,
  prestigeGain,
  ITEMS,
  MAX_TIER,
  RARITY_ORDER,
  ENHANCE_RATES,
  MAX_ENHANCE,
  abilityValue,
  enhanceCost,
  itemIncome,
  itemSell,
  keyOf,
  parseKey,
} from './data'
import { achievementBonus, newlyUnlocked } from './achievements'

const BASE_SLOTS = 3
const START_GOLD = 30 // or au début d une partie (avant l amélioration « Capital de départ »)
export const MAX_SLOTS = 24
const BASE_CHARM_SLOTS = 2 // emplacements de talismans (objets à capacité)

const initialState = {
  gold: START_GOLD,
  inventory: {}, // tous les objets possédés (sac de stockage)
  equipped: {}, // objets équipés, seuls eux rapportent de l'or
  slots: BASE_SLOTS,
  charms: {}, // talismans équipés : objets à capacité, ils ne rapportent pas d'or mais leur effet s'applique
  charmSlots: BASE_CHARM_SLOTS,
  autoFuse: false, // fusion automatique des objets identiques
  opened: 0, // total, toutes parties confondues
  bestRarity: -1,
  codex: {}, // objets déjà découverts (persistent au prestige)
  codexShiny: {}, // objets déjà obtenus en shiny
  runEarned: 0, // or gagné depuis le début de cette partie (sert à calculer les clés)
  keys: 0, // clés de prestige à dépenser
  totalKeys: 0, // clés gagnées au total : chacune donne +1 % de revenu
  prestiges: 0,
  upgrades: {}, // niveaux des améliorations de prestige
  achievements: {}, // succès débloqués (id -> date), permanents
  // records (servent aux succès) et compteurs de la page de statistiques, toutes parties confondues
  stats: {
    maxTier: 1,
    maxBatch: 0,
    maxAway: 0,
    maxEnhance: 0,
    maxDoor: 0, // indice de la porte la plus chère déjà ouverte
    maxIncome: 0, // revenu par seconde le plus élevé atteint
    playSeconds: 0, // temps de jeu actif
    awaySeconds: 0, // temps total passé absent
    offlineGold: 0, // or gagné hors ligne
    earnedBefore: 0, // or gagné dans les parties précédentes (avant prestige)
    doorOpens: {}, // portes ouvertes, par porte
    batchOpens: {}, // nombre d'ouvertures faites, par taille de lot (1, 5, 10…)
    byRarity: {}, // objets obtenus, par rareté
    shinies: 0, // objets shiny obtenus
    fusions: 0,
    forgeOk: 0,
    forgeFail: 0,
    runs: [], // historique des parties terminées par un prestige : { seconds, earned, keys }
  },
  runSeconds: 0, // temps de jeu actif de la partie en cours
  tutorial: { step: 0, done: false, seen: {} }, // guide de démarrage (étape) et conseils déjà affichés
}

// l'or est arrondi à 4 décimales pour éviter les résidus de calcul flottant (23224.025000000016)
export const roundGold = (n) => Math.round(n * 1e4) / 1e4

export const upLevel = (s, id) => s.upgrades?.[id] ?? 0
// plus grand lot d'ouverture autorisé (améliorable dans le Portail éternel)
export const maxBatch = (s) => BATCH_LIMITS[Math.min(upLevel(s, 'batch'), BATCH_LIMITS.length - 1)]
export const fuseCount = (s) => FUSE_COUNT - upLevel(s, 'fusion')
// plafonds d'emplacements actuels (relevés par « Grand sac » et « Écrin ») ; on repart toujours de BASE_SLOTS / BASE_CHARM_SLOTS
export const maxSlots = (s) => BASE_MAX_SLOTS + upLevel(s, 'slots')
export const maxCharmSlots = (s) => BASE_MAX_CHARM_SLOTS + upLevel(s, 'charms')
export const startSlots = () => BASE_SLOTS
export const startGold = (s) => START_GOLD + upLevel(s, 'gold') * UPGRADE_STEP.gold

export const startCharmSlots = () => BASE_CHARM_SLOTS
export const charmSlotCost = (slots) => Math.round(500 * 2.5 ** (slots - BASE_CHARM_SLOTS))
export const isCharm = (key) => !!parseKey(key).item.ability
// sac (or) ou talismans, selon la nature de l'objet
export const bagOf = (s, key) => (isCharm(key) ? s.charms : s.equipped)
const bagName = (key) => (isCharm(key) ? 'charms' : 'equipped')
const capOf = (s, key) => (isCharm(key) ? s.charmSlots : s.slots)

export const slotCost = (slots) => Math.round(100 * 2.2 ** (slots - BASE_SLOTS))
export const equippedCount = (equipped) => Object.values(equipped).reduce((a, b) => a + b, 0)

const keyIncome = (key) => {
  const { item, tier, shiny, level } = parseKey(key)
  return itemIncome(item, tier, shiny, level)
}

// Cherche l'équipement qui maximise le revenu réel :
// - le sac d'or reçoit les objets qui rapportent, les talismans reçoivent les objets à capacité ;
// - on remplit gloutonnement (le meilleur ajout à chaque étape), puis on échange tant que ça améliore le revenu ;
// - les emplacements de talismans restés libres (sans gain de revenu) reçoivent les réductions de prix puis la chance.
// mode : 'both' (les deux sacs), 'bag' (sac d'or seul) ou 'charms' (talismans seuls).
// Dans les modes partiels, l'autre sac reste tel qu'il est (from.equipped / from.charms).
export function bestEquipment(inventory, slots, charmSlots, codex, mode = 'both', from = {}) {
  const keys = Object.keys(inventory).filter((k) => inventory[k] > 0)
  const goldKeys = keys.filter((k) => !isCharm(k)).sort((a, b) => keyIncome(b) - keyIncome(a))
  const PRIORITY = ['discount', 'luck']
  const charmRank = (k) => {
    const { item, tier, shiny, level } = parseKey(k)
    const p = PRIORITY.indexOf(item.ability.type)
    return [p < 0 ? PRIORITY.length : p, -abilityValue(item, tier, shiny, level)]
  }
  const charmKeys = keys.filter(isCharm).sort((a, b) => {
    const [pa, va] = charmRank(a)
    const [pb, vb] = charmRank(b)
    return pa - pb || va - vb
  })
  const score = (equipped, charms) => computeStats({ equipped, charms, inventory, codex }).income
  const canAdd = (bag, k) => (bag[k] ?? 0) < inventory[k]
  const add = (bag, k) => ({ ...bag, [k]: (bag[k] ?? 0) + 1 })
  const remove = (bag, k) => {
    const next = { ...bag, [k]: bag[k] - 1 }
    if (!next[k]) delete next[k]
    return next
  }

  const doBag = mode !== 'charms'
  const doCharms = mode !== 'bag'
  let equipped = doBag ? {} : { ...from.equipped }
  let charms = doCharms ? {} : { ...from.charms }
  for (;;) {
    let best = null
    let bestScore = -1
    if (doBag && equippedCount(equipped) < slots) {
      for (const k of goldKeys) {
        if (!canAdd(equipped, k)) continue
        const s = score(add(equipped, k), charms)
        if (s > bestScore) [best, bestScore] = [{ bag: 'equipped', k }, s]
      }
    }
    if (doCharms && equippedCount(charms) < charmSlots) {
      for (const k of charmKeys) {
        if (!canAdd(charms, k)) continue
        const s = score(equipped, add(charms, k))
        if (s > bestScore) [best, bestScore] = [{ bag: 'charms', k }, s]
      }
    }
    if (!best) break
    if (best.bag === 'equipped') equipped = add(equipped, best.k)
    else charms = add(charms, best.k)
  }

  // échanges : on remplace un objet par un autre du même type tant que le revenu augmente
  let current = score(equipped, charms)
  for (let round = 0; round < 60; round++) {
    let better = null
    let betterScore = current
    for (const [bag, pool] of [
      ['equipped', doBag ? goldKeys : []],
      ['charms', doCharms ? charmKeys : []],
    ]) {
      const cur = bag === 'equipped' ? equipped : charms
      for (const out of Object.keys(cur)) {
        const base = remove(cur, out)
        for (const k of pool) {
          if (k === out || !canAdd(base, k)) continue
          const cand = add(base, k)
          const s = bag === 'equipped' ? score(cand, charms) : score(equipped, cand)
          if (s > betterScore * (1 + 1e-12)) {
            better = bag === 'equipped' ? { equipped: cand, charms } : { equipped, charms: cand }
            betterScore = s
          }
        }
      }
    }
    if (!better) break
    ;({ equipped, charms } = better)
    current = betterScore
  }
  return { equipped, charms }
}

const LUCK_FROM_RARITY = 3 // la chance améliore Légendaire et au-dessus
const MAX_DISCOUNT = 0.5

export const adjustedWeights = (door, luck = 0) =>
  door.weights.map((w, i) => (i >= LUCK_FROM_RARITY ? w * (1 + luck) : w))

// prix d'une porte : réduction de prix, puis adaptation à la puissance permanente du joueur (voir DOOR_PRICE_EXP)
export const doorScale = (door, permanent = 1) => permanent ** (DOOR_PRICE_EXP[door.id] ?? 0)
export const doorPrice = (door, discount = 0, permanent = 1) =>
  Math.max(1, Math.round(door.cost * (1 - discount) * doorScale(door, permanent)))


function rollItem(door, luck = 0) {
  const weights = adjustedWeights(door, luck)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  let rarityIdx = 0
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) {
      rarityIdx = i
      break
    }
  }
  const pool = ITEMS.filter((i) => i.rarity === RARITY_ORDER[rarityIdx])
  let pick = Math.random() * pool.reduce((sum, i) => sum + i.dropWeight, 0)
  for (const item of pool) {
    pick -= item.dropWeight
    if (pick < 0) return item
  }
  return pool[pool.length - 1]
}

// revenu et bonus issus des objets équipés (capacités et prestige compris)
export function computeStats(s) {
  const { equipped, inventory } = s
  const discovered = s.codex
    ? Object.keys(s.codex).length
    : new Set(Object.keys(inventory).map((k) => parseKey(k).item.id)).size
  const bonus = { best: 0, global: 0, luck: 0, discount: 0, shiny: 0, rarity: {} }
  const list = []
  // le sac d'or : seuls ces objets rapportent
  for (const [key, n] of Object.entries(equipped)) {
    const { item, tier, shiny, level } = parseKey(key)
    if (item.ability) continue
    for (let i = 0; i < n; i++) list.push({ item, tier, shiny, level })
  }
  // les talismans : pas de revenu, mais leur capacité s'applique
  for (const [key, n] of Object.entries(s.charms ?? {})) {
    const { item, tier, shiny, level } = parseKey(key)
    const ab = item.ability
    if (!ab) continue
    const v = abilityValue(item, tier, shiny, level) * n
    if (ab.type === 'collector') bonus.global += v * discovered
    else if (ab.type === 'rarity') bonus.rarity[ab.rarity] = (bonus.rarity[ab.rarity] ?? 0) + v
    else bonus[ab.type] += v
  }
  // améliorations de prestige
  bonus.luck += upLevel(s, 'luck') * UPGRADE_STEP.luck
  bonus.discount = Math.min(MAX_DISCOUNT, bonus.discount + upLevel(s, 'discount') * UPGRADE_STEP.discount)
  bonus.shiny = upLevel(s, 'shiny') * UPGRADE_STEP.shiny
  bonus.achievements = achievementBonus(s.achievements)
  bonus.prestige = (1 + upLevel(s, 'income') * UPGRADE_STEP.income) * keyMultiplier(s.totalKeys ?? 0)
  bonus.permanent = bonus.prestige * (1 + bonus.achievements) // puissance permanente : elle renchérit les portes chères

  const incomes = list.map(({ item, tier, shiny, level }) => itemIncome(item, tier, shiny, level) * (1 + (bonus.rarity[item.rarity] ?? 0)))
  const sum = incomes.reduce((a, b) => a + b, 0)
  const bestIncome = incomes.reduce((a, b) => Math.max(a, b), 0)
  const income = (sum + bestIncome * bonus.best) * (1 + bonus.global) * bonus.prestige * (1 + bonus.achievements)
  return { income, bonus }
}

export function collectionValue(inventory) {
  return Object.entries(inventory).reduce(
    (sum, [key, n]) => {
      const { item, tier, shiny } = parseKey(key)
      return sum + itemSell(item, tier, shiny) * n
    },
    0,
  )
}

// formats des nombres : voir src/format.js (réexporté ici, car tout le jeu les importe depuis game.js)
export { formatMult, formatNum, formatNumMode, setNumberFormat } from './format'

// fusionne fuseCount(s) exemplaires d'une même clé en 1 exemplaire du niveau supérieur
function fuseKey(s, key) {
  const { item, tier, shiny, level } = parseKey(key)
  const n = s.inventory[key] ?? 0
  const need = fuseCount(s)
  if (tier >= MAX_TIER || n < need || level > 0) return s // les objets améliorés ne se fusionnent pas
  const newKey = keyOf(item.id, tier + 1, shiny)

  const inventory = { ...s.inventory, [key]: n - need }
  if (inventory[key] === 0) delete inventory[key]
  inventory[newKey] = (inventory[newKey] ?? 0) + 1

  // on consomme d'abord les exemplaires de la réserve, puis les équipés si besoin
  const name = bagName(key)
  const e = s[name][key] ?? 0
  const fromEquipped = Math.max(0, need - (n - e))
  const bag = { ...s[name] }
  if (e - fromEquipped > 0) bag[key] = e - fromEquipped
  else delete bag[key]
  // le nouvel objet prend la place libérée (ou un emplacement libre)
  if (equippedCount(bag) < capOf(s, key)) bag[newKey] = (bag[newKey] ?? 0) + 1

  return {
    ...s,
    inventory,
    [name]: bag,
    stats: { ...s.stats, maxTier: Math.max(s.stats.maxTier, tier + 1), fusions: s.stats.fusions + 1 },
  }
}

// fusionne tout ce qui peut l'être, en cascade (5 ★ -> ★★, puis 5 ★★ -> ★★★, ...)
function fuseAll(state) {
  let s = state
  for (let guard = 0; guard < 10000; guard++) {
    const key = Object.keys(s.inventory).find(
      (k) => s.inventory[k] >= fuseCount(s) && parseKey(k).tier < MAX_TIER && parseKey(k).level === 0,
    )
    if (!key) break
    s = fuseKey(s, key)
  }
  return s
}

// Prestige : on recommence contre des clés. On garde clés, améliorations, découvertes et statistiques.
export function applyPrestige(s) {
  const gained = prestigeGain(s.runEarned)
  if (gained < 1) return s
  return {
    ...initialState,
    upgrades: s.upgrades,
    achievements: s.achievements,
    tutorial: s.tutorial,
    stats: {
      ...s.stats,
      earnedBefore: roundGold(s.stats.earnedBefore + s.runEarned),
      runs: [...s.stats.runs, { seconds: s.runSeconds, earned: s.runEarned, keys: gained }].slice(-20),
    },
    codex: s.codex,
    codexShiny: s.codexShiny,
    opened: s.opened,
    bestRarity: s.bestRarity,
    autoFuse: s.autoFuse,
    keys: s.keys + gained,
    totalKeys: s.totalKeys + gained,
    prestiges: s.prestiges + 1,
    slots: startSlots(s),
    charmSlots: startCharmSlots(s),
    gold: startGold(s),
    inventory: {},
    equipped: {},
    charms: {},
  }
}

export function applyUpgrade(s, id) {
  const up = UPGRADES.find((u) => u.id === id)
  const level = upLevel(s, id)
  if (!up || level >= up.max) return s
  const cost = up.cost(level)
  if (s.keys < cost) return s
  let next = { ...s, keys: s.keys - cost, upgrades: { ...s.upgrades, [id]: level + 1 } }
  if (id === 'fusion' && next.autoFuse) next = fuseAll(next)
  return next
}

// débloque les succès dont la condition est remplie ; renvoie le nouvel état et les succès obtenus
export function applyAchievements(s) {
  const ids = newlyUnlocked(s, { income: computeStats(s).income })
  if (!ids.length) return { state: s, unlocked: [] }
  const achievements = { ...s.achievements }
  for (const id of ids) achievements[id] = Date.now()
  return { state: { ...s, achievements }, unlocked: ids }
}

export const createState = () => structuredClone(initialState)

// --- gain hors ligne : pendant une absence, les objets équipés continuent de rapporter, en moins bien ---
// (part du revenu gagnée et durée maximale prise en compte : relevées par l'amélioration « Sommeil profond »)
export const offlineRate = (s) => OFFLINE_BASE_RATE + upLevel(s, 'offline') * OFFLINE_STEP_RATE
export const offlineCapHours = (s) => OFFLINE_BASE_HOURS + upLevel(s, 'offline') * OFFLINE_STEP_HOURS
const AWAY_SECONDS = 3 // au-delà de cet écart entre deux ticks, on considère que le joueur était absent
const MIN_REPORT_SECONDS = 60 // absence minimale pour afficher l'écran « Bon retour »

// or gagné pendant `seconds` secondes d'absence
const offlineGain = (s, seconds) =>
  roundGold(computeStats(s).income * Math.min(seconds, offlineCapHours(s) * 3600) * offlineRate(s))

// l'or hors ligne n'est pas compté dans runEarned : il ne fait pas gagner de clés de prestige
export function applyOffline(s, seconds) {
  const gain = offlineGain(s, seconds)
  return {
    ...s,
    gold: roundGold(s.gold + gain),
    stats: {
      ...s.stats,
      maxAway: Math.max(s.stats.maxAway, seconds),
      awaySeconds: s.stats.awaySeconds + seconds,
      offlineGold: roundGold(s.stats.offlineGold + gain),
    },
  }
}

// avance le temps de dt secondes : revenu passif
export function tickState(s, dt) {
  const { income } = computeStats(s)
  const inc = income * dt
  return {
    ...s,
    gold: roundGold(s.gold + inc),
    runEarned: roundGold(s.runEarned + inc),
    runSeconds: s.runSeconds + dt,
    stats: {
      ...s.stats,
      playSeconds: s.stats.playSeconds + dt,
      maxIncome: Math.max(s.stats.maxIncome, income),
    },
  }
}

// prépare l'ouverture de `count` portes : tirages et coût, sans modifier l'état (null si pas assez d'or)
export function planOpen(s, doorId, count = 1) {
  const door = DOORS.find((d) => d.id === doorId)
  if (!door || count > maxBatch(s)) return null
  const { bonus } = computeStats(s)
  const cost = doorPrice(door, bonus.discount, bonus.permanent) * count
  if (s.gold < cost) return null

  const discovered = new Set(Object.keys(s.codex))
  const discoveredShiny = new Set(Object.keys(s.codexShiny))
  const results = []
  for (let i = 0; i < count; i++) {
    const item = rollItem(door, bonus.luck)
    const shiny = Math.random() < SHINY_CHANCE + bonus.shiny
    results.push({
      item,
      shiny,
      isNew: !discovered.has(item.id),
      isNewShiny: shiny && !discoveredShiny.has(item.id),
    })
    discovered.add(item.id)
    if (shiny) discoveredShiny.add(item.id)
  }
  return { results, cost, doorId }
}

const countRarities = (base, results) => {
  const next = { ...base }
  for (const { item } of results) next[item.rarity] = (next[item.rarity] ?? 0) + 1
  return next
}

// applique une ouverture préparée par planOpen
export function applyOpen(cur, { results, cost, doorId }) {
  const inventory = { ...cur.inventory }
  const equipped = { ...cur.equipped }
  const charms = { ...cur.charms }
  const codex = { ...cur.codex }
  const codexShiny = { ...cur.codexShiny }
  let free = cur.slots - equippedCount(equipped)
  let freeCharms = cur.charmSlots - equippedCount(charms)
  let best = cur.bestRarity
  for (const { item, shiny } of results) {
    const key = keyOf(item.id, 1, shiny)
    inventory[key] = (inventory[key] ?? 0) + 1
    codex[item.id] = 1
    if (shiny) codexShiny[item.id] = 1
    // équipé automatiquement s'il reste de la place (sac d'or, ou talismans pour les objets à capacité)
    if (item.ability) {
      if (freeCharms > 0) {
        charms[key] = (charms[key] ?? 0) + 1
        freeCharms--
      }
    } else if (free > 0) {
      equipped[key] = (equipped[key] ?? 0) + 1
      free--
    }
    best = Math.max(best, RARITY_ORDER.indexOf(item.rarity))
  }
  const next = {
    ...cur,
    gold: roundGold(cur.gold - cost),
    opened: cur.opened + results.length,
    stats: {
      ...cur.stats,
      maxBatch: Math.max(cur.stats.maxBatch, results.length),
      maxDoor: Math.max(cur.stats.maxDoor ?? 0, DOORS.findIndex((d) => d.id === doorId)),
      doorOpens: { ...cur.stats.doorOpens, [doorId]: (cur.stats.doorOpens[doorId] ?? 0) + results.length },
      batchOpens: { ...cur.stats.batchOpens, [results.length]: (cur.stats.batchOpens[results.length] ?? 0) + 1 },
      byRarity: countRarities(cur.stats.byRarity, results),
      shinies: cur.stats.shinies + results.filter((r) => r.shiny).length,
    },
    bestRarity: best,
    inventory,
    equipped,
    charms,
    codex,
    codexShiny,
  }
  return cur.autoFuse ? fuseAll(next) : next
}

export function applyBuySlot(s) {
  const cost = slotCost(s.slots)
  if (s.slots >= maxSlots(s) || s.gold < cost) return s
  return { ...s, gold: roundGold(s.gold - cost), slots: s.slots + 1 }
}

// --- forge : tentative d'amélioration d'un exemplaire ---
// prépare la tentative (tirage et coût) sans modifier l'état ; null si impossible
export function rollEnhance(s, key) {
  const { item, tier, shiny, level } = parseKey(key)
  if (level >= MAX_ENHANCE || (s.inventory[key] ?? 0) < 1) return null
  const cost = enhanceCost(item, tier, shiny, level)
  if (s.gold < cost) return null
  return { key, cost, success: Math.random() < ENHANCE_RATES[level], level }
}

// applique la tentative : l'or est dépensé ; en cas d'échec l'exemplaire est perdu, sinon il passe au niveau +1
export function applyEnhance(s, plan) {
  const { key, cost, success } = plan
  if ((s.inventory[key] ?? 0) < 1 || s.gold < cost) return s
  const { item, tier, shiny, level } = parseKey(key)
  const newKey = keyOf(item.id, tier, shiny, level + 1)
  const bagN = bagName(key)

  // on prélève de préférence un exemplaire de la réserve ; sinon un exemplaire équipé
  const equippedHere = s[bagN][key] ?? 0
  const fromEquipped = (s.inventory[key] ?? 0) - equippedHere < 1
  const inventory = { ...s.inventory, [key]: s.inventory[key] - 1 }
  if (inventory[key] === 0) delete inventory[key]
  if (success) inventory[newKey] = (inventory[newKey] ?? 0) + 1

  const bag = { ...s[bagN] }
  if (fromEquipped) {
    if (equippedHere - 1 > 0) bag[key] = equippedHere - 1
    else delete bag[key]
    if (success) bag[newKey] = (bag[newKey] ?? 0) + 1 // l'exemplaire amélioré reprend la place libérée
  }
  return {
    ...s,
    gold: roundGold(s.gold - cost),
    inventory,
    [bagN]: bag,
    stats: {
      ...s.stats,
      maxEnhance: success ? Math.max(s.stats.maxEnhance, level + 1) : s.stats.maxEnhance,
      forgeOk: s.stats.forgeOk + (success ? 1 : 0),
      forgeFail: s.stats.forgeFail + (success ? 0 : 1),
    },
  }
}

export function applyBuyCharmSlot(s) {
  const cost = charmSlotCost(s.charmSlots)
  if (s.charmSlots >= maxCharmSlots(s) || s.gold < cost) return s
  return { ...s, gold: roundGold(s.gold - cost), charmSlots: s.charmSlots + 1 }
}

function applyEquip(s, key) {
  const name = bagName(key)
  const bag = s[name]
  if (equippedCount(bag) >= capOf(s, key) || (bag[key] ?? 0) >= (s.inventory[key] ?? 0)) return s
  return { ...s, [name]: { ...bag, [key]: (bag[key] ?? 0) + 1 } }
}

function applyUnequip(s, key) {
  const name = bagName(key)
  const n = s[name][key] ?? 0
  if (n <= 0) return s
  const bag = { ...s[name], [key]: n - 1 }
  if (n - 1 === 0) delete bag[key]
  return { ...s, [name]: bag }
}

// vend les exemplaires en trop : on garde toujours les équipés, et 1 exemplaire minimum
function applySell(s) {
  let gain = 0
  const inventory = {}
  for (const [id, n] of Object.entries(s.inventory)) {
    const keep = Math.max(1, bagOf(s, id)[id] ?? 0)
    inventory[id] = keep
    const { item, tier, shiny } = parseKey(id)
    gain += (n - keep) * itemSell(item, tier, shiny)
  }
  return gain > 0
    ? { ...s, gold: roundGold(s.gold + gain), runEarned: roundGold(s.runEarned + gain), inventory }
    : s
}

// Hook principal du jeu. Le stockage est fourni par l'appelant :
//   load()  -> état de départ ;  save(state) : enregistre la partie ;  clear() : efface la partie.
// (voir src/save.js et src/storage.js : c'est là qu'on branchera un serveur)
export function useGame({ load, save, clear }) {
  const [state, setState] = useState(load)
  const io = useRef({ save, clear }) // les fonctions de stockage peuvent changer entre deux rendus
  useEffect(() => {
    io.current = { save, clear }
  })
  const stateRef = useRef(state)
  const lastTick = useRef(0)
  const [toasts, setToasts] = useState([]) // succès à annoncer : [{ key, id }]
  const [welcome, setWelcome] = useState(null) // { seconds, gain } affiché au retour du joueur
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // revenu passif, calculé sur l'horloge réelle : un onglet en arrière-plan ou un ordinateur en veille ne fait rien perdre
  useEffect(() => {
    lastTick.current = stateRef.current.lastSeen ?? Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const gap = (now - lastTick.current) / 1000
      lastTick.current = now
      if (gap <= 0) return // horloge revenue en arrière : on ignore
      if (gap <= AWAY_SECONDS) {
        setState((s) => tickState(s, gap))
        return
      }
      const gain = offlineGain(stateRef.current, gap)
      setState((s) => applyOffline(s, gap))
      if (gain > 0 && gap >= MIN_REPORT_SECONDS) {
        const cur = stateRef.current
        setWelcome({ seconds: gap, gain, rate: offlineRate(cur), capHours: offlineCapHours(cur) })
      }
    }, 250)
    return () => clearInterval(id)
  }, [])

  // succès : vérification une fois par seconde
  useEffect(() => {
    const id = setInterval(() => {
      const { unlocked } = applyAchievements(stateRef.current)
      if (!unlocked.length) return
      setState((cur) => applyAchievements(cur).state)
      setToasts((t) => [...t, ...unlocked.map((a) => ({ key: `${a}-${Date.now()}`, id: a }))])
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // sauvegarde (avec l'heure, pour calculer l'absence à la reprise)
  useEffect(() => {
    const persist = () => io.current.save({ ...stateRef.current, lastSeen: Date.now() })
    const id = setInterval(persist, 2000)
    const onHide = () => document.visibilityState === 'hidden' && persist()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', persist)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  // ouvre `count` portes d'un coup : retourne les objets obtenus, ou null si pas assez d'or
  const openDoor = useCallback((doorId, count = 1) => {
    const plan = planOpen(stateRef.current, doorId, count)
    if (!plan) return null
    setState((cur) => applyOpen(cur, plan))
    return plan.results
  }, [])

  const equip = useCallback((key) => setState((s) => applyEquip(s, key)), [])
  const unequip = useCallback((key) => setState((s) => applyUnequip(s, key)), [])

  // fusionne FUSE_COUNT exemplaires d'une même clé en 1 exemplaire du niveau supérieur
  const fuse = useCallback((key) => {
    setState((s) => fuseKey(s, key))
  }, [])

  const setAutoFuse = useCallback((on) => {
    setState((s) => (on ? fuseAll({ ...s, autoFuse: true }) : { ...s, autoFuse: false }))
  }, [])

  // mode : 'bag' (sac d'or) ou 'charms' (talismans)
  const autoEquip = useCallback((mode = 'both') => {
    setState((s) => ({ ...s, ...bestEquipment(s.inventory, s.slots, s.charmSlots, s.codex, mode, s) }))
  }, [])

  const buySlot = useCallback(() => setState(applyBuySlot), [])
  // tente d'améliorer un exemplaire : renvoie { success, cost, level } ou null si impossible
  const enhance = useCallback((key) => {
    const plan = rollEnhance(stateRef.current, key)
    if (!plan) return null
    setState((cur) => applyEnhance(cur, plan))
    return plan
  }, [])

  const buyCharmSlot = useCallback(() => setState(applyBuyCharmSlot), [])
  const sellDuplicates = useCallback(() => setState(applySell), [])

  // met à jour l'état du didacticiel (étape, terminé, conseils vus)
  const setTutorial = useCallback((patch) => {
    setState((s) => {
      const change = typeof patch === 'function' ? patch(s.tutorial) : patch
      // rien à changer : on garde le même état, pour ne jamais provoquer de rendu inutile
      if (Object.entries(change).every(([k, v]) => s.tutorial[k] === v)) return s
      return { ...s, tutorial: { ...s.tutorial, ...change } }
    })
  }, [])

  const prestige = useCallback(() => setState(applyPrestige), [])
  const buyUpgrade = useCallback((id) => setState((s) => applyUpgrade(s, id)), [])

  const reset = useCallback(() => {
    io.current.clear()
    setState(createState())
  }, [])

  return {
    state,
    welcome,
    closeWelcome: () => setWelcome(null),
    toasts,
    dismissToast: (key) => setToasts((t) => t.filter((x) => x.key !== key)),
    openDoor,
    equip,
    unequip,
    fuse,
    setAutoFuse,
    autoEquip,
    buySlot,
    buyCharmSlot,
    enhance,
    sellDuplicates,
    prestige,
    setTutorial,
    buyUpgrade,
    reset,
  }
}
