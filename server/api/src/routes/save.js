import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const saveRouter = Router()

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
  await pool.query(
    `insert into saves (user_id, payload, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set payload = excluded.payload, updated_at = now()`,
    [req.userId, payload],
  )
  res.json({ ok: true })
})

saveRouter.delete('/', requireAuth, async (req, res) => {
  await pool.query('delete from saves where user_id = $1', [req.userId])
  res.json({ ok: true })
})
