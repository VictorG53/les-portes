// Stockage. Deux usages distincts :
// - `prefs` : préférences de l'appareil (onglet ouvert, filtres, réglages). Toujours locales, jamais synchronisées.
// - `gameStorage` : la partie. C'est le seul point d'accès à remplacer pour passer à un serveur (voir setGameStorage).
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

// --- la partie ---
// Un adaptateur de partie expose : load() -> { version, state } | null ; save({ version, state }) ; clear().
// Les trois méthodes peuvent être synchrones (stockage local) ou renvoyer une promesse (serveur, plus tard).
const GAME_KEY = 'les-portes-save-v1'

export const localGameStorage = {
  load() {
    const raw = local.get(GAME_KEY)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      local.set(GAME_KEY + '-corrupt', raw) // on garde une copie de la sauvegarde illisible avant qu'elle soit écrasée
      return null
    }
  },
  save(payload) {
    local.set(GAME_KEY, JSON.stringify(payload))
  },
  clear() {
    local.remove(GAME_KEY)
  },
}

let current = localGameStorage
export const setGameStorage = (adapter) => {
  current = adapter
}
export const gameStorage = {
  load: () => current.load(),
  save: (payload) => current.save(payload),
  clear: () => current.clear(),
}
