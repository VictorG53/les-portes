import { verifyToken } from '../auth.js'

// exige un token valide dans "Authorization: Bearer <token>" ; pose req.userId
export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const userId = token && verifyToken(token)
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  req.userId = userId
  next()
}
