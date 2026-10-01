import { describe, expect, it } from 'vitest'
import { DOORS, ITEMS, RARITY_ORDER, keyOf, prestigeGain, prestigeNextAt } from '../src/data'
import {
  applyLoadProfile,
  applyOpen,
  applyPrestige,
  applySaveProfile,
  applySell,
  applyToggleLock,
  computeStats,
  createState,
  doorPrice,
  enhanceRate,
  fuseKey,
  planOpen,
  rollEnhance,
  sellPlan,
} from '../src/game'
import { SAVE_VERSION, migrate } from '../src/save'

const withItems = (inv, extra = {}) => ({ ...createState(), inventory: inv, ...extra })

describe('portes et tirages', () => {
  it('la porte des Talismans ne donne que des talismans', () => {
    const s = { ...createState(), gold: 1e15 }
    for (let i = 0; i < 30; i++) {
      const plan = planOpen(s, 'talismans', 10)
      expect(plan.results.every((r) => r.item.ability)).toBe(true)
    }
  })

  it("chaque porte n'a que des raretés possibles et des poids valides", () => {
    for (const d of DOORS) {
      expect(d.weights).toHaveLength(RARITY_ORDER.length)
      expect(d.weights.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
      d.weights.forEach((w, i) => {
        if (w > 0) {
          const pool = ITEMS.filter((it) => it.rarity === RARITY_ORDER[i] && (!d.charmOnly || it.ability))
          expect(pool.length, `${d.id} / ${RARITY_ORDER[i]}`).toBeGreaterThan(0)
        }
      })
    }
  })

  it("les prix des portes croissent avec l'ordre de la liste", () => {
    const costs = DOORS.map((d) => d.cost)
    expect(costs).toEqual([...costs].sort((a, b) => a - b))
  })

  it("une ouverture dépense l'or et ajoute les objets", () => {
    const s = { ...createState(), gold: 1000 }
    const plan = planOpen(s, 'bois', 5)
    const next = applyOpen(s, plan)
    expect(next.gold).toBeCloseTo(1000 - doorPrice(DOORS[0]) * 5)
    expect(Object.values(next.inventory).reduce((a, b) => a + b, 0)).toBe(5)
    expect(next.opened).toBe(5)
  })

  it('pas assez d’or : aucune ouverture', () => {
    expect(planOpen({ ...createState(), gold: 1 }, 'fer', 1)).toBeNull()
  })
})

describe('verrous, vente et fusion', () => {
  const k = keyOf('champignon')
  const kRare = keyOf('gobelin')

  it('vend les doublons mais garde 1 exemplaire et les équipés', () => {
    const s = withItems({ [k]: 5 }, { equipped: { [k]: 2 } })
    const { inventory, gain } = sellPlan(s)
    expect(inventory[k]).toBe(2)
    expect(gain).toBeGreaterThan(0)
    expect(applySell(s).inventory[k]).toBe(2)
  })

  it('ne vend pas les piles verrouillées', () => {
    let s = withItems({ [k]: 5 })
    s = applyToggleLock(s, k)
    expect(sellPlan(s).gain).toBe(0)
    expect(applySell(s)).toBe(s)
    s = applyToggleLock(s, k)
    expect(sellPlan(s).gain).toBeGreaterThan(0)
  })

  it('la vente peut se limiter à une rareté', () => {
    const s = withItems({ [k]: 4, [kRare]: 4 })
    const only = sellPlan(s, 'rare')
    expect(only.inventory[k]).toBe(4)
    expect(only.inventory[kRare]).toBe(1)
  })

  it('une pile verrouillée ne fusionne pas', () => {
    const s = withItems({ [k]: 5 })
    expect(fuseKey(s, k).inventory[keyOf('champignon', 2)]).toBe(1)
    const locked = applyToggleLock(s, k)
    expect(fuseKey(locked, k)).toBe(locked)
  })

  it('une pile verrouillée ne se tente pas à la forge', () => {
    const s = withItems({ [k]: 2 }, { gold: 1e9 })
    expect(rollEnhance(s, k)).not.toBeNull()
    expect(rollEnhance(applyToggleLock(s, k), k)).toBeNull()
  })
})

describe('profils d’équipement', () => {
  it('enregistre puis recharge un équipement, en ignorant ce qui manque', () => {
    const k = keyOf('champignon')
    let s = withItems({ [k]: 2 }, { equipped: { [k]: 2 }, slots: 3 })
    s = applySaveProfile(s, 0)
    s = { ...s, equipped: {}, inventory: { [k]: 1 } }
    expect(applyLoadProfile(s, 0).equipped).toEqual({ [k]: 1 })
    expect(applyLoadProfile(s, 1)).toBe(s)
  })
})

describe('forge, revenu et prestige', () => {
  it('Marteau de maître augmente la réussite, avec un plafond', () => {
    const s = { ...createState(), upgrades: { smith: 10 } }
    expect(enhanceRate(s, 0)).toBeGreaterThan(enhanceRate(createState(), 0))
    expect(enhanceRate({ ...s, upgrades: { smith: 99 } }, 0)).toBeLessThanOrEqual(0.97)
  })

  it('le revenu vient uniquement du sac d’or équipé', () => {
    const k = keyOf('champignon')
    const idle = computeStats(withItems({ [k]: 1 })).income
    const eq = computeStats(withItems({ [k]: 1 }, { equipped: { [k]: 1 } })).income
    expect(idle).toBe(0)
    expect(eq).toBeGreaterThan(0)
  })

  it('les paliers de clés sont croissants et cohérents', () => {
    expect(prestigeGain(0)).toBe(0)
    expect(prestigeGain(prestigeNextAt(0))).toBe(1)
    for (let n = 0; n < 8; n++) {
      expect(prestigeNextAt(n + 1)).toBeGreaterThan(prestigeNextAt(n))
      expect(prestigeGain(prestigeNextAt(n))).toBe(n + 1)
    }
  })

  it('le prestige remet la partie à zéro mais garde clés, codex et améliorations', () => {
    const s = { ...createState(), runEarned: prestigeNextAt(2) + 1, upgrades: { income: 2 }, codex: { champignon: 1 }, locked: { x: 1 } }
    const next = applyPrestige(s)
    expect(next.keys).toBe(3)
    expect(next.codex.champignon).toBe(1)
    expect(next.upgrades.income).toBe(2)
    expect(next.inventory).toEqual({})
    expect(next.locked).toEqual({})
  })
})

describe('sauvegarde', () => {
  it('une partie neuve passe la migration sans changement de structure', () => {
    const state = createState()
    const out = migrate({ version: SAVE_VERSION, savedAt: 1, state })
    expect(out.gold).toBe(state.gold)
    expect(out.locked).toEqual({})
    expect(out.profiles).toHaveLength(3)
  })

  it('Baraka est remboursée (v3 → v4)', () => {
    const state = { ...createState(), upgrades: { luck: 3 }, keys: 1 }
    const out = migrate({ version: 3, savedAt: 1, state })
    expect(out.upgrades.luck).toBeUndefined()
    expect(out.keys).toBe(1 + 3 * 3 + 3 * 2) // coûts 3, 5, 7
  })

  it('les indices des portes sont décalés par la porte des Talismans (v4 → v5)', () => {
    const state = createState()
    state.stats = { ...state.stats, maxDoor: 8, maxSeenDoor: 9 }
    const out = migrate({ version: 4, savedAt: 1, state })
    expect(out.stats.maxDoor).toBe(9)
    expect(out.stats.maxSeenDoor).toBe(10)
    state.stats.maxDoor = 3
    expect(migrate({ version: 4, savedAt: 1, state }).stats.maxDoor).toBe(3)
  })

  it('le talisman Chaudron est retiré (v2 → v3)', () => {
    const state = { ...createState(), inventory: { chaudron: 1, [keyOf('champignon')]: 1 } }
    const out = migrate({ version: 2, savedAt: 1, state })
    expect(out.inventory.chaudron).toBeUndefined()
    expect(out.inventory[keyOf('champignon')]).toBe(1)
  })
})
