import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const SCHEMA = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'init.sql'), 'utf8')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// applique le schéma (idempotent) au démarrage ; réessaie tant que Postgres n'est pas encore prêt
// (pas d'ordonnancement garanti entre les conteneurs en production, voir .github/workflows/deploy.yml)
export async function migrate(retries = 20, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(SCHEMA)
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.log(`En attente de la base de données (tentative ${attempt}/${retries})…`, err.message)
      await sleep(delayMs)
    }
  }
}
