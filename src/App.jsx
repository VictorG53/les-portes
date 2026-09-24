import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import {
  DOORS,
  ENHANCE_RATES,
  ITEMS,
  MAX_ENHANCE,
  QUANTITIES,
  MAX_TIER,
  RARITIES,
  PRESTIGE_BASE,
  SHINY_CHANCE,
  TIER_MULT,
  UPGRADES,
  abilityShort,
  abilityText,
  itemIncome,
  itemSell,
  keyOf,
  keyMultiplier,
  parseKey,
  prestigeGain,
  rarityClass,
  prestigeNextAt,
  starsText,
} from './data'
import {
  bagOf,
  charmSlotCost,
  collectionValue,
  computeStats,
  doorPrice,
  doorScale,
  equippedCount,
  formatMult,
  formatNum,
  fuseCount,
  isCharm,
  maxBatch,
  maxCharmSlots,
  maxSlots,
  slotCost,
  startCharmSlots,
  startGold,
  startSlots,
  upLevel,
  useGame,
} from './game'
import Door from './Door'
import Reveal from './Reveal'
import Welcome from './Welcome'
import Confirm from './Confirm'
import Forge from './Forge'
import Logo from './Logo'
import Stats from './Stats'
import Tutorial from './Tutorial'
import ReserveToolbar from './ReserveToolbar'
import { TABS, loadTab, saveTab } from './tabs'
import { applyView, loadView, saveView } from './reserveView'
import Toasts from './Toasts'
import { ACHIEVEMENTS } from './achievements'
import Tip, { ItemTip, Text } from './Tip'
import { play } from './sound'
import Settings from './Settings'
import { applySettings, loadSettings, saveSettings } from './settings'
import { clearGame, loadGame, saveGame } from './save'


