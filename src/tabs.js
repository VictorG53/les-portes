// onglets de l'application ; le dernier onglet ouvert est mémorisé sur l'appareil
import { prefs } from './storage'

export const TABS = [
  { id: 'play', icon: '🚪', label: 'Portes' },
  { id: 'collection', icon: '📦', label: 'Collection' },
  { id: 'achievements', icon: '🏆', label: 'Succès' },
  { id: 'stats', icon: '📊', label: 'Stats' },
  { id: 'prestige', icon: '🗝️', label: 'Prestige' },
]

export function loadTab() {
  const t = prefs.get('tab', prefs.getRaw('tab')) // l'ancien format était une simple chaîne, non encodée
  return TABS.some((x) => x.id === t) ? t : 'play'
}

export const saveTab = (tab) => prefs.set('tab', tab)
