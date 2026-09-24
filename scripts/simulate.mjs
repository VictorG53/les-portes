// Simulateur d'équilibrage : un joueur automatique joue plusieurs heures de jeu accélérées.
// Usage : npm run simulate -- [--hours 24] [--seeds 2] [--step 30] [--ratio 1] [--horizon 10] [--max-qty 10]
//   --hours   durée simulée (en heures de jeu)
//   --seeds   nombre de parties simulées (graines aléatoires différentes)
//   --step    secondes de jeu entre deux décisions du joueur (10 = joueur actif, 300 = joueur distrait)
//   --ratio   le joueur fait un prestige quand il ne peut plus espérer gagner ratio clé(s) de plus
//   --horizon ... dans les `horizon` prochaines minutes (défaut 10) au revenu actuel
//   --max-qty nombre maximum de portes ouvertes d'un coup
//   --forge   niveau maximum d'amélioration visé par le joueur (0 = il n'utilise pas la forge, défaut 3)
//   --probe   à chaque prestige, mesure combien de temps il faudrait pour atteindre la dernière porte
//             sans prestiger de nouveau (mesure propre de « la difficulté d'arriver au bout »)
//   --no-offline  le joueur n'achète jamais « Sommeil profond » (pour mesurer son effet)
//   --away    absences du joueur, "début:durée" en heures, séparées par des virgules (ex. 6:8,20:1).
//             Pendant l'absence, seul le gain hors ligne est appliqué.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
)
const HOURS = +(args.hours ?? 24)
const SEEDS = +(args.seeds ?? 2)
const STEP = +(args.step ?? 30)
const RATIO = +(args.ratio ?? 1)
const HORIZON = +(args.horizon ?? 10)
const MAX_QTY = +(args['max-qty'] ?? 10)
const FORGE_TARGET = +(args.forge ?? 3)
const PROBE = 'probe' in args
const NO_OFFLINE = 'no-offline' in args
const AWAY = (args.away ?? '')
  .split(',')
  .filter(Boolean)
  .map((p) => p.split(':').map(Number))
  .map(([start, hours]) => ({ start: start * 3600, seconds: hours * 3600, done: false }))

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const game = await server.ssrLoadModule('/src/game.js')
const data = await server.ssrLoadModule('/src/data.js')
const { ACHIEVEMENTS } = await server.ssrLoadModule('/src/achievements.js')
const {
  createState, tickState, applyOffline, applyAchievements, planOpen, applyOpen, applyBuySlot, applyBuyCharmSlot, charmSlotCost, maxSlots, maxCharmSlots, isCharm, applyPrestige, applyUpgrade, rollEnhance, applyEnhance, bagOf,
  bestEquipment, computeStats, equippedCount, slotCost, MAX_SLOTS, formatNum,
} = game
const { DOORS, RARITIES, RARITY_ORDER, UPGRADES, prestigeGain, parseKey, enhanceCost } = data

// générateur pseudo-aléatoire à graine, pour des simulations reproductibles
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fmtTime = (sec) => {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : m > 0 ? `${m}min` : `${Math.round(sec)}s`
}
const median = (a) => {
  const v = a.filter((x) => x != null).sort((x, y) => x - y)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

const INCOME_MARKS = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8]

// dépense les clés : l'amélioration la moins chère parmi celles achetables, à égalité l'ordre de priorité
const PRIORITY = ['slots', 'charms', 'batch', 'income', 'discount', 'luck', 'shiny', 'gold', 'fusion', 'offline']
function spendKeys(s) {
  for (let guard = 0; guard < 500; guard++) {
    const options = UPGRADES.filter((u) => {
      if (NO_OFFLINE && u.id === 'offline') return false
      const lvl = s.upgrades?.[u.id] ?? 0
      return lvl < u.max && u.cost(lvl) <= s.keys
    }).sort(
      (a, b) =>
        a.cost(s.upgrades?.[a.id] ?? 0) - b.cost(s.upgrades?.[b.id] ?? 0) ||
        PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id),
    )
    if (!options.length) break
    s = applyUpgrade(s, options[0].id)
  }
  return s
}

