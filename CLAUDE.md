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
site.html           # Hub principal + lazy-loader des 8 categories
pages/
  fondation.html    # Couleurs, typographie, espacements, ombres, theming
  composants.html   # Cards, badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, FAB, theme switcher
  navigation.html   # Tabs, breadcrumbs, stepper, segmented control, bottom navigation
  formulaires.html  # Inputs, selects, checkboxes, file upload, login, calendrier, slider/range, search input, number input, OTP input, tag input
  data.html         # Tables, data grid, stats, charts, KPI, tree view
  templates.html    # Kanban, roadmap, backlog, sprint board
  feedback.html     # Empty states, spinners, tooltips, pagination, drawer, zone banner, modals interactifs, bottom sheet
  divers.html       # Command palette, accordion, timeline, code blocks, copy button, carousel, lightbox, context menu
shared/
  styles.css        # CSS global — @import tokens.css + composants, theming, responsive
  css/
    tokens.css      # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
    utilities.css   # Classes utilitaires couleur, backgrounds, bordures, accessibilité
  nav.js            # Header, sidebar, scroll spy, SPA navigation, LazyLoader
  components.js     # Composants JS partages (toasts, modals, tabs, kanban, sliders, chips, search inputs, data grids, carousel, copy buttons, rating, segmented controls, bottom nav, number inputs, OTP, tag inputs, tree view, bottom sheet, lightbox, context menu, FAB, theme/mode switcher)
```

## Conventions
- Chaque page importe `/shared/styles.css` + `/shared/nav.js` + `/shared/components.js`
- Variables CSS dans `:root` de `shared/styles.css` — ne pas dupliquer
- Mobile-first : tout composant doit etre responsive
- Pas de dependance externe (sauf Google Fonts)
- Nouveaux composants : ajouter dans la page thematique appropriee + mettre a jour le compteur hero dans `site.html`
- Anti-double-bind : pattern `dataset.bound` sur tous les event listeners dans components.js
- Anti-FOUC : script inline synchrone dans `<head>` de chaque page (sauf index.html)

## Navigation
- Header fixe 56px : logo + selecteur theme + toggle dark/light (toujours visible)
- Sidebar : navigation uniquement (liens de sections), scroll-spy auto-scroll
- SPA : navigateTo() fetch + DOMParser + reinit
- LazyLoader (site.html) : 8 placeholders, IntersectionObserver, deep-links #categorie et #sub-section
- Bouton "Tout charger" pour Ctrl+F global

## Theming
- 2 attributs HTML : `data-theme` (palette) + `data-mode` (dark/light)
- Cascade CSS 4 couches : `:root` → `[data-theme]` → `[data-mode="light"]` → `[data-theme][data-mode]`
- 3 themes : MSYX (dark+light), ACSSI (dark only), Nhood (dark+light)
- `THEME_CONFIG` dans components.js : modes disponibles par theme, extensible
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Toggle sun/moon dans le header, grise si theme dark-only
- Variable `--accent-rgb` : triplet RGB brut par theme, pour les declinaisons `rgba(var(--accent-rgb), X)`
- Variables RGB semantiques : `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`
- Ajouter un theme = 1 bloc CSS `[data-theme]` + `--accent-rgb` + 1 entree THEME_CONFIG + 1 option select

## Charte graphique MSYX (reference par defaut)
- Theme dark : `--primary: #0a0f1e`
- Accent bleu : `--accent: #3b82f6`
- Gradients : bleu→violet, cyan→bleu, violet→rose
- Typo : Space Grotesk (titres) + Inter (corps) + Fira Code (mono)
- Glassmorphism + border glow subtil

## Deploy
Fichiers servis directement par Caddy. Aucun build necessaire.
Modifier les fichiers → commit/push → visible immediatement.
