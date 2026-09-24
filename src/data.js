import { formatMult } from './format'
export const RARITIES = {
  commun: { label: 'Commun', color: '#a8b0b8', income: 0.1 },
  rare: { label: 'Rare', color: '#4da3ff', income: 0.6 },
  epique: { label: 'Épique', color: '#b063ff', income: 3 },
  legendaire: { label: 'Légendaire', color: '#ffb340', income: 20 },
  mythique: { label: 'Mythique', color: '#ff4d6d', income: 150 },
  secret: { label: 'Secret', color: '#3cffd0', income: 1500 },
  divin: { label: 'Divin', color: '#ffffff', income: 12000 },
  cosmique: { label: 'Cosmique', color: '#ff5cf4', income: 100000 },
  // la couleur "rainbow" est animée en CSS (teinte qui tourne) ; le texte est un dégradé arc-en-ciel animé
  rainbow: { label: 'Rainbow', color: 'var(--rainbow)', income: 1000000, rainbow: true },
  // « éternel » est comme rainbow, mais en noir et blanc : dégradé animé en CSS (voir .mono-text, .mono-fill)
  eternel: { label: 'Éternel', color: 'var(--mono)', income: 10000000, mono: true },
}

export const RARITY_ORDER = Object.keys(RARITIES)

export const ITEMS = [
  { id: 'champignon', name: 'Champignon lumineux', emoji: '🍄', rarity: 'commun' },
  { id: 'potion', name: 'Potion de soin', emoji: '🧪', rarity: 'commun' },
  { id: 'dague', name: 'Dague rouillée', emoji: '🗡️', rarity: 'commun' },
  { id: 'bouclier', name: 'Bouclier en bois', emoji: '🛡️', rarity: 'commun' },
  { id: 'parchemin', name: 'Parchemin ancien', emoji: '📜', rarity: 'commun' },

  { id: 'gobelin', name: 'Gobelin farceur', emoji: '👺', rarity: 'rare' },
  { id: 'arc', name: 'Arc elfique', emoji: '🏹', rarity: 'rare' },
  { id: 'grimoire', name: 'Grimoire poussiéreux', emoji: '📖', rarity: 'rare' },
  { id: 'chouette', name: 'Chouette sage', emoji: '🦉', rarity: 'rare' },

  { id: 'mage', name: 'Mage des brumes', emoji: '🧙', rarity: 'epique' },
  { id: 'licorne', name: 'Licorne argentée', emoji: '🦄', rarity: 'epique' },
  { id: 'couronne', name: 'Couronne du roi déchu', emoji: '👑', rarity: 'epique' },
  { id: 'orbe', name: 'Orbe arcanique', emoji: '🔮', rarity: 'epique' },
  {
    id: 'miroir', name: 'Miroir doré', emoji: '🪞', rarity: 'epique', weight: 0.5,
    ability: { type: 'best', value: 0.5 },
  },
  {
    id: 'anneau', name: 'Anneau du marchand', emoji: '💍', rarity: 'epique', weight: 0.5,
    ability: { type: 'discount', value: 0.08 },
  },

  { id: 'dragon', name: 'Dragon ancestral', emoji: '🐉', rarity: 'legendaire' },
  { id: 'phenix', name: 'Phénix immortel', emoji: '🐦‍🔥', rarity: 'legendaire' },
  { id: 'excalibur', name: 'Épée légendaire', emoji: '⚔️', rarity: 'legendaire' },
  {
    id: 'trefle', name: 'Trèfle à quatre feuilles', emoji: '🍀', rarity: 'legendaire', weight: 0.5,
    ability: { type: 'luck', value: 0.2 },
  },
  {
    id: 'amulette', name: 'Amulette de prospérité', emoji: '📿', rarity: 'legendaire', weight: 0.5,
    ability: { type: 'global', value: 0.25 },
  },
  {
    id: 'encyclopedie', name: 'Encyclopédie du monde', emoji: '📚', rarity: 'legendaire', weight: 0.5,
    ability: { type: 'collector', value: 0.02 },
  },

  { id: 'kraken', name: 'Kraken des abysses', emoji: '🦑', rarity: 'mythique' },
  { id: 'demon', name: 'Seigneur démon', emoji: '😈', rarity: 'mythique' },
  {
    id: 'chaudron', name: 'Chaudron du sorcier', emoji: '🫕', rarity: 'mythique', weight: 0.5,
    ability: { type: 'rarity', rarity: 'epique', value: 1 },
  },
  {
    id: 'sablier', name: 'Sablier temporel', emoji: '⏳', rarity: 'mythique', weight: 0.5,
    ability: { type: 'global', value: 1 },
  },

  { id: 'porte', name: 'La Porte Originelle', emoji: '🚪', rarity: 'secret' },

  { id: 'ange', name: 'Ange gardien', emoji: '👼', rarity: 'divin' },
  { id: 'etoile', name: 'Étoile déchue', emoji: '🌟', rarity: 'divin' },
  { id: 'trident', name: 'Trident du dieu des mers', emoji: '🔱', rarity: 'divin' },
  {
    id: 'graal', name: 'Saint Graal', emoji: '🏆', rarity: 'divin', weight: 0.5,
    ability: { type: 'best', value: 2 },
  },

  { id: 'galaxie', name: 'Galaxie captive', emoji: '🌌', rarity: 'cosmique' },
  { id: 'planete', name: 'Planète-monde', emoji: '🪐', rarity: 'cosmique' },

  { id: 'arcenciel', name: 'Arc-en-ciel éternel', emoji: '🌈', rarity: 'rainbow' },
  { id: 'prisme', name: 'Prisme originel', emoji: '💠', rarity: 'rainbow' },
  {
    id: 'spectre', name: 'Spectre du prisme', emoji: '🔆', rarity: 'rainbow', weight: 0.5,
    ability: { type: 'best', value: 3 },
  },

  { id: 'boucle', name: 'Boucle infinie', emoji: '♾️', rarity: 'eternel' },
  { id: 'trounoir', name: 'Trou noir domestique', emoji: '🕳️', rarity: 'eternel' },
  {
    id: 'oeil', name: 'Œil éternel', emoji: '🧿', rarity: 'eternel', weight: 0.5,
    ability: { type: 'global', value: 3 },
  },
]