const reEquip = (s) => ({ ...s, ...bestEquipment(s.inventory, s.slots, s.charmSlots, s.codex) })

// opts : { startState, noPrestige, stopAtDoor, maxSeconds } servent aux sondes (voir --probe)
function simulate(seed, opts = {}) {
  const prevRandom = Math.random
  Math.random = mulberry32(seed)
  let s = opts.startState ? structuredClone(opts.startState) : createState()
  s.autoFuse = true
  const probes = []
  const lastDoor = DOORS[DOORS.length - 1].id
  let t = 0
  let runStart = 0
  let lastEquip = -1e9
  let maxedAt = null
  const forgeTries = { n: 0, fail: 0 }
  const when = { codex: null, tier: {}, achievements: {} } // jalons de toute la simulation (temps de jeu total)
  const doorsUsed = new Set()
  const runs = []
  let run = newRun()
  function newRun() {
    return { doorFirst: {}, rarityFirst: {}, incomeFirst: {}, slotsFull: null, shinyFirst: null, opened: 0 }
  }

  const away = AWAY.map((a) => ({ ...a }))
  while (t < (opts.maxSeconds ?? HOURS * 3600)) {
    if (opts.stopAtDoor && doorsUsed.has(opts.stopAtDoor)) break
    // absence programmée : le joueur ne fait rien, seul le gain hors ligne s'applique
    const trip = away.find((a) => !a.done && t >= a.start)
    if (trip) {
      trip.done = true
      s = applyOffline(s, trip.seconds)
      t += trip.seconds
      continue
    }
    s = tickState(s, STEP)
    t += STEP
    const rt = t - runStart

    // jalons de la partie en cours
    const { income } = computeStats(s)
    if (run.startIncome == null) run.startIncome = income
    if (run.startMult == null) run.startMult = computeStats(s).bonus.prestige * (1 + computeStats(s).bonus.achievements)
    for (const m of INCOME_MARKS) if (income >= m && run.incomeFirst[m] == null) run.incomeFirst[m] = rt
    if (s.slots >= MAX_SLOTS && run.slotsFull == null) run.slotsFull = rt
    if (s.bestRarity >= 0) {
      const r = RARITY_ORDER[s.bestRarity]
      if (run.rarityFirst[r] == null) run.rarityFirst[r] = rt
    }

    // prestige ?
    const gain = prestigeGain(s.runEarned)
    // le joueur prestige dès qu'attendre encore `HORIZON` minutes ne rapporterait plus RATIO clé(s) de plus
    const extraKeys = prestigeGain(s.runEarned + income * HORIZON * 60) - gain
    if (!opts.noPrestige && gain >= 1 && extraKeys < RATIO) {
      runs.push({
        ...run, duration: rt, earned: s.runEarned, gain, income, slots: s.slots, opened: run.opened,
        best: RARITY_ORDER[s.bestRarity], totalKeysBefore: s.totalKeys,
      })
      s = spendKeys(applyPrestige(s))
      if (maxedAt == null && UPGRADES.every((u) => (s.upgrades[u.id] ?? 0) >= u.max)) maxedAt = { t, cycle: runs.length }
      s.autoFuse = true
      s = reEquip(s)
      if (PROBE) {
        // on rejoue ce début de partie sans prestiger, jusqu'à la dernière porte (8 h de jeu maximum)
        const pr = simulate(seed * 31 + runs.length, { startState: s, noPrestige: true, stopAtDoor: lastDoor, maxSeconds: 8 * 3600 })
        probes.push({ cycle: runs.length + 1, keys: s.totalKeys, rainbow: pr.current.doorFirst.rainbow, last: pr.current.doorFirst[lastDoor] })
      }
      runStart = t
      run = newRun()
      continue
    }

    // actions du joueur
    let changed = false
    for (let guard = 0; guard < 60; guard++) {
      const full = equippedCount(s.equipped) >= s.slots
      const reserve = Object.values(s.inventory).reduce((a, b) => a + b, 0) > equippedCount(s.equipped)
      // agrandir le sac quand il est plein et qu'il reste des objets dans la réserve
      if (full && reserve && s.slots < maxSlots(s) && s.gold >= slotCost(s.slots)) {
        s = applyBuySlot(s)
        lastEquip = -1e9
        changed = true
        continue
      }
      // idem pour les talismans
      const charmFull = equippedCount(s.charms) >= s.charmSlots
      const charmReserve = Object.entries(s.inventory).some(([k, n]) => isCharm(k) && n > (s.charms[k] ?? 0))
      if (charmFull && charmReserve && s.charmSlots < maxCharmSlots(s) && s.gold >= charmSlotCost(s.charmSlots)) {
        s = applyBuyCharmSlot(s)
        lastEquip = -1e9
        changed = true
        continue
      }
      // sinon : la porte la plus chère qu'on peut s'offrir, en lot aussi grand que possible
      let plan = null
      let doorId = null
      for (let i = DOORS.length - 1; i >= 0 && !plan; i--) {
        for (let q = MAX_QTY; q >= 1 && !plan; q--) {
          plan = planOpen(s, DOORS[i].id, q)
          if (plan) doorId = DOORS[i].id
        }
      }
      if (!plan) break
      s = applyOpen(s, plan)
      changed = true
      run.opened += plan.results.length
      doorsUsed.add(doorId)
      if (run.doorFirst[doorId] == null) run.doorFirst[doorId] = rt
      if (plan.results.some((r) => r.shiny) && run.shinyFirst == null) run.shinyFirst = rt
    }
    // forge : le joueur améliore ses exemplaires en double (jamais son dernier), tant que c'est bon marché
    if (FORGE_TARGET > 0) {
      for (let n = 0; n < 8; n++) {
        const cands = Object.keys(s.inventory)
          .filter((k) => {
            const p = parseKey(k)
            const spare = s.inventory[k] - (bagOf(s, k)[k] ?? 0) // exemplaires non équipés
            return p.level < FORGE_TARGET && spare >= 1 && enhanceCost(p.item, p.tier, p.shiny, p.level) <= s.gold * 0.04
          })
          .sort((a, b) => {
            const pa = parseKey(a), pb = parseKey(b)
            return RARITY_ORDER.indexOf(pb.item.rarity) - RARITY_ORDER.indexOf(pa.item.rarity) || pb.tier - pa.tier
          })
        if (!cands.length) break
        const plan = rollEnhance(s, cands[0])
        if (!plan) break
        s = applyEnhance(s, plan)
        changed = true
        forgeTries.n++
        if (!plan.success) forgeTries.fail++
      }
    }
    s = applyAchievements(s).state
    if (when.codex == null && Object.keys(s.codex).length >= data.ITEMS.length) when.codex = t
    for (let k = 2; k <= s.stats.maxTier; k++) when.tier[k] ??= t
    for (const id of Object.keys(s.achievements)) when.achievements[id] ??= t
    // le joueur réorganise son sac de temps en temps
    if (changed && t - lastEquip >= 60) {
      s = reEquip(s)
      lastEquip = t
    }
  }
  Math.random = prevRandom
  return { runs, final: s, current: run, elapsed: t - runStart, maxedAt, doorsUsed, forgeTries, when, probes }
}

