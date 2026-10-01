import { KeyRound } from 'lucide-react'
import { ACHIEVEMENTS } from './achievements'
import { DOORS, ITEMS, PRESTIGE_BASE, QUANTITIES, RARITIES, RARITY_ORDER, UPGRADE_STEP, keyMultiplier, prestigeGain, prestigeNextAt, rarityClass, rarityFill, starsText } from './data'
import { charmSlotCost, doorPrice, formatMult, formatNum, maxCharmSlots, maxSlots, slotCost, upLevel } from './game'

const int = (n) => Math.round(n).toLocaleString('fr-FR')

function duration(sec) {
  sec = Math.max(0, Math.round(sec))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} j ${h} h`
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`
  if (m > 0) return `${m} min`
  return `${sec} s`
}

function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      {sub && <span className="muted">{sub}</span>}
    </div>
  )
}

function Card({ title, note, wide, children }) {
  return (
    <section className={`stat-card ${wide ? 'wide' : ''}`}>
      <h3>{title}</h3>
      {note && <p className="muted">{note}</p>}
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="stat-row">
      <span className="muted">{label}</span>
      <b>{value}</b>
    </div>
  )
}

// barres horizontales ; la plus longue prend toute la largeur
function Bars({ rows, labelWidth = 92 }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.key} className="bar-row" style={{ gridTemplateColumns: `${labelWidth}px 1fr 64px` }}>
          <span className={`bar-label ${r.textClass ?? ''}`}>{r.label}</span>
          <div className="bar-track">
            <i className={r.fillClass ?? ''} style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
          <b className={r.textClass ?? ''}>{int(r.value)}</b>
        </div>
      ))}
    </div>
  )
}

// courbe du revenu par seconde : un point toutes les 10 minutes environ (échelle logarithmique, le revenu explose vite)
function IncomeChart({ log }) {
  if (log.length < 2) return <div className="muted empty-note">La courbe se remplit au fil du jeu (un point toutes les 10 minutes).</div>
  const W = 320
  const H = 90
  const ys = log.map(([, v]) => Math.log10(Math.max(1, v)))
  const lo = Math.min(...ys)
  const hi = Math.max(...ys, lo + 0.5)
  const t0 = log[0][0]
  const t1 = log[log.length - 1][0]
  const pts = log.map(([t], i) => `${((t - t0) / Math.max(1, t1 - t0)) * W},${H - 4 - ((ys[i] - lo) / (hi - lo)) * (H - 10)}`)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe du revenu par seconde" preserveAspectRatio="none">
        <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-axis muted">
        <span>{formatNum(log[0][1])}/s</span>
        <span>{duration((t1 - t0) / 1000)}</span>
        <span>{formatNum(log[log.length - 1][1])}/s</span>
      </div>
    </div>
  )
}

