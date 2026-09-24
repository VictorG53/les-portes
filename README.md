# Les Portes

Un jeu incrémental dans le navigateur : ouvre des portes, gagne des objets de plus en plus rares, fusionne-les,
améliore-les, puis franchis le Portail éternel pour recommencer plus fort.

## Lancer le jeu

```bash
npm install
npm run dev       # serveur de développement
npm run build     # version de production (dossier dist/)
npm run lint      # vérifications de code (oxlint)
npm run simulate  # simulateur d'équilibrage (voir plus bas)
```

La partie est sauvegardée automatiquement dans le navigateur (`localStorage`). Il n'y a pas de serveur pour l'instant :
tout l'accès au stockage passe par `src/storage.js` et `src/save.js`, pour qu'on puisse brancher un serveur plus tard.

## Principe du jeu

- **Portes** : chaque porte a ses probabilités de rareté. Les lots (×1 à ×250) ouvrent plusieurs portes d'un coup ;
  les gros lots se débloquent avec le prestige.
- **Objets** : 10 raretés, de Commun à Éternel. Dans une rareté, les objets ont un rang (plus fort mais plus rare).
  Une variante **shiny** rapporte ×1,5.
- **Sacs** : le sac d'or (seuls ces objets rapportent) et les talismans (objets à capacité : ils ne rapportent pas
  d'or, mais leur effet s'applique).
- **Fusion** : 5 objets identiques donnent 1 objet de niveau supérieur (★), jusqu'à ★8.
- **Forge** : améliore un exemplaire de +1 à +5, avec un risque de le perdre.
- **Prestige** : le Portail éternel remet la partie à zéro contre des clés, à dépenser en améliorations permanentes.
- **Succès** : bonus de revenu permanents.
- **Gain hors ligne** : 25 % du revenu, sur 2 h au maximum (amélioré par « Sommeil profond » : jusqu’à 65 % sur 6 h).

## Organisation du code

| Fichier | Rôle |
|---|---|
| `src/data.js` | Données et règles : raretés, objets, portes, améliorations, formules (fusion, forge, prestige) |
| `src/game.js` | État du jeu : calculs purs (revenu, ouverture, fusion, prestige…) et hook `useGame` |
| `src/achievements.js` | Liste des succès |
| `src/App.jsx` | Interface principale |
| `src/Door.jsx`, `Forge.jsx`, `Reveal.jsx`, `Welcome.jsx`, `Confirm.jsx`, `Toasts.jsx`, `Tip.jsx` | Composants (portes, forge, résultats, fenêtres, infobulles) |
| `src/ReserveToolbar.jsx`, `reserveView.js` | Recherche, filtres et tri de la réserve |
| `src/format.js` | Format des nombres (unités k, M, B, T… ; multiplicateurs) : tout nombre affiché doit passer par `formatNum`, `compactNum` ou `formatMult` |
| `src/tabs.js` | Onglets (Portes, Collection, Succès, Stats, Prestige) et mémorisation de l’onglet ouvert |
| `src/Stats.jsx` | Page de statistiques (compteurs, records, historique des prestiges) |
| `src/revealUtils.js` | Regroupement des résultats des gros lots |
| `src/sound.js` | Sons générés avec la Web Audio API (aucun fichier audio) |
| `src/storage.js` | Seul point d'accès au stockage : `prefs` (préférences de l'appareil) et `gameStorage` (la partie, adaptateur remplaçable par un serveur avec `setGameStorage`) |
| `src/save.js` | Sauvegarde versionnée (`{ version, savedAt, state }`), migrations des anciennes sauvegardes, sauvegarde de secours |
| `src/settings.js`, `src/Settings.jsx` | Réglages de l'appareil (volume, animations, format des nombres, notifications) |
| `src/tutorial.js`, `src/Tutorial.jsx` | Didacticiel : guide de démarrage en 6 étapes, puis conseils contextuels affichés une seule fois |
| `src/Logo.jsx`, `public/logo.svg` | Logo (une porte entrouverte qui laisse passer la lumière), favicon et icônes de l’app |
| `src/index.css` | Styles (thème sombre, design plat) |
| `scripts/simulate.mjs` | Simulateur d'équilibrage |