const results = []
for (let i = 0; i < SEEDS; i++) results.push(simulate(1000 + i * 7919))
await server.close()

// ---------- rapport ----------
const line = (c = '─', n = 78) => c.repeat(n)
if (AWAY.length) console.log(`Absences : ${AWAY.map((a) => `à ${a.start / 3600} h pendant ${a.seconds / 3600} h`).join(', ')}`)
console.log(`\nSimulation : ${HOURS} h de jeu, ${SEEDS} partie(s), décision toutes les ${STEP} s, prestige quand < ${RATIO} clé(s) attendue(s) en ${HORIZON} min`)
console.log(line('═'))

const first = results[0]
console.log('\n■ Jalons de la 1ère partie (graine 1)')
const r0 = first.runs[0] ?? { ...first.current, duration: first.elapsed, gain: 0, earned: first.final.runEarned }
console.log('  Revenu atteint   :', INCOME_MARKS.map((m) => `${formatNum(m)}/s ${fmtTime(r0.incomeFirst[m])}`).join(' · '))
console.log('  Portes utilisées :', DOORS.map((d) => `${d.name.replace('Porte ', '')} ${fmtTime(r0.doorFirst[d.id])}`).join(' · '))
console.log('  Raretés          :', RARITY_ORDER.map((r) => `${RARITIES[r].label} ${fmtTime(r0.rarityFirst[r])}`).join(' · '))
console.log(`  Sac plein (${MAX_SLOTS})  : ${fmtTime(r0.slotsFull)}   Premier shiny : ${fmtTime(r0.shinyFirst)}`)

