# CLAUDE.md — design-system
# Niveau 2 — Contexte projet

## Role
Design system vivant de msyx.fr — source de verite pour tous les composants UI.
Tout projet msyx.fr qui a besoin d'un composant manquant doit le creer ICI d'abord.

## Stack
- HTML/CSS/JS statique pur (pas de framework, pas de build)
- Servi par Caddy `file_server` (pas de Docker)
- URL : https://design-system.msyx.fr

## Structure
```
index.html          # Page login auth gate
site.html           # Hub principal — grille 8 categories
pages/
  fondation.html    # Couleurs, typographie, espacements, ombres
  composants.html   # Cards, badges, boutons, avatars, alertes, modals, toasts
  navigation.html   # Sidebar, tabs, breadcrumbs, stepper
  formulaires.html  # Inputs, selects, checkboxes, file upload, login, calendrier
  data.html         # Tables, stats, charts, KPI
  templates.html    # Kanban, roadmap, backlog, sprint board
  feedback.html     # Empty states, spinners, tooltips, pagination
  divers.html       # Command palette, drawer, dropdown
shared/
  styles.css        # CSS global — variables, composants, responsive
  nav.js            # Sidebar dynamique, scroll spy, detection page active
  components.js     # Composants JS partages (toasts, modals, etc.)
```

## Conventions
- Chaque page importe `/shared/styles.css` + `/shared/nav.js` + `/shared/components.js`
- Variables CSS dans `:root` de `shared/styles.css` — ne pas dupliquer
- Mobile-first : tout composant doit etre responsive
- Pas de dependance externe (sauf Google Fonts)
- Nouveaux composants : ajouter dans la page thematique appropriee + mettre a jour le compteur hero dans `site.html`

## Charte graphique (reference)
- Theme dark : `--primary: #0a0f1e`
- Accent bleu : `--accent: #3b82f6`
- Gradients : bleu→violet, cyan→bleu, violet→rose
- Typo : Space Grotesk (titres) + Inter (corps) + Fira Code (mono)
- Glassmorphism + border glow subtil

## Deploy
Fichiers servis directement par Caddy. Aucun build necessaire.
Modifier les fichiers → commit/push → visible immediatement.