export default function Stats({ state, income, bonus }) {
  const st = state.stats
  const lifetimeEarned = st.earnedBefore + state.runEarned + st.offlineGold
  const codexCount = Object.keys(state.codex).length
  const forgeTotal = st.forgeOk + st.forgeFail
  const doorRows = DOORS.map((d) => ({ key: d.id, label: d.name, value: st.doorOpens[d.id] ?? 0, color: 'var(--accent)' }))
  const batchRows = QUANTITIES.map((q) => ({ key: q, label: q === 1 ? 'Une porte' : `Par ${q}`, value: st.batchOpens[q] ?? 0, color: 'var(--gold)' }))
  const rarityRows = RARITY_ORDER.map((r) => ({
    key: r,
    label: RARITIES[r].label,
    value: st.byRarity[r] ?? 0,
    color: RARITIES[r].color,
    fillClass: rarityFill(r),
    textClass: rarityClass(r),
  }))
  const totalItems = rarityRows.reduce((s, r) => s + r.value, 0)
  const fortune = 1 + upLevel(state, 'income') * UPGRADE_STEP.income
  const keysMult = keyMultiplier(state.totalKeys)
  const bestDoor = DOORS[st.maxDoor]

  // temps estimé avant les prochains objectifs, au revenu actuel (l'or déjà en poche compte)
  const eta = (cost) => (state.gold >= cost ? 'maintenant' : income > 0 ? duration((cost - state.gold) / income) : '—')
  const goals = []
  const nextDoor = DOORS[(st.maxSeenDoor ?? 0) + 1] // première porte qu'on n'a jamais pu s'offrir
  if (nextDoor) goals.push([`Porte suivante · ${nextDoor.name}`, doorPrice(nextDoor, bonus.discount, bonus.permanent)])
  const gainNow = prestigeGain(state.runEarned)
  goals.push([`Prochaine clé de prestige (${gainNow + 1}e de la partie)`, null, (gainNow < 1 ? PRESTIGE_BASE : prestigeNextAt(gainNow)) - state.runEarned])
  if (state.slots < maxSlots(state)) goals.push(['Emplacement de sac', slotCost(state.slots)])
  if (state.charmSlots < maxCharmSlots(state)) goals.push(['Emplacement de talisman', charmSlotCost(state.charmSlots)])

  return (
    <section className="stats-page">
      <div className="section-head">
        <h2>
          Statistiques
          <span className="muted">Toutes parties confondues. Certains compteurs ne démarrent qu'à leur ajout dans le jeu.</span>
        </h2>
      </div>

      <div className="kpis">
        <Kpi label="Temps de jeu" value={duration(st.playSeconds)} sub={st.awaySeconds > 0 ? `+ ${duration(st.awaySeconds)} d'absence` : null} />
        <Kpi label="Or gagné" value={formatNum(lifetimeEarned)} sub={`+${formatNum(income)}/s actuellement`} />
        <Kpi label="Portes ouvertes" value={int(state.opened)} sub={totalItems > 0 ? `${int(totalItems)} suivies en détail` : null} />
        <Kpi label="Objets découverts" value={`${codexCount}/${ITEMS.length}`} sub={`${Object.keys(state.codexShiny).length} en shiny`} />
        <Kpi label="Prestiges" value={int(state.prestiges)} sub={`${int(state.totalKeys)} clé${state.totalKeys > 1 ? 's' : ''} gagnée${state.totalKeys > 1 ? 's' : ''}`} />
        <Kpi label="Succès" value={`${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}`} sub={`+${Math.round(bonus.achievements * 100)} % de revenu`} />
      </div>

      <div className="stat-grid">
        <Card title="Portes ouvertes par type">
          <Bars rows={doorRows} labelWidth={124} />
        </Card>

        <Card title="Lots d'ouverture" note="Nombre d'ouvertures faites, selon le lot choisi (une ouverture ×10 compte pour 1).">
          <Bars rows={batchRows} />
        </Card>

        <Card title="Objets obtenus par rareté" note={st.shinies > 0 ? `dont ${int(st.shinies)} shiny` : null}>
          <Bars rows={rarityRows} />
        </Card>

        <Card title="Revenu au fil du temps" note="Revenu par seconde, échelle logarithmique.">
          <IncomeChart log={st.incomeLog ?? []} />
        </Card>

        <Card title="Prochains objectifs" note="Au revenu actuel, sans compter les nouveaux objets que tu obtiendras.">
          {goals.map(([label, cost, remaining]) => (
            <Row key={label} label={label} value={cost !== null ? eta(cost) : income > 0 ? duration(Math.max(0, remaining) / income) : '—'} />
          ))}
        </Card>

        <Card title="Records">
          <Row label="Meilleure rareté" value={state.bestRarity >= 0 ? RARITIES[RARITY_ORDER[state.bestRarity]].label : '—'} />
          <Row label="Niveau de fusion le plus haut" value={starsText(st.maxTier)} />
          <Row label="Meilleure amélioration (forge)" value={st.maxEnhance > 0 ? `+${st.maxEnhance}` : '—'} />
          <Row label="Plus gros lot ouvert" value={st.maxBatch > 0 ? `×${st.maxBatch}` : '—'} />
          <Row label="Porte la plus chère ouverte" value={bestDoor ? bestDoor.name : '—'} />
          <Row label="Revenu maximal" value={`${formatNum(st.maxIncome)}/s`} />
        </Card>

        <Card title="Fusion et forge">
          <Row label="Fusions réalisées" value={int(st.fusions)} />
          <Row label="Améliorations réussies" value={int(st.forgeOk)} />
          <Row label="Améliorations ratées" value={int(st.forgeFail)} />
          <Row label="Taux de réussite" value={forgeTotal > 0 ? `${Math.round((st.forgeOk / forgeTotal) * 100)} %` : '—'} />
        </Card>

        <Card title="Hors ligne">
          <Row label="Temps total d'absence" value={duration(st.awaySeconds)} />
          <Row label="Plus longue absence" value={duration(st.maxAway)} />
          <Row label="Or gagné hors ligne" value={formatNum(st.offlineGold)} />
        </Card>

        <Card title="Puissance permanente" note="Multiplie ton revenu pour toujours, prestige après prestige.">
          <Row label="Fortune (amélioration)" value={`×${formatMult(fortune)}`} />
          <Row label={`Clés (${int(state.totalKeys)})`} value={`×${formatMult(keysMult)}`} />
          <Row label="Succès" value={`×${formatMult(1 + bonus.achievements)}`} />
          <Row label="Total" value={`×${formatMult(bonus.permanent)}`} />
        </Card>

        <Card title="Historique des parties" wide>
          <div className="runs">
            <div className="run-row run-head">
              <span>Partie</span>
              <span>Durée de jeu</span>
              <span>Or gagné</span>
              <span>Clés</span>
            </div>
            <div className="run-row current">
              <span>En cours</span>
              <span>{duration(state.runSeconds)}</span>
              <span>{formatNum(state.runEarned)}</span>
              <span className="muted">—</span>
            </div>
            {[...st.runs].reverse().map((r, i) => (
              <div key={i} className="run-row">
                <span>Prestige n°{st.runs.length - i + Math.max(0, state.prestiges - st.runs.length)}</span>
                <span>{duration(r.seconds)}</span>
                <span>{formatNum(r.earned)}</span>
                <span>+{r.keys} <KeyRound size={13} strokeWidth={2.25} /></span>
              </div>
            ))}
            {st.runs.length === 0 && <div className="muted empty-note">Aucun prestige terminé pour l'instant.</div>}
          </div>
        </Card>
      </div>
    </section>
  )
}
