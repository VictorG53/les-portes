import 'express-async-errors' // laisse express-async-errors patcher express : une route async qui rejette tombe dans le middleware d'erreurs ci-dessous, au lieu de rester bloquée sans réponse
import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { saveRouter } from './routes/save.js'
import { migrate } from './migrate.js'

const PORT = process.env.PORT || 3001
// origines autorisées pour les requêtes authentifiées/mutantes (séparées par des virgules) ; la lecture
// publique du classement (GET /leaderboard) n'est de toute façon jamais bloquée par CORS côté navigateur
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const app = express()
app.use(
  cors({
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
  }),
)
app.use(express.json({ limit: '512kb' })) // une grosse collection peut dépasser la limite par défaut (100kb)

app.get('/health', (req, res) => res.json({ ok: true }))
app.use('/auth', authRouter)
app.use('/leaderboard', leaderboardRouter)
app.use('/save', saveRouter)

// gestionnaire d'erreurs générique : ne renvoie jamais la trace au client
app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

await migrate()
app.listen(PORT, () => console.log(`API Les Portes en écoute sur le port ${PORT}`))
