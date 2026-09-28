import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from './api'

// modale de connexion / inscription. `mandatory` : impossible à fermer, un compte est requis pour jouer.
// `checking` : identifiants acceptés, réconciliation de la sauvegarde avec le serveur en cours (voir App.jsx).
// `revoked`/`onReclaim` : ce compte a été déconnecté ici par une connexion sur un autre appareil (une
// seule session à la fois, voir requireAuth côté serveur) — reprendre la main ne demande pas le mot de
// passe (le jeton, bien qu'invalide pour jouer, prouve déjà qui en est propriétaire).
export default function Auth({ onClose, onAuth, mandatory = false, checking = false, revoked = null, onReclaim }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [useOther, setUseOther] = useState(false) // masque le raccourci de reprise, pour se connecter à un autre compte

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res =
        mode === 'login' ? await api.login(email, password) : await api.register(email, password, pseudo)
      onAuth({ token: res.token, pseudo: res.pseudo })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reclaim = async () => {
    setError(null)
    setBusy(true)
    try {
      await onReclaim()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const showReclaim = revoked && !useOther && !checking

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={mandatory ? undefined : onClose}
    >
      <motion.div
        className="reveal auth"
        role="dialog"
        aria-modal="true"
        aria-label="Compte"
        style={{ '--c': 'var(--accent)' }}
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reveal-title">
          {checking ? 'Un instant…' : showReclaim ? 'Session ouverte ailleurs' : mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </div>
        <p className="muted">
          {checking
            ? 'Récupération de ta progression…'
            : showReclaim
              ? `Tu t'es connecté ailleurs avec « ${revoked.pseudo} », ce qui a fermé la session sur cet appareil. Tu peux reprendre la main ici sans ressaisir ton mot de passe.`
              : mandatory
                ? 'Un compte est nécessaire pour jouer : ta progression est sauvegardée et retrouvable sur tous tes appareils.'
                : "Un compte permet d'apparaître dans le classement des joueurs et de retrouver ta partie sur un autre appareil."}
        </p>

        {checking && <div className="auth-checking" aria-hidden="true" />}

        {showReclaim && (
          <div className="confirm-actions">
            <button type="button" className="btn ghost" disabled={busy} onClick={() => setUseOther(true)}>
              Utiliser un autre compte
            </button>
            <button type="button" className="btn" disabled={busy} onClick={reclaim}>
              {busy ? 'Un instant…' : 'Reprendre la main'}
            </button>
          </div>
        )}
        {showReclaim && error && <div className="auth-error">{error}</div>}

        {!checking && !showReclaim && (
        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              className="input auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Mot de passe
            <input
              className="input auth-input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mode === 'register' && (
            <label>
              Pseudo <span className="muted">(affiché dans le classement)</span>
              <input
                className="input auth-input"
                type="text"
                autoComplete="nickname"
                minLength={3}
                maxLength={20}
                required
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
              />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <div className="confirm-actions">
            {!mandatory && (
              <button type="button" className="btn ghost" disabled={busy} onClick={onClose}>
                Fermer
              </button>
            )}
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Un instant…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </div>
        </form>
        )}

        {!checking && !showReclaim && (
        <button
          type="button"
          className="link auth-switch"
          onClick={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'))
            setError(null)
          }}
        >
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
        )}
      </motion.div>
    </motion.div>
  )
}
