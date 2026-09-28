import { pool } from '../db.js'
import { verifyToken } from '../auth.js'

// exige un token valide dans "Authorization: Bearer <token>" ; pose req.userId. Vérifie aussi que la
// session du jeton est toujours l'unique session active du compte (voir users.session_id) : un jeton
// d'un appareil sur lequel on s'est connecté ailleurs depuis renvoie 401 pour que le client se déconnecte.
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const claims = token && verifyToken(token)
  if (!claims) return res.status(401).json({ error: 'Non authentifié' })
  const { rows } = await pool.query('select session_id from users where id = $1', [claims.userId])
  if (!rows[0] || rows[0].session_id !== claims.sessionId) {
    return res.status(401).json({ error: 'Session invalidée : connecté depuis un autre appareil', code: 'SESSION_REVOKED' })
  }
  req.userId = claims.userId
  next()
}
