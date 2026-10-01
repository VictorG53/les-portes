import { setNumberFormat } from './game'
import { setMuted, setVolume } from './sound'
import { setHaptics } from './haptics'
import { prefs } from './storage'

// réglages de l'appareil (jamais dans la sauvegarde de la partie)
export const DEFAULT_SETTINGS = {
  volume: 0.8, // 0 à 1
  muted: false,
  haptics: true, // vibrations (mobile)
  motion: 'auto', // 'auto' (suit le système) | 'reduce' | 'full'
  numberFormat: 'short', // 'short' (1,23M) | 'scientific' (1,23e6)
  toasts: true, // notifications de succès
  tips: true, // conseils contextuels du didacticiel
  theme: 'bronze', // palette : voir THEMES
}

export const THEMES = [['bronze', 'Bronze'], ['night', 'Nuit'], ['forest', 'Forêt'], ['contrast', 'Contraste']]

const clean = (s) => ({
  volume: Math.min(1, Math.max(0, Number(s.volume) || 0)),
  muted: !!s.muted,
  haptics: s.haptics !== false,
  motion: ['auto', 'reduce', 'full'].includes(s.motion) ? s.motion : DEFAULT_SETTINGS.motion,
  // (l'ancien format « complet » a été retiré : il retombe sur « abrégé »)
  numberFormat: ['short', 'scientific'].includes(s.numberFormat) ? s.numberFormat : DEFAULT_SETTINGS.numberFormat,
  toasts: s.toasts !== false,
  tips: s.tips !== false,
  theme: THEMES.some(([id]) => id === s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
})

export function loadSettings() {
  const stored = prefs.get('settings', null)
  const s = { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
  // ancien réglage « son coupé », stocké à part avant l'existence des réglages
  if (stored === null && prefs.getRaw('muted') === '1') s.muted = true
  return clean(s)
}

export const saveSettings = (s) => prefs.set('settings', s)

// applique les effets d'un réglage (son, format des nombres, animations)
export function applySettings(s) {
  setVolume(s.volume)
  setMuted(s.muted)
  setHaptics(s.haptics)
  setNumberFormat(s.numberFormat)
  document.documentElement.dataset.motion = s.motion
  document.documentElement.dataset.theme = s.theme
}
