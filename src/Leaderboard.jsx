import { useEffect, useState } from 'react'
import { api } from './api'
import { formatNum } from './game'

// onglet Classement : or total gagné, toutes parties confondues (voir server/README.md)
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
          <span className="muted">Or total gagné, toutes parties confondues</span>
        </h2>
        <button className="btn small ghost" onClick={onLogout}>
          {auth.pseudo} · Se déconnecter
        </button>
      </div>

      {mine && (
        <p className="muted board-mine">
          Ta position : <b>#{mine.rank}</b> avec {formatNum(Number(mine.totalGoldEarned))} or
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
            <span>Or gagné</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.pseudo} className={`board-row ${r.pseudo === auth?.pseudo ? 'me' : ''}`}>
              <span>{i + 1}</span>
              <span>{r.pseudo}</span>
              <span>{formatNum(Number(r.totalGoldEarned))}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
