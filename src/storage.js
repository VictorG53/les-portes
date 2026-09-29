// Stockage local : uniquement `prefs`, les préférences de l'appareil (onglet ouvert, filtres, réglages, jeton
// de connexion). Jamais synchronisées. La partie, elle, n'est plus stockée ici : elle est en ligne (voir App.jsx).
const PREFIX = 'les-portes-'

// stockage local, sans jamais lever d'exception (mode privé, quota, stockage bloqué...)
const local = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* stockage indisponible */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* stockage indisponible */
    }
  },
}

export const prefs = {
  getRaw: (name) => local.get(PREFIX + name),
  get(name, fallback) {
    const raw = local.get(PREFIX + name)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  },
  set: (name, value) => local.set(PREFIX + name, JSON.stringify(value)),
  remove: (name) => local.remove(PREFIX + name),
}

// --- ancienne sauvegarde locale ---
// La partie vit désormais uniquement sur le serveur. Cette copie, écrite par les anciennes versions, n'est lue
// qu'une fois : à la première connexion d'un compte qui n'a encore rien en ligne (voir App.jsx), puis supprimée.
const GAME_KEY = 'les-portes-save-v1'

export const legacyLocalGame = {
  load() {
    const raw = local.get(GAME_KEY)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  clear() {
    local.remove(GAME_KEY)
    local.remove(GAME_KEY + '-corrupt')
    local.remove(PREFIX + 'save-backup')
    local.remove(PREFIX + 'save-backup-before-remote')
  },
}
