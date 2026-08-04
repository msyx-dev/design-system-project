# design-system-project

Design system vivant de msyx.fr — source de verite pour tous les composants UI (cards, boutons, badges, formulaires, calendriers, login, etc.).

## Stack

- HTML/CSS/JS statique, composants partages via `shared/`
- Theme dark (#0a0f1e), accent bleu #3b82f6, gradients bleu-violet
- Typo : Space Grotesk + Inter + Fira Code
- Image Docker `caddy:2-alpine` + fichiers statiques (`Dockerfile`) — aucun backend, aucune base de données

## URL

**Aucun déploiement production actif à ce jour.** Le seul environnement live est la préprod :
**https://design-system.miklaw.fr** (Coolify, app `design-system-preprod`, statut `running:healthy`).

`design-system.msyx.fr` **n'existe pas** : absent de la config Caddy active (visible uniquement dans
d'anciens backups/archives) et absent de Coolify. Le `type: prod` du registry (`registry.json`)
qualifie la nature du **projet** (livrable, pas un jetable POC/oneshot) — pas l'existence d'un
déploiement production réel, qui n'a jamais eu lieu pour cette app (`docs/INFRASTRUCTURE.md` la
liste explicitement parmi les apps « pas encore migrées » sur `*.msyx.fr`).

## Déploiement autonome (Docker)

Image auto-suffisante (`caddy:2-alpine` + fichiers statiques), sans dépendance à l'infra msyx.

### Build & run

```bash
docker build -t design-system .
docker run -d --name design-system -p 8080:80 design-system
```

Le site est servi sur `http://localhost:8080`. La terminaison TLS/reverse-proxy (Caddy, Traefik,
Nginx…) est à la charge de l'opérateur — voir `Caddyfile.container` pour les routes exposées par le
container (`/health.json`, `/version.json`, catch-all SPA `try_files {path} /site.html`).

