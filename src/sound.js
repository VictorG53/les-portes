// Sons synthétisés avec la Web Audio API : aucun fichier audio à charger.
import { RARITY_ORDER } from './data'
import { groupResults, revealStep } from './revealUtils'
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]

const MASTER_GAIN = 0.35 // gain de base ; le réglage de volume s'y applique

let ctx = null
let master = null
let muted = false
let volume = 1

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN * volume
    master.connect(comp)
    comp.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// une note : enveloppe percussive, avec glissando optionnel
function tone({ freq, at = 0, dur = 0.15, type = 'sine', gain = 0.3, to = null }) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

// bruit filtré (grincement, souffle)
function noise({ at = 0, dur = 0.3, from = 300, to = 300, q = 4, gain = 0.2 }) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t)
}

const sounds = {
  click: () => tone({ freq: 620, dur: 0.05, type: 'triangle', gain: 0.18 }),
  qty: () => tone({ freq: 480, dur: 0.05, type: 'triangle', gain: 0.15 }),
  equip: () => {
    tone({ freq: 520, dur: 0.07, type: 'triangle', gain: 0.2 })
    tone({ freq: 780, at: 0.06, dur: 0.09, type: 'triangle', gain: 0.2 })
  },
  unequip: () => {
    tone({ freq: 700, dur: 0.07, type: 'triangle', gain: 0.18 })
    tone({ freq: 450, at: 0.06, dur: 0.09, type: 'triangle', gain: 0.18 })
  },
  // synchronisé avec l'animation de la porte : 2 coups, puis grincement
  open: () => {
    tone({ freq: 140, at: 0.05, dur: 0.16, gain: 0.5, to: 60 })
    tone({ freq: 130, at: 0.32, dur: 0.16, gain: 0.5, to: 55 })
    noise({ at: 0.6, dur: 0.5, from: 220, to: 700, q: 7, gain: 0.25 })
    tone({ freq: 180, at: 0.6, dur: 0.5, type: 'sawtooth', gain: 0.05, to: 320 })
  },
  buy: () => {
    tone({ freq: 988, dur: 0.09, type: 'square', gain: 0.1 })
    tone({ freq: 1319, at: 0.08, dur: 0.22, type: 'square', gain: 0.1 })
  },
  sell: () => {
    for (let i = 0; i < 4; i++) {
      tone({ freq: 1200 + i * 180, at: i * 0.055, dur: 0.1, type: 'square', gain: 0.07 })
    }
  },
  achievement: () => {
    ;[784, 988, 1319].forEach((f, i) => tone({ freq: f, at: i * 0.09, dur: 0.35, type: 'triangle', gain: 0.22 }))
    tone({ freq: 1568, at: 0.3, dur: 0.6, gain: 0.12 })
  },
  enhanceStart: () => {
    tone({ freq: 180, dur: 1.05, type: 'sawtooth', gain: 0.07, to: 720 })
    for (let i = 0; i < 5; i++) tone({ freq: 140, at: 0.05 + i * 0.2, dur: 0.1, gain: 0.35, to: 70 })
    noise({ dur: 1, from: 500, to: 3500, q: 3, gain: 0.08 })
  },
  enhanceOk: () => {
    ;[659.25, 830.61, 987.77, 1318.51].forEach((f, i) => tone({ freq: f, at: i * 0.08, dur: 0.5, type: 'triangle', gain: 0.24 }))
    tone({ freq: 1975, at: 0.32, dur: 0.7, gain: 0.1 })
  },
  enhanceFail: () => {
    tone({ freq: 300, dur: 0.45, type: 'sawtooth', gain: 0.16, to: 60 })
    noise({ dur: 0.5, from: 2500, to: 300, q: 1, gain: 0.2 })
    tone({ freq: 90, at: 0.05, dur: 0.4, gain: 0.4, to: 40 })
  },
  prestige: () => {
    tone({ freq: 110, dur: 1.2, type: 'sawtooth', gain: 0.08, to: 880 })
    noise({ dur: 1.1, from: 300, to: 5000, q: 1.5, gain: 0.14 })
    ;[523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      tone({ freq: f, at: 1 + i * 0.09, dur: 1.1, gain: 0.2, type: 'triangle' }),
    )
  },
  fuse: () => {
    tone({ freq: 220, dur: 0.45, type: 'sawtooth', gain: 0.1, to: 880 })
    noise({ dur: 0.45, from: 400, to: 3000, q: 2, gain: 0.12 })
    ;[880, 1174.66, 1567.98].forEach((f, i) =>
      tone({ freq: f, at: 0.45 + i * 0.07, dur: 0.4, gain: 0.2 }),
    )
  },
}

