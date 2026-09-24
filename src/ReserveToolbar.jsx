import { useState } from 'react'
import { DEFAULT_VIEW, KINDS, RARITY_FILTERS, SORTS, STATUSES, VARIANTS, isFiltered } from './reserveView'

function Select({ label, value, options, onChange }) {
  return (
    <select className="select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

// barre de recherche, de filtres et de tri de la réserve.
// Sur téléphone, les filtres se replient derrière un bouton « Filtres » (la recherche et le tri restent visibles).
export default function ReserveToolbar({ view, setView, shown, total }) {
  const [open, setOpen] = useState(false)
  const set = (patch) => setView((v) => ({ ...v, ...patch }))
  const filtered = isFiltered(view)
  const activeCount = ['rarity', 'kind', 'variant', 'status'].filter((k) => view[k] !== DEFAULT_VIEW[k]).length

  return (
    <div className="filters">
      <input
        className="input"
        type="search"
        placeholder="Rechercher un objet…"
        aria-label="Rechercher un objet"
        value={view.q}
        onChange={(e) => set({ q: e.target.value })}
      />
      <button
        className={`btn small ghost filters-toggle ${activeCount > 0 ? 'has-active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Filtres{activeCount > 0 ? ` (${activeCount})` : ''} {open ? '▴' : '▾'}
      </button>
      <div className={`filters-extra ${open ? 'open' : ''}`}>
        <Select label="Rareté" value={view.rarity} options={RARITY_FILTERS} onChange={(rarity) => set({ rarity })} />
        <Select label="Type" value={view.kind} options={KINDS} onChange={(kind) => set({ kind })} />
        <Select label="Variante" value={view.variant} options={VARIANTS} onChange={(variant) => set({ variant })} />
        <Select label="État" value={view.status} options={STATUSES} onChange={(status) => set({ status })} />
        <label className="switch">
          <input type="checkbox" checked={view.showLocked} onChange={(e) => set({ showLocked: e.target.checked })} />
          <span className="track" />
          Non découverts
        </label>
      </div>
      <Select label="Trier par" value={view.sort} options={SORTS} onChange={(sort) => set({ sort })} />
      <span className="muted filters-count">
        {shown}/{total} affiché{shown > 1 ? 's' : ''}
      </span>
      {filtered && (
        <button className="link" onClick={() => setView({ ...DEFAULT_VIEW, showLocked: view.showLocked })}>
          Réinitialiser
        </button>
      )}
    </div>
  )
}
