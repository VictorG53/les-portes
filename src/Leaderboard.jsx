import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from './api'

// onglet Classement : clés de prestige gagnées au total, toutes parties confondues (voir server/README.md)
// — ce compteur ne change qu'au prestige, contrairement à l'or qui varie en continu
export default function Leaderboard({ auth, onLogout }) {
  const [rows, setRows] = useState(null) // null = chargement
  const [error, setError] = useState(null)
  const [mine, setMine] = useState(null) // { rank, totalGoldEarned, ... }

  useEffect(() => {
    let cancelled = false
    setError(null)
    api
      .leaderboard()
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e.message))
    api.myRank(auth.token).then((r) => !cancelled && setMine(r)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [auth])

  return (
    <section className="leaderboard">
      <div className="section-head">
        <h2>
          Classement
          <span className="muted">Clés de prestige gagnées au total, toutes parties confondues</span>
        </h2>
        <button className="btn small ghost" onClick={onLogout}>
          {auth.pseudo} · Se déconnecter
        </button>
      </div>

      {mine && (
        <p className="muted board-mine">
          Ta position : <b>#{mine.rank}</b> avec {mine.totalKeys} <KeyRound size={13} strokeWidth={2.25} />
        </p>
      )}

      {error && <div className="muted empty-note">Classement indisponible pour le moment ({error}).</div>}
      {!error && rows === null && <div className="muted empty-note">Chargement…</div>}
      {!error && rows?.length === 0 && <div className="muted empty-note">Personne dans le classement pour l'instant.</div>}

      {!error && rows?.length > 0 && (
        <div className="board">
          <div className="board-row board-head">
            <span>#</span>
            <span>Joueur</span>
            <span>Clés</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.pseudo} className={`board-row ${r.pseudo === auth?.pseudo ? 'me' : ''}`}>
              <span>{i + 1}</span>
              <span>{r.pseudo}</span>
              <span>{r.totalKeys}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
