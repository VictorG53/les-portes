import { ITEMS, MAX_ENHANCE, MAX_TIER, RARITIES, RARITY_ORDER, UPGRADES, parseKey } from './data'
import { compactNum } from './format'

// Succès : chacun donne un bonus de revenu permanent (qui ne disparaît pas au prestige).
// check(s, ctx) reçoit l'état du jeu et { income } ; progress(s, ctx) renvoie [valeur, objectif].
const ach = []
function metric(id, group, icon, name, desc, value, target, reward) {
  ach.push({
    id, group, icon, name, desc, reward,
    progress: (s, ctx) => [Math.min(value(s, ctx), target), target],
    check: (s, ctx) => value(s, ctx) >= target,
  })
}

const stat = (s, k) => s.stats?.[k] ?? 0
const count = (o) => Object.keys(o ?? {}).length
const levels = (s) => Object.values(s.upgrades ?? {})

// --- portes ---
metric('open10', 'Portes', '🚪', 'Curieux', 'Ouvre 10 portes', (s) => s.opened, 10, 0.01)
metric('open100', 'Portes', '🚪', 'Explorateur', 'Ouvre 100 portes', (s) => s.opened, 100, 0.02)
metric('open1000', 'Portes', '🚪', 'Cambrioleur', 'Ouvre 1 000 portes', (s) => s.opened, 1000, 0.03)
metric('open10000', 'Portes', '🚪', 'Maître des portes', 'Ouvre 10 000 portes', (s) => s.opened, 10000, 0.05)
metric('batch10', 'Portes', '🔟', 'Tout d’un coup', 'Ouvre 10 portes en une fois', (s) => stat(s, 'maxBatch'), 10, 0.01)

// --- raretés ---
const rarityAch = [
  ['epique', '🔮', 'Éveillé', 0.01],
  ['legendaire', '🐉', 'Légendaire !', 0.02],
  ['mythique', '😈', 'Mythique', 0.03],
  ['secret', '🤫', 'Chut...', 0.04],
  ['divin', '👼', 'Toucher le ciel', 0.05],
  ['cosmique', '🌌', 'Poussière d’étoiles', 0.06],
  ['rainbow', '🌈', 'Au bout de l’arc-en-ciel', 0.08],
  ['eternel', '♾️', 'Hors du temps', 0.1],
]
for (const [r, icon, name, reward] of rarityAch) {
  const idx = RARITY_ORDER.indexOf(r)
  metric(`rarity-${r}`, 'Raretés', icon, name, `Obtiens un objet ${RARITIES[r].label}`, (s) => s.bestRarity + 1, idx + 1, reward)
}

// --- collection ---
metric('col10', 'Collection', '📚', 'Collectionneur', 'Découvre 10 objets', (s) => count(s.codex), 10, 0.02)
metric('col20', 'Collection', '📚', 'Archiviste', 'Découvre 20 objets', (s) => count(s.codex), 20, 0.03)
metric('colAll', 'Collection', '🏛️', 'Complétiste', `Découvre les ${ITEMS.length} objets`, (s) => count(s.codex), ITEMS.length, 0.06)

// --- shiny ---
metric('shiny1', 'Shiny', '✨', 'Ça brille !', 'Obtiens un objet shiny', (s) => count(s.codexShiny), 1, 0.02)
metric('shiny5', 'Shiny', '✨', 'Chasseur de shiny', 'Obtiens 5 objets shiny différents', (s) => count(s.codexShiny), 5, 0.03)
metric('shiny10', 'Shiny', '💫', 'Constellation', 'Obtiens 10 objets shiny différents', (s) => count(s.codexShiny), 10, 0.05)
metric('shinyAll', 'Shiny', '🌟', 'Tout est or', `Obtiens les ${ITEMS.length} objets en shiny`, (s) => count(s.codexShiny), ITEMS.length, 0.1)

// --- fusion ---
metric('tier2', 'Fusion', '🔨', 'Forgeron', 'Obtiens un objet ★★', (s) => stat(s, 'maxTier'), 2, 0.01)
metric('tier3', 'Fusion', '⚒️', 'Maître forgeron', 'Obtiens un objet ★★★', (s) => stat(s, 'maxTier'), 3, 0.02)
metric('tier4', 'Fusion', '🔥', 'Chef-d’œuvre', 'Obtiens un objet ★★★★', (s) => stat(s, 'maxTier'), 4, 0.04)
metric('tier5', 'Fusion', '🌋', 'Titan', 'Obtiens un objet ★★★★★', (s) => stat(s, 'maxTier'), 5, 0.05)
metric('tier6', 'Fusion', '🏔️', 'Légende vivante', 'Obtiens un objet ★6', (s) => stat(s, 'maxTier'), 6, 0.05)
metric('tier7', 'Fusion', '🌠', 'Mythe', 'Obtiens un objet ★7', (s) => stat(s, 'maxTier'), 7, 0.06)
metric('tier8', 'Fusion', '👑', 'Au-delà du possible', 'Obtiens un objet ★8', (s) => stat(s, 'maxTier'), 8, 0.1)

