// Retour haptique (vibreur) sur mobile, en écho des effets sonores. Web Vibration API : simplement absente sur
// iOS Safari et sur ordinateur, donc `navigator.vibrate` est appelé au mieux, sans jamais faire échouer le jeu.
let enabled = true

// motifs par type d'action (ms de vibration / pause / vibration...), du plus discret au plus marqué
const PATTERNS = {
  click: 8,
  qty: 8,
  equip: 12,
  unequip: 12,
  open: [15, 40, 15],
  buy: 10,
  sell: 10,
  achievement: [20, 40, 20, 40, 30],
  enhanceOk: [20, 30, 20, 30, 40],
  enhanceFail: 60,
  prestige: [30, 60, 30, 60, 30, 60, 50],
  fuse: [15, 30, 20],
}

// intensité du retour à la révélation, selon la rareté obtenue (0 = commun, plus haut = plus rare)
function revealPattern(rarityIdx, shiny) {
  const base = rarityIdx >= 5 ? [25, 50, 25, 50, 40] : rarityIdx >= 3 ? [20, 40, 30] : rarityIdx >= 1 ? [15, 30] : 10
  if (!shiny) return base
  return Array.isArray(base) ? [...base, 30, 20, 30] : [base, 30, 20, 30]
}

export function haptic(name, ...args) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    if (name === 'reveal') navigator.vibrate(revealPattern(...args))
    else if (PATTERNS[name]) navigator.vibrate(PATTERNS[name])
  } catch {
    /* le retour haptique ne doit jamais casser le jeu */
  }
}

export function setHaptics(value) {
  enabled = value
}
