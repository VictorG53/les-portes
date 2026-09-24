import { useEffect } from 'react'
import { motion } from 'framer-motion'

// fenêtre de confirmation au style de l'app (remplace window.confirm)
export default function Confirm({ title, children, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="reveal confirm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ '--c': danger ? 'var(--danger)' : 'var(--accent)' }}
        initial={{ scale: 0.85, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reveal-title">{title}</div>
        {children}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onCancel}>
            Annuler
          </button>
          <button className={`btn ${danger ? 'danger' : ''}`} autoFocus onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
