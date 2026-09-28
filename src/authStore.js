// Compte joueur (classement). Séparé de la sauvegarde de partie : ce n'est qu'un jeton + un pseudo,
// jamais synchronisé avec l'état du jeu lui-même (voir src/storage.js pour la partie).
import { prefs } from './storage'

const KEY = 'auth' // { token, pseudo } | null

export const loadAuth = () => prefs.get(KEY, null)
export const saveAuth = (auth) => (auth ? prefs.set(KEY, auth) : prefs.remove(KEY))