// --- hiérarchie à l'intérieur d'une rareté ---
// Les objets d'or d'une même rareté sont classés du plus faible au plus fort. Chaque rang est plus puissant
// (RANK_POWER_STEP) mais tombe moins souvent (RANK_DROP_STEP). La puissance est recentrée pour que le revenu
// moyen pondéré par les chances de tirage reste celui de la rareté : l'équilibrage global ne change pas.
const RANK_POWER_STEP = 1.4
const RANK_DROP_STEP = 0.65
const POWER_ORDER = {
  commun: ['champignon', 'potion', 'parchemin', 'dague', 'bouclier'],
  rare: ['gobelin', 'chouette', 'arc', 'grimoire'],
  epique: ['orbe', 'mage', 'couronne', 'licorne'],
  legendaire: ['phenix', 'excalibur', 'dragon'],
  mythique: ['demon', 'kraken'],
  secret: ['porte'],
  divin: ['ange', 'trident', 'etoile'],
  cosmique: ['galaxie', 'planete'],
  rainbow: ['arcenciel', 'prisme'],
  eternel: ['boucle', 'trounoir'],
}
for (const [rarity, ids] of Object.entries(POWER_ORDER)) {
  const raw = ids.map((_, i) => RANK_POWER_STEP ** i)
  const w = ids.map((_, i) => RANK_DROP_STEP ** i)
  const mean = raw.reduce((s, p, i) => s + p * w[i], 0) / w.reduce((s, x) => s + x, 0)
  ids.forEach((id, i) => {
    const item = ITEMS.find((it) => it.id === id && it.rarity === rarity)
    item.rank = i
    item.power = raw[i] / mean
    item.dropWeight = w[i]
  })
}
// les talismans ne rapportent pas d'or : ils gardent leur poids de tirage propre
for (const item of ITEMS) {
  if (item.power === undefined) {
    item.power = 1
    item.dropWeight = item.weight ?? 1
  }
}
// part des tirages de sa rareté qui revient à cet objet (0 à 1)
export const dropShare = (item) => {
  const pool = ITEMS.filter((i) => i.rarity === item.rarity)
  return item.dropWeight / pool.reduce((s, i) => s + i.dropWeight, 0)
}

// rang de l'objet parmi les objets d'or de sa rareté (talismans exclus) : { rank: 1 = le plus faible, count }
export const rankInfo = (item) => {
  const gold = ITEMS.filter((i) => i.rarity === item.rarity && !i.ability)
  return { rank: item.rank + 1, count: gold.length }
}

const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]))

