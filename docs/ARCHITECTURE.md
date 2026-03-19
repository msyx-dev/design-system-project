# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).

## Structure

```
index.html              # Page login auth gate
site.html               # Hub principal — grille 8 categories
pages/
  fondation.html        # Couleurs, typographie, espacements, ombres
  composants.html       # Cards, badges, boutons, avatars, alertes, modals, toasts
  navigation.html       # Sidebar, tabs, breadcrumbs, stepper
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier
  data.html             # Tables, stats, charts, KPI
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # Empty states, spinners, tooltips, pagination
  divers.html           # Command palette, drawer, dropdown
shared/
  styles.css            # CSS global — variables :root, composants, responsive
  nav.js                # Sidebar dynamique, scroll spy, detection page active
  components.js         # Composants JS partages (toasts, modals, etc.)
docs/
  ARCHITECTURE.md       # Ce fichier
```

## Flux de donnees

Aucun backend. Toutes les donnees sont mockees en HTML statique.
Les composants interactifs (drag & drop kanban, filtres backlog, burndown) utilisent du JS vanilla.

## Conventions cles

- Variables CSS centralisees dans `:root` de `shared/styles.css`
- Mobile-first : tout composant doit etre responsive
- Chaque page importe les 3 fichiers shared (styles.css, nav.js, components.js)
- Nouveaux composants : ajouter dans la page thematique + mettre a jour le compteur hero dans site.html

## Infrastructure

- Servi par Caddy file_server (pas de Docker)
- Auth gate via forward_auth Caddy + cookie HMAC msyx_auth
- Security headers importes dans le Caddyfile