Les fonctions de `game.js` sont pures (elles prennent un état et en renvoient un nouveau) : elles servent aussi bien
à l'interface qu'au simulateur.

## Simulateur d'équilibrage

Un joueur automatique joue plusieurs heures de jeu accélérées avec la vraie logique du jeu.

```bash
npm run simulate -- --hours 24 --seeds 2 --step 120 --max-qty 10
npm run simulate -- --hours 48 --probe    # temps pour atteindre chaque porte après chaque prestige
```

Options : `--hours`, `--seeds`, `--step` (secondes entre deux décisions), `--ratio` et `--horizon` (quand prestiger),
`--max-qty`, `--forge`, `--away` (absences), `--probe`. Voir l'en-tête de `scripts/simulate.mjs`.

Le rapport donne les jalons, les cycles de prestige, l'avancement final et des alertes d'équilibrage.
Il est conseillé de le relancer après chaque changement de contenu ou de valeurs (`src/data.js`).

## Sauvegarde et évolution du format

- Une sauvegarde est `{ version, savedAt, state }`. `SAVE_VERSION` (dans `src/save.js`) n'augmente que pour un changement de **structure**
  (champ renommé ou déplacé, unité modifiée) : on ajoute alors une fonction à `MIGRATIONS`.
- Un simple **nouveau champ** ne demande pas de migration : `normalize()` le complète avec la valeur d'une partie neuve.
- Une sauvegarde plus récente que le jeu, ou illisible, n'est jamais écrasée sans copie : elle est conservée sous
  `les-portes-save-backup` / `les-portes-save-v1-corrupt`.
- Les réglages et les préférences (onglet, filtres) sont **locaux à l'appareil** et ne font pas partie de la sauvegarde.

## Didacticiel

- Les étapes du guide (`GUIDE`) et les conseils (`HINTS`) sont décrits dans `src/tutorial.js`. Chaque bulle désigne un élément par un sélecteur
  `data-tour="…"` posé dans l'interface. Une étape avance seule quand sa condition `done(state)` est vraie, sinon elle a un bouton.
- La progression (`state.tutorial`) fait partie de la sauvegarde : elle survit au prestige et suivra le joueur sur un serveur.
- Les parties créées avant l'arrivée du didacticiel (version de sauvegarde < 2) le marquent comme terminé.
- Le joueur peut désactiver les conseils ou relancer le guide depuis les réglages.

## Mise en ligne

Le jeu est un site **entièrement statique** : `npm run build` produit le dossier `dist/`, à publier tel quel sur n'importe quel hébergeur.
Les chemins sont relatifs (`base: './'`), donc il fonctionne à la racine d'un domaine comme dans un sous-dossier. Aucune requête externe : la police est
embarquée, il n'y a ni statistiques ni suivi.

| Hébergeur | Comment |
|---|---|
| **Netlify** (le plus simple) | Glisser-déposer le dossier `dist/` sur app.netlify.com/drop |
| **GitHub Pages** | Pousser le dépôt sur GitHub, puis Settings > Pages > Source : « GitHub Actions » (le workflow `.github/workflows/deploy.yml` fait le reste) |
| **Cloudflare Pages / Vercel** | Importer le dépôt ; commande de build : `npm run build` ; dossier de sortie : `dist` |

Pour tester le résultat en local : `npm run build && npm run preview`.

**À savoir**
- La sauvegarde est dans le navigateur, **propre à chaque adresse** : une partie commencée en local (`localhost`) n'apparaît pas sur le site en ligne, et vider les données du site efface la partie.
- Pour le partage sur les réseaux, ajouter une balise `og:image` (URL absolue) dans `index.html` une fois l'adresse définitive connue.
- Le dossier `dist/` n'est pas versionné (`.gitignore`).
