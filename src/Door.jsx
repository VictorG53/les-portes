import { RARITIES, RARITY_ORDER, rarityClass, rarityFill } from './data'
import { adjustedWeights, formatMult, formatNum } from './game'
import DoorArt from './DoorArt'
import Tip, { Text } from './Tip'

// nombre de raretés (les plus hautes) affichées directement sur la ligne ; le détail complet est dans l'infobulle
const TOP_ODDS = 3

// une porte : une ligne compacte (illustration, nom, probabilités, prix, bouton)
export default function Door({
  door, price, luck, discount, scale = 1, shinyChance, gold, count, tour, rowTour,
  opening, disabled, hidden, onOpen,
}) {
  const totalCost = price * count
  const affordable = gold >= totalCost
  const canAfford = price > 0 ? Math.floor(gold / price) : 0 // nombre de portes que l'or permet d'ouvrir
  const weights = adjustedWeights(door, luck)
  const total = weights.reduce((a, b) => a + b, 0)
  const odds = weights
    .map((w, i) => ({ w, id: RARITY_ORDER[i], rarity: RARITIES[RARITY_ORDER[i]] }))
    .filter((o) => o.w > 0)
  const bestOdd = odds[odds.length - 1] // meilleure rareté possible avec cette porte
  const top = odds.slice(-TOP_ODDS).reverse() // les plus hautes d'abord
  const pct = (w) => +((w / total) * 100).toFixed(1)

  // porte lointaine : silhouette « ??? » avec le prix à atteindre
  if (hidden) {
    return (
      <div className="door-row hidden-door" data-tour={rowTour}>
        <div className="door-mini">
          <DoorArt hidden />
        </div>
        <div className="door-name">
          <h3>???</h3>
          <span className="muted">Porte lointaine</span>
        </div>
        <div className="door-odds muted">Probabilités inconnues</div>
        <div className="door-price">
          <span className="cost">🪙 {formatNum(price)}</span>
          <span className="muted">à atteindre</span>
        </div>
        <button className="btn open-btn" disabled>
          🔒 Verrouillée
        </button>
      </div>
    )
  }

  const oddsTip = (
    <div className="tt-item">
      <div className="tt-title">{door.name}</div>
      {odds
        .slice()
        .reverse()
        .map((o) => (
          <div key={o.id} className="tt-odds">
            <i className={rarityFill(o.id)} style={{ background: o.rarity.color }} />
            <span className={rarityClass(o.id)}>{o.rarity.label}</span>
            <b>{pct(o.w)}%</b>
          </div>
        ))}
      <div className="tt-muted">
        Chances de chaque rareté avec cette porte.
        {luck > 0 && ` Ta chance de +${Math.round(luck * 100)} % est déjà comptée.`}
        {` Chaque objet a ${+(shinyChance * 100).toFixed(1)} % de chances d'être shiny (✨ ×1,5).`}
      </div>
    </div>
  )

  return (
    <div className={`door-row ${affordable ? '' : 'poor'}`} data-tour={rowTour}>
      <button
        className="door-mini"
        disabled={disabled || !affordable}
        onClick={onOpen}
        aria-label={`Ouvrir ${door.name}`}
      >
        <DoorArt id={door.id} opening={opening} />
      </button>

      <div className="door-name">
        <h3>{door.name}</h3>
        <span className="muted">
          Jusqu'à{' '}
          <b className={rarityClass(bestOdd.id)} style={{ color: bestOdd.rarity.color }}>
            {bestOdd.rarity.label}
          </b>
        </span>
      </div>

      <Tip content={oddsTip}>
        <div className="door-odds">
          <div className="bar">
            {odds.map((o) => (
              <i
                key={o.id}
                className={rarityFill(o.id)}
                style={{ width: `${(o.w / total) * 100}%`, background: o.rarity.color }}
              />
            ))}
          </div>
          <div className="odds-top">
            {top.map((o) => (
              <span key={o.id}>
                <i className={rarityFill(o.id)} style={{ background: o.rarity.color }} />
                <span className={rarityClass(o.id)}>{o.rarity.label}</span> <b>{pct(o.w)}%</b>
              </span>
            ))}
          </div>
        </div>
      </Tip>

      <Tip
        content={
          <Text title="Prix">
            {scale > 1.01 && `Ce prix suit ta puissance permanente (×${formatMult(scale)}). `}
            {discount > 0
              ? `Prix de base : ${formatNum(door.cost)} or, réduit de ${Math.round(discount * 100)} %.`
              : `Prix d'une ouverture : ${formatNum(price)} or.`}
            {count > 1 && ` Total pour ${count} portes : ${formatNum(totalCost)} or.`}
          </Text>
        }
      >
        <div className="door-price">
          <span className="muted">
            {canAfford >= 1 ? `Tu peux en ouvrir ${formatNum(Math.min(canAfford, 1e15))}` : 'Trop cher pour l’instant'}
          </span>
        </div>
      </Tip>

      <Tip
        wrap
        content={
          !affordable ? <Text title="Pas assez d'or">Il te manque {formatNum(totalCost - gold)} or.</Text> : null
        }
      >
        <button className="btn open-btn" data-tour={tour} disabled={disabled || !affordable} onClick={onOpen}>
          {count > 1 ? `Ouvrir ×${count}` : 'Ouvrir'} <span className="btn-price">🪙 {formatNum(totalCost)}</span>
        </button>
      </Tip>
    </div>
  )
}
