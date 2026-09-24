import { DOORS, parseKey } from './data'
import { bestEquipment, createState, isCharm, roundGold } from './game'
import { gameStorage, prefs } from './storage'

// Sauvegarde de la partie : format versionné, prêt à être synchronisé avec un serveur.
//
//   { version, savedAt, state }
//
// La version ne change que pour une modification de STRUCTURE (champ renommé, déplacé, unité changée...) :
// on ajoute alors une fonction à MIGRATIONS. Un simple nouveau champ n'en demande pas : normalize() complète
// automatiquement les valeurs manquantes avec celles d'une partie neuve.
export const SAVE_VERSION = 2

// MIGRATIONS[n] transforme un état de version n en version n + 1
const MIGRATIONS = [
  // 0 -> 1 : parties enregistrées avant l'existence des versions (état brut, sans enveloppe).
  // Regroupe toutes les corrections apportées au fil des évolutions du jeu.
  (legacy) => {
    const saved = { ...createState(), ...legacy }
    saved.gold = roundGold(saved.gold ?? 0)
    // le codex (objets découverts) est reconstruit depuis l'inventaire
    if (!legacy.codex) {
      for (const k of Object.keys(saved.inventory)) {
        const p = parseKey(k)
        saved.codex[p.item.id] = 1
        if (p.shiny) saved.codexShiny[p.item.id] = 1
      }
    }
    // les objets à capacité passent du sac d'or aux talismans
    if (!legacy.charms) {
      saved.charms = {}
      let free = saved.charmSlots
      saved.equipped = { ...saved.equipped }
      for (const [k, n] of Object.entries(saved.equipped)) {
        if (!isCharm(k)) continue
        const take = Math.min(n, free)
        if (take > 0) saved.charms[k] = take
        free -= take
        delete saved.equipped[k]
      }
    }
    // l'amélioration « Conservateur » a été supprimée : ses clés sont remboursées
    if (saved.upgrades?.keep) {
      saved.keys += 8 * (2 ** saved.upgrades.keep - 1)
      saved.upgrades = { ...saved.upgrades }
      delete saved.upgrades.keep
    }
    saved.stats = { ...createState().stats, ...legacy.stats }
    // on estime la porte la plus chère déjà ouverte d'après la meilleure rareté obtenue
    if (legacy.stats?.maxDoor === undefined && saved.bestRarity >= 0) {
      saved.stats.maxDoor = Math.max(0, DOORS.findIndex((d) => d.weights[saved.bestRarity] > 0))
    }
    if (!legacy.stats) {
      for (const k of Object.keys(saved.inventory)) saved.stats.maxTier = Math.max(saved.stats.maxTier, parseKey(k).tier)
    }
    // pas de sac équipé enregistré : on équipe automatiquement les meilleurs objets
    if (!legacy.equipped) Object.assign(saved, bestEquipment(saved.inventory, saved.slots, saved.charmSlots))
    return saved
  },
  // 1 -> 2 : arrivée du didacticiel. Les joueurs qui ont déjà une partie n'ont pas à le revoir.
  (state) => ({ ...state, tutorial: { step: 0, done: true, seen: {} } }),
]

// complète les champs manquants avec ceux d'une partie neuve (y compris dans `stats`)
function normalize(state) {
  const fresh = createState()
  return { ...fresh, ...state, stats: { ...fresh.stats, ...state.stats } }
}

// remet une sauvegarde de n'importe quelle version à la version courante
export function migrate(payload) {
  // ancien format : l'état brut, sans enveloppe (donc sans version)
  const isEnvelope = payload && typeof payload.version === 'number' && payload.state
  let version = isEnvelope ? payload.version : 0
  let state = isEnvelope ? payload.state : payload
  if (version > SAVE_VERSION) throw new Error(`Sauvegarde trop récente (version ${version}) pour ce jeu (version ${SAVE_VERSION}).`)
  for (; version < SAVE_VERSION; version++) state = MIGRATIONS[version](state)
  return normalize(state)
}

// charge la partie (ou une partie neuve si rien n'est enregistré ou si la sauvegarde est inutilisable)
export function loadGame() {
  let payload = null
  try {
    payload = gameStorage.load()
    if (payload) return migrate(payload)
  } catch {
    // sauvegarde d'une version inconnue ou inutilisable : on garde une copie avant que la nouvelle partie ne l'écrase
    if (payload) prefs.set('save-backup', payload)
  }
  return createState()
}

export const saveGame = (state) => gameStorage.save({ version: SAVE_VERSION, savedAt: Date.now(), state })
export const clearGame = () => gameStorage.clear()
