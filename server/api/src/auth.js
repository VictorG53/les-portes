import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET manquant (voir .env)')

const BCRYPT_COST = 12
const TOKEN_TTL = '365d' // pas de rafraîchissement de token pour l'instant : longue durée de vie

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

export const signToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL })

// renvoie l'id utilisateur si le token est valide, sinon null (ne lève jamais)
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET).sub
  } catch {
    return null
  }
}
