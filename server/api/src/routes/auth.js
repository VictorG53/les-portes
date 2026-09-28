import { Router } from 'express'
import { pool } from '../db.js'
import { hashPassword, signToken, verifyPassword } from '../auth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PSEUDO_RE = /^[a-zA-Z0-9_ -]{3,20}$/

authRouter.post('/register', async (req, res) => {
  const { email, password, pseudo } = req.body ?? {}
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' })
  }
  if (typeof pseudo !== 'string' || !PSEUDO_RE.test(pseudo)) {
    return res.status(400).json({ error: 'Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, espaces, - ou _)' })
  }

  const passwordHash = await hashPassword(password)
  try {
    const { rows } = await pool.query(
      `insert into users (email, password_hash, pseudo) values (lower($1), $2, $3) returning id`,
      [email, passwordHash, pseudo],
    )
    const userId = rows[0].id
    await pool.query('insert into leaderboard_entries (user_id) values ($1)', [userId])
    res.json({ token: signToken(userId), pseudo })
  } catch (err) {
    if (err.code === '23505') {
      // contrainte unique violée : email ou pseudo déjà pris
      const field = err.constraint?.includes('email') ? 'email' : 'pseudo'
      return res
        .status(409)
        .json({ error: field === 'email' ? 'Cette adresse email est déjà utilisée' : 'Ce pseudo est déjà pris' })
    }
    throw err
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }
  const { rows } = await pool.query('select id, password_hash, pseudo from users where email = lower($1)', [email])
  const user = rows[0]
  const ok = user && (await verifyPassword(password, user.password_hash))
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
  res.json({ token: signToken(user.id), pseudo: user.pseudo })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('select id, email, pseudo from users where id = $1', [req.userId])
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' })
  res.json(rows[0])
})
