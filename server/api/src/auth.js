import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET manquant (voir .env)')

const BCRYPT_COST = 12
const TOKEN_TTL = '365d' // pas de rafraîchissement de token pour l'instant : longue durée de vie

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

// `sid` identifie la session (voir users.session_id) : un seul appareil connecté à la fois, une nouvelle
// connexion régénère cet id côté base et invalide donc tous les jetons signés avec l'ancien.
export const signToken = (userId, sessionId) => jwt.sign({ sub: userId, sid: sessionId }, JWT_SECRET, { expiresIn: TOKEN_TTL })

// renvoie { userId, sessionId } si le token est valide (structurellement), sinon null (ne lève jamais)
export function verifyToken(token) {
  try {
    const { sub, sid } = jwt.verify(token, JWT_SECRET)
    return sub && sid ? { userId: sub, sessionId: sid } : null
  } catch {
    return null
  }
}
