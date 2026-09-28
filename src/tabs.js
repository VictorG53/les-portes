// onglets de l'application ; le dernier onglet ouvert est mémorisé sur l'appareil
import { BarChart3, DoorOpen, KeyRound, Medal, Package, Trophy } from 'lucide-react'
import { prefs } from './storage'

export const TABS = [
  { id: 'play', icon: DoorOpen, label: 'Portes' },
  { id: 'collection', icon: Package, label: 'Collection' },
  { id: 'achievements', icon: Trophy, label: 'Succès' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'prestige', icon: KeyRound, label: 'Prestige' },
  { id: 'leaderboard', icon: Medal, label: 'Classement' },
]

export function loadTab() {
  const t = prefs.get('tab', prefs.getRaw('tab')) // l'ancien format était une simple chaîne, non encodée
  return TABS.some((x) => x.id === t) ? t : 'play'
}

export const saveTab = (tab) => prefs.set('tab', tab)