// weights: commun, rare, épique, légendaire, mythique, secret, divin, cosmique, rainbow, éternel
export const DOORS = [
  {
    id: 'bois',
    name: 'Porte en bois',
    cost: 10,
    weights: [78, 18, 3.8, 0.2, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'fer',
    name: 'Porte en fer',
    cost: 150,
    weights: [40, 42, 15, 2.8, 0.2, 0, 0, 0, 0, 0],
  },
  {
    id: 'or',
    name: 'Porte dorée',
    cost: 2500,
    weights: [0, 40, 45, 13, 1.9, 0.1, 0, 0, 0, 0],
  },
  {
    id: 'runes',
    name: 'Porte runique',
    cost: 40000,
    weights: [0, 0, 55, 35, 9, 1, 0, 0, 0, 0],
  },
  {
    id: 'cristal',
    name: 'Porte en cristal',
    cost: 600000,
    weights: [0, 0, 20, 50, 25, 3.5, 1.5, 0, 0, 0],
  },
  {
    id: 'neant',
    name: 'Porte du Néant',
    cost: 12000000,
    weights: [0, 0, 0, 20, 55, 15, 9, 1, 0, 0],
  },
  {
    id: 'rainbow',
    name: 'Porte Rainbow',
    cost: 250000000,
    weights: [0, 0, 0, 0, 45, 32, 16, 6.6, 0.4, 0],
  },
  {
    id: 'eternelle',
    name: 'Porte Éternelle',
    cost: 5000000000,
    weights: [0, 0, 0, 0, 0, 40, 35, 20, 4.5, 0.5],
  },
]

// Les portes chères s'adaptent à ta puissance permanente (Fortune, clés, succès) : leur prix est multiplié par
// puissance ^ exposant. Les premières portes n'en dépendent pas (le début va de plus en plus vite avec les prestiges),
// la dernière suit ta puissance de près, si bien qu'elle reste longue à atteindre.
export const DOOR_PRICE_EXP = { bois: 0, fer: 0, or: 0, runes: 0.45, cristal: 0.9, neant: 1.3, rainbow: 1.7, eternelle: 2.2 }

// classe CSS à ajouter au texte d'une rareté (dégradé arc-en-ciel animé pour Rainbow)
export const rarityClass = (rarity) => (RARITIES[rarity]?.rainbow ? 'rainbow-text' : RARITIES[rarity]?.mono ? 'mono-text' : '')
// classe CSS d'un aplat plein (barre de probabilités, pastille) pour les raretés animées
export const rarityFill = (rarity) => (RARITIES[rarity]?.rainbow ? 'rainbow-fill' : RARITIES[rarity]?.mono ? 'mono-fill' : '')

const sellValue = (item) => Math.round(RARITIES[item.rarity].income * item.power * 40)

// --- fusion : 5 objets identiques d'un même niveau -> 1 objet du niveau supérieur ---
export const FUSE_COUNT = 5
export const MAX_TIER = 8
// niveau maximal pris en compte pour la puissance des capacités (au-delà, la fusion ne fait que gagner de la place)
const ABILITY_TIER_CAP = 4
// affichage compact du niveau : ★★★ jusqu'à 5, puis ★6, ★7...
export const starsText = (tier) => (tier <= 5 ? '★'.repeat(tier) : `★${tier}`)
// revenu d'un objet fusionné : ×TIER_MULT par niveau. Volontairement inférieur à FUSE_COUNT :
// la fusion libère déjà FUSE_COUNT - 1 emplacements dans le sac, c'est son principal avantage.
export const TIER_MULT = 3

// --- shiny : version brillante d'un objet, rare, qui rapporte plus ---
export const SHINY_CHANCE = 0.025
export const SHINY_MULT = 1.5
const shinyMult = (shiny) => (shiny ? SHINY_MULT : 1)

// --- amélioration (forge) : chaque exemplaire peut être amélioré de +1 à +MAX_ENHANCE, avec un risque de le perdre ---
export const MAX_ENHANCE = 5
export const ENHANCE_STEP = 0.5 // +50 % de revenu (ou d'effet) par niveau
export const ENHANCE_RATES = [0.9, 0.8, 0.65, 0.5, 0.35] // chances de réussite de +0→+1, +1→+2, etc.
const ENHANCE_COST_FACTOR = 40 // coût = revenu de l'objet × 40 × (niveau + 1)
const enhanceMult = (level) => 1 + ENHANCE_STEP * level

// clé d'inventaire : "id" (niveau 1), "id#2" (niveau 2)... ; "+3" = amélioré +3 ; "*" à la fin = shiny
// exemples : "id", "id#2", "id+3", "id#2+3*"
export const keyOf = (id, tier = 1, shiny = false, level = 0) =>
  `${id}${tier > 1 ? `#${tier}` : ''}${level > 0 ? `+${level}` : ''}${shiny ? '*' : ''}`
export function parseKey(key) {
  const shiny = key.endsWith('*')
  const [rest, level] = (shiny ? key.slice(0, -1) : key).split('+')
  const [id, tier] = rest.split('#')
  return { item: ITEMS_BY_ID[id], tier: tier ? Number(tier) : 1, shiny, level: level ? Number(level) : 0, key }
}
const tierMult = (tier) => TIER_MULT ** (tier - 1)
export const itemIncome = (item, tier, shiny = false, level = 0) =>
  RARITIES[item.rarity].income * item.power * tierMult(tier) * shinyMult(shiny) * enhanceMult(level)
// coût pour tenter de passer de `level` à `level` + 1 (indexé sur le revenu de l'objet non amélioré)
export const enhanceCost = (item, tier, shiny, level) =>
  Math.round(itemIncome(item, tier, shiny, 0) * ENHANCE_COST_FACTOR * (level + 1))
// un objet fusionné se revend au prix des exemplaires qu'il contient (et non selon son revenu)
export const itemSell = (item, tier, shiny = false) => sellValue(item) * FUSE_COUNT ** (tier - 1) * shinyMult(shiny)

// --- capacités : l'effet est multiplié par le niveau (★) de l'objet ---
const pct = (v) => Math.round(v * 100)
export const abilityValue = (item, tier, shiny = false, level = 0) =>
  item.ability.value * Math.min(tier, ABILITY_TIER_CAP) * shinyMult(shiny) * enhanceMult(level)
// version très courte de l'effet, pour les petites tuiles (ex. « Prix −8% »)
export function abilityShort(item, tier, shiny = false, level = 0) {
  const { type, rarity } = item.ability
  const v = abilityValue(item, tier, shiny, level)
  const mult = formatMult(1 + v)
  switch (type) {
    case 'best':
      return `Meilleur ×${mult}`
    case 'global':
      return `Revenu +${pct(v)}%`
    case 'collector':
      return `+${pct(v)}%/objet`
    case 'rarity':
      return `${RARITIES[rarity].label}s ×${mult}`
    case 'luck':
      return `Chance +${pct(v)}%`
    case 'discount':
      return `Prix −${pct(v)}%`
    default:
      return ''
  }
}

export function abilityText(item, tier, shiny = false, level = 0) {
  const { type, rarity } = item.ability
  const v = abilityValue(item, tier, shiny, level)
  switch (type) {
    case 'best':
      return `Le meilleur objet équipé rapporte ×${formatMult(1 + v)}`
    case 'global':
      return `+${pct(v)}% de revenu total`
    case 'collector':
      return `+${pct(v)}% de revenu par objet découvert`
    case 'rarity':
      return `Les objets ${RARITIES[rarity].label}s équipés rapportent ×${formatMult(1 + v)}`
    case 'luck':
      return `+${pct(v)}% de chances d'obtenir du Légendaire ou mieux`
    case 'discount':
      return `-${pct(v)}% sur le prix des portes`
    default:
      return ''
  }
}

// --- prestige : on recommence contre des clés, qui donnent des bonus permanents ---
export const PRESTIGE_BASE = 5_000_000 // or gagné (dans la partie) pour la première clé
// bonus de revenu des clés gagnées au total : 1 + KEY_BONUS × clés^KEY_EXPONENT (croissance ralentie)
const KEY_BONUS = 0.1
const KEY_EXPONENT = 0.5
export const keyMultiplier = (totalKeys) => 1 + KEY_BONUS * totalKeys ** KEY_EXPONENT
// Paliers géométriques : la 1re clé arrive à PRESTIGE_BASE d'or gagné, chaque clé suivante demande
// PRESTIGE_STEP fois plus d'or que la précédente (n clés = PRESTIGE_BASE × PRESTIGE_STEP^(n-1)).
const PRESTIGE_STEP = 1.8
export const prestigeGain = (runEarned) =>
  runEarned < PRESTIGE_BASE ? 0 : Math.floor(Math.log(runEarned / PRESTIGE_BASE) / Math.log(PRESTIGE_STEP) + 1e-9) + 1
// or à avoir gagné pour obtenir la clé suivante (quand on en a déjà `gain`)
export const prestigeNextAt = (gain) => PRESTIGE_BASE * PRESTIGE_STEP ** gain

// lots d'ouverture : ×1, ×5 et ×10 sont toujours disponibles, les suivants se débloquent avec l'amélioration « Grosses ouvertures »
export const QUANTITIES = [1, 5, 10, 25, 50, 100, 250]
export const BATCH_LIMITS = [10, 25, 50, 100, 250] // lot maximal selon le niveau de l'amélioration

// nombre maximal d'emplacements sans amélioration ; « Grand sac » et « Écrin » relèvent ces plafonds
export const BASE_MAX_SLOTS = 16
export const BASE_MAX_CHARM_SLOTS = 4

// gain hors ligne : part du revenu gagnée et durée d'absence prise en compte, avant amélioration
export const OFFLINE_BASE_RATE = 0.25
export const OFFLINE_BASE_HOURS = 2
export const OFFLINE_STEP_RATE = 0.05 // par niveau de « Sommeil profond »
export const OFFLINE_STEP_HOURS = 0.5

export const UPGRADE_STEP = { income: 0.25, luck: 0.05, discount: 0.03, shiny: 0.005, gold: 400 }

// niveau actuel l -> coût du niveau suivant ; effect(l) décrit l'effet au niveau l
export const UPGRADES = [
  {
    id: 'income', icon: '💰', name: 'Fortune', max: 40,
    cost: (l) => Math.round(1.5 ** l),
    effect: (l) => `+${Math.round(l * UPGRADE_STEP.income * 100)}% de revenu`,
  },
  {
    id: 'slots', icon: '🎒', name: 'Grand sac', max: 8,
    cost: (l) => 2 + 3 * l,
    effect: (l) => `Le sac peut monter jusqu'à ${BASE_MAX_SLOTS + l} emplacements (${BASE_MAX_SLOTS} de base)`,
  },
  {
    id: 'charms', icon: '📿', name: 'Écrin', max: 4,
    cost: (l) => 4 + 4 * l,
    effect: (l) => `Les talismans peuvent monter jusqu'à ${BASE_MAX_CHARM_SLOTS + l} emplacements (${BASE_MAX_CHARM_SLOTS} de base)`,
  },
  {
    id: 'gold', icon: '🪙', name: 'Capital de départ', max: 15,
    cost: (l) => 1 + l,
    effect: (l) => `+${l * UPGRADE_STEP.gold} or au départ de chaque partie`,
  },
  {
    id: 'luck', icon: '🍀', name: 'Baraka', max: 10,
    cost: (l) => 3 + 2 * l,
    effect: (l) => `+${Math.round(l * UPGRADE_STEP.luck * 100)}% de chances Légendaire ou mieux`,
  },
  {
    id: 'discount', icon: '🏷️', name: 'Négociateur', max: 10,
    cost: (l) => 3 + 2 * l,
    effect: (l) => `-${Math.round(l * UPGRADE_STEP.discount * 100)}% sur le prix des portes`,
  },
  {
    id: 'shiny', icon: '✨', name: 'Éclat', max: 10,
    cost: (l) => 4 + 2 * l,
    effect: (l) => `+${+(l * UPGRADE_STEP.shiny * 100).toFixed(1)} pt de chance shiny`,
  },
  {
    id: 'fusion', icon: '🔨', name: 'Forge', max: 2,
    cost: (l) => [15, 50][l],
    effect: (l) => `Fusion avec ${FUSE_COUNT - l} objets au lieu de ${FUSE_COUNT}`,
  },
  {
    id: 'offline', icon: '🌙', name: 'Sommeil profond', max: 8,
    cost: (l) => 3 + 3 * l,
    effect: (l) =>
      `Gain hors ligne : ${Math.round((OFFLINE_BASE_RATE + l * OFFLINE_STEP_RATE) * 100)} % du revenu, jusqu'à ${+(OFFLINE_BASE_HOURS + l * OFFLINE_STEP_HOURS).toFixed(1)} h d'absence`,
  },
  {
    id: 'batch', icon: '🔓', name: 'Grosses ouvertures', max: 4,
    cost: (l) => [3, 8, 20, 50][l],
    effect: (l) => (l === 0 ? 'Lots jusqu\u2019à ×10' : `Lots jusqu'à ×${BATCH_LIMITS[l]}`),
  },
]
