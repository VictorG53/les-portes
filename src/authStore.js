// Compte joueur (classement). Séparé de la sauvegarde de partie : ce n'est qu'un jeton + un pseudo,
// jamais synchronisé avec l'état du jeu lui-même (voir src/storage.js pour la partie).
import { prefs } from './storage'

const KEY = 'auth' // { token, pseudo } | null

export const loadAuth = () => prefs.get(KEY, null)
export const saveAuth = (auth) => (auth ? prefs.set(KEY, auth) : prefs.remove(KEY))

// dernier compte connu sur cet appareil dont la session a été invalidée (connexion ailleurs) : le jeton
// est inutilisable pour jouer mais reste une preuve d'identité valable pour /auth/reclaim (voir App.jsx),
// tant qu'on ne l'a pas remplacé par une nouvelle connexion réussie
const REVOKED_KEY = 'auth-revoked'
export const loadRevokedAuth = () => prefs.get(REVOKED_KEY, null)
export const saveRevokedAuth = (auth) => (auth ? prefs.set(REVOKED_KEY, auth) : prefs.remove(REVOKED_KEY))