Deux routes du `Caddyfile.container` sont spécifiques au déploiement msyx et supposent un outpost
Authentik forward_auth en amont (voir section Profil d'auth) :
- `/me.json` lit passivement les en-têtes `X-Authentik-*` s'ils sont présents ; sans outpost en
  amont, elle répond simplement avec des champs vides — elle ne bloque jamais l'accès.
- `/auth/logout` redirige vers `/outpost.goauthentik.io/sign_out`, une route qui n'existe que
  derrière un outpost Authentik — à adapter (ou ignorer, le lien reste simplement mort) chez un
  tiers sans Authentik.

Chez msyx : déploiement via Coolify, qui reconstruit l'image (`Dockerfile`) à chaque push sur
`main`. Aucune action manuelle.

## Profil d'auth

Profil retenu pour cette app : **P0** — Public (ADR-019 Principe 0) : aucune couche OIDC, aucun rôle
applicatif, aucune base de droits.

**Constaté dans le code, pas choisi pour l'occasion.** Le dépôt entier ne contient aucune trace
d'auth applicative : `grep -rn "OIDC_\|SETUP_TOKEN\|client_id\|client_secret\|\bissuer\b" --include=*.js --include=*.sh --include=Dockerfile --include=*.container .`
ne remonte rien — pas de middleware, pas de session, pas de vérification de token. `Caddyfile.container`
(servi par le container) ne fait respecter aucune authentification :
- `/me.json` **lit passivement** les en-têtes `X-Authentik-*` (s'ils sont présents, injectés par un
  outpost en amont) pour affichage dans le header — elle ne les vérifie jamais et ne bloque rien si
  ils sont absents ;
- `/auth/logout` n'est qu'une redirection statique vers l'URL de sign-out d'un outpost ;
- tout le reste (catch-all SPA) est servi sans aucune condition.

**L'écart nommé (ne pas arrondir) : ce P0 décrit le code, pas l'expérience réelle sur le seul
environnement qui existe aujourd'hui.** `design-system.miklaw.fr` (préprod, seul environnement live —
voir section URL) est **100 % gaté par un forward_auth Authentik (UC2)** au niveau du reverse-proxy,
en amont du container — vérifié en direct : `curl -I https://design-system.miklaw.fr/` renvoie `302`
vers `auth.msyx.fr/application/o/authorize/…` (groupe `preprod-testers`). Ce gate est **orthogonal**
au profil applicatif ADR-019 (Principe 0, § « Orthogonalité avec le forward_auth UC2 ») : il protège
l'accès à l'**environnement** de préprod, pas l'application elle-même, et ne compte pas dans la
grille P0-P3. Mais il change tout pour un lecteur pressé : contrairement à un P0 « vitrine publique »
typique, **personne ne peut atteindre ce DS aujourd'hui sans une session SSO Authentik valide** — le
P0 applicatif ne s'est encore jamais traduit par un accès public réel. Un tiers qui déploierait cette
image sans placer de gate équivalent devant obtiendrait, lui, un site réellement public : c'est le
comportement natif et sans surprise du code (aucune auth n'y est câblée, dans un sens comme dans
l'autre).

Conséquence pour `SETUP_TOKEN` / `OIDC_*` / mapping groupes→rôles / wizard 1ère install (ADR-019
Principes 1-2, requis à partir de P1) : **sans objet à P0, non implémentés** — aucune raison de les
simuler pour cette app.

## Variables d'environnement

Aucune variable requise pour déployer l'image telle quelle.

Une seule variable **optionnelle**, consommée par `entrypoint.sh` au démarrage du container :

| Variable | Rôle | Défaut si absente |
|---|---|---|
| `SOURCE_COMMIT` | sha figé dans `/version.json` généré au démarrage | `"unknown"` |

Chez msyx, `SOURCE_COMMIT` est injecté automatiquement par Coolify v4 — aucune action manuelle.
`BUILT_AT` (également dans `/version.json`) est figé au **build** de l'image
(`RUN date -u +%Y-%m-%dT%H:%M:%SZ > /built_at` dans `Dockerfile`), pas au runtime : il n'y a rien à
configurer pour cette valeur.

## Volumes / persistance

Aucun volume requis. Le site est 100 % statique (`COPY . /srv` dans `Dockerfile`) : le contenu vit
dans l'image elle-même, reconstruite à chaque déploiement. Rien n'est écrit au runtime.

## Healthcheck

- `GET /health.json` → `{"status":"ok"}` (fichier statique — c'est aussi la sonde du `HEALTHCHECK`
  Docker interne à l'image, cf. `Dockerfile`)
- `GET /version.json` → `{"version":"<pinné au repo>","sha":"<SOURCE_COMMIT ou "unknown">","built_at":"<figé au build>"}`,
  généré par `entrypoint.sh` à chaque démarrage du container

**Écart de nommage à connaître** : les chemins réels sont `/health.json` et `/version.json` (avec
extension), pas `/health`/`/version` nus. Ces derniers ne sont **pas** des routes dédiées dans
`Caddyfile.container` : ils tombent dans le catch-all SPA (`try_files {path} /site.html`) et
renvoient du HTML avec un statut `200`, pas un JSON de santé — vérifié en direct sur la préprod.
C'est un écart par rapport à la convention `/health`+`/version` (sans extension) du parc
(`global-config/docs/conventions/health-version.md`) ; hors périmètre de ce ticket, qui porte sur le
profil d'auth — nommé ici plutôt que masqué.

## Backup / sauvegarde

Aucune donnée applicative persistante : le contenu est le repo git lui-même
(`msyx-dev/design-system-project`), reconstruit dans l'image à chaque build. Rien à sauvegarder côté
runtime.

## Visual regression tests

Le DS embarque un filet de regression visuel via Playwright depuis v2.32.1.

### Lancer les tests en local

```bash
npm install
npx playwright install --with-deps chromium
npm run test:visual
```

Le serveur local est lance automatiquement via `webServer` (Playwright config), inutile de demarrer Caddy.

### Mettre a jour une baseline

Si une modification CSS est intentionnelle (nouveau composant, refonte d'un token, etc.) :

```bash
npm run test:visual:update
```

Puis review le diff via `git diff --stat visual-tests/baseline/` et commit les nouvelles PNG.

### CI

Le workflow `.github/workflows/visual.yml` s'execute sur chaque PR vers `main`. En cas d'echec, les diffs PNG + le report HTML sont uploades en artefact `visual-diffs` (retention 14 jours).

### Perimetre actuel (v2.38.0)

- **Themes** : msyx, acssi, nhood (dark + light pour chacun)
- **Pages** : 9 thematiques (`fondation`, `motion`, `composants`, `navigation`, `formulaires`, `data`, `templates`, `feedback`, `divers`)
- **Viewports** : desktop 1280x800 + mobile 375x667
- **Total** : 108 baselines (3 themes x 2 modes x 9 pages x 2 viewports)

Filet utilise pour valider la byte-identite du CSS lors des refontes theme generator (#190) ou de toute modification de tokens.
