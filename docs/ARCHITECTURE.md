# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).
**69 composants UI** (registre shared/components-registry.json, refactor S25 #219 — components-registry resync), repartis sur 9 pages thematiques, 3 themes, mode dark/light. + resets natifs globaux (a, :focus-visible) depuis v2.31.0. + ergonomie agent (SKILL.md, canonical-pages/, prompts.md) depuis v2.32.0. + sprite SVG Lucide self-hosted (52 glyphes post-cleanup S25) + tokens icon + classe `.icon` + fallback `@supports not (backdrop-filter)` depuis v2.33.0. + Motion reference page (durations/easings/6 patterns canoniques) depuis v2.35.0. + Split components.css → 26 modules + barrel + tree-shake depuis v2.36.0. + Type modular scale ratio 1.25 (8 tokens `--type-*`) + section Pairing canonique depuis v2.37.0. + Visual regression matrice complète 120 baselines (3 thèmes × 2 modes × 10 pages × 2 viewports) depuis v2.38.0. + Theme generator JSON → CSS (themes/*.json + build-themes.js + scaffold-theme.sh) depuis v2.39.0. + Focus restore WAI APG sur modales (helper prive `attachFocusRestore` dans components.js, WCAG 2.4.3) depuis v2.41.0. + Brand identity (mark vectorisé officiel, signature spatiale, texture-grain token) depuis v2.42.0 (mark vectorisé depuis v2.43.0 #209). + Refactor nav.js prévention #206 (extract VERSION + template literals) depuis v2.43.1. + **Audit Phase 1 entièrement remédié S25** : chevron theme-aware via `--chevron-select` (v2.44.0), transitions ciblées + will-change cards (v2.45.0), tokenisation `--space-*` avec 2 nouveaux tokens (v2.46.0), restructure composants × pages (v2.47.0).
Version courante : **v2.49.0** (S28 — promotions DS : .card-link, .badge-nav, .toast-message depuis consumers S27). + v2.48.0 (S26 — reliquat audit Phase 1 : tokenisation icon/avatar sizes, 8 nouveaux tokens `--avatar-size-*` + `--card-icon-*`, P-04 à P-08 fermés).

## Structure

```
assets/                 # Brand assets SVG (v2.42.0)
  logo-msyx.svg         #   PRIMARY lockup mark+wordmark (200×60)
  logo-msyx-mark.svg    #   Mark seule (60×60) — blob organique + M espace négatif + gradient turquoise→bleu→violet
  logo-msyx-dark.svg    #   Variante fond sombre (wordmark #f1f5f9)
  logo-msyx-light.svg   #   Variante fond clair (gradient saturé + wordmark #0a0f1e)
  explorations/
    wordmark-monogram-a.svg  #   Exploration A — sommets aigus
    wordmark-monogram-b.svg  #   Exploration B — sommets arrondis
index.html              # Page login auth gate
site.html               # Hub principal + lazy-loader des 9 categories
pages/
  fondation.html        # Couleurs, typographie, espacements, ombres, theming, consommation (guide integration), texture grain (v2.42.0)
  motion.html           # Motion reference page (v2.35.0) — durations (fast/base/slow), easings (standard/spring + courbes SVG), 6 patterns canoniques (fade-in, slide-up, scale-in, stagger, skeleton-shimmer, success-bounce) + boutons Replay + prefers-reduced-motion
  composants.html       # Cards, badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, segmented control, theme switcher, sortable list, achievement badges
  navigation.html       # Tabs, breadcrumbs, stepper, bottom navigation
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier, slider/range, search input, number input, OTP input, tag input, quiz/poll, filter-bar
  data.html             # Tables, data grid, stats, charts, pie/donut, KPI, tree view, gauge, animated counters, comparison table, progress tracker
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # Empty states, spinners, tooltips, pagination, drawer, zone banner, modals interactifs, bottom sheet, FAB
  divers.html           # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks, video embed, before/after) + Interaction (accordion, command palette, context menu, copy button, decision tree)
shared/
  styles.css            # Agregateur CSS — imports tokens + utilities + layout + components + base reset
  css/
    tokens.css          # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
    utilities.css       # Classes utilitaires couleur, backgrounds, bordures, espacement, display, radius, shadows, typographie
    layout.css          # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides
    components.css      # Barrel pur (v2.36.0) — 25 @import vers shared/css/components/ dans l'ordre cascade. < 1.5 KB. Remplace le monolithique 175 KB.
    components-core.css # Barrel essentiel (v2.36.0) — 7 modules (~42 KB) : _base+buttons+cards+forms+alerts+badges+_a11y. Pour consumers légers.
    components/         # 25 modules CSS par affinité fonctionnelle (v2.36.0) :
      _base.css         #   Reset natif (a, :focus-visible global) — v2.31.0
      signature.css     #   Brand signature spatiale — gradient underline 2px sous .section-header .overline (v2.42.0)
      buttons.css       #   .btn-primary, .btn-secondary, .btn-ghost, .btn-icon, .btn-icon--danger (v2.27.0)
      cards.css         #   .card, hero sections, hub, lazy sections, .card-link (a11y wrapper v2.49.0)
      badges.css        #   .badge, .badge-nav (compact sidebar/nav v2.49.0), .chip, .kbd, .notification-dot, .achievement-badge
      theming.css       #   COLORS, TYPOGRAPHY, FOOTER, THEMING, BACKDROP-FILTER FALLBACK
      forms.css         #   INPUTS, DROPDOWN, FILE UPLOAD, SLIDER, NUMBER INPUT, SEARCH, OTP, TAG, FILTER BAR
      data.css          #   PROGRESS, STATS, CHARTS, PIE, GAUGE, ANIMATED COUNTERS, RISK MATRIX
      avatars.css       #   .avatar, .avatar-img, .avatar-initials
      tables.css        #   TABLE, DATA GRID, COMPARISON TABLE
      lists.css         #   TREE VIEW, LIST, TIMELINE, ACCORDION, SORTABLE LIST, ACTIVITY FEED
      alerts.css        #   .alert, .toast (+ .toast-message flex-grow v2.49.0), .zone-banner
      overlays.css      #   TOOLTIP, CONTEXT MENU, ACTION MENU
      navigation.css    #   TABS, BREADCRUMB, STEPPER, BOTTOM NAVIGATION, SIDEBAR RAIL
      modals.css        #   MODAL, MODAL DIALOG, POPOVER, COMMAND PALETTE, DRAWER, BOTTOM SHEET, CONFIRM POPOVER
      feedback.css      #   SKELETON, DIVIDER, RATING, EMPTY STATES, PAGINATION, SPINNERS, SKELETON PREFABS
      interactive.css   #   CODE (.code-block + .code-inline refactor v2.50.0), COPY BUTTON, FAB, SEGMENTED CONTROL, INLINE EDITING, AUTO-SAVE, ICON (.icon v2.33.0)
      templates.css     #   TEMPLATES (kanban, sprint, roadmap, backlog)
      media.css         #   CAROUSEL, LIGHTBOX, VIDEO EMBED, BEFORE/AFTER SLIDER
      _responsive.css   #   @media composants
      tracker.css       #   PROGRESS TRACKER, DECISION TREE, WIZARD MULTI-STEP
      quiz.css          #   QUIZ / POLL
      _a11y.css         #   ACCESSIBILITY (focus-visible global, theme-transition, prefers-reduced-motion, disabled global v2.40.2)
      pricing.css       #   PRICING TABLE, SETTINGS PANEL, COMMENTS/THREAD, AUTH FLOWS, UPGRADE PROMPT
      notifications.css #   NOTIFICATION CENTER
      motion.css        #   MOTION REFERENCE PAGE (durations, easings, 6 patterns — v2.35.0)
  sync.sh                    # Synchronise les 4 fichiers CSS vers un projet consommateur (--no-showcase via marqueurs @strip + awk)
  sync-all.sh                # Sync scalable — synchronise vers tous les consommateurs enregistrés (consumers.json)
  check-sync.sh              # Vérifie version sur les 4 fichiers CSS + mode --check-overrides
  check-components.sh        # Lint consommateurs — détecte composants custom hors DS
  build.sh                   # Minification assets CSS (csso) + JS (terser) → dist/
  consumers.json             # Registre des projets consommateurs pour sync-all.sh
  components-registry.json   # Registre de tous les composants DS (classes CSS, init JS, page)
  CONSUMER_GUIDE.md          # Guide d'integration + règle d'or + scripts de vérification
  nav.js                     # Header, sidebar, scroll spy, SPA navigation, LazyLoader
  components.js              # 30+ composants JS interactifs (voir section dediee)
docs/
  ARCHITECTURE.md       # Ce fichier
  retros/               # Retrospectives de sprint + velocity.json
SKILL.md                # Manifest agent user-invocable (v2.32.0) — regles tokens, voix, glass/solid, workflow absorption, versioning. Section « Glass vs solid » (v2.33.0).
prompts.md              # Phrases-types reutilisables pour agents (v2.32.0)
canonical-pages/        # 6 pages HTML de reference agent (v2.32.0)
shared/icons/           # Sprite SVG Lucide self-hosted (v2.33.0)
  sprite.svg            # 50 glyphes Lucide concatenes (21 KB apres svgo, < 50 KB cible)
  build-sprite.sh       # Build reproductible : npm install lucide-static + svgo + concat
  login.html            # Page de connexion : card centree, inputs email+password, toggle remember-me
  settings.html         # Parametres : 2 colonnes, 4 sections (profil, securite, notifications, preferences)
  dashboard-kanban.html # Tableau Kanban : 4 colonnes, toolbar (search + filter-bar + CTA)
  empty-state.html      # 3 variantes : aucun resultat, pas de donnees, erreur chargement
  error-404.html        # Erreur 404 : code large, card centree, 2 CTA
  billing.html          # Facturation : 3 plans tarifaires, abonnement actuel, historique
```

## Agent ergonomics (v2.32.0)

Depuis v2.32.0, le DS expose des artefacts destines aux agents IA (Claude Code et autres) :

- **`SKILL.md`** : manifest user-invocable (frontmatter YAML `user-invocable: true`). Regle tokens, voix, glass/solid, pattern absorption issue, pré-allocation versions.
- **`prompts.md`** : 12 phrases-types full-diacritics pour inclure dans les prompts agents.
- **`canonical-pages/`** : 6 pages HTML autonomes (tokens-only, anti-FOUC, multi-theme) que les agents copient comme reference d'usage plutôt que d'inventer.
- **`shared/components-registry.json`** : champ `example` (string HTML) sur chaque composant — copy-paste ready.

Ces fichiers ne sont pas des demos publiques (pas de lien depuis site.html) : ils sont des references pour les agents, pas pour les utilisateurs finaux.

## Iconography (depuis v2.33.0)

Sprite SVG self-hosted Lucide (~50 glyphes) — convention `<svg class="icon"><use href="/shared/icons/sprite.svg#i-name"/></svg>`.

- **Tokens** : `--icon-size-sm` (16px), `--icon-size-md` (20px), `--icon-size-lg` (24px), `--icon-stroke` (1.5)
- **Classe** : `.icon` (default `--icon-size-md`) + variantes `.icon--sm` / `.icon--lg`. `stroke: currentColor` permet l'heritage de couleur depuis le contexte.
- **Build** : `bash shared/icons/build-sprite.sh` — pipeline reproductible (lucide-static npm + svgo --multipass + concat symboles)
- **Glyphes disponibles** : 50 — navigation (home, menu, chevron-{up,down,left,right}, arrow-{left,right}), action (plus, minus, edit, trash, copy, link, external-link, download, upload, refresh-cw), status (check, x, info, alert-{circle,triangle}, check-circle, x-circle, loader), content (file, folder, image, code, terminal, layout, layers, package), user (user, users, mail, phone, calendar, clock, eye, lock, search, bell, message-circle), system (sun, moon, palette, settings, zap, sparkles, rocket, github, slack, git-branch)
- **Migration v2.32.2 → v2.33.0** : entites HTML (`&#XXXX;`) + emoji UI cibles → convention `<use>` sur 8 pages thematiques + index.html + site.html + canonical-pages + components.js. Cas non migres intentionnellement : symboles typographiques (kbd `⌘`/`⇧`, drag handles `⋮⋮`, `+`, `×`, `★`, `●`), donnees JS dans `MSYX_HEADER`, emoji UGC, glyphes sans equivalent Lucide.
- **Fallback CSS** (#185 absorbe) : `@supports not (backdrop-filter: blur(20px))` retourne `var(--surface)` solide pour `.glass-card`, `.modal*`, `.sidebar`, `.header`, `.toast`, `.drawer`. Regle DS : « glass for chrome, solid for content » (documentee dans `pages/fondation.html` + `SKILL.md`).

## Visual regression (depuis v2.32.1)

Filet de regression visuel automatique via Playwright. Detaille dans le README.

- **Outils** : `@playwright/test` + `serve` (devDeps uniquement)
- **Perimetre** : 108 baselines (3 themes x 2 modes x 9 pages thematiques x 2 viewports) — etendu Sprint 22 (#191, v2.38.0)
- **Projects Playwright** : 12 (`<theme>-<mode>-<viewport>`, ex: `msyx-dark-desktop`, `acssi-light-mobile`)
- **Localisation baselines** : `visual-tests/baseline/<theme>-<mode>-<viewport>/<slug>.png`
- **CI** : `.github/workflows/visual.yml` — bloque les PR si diff > seuil, timeout 30 min
- **Pas d'impact prod** : Caddy `file_server` ignore `node_modules/`, `package.json`, `playwright.config.ts`. Le runtime DS reste 100% static.

## A11y audit (depuis v2.52.0 — #242)

Infrastructure d'audit d'accessibilité automatisé via axe-core.

- **Outils** : `@axe-core/playwright` v4.x (devDep) — API Deque officielle `AxeBuilder`
- **Spec** : `visual-tests/a11y.spec.ts` — distinct de `visual.spec.ts`, pas d'impact sur les 108 baselines VR
- **Matrice** : 9 pages × 3 thèmes × 2 modes = 54 runs (même couverture que VR sans viewport)
- **Règles** : `wcag2a`, `wcag2aa`, `wcag21aa` (WCAG 2.0 + 2.1 A/AA)
- **Config dédiée** : `playwright.a11y.config.ts` — 1 projet Chromium, port 3001, séparé du pipeline VR
- **Mode dry-run** : ne fait jamais échouer le test sur violation (logger seulement)
- **Rapport** : `docs/audit-a11y-<date>.md` — généré en `afterAll`, tableau par règle + détail par run
- **CI** : `.github/workflows/a11y.yml` — séparé de `visual.yml`, `continue-on-error: true`, artifact uploadé
- **Scripts npm** : `test:a11y` (run) + `test:a11y:report` (open report HTML)
- **Résultat initial** (v2.52.0, 2026-05-09) : 0 violations sur 54 runs Chromium local

## Navigation et layout

### Header fixe (56px)
- Position fixed, z-index 150, pleine largeur
- Contenu : logo msyx.design, version, selecteur theme, toggle dark/light
- Zone utilisateur (auth) : avatar cliquable + dropdown menu + cloche notifications + panel popover
- Configuration consommateur : `window.MSYX_HEADER` (auth, user, notifications, menu)
- Sans `window.MSYX_HEADER` ou `auth: false` : header minimal (logo + theme switcher)
- **Mode démo DS** : toutes les pages du DS définissent `window.MSYX_HEADER` avec un user "Preview" et 3 notifications fictives, activant le header enrichi en conditions réelles
- Mobile : burger menu integre, version masquee
- Variable CSS : `--header-h: 56px`
- Fonctions nav.js : `buildHeader()`, `initHeaderUser()`, `initHeaderNotifications()`, `updateHeaderUser()`, `updateNotificationCount()`, `renderNotifications()`

### Sidebar
- Position fixed, sous le header (`top: var(--header-h)`)
- Contenu : liens de navigation uniquement (sections des pages)
- Scroll-spy : highlight automatique de la section visible, auto-scroll sidebar
- `.sidebar-link-disabled` / `[aria-disabled="true"]` : variante disabled (opacity 0.4, pointer-events none)
- `.sidebar-sublinks` : container sous-navigation indentee (padding-left, font-size reduit)
- Mobile : drawer (translateX), ouvert/ferme via burger header

### Navigation SPA
- `navigateTo(href)` : fetch + DOMParser + remplacement `.main` + reinit composants
- `bindSidebarClicks()` : intercepte les clics, scroll ou navigate selon contexte
- `popstate` : gere le back/forward navigateur

### LazyLoader (site.html uniquement)
- 9 placeholders `.lazy-section` sous le hub grid (8 → 9 depuis v2.35.0 : ajout motion)
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
| ACSSI | dark, light | dark: #e0cd1e or / light: #00345f marine | Corporate bleu marine/or |
| Nhood | dark, light | #008837 vert | Corporate vert fonce/menthe |

### Persistance
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Anti-FOUC : script inline synchrone dans `<head>` de chaque page (sauf index.html)
- `THEME_CONFIG` dans components.js : modes disponibles par theme

### Toggle UI
- Selecteur theme : `<select>` dans le header
- Toggle mode : boutons lune/soleil dans le header (tous les themes supportent dark+light depuis v2.14)

## Variables CSS

~75 variables dans `:root` de shared/styles.css (+ overrides dans chaque bloc theme/mode) :
- **Couleurs** : primary, accent, surface, text, semantic (success/warning/danger/info)
- **Couleurs RGB** : `--accent-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`, `--deco-violet-rgb`, `--deco-cyan-rgb`, `--text-muted-rgb` (triplets bruts pour `rgba(var(...), opacity)`)
- **Couleurs etendues** : violet, cyan, pink, success/warning/danger-light/dark
- **Token thème-aware `--text-on-accent`** : couleur de texte garantissant WCAG AA minimum sur fond `var(--accent)`. Valeurs par thème :

  | Thème / Mode        | Valeur     | Contraste sur `--accent` |
  | ------------------- | ---------- | ------------------------ |
  | MSYX dark/light     | `#ffffff`  | 4.5:1 sur bleu (AA)      |
  | ACSSI dark          | `#00243f`  | 8.21:1 sur or (AAA)      |
  | ACSSI light         | `#ffffff`  | 12.7:1 sur marine (AAA)  |
  | Nhood dark/light    | `#ffffff`  | 4.6:1 sur vert (AA)      |

  Usage : `color: var(--text-on-accent)` quand un composant pose son texte sur fond `var(--accent)` (ou `color-mix` densément teinté accent ≥ 80%). Ne pas utiliser `--accent-light` comme couleur de texte sur fond `--accent` plein.

- **Recalibrage a11y ACSSI light v2.30.0** (#164) : tokens texte du bloc `[data-theme="acssi"][data-mode="light"]` recalibrés pour conformité WCAG AA :
  - `--text-muted` : `#3d5a73` → `#2c4358` (2.56:1 → 5.45:1 sur blanc — AA normal text)
  - `--text-muted-rgb` : sync triplet `61, 90, 115` → `44, 67, 88`
  - `--text-dim` : `#5a7a94` → `#4a6a84` (3.97:1 sur blanc — AA Large/UI only)
  - `--text-on-accent` : déjà figé à `#ffffff` dans le bloc light (9.7:1 sur marine `#00345f` — AAA)
  - `--accent-light` (#00457a) : inchangé — reste décoratif sur fonds tintés, jamais comme texte sur `--accent` solide
  - Paires safe documentées dans `shared/CONSUMER_GUIDE.md` § "Paires fg/bg safe — ACSSI light"
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

30 fonctions init* exportees via `window.__initX` pour re-init SPA :

### Sprint 1-5 (composants fondateurs)
- **Toasts** (`showToast()`) : variantes colorees, auto-dismiss, stack
- **Modals** (`openModal()`) : `<dialog>` natif HTML avec `.showModal()`, focus trap gratuit, fermeture ESC/backdrop, 3 variantes. Helper prive `attachFocusRestore(dialog)` integre dans `initModals()` + `__openModal` (v2.41.0) : pattern WAI APG — capture `document.activeElement` au `showModal()`, restore au `close`, idempotent via `__focusRestoreAttached`, couvre les 4 voies de fermeture, edge cases trigger null/removed geres silencieusement. Ref : aksy UC-288, issue #174.
- **Tabs / Accordion** : toggle sections, dataset.bound anti-double-bind
- **Sliders** (`initSliders()`) : sync bidirectionnelle range-number, fill dynamique via `--slider-fill`
- **Dropdowns** (`initDropdowns()`) : search, multi-select, option filtering
- **Kanban** : drag & drop natif HTML5 (dragstart, dragover, drop)
- **Calendrier** : navigation mois, selection date
- **Theme/Mode switcher** : THEME_CONFIG, applyMode(), updateModeButtons()

### Sprint 6 (6 composants)
- **Chips** (`initChips()`) : suppression animee, filter toggle, chip input dynamique (Enter/virgule/Backspace), anti-doublon
- **Search Inputs** (`initSearchInputs()`) : clear button, suggestions filtrees, highlight `<mark>`, navigation clavier (ArrowDown/Up/Enter/Escape), a11y combobox
- **Data Grids** (`initDataGrids()`) : tri multi-colonne (localeCompare fr), filtre cumulatif ET, selection avec indeterminate, header sticky, re-render. Convention tri canonique : `.data-grid-sortable` sur `<th>` + `.data-grid-sort-icon` sur l'icone enfant ; `aria-sort` géré par le JS. Ne pas utiliser d'alias non-préfixé `.sort-icon` (refs #153 / aksy#218). Modifier CSS `.data-grid-col-sticky-end` : colonne sticky right (`position: sticky; right: 0; z-index: 1`), fond `--surface-solid`, ombre `--shadow-sm`, corner th `z-index: 3` — promu depuis DS-EXCEPTION aksy (chantiers/orga/SAP) v2.28.0 (#157)
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

### Sprint 8+ (nouveaux composants — CSS pur)
- **Achievement Badges** : badges de gamification CSS pur, etats locked/unlocked/new (glow animation `achievementGlow`), niveaux bronze/silver/gold (border-color), progress bar, `rgba(var(--accent-rgb), X)` pour la lueur

### Sprint 8+ (composants interactifs)
- **Sortable List** (`initSortableLists()`) : liste reorderable par drag-and-drop HTML5 (dragstart/dragover/drop), poignee de glissement `.sortable-handle`, feedback visuel `.dragging`/`.drag-over`, support tactile via pointer events (pointerdown/move/up + clone fantome), auto-numerotation pour `.sortable-list--numbered`, anti-double-bind dataset.bound
- **Video Embeds** (`initVideoEmbeds()`) : lecteur video responsive 16:9, lazy-load iframe au clic sur overlay (.video-embed-overlay), bouton play circulaire accent, classe `.loaded` masque l'overlay, support clavier (Enter/Space), variante card (.video-card), autoplay a l'activation, anti-double-bind dataset.bound
- **Before/After Slider** (`initBeforeAfter()`) : comparaison visuelle avant/apres, handle draggable (mouse + touch), clip-path dynamique sur `.before-after-before`, position handle synchronisee, clampage 5%-95%, anti-double-bind dataset.bound
- **Quiz / Poll** (`initQuiz()`) : mode quiz (scoring, feedback correct/wrong, auto-avance 1s, barre de progression, score final, restart) et mode poll (resultats en barres avec pourcentages generes, animation fill), fieldset/legend accessibles, aria-live sur feedback et resultats, anti-double-bind dataset.bound
- **Pie & Donut Charts** (`initPieCharts()`) : graphiques circulaires SVG dynamiques, pie path-arc + donut stroke-dasharray, 3 variantes (pie/donut/mini), legende interactive avec highlight, couleurs via --chart-N ou semantic (success/warning/danger), animation IntersectionObserver, anti-double-bind dataset.bound
- **Gauge / Speedometer** (`initGauges()`) : jauge semi-circulaire SVG (arc path), data-value/data-max/data-thresholds, seuils colorés (danger ≤30%, warning ≤70%, success >70%), variante mini (.gauge--mini), animation stroke-dashoffset via IntersectionObserver, anti-double-bind dataset.bound
- **Animated Counters** (`initAnimatedCounters()`) : animation requestAnimationFrame de 0 a la valeur cible (data-target), easeOutQuart 1.5s, support decimals (data-decimals), prefix/suffix, trigger IntersectionObserver au scroll, anti-double-bind dataset.bound + dataset.counted
- **Progress Trackers** (`initProgressTrackers()`) : anneaux SVG circulaires (stroke-dasharray/dashoffset), data-progress (0-100), data-steps + data-current pour dots d'etapes (done/active/pending), multi-ring concentriques (data-rings JSON), animation IntersectionObserver au scroll, anti-double-bind dataset.bound
- **Decision Tree** (`initDecisionTree()`) : arbre de decision interactif step-by-step, clic sur `.dtree-choice` revele le noeud suivant (data-next), connecteurs `.dtree-connector` animes, bouton reset, variante resultat `.dtree-node--result` en couleur success, anti-double-bind dataset.bound
- **Risk Matrix** (`initRiskMatrix()`) : grille CSS Grid NxN (3/4/5) probabilite x impact, cellules colorees par niveau de risque (score = prob * impact), points interactifs data-prob/data-impact, tooltip riche hover/focus, modal detail via `__openModal(bodyHTML)`, gestion collisions avec stack et overflow badge, IntersectionObserver animation apparition + fallback visibilité immédiate pour SPA, pattern dataset.bound
- **Usage Meter** (`initUsageMeter()`) : barres de progression avec fill animé, IntersectionObserver + fallback visibilité immédiate pour SPA, pattern dataset.bound

### Sprint 20 (Motion reference page — v2.35.0)
- **Motion Replay** (`initMotionReplay()`) : bouton « Replay » par pattern — retire les classes d'animation, force un reflow (`void offsetWidth`), les réajoute. Pattern `dataset.bound` anti-double-bind.
- **Motion Viewport** (`initMotionViewport()`) : `IntersectionObserver` (threshold 0.1) qui ajoute `.is-paused` aux sections `.motion-demo` et `.motion-pattern` hors viewport, pausant toutes leurs animations (perf mobile).

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

## Brand identity (depuis v2.42.0)

### Wordmark SVG

Le logo msyx est un SVG vectoriel généré sans outil éditeur graphique. Il capture l'esprit du logo historique (PNG `/tmp/sprint-23-context/reference-logo-msyx.png`) :

- **Blob organique** : forme arrondie irrégulière (plectre/bec de guitare), chemin cubique
- **M en espace négatif** : double sommet (vagues/montagnes), créé via `fill-rule="evenodd"` sur le même `path` complexe
- **Gradient vertical** : `#10b981` (turquoise) → `#3b82f6` (bleu) → `#8b5cf6` (violet)
- **Wordmark texte** : "msyx" en `currentColor` (adaptation thème automatique) — Space Grotesk 700

Fichiers dans `assets/` :
- `logo-msyx.svg` (200×60) — lockup PRIMARY pour headers
- `logo-msyx-mark.svg` (60×60) — mark seule, favicon-ready
- `logo-msyx-dark.svg` (200×60) — variante fond sombre explicite
- `logo-msyx-light.svg` (200×60) — variante fond clair (gradient saturé)
- `explorations/wordmark-monogram-{a,b}.svg` — historique de conception

Contraintes respectées : ≤ 1 path complexe par variante, pas de garbage éditeur, `role="img"` + `<title>`, viewBox normalisé.

### Signature spatiale

Module `signature.css` (importé dans `components.css` après `_base.css`). Gradient underline 2px via `::after` sur `.main .section-header .overline`. Accent visuel 32×2px, `var(--gradient-1)`, `border-radius: 2px`. Appliqué automatiquement sur toutes les pages via le barrel.

### Token texture grain

`--texture-grain` + `--texture-grain-opacity: 0.015` dans `tokens.css`. Formalise `--noise-texture` (#12). `body::after` dans `styles.css` utilise ces tokens. Documenté dans `pages/fondation.html#texture`.

## Process ajout composant

Pour ajouter un nouveau composant au DS, suivre la checklist dans `CLAUDE.md` section "Process ajout composant".

Fichiers modifies pour chaque composant :
1. `pages/{categorie}.html` — section HTML + demo
2. `shared/styles.css` — section CSS dediee
3. `shared/components.js` — fonction init* (si interactif)
4. `site.html` — compteur hero
5. `shared/css/tokens.css` + `shared/css/utilities.css` — bump @ds-version
6. `shared/nav.js` — bump header-version
7. `docs/ARCHITECTURE.md` — structure + composants JS
8. `CLAUDE.md` — description page + conventions
9. `RELEASES.md` — changelog

## Convention a11y — zéro `color: white` hardcodé (v2.30.1, #165)

Règle absolue depuis v2.30.1 : **aucune valeur `color: white`, `color: #fff` ou `color: #ffffff` hardcodée** dans `shared/css/`. Utiliser exclusivement `color: var(--text-on-accent)` quand le texte est posé sur un fond `--accent`, `--gradient-*`, `--danger` ou tout fond teinté.

Exception autorisée : si le fond est **thème-indépendant** (ex. `rgba(0,0,0,0.5)`) et que `--text-on-accent` produirait un contraste inversé, conserver `#fff` avec commentaire explicite `/* a11y: fond indépendant du thème, blanc lisible toujours */`.

Vérification : `grep -rn "color:\s*white\|color:\s*#fff[^a-f]" shared/css/` doit retourner uniquement les dérogations commentées.

## Dette technique connue

- Avatars hardcodes dans composants.html + templates.html (couleurs directes au lieu de variables)
- post-merge.sh echoue quand GitHub auto-close l'issue avant le script (dette depuis sprint 4)
- Compteur footer site.html parfois desynchronise du hero (corrige manuellement)
- Issue #6 (tests visuels) toujours dans le backlog