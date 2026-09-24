import { DOORS, MAX_TIER, parseKey, prestigeGain } from './data'
import { equippedCount, fuseCount, isCharm } from './game'

// Didacticiel : un guide pas à pas au premier lancement, puis des conseils affichés une seule fois, au bon moment.
// Chaque étape désigne un élément de l'interface par un sélecteur (attribut data-tour).

const FIRST_DOOR_PRICE = DOORS[0].cost

// --- guide de démarrage ---
// done(state) : condition qui fait avancer toute seule l'étape (sinon un bouton « Suivant »)
export const GUIDE = [
  {
    id: 'welcome',
    title: 'Bienvenue dans Les Portes !',
    text: "Ouvre des portes pour obtenir des objets. Les objets équipés te rapportent de l'or, avec lequel tu ouvres des portes plus chères, et ainsi de suite. Un petit tour rapide ?",
    button: "C'est parti",
  },
  {
    id: 'open',
    tab: 'play',
    target: '[data-tour="first-open"]',
    title: 'Ouvre ta première porte',
    text: `Tu as 30 or et la Porte en bois coûte ${FIRST_DOOR_PRICE} or. Clique sur « Ouvrir ».`,
    done: (s) => s.opened >= 1,
  },
  {
    id: 'bag',
    tab: 'play',
    target: '[data-tour="bag"]',
    title: 'Ton sac équipé',
    text: "Ton objet est équipé automatiquement ici. Seuls les objets de ce sac te rapportent de l'or, chaque seconde.",
    button: 'Compris',
  },
  {
    id: 'more',
    tab: 'play',
    target: '[data-tour="first-open"]',
    title: 'Remplis ton sac',
    text: 'Il te reste de quoi ouvrir deux portes de plus. Ouvre-les pour remplir tes emplacements.',
    done: (s) => s.opened >= 3 || s.gold < FIRST_DOOR_PRICE,
  },
  {
    id: 'gold',
    target: '[data-tour="gold"]',
    title: 'Ton revenu',
    text: "Voilà ton or, et ce que tu gagnes par seconde. Attends d'en avoir assez pour la porte suivante : plus une porte est chère, plus ses objets sont rares.",
    button: 'Suivant',
  },
  {
    id: 'doors',
    tab: 'play',
    target: '[data-tour="doors"]',
    title: 'Monte en gamme',
    text: 'Chaque ligne indique les chances de chaque rareté. Ouvre la porte la plus chère que tu peux payer pour progresser plus vite. Bonne chance !',
    button: 'Terminer',
  },
]

// --- conseils contextuels : chacun ne s'affiche qu'une fois, quand la situation se présente ---
// tab : le conseil n'apparaît que sur cet onglet ; les conseils qui montrent un onglet (data-tour="tab-…") s'affichent partout
export const HINTS = [
  {
    id: 'talisman',
    tab: 'play',
    target: '[data-tour="charms"]',
    title: 'Ton premier talisman !',
    text: "Les objets à capacité (⚡) vont dans les talismans. Ils ne rapportent pas d'or, mais leur effet s'applique tant qu'ils sont équipés.",
    when: (s) => Object.keys(s.inventory).some(isCharm),
  },
  {
    id: 'slots',
    tab: 'play',
    target: '[data-tour="bag"]',
    title: 'Ton sac est plein',
    text: "Tu as plus d'objets que d'emplacements. Achète un emplacement avec de l'or, ou remplace un objet par un meilleur (« Équiper les meilleurs »).",
    when: (s) => {
      const gold = Object.keys(s.inventory).filter((k) => !isCharm(k))
      const total = gold.reduce((n, k) => n + s.inventory[k], 0)
      return equippedCount(s.equipped) >= s.slots && total > equippedCount(s.equipped)
    },
  },
  {
    id: 'fusion',
    target: '[data-tour="tab-collection"]',
    title: 'Des objets à fusionner',
    text: 'Tu as assez d\'exemplaires identiques : fusionne-les dans la Collection en un seul objet plus puissant (★), qui libère aussi de la place dans ton sac. Tu peux même activer la fusion automatique.',
    when: (s) =>
      Object.keys(s.inventory).some((k) => {
        const p = parseKey(k)
        return s.inventory[k] >= fuseCount(s) && p.tier < MAX_TIER && p.level === 0
      }),
  },
  {
    id: 'forge',
    target: '[data-tour="tab-collection"]',
    title: 'La forge',
    text: "Sur chaque carte de la Collection, « ⚒ » tente d'améliorer un exemplaire (+50 % de revenu par niveau). Attention : un échec détruit l'exemplaire.",
    when: (s) => s.opened >= 60 && s.gold >= 1000,
  },
  {
    id: 'prestige',
    target: '[data-tour="tab-prestige"]',
    title: 'Le Portail éternel',
    text: "Tu peux déjà gagner une clé de prestige : tu recommences à zéro contre des bonus permanents. Plus tu attends, plus tu en gagnes d'un coup, mais ce n'est jamais obligatoire.",
    when: (s) => prestigeGain(s.runEarned) >= 1,
  },
]