// arpège qui monte avec la rareté ; plus c'est rare, plus il est long et brillant
function chime(rarityIdx, isNew, delay = 0, shiny = false) {
  const n = Math.min(rarityIdx + 1, SCALE.length)
  for (let i = 0; i < n; i++) {
    const last = i === n - 1
    tone({ freq: SCALE[i], at: delay + i * 0.085, dur: last ? 0.7 : 0.18, gain: last ? 0.28 : 0.2, type: 'triangle' })
    if (rarityIdx >= 4) tone({ freq: SCALE[i] * 2, at: delay + i * 0.085, dur: last ? 0.9 : 0.2, gain: 0.07 })
  }
  const end = delay + n * 0.085
  if (rarityIdx >= 3) {
    // accord final
    ;[SCALE[Math.min(n - 1, 9)] * 0.5, SCALE[Math.min(n - 1, 9)] * 0.75].forEach((f) =>
      tone({ freq: f, at: end - 0.05, dur: 0.9, gain: 0.12 }),
    )
  }
  if (rarityIdx >= 5) noise({ at: end - 0.1, dur: 0.8, from: 2000, to: 6000, q: 1.5, gain: 0.06 })
  if (shiny) {
    // scintillement aigu
    ;[2093, 2637, 3136, 4186].forEach((f, i) =>
      tone({ freq: f, at: end + 0.05 + i * 0.06, dur: 0.35, gain: 0.09 }),
    )
    noise({ at: end, dur: 0.6, from: 4000, to: 9000, q: 2, gain: 0.05 })
  }
  if (isNew) {
    tone({ freq: 1567.98, at: end + 0.05, dur: 0.12, gain: 0.16 })
    tone({ freq: 2093, at: end + 0.13, dur: 0.3, gain: 0.16 })
  }
}

export function play(name, ...args) {
  if (muted) return
  try {
    sounds[name]?.(...args)
  } catch {
    /* le son ne doit jamais casser le jeu */
  }
}

export function playReveal(results) {
  if (muted) return
  try {
    const idx = (r) => RARITY_ORDER.indexOf(r.item.rarity)
    if (results.length === 1) {
      chime(idx(results[0]), results[0].isNew, 0, results[0].shiny)
      return
    }
    // un « pop » par objet, calé sur l'apparition des mini-cartes, puis le meilleur
    const tiles = groupResults(results)
    const step = revealStep(tiles.length)
    tiles.forEach((r, i) =>
      tone({ freq: SCALE[Math.min(idx(r), 9)] * 0.8, at: 0.15 + i * step, dur: 0.07, type: 'triangle', gain: 0.13 }),
    )
    const bestIdx = Math.max(...tiles.map(idx)) // le meilleur, tous types confondus (les tuiles sont triées par type)
    chime(bestIdx, results.some((r) => r.isNew), 0.15 + tiles.length * step, results.some((r) => r.shiny))
  } catch {
    /* ignore */
  }
}

export const isMuted = () => muted
export function setMuted(value) {
  muted = value
}
// volume de 0 à 1 (le réglage est mémorisé par src/settings.js)
export function setVolume(value) {
  volume = Math.min(1, Math.max(0, value))
  if (master) master.gain.value = MASTER_GAIN * volume
}