// --- forge ---
metric('enh1', 'Forge', '⚒️', 'Apprenti forgeron', 'Réussis une amélioration', (s) => stat(s, 'maxEnhance'), 1, 0.01)
metric('enh3', 'Forge', '🔨', 'Main sûre', 'Amène un objet à +3', (s) => stat(s, 'maxEnhance'), 3, 0.03)
metric('enh5', 'Forge', '🔥', 'Perfection', 'Amène un objet à +5', (s) => stat(s, 'maxEnhance'), 5, 0.06)

// --- sac ---
metric('slots12', 'Sac', '🎒', 'Bien équipé', 'Atteins 12 emplacements', (s) => s.slots, 12, 0.02)
metric('slots24', 'Sac', '🧳', 'Sac sans fond', 'Atteins 24 emplacements', (s) => s.slots, 24, 0.04)
metric(
  'ability', 'Sac', '⚡', 'Petit malin', 'Équipe un talisman',
  (s) => (Object.keys(s.charms ?? {}).length > 0 ? 1 : 0),
  1, 0.01,
)

// --- revenu ---
metric('inc1k', 'Revenu', '💰', 'Petite fortune', `Atteins ${compactNum(1e3)} or/s`, (s, c) => c.income, 1e3, 0.01)
metric('inc1M', 'Revenu', '💰', 'Millionnaire', `Atteins ${compactNum(1e6)} or/s`, (s, c) => c.income, 1e6, 0.03)
metric('inc1B', 'Revenu', '🏦', 'Milliardaire', `Atteins ${compactNum(1e9)} or/s`, (s, c) => c.income, 1e9, 0.05)
metric('inc1T', 'Revenu', '💎', 'Au-delà des chiffres', `Atteins ${compactNum(1e12)} or/s`, (s, c) => c.income, 1e12, 0.08)

// --- prestige ---
metric('prestige1', 'Prestige', '🗝️', 'Premier passage', 'Franchis le Portail une fois', (s) => s.prestiges, 1, 0.03)
metric('prestige5', 'Prestige', '🗝️', 'Habitué', 'Franchis le Portail 5 fois', (s) => s.prestiges, 5, 0.04)
metric('prestige25', 'Prestige', '🗝️', 'Gardien du Portail', 'Franchis le Portail 25 fois', (s) => s.prestiges, 25, 0.06)
metric('keys100', 'Prestige', '🔑', 'Trousseau', 'Gagne 100 clés au total', (s) => s.totalKeys, 100, 0.03)
metric('keys1000', 'Prestige', '🔑', 'Geôlier', 'Gagne 1 000 clés au total', (s) => s.totalKeys, 1000, 0.05)
metric('up1', 'Prestige', '🛠️', 'Investisseur', 'Achète une amélioration de prestige', (s) => levels(s).some((l) => l > 0) ? 1 : 0, 1, 0.01)
metric(
  'upMax', 'Prestige', '🏅', 'Au sommet', 'Amène une amélioration au niveau maximum',
  (s) => UPGRADES.some((u) => (s.upgrades?.[u.id] ?? 0) >= u.max) ? 1 : 0,
  1, 0.03,
)

// --- hors ligne ---
metric('away1h', 'Divers', '💤', 'Bonne nuit', 'Reviens après 1 h d’absence', (s) => stat(s, 'maxAway'), 3600, 0.01)

// --- ultime : un seul exemplaire à la fois shiny, au niveau de fusion maximal et forgé au maximum ---
// Tout ou rien : 0 tant qu'aucun exemplaire ne réunit les trois conditions, 1 dès qu'il y en a un.
const hasPerfectItem = (s) =>
  Object.keys(s.inventory ?? {}).some((key) => {
    const { tier, shiny, level } = parseKey(key)
    return shiny && tier >= MAX_TIER && level >= MAX_ENHANCE
  })
metric(
  'ultimate', 'Ultime', '⚜️', 'L\u2019objet parfait',
  `Possède un objet shiny, de niveau ★${MAX_TIER}, forgé à +${MAX_ENHANCE}`,
  (s) => (hasPerfectItem(s) ? 1 : 0), 1, 0.25,
)
ach[ach.length - 1].alwaysProgress = true // affiche « 0 / 1 » même si l'objectif est 1

export const ACHIEVEMENTS = ach
export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ach.map((a) => [a.id, a]))

// bonus de revenu total des succès débloqués (ex. 0.12 = +12 %)
export const achievementBonus = (unlocked = {}) =>
  Object.keys(unlocked).reduce((sum, id) => sum + (ACHIEVEMENTS_BY_ID[id]?.reward ?? 0), 0)

// succès dont la condition est remplie et qui ne sont pas encore débloqués
export const newlyUnlocked = (s, ctx) =>
  ACHIEVEMENTS.filter((a) => !s.achievements?.[a.id] && a.check(s, ctx)).map((a) => a.id)
