import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const leaderboardRouter = Router()

const MIN_SECONDS_BETWEEN_SUBMITS = 20
// facteur de tolérance : au-delà, un gain est jugé physiquement impossible compte tenu du revenu déclaré
// (couvre largement le rattrapage hors ligne, qui peut légitimement dépasser le revenu affiché en jeu actif)
const IMPLAUSIBLE_GAIN_FACTOR = 5

leaderboardRouter.post('/submit', requireAuth, async (req, res) => {
  const { totalGoldEarned, totalKeys, prestiges, income } = req.body ?? {}
  const newGold = Number(totalGoldEarned)
  const newIncome = Number(income)
  if (
    typeof totalGoldEarned !== 'string' ||
    !Number.isFinite(newGold) ||
    newGold < 0 ||
    !Number.isInteger(totalKeys) ||
    totalKeys < 0 ||
    !Number.isInteger(prestiges) ||
    prestiges < 0 ||
    !Number.isFinite(newIncome) ||
    newIncome < 0
  ) {
    return res.status(400).json({ error: 'Données invalides' })
  }

  const { rows } = await pool.query(
    'select total_gold_earned, total_keys, prestiges, max_income, updated_at, extract(epoch from now() - updated_at) as elapsed from leaderboard_entries where user_id = $1',
    [req.userId],
  )
  const current = rows[0]
  if (!current) return res.status(404).json({ error: 'Profil introuvable' })

  const isFirstSubmission = current.total_gold_earned === '0' && current.total_keys === 0 && current.prestiges === 0
  const elapsed = Number(current.elapsed)

  // anti-spam : une soumission trop rapprochée est ignorée sans erreur (le client ne doit jamais s'en soucier)
  if (!isFirstSubmission && elapsed < MIN_SECONDS_BETWEEN_SUBMITS) {
    return res.json({ ok: true })
  }

  // la progression doit être monotone ; sinon on garde le meilleur score déjà enregistré (pas une erreur,
  // ex. le joueur a effacé sa partie localement)
  const currentGold = Number(current.total_gold_earned)
  if (!isFirstSubmission) {
    if (newGold < currentGold || totalKeys < current.total_keys || prestiges < current.prestiges) {
      return res.json({ ok: true })
    }
    // gain physiquement impossible compte tenu du revenu déclaré et du temps écoulé depuis la dernière soumission
    const maxIncomeKnown = Math.max(newIncome, Number(current.max_income))
    const allowedGain = maxIncomeKnown * Math.max(elapsed, 1) * IMPLAUSIBLE_GAIN_FACTOR
    if (newGold - currentGold > allowedGain) {
      return res.json({ ok: true })
    }
  }

  await pool.query(
    `update leaderboard_entries
     set total_gold_earned = $2, total_keys = $3, prestiges = $4,
         max_income = greatest(max_income, $5), updated_at = now()
     where user_id = $1`,
    [req.userId, totalGoldEarned, totalKeys, prestiges, newIncome],
  )
  res.json({ ok: true })
})

leaderboardRouter.get('/', async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
  const { rows } = await pool.query(
    `select u.pseudo, l.total_gold_earned as "totalGoldEarned", l.total_keys as "totalKeys",
            l.prestiges, l.updated_at as "updatedAt"
     from leaderboard_entries l join users u on u.id = l.user_id
     order by l.total_gold_earned desc
     limit $1`,
    [limit],
  )
  res.json(rows)
})

leaderboardRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `select l.total_gold_earned as "totalGoldEarned", l.total_keys as "totalKeys", l.prestiges,
            (select count(*) + 1 from leaderboard_entries where total_gold_earned > l.total_gold_earned) as rank
     from leaderboard_entries l where l.user_id = $1`,
    [req.userId],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Profil introuvable' })
  res.json({ ...rows[0], rank: Number(rows[0].rank) })
})
