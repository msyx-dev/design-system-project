# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).
**88 composants UI** (registre shared/components-registry.json — +10 entrées templates/data #508 ; champ `module[]` pont page↔module auto-dérivé #506), repartis sur 9 pages thematiques, 3 themes, mode dark/light. + resets natifs globaux (a, :focus-visible) depuis v2.31.0. + ergonomie agent (SKILL.md, canonical-pages/, prompts.md) depuis v2.32.0. + sprite SVG Lucide self-hosted (52 glyphes post-cleanup S25) + tokens icon + classe `.icon` + fallback `@supports not (backdrop-filter)` depuis v2.33.0. + Motion reference page (durations/easings/6 patterns canoniques) depuis v2.35.0. + Split components.css → modules + barrel + tree-shake depuis v2.36.0 (30 modules CSS aujourd'hui). + Type modular scale ratio 1.25 (8 tokens `--type-*`) + section Pairing canonique depuis v2.37.0. + Visual regression matrice complète 120 baselines (3 thèmes × 2 modes × 10 pages × 2 viewports) depuis v2.38.0. + Theme generator JSON → CSS (themes/*.json + build-themes.js + scaffold-theme.sh) depuis v2.39.0. + Focus restore WAI APG sur modales (helper prive `attachFocusRestore` dans components.js, WCAG 2.4.3) depuis v2.41.0. + Brand identity (mark vectorisé officiel, signature spatiale, texture-grain token) depuis v2.42.0 (mark vectorisé depuis v2.43.0 #209). + Refactor nav.js prévention #206 (extract VERSION + template literals) depuis v2.43.1. + **Audit Phase 1 entièrement remédié S25** : chevron theme-aware via `--chevron-select` (v2.44.0), transitions ciblées + will-change cards (v2.45.0), tokenisation `--space-*` avec 2 nouveaux tokens (v2.46.0), restructure composants × pages (v2.47.0).
Version courante : **v2.79.0** (`.card-media` variante carte à vignette bleed image-first + `.card-thumb`/`.card-body` + token `--card-thumb-h:160px` ; compatible `.card-link`/`.card-muted` ; section vitrine `#card-media` dans composants.html ; drift `package.json` racine 2.77→2.79 corrigé ; demandé par refonte mikpulse #37). + v2.78.0 (support consumers sans rail — `.page-content`/`.main--no-rail` layout sans sidebar #567, `.hidden-mobile`/`.hidden-desktop` utilitaires responsive breakpoint 768px #568, `.card-muted` variante carte WCAG-safe `--opacity-muted:0.85` #569, header brand configurable `window.MSYX_HEADER.brand` #570 ; tokens `--bottom-nav-h`/`--content-max`/`--opacity-muted` ; demandé par refonte mikpulse). + v2.77.0 (M#44 soldé — Epic #517 consolidation des doublons : `.mode-switch` canonique #518, stepper `.wizard-step`→`.stepper` #521, `tag-input` canonique #522, messaging `.alert`+`--kpi`/`--cta` #519, primitif `.menu` #520 ; 5 consolidations non-breaking, alias `@deprecated`→v3). + v2.76.0 (M#43 soldé — vitrine : split `feedback`→nouvelle page `overlays` + `motion`→`fondation`, `motion.html` supprimée, baselines VR régénérées par récolte actuals CI #514). + v2.75.0 (lot churn-VR M#43 — réorg modules CSS par destination : `.login-*` pricing→forms #510, éclatement interactive/pricing #512, fusion modals→overlays #513, 0 diff rendu). + v2.74.0 (Sprint #43 taxonomie & registre — pont page↔module `module[]` auto-dérivé #506, doc core preset 9 modules réels #507, registre complété 88 entrées #508, règle frontière page↔registre + check CI warn-only #511). + v2.73.0 (header par défaut consumers : cloche hors auth, switcher thème opt-in #542). + v2.70.0 (M#44 — sidebar manifeste build, ZÉRO fetch runtime #528). + v2.69.1 (fix demo-grid overflow minmax #529/#532). + v2.69.0 (M#43 — sidebar dynamique NAV_PAGES + scan DOM, 6 liens morts + 38 orphelines #509). + v2.68.0 (M#43 — champ react registre + check CI parité + DS-PRINCIPLES §8.1 #523). + v2.67.1 (M#43 — 9 classes fantômes registre corrigées + validateur CI #516). + v2.67.0 (dette soldée : M#37/38/39 fermés, entrypoint VERSION). + v2.66.0 (S38 — socle base.css distribué consumers via sync.sh #362). + v2.65.0 (S36 — clôture Epic #344 a11y cleanup résiduel : aria-prohibited-attr donut chart #349, label residual #348 critical, aria-required-children user-menu #347 critical, scrollable-region #346, color-contrast résiduel #345 — **bilan global Epic #337+#344 : 141 → 17 violations / -88%, critical 60 → 0 / -100%**). + v2.64.9 (S36 — label résiduel sliders/date pickers, 54 nœuds critical). + v2.64.8 (S36 — aria-required-children user-menu, 6 nœuds critical). + v2.64.7 (S36 — scrollable-region résiduel, 12 nœuds). + v2.64.6 (S36 — color-contrast résiduel, 14 fixes ciblés, 458 nœuds résorbés). + v2.64.5 (S35 — a11y WCAG AA Lots 1+2+3 : ARIA quick wins #338, color-contrast tokens #339, labels+scrollable-region #340, 141→78 violations / -45%, 60→12 critical / -80%, Epic #337 clos). + v2.64.4 (S35 — color-contrast 4 chaînes tokens recalibrées, ~1900 nœuds résolus). + v2.64.3 (S35 — ARIA quick wins, button-name/select-name/aria-required-attr/aria-prohibited-attr, ~210 nœuds). + v2.56.1 (#286 — fix harness VR/a11y, capture par section, baselines régénérées 1032). + v2.56.0 (S32 — brand identity, wordmark DS, mode-switch iOS). + v2.55.0 (S32 — mode toggle switch iOS-style). + v2.54.11 (S32 — polish boutons theme-aware). + v2.53.0 (S30 — Lighthouse CI baseline 1 page × MSYX dark, #240). + v2.52.0 (S30 — axe-core a11y dry-run infrastructure, #242). + v2.51.0 (S30 — perf budget gzip + CI warn-only, #239). + v2.50.0 (S29 — .code-inline refactor tokens canoniques). + v2.49.0 (S28 — promotions DS : .card-link, .badge-nav, .toast-message depuis consumers S27). + v2.48.0 (S26 — reliquat audit Phase 1 : tokenisation icon/avatar sizes, 8 nouveaux tokens `--avatar-size-*` + `--card-icon-*`, P-04 à P-08 fermés).
last_reviewed: 2026-07-01

## Structure

```
assets/                 # Brand assets SVG (v2.43.0)
  logo-msyx.svg         #   PRIMARY mark seul vectorisé depuis le source officiel MSYX (viewBox 1475×1562, quasi-carré). Gradient vertical turquoise→vert→bleu→violet. PAS de wordmark texte, PAS de lockup
  logo-msyx-mark.svg    #   Mark alias (identique à logo-msyx.svg)
  logo-msyx-dark.svg    #   Variante fond sombre (gradients saturés)
  logo-msyx-light.svg   #   Variante fond clair (gradients assombris pour contraste WCAG AA)
  logo-acssi*.svg       #   Marks ACSSI (mark/dark/light/lockup)
  sources/
    logoMSYX.png        #   Source de référence officiel msyx.fr (mark only, 1475×1562 PNG)
  explorations/         #   Historique conception S23 (NE PAS SUPPRIMER)
    wordmark-monogram-a.svg  #   Exploration A — sommets aigus
    wordmark-monogram-b.svg  #   Exploration B — sommets arrondis
index.html              # Page login auth gate
site.html               # Hub principal + lazy-loader des 9 categories
pages/
  getting-started.html  # Installation (3 niveaux), premiers pas, theming, tokens, bonnes pratiques
  fondation.html        # Couleurs, typographie, espacements, ombres, theming, consommation (guide integration), texture grain (v2.42.0) + Motion (durations, easings, 6 patterns — rapatrié depuis motion.html #514)
  composants.html       # Cards (+ .card-muted v2.78.0 #569), badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, segmented control, theme switcher, sortable list, achievement badges
  navigation.html       # Tabs, breadcrumbs, stepper, bottom navigation, brand header configurable (window.MSYX_HEADER.brand — v2.78.0 #570)
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier interactif single/range INLINE + time-picker 24h/12h (#432/#436), slider/range, search input, number input, OTP input, tag input, quiz/poll, filter-bar
  data.html             # 16 sections en 5 familles (v2.71.0+) — Graphiques (charts, pie-donut) · Indicateurs chiffrés (stats, animated-counters) · Jauges & progression (progress, progress-tracker, gauge, usage-meter) · Tabulaire (tables, comparison, data-grid, server-data-grid) · Listes & flux (tree-view, lists, activity-feed, risk-matrix)
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # 12 sections états — alertes (.alert--kpi ex-zone-banner, .alert--cta ex-upgrade-prompt #519), toasts, skeleton, empty states, spinners, auto-save, pagination, comments, access-denied (#514)
  overlays.html         # 7 sections surfaces flottantes — modals, drawer, bottom sheet, FAB, notification center, confirm popover, tooltip (scindé depuis feedback.html #514)
  divers.html           # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks, video embed, before/after) + Interaction (accordion, command palette, context menu, copy button, decision tree)
shared/
  styles.css            # Agregateur CSS — 7 @import : fonts + tokens + themes + utilities + layout + components + base
  css/
    fonts.css           # @font-face self-hosted (Space Grotesk, Inter, Fira Code — woff2, font-display swap)
    tokens.css          # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
    themes.css          # AUTOGÉNÉRÉ depuis themes/*.json par `node shared/build-themes.js` — blocs [data-theme] acssi/nhood (NE PAS éditer à la main)
    base.css            # Socle global (reset, focus accessible, body, texture grain) — synchronisé vers consumers en ds-base.css
    utilities.css       # Classes utilitaires couleur, backgrounds, bordures, espacement, display, radius, shadows, typographie
    layout.css          # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides
    components.css      # Barrel pur (v2.36.0) — 33 @import vers shared/css/components/ dans l'ordre cascade. < 1.5 KB. Remplace le monolithique 175 KB.
    components-core.css # Barrel essentiel (v2.36.0) — 10 modules pour consumers légers (menu.css ajouté v2.77.0 #520 — requis par les alias forms/navigation).
    components/         # 33 modules CSS par affinité fonctionnelle (v2.77.0, +menu.css #520, +prose.css #439, +orb.css #357) :
      _base.css         #   Reset natif (a, :focus-visible global) — v2.31.0
      orb.css           #   Primitif ambient background décoratif — .orb + modifs couleur/taille + .orb--float opt-in (#357)
      menu.css          #   Primitif surface flottante mutualisée — .menu/.menu-item/.menu-divider, token --shadow-menu, alias @deprecated v3 (#520)
      signature.css     #   Brand signature spatiale — gradient underline 2px sous .section-header .overline (v2.42.0)
      brand.css         #   Brand identity — wordmark + mark DS (v2.56.0)
      section-header.css#   .section-header + .overline (titres de section)
      buttons.css       #   .btn-primary, .btn-secondary, .btn-ghost, .btn-icon, .btn-icon--danger (v2.27.0)
      cards.css         #   .card, hero sections, hub, lazy sections, .card-link (a11y wrapper v2.49.0), .card-muted (WCAG-safe v2.78.0), .card-media/.card-thumb/.card-body (vignette bleed v2.79.0)
      badges.css        #   .badge, .badge-nav (compact sidebar/nav v2.49.0), .chip, .kbd, .notification-dot, .achievement-badge
      theming.css       #   COLORS (+ .color-grid--compact v2.54.7), TYPOGRAPHY, FOOTER, THEMING, BACKDROP-FILTER FALLBACK, THEME PREVIEW CARDS (.theme-card v2.54.7)
      forms.css         #   INPUTS, DROPDOWN, FILE UPLOAD, SLIDER, NUMBER INPUT, SEARCH, OTP, TAG, FILTER BAR, PASSWORD TOGGLE, LOGIN / LOGINSCREEN (3 variants Authentik, slots providers, v2.57.0)
      data.css          #   PROGRESS, STATS, CHARTS, PIE, GAUGE, ANIMATED COUNTERS, RISK MATRIX
      avatars.css       #   .avatar, .avatar-img, .avatar-initials
      tables.css        #   TABLE, DATA GRID, COMPARISON TABLE
      lists.css         #   TREE VIEW, LIST, TIMELINE, ACCORDION, SORTABLE LIST, ACTIVITY FEED
      alerts.css        #   .alert (+ .alert--kpi ex-zone-banner, .alert--cta ex-upgrade-banner #519), .toast (+ .toast-message flex-grow v2.49.0) — alias @deprecated .zone-banner/.upgrade-banner (suppression v3)
      overlays.css      #   TOOLTIP, CONTEXT MENU, ACTION MENU
      navigation.css    #   TABS, BREADCRUMB, STEPPER, BOTTOM NAVIGATION, SIDEBAR RAIL
      modals.css        #   MODAL, MODAL DIALOG, POPOVER, COMMAND PALETTE, DRAWER, BOTTOM SHEET, CONFIRM POPOVER
      feedback.css      #   SKELETON, DIVIDER, RATING, EMPTY STATES, PAGINATION, SPINNERS, SKELETON PREFABS
      interactive.css   #   CODE (.code-block + .code-inline refactor v2.50.0), COPY BUTTON, FAB, SEGMENTED CONTROL, INLINE EDITING, AUTO-SAVE, ICON (.icon v2.33.0)
      prose.css         #   PROSE — conteneur .prose scopé (:where()) pour HTML rendu depuis markdown (titres, listes, blockquote, code, hr ; tables/liens hérités DS) — CSS-only, 0 token — (#439)
      templates.css     #   TEMPLATES (kanban, sprint, roadmap, backlog)
      media.css         #   CAROUSEL, LIGHTBOX, VIDEO EMBED, BEFORE/AFTER SLIDER
      _responsive.css   #   @media composants
      tracker.css       #   PROGRESS TRACKER, DECISION TREE, WIZARD MULTI-STEP
      quiz.css          #   QUIZ / POLL
      _a11y.css         #   ACCESSIBILITY (focus-visible global, theme-transition, prefers-reduced-motion, disabled global v2.40.2)
      pricing.css       #   PRICING TABLE, SETTINGS PANEL, COMMENTS/THREAD, AUTH FLOWS, UPGRADE PROMPT
      notifications.css #   NOTIFICATION CENTER
      motion.css        #   MOTION REFERENCE PAGE (durations, easings, 6 patterns — v2.35.0)
      access-denied.css #   ACCESS DENIED / 403 page (v2.58.0)
      theme-toggle.css  #   Theme toggle / mode switch UI (v2.60.0)
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
  build-themes.js            # Générateur themes/*.json → shared/css/themes.css (v2.39.0)
  scaffold-theme.sh          # Scaffold d'un nouveau theme JSON
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
themes/                 # Sources JSON des themes (v2.39.0) — msyx.json, acssi.json, nhood.json
                        #   → compilées en shared/css/themes.css par `node shared/build-themes.js`
packages/
  react/                # Workspace npm @msyx-dev/react (3.x-alpha) — composants React, publié sur GitHub Packages
                        #   RELEASES.md + package.json propres (artefact indépendant du DS CSS, cf. CLAUDE.md « Convention RELEASES.md »)
```

## Agent ergonomics (v2.32.0)

Depuis v2.32.0, le DS expose des artefacts destines aux agents IA (Claude Code et autres) :

- **`SKILL.md`** : manifest user-invocable (frontmatter YAML `user-invocable: true`). Regle tokens, voix, glass/solid, pattern absorption issue, pré-allocation versions.
- **`prompts.md`** : 12 phrases-types full-diacritics pour inclure dans les prompts agents.
- **`canonical-pages/`** : 6 pages HTML autonomes (tokens-only, anti-FOUC, multi-theme) que les agents copient comme reference d'usage plutôt que d'inventer.
- **`shared/components-registry.json`** : champ `example` (string HTML) sur chaque composant — copy-paste ready. Champ `react` (`ported`/`pending`/`n-a`) par composant (v2.68.0 #523) — rend l'écart CSS↔React auditable. 5 composants `ported` : `buttons`, `page-header`, `theme-toggle`, `user-menu`, `login-screen`.
- **`bin/generate-registry.js`** v1.2 : normalisation du champ `react` (règle de défaut : `kind:module` → `n-a`, `kind:component` sans valeur → `pending`) + bloc parité React (#523) : valide que toute classe émise par `packages/react/` existe dans le CSS du DS (a) et que le marquage `react:ported` est cohérent (b). Écart global affiché dans les logs CI à chaque run. Greffé sur le validateur fantôme #516 — un seul step CI bloquant.
- **`bin/generate-nav-sections.js`** v1.0 (#528) : scanne `.main > section[id]` (enfants directs) + label `(.section-header h2)||h2` via Playwright sur chaque page de `NAV_PAGES` et inline le manifeste `NAV_SECTIONS_MANIFEST` dans `shared/nav.js` entre marqueurs `AUTO-GENERATED`. Mode `--check` (CI bloquant) : régénère en mémoire et compare à l'inliné — exit 1 si divergence. Élimine les fetch runtime fragiles (immunisé auth-gate préprod, cache, CSP).

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

- **Outils** : `@playwright/test` + `http-server` (devDeps uniquement). Serveur statique de test = `http-server` (`npx http-server -p PORT -c-1 --silent .`) : sert les fichiers à plat, sans clean-URL ni fallback SPA, et tient la charge concurrente des workers Playwright. `serve` v14 retiré en #286 — son flag `-s`/--single faisait un fallback SPA vers `index.html` (le harness testait `index.html`) et il était instable sous charge. `reuseExistingServer: false` : Playwright démarre toujours un serveur propre (évite de réutiliser un serveur fantôme resté sur le port).
- **Sélection des tests** : `playwright.config.ts` a un `testMatch` restreint à `visual.spec.ts` + `modal-focus.spec.ts` (#286) — `a11y.spec.ts` a sa config dédiée (`playwright.a11y.config.ts`, script `test:a11y`) et ne tourne PAS sous `test:visual`.
- **Perimetre** : capture **par section** depuis #286 (v2.56.1) — 1 baseline par `<section id>` des 9 pages × 12 projets = 1032 baselines (86 sections × 12, voir `visual.spec.ts`). `fullPage` retiré : hauteur non déterministe sur pages longues. Étendu Sprint 22 (#191, v2.38.0), refactor par section S33 (#286, v2.56.1).
- **Projects Playwright** : 12 (`<theme>-<mode>-<viewport>`, ex: `msyx-dark-desktop`, `acssi-light-mobile`)
- **Localisation baselines** : `visual-tests/baseline/<theme>-<mode>-<viewport>/<slug>-<section-id>.png` — `visual.spec.ts` passe `${slug}__${sectionId}` à `toHaveScreenshot`, Playwright normalise `__` en `-` sur le disque.
- **Garde-fou** : assertion `toHaveTitle` dans `visual.spec.ts` / `a11y.spec.ts` / `modal-focus.spec.ts` — échec immédiat si le harness retombe sur `index.html` (régression Bug 1 #286).
- **CI** : `.github/workflows/visual.yml` — bloque les PR si diff > seuil, timeout 30 min
- **Pas d'impact prod** : Caddy `file_server` ignore `node_modules/`, `package.json`, `playwright.config.ts`. Le runtime DS reste 100% static.

## A11y audit (depuis v2.52.0 — #242)

Infrastructure d'audit d'accessibilité automatisé via axe-core.

- **Outils** : `@axe-core/playwright` v4.x (devDep) — API Deque officielle `AxeBuilder`
- **Spec** : `visual-tests/a11y.spec.ts` — distinct de `visual.spec.ts`, pas d'impact sur les baselines VR
- **Matrice** : 9 pages × 3 thèmes × 2 modes = 54 runs (même couverture que VR sans viewport)
- **Règles** : `wcag2a`, `wcag2aa`, `wcag21aa` (WCAG 2.0 + 2.1 A/AA)
- **Config dédiée** : `playwright.a11y.config.ts` — 1 projet Chromium, port 3001, séparé du pipeline VR
- **Mode dry-run** : ne fait jamais échouer le test sur violation (logger seulement)
- **Rapport** : `docs/audit-a11y-<date>.md` — généré en `afterAll`, tableau par règle + détail par run
- **CI** : `.github/workflows/a11y.yml` — séparé de `visual.yml`, `continue-on-error: true`, artifact uploadé
- **Scripts npm** : `test:a11y` (run) + `test:a11y:report` (open report HTML)
- **Résultat initial** (v2.52.0, 2026-05-09) : « 0 violations / 54 runs » — **faux négatif** : le flag `-s` de `serve` faisait auditer `index.html` (issue #286). Rapport régénéré sur le vrai contenu en v2.56.1 : **141 violations réelles** (60 critical, 81 serious) sur 7 règles distinctes — défauts a11y DS pré-existants, tickets de suivi séparés (hors scope #286).

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
- **Manifeste de sections généré au BUILD** (v2.70.0 #528, remplace fetch runtime fragile #509) :
  - `bin/generate-nav-sections.js` scanne `.main > section[id]` (enfants directs) + label `(.section-header h2)||h2` via Playwright et inline le résultat dans `shared/nav.js` entre marqueurs `AUTO-GENERATED NAV SECTIONS START/END`.
  - `resolvePageSections()` : page courante → scan DOM live (`extractSections(document)`) ; autres pages → lecture `NAV_SECTIONS_MANIFEST` inliné, **ZÉRO fetch runtime** (immunisé auth-gate préprod, cache navigateur, CSP).
  - Anti-dérive CI : `node bin/generate-nav-sections.js --check` exit 1 si manifeste obsolète (step bloquant `ci.yml` job lint).
- Contenu : **94 liens sidebar** (93 sous-sections hash + 1 Hub flat) sur 10 pages — dédup « Getting Started » ×2 (95→94, #528)
- `buildSidebar()` async, chaîné `.finally()` avant `initScrollSpy()` / `initLazyLoader()` pour garantir que `handleInitialHash` voit les liens générés
- Fallback consumer : 0 section résolue → `renderEmptySidebar()` (no-op gracieux, jamais de crash)
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
- **Calendrier** (`initCalendar()`) : date-picker INLINE single + range 2-bornes (1 calendrier, 2 clics), navigation mois/clavier (roving tabindex, role grid/row/gridcell, aria-live), événement `calendar:change`. Time-picker (`initTimePicker()`) 24h/12h, boutons +/- par partie hh/mm, segmented AM/PM, événement `time:change` (#432/#436)
- **Theme/Mode switcher** : THEME_CONFIG, applyMode(), updateModeSwitch() (v2.55.0 — remplace updateModeButtons()), initModeSwitcher() sur switch unique #mode-switch (role="switch", aria-checked, kbd, tactile WCAG 2.5.5)

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
- **Server Data Grid** (`initServerDataGrid()`) : pattern table server-driven (#434), opt-in `.data-grid[data-server]` + `data-page-size`, fetch mocké setTimeout 600ms (26 lignes MOCK_SERVER_ROWS), pagination numérotée/ellipsis, skeleton rows, `aria-busy` sur `.data-grid-wrap`, live region `.data-grid-live`, CustomEvent `dg:page-change`, dataset.bound sur grid ET pager. Distinct et non-modifiant de `initDataGrids`.
- **Usage Meter** (`initUsageMeter()`) : barres de progression avec fill animé, IntersectionObserver + fallback visibilité immédiate pour SPA, pattern dataset.bound
- **Password Toggle** (`initPasswordToggle()`) : toggle révélation show/hide sur input[type=password], bascule type + aria-pressed + aria-label dynamique, échange d'icône eye↔eye-off piloté en CSS via [aria-pressed], résolution input via aria-controls ou .password-field parent, anti-double-bind dataset.bound
- **Diff Viewer** (`.diff`, CSS-only) : présentation d'un diff pré-calculé (bloc dans `interactive.css`, pas de JS). Lignes `.diff-line--add/--del/--ctx` (fonds `rgba(var(--success-rgb)/--danger-rgb, 0.12)`), `.diff-gutter` (n°), `.diff-sign` (+/− hors couleur, tokens AA `--status-*-fg`), `.diff-hunk-header`, mode `.diff--split` (grid 2 colonnes ≥768px). Le consumer fournit le markup ligne-par-ligne typé ; le DS ne calcule pas le diff. (#447)
- **Virtual List** (`initVirtualList()`) : liste fenêtrée (windowing) — viewport `--vlist-height`, lignes `--vlist-row-h` fixes, 2 spacers (haut/bas, `aria-hidden`) dimensionnés au total logique, rendu des seules lignes `[first, first+visibleCount)` (+overscan 5) recalculé sur `scroll`/rAF avec mémoïsation, `aria-rowcount`/`aria-rowindex` = total LOGIQUE. Données consumer (`data-vlist-count` démo, `window.__vlistRenderRow` extension). Hauteur de ligne fixe assumée. `dataset.bound`. (#440)
- **Heatmap Calendar** (`initHeatmapCalendar()`) : grille temporelle 7×N (style contributions) — lit des cellules `[data-date][data-value]`, binning value→niveau (quantile/max, O(n)), pose `data-level` (coloration `rgba(var(--accent-rgb))`), place en `grid-row`/`grid-column`, tooltip jour+valeur (survol/focus, pattern risk-matrix), légende + labels, nav clavier (roving tabindex). Consumer fournit la série ; zéro fetch. `dataset.bound`. (#442)
- **JSON Viewer** (`initJsonViewer()`) : arbre JSON repliable lecture seule — parse `data-json`/`<script application/json>` (JSON.parse, try/catch), génère le DOM récursivement (`role=tree/treeitem/group`, `aria-expanded`), colore par type via `--code-*`, nav clavier WAI-ARIA tree (roving tabindex, ↑↓←→ Home/End). Distinct d'`initTreeView` (data-driven vs HTML statique). Zéro dépendance, `dataset.bound`. (#446)
- **Split Pane** (`initSplitPane()`) : panneaux redimensionnables — `.split-gutter` `role=separator` `tabindex=0`, drag Pointer Events (`setPointerCapture`, ratio clientX/Y vs `getBoundingClientRect`, clamp min/max), clavier flèches/Home/End sur `aria-valuenow`, persistance `localStorage` opt (`data-split-persist-key`), `CustomEvent('split:resize')`. Variante `--vertical`. Zéro dépendance, `dataset.bound`. (#443)
- **Transfer List** (`initTransferList()`) : double liste (disponibles↔assignés) — sélection clic+clavier (Enter/Espace toggle, ↑/↓ navigation), transfert des `.transfer-option.selected` entre panneaux (`appendChild`), boutons `[data-transfer=right/left/all-right/all-left]`, filtre substring par `.transfer-search`, région `aria-live` + `CustomEvent('transfer:change')`. Zéro dépendance, `dataset.bound`. (#444)
- **Color Input** (`initColorInput()`) : présentation d'un `<input type=color>` natif — sync du label hex (`.color-input-value`) + état `aria-pressed` des presets `.color-swatch[data-color]`, clic preset → `input.value` + dispatch `input` natif. Aucun calcul colorimétrique (picker délégué au navigateur). Anti-double-bind `dataset.bound`. (#448)
- **Form Validation** (`initFormValidation()`) : validation a11y déclarative via `<form data-validate>`, traduit `input.validity` HTML5 native en messages FR, pose `aria-invalid`/`aria-describedby`, région live `aria-live="polite"` au blur, résumé `.alert[role=alert]` focusable au submit, événement `ds:validation` avec `detail: {valid, errors}`. Anti-double-bind `dataset.bound`. (#433)
- **Split Button** (`initSplitButton()`) : composant composé `.split-button` wrapper position:relative + premier bouton (action primaire) + `.split-button__caret` (ouverture menu, `aria-haspopup="menu"`, `aria-expanded` synchronisé) + `.split-button__menu` panneau bâti sur le primitif `.menu` (#520). Clic caret : toggle `.open` + ferme les autres instances. Navigation clavier : ↑/↓ entre `.menu-item[role=menuitem]`, Home/End, Enter/Espace active, Échap ferme + rend le focus au caret. Fermeture outside-click et Escape global. Transform hover neutralisé sur les boutons enfants (évite le désalignement mitoyen). Anti-double-bind `dataset.bound` sur le wrapper. (#438)
- **Mention @** (`initMentionInput()`) : autocomplete `@` inline sur `textarea[data-mention-source]` (liste de mentionnables CSV ou JSON fournie par le consumer, zéro fetch). Détection du token `@mot` en début de mot via regex sur `value.substring(0, selectionStart)`. Positionnement du `.mention-dropdown` au caret via `getCaretCoordinates()` — helper mirror-div pur (clone des styles calculés du textarea dans un div fantôme hors-écran, insère le texte + un span marqueur, lit `offsetTop`/`offsetLeft` ajustés du `scrollTop`/`scrollLeft`). Options rendues en `.search-item` (réutilise le look/markup d'`initSearchInputs`, `highlightMatch` dupliqué localement). Navigation clavier ↑/↓/Enter/Échap + clic (`mousedown` + `preventDefault`), `aria-activedescendant` synchronisé sur l'option active (combobox pattern complet, contrairement à `initSearchInputs`). Insertion remplace le fragment `@query` par `@valeur ` et repositionne `selectionStart/End`. Anti-double-bind `dataset.bound`. (#441)

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

## Brand identity (depuis v2.42.0, mark officiel v2.43.0 #209)

### Mark SVG officiel

Le logo msyx est le **mark seul** vectorisé depuis le source officiel MSYX (`msyx.fr/media/logo/logoMSYX.png`, mark only, PNG 1475×1562 conservé en `assets/sources/logoMSYX.png`). **Pas de wordmark texte, pas de lockup** — toujours utiliser le fichier SVG (jamais de texte CSS gradient ni de réinterprétation des paths).

- **Gradient vertical** : turquoise → vert → bleu → violet (stops `#3eb89d` → `#4ab695` → `#3a6cb8` → `#5b3eaa`)
- **ViewBox** : `0 0 1475 1562` (ratio quasi-carré, fidèle au source)
- **Adaptation thème** : variantes dark/light dédiées (gradients saturés / assombris pour contraste WCAG AA)

Fichiers dans `assets/` :
- `logo-msyx.svg` — PRIMARY, mark seul vectorisé (viewBox 1475×1562)
- `logo-msyx-mark.svg` — alias identique à `logo-msyx.svg`
- `logo-msyx-dark.svg` — variante fond sombre (gradients saturés)
- `logo-msyx-light.svg` — variante fond clair (gradients assombris, contraste WCAG AA)
- `sources/logoMSYX.png` — source officiel de référence (NE PAS SUPPRIMER)
- `explorations/wordmark-monogram-{a,b}.svg` — historique de conception S23 (NE PAS SUPPRIMER)

Contraintes respectées : `role="img"` + `<title>`, viewBox normalisé.

### Signature spatiale

Module `signature.css` (importé dans `components.css` après `_base.css`). Gradient underline 2px via `::after` sur `.main .section-header .overline`. Accent visuel 32×2px, `var(--gradient-1)`, `border-radius: 2px`. Appliqué automatiquement sur toutes les pages via le barrel.

### Token texture grain

`--texture-grain` + `--texture-grain-opacity: 0.015` dans `tokens.css`. Formalise `--noise-texture` (#12). `body::after` (dans `shared/css/base.css`) utilise ces tokens. Documenté dans `pages/fondation.html#texture`.

## Process ajout composant

> **Source unique de vérité** : la checklist détaillée vit dans `CLAUDE.md` section « Process ajout composant ». Ce bloc liste les fichiers réellement touchés — il doit rester cohérent avec `CLAUDE.md` et `docs/DS-PRINCIPLES.md`.

**Emplacement CSS canonique** : le CSS d'un composant va dans son propre module `shared/css/components/<name>.css`, importé dans le barrel `shared/css/components.css` à la bonne place dans l'ordre cascade. **Ne JAMAIS écrire de CSS de composant dans `shared/styles.css`** (qui n'est qu'un agrégateur de 7 `@import`) ni dans un fichier monolithique.

Fichiers modifies pour chaque composant :
1. `pages/{categorie}.html` — section HTML + demo (≥ 2-3 variantes)
2. `shared/css/components/<name>.css` — module CSS dédié + `@import` ajouté dans le barrel `shared/css/components.css`
3. `shared/components.js` — fonction `init*` exportée via `window.__initX` (si interactif), pattern `dataset.bound`
4. `site.html` — compteur hero (+ hub cards si applicable)
5. **Bump `@ds-version` synchrone sur 5 fichiers** : `shared/css/tokens.css`, `shared/css/utilities.css`, `shared/css/components.css`, `shared/css/layout.css`, `shared/nav.js` (`const VERSION`)
6. `shared/components-registry.json` — entrée composant + champ `version` aligné sur le bump
7. `docs/ARCHITECTURE.md` — structure + composants JS
8. `CLAUDE.md` — description page + conventions
9. `RELEASES.md` (racine) — changelog Added/Changed (artefact DS CSS ; **jamais** une entrée `@msyx-dev/react` ici)

**Qualité** : tester les **6 combos** thème/mode (MSYX, ACSSI, Nhood × dark + light), mobile-first (`@media (min-width: …)`), a11y baseline (aria-label icon-only, `:focus-visible`, contraste 4.5:1, target 44px mobile), anti-FOUC.

## Convention a11y — zéro `color: white` hardcodé (v2.30.1, #165)

Règle absolue depuis v2.30.1 : **aucune valeur `color: white`, `color: #fff` ou `color: #ffffff` hardcodée** dans `shared/css/`. Utiliser exclusivement `color: var(--text-on-accent)` quand le texte est posé sur un fond `--accent`, `--gradient-*`, `--danger` ou tout fond teinté.

Exception autorisée : si le fond est **thème-indépendant** (ex. `rgba(0,0,0,0.5)`) et que `--text-on-accent` produirait un contraste inversé, conserver `#fff` avec commentaire explicite `/* a11y: fond indépendant du thème, blanc lisible toujours */`.

Vérification : `grep -rn "color:\s*white\|color:\s*#fff[^a-f]" shared/css/` doit retourner uniquement les dérogations commentées.

## Dette technique connue

- Avatars hardcodes dans composants.html + templates.html (couleurs directes au lieu de variables)
- post-merge.sh echoue quand GitHub auto-close l'issue avant le script (dette depuis sprint 4)
- Compteur footer site.html parfois desynchronise du hero (corrige manuellement)
- Issue #6 (tests visuels) toujours dans le backlog