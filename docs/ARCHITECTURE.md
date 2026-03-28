# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).

## Structure

```
index.html              # Page login auth gate
site.html               # Hub principal + lazy-loader des 8 categories
pages/
  fondation.html        # Couleurs, typographie, espacements, ombres, theming
  composants.html       # Cards, badges, boutons, avatars, alertes, modals, toasts, theme switcher
  navigation.html       # Tabs, breadcrumbs, stepper
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier, slider/range
  data.html             # Tables, stats, charts, KPI
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # Alertes, toasts, modals (<dialog> natif), skeleton, drawer, zone banner, empty states, spinners
  divers.html           # Command palette, accordion, timeline, code blocks
shared/
  styles.css            # CSS global — ~45 variables :root (+ overrides theme/mode), composants, theming, responsive
  nav.js                # Header, sidebar, scroll spy, SPA navigation, LazyLoader
  components.js         # Composants JS (toasts, modals, tabs, kanban, sliders, dropdowns, theme/mode switcher)
docs/
  ARCHITECTURE.md       # Ce fichier
  retros/               # Retrospectives de sprint
```

## Navigation et layout

### Header fixe (56px)
- Position fixed, z-index 150, pleine largeur
- Contenu : logo msyx.design, version, selecteur theme, toggle dark/light
- Mobile : burger menu integre, version masquee
- Variable CSS : `--header-h: 56px`

### Sidebar
- Position fixed, sous le header (`top: var(--header-h)`)
- Contenu : liens de navigation uniquement (sections des pages)
- Scroll-spy : highlight automatique de la section visible, auto-scroll sidebar
- Mobile : drawer (translateX), ouvert/ferme via burger header

### Navigation SPA
- `navigateTo(href)` : fetch + DOMParser + remplacement `.main` + reinit composants
- `bindSidebarClicks()` : intercepte les clics, scroll ou navigate selon contexte
- `popstate` : gere le back/forward navigateur

### LazyLoader (site.html uniquement)
- 8 placeholders `.lazy-section` sous le hub grid
- `IntersectionObserver` (rootMargin 200px) trigger `loadSection()` au scroll
- `loadSection()` : fetch page, DOMParser, inject contenu, reinit composants + scroll spy
- Deep-links : `#fondation` (categorie) et `#colors` (sub-section) supportes
- Bouton "Tout charger" pour Ctrl+F global
- Fade-in animation sur les sections chargees
- Set `loadedSections` empeche le double-chargement

## Theming

### Architecture 2 axes
- `data-theme` sur `<html>` : palette de couleurs (msyx, acssi, nhood)
- `data-mode` sur `<html>` : mode d'affichage (dark, light)

### Cascade CSS 4 couches
1. `:root` — valeurs par defaut (MSYX dark)
2. `[data-theme="xxx"]` — palette du theme
3. `[data-mode="light"]` — mode clair generique (surfaces, textes, borders, shadows)
4. `[data-theme="xxx"][data-mode="light"]` — overrides specifiques theme+mode

### Themes disponibles
| Theme | Modes | Accent | Style |
|-------|-------|--------|-------|
| MSYX | dark, light | #3b82f6 bleu | Glassmorphism, gradients bleu/violet |
| ACSSI | dark | #e0cd1e or | Corporate bleu marine/or |
| Nhood | dark, light | #008837 vert | Corporate vert fonce/menthe |

### Persistance
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Anti-FOUC : script inline synchrone dans `<head>` de chaque page (sauf index.html)
- `THEME_CONFIG` dans components.js : modes disponibles par theme

### Toggle UI
- Selecteur theme : `<select>` dans le header
- Toggle mode : boutons lune/soleil dans le header, soleil grise si theme dark-only

## Variables CSS

~45 variables dans `:root` de shared/styles.css (+ overrides dans chaque bloc theme/mode) :
- **Couleurs** : primary, accent, surface, text, semantic (success/warning/danger/info)
- **Couleurs RGB** : `--accent-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb` (triplets bruts pour `rgba(var(...), opacity)`)
- **Couleurs etendues** : violet, cyan, pink, success/warning/danger-light/dark
- **Code syntax** : code-keyword, code-string, code-comment, code-function, code-number
- **Overlays** : overlay, overlay-heavy
- **Hub backgrounds** : hub-bg-violet, hub-bg-cyan, hub-bg-pink, hub-bg-success, hub-bg-warning
- **Chart palette** : chart-1 a chart-5
- **Gradients** : gradient-1 a gradient-4
- **Borders** : border, border-hover
- **Shadows** : shadow, shadow-lg
- **Sidebar** : sidebar-bg, sidebar-link-hover-bg, sidebar-link-active-bg
- **Layout** : sidebar-w (260px), header-h (56px), radius (xs/sm/md/lg), space (xs a 3xl)

## Composants JS interactifs

- Toasts (`showToast()`) : variantes colorees, auto-dismiss, stack
- Modals (`openModal()`) : `<dialog>` natif HTML avec `.showModal()`, focus trap gratuit, fermeture ESC/backdrop, 3 variantes (confirmation, formulaire, information)
- Tabs / Accordion : toggle sections, dataset.bound anti-double-bind
- Sliders (`initSliders()`) : sync bidirectionnelle range-number, fill dynamique via `--slider-fill`
- Dropdowns (`initDropdowns()`) : search, multi-select, option filtering
- Kanban : drag & drop natif HTML5 (dragstart, dragover, drop)
- Backlog filtres : filtrage par priority, search
- Burndown chart : animation SVG
- Calendrier : navigation mois, selection date
- Theme/Mode switcher : THEME_CONFIG, applyMode(), updateModeButtons()

## Flux de donnees

Aucun backend. Toutes les donnees sont mockees en HTML statique.
Les composants interactifs utilisent du JS vanilla avec pattern `dataset.bound` pour eviter les double-listeners lors des reinit SPA.

## Infrastructure

- Servi par Caddy file_server (pas de Docker)
- Auth gate via forward_auth Caddy + cookie HMAC msyx_auth
- Security headers importes dans le Caddyfile
- CSP : `script-src 'self' 'unsafe-inline'` (requis pour anti-FOUC)
- Deploy : git push → visible immediatement (pas de build)

## Dette technique connue

- Avatars hardcodes dans composants.html + templates.html (couleurs directes au lieu de variables)
- post-merge.sh echoue quand GitHub auto-close l'issue avant le script
- create-issue.sh passe le numero de milestone mais gh attend le nom (contournement : creation manuelle)
