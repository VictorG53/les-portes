import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../auth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const saveRouter = Router()

const upsertSave = (userId, payload) =>
  pool.query(
    `insert into saves (user_id, payload, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set payload = excluded.payload, updated_at = now()`,
    [userId, payload],
  )

saveRouter.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('select payload, updated_at as "updatedAt" from saves where user_id = $1', [
    req.userId,
  ])
  if (!rows[0]) return res.status(404).json({ error: 'Aucune sauvegarde enregistrée' })
  res.json(rows[0])
})

saveRouter.put('/', requireAuth, async (req, res) => {
  const { payload } = req.body ?? {}
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Payload invalide' })
  await upsertSave(req.userId, payload)
  res.json({ ok: true })
})

// pendant de PUT /save pour `navigator.sendBeacon` (fermeture d'onglet) : sendBeacon ne peut pas poser
// d'en-tête Authorization, le jeton voyage donc dans le corps de la requête. Pas de réponse exploitable
// côté client (sendBeacon ne la lit pas) : on vérifie quand même le jeton et la session pour ne jamais
// écrire au nom d'un appareil déconnecté.
saveRouter.post('/beacon', async (req, res) => {
  const { token, payload } = req.body ?? {}
  const claims = typeof token === 'string' && verifyToken(token)
  if (!claims || !payload || typeof payload !== 'object') return res.status(400).end()
  const { rows } = await pool.query('select session_id from users where id = $1', [claims.userId])
  if (!rows[0] || rows[0].session_id !== claims.sessionId) return res.status(401).end()
  await upsertSave(claims.userId, payload)
  res.status(204).end()
})

saveRouter.delete('/', requireAuth, async (req, res) => {
  await pool.query('delete from saves where user_id = $1', [req.userId])
  res.json({ ok: true })
})
