# design-system-project

Design system vivant de msyx.fr — source de verite pour tous les composants UI (cards, boutons, badges, formulaires, calendriers, login, etc.).

## Stack

- HTML/CSS/JS statique, composants partages via `shared/`
- Theme dark (#0a0f1e), accent bleu #3b82f6, gradients bleu-violet
- Typo : Space Grotesk + Inter + Fira Code
- Servi par Caddy (pas de Docker)

## URL

https://design-system.msyx.fr

## Deploiement

Fichiers servis directement par Caddy depuis ce repertoire. Aucun build necessaire.

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

### Perimetre actuel (v2.32.1)

- **Theme** : msyx (dark + light)
- **Pages** : 8 thematiques (`fondation`, `composants`, `navigation`, `formulaires`, `data`, `templates`, `feedback`, `divers`)
- **Viewport** : 1280x800
- **Total** : 16 baselines

Extension a 96 baselines (ACSSI + Nhood x 2 modes x 2 viewports) prevue Sprint 22 (theme generator).
