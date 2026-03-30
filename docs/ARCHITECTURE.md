# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).
**57 composants** repartis sur 8 pages thematiques, 3 themes, mode dark/light.

## Structure

```
index.html              # Page login auth gate
site.html               # Hub principal + lazy-loader des 8 categories
pages/
  fondation.html        # Couleurs, typographie, espacements, ombres, theming
  composants.html       # Cards, badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, FAB, theme switcher
  navigation.html       # Tabs, breadcrumbs, stepper, segmented control, bottom navigation
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier, slider/range, search input, number input, OTP input, tag input
  data.html             # Tables, data grid, stats, charts, KPI, tree view
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # Empty states, spinners, tooltips, pagination, drawer, zone banner, modals interactifs, bottom sheet
  divers.html           # Command palette, accordion, timeline, code blocks, copy button, carousel, lightbox, context menu
shared/
  styles.css            # CSS global — @import tokens.css + composants, theming, responsive
  css/
    tokens.css          # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
  nav.js                # Header, sidebar, scroll spy, SPA navigation, LazyLoader
  components.js         # 20+ composants JS interactifs (voir section dediee)
docs/
  ARCHITECTURE.md       # Ce fichier
  retros/               # Retrospectives de sprint + velocity.json
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

~75 variables dans `:root` de shared/styles.css (+ overrides dans chaque bloc theme/mode) :
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

20+ fonctions init* exportees via `window.__initX` pour re-init SPA :

### Sprint 1-5 (composants fondateurs)
- **Toasts** (`showToast()`) : variantes colorees, auto-dismiss, stack
- **Modals** (`openModal()`) : `<dialog>` natif HTML avec `.showModal()`, focus trap gratuit, fermeture ESC/backdrop, 3 variantes
- **Tabs / Accordion** : toggle sections, dataset.bound anti-double-bind
- **Sliders** (`initSliders()`) : sync bidirectionnelle range-number, fill dynamique via `--slider-fill`
- **Dropdowns** (`initDropdowns()`) : search, multi-select, option filtering
- **Kanban** : drag & drop natif HTML5 (dragstart, dragover, drop)
- **Calendrier** : navigation mois, selection date
- **Theme/Mode switcher** : THEME_CONFIG, applyMode(), updateModeButtons()

### Sprint 6 (6 composants)
- **Chips** (`initChips()`) : suppression animee, filter toggle, chip input dynamique (Enter/virgule/Backspace), anti-doublon
- **Search Inputs** (`initSearchInputs()`) : clear button, suggestions filtrees, highlight `<mark>`, navigation clavier (ArrowDown/Up/Enter/Escape), a11y combobox
- **Data Grids** (`initDataGrids()`) : tri multi-colonne (localeCompare fr), filtre cumulatif ET, selection avec indeterminate, header sticky, re-render
- **Carousel** (`initCarousel()`) : navigation prev/next, dots dynamiques, auto-play (setInterval + pause hover/focus), touch swipe (seuil 50px, passive:false), MutationObserver cleanup SPA, boucle infinie
- **Copy Buttons** (`initCopyButtons()`) : navigator.clipboard.writeText, swap icone clipboard→check, tooltip, injection auto sur code blocks

### Sprint 7 (12 composants)
- **Rating** (`initRating()`) : notation etoiles interactive, hover preview, read-only, 3 tailles, event custom
- **Segmented Controls** (`initSegmentedControls()`) : indicateur slide anime (offsetLeft/offsetWidth), selection exclusive, requestAnimationFrame init
- **Bottom Nav** (`initBottomNav()`) : toggle actif, event custom bottomnav:change
- **Number Inputs** (`initNumberInputs()`) : boutons +/-, clamp min/max/step, disable aux bornes, navigation clavier ArrowUp/Down
- **FAB** (`initFAB()`) : menu radial toggle, rotation icone, fermeture clic exterieur/Escape, stagger animation
- **OTP Inputs** (`initOTPInputs()`) : auto-focus next, backspace previous, paste split, inputmode numeric
- **Tag Inputs** (`initTagInputs()`) : ajout Enter/virgule, suppression X/Backspace, anti-doublon, max tags, disable input at limit
- **Tree View** (`initTreeView()`) : expand/collapse branches, selection item, icones dossier/fichier
- **Bottom Sheet** (`initBottomSheet()`) : slide-up/down, handle drag, swipe-to-close (seuil 100px), overlay, contenu scrollable
- **Lightbox** (`initLightbox()`) : overlay plein ecran, navigation fleches/clavier, compteur, caption, galerie groupee
- **Context Menu** (`initContextMenu()`) : clic droit custom, positionnement viewport-aware, sous-menus, icones, separateurs

### Pattern commun
- Anti-double-bind : `dataset.bound` / `dataset.xxxBound` sur chaque conteneur
- Export `window.__initX` pour reinit apres navigation SPA
- Variables CSS exclusives (zero couleur hardcodee) — compatible 3 themes x 2 modes automatiquement

## Flux de donnees

Aucun backend. Toutes les donnees sont mockees en HTML statique ou en JS inline (DATA_GRID_ROWS).
Les composants interactifs utilisent du JS vanilla avec pattern `dataset.bound` pour eviter les double-listeners lors des reinit SPA.

## Infrastructure

- Servi par Caddy file_server (pas de Docker)
- Auth gate via forward_auth Caddy + cookie HMAC msyx_auth
- Security headers importes dans le Caddyfile
- CSP : `script-src 'self' 'unsafe-inline'` (requis pour anti-FOUC)
- Deploy : git push → visible immediatement (pas de build)

## Dette technique connue

- Avatars hardcodes dans composants.html + templates.html (couleurs directes au lieu de variables)
- post-merge.sh echoue quand GitHub auto-close l'issue avant le script (dette depuis sprint 4)
- Compteur footer site.html parfois desynchronise du hero (corrige manuellement)
- Issue #6 (tests visuels) toujours dans le backlog
