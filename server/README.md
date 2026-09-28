# Serveur — classement Les Portes

API du classement (comptes joueurs + leaderboard). Le jeu lui-même reste local
(sauvegarde dans le navigateur) : ce serveur ne fait que recevoir un résumé
périodique de la progression pour le classement, avec une validation légère
anti-triche (rejette une progression physiquement impossible).

L'API crée et met à jour son propre schéma toute seule au démarrage
(`src/migrate.js`, idempotent) : pas de migration séparée à lancer.

## Déploiement

`.github/workflows/deploy.yml` fait tout, à chaque envoi sur `main` :
1. construit l'image du frontend (`Dockerfile` à la racine) et celle de
   l'API (`server/api/`), les pousse sur GitHub Container Registry ;
2. se connecte en SSH au VPS, `docker pull` les deux images, puis
   `docker run` les 3 conteneurs (base de données, API, frontend) — aucun
   fichier n'est copié sur le VPS, aucun `docker compose`.

Secrets GitHub requis (Settings > Secrets and variables > Actions) :

| Secret | Valeur |
|---|---|
| `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` | accès SSH au VPS (l'utilisateur doit pouvoir lancer `docker`) |
| `POSTGRES_PASSWORD` | aléatoire, ex. `openssl rand -hex 24` |
| `JWT_SECRET` | aléatoire, ex. `openssl rand -hex 32` |
| `CORS_ORIGIN` | `https://les-portes.fwszs.dev` |

**Seule étape manuelle sur le VPS**, à faire une fois (la CI n'a pas les
droits `sudo`) : configurer Nginx (hors Docker) pour router les deux
domaines vers les conteneurs. Les fichiers de référence sont dans `nginx/`
à la racine du dépôt — à copier toi-même dans `/etc/nginx/sites-available/`
comme d'habitude :

```
# les-portes.fwszs.dev -> proxy_pass http://127.0.0.1:8005;   (frontend)
# api.les-portes.fwszs.dev -> proxy_pass http://127.0.0.1:3001;  (API)
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d les-portes.fwszs.dev -d api.les-portes.fwszs.dev
```

Une fois ça fait, chaque push sur `main` redéploie tout seul. Vérifier :
`curl https://api.les-portes.fwszs.dev/health` → `{"ok":true}`.

## Développement local

Sans rien construire ni committer, avec les mêmes commandes que la
production (voir le job `deploy` du workflow) :

```
docker network create lesportes-net

docker run -d --name lesportes-db --network lesportes-net \
  -e POSTGRES_DB=lesportes -e POSTGRES_USER=lesportes -e POSTGRES_PASSWORD=devpw \
  -v lesportes_db_data:/var/lib/postgresql/data \
  postgres:16-alpine

cd server/api && docker build -t les-portes-api:local . && cd ../..
docker run -d --name lesportes-api --network lesportes-net \
  -e DATABASE_URL=postgres://lesportes:devpw@lesportes-db:5432/lesportes \
  -e JWT_SECRET=devsecret -e CORS_ORIGIN=http://localhost:5173 -e PORT=3001 \
  -p 3001:3001 \
  les-portes-api:local
```

L'API écoute alors sur `http://localhost:3001`. Côté frontend, définir
`VITE_API_URL=http://localhost:3001` (voir `.env.example` à la racine du
projet Vite) avant `npm run dev`.

Pour repartir de zéro : `docker rm -f lesportes-db lesportes-api && docker volume rm lesportes_db_data`.

## API

- `POST /auth/register` `{ email, password, pseudo }` → `{ token, pseudo }`
- `POST /auth/login` `{ email, password }` → `{ token, pseudo }`
- `GET /auth/me` (`Authorization: Bearer <token>`) → `{ id, email, pseudo }`
- `POST /leaderboard/submit` (authentifié) `{ totalGoldEarned: "123456", totalKeys, prestiges, income }`
- `GET /leaderboard?limit=100` (public) → liste triée par or total gagné
- `GET /leaderboard/me` (authentifié) → rang et stats du joueur courant

`totalGoldEarned` et `income` sont transmis en **chaînes de caractères** :
les montants du jeu dépassent la précision entière sûre de JavaScript
(2^53) en cours de partie.

## Vérification manuelle rapide

```
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.fr","password":"motdepasse123","pseudo":"Testeur"}'
# -> { "token": "...", "pseudo": "Testeur" }

TOKEN=... # coller le token reçu

curl -X POST http://localhost:3001/leaderboard/submit \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"totalGoldEarned":"1000000","totalKeys":5,"prestiges":1,"income":1000}'
# -> { "ok": true }

curl http://localhost:3001/leaderboard
# -> [{ "pseudo": "Testeur", "totalGoldEarned": "1000000", ... }]
```
