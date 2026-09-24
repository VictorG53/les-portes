// Formats des nombres, utilisés partout dans le jeu : 'short' (1,23M) ou 'scientific' (1,23e6).
// Unités abrégées, échelle courte : k = mille, M = million, B = milliard (10^9), T = mille milliards (10^12), puis Qa, Qi, Sx, Sp, Oc, No.
// Tout texte du jeu qui cite un grand nombre doit passer par formatNum / compactNum, jamais l'écrire à la main (« Md », « billion »…).
const UNITS = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No']
let numberFormat = 'short'
export const setNumberFormat = (mode) => {
  numberFormat = mode
}

// nombre sous 1 000 : 2 décimales sous 10 (0,15 ≠ 0,1), 1 décimale ensuite, aucune au-delà de 100 ; zéros de fin retirés
const small = (n) => (n >= 100 ? Math.floor(n).toString() : (+n.toFixed(n >= 10 ? 1 : 2)).toString())

const sci = (n) => n.toExponential(2).replace('e+', 'e')

export function formatNumMode(n, mode = 'short') {
  if (!Number.isFinite(n)) return '∞'
  if (n < 1000) return small(n)
  if (mode === 'scientific') return sci(n)
  let tier = Math.floor(Math.log10(n) / 3) // 1 = k, 2 = M...
  let v = n / 1000 ** tier
  // 999,96k s'arrondit à 1000,0k : on passe alors à l'unité suivante
  if (+v.toFixed(v < 10 ? 2 : 1) >= 1000) {
    tier++
    v = n / 1000 ** tier
  }
  if (tier > UNITS.length) return sci(n)
  return `${v.toFixed(v < 10 ? 2 : 1)}${UNITS[tier - 1]}`
}

export const formatNum = (n) => formatNumMode(n, numberFormat)

// nombre rond et court, pour les textes (1e9 -> « 1B », 1e6 -> « 1M », 2.5e6 -> « 2.5M »)
export const compactNum = (n, mode = 'short') => formatNumMode(n, mode).replace(/\.0+(?=\D|$)/, '').replace(/(\.\d*[1-9])0+(?=\D|$)/, '$1')


// multiplicateur (×1.5, ×4.16) : 2 décimales au plus, et la même abréviation que les autres nombres au-delà de 1 000
export const formatMult = (n) => (n >= 1000 ? formatNumMode(n, numberFormat) : `${+n.toFixed(2)}`)