export default function App() {
  const { state: liveState, welcome, closeWelcome, toasts, dismissToast, openDoor, equip, unequip, fuse, setAutoFuse, autoEquip, buySlot, buyCharmSlot, enhance, sellDuplicates, prestige, setTutorial, buyUpgrade, reset } =
    useGame({ load: loadGame, save: saveGame, clear: clearGame })
  const [reveal, setReveal] = useState(null) // liste de { item, isNew }
  // Photo de la partie prise juste avant l'ouverture d'une porte : l'affichage (objets, sacs, collection, bonus...)
  // reste figé dessus tant que l'écran de résultat est ouvert, pour ne pas dévoiler le tirage en arrière-plan.
  const [frozen, setFrozen] = useState(null)
  const state = frozen ? { ...frozen, gold: liveState.gold } : liveState
  const [qtyRaw, setQty] = useState(1)
  const batchMax = maxBatch(liveState)
  const qty = Math.min(qtyRaw, batchMax) // si le lot choisi n'est plus autorisé, on retombe sur le plus grand permis
  const [forgeKey, setForgeKey] = useState(null) // pile ouverte dans la forge
  const [view, setView] = useState(loadView)
  const [tab, setTabState] = useState(loadTab)
  const setTab = (t) => {
    setTabState(t)
    saveTab(t)
    window.scrollTo({ top: 0 })
  } // filtres et tri de la réserve (mémorisés)
  useEffect(() => saveView(view), [view])
  const [confirm, setConfirm] = useState(null) // 'prestige' | 'reset'
  const [settings, setSettings] = useState(loadSettings) // réglages de l'appareil
  const [showSettings, setShowSettings] = useState(false)
  const muted = settings.muted
  const patchSettings = (patch) => setSettings((s) => ({ ...s, ...patch }))
  useEffect(() => {
    applySettings(settings)
    saveSettings(settings)
  }, [settings])
  const [opening, setOpening] = useState(null) // id de la porte en cours d'ouverture

  const { income, bonus } = computeStats(state)
  const used = equippedCount(state.equipped)
  const charmsUsed = equippedCount(state.charms)
  const nextCharmCost = charmSlotCost(state.charmSlots)
  const charmsList = Object.entries(state.charms)
    .flatMap(([key, n]) => Array(n).fill(parseKey(key)))
    .sort((x, y) => itemIncome(y.item, y.tier, y.shiny, y.level) - itemIncome(x.item, x.tier, x.shiny, x.level))
  const nextSlotCost = slotCost(state.slots)
  const equippedList = Object.entries(state.equipped)
    .flatMap(([key, n]) => Array(n).fill(parseKey(key)))
    .sort((x, y) => itemIncome(y.item, y.tier, y.shiny, y.level) - itemIncome(x.item, x.tier, x.shiny, x.level))
  // or obtenu en vendant les doublons (on garde toujours les équipés et 1 exemplaire de chaque pile)
  const dupValue = Object.entries(state.inventory).reduce((sum, [key, n]) => {
    const keep = Math.max(1, bagOf(state, key)[key] ?? 0)
    const { item, tier, shiny } = parseKey(key)
    return sum + (n - keep) * itemSell(item, tier, shiny)
  }, 0)
  const fc = fuseCount(state)
  const achDone = ACHIEVEMENTS.filter((a) => state.achievements[a.id])
  const achGroups = [...new Set(ACHIEVEMENTS.map((a) => a.group))]
  const owned = Object.keys(state.codex).length
  const shinyOwned = Object.keys(state.codexShiny).length
  const slotCap = maxSlots(state)
  const charmCap = maxCharmSlots(state)
  const gain = prestigeGain(state.runEarned)
  const nextAt = gain < 1 ? PRESTIGE_BASE : prestigeNextAt(gain)
  const keysMult = formatMult(keyMultiplier(state.totalKeys))

  // une carte par (objet, niveau) possédé, ou une carte verrouillée si jamais découvert
  const cards = ITEMS.flatMap((item) => {
    const owned = [false, true].flatMap((shiny) =>
      Array.from({ length: MAX_TIER }, (_, i) => i + 1).flatMap((tier) =>
        Array.from({ length: MAX_ENHANCE + 1 }, (_, level) => keyOf(item.id, tier, shiny, level)).filter(
          (k) => state.inventory[k],
        ),
      ),
    )
    if (owned.length) return owned.map((key) => ({ key }))
    return [{ locked: !state.codex[item.id], seen: !!state.codex[item.id], item }]
  })

  // une tuile du sac d'or (charm = false) ou des talismans (charm = true)
  const renderSlot = (entry, i, charm) => {
    if (!entry)
      return (
        <Tip
          key={i}
          content={
            <Text title="Emplacement vide">
              {charm
                ? "Clique sur un objet à capacité de la réserve pour l'équiper ici."
                : "Clique sur un objet de la réserve pour l'équiper ici."}
            </Text>
          }
        >
          <div className="slot empty" aria-label="Emplacement vide">
            +
          </div>
        </Tip>
      )
    const { item, tier, key, shiny, level } = entry
    const r = RARITIES[item.rarity]
    return (
      <Tip
        key={i}
        content={<ItemTip item={item} tier={tier} shiny={shiny} level={level} hint={charm ? 'Cliquer pour retirer des talismans' : 'Cliquer pour retirer du sac'} />}
      >
        <button
          className={`slot ${shiny ? 'shiny' : ''}`}
          style={{ '--c': r.color }}
          onClick={() => {
            unequip(key)
            play('unequip')
          }}
        >
          {tier > 1 && <span className="stars">{starsText(tier)}</span>}
          {shiny && <span className="shiny-dot">✨</span>}
          {level > 0 && <span className="lvl-dot">+{level}</span>}
          <span className="emoji">{item.emoji}</span>
          {charm ? (
            <small className="slot-effect">{abilityShort(item, tier, shiny, level)}</small>
          ) : (
            <small>+{formatNum(itemIncome(item, tier, shiny, level))}/s</small>
          )}
        </button>
      </Tip>
    )
  }

  const shownCards = applyView(cards, state, view, fc)

  // notifications masquées dans les réglages : on les vide pour qu'elles ne s'accumulent pas
  useEffect(() => {
    if (!settings.toasts && toasts.length > 0) toasts.forEach((t) => dismissToast(t.key))
  })
  // pastilles : objets prêts à fusionner (si la fusion n'est pas automatique), clés à gagner au prestige, succès obtenus
  const fusableCount = state.autoFuse
    ? 0
    : Object.keys(state.inventory).filter((k) => {
        const p = parseKey(k)
        return state.inventory[k] >= fc && p.tier < MAX_TIER && p.level === 0
      }).length
  const tabBadges = {
    collection: fusableCount > 0 ? `${fusableCount}` : null,
    prestige: gain >= 1 ? `+${gain}` : null,
  }

  // porte lointaine : au-delà de la porte suivante la plus chère déjà ouverte, et hors de portée
  const isHidden = (door, i) =>
    i > (state.stats.maxDoor ?? 0) + 1 && state.gold < doorPrice(door, bonus.discount, bonus.permanent)
  // la porte la plus chère qu'on peut payer avec le lot choisi
  const bestDoor = [...DOORS].reverse().find((door) => {
    const price = doorPrice(door, bonus.discount, bonus.permanent)
    return state.gold >= price * qty
  })

  const onOpen = (door) => {
    if (opening || reveal) return
    const results = openDoor(door.id, qty)
    if (!results) return
    setFrozen(liveState)
    setOpening(door.id)
    play('open')
    setTimeout(() => {
      setReveal(results)
      setOpening(null)
    }, 1100)
  }

  // les animations JavaScript (porte qui s'ouvre, fenêtres, notifications) suivent le même réglage que le CSS
  const motionMode = { auto: 'user', reduce: 'always', full: 'never' }[settings.motion]
  return (
    <MotionConfig reducedMotion={motionMode}>
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand">
            <Logo className="brand-mark" size={36} />
            <span className="brand-name">
              <span className="brand-thin">Les</span> Portes
            </span>
          </h1>

          <nav className="tabs" aria-label="Sections du jeu">
            {TABS.map((t) => {
              const badge = tabBadges[t.id]
              return (
                <button
                  key={t.id}
                  data-tour={`tab-${t.id}`}
                  className={`tab ${tab === t.id ? 'active' : ''}`}
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => {
                    setTab(t.id)
                    play('qty')
                  }}
                >
                  <span className="tab-icon">{t.icon}</span>
                  <span className="tab-label">{t.label}</span>
                  {badge && <span className="tab-badge">{badge}</span>}
                </button>
              )
            })}
          </nav>

          <div className="topbar-right">
            <div className="stats">
              <Tip content={<Text title="Or">Ton revenu vient des objets équipés dans le sac.</Text>}>
                <div className="stat gold" data-tour="gold">
                  <span>Or</span>
                  <b>{formatNum(state.gold)}</b>
                  <small>+{formatNum(income)}/s</small>
                </div>
              </Tip>
              {state.totalKeys > 0 && (
                <Tip content={<Text title="Clés">Clés à dépenser dans le Portail éternel. Chaque clé gagnée augmente ton revenu pour toujours (actuellement ×{keysMult}).</Text>}>
                  <div className="stat">
                    <span>Clés</span>
                    <b>🗝️ {state.keys}</b>
                  </div>
                </Tip>
              )}
              <Tip content={<Text title="Collection">Objets différents découverts sur {ITEMS.length}. Fusionner ne fait pas perdre une découverte.</Text>}>
                <div className="stat secondary">
                  <span>Collection</span>
                  <b>
                    {owned}/{ITEMS.length}
                  </b>
                </div>
              </Tip>
            </div>
            <Tip content={<Text>{muted ? 'Activer le son' : 'Couper le son'}</Text>}>
              <button
                className="mute"
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
                onClick={() => {
                  patchSettings({ muted: !muted })
                  if (muted) setTimeout(() => play('click'), 60) // le son est réactivé après le rendu
                }}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </Tip>
            <Tip content={<Text>Réglages</Text>}>
              <button className="mute" aria-label="Réglages" onClick={() => setShowSettings(true)}>
                ⚙️
              </button>
            </Tip>
          </div>
        </div>
      </header>

      <main>
        {tab === 'play' && (
          <div className="play">
            <div className="play-main">
        <section>
          <div className="section-head">
            <h2>Portes</h2>
            <div className="row">
            <Tip
              wrap
              content={
                <Text title="Meilleure porte">
                  {bestDoor
                    ? `Ouvre ${qty > 1 ? `${qty} fois ` : ''}${bestDoor.name}, la porte la plus chère que tu peux payer.`
                    : 'Aucune porte n’est abordable pour le moment.'}
                </Text>
              }
            >
              <button className="btn small" disabled={!bestDoor || !!opening || !!reveal} onClick={() => bestDoor && onOpen(bestDoor)}>
                ⚡ Ouvrir la meilleure porte{qty > 1 ? ` ×${qty}` : ''}
              </button>
            </Tip>
            <Tip content={<Text title="Quantité">Nombre de portes ouvertes d'un coup. Le prix est multiplié d'autant.</Text>}>
            <div className="seg">
              {QUANTITIES.map((q) =>
                q > batchMax ? (
                  <Tip
                    key={q}
                    wrap
                    content={
                      <Text title={`×${q} verrouillé`}>
                        Débloque les grosses ouvertures avec l'amélioration « Grosses ouvertures » du Portail éternel (clés de prestige).
                      </Text>
                    }
                  >
                    <button className="locked-qty" disabled>
                      🔒 ×{q}
                    </button>
                  </Tip>
                ) : (
                  <button
                    key={q}
                    className={qty === q ? 'active' : ''}
                    onClick={() => {
                      setQty(q)
                      play('qty')
                    }}
                  >
                    ×{q}
                  </button>
                ),
              )}
            </div>
            </Tip>
            </div>
          </div>
          <div className="doors" data-tour="doors">
            {DOORS.map((door, i) => (
              <Door
                key={door.id}
                door={door}
                hidden={isHidden(door, i)}
                tour={i === 0 ? 'first-open' : undefined}
                gold={state.gold}
                count={qty}
                price={doorPrice(door, bonus.discount, bonus.permanent)}
                scale={doorScale(door, bonus.permanent)}
                luck={bonus.luck}
                discount={bonus.discount}
                shinyChance={SHINY_CHANCE + bonus.shiny}
                opening={opening === door.id}
                disabled={!!opening || !!reveal}
                onOpen={() => onOpen(door)}
              />
            ))}
          </div>
        </section>
            </div>
            <aside className="play-side">
        <section className="bag" data-tour="bag">
          <div className="section-head">
            <h2>
              Sac équipé · {used}/{state.slots}
              <span className="muted">Seuls ces objets rapportent de l'or</span>
            </h2>
            <div className="row">
              <Tip wrap content={<Text title="Équiper les meilleurs">Remplit le sac d'or avec les objets qui rapportent le plus, en tenant compte des bonus de tes talismans actuels.</Text>}>
                <button
                  className="btn small ghost"
                  onClick={() => {
                    autoEquip('bag')
                    play('equip')
                  }}
                >
                  Équiper les meilleurs
                </button>
              </Tip>
              <Tip
                wrap
                content={
                  <Text title="Agrandir le sac">
                    {state.slots >= slotCap
                      ? `Le sac a atteint son maximum actuel (${slotCap}). L'amélioration « Grand sac » du Portail éternel le relève.`
                      : state.gold < nextSlotCost
                        ? `Il te manque ${formatNum(nextSlotCost - state.gold)} or.`
                        : 'Un emplacement de plus pour équiper un objet supplémentaire.'}
                  </Text>
                }
              >
                <button
                  className="btn small"
                  disabled={state.slots >= slotCap || state.gold < nextSlotCost}
                  onClick={() => {
                    buySlot()
                    play('buy')
                  }}
                >
                  {state.slots >= slotCap
                    ? `Maximum atteint (${slotCap})`
                    : `+1 emplacement (${formatNum(nextSlotCost)} or)`}
                </button>
              </Tip>
            </div>
          </div>
          <div className="slots">
            {Array.from({ length: state.slots }, (_, i) => renderSlot(equippedList[i], i, false))}
          </div>
        </section>
        <section className="charms" data-tour="charms">
          <div className="section-head">
            <h2>
              Talismans · {charmsUsed}/{state.charmSlots}
              <span className="muted">Objets à capacité : ils ne rapportent pas d'or, mais leur effet s'applique</span>
            </h2>
            <div className="row">
            <Tip
              wrap
              content={<Text title="Équiper les meilleurs talismans">Choisit les talismans qui augmentent le plus ton revenu. Les places restantes reçoivent les réductions de prix, puis la chance.</Text>}
            >
              <button
                className="btn small ghost"
                onClick={() => {
                  autoEquip('charms')
                  play('equip')
                }}
              >
                Équiper les meilleurs
              </button>
            </Tip>
            <Tip
              wrap
              content={
                <Text title="Agrandir les talismans">
                  {state.charmSlots >= charmCap
                    ? `Maximum actuel atteint (${charmCap}). L'amélioration « Écrin » du Portail éternel le relève.`
                    : state.gold < nextCharmCost
                      ? `Il te manque ${formatNum(nextCharmCost - state.gold)} or.`
                      : 'Un emplacement de talisman de plus.'}
                </Text>
              }
            >
              <button
                className="btn small"
                disabled={state.charmSlots >= charmCap || state.gold < nextCharmCost}
                onClick={() => {
                  buyCharmSlot()
                  play('buy')
                }}
              >
                {state.charmSlots >= charmCap
                  ? `Maximum atteint (${charmCap})`
                  : `+1 emplacement (${formatNum(nextCharmCost)} or)`}
              </button>
            </Tip>
            </div>
          </div>
          <div className="bonuses">
            {bonus.achievements > 0 && (
              <Tip content={<Text title="Succès">Les succès débloqués augmentent ton revenu de {Math.round(bonus.achievements * 100)} % pour toujours.</Text>}>
                <span>🏆 Succès +{Math.round(bonus.achievements * 100)}%</span>
              </Tip>
            )}
            {bonus.prestige > 1 && (
              <Tip content={<Text title="Prestige">Multiplicateur permanent : améliorations et clés (×{keysMult} pour {state.totalKeys} clé{state.totalKeys > 1 ? 's' : ''}).</Text>}>
                <span>🗝️ Prestige ×{formatMult(bonus.prestige)}</span>
              </Tip>
            )}
            {bonus.best > 0 && (
              <Tip content={<Text title="Meilleur objet">Le meilleur objet équipé rapporte ×{formatMult(1 + bonus.best)}.</Text>}>
                <span>⭐ Meilleur objet ×{formatMult(1 + bonus.best)}</span>
              </Tip>
            )}
            {bonus.global > 0 && (
              <Tip content={<Text title="Revenu total">Ton revenu total est augmenté de {Math.round(bonus.global * 100)} %.</Text>}>
                <span>📈 +{Math.round(bonus.global * 100)}% revenu</span>
              </Tip>
            )}
            {Object.entries(bonus.rarity).map(([r, v]) => (
              <Tip key={r} content={<Text title={`Objets ${RARITIES[r].label}s`}>Les objets {RARITIES[r].label}s équipés rapportent ×{formatMult(1 + v)}.</Text>}>
                <span>
                  🔥 {RARITIES[r].label}s ×{formatMult(1 + v)}
                </span>
              </Tip>
            ))}
            {bonus.luck > 0 && (
              <Tip content={<Text title="Chance">Les raretés Légendaire et au-dessus sortent {Math.round(bonus.luck * 100)} % plus souvent.</Text>}>
                <span>🍀 +{Math.round(bonus.luck * 100)}% chance</span>
              </Tip>
            )}
            {bonus.discount > 0 && (
              <Tip content={<Text title="Réduction">Les portes coûtent {Math.round(bonus.discount * 100)} % moins cher (maximum 50 %).</Text>}>
                <span>💰 -{Math.round(bonus.discount * 100)}% prix des portes</span>
              </Tip>
            )}
          </div>
          <div className="slots">
            {Array.from({ length: state.charmSlots }, (_, i) => renderSlot(charmsList[i], i, true))}
          </div>
        </section>
            </aside>
          </div>
        )}

        {tab === 'collection' && (
        <section className="inventory">
          <div className="section-head">
            <h2>
              Réserve · {owned}/{ITEMS.length} découverts{shinyOwned > 0 && ` · ✨ ${shinyOwned} shiny`}
              <span className="muted">Tous les objets obtenus · cliquer pour équiper</span>
            </h2>
            <div className="row">
            <Tip
              wrap
              content={
                <Text title="Fusion automatique">
                  Dès que tu as {fc} exemplaires identiques, ils fusionnent tout seuls en un objet de niveau supérieur (revenu ×{TIER_MULT}), y compris ceux du sac équipé.
                  Ça peut aussi fusionner des objets que tu voulais vendre.
                </Text>
              }
            >
              <label className="switch">
                <input
                  type="checkbox"
                  checked={state.autoFuse}
                  onChange={(e) => {
                    setAutoFuse(e.target.checked)
                    play(e.target.checked ? 'fuse' : 'qty')
                  }}
                />
                <span className="track" />
                Fusion automatique
              </label>
            </Tip>
            <Tip wrap content={<Text title="Vendre les doublons">Vend les exemplaires en trop. Tu gardes toujours un exemplaire de chaque objet et tous ceux qui sont équipés. Attention : cela vend aussi les exemplaires que tu comptais fusionner.</Text>}>
              <button
                className="btn small ghost"
                disabled={dupValue <= 0}
                onClick={() => {
                  sellDuplicates()
                  play('sell')
                }}
              >
                Vendre les doublons (+{formatNum(dupValue)} or)
              </button>
            </Tip>
            </div>
          </div>
          <ReserveToolbar
            view={view}
            setView={setView}
            shown={shownCards.filter((c) => c.key).length}
            total={cards.filter((c) => c.key).length}
          />
          {shownCards.length === 0 && <div className="muted empty-note">Aucun objet ne correspond à ces filtres.</div>}
          <div className="grid">
            {shownCards.map((card) => {
              if (card.seen) {
                const r = RARITIES[card.item.rarity]
                return (
                  <Tip key={card.item.id} content={<Text title={card.item.name}>Découvert, mais tu n'en possèdes plus (prestige ou vente).</Text>}>
                    <div className="card locked seen" style={{ '--c': r.color }}>
                      <div className="badge-emoji">{card.item.emoji}</div>
                      <div className="name">{card.item.name}</div>
                      <span className={`chip ${rarityClass(card.item.rarity)}`}>{r.label}</span>
                    </div>
                  </Tip>
                )
              }
              if (card.locked) {
                const r = RARITIES[card.item.rarity]
                return (
                  <Tip key={card.item.id} content={<Text title="Non découvert">Un objet {r.label} que tu n'as pas encore obtenu.</Text>}>
                    <div className="card locked" style={{ '--c': r.color }}>
                      <div className="badge-emoji">❔</div>
                      <div className="name">???</div>
                      <span className={`chip ${rarityClass(card.item.rarity)}`}>{r.label}</span>
                    </div>
                  </Tip>
                )
              }
              const k = card.key
              const { item, tier, shiny, level } = parseKey(k)
              const n = state.inventory[k]
              const charm = isCharm(k)
              const e = bagOf(state, k)[k] ?? 0
              const r = RARITIES[item.rarity]
              const bagFull = charm ? charmsUsed >= state.charmSlots : used >= state.slots
              const canEquip = e < n && !bagFull
              const canFuse = n >= fc && tier < MAX_TIER
              const lines = [
                `Possédé : ${n}${e > 0 ? ` (dont ${e} équipé${e > 1 ? 's' : ''})` : ''}`,
                tier < MAX_TIER
                  ? `Fusion : ${fc} identiques → 1 objet ${starsText(tier + 1)} (revenu ×${TIER_MULT})`
                  : 'Niveau maximum atteint',
                level < MAX_ENHANCE
                  ? `Forge (⚒) : tenter +${level + 1}, ${Math.round(ENHANCE_RATES[level] * 100)} % de réussite`
                  : 'Amélioration maximale atteinte',
              ]
              const hint = canEquip
                ? 'Cliquer pour équiper'
                : e < n && bagFull
                  ? charm
                    ? 'Talismans pleins : retire-en un ou agrandis-les'
                    : 'Sac plein : retire un objet ou agrandis-le'
                  : null
              return (
                <Tip key={k} content={<ItemTip item={item} tier={tier} shiny={shiny} level={level} lines={lines} hint={hint} />}>
                <div
                  className={`card ${canEquip ? 'equippable' : ''} ${shiny ? 'shiny' : ''}`}
                  style={{ '--c': r.color }}
                  onClick={() => {
                    if (!canEquip) return
                    equip(k)
                    play('equip')
                  }}
                >
                  {e > 0 && <div className="pill eq">{charm ? '📿' : '🎒'} {e}</div>}
                  {n > 1 && <div className="pill count">×{n}</div>}
                  <div className="badge-emoji">{item.emoji}</div>
                  <div className="name">
                    <span>
                      {item.name}
                      {level > 0 && <b className="lvl"> +{level}</b>}
                    </span>
                  </div>
                  <div className="stars-row">
                    {shiny && <b>✨ SHINY </b>}
                    {tier > 1 && starsText(tier)}
                  </div>
                  <span className={`chip ${rarityClass(item.rarity)}`}>{r.label}</span>
                  <div className="inc">{charm ? 'Talisman' : `+${formatNum(itemIncome(item, tier, shiny, level))}/s`}</div>
                  {item.ability && <div className="ability">⚡ {abilityText(item, tier, shiny, level)}</div>}
                  <div className="card-actions">
                  {tier < MAX_TIER && level === 0 && (
                    <button
                      className="fuse"
                      disabled={!canFuse}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        fuse(k)
                        play('fuse')
                      }}
                    >
                      <i style={{ width: `${(Math.min(n, fc) / fc) * 100}%` }} />
                      <span>
                        Fusion {Math.min(n, fc)}/{fc}
                      </span>
                    </button>
                  )}
                  {level < MAX_ENHANCE && (
                    <button
                      className="fuse enhance"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setForgeKey(k)
                      }}
                    >
                      <span>⚒ +{level + 1}</span>
                    </button>
                  )}
                  </div>
                </div>
                </Tip>
              )
            })}
          </div>
          <p className="muted total">
            Valeur de la collection : {formatNum(collectionValue(state.inventory))} or
          </p>
        </section>
        )}

        {tab === 'achievements' && (
        <section className="achievements">
          <div className="section-head">
            <h2>
              Succès · {achDone.length}/{ACHIEVEMENTS.length}
              <span className="muted">
                Chaque succès augmente ton revenu pour toujours, même après un prestige
                {bonus.achievements > 0 && ` (actuellement +${Math.round(bonus.achievements * 100)} %)`}.
              </span>
            </h2>
          </div>
          <div className="ach-summary">
            <div className="progress">
              <i style={{ width: `${(achDone.length / ACHIEVEMENTS.length) * 100}%` }} />
            </div>
            <span className="muted">
              {Math.round((achDone.length / ACHIEVEMENTS.length) * 100)} % complété
            </span>
          </div>
          {achGroups.map((group) => (
            <div key={group} className="ach-group">
              <div className="ach-group-title">{group}</div>
              <div className="ach-grid">
                {ACHIEVEMENTS.filter((a) => a.group === group).map((a) => {
                  const done = !!state.achievements[a.id]
                  const [value, target] = a.progress(state, { income })
                  return (
                    <div key={a.id} className={`ach ${done ? 'done' : ''}`}>
                      <div className="ach-icon">{done ? a.icon : '🔒'}</div>
                      <div className="ach-body">
                        <b>{a.name}</b>
                        <span className="muted">{a.desc}</span>
                        {!done && (target > 1 || a.alwaysProgress) && (
                          <>
                            <div className="progress">
                              <i style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
                            </div>
                            <span className="muted">
                              {formatNum(value)} / {formatNum(target)}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="chip reward">+{Math.round(a.reward * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
        )}

        {tab === 'stats' && <Stats state={state} income={income} bonus={bonus} />}

        {tab === 'prestige' && (
        <section className="prestige">
          <div className="section-head">
            <h2>
              Portail éternel · 🗝️ {state.keys} clé{state.keys > 1 ? 's' : ''}
              <span className="muted">
                Recommence à zéro pour gagner des clés. Chaque clé gagnée augmente ton revenu pour toujours
                {state.totalKeys > 0 && ` (actuellement ×${keysMult})`}, avec des rendements décroissants.
              </span>
            </h2>
          </div>

          <div className="prestige-box">
            <div className="prestige-info">
              <h3>Franchir le Portail</h3>
              <p className="muted">
                Tu perds ton or, tes objets et ton sac. Tu gardes tes clés, tes améliorations et tes découvertes.
              </p>
              <div className="progress">
                <i style={{ width: `${Math.min(100, (state.runEarned / nextAt) * 100)}%` }} />
              </div>
              <p className="muted">
                Or gagné dans cette partie : {formatNum(state.runEarned)} / {formatNum(nextAt)} pour {gain < 1 ? 'ta première clé' : 'la clé suivante'}
              </p>
            </div>
            <Tip
              wrap
              content={
                <Text title="Franchir le Portail">
                  {gain < 1
                    ? `Il faut avoir gagné ${formatNum(PRESTIGE_BASE)} or dans cette partie pour obtenir une clé.`
                    : `Tu gagnes ${gain} clé${gain > 1 ? 's' : ''} et tu recommences à zéro.`}
                </Text>
              }
            >
              <button
                className="btn"
                disabled={gain < 1}
                onClick={() => setConfirm('prestige')}
              >
                Franchir le Portail (+{gain} 🗝️)
              </button>
            </Tip>
          </div>

          <div className="upgrades">
            {UPGRADES.map((up) => {
              const level = upLevel(state, up.id)
              const maxed = level >= up.max
              const cost = maxed ? 0 : up.cost(level)
              return (
                <div key={up.id} className="upgrade">
                  <div className="upgrade-head">
                    <span className="upgrade-icon">{up.icon}</span>
                    <div>
                      <h3>{up.name}</h3>
                      <span className="muted">
                        Niveau {level}/{up.max}
                      </span>
                    </div>
                  </div>
                  <div className="upgrade-effect">{level > 0 ? up.effect(level) : 'Aucun effet pour le moment'}</div>
                  {!maxed && <div className="muted">Suivant : {up.effect(level + 1)}</div>}
                  <button
                    className="btn small"
                    disabled={maxed || state.keys < cost}
                    onClick={() => {
                      buyUpgrade(up.id)
                      play('buy')
                    }}
                  >
                    {maxed ? 'Niveau maximum' : `Améliorer · ${cost} 🗝️`}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
        )}
      </main>

      <Tutorial
        state={liveState}
        tab={tab}
        setTab={setTab}
        setTutorial={setTutorial}
        paused={!!reveal || !!opening || !!forgeKey || !!confirm || showSettings || !!welcome}
        hintsEnabled={settings.tips}
        onDisableHints={() => patchSettings({ tips: false })}
      />
      <Toasts toasts={frozen || !settings.toasts ? [] : toasts} onDismiss={dismissToast} />

      <AnimatePresence>
        {reveal && (
          <Reveal
            results={reveal}
            onClose={() => {
              setReveal(null)
              setFrozen(null)
            }}
          />
        )}
        {!reveal && welcome && <Welcome {...welcome} onClose={closeWelcome} />}
        {showSettings && (
          <Settings
            settings={settings}
            onChange={patchSettings}
            onClose={() => setShowSettings(false)}
            onResetGame={() => {
              setShowSettings(false)
              setConfirm('reset')
            }}
            onReplayTutorial={() => {
              setShowSettings(false)
              setTab('play')
              setTutorial({ step: 0, done: false, seen: {} })
            }}
          />
        )}
        {forgeKey && (
          <Forge
            key={forgeKey}
            startKey={forgeKey}
            liveState={liveState}
            onEnhance={enhance}
            onFreeze={() => setFrozen((f) => f ?? liveState)}
            onUnfreeze={() => setFrozen(null)}
            onClose={() => setForgeKey(null)}
          />
        )}
        {confirm === 'prestige' && (
          <Confirm
            title="Franchir le Portail ?"
            confirmLabel={`Franchir (+${gain} 🗝️)`}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null)
              prestige()
              play('prestige')
            }}
          >
            <div className="welcome-gain">+{gain} 🗝️</div>
            <div className="confirm-rows">
              <div>
                <span className="muted">Revenu permanent des clés</span>
                <b>
                  ×{keysMult} → ×{formatMult(keyMultiplier(state.totalKeys + gain))}
                </b>
              </div>
              <div className="confirm-subtitle">Tu recommences avec</div>
              <div>
                <span className="muted">Emplacements du sac</span>
                <b>{startSlots(state)}</b>
              </div>
              <div>
                <span className="muted">Emplacements de talismans</span>
                <b>{startCharmSlots(state)}</b>
              </div>
              <div>
                <span className="muted">Or de départ</span>
                <b>{formatNum(startGold(state))}</b>
              </div>
            </div>
            <div className="confirm-lists">
              <div>
                <div className="tt-title">Tu perds</div>
                <ul>
                  <li>Ton or ({formatNum(state.gold)})</li>
                  <li>Tes objets et ton sac</li>
                  <li>Les emplacements achetés avec de l'or</li>
                </ul>
              </div>
              <div>
                <div className="tt-title">Tu gardes</div>
                <ul>
                  <li>Tes clés et tes améliorations</li>
                  <li>Ta collection découverte</li>
                </ul>
              </div>
            </div>
          </Confirm>
        )}
        {confirm === 'reset' && (
          <Confirm
            title="Tout recommencer ?"
            confirmLabel="Effacer la partie"
            danger
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null)
              reset()
            }}
          >
            <div className="muted">
              Toute ta progression sera effacée, y compris tes clés, tes améliorations de prestige et ta collection.
              Cette action est définitive.
            </div>
          </Confirm>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  )
}
