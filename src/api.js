// Petit client pour l'API du classement (voir server/README.md). Ne fait jamais planter l'appelant :
// chaque fonction lève une Error avec un message lisible en cas d'échec, à charge de l'appelant de l'afficher
// (formulaire de connexion) ou de l'ignorer silencieusement (soumission périodique en tâche de fond).
const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, { token, ...opts } = {}) {
  if (!BASE) throw new Error('Classement indisponible pour le moment.')
  let res
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    })
  } catch {
    throw new Error('Impossible de contacter le serveur.')
  }
  let body = null
  try {
    body = await res.json()
  } catch {
    /* réponse vide (ex. 204) */
  }
  if (!res.ok) {
    const err = new Error(body?.error ?? `Erreur serveur (${res.status})`)
    err.status = res.status
    throw err
  }
  return body
}

export const api = {
  register: (email, password, pseudo) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, pseudo }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token) => request('/auth/me', { token }),
  submitScore: (token, payload) =>
    request('/leaderboard/submit', { method: 'POST', token, body: JSON.stringify(payload) }),
  leaderboard: (limit = 100) => request(`/leaderboard?limit=${limit}`),
  myRank: (token) => request('/leaderboard/me', { token }),
  // sauvegarde synchronisée entre appareils (voir server/README.md) : getSave renvoie `null` (pas une
  // erreur) quand le compte n'a encore aucune sauvegarde enregistrée
  getSave: async (token) => {
    try {
      return await request('/save', { token })
    } catch (err) {
      if (err.status === 404) return null
      throw err
    }
  },
  putSave: (token, payload) => request('/save', { method: 'PUT', token, body: JSON.stringify({ payload }) }),
  deleteSave: (token) => request('/save', { method: 'DELETE', token }),
  // fermeture d'onglet : `sendBeacon` part même si la page se ferme dans la foulée (contrairement à un
  // fetch normal, souvent annulé), mais ne peut pas poser d'en-tête -> le jeton voyage dans le corps
  // (voir POST /save/beacon côté serveur). Best-effort : pas de retour possible depuis `pagehide`.
  beaconSave: (token, payload) => {
    if (!BASE || !navigator.sendBeacon) return false
    const blob = new Blob([JSON.stringify({ token, payload })], { type: 'application/json' })
    return navigator.sendBeacon(BASE + '/save/beacon', blob)
  },
}
