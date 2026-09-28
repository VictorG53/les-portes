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
  if (!res.ok) throw new Error(body?.error ?? `Erreur serveur (${res.status})`)
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
}