if (PROBE) {
  console.log('\n■ Temps pour atteindre chaque porte au début de chaque partie (sans prestiger, graine 1)')
  console.log('  après le prestige n°   clés   porte Rainbow   dernière porte')
  first.probes.forEach((p) => console.log(`  ${String(p.cycle).padStart(19)}  ${String(p.keys).padStart(6)}  ${fmtTime(p.rainbow).padStart(14)}  ${(p.last == null ? '> 8 h' : fmtTime(p.last)).padStart(14)}`))
}
console.log('\n■ Cycles de prestige (graine 1)')
console.log('  #   durée    or gagné   clés  total   revenu/s   sac  portes  meilleur    porte Rainbow  porte Éternelle  revenu au départ  mult. permanent')
first.runs.slice(0, 30).forEach((r, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}  ${fmtTime(r.duration).padStart(6)}  ${formatNum(r.earned).padStart(9)}  ${String(r.gain).padStart(4)}  ${String(r.totalKeysBefore + r.gain).padStart(5)}  ${formatNum(r.income).padStart(9)}  ${String(r.slots).padStart(3)}  ${String(r.opened).padStart(6)}  ${(RARITIES[r.best]?.label ?? '—').padEnd(9)}  ${fmtTime(r.doorFirst.rainbow).padStart(12)}  ${fmtTime(r.doorFirst.eternelle).padStart(14)}  ${formatNum(r.startIncome).padStart(15)}  ${('×' + formatNum(r.startMult)).padStart(15)}`,
  )
})
if (!first.runs.length) console.log('  Aucun prestige atteint sur la durée simulée.')
if (first.runs.length > 30) console.log(`  … ${first.runs.length - 30} autre(s) cycle(s)`)

console.log('\n■ Synthèse (médiane sur toutes les parties)')
for (const k of [1, 2, 3, 5, 10]) {
  const d = results.map((r) => r.runs[k - 1]?.duration ?? null)
  const reached = d.filter((x) => x != null).length
  console.log(`  Durée du cycle n°${String(k).padEnd(2)} : ${fmtTime(median(d)).padStart(7)}  (atteint dans ${reached}/${SEEDS} parties)`)
}
const finals = results.map((r) => r.final)
console.log(`  Forge : ${results.map((r) => `${r.forgeTries.n} tentatives (${r.forgeTries.fail} échecs)`).join(', ')}`)
console.log(`  Prestiges en ${HOURS} h : ${results.map((r) => r.runs.length).join(', ')}`)
console.log(
  `  Toutes les améliorations au max : ${results.map((r) => (r.maxedAt ? `${fmtTime(r.maxedAt.t)} (cycle ${r.maxedAt.cycle})` : 'jamais')).join(', ')}`,
)
const fast = results.map((r) => {
  const i = r.runs.findIndex((x) => x.duration < 5 * 60)
  return i < 0 ? null : i + 1
})
console.log(`  1er cycle de moins de 5 min     : ${fast.map((i) => (i ? `cycle ${i}` : 'jamais')).join(', ')}`)
console.log(
  `  Avancement final : ${finals.map((f) => `${Object.keys(f.codex).length}/${data.ITEMS.length} objets, ★${f.stats.maxTier}/${data.MAX_TIER}, +${f.stats.maxEnhance} forge, ${Object.keys(f.achievements).length}/${ACHIEVEMENTS.length} succès`).join(' | ')}`,
)
console.log(
  `  Jalons (temps de jeu total) : collection complète ${results.map((r) => fmtTime(r.when.codex)).join(', ')} · ` +
    Array.from({ length: data.MAX_TIER - 1 }, (_, i) => i + 2).map((k) => `★${k} ${results.map((r) => fmtTime(r.when.tier[k])).join('/')}`).join(' · '),
)
console.log(
  `  Succès obtenus : ${((r) => Object.keys(r.when.achievements).length)(results[0])}/${ACHIEVEMENTS.length} — manquants : ${ACHIEVEMENTS.filter((a) => results[0].when.achievements[a.id] == null).map((a) => a.name).join(', ') || 'aucun'}`,
)
console.log(`  Clés totales à la fin  : ${finals.map((f) => f.totalKeys).join(', ')}`)
console.log(
  '  Améliorations (graine 1) :',
  UPGRADES.map((u) => `${u.name} ${first.final.upgrades[u.id] ?? 0}/${u.max}`).join(' · '),
)

// ---------- alertes d'équilibrage ----------
console.log('\n■ Alertes')
const alerts = []
const firstDurations = results.map((r) => r.runs[0]?.duration).filter((x) => x != null)
if (!firstDurations.length) alerts.push(`Aucun prestige atteint en ${HOURS} h : la première clé est trop lointaine.`)
else {
  const m = median(firstDurations)
  if (m > 6 * 3600) alerts.push(`Premier prestige très lent (${fmtTime(m)}) : envisager de baisser PRESTIGE_BASE ou d'accélérer le début.`)
  if (m < 20 * 60) alerts.push(`Premier prestige très rapide (${fmtTime(m)}) : le début manque de progression.`)
}
const slow = first.runs.slice(0, 6)
for (let i = 1; i < slow.length; i++) {
  if (slow[i].duration > slow[i - 1].duration * 2)
    alerts.push(`Le cycle ${i + 1} (${fmtTime(slow[i].duration)}) est plus long que le cycle ${i} (${fmtTime(slow[i - 1].duration)}) : le prestige ne rend pas plus fort.`)
}
const neverDoors = DOORS.filter((d) => results.every((r) => !r.doorsUsed.has(d.id))).map((d) => d.name)
if (neverDoors.length) alerts.push(`Portes jamais utilisées de toute la simulation : ${neverDoors.join(', ')}.`)
for (const [i, r] of results.entries()) {
  if (r.maxedAt) {
    alerts.push(
      `Graine ${i + 1} : toutes les améliorations sont au maximum après ${fmtTime(r.maxedAt.t)} (cycle ${r.maxedAt.cycle}). Ensuite les clés ne servent plus qu'au bonus de +1 %.`,
    )
    break
  }
}
const worst = Math.max(...finals.map((f) => f.totalKeys))
if (worst > 1e6) alerts.push(`Les clés explosent (${formatNum(worst)} en ${HOURS} h) : le prestige n'a pas de plafond ni de puits de dépense.`)
if (fast.some((i) => i && i <= 20)) alerts.push(`Les cycles passent sous 5 min dès le cycle ${Math.min(...fast.filter(Boolean))} : la progression s'emballe.`)
console.log(alerts.length ? alerts.map((a) => '  ⚠ ' + a).join('\n') : '  Rien à signaler.')
console.log()
