# Architecture — design-system

## Vue d'ensemble

Design system statique (HTML/CSS/JS pur) servi par Caddy file_server.
Aucun framework, aucun build, aucune dependance externe (sauf Google Fonts).
**115 composants UI** (registre shared/components-registry.json — +10 entrées templates/data #508 ; champ `module[]` pont page↔module auto-dérivé #506), repartis sur 9 pages thematiques, 5 themes (#849 : +Auchan, #939 : +Noël), mode dark/light. + resets natifs globaux (a, :focus-visible) depuis v2.31.0. + ergonomie agent (SKILL.md, canonical-pages/, prompts.md) depuis v2.32.0. + sprite SVG Lucide self-hosted (52 glyphes post-cleanup S25) + tokens icon + classe `.icon` + fallback `@supports not (backdrop-filter)` depuis v2.33.0. + Motion reference page (durations/easings/6 patterns canoniques) depuis v2.35.0. + Split components.css → modules + barrel + tree-shake depuis v2.36.0 (30 modules CSS aujourd'hui). + Type modular scale ratio 1.25 (8 tokens `--type-*`) + section Pairing canonique depuis v2.37.0. + Visual regression matrice complète 120 baselines (3 thèmes × 2 modes × 10 pages × 2 viewports) depuis v2.38.0. + Theme generator JSON → CSS (themes/*.json + build-themes.js + scaffold-theme.sh) depuis v2.39.0. + Focus restore WAI APG sur modales (helper prive `attachFocusRestore` dans components.js, WCAG 2.4.3) depuis v2.41.0. + Brand identity (mark vectorisé officiel, signature spatiale, texture-grain token) depuis v2.42.0 (mark vectorisé depuis v2.43.0 #209). + Refactor nav.js prévention #206 (extract VERSION + template literals) depuis v2.43.1. + **Audit Phase 1 entièrement remédié S25** : chevron theme-aware via `--chevron-select` (v2.44.0), transitions ciblées + will-change cards (v2.45.0), tokenisation `--space-*` avec 2 nouveaux tokens (v2.46.0), restructure composants × pages (v2.47.0).
Version courante : **v2.113.4** — historique détaillé complet dans `RELEASES.md`/`CHANGELOG.md` (moteur graph v2.98→v2.109, User Feedback v2.110, bouton feedback header standard v2.111). Jalons antérieurs : v2.79.0 (`.card-media` variante carte à vignette bleed image-first + `.card-thumb`/`.card-body` + token `--card-thumb-h:160px` ; compatible `.card-link`/`.card-muted` ; section vitrine `#card-media` dans composants.html ; drift `package.json` racine 2.77→2.79 corrigé ; demandé par refonte mikpulse #37). + v2.78.0 (support consumers sans rail — `.page-content`/`.main--no-rail` layout sans sidebar #567, `.hidden-mobile`/`.hidden-desktop` utilitaires responsive breakpoint 768px #568, `.card-muted` variante carte WCAG-safe `--opacity-muted:0.85` #569, header brand configurable `window.MSYX_HEADER.brand` #570 ; tokens `--bottom-nav-h`/`--content-max`/`--opacity-muted` ; demandé par refonte mikpulse). + v2.77.0 (M#44 soldé — Epic #517 consolidation des doublons : `.mode-switch` canonique #518, stepper `.wizard-step`→`.stepper` #521, `tag-input` canonique #522, messaging `.alert`+`--kpi`/`--cta` #519, primitif `.menu` #520 ; 5 consolidations non-breaking, alias `@deprecated`→v3). + v2.76.0 (M#43 soldé — vitrine : split `feedback`→nouvelle page `overlays` + `motion`→`fondation`, `motion.html` supprimée, baselines VR régénérées par récolte actuals CI #514). + v2.75.0 (lot churn-VR M#43 — réorg modules CSS par destination : `.login-*` pricing→forms #510, éclatement interactive/pricing #512, fusion modals→overlays #513, 0 diff rendu). + v2.74.0 (Sprint #43 taxonomie & registre — pont page↔module `module[]` auto-dérivé #506, doc core preset 9 modules réels #507, registre complété 88 entrées #508, règle frontière page↔registre + check CI warn-only #511). + v2.73.0 (header par défaut consumers : cloche hors auth, switcher thème opt-in #542). + v2.70.0 (M#44 — sidebar manifeste build, ZÉRO fetch runtime #528). + v2.69.1 (fix demo-grid overflow minmax #529/#532). + v2.69.0 (M#43 — sidebar dynamique NAV_PAGES + scan DOM, 6 liens morts + 38 orphelines #509). + v2.68.0 (M#43 — champ react registre + check CI parité + DS-PRINCIPLES §8.1 #523). + v2.67.1 (M#43 — 9 classes fantômes registre corrigées + validateur CI #516). + v2.67.0 (dette soldée : M#37/38/39 fermés, entrypoint VERSION). + v2.66.0 (S38 — socle base.css distribué consumers via sync.sh #362). + v2.65.0 (S36 — clôture Epic #344 a11y cleanup résiduel : aria-prohibited-attr donut chart #349, label residual #348 critical, aria-required-children user-menu #347 critical, scrollable-region #346, color-contrast résiduel #345 — **bilan global Epic #337+#344 : 141 → 17 violations / -88%, critical 60 → 0 / -100%**). + v2.64.9 (S36 — label résiduel sliders/date pickers, 54 nœuds critical). + v2.64.8 (S36 — aria-required-children user-menu, 6 nœuds critical). + v2.64.7 (S36 — scrollable-region résiduel, 12 nœuds). + v2.64.6 (S36 — color-contrast résiduel, 14 fixes ciblés, 458 nœuds résorbés). + v2.64.5 (S35 — a11y WCAG AA Lots 1+2+3 : ARIA quick wins #338, color-contrast tokens #339, labels+scrollable-region #340, 141→78 violations / -45%, 60→12 critical / -80%, Epic #337 clos). + v2.64.4 (S35 — color-contrast 4 chaînes tokens recalibrées, ~1900 nœuds résolus). + v2.64.3 (S35 — ARIA quick wins, button-name/select-name/aria-required-attr/aria-prohibited-attr, ~210 nœuds). + v2.56.1 (#286 — fix harness VR/a11y, capture par section, baselines régénérées 1032). + v2.56.0 (S32 — brand identity, wordmark DS, mode-switch iOS). + v2.55.0 (S32 — mode toggle switch iOS-style). + v2.54.11 (S32 — polish boutons theme-aware). + v2.53.0 (S30 — Lighthouse CI baseline 1 page × MSYX dark, #240). + v2.52.0 (S30 — axe-core a11y dry-run infrastructure, #242). + v2.51.0 (S30 — perf budget gzip + CI warn-only, #239). + v2.50.0 (S29 — .code-inline refactor tokens canoniques). + v2.49.0 (S28 — promotions DS : .card-link, .badge-nav, .toast-message depuis consumers S27). + v2.48.0 (S26 — reliquat audit Phase 1 : tokenisation icon/avatar sizes, 8 nouveaux tokens `--avatar-size-*` + `--card-icon-*`, P-04 à P-08 fermés).
last_reviewed: 2026-10-02

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
index.html              # Redirection minimale vers site.html (meta refresh + lien) — ex-page login auth gate legacy retirée en #997 ; /auth/logout (déconnexion Authentik) reste servi par Caddyfile.container
site.html               # Hub principal + lazy-loader des 10 categories
pages/
  getting-started.html  # Installation (3 niveaux), premiers pas, theming, tokens, bonnes pratiques
  fondation.html        # Couleurs, typographie, espacements, ombres, theming, consommation (guide integration), texture grain (v2.42.0) + Motion (durations, easings, 6 patterns — rapatrié depuis motion.html #514)
  composants.html       # Cards (+ .card-muted v2.78.0 #569), badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, segmented control, theme switcher, sortable list, achievement badges
  navigation.html       # Tabs, breadcrumbs, stepper, bottom navigation, brand header configurable (window.MSYX_HEADER.brand — v2.78.0 #570)
  formulaires.html      # Inputs, selects, checkboxes, file upload, login, calendrier interactif single/range INLINE + time-picker 24h/12h (#432/#436), slider/range, search input, number input, OTP input, tag input, quiz/poll, filter-bar
  data.html             # 16 sections en 5 familles (v2.71.0+) — Graphiques (charts, pie-donut) · Indicateurs chiffrés (stats, animated-counters) · Jauges & progression (progress, progress-tracker, gauge, usage-meter) · Tabulaire (tables, table-cards, comparison, data-grid, server-data-grid) · Listes & flux (tree-view, lists, activity-feed, risk-matrix)
  templates.html        # Kanban, roadmap, backlog, sprint board
  feedback.html         # 12 sections états — alertes (.alert--kpi ex-zone-banner, .alert--cta ex-upgrade-prompt #519), toasts, skeleton, empty states, spinners, auto-save, pagination, comments, access-denied (#514)
  user-feedback.html    # NOUVEAU (v2.110.0 #705) — 2 sections, catégorie « User Feedback » distincte du `feedback` système : contexte capturé par le Provider (#user-feedback-intro) + parcours complet bouton header→modale formulaire→envoi (#user-feedback-flow), mode connecté/anonyme (email conditionnel requis en anonyme), démo 100% vanilla dogfoodant les classes consommées par `@msyx-dev/react` UserFeedback* (#692-695). JS : `initUserFeedbackDemo()`
  overlays.html         # 8 sections surfaces flottantes — modals, drawer, bottom sheet, FAB, notification center, confirm popover, tooltip (scindé depuis feedback.html #514), notes de version (badge + modale timeline + pastille localStorage v2.95.0 #614)
  divers.html           # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks, video embed, before/after) + Interaction (accordion, command palette, context menu, copy button, decision tree)
shared/
  styles.css            # Agregateur CSS — 7 @import : fonts + tokens + themes + utilities + layout + components + base
  css/
    fonts.css           # @font-face self-hosted (Space Grotesk, Inter, Fira Code — woff2, font-display swap)
    tokens.css          # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood/auchan/noel)
    themes.css          # AUTOGÉNÉRÉ depuis themes/*.json par `node shared/build-themes.js` — blocs [data-theme] acssi/nhood/auchan/noel (NE PAS éditer à la main)
    base.css            # Socle global (reset, focus accessible, body, texture grain) — synchronisé vers consumers en ds-base.css
    utilities.css       # Classes utilitaires couleur, backgrounds, bordures, espacement, display, radius, shadows, typographie
    layout.css          # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides, + .detail-grid 2 colonnes contenu/aside sticky (#795)
    components.css      # Barrel pur (v2.36.0) — 39 @import vers shared/css/components/ dans l'ordre cascade (compte réel v2.139.0 #940 ; graph.css opt-in via <link> séparé et modals.css stub #513 fusionné dans overlays.css ne sont PAS importés ici). < 1.5 KB. Remplace le monolithique 175 KB.
    components-core.css # Barrel essentiel (v2.36.0) — 10 modules pour consumers légers (menu.css ajouté v2.77.0 #520 — requis par les alias forms/navigation).
    components/         # 39 modules CSS importés par affinité fonctionnelle (v2.139.0 #940, +festive.css) :
      _base.css         #   Reset natif (a, :focus-visible global) — v2.31.0
      orb.css           #   Primitif ambient background décoratif — .orb + modifs couleur/taille + .orb--float opt-in (#357)
      festive.css       #   Décor festif thème Noël — .snowfall (nappe de flocons CSS-only, 3 couches de gradients radiaux animées en transform, variantes --sparse/--dense) + .garland (guirlande d'ampoules déphasées, cycle 1,8s < plancher WCAG 2.3.1) ; opt-in, aucune couleur/z-index en dur (--z-decor #932), même famille que orb.css (v2.139.0 #940)
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
      tables.css        #   TABLE, TABLE CARDS, DATA GRID, COMPARISON TABLE
      lists.css         #   TREE VIEW, LIST, TIMELINE, ACCORDION, SORTABLE LIST, ACTIVITY FEED
      alerts.css        #   .alert (+ .alert--kpi ex-zone-banner, .alert--cta ex-upgrade-banner #519), .toast (+ .toast-message flex-grow v2.49.0) — alias @deprecated .zone-banner/.upgrade-banner (suppression v3)
      overlays.css      #   TOOLTIP, CONTEXT MENU, ACTION MENU
      version-notes.css #   .version-badge/.version-badge--new/.version-badge-dot/.version-notes — badge + pastille (v2.95.0 #614)
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
  sync.sh                    # Synchronise le DS vers un projet consommateur : CSS (tokens, themes, base, utilities, layout, components) + fonts + sprite + shell JS, et les logos de marque dans <cible>/assets/ (MSYX toujours, charte cliente opt-in via --assets=<charte>[,…], copie non destructive, #954) ; --no-showcase via marqueurs @strip + awk
  sync-all.sh                # Sync scalable — racine obligatoire (`--root=<dir>` ou `DS_CONSUMERS_ROOT`), liste `--consumers=<fichier>` (défaut consumers.json) ; relaie à sync.sh les options par consommateur (`--no-showcase`, `--assets=`, `--components=`, `--with-graph`) ; `--dry-run` affiche la commande sync.sh exacte ; `--check` = lecture seule, contrôle la LISTE (OK/ABSENT/UNLISTED/INVALID, exit 1 si dérive, #970). Sur le VPS msyx : `--check`/`--dry-run` seulement, le resync passe par le pipeline du consommateur
  check-sync.sh              # Vérifie version + contenu (sha256) des ds-*.css copiés à l'identique, version seule pour layout/components (transformés par sync.sh), sha256 des logos distribués dans assets/ (MSYX toujours attendue, charte cliente vérifiée si un de ses fichiers est présent, #954) + mode --check-overrides (#951)
  check-components.sh        # Lint consommateurs — détecte composants custom hors DS + passe orphelins opt-in `--orphans=<src>` (livré par sync.sh mais jamais monté, #938)
  build.sh                   # Minification assets CSS (csso) + JS (terser) → dist/
  consumers.json             # Parc des consommateurs DS pour sync-all.sh — schéma 2 versionné : `dir` relatif à la racine passée en argument, options par consommateur (`css_dir`, `no_showcase`, `assets`, `components`, `with_graph`), `path` absolu refusé, clé inconnue = INVALID (#970)
  components-registry.json   # Registre de tous les composants DS (classes CSS, init JS, page)
  version-notes.json         # Données curées {next, released[]} des notes de version — source unique éditée à la main, inlinée au build par bin/generate-version-notes.js (v2.96.0 #645)
  CONSUMER_GUIDE.md          # Guide d'integration + règle d'or + scripts de vérification
  nav.js                     # Header (badge version dogfoodé + VERSION_NOTES inliné au build #645), sidebar, scroll spy, SPA navigation, LazyLoader
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
shared/graph/           # Moteur graphique node-link — fondations I1a (v2.98.0, #657) + rendu I1b-2 (v2.100.0, #666) + layouts riches I3-1 (v2.101.0, #669) + I3-2 (v2.102.0, #670) + viewport pan/zoom/pinch I2-1 (v2.103.0, #667) + fit/selection/ResizeObserver I2-2 (v2.104.0, #668) + nav clavier roving I4-1 (v2.105.0, #671) + live-region SR/forced-colors/contraste I4-2 (v2.106.0, #672) + mode édition create/delete + contrat focus I5-1 (v2.107.0, #673) + inline-label + ports 44px I5-2 (v2.108.0, #674) + undo/redo pile de patches inverses I5-3 (v2.109.0, #675)
  vendor/                 # graph-layered.js — @dagrejs/dagre@3.0.0 + @dagrejs/graphlib@4.0.1 VENDORES (ESM esbuild lisible, AUCUN min.js, MIT) — 1re dependance tierce vendoree du DS. build-vendor.sh (reproductible, patron icons/build-sprite.sh) + VENDOR.md (version pinnee, hash sha256, owner CVE, veille trimestrielle) + LICENSE-dagre + LICENSE-graphlib + NOTICE — v2.102.0, #670
  lib/                  # pointer-drag.js, svg.js (ES modules canoniques) + index.js (barrel) + global-entry.js (entree IIFE)
  model/                 # GraphModel (data plat, EventTarget observable, DOM-free) + toModel() + index.js (barrel) — v2.99.0, #665 (I1b-1) ; + history.js (GraphHistory : pile undo/redo de patches inverses, EventTarget observant graph:model:change, beginTransaction/commit coalescing, buildRecord pur, DOM-free testable Node ; les events update-node/update-edge du GraphModel enrichis d'un `prev` non-breaking) — v2.109.0, #675 (I5-3)
  layout/                 # fixed.js (lit node.position) + tree.js (Reingold-Tilford naif deterministe) + radial.js (mindmap radiale 360°, racine au centre, anneaux ∝ profondeur, secteurs ∝ charge feuille — v2.101.0, #669) + mindmap.js (mindmap BILATERALE maison : racine centrale, branches N1 gauche/droite par glouton d'equilibrage hauteur/nb, cote = arbre horizontal RT tourne 90° miroir, consomme node.size — 1er use case client NHOOD, toujours EXPLICITE — v2.102.0, #670) + layered.js (Sugiyama via dagre VENDORE, dynamic import, SEUL layout ASYNC : run()→Promise<Map>, gere les cycles nativement — v2.102.0, #670) + detect.js (heuristique topologique pure : 1-racine acyclique→tree, DAG/cyclique→layered, vide→fixed ; radial/mindmap jamais auto-choisis) + auto.js (wrapper layout 'auto', route reellement vers 'layered' depuis #670, hasLayout('layered') est vrai) + index.js (registre registerLayout/resolveLayout/hasLayout — 'layered' enregistre via loader LAZY, jamais import statique, pour ne jamais entrainer dagre dans le bundle de base) — purs, DOM-free, testables Node — v2.100.0/#666 + v2.101.0/#669 + v2.102.0/#670
  render/                 # svg-renderer.js (SvgRenderer : pipeline measure→layout→paint, paint() ASYNC-TOLERANT depuis #670 — extraction _applyLayout() + token anti-course _paintToken, cycle observe→repaint(rAF)→destroy ; instancie <g class="graph-viewport"> dans _build() + _initViewport() opt-in, v2.103.0/#667 ; _applyLayout() stocke this.positions, fit()=reset identite, zoomToNode(id,k) centre+zoome, _initSelection()/select(id)/getSelection() classes .graph-node--selected/.graph-edge--selected + evenement graph:selection:change (concern renderer, GraphModel reste pur — pre-requis edition I5), _initResize() ResizeObserver debounce rAF + refitOnResize conditionnel, _initKeyboard() Echap/f/+/-/fleches, teardown complet destroy() — v2.104.0/#668 ; _initNodeNav()/_handleNodeKey()/_focusNode()/_setRoving()/_restoreNodeNav() roving tabindex + traversee spanning-tree, opts.keyboardNav, v2.105.0/#671 ; _initLive()/_announce()/_announceConnections() live-region SR <div class="graph-live" aria-live="polite">, hookee dans _focusNode()/select() branche noeud, debounce LIVE_ANNOUNCE_DEBOUNCE_MS=300ms OU touche 'i', timer toujours annule/reprogramme (pas d'empilement en traversee rapide), clear dans destroy() — v2.106.0/#672 ; _initEdit()/_buildToolbar()/_createNodeAt()/_createNodeCenter()/_deleteSelection() mode édition opts.mode:'edit' (view inchangé) : toolbar .graph-toolbar (.btn-group DS, Ajouter/Relier/Supprimer ≥44px, role=toolbar), création nœud double-clic fond (_hitTest via elementFromPoint — robuste au pointer-capture du pan — + _clientToWorld → model.addNode) ou bouton (centre viewport), création arête mode « Relier » (clic source→cible → model.addEdge), suppression Suppr/Backspace|bouton → removeNode/removeEdge (cascade), contrat focus create→nouveau nœud (select silent+roving+_ensureNodeVisible) / delete→nextFocusAfterRemoval(model,tree,id) (lib/edit-focus.js PUR : voisin→parent arbre couvrant→order→null) calculé AVANT removeNode appliqué APRÈS repaint rAF, role=graphics-document CONSERVÉ (arbitrage A opt1 #662 — application réservé inline I5-2), graph:edit ré-émis sur .graph (alias graph:model:change, arbitrage F), teardown listeners+toolbar dans destroy() — v2.107.0/#673 ; _startInlineEdit()/_commitInlineEdit()/_cancelInlineEdit() inline-label (double-clic noeud → overlay <input> .graph-inline-edit pre-rempli+focus, Enter/blur → updateNode, Echap → annule, fermeture → re-focus du <g> noeud ; role=application pose sur le <svg> UNIQUEMENT le temps de l'edition inline — arbitrage A opt1, graphics-document restaure ensuite) + _initPorts()/_showPortsFor()/_startPortDrag() ports 44px (.graph-port reveles hover/focus, hit-area >=44px, drag-to-connect via __pointerDrag + ligne fantome .graph-port-link → addEdge, desambiguisation cible via port-drop.js pur DOM-free, drop hors noeud/Echap annule) — v2.108.0/#674 ; _undo()/_redo()/_afterHistoryNav() + this.history=new GraphHistory(model) dans _initEdit() : Ctrl/Cmd+Z=undo, Ctrl/Cmd+Shift+Z|Ctrl+Y=redo (branche dans _onEditKeydown, avant Suppr), transaction beginTransaction/commit autour de la SESSION inline uniquement (coalescing 1 patch/session ; create/delete/addEdge-drag atomiques = 1 patch, le drag n'ouvre pas de transaction — repaint-annulation en vol la laisserait ouverte, review #675), focus clavier re-posé après le repaint rAF, history.destroy() dans destroy() ; API createGraph() expose undo()/redo()/canUndo()/canRedo() (passent par _undo()/_redo() → focus restauré) — v2.109.0/#675) + node-types.js (resolveNodeType, graphCard) + a11y-table.js (graphToTableModel pur + renderA11yTable DOM) + viewport.js (fonctions pures clampZoom/userToWorld/worldToUser/zoomAt, DOM-free testables Node, + classe Viewport : screenToWorld via getScreenCTM().inverse(), pan __pointerDrag deltas maison, pinch tracker 2-pointeurs Map<pointerId>, wheel-zoom ancre curseur rAF-throttle, evenement graph:viewport:change sur .graph) — v2.100.0, #666 + v2.102.0, #670 + v2.103.0, #667 + v2.104.0, #668 + v2.105.0, #671 + v2.106.0, #672
  index.js                # API publique ESM : createGraph(el, opts) -> {model, destroy, svg, getViewport, setViewport, screenToWorld, fit, zoomToNode, select, getSelection} — v2.100.0, #666 (opts.layout union 'fixed'|'tree'|'radial'|'mindmap'|'layered'|'auto', v2.102.0/#670 ; opts.viewport/zoomMin/zoomMax/initialViewport, v2.103.0/#667 ; opts.selectable/initialSelection/onSelect/selectionDetail/refitOnResize, v2.104.0/#668)
  global-entry-engine.js  # entree IIFE moteur complet -> window.MSYXGraph {createGraph, GraphModel, toModel} — v2.100.0, #666
  build.sh               # esbuild borne → shared/dist/graph-lib.global.js + shared/dist/graph.global.js (2e sortie, #666 ; --external:*graph-layered.js #670, dagre reste hors bundle — specifier calcule en variable dans layered.js, jamais inlinable en IIFE)
  README.md              # Frontiere de build D1, jalon nexus post-merge (schemaVersion non fige), section Vendoring dagre (#670), contrainte d'integration viewport (#667)
shared/dist/
  graph-lib.global.js    # GENERE (shared/graph/build.sh) mais COMMITE — window.__pointerDrag/__svg, charge avant components.js
  graph.global.js         # GENERE mais COMMITE — window.MSYXGraph (moteur complet), charge UNIQUEMENT sur les pages qui rendent un graphe (#666, +radial/auto #669, +mindmap #670, +viewport #667 — dagre/layered restent hors bundle, ~12.1 KB gzip)
shared/css/components/graph.css  # Module CSS du moteur — hors barrel (opt-in via <link>, data.html + sync.sh --with-graph), verifie par shared/check-graph-isolation.sh — vector-effect:non-scaling-stroke sur les aretes, .graph--lod-compact (masque labels d'arete sous seuil de zoom), touch-action:none sur .graph-canvas (#667), .graph-node--selected/.graph-edge--selected halo var(--accent) (#668) ; .graph-live sr-only (pattern local, graph.css hors barrel n'herite pas de .sr-only/_a11y.css) ; @media (forced-colors:active) — nœuds fill:Canvas/stroke:CanvasText, aretes CanvasText (--strong stroke-width:3 = 2e signal FORME), selection outline:3px solid Highlight (systeme, pas --accent), forced-color-adjust:none CIBLE ; @media (prefers-reduced-motion:reduce) kill-switch local (transition/animation:none !important) ; 2e indice contraste selection = outline-offset 3px + filter:drop-shadow(token --graph-select-halo, derive de --text donc independant de --accent) — v2.106.0, #672
shared/check-graph-isolation.sh  # CI anti-barrel : graph.css ne doit jamais etre importe par un barrel par defaut
pages/data.html#graph             # Section demo (fixed + tree + viewport+selection pan/zoom/pinch/fit/clic/clavier initialViewport+initialSelection figes #667+#668 + radial #669 + layered/mindmap NHOOD #670), initGraph() dans components.js reinitAll()
docs/adr/
  ADR-0001-moteur-graph.md  # Decision d'architecture du moteur graph (coeur maison + dagre vendore + rendu SVG)
  login.html            # Page de connexion : card centree, inputs email+password, toggle remember-me
  settings.html         # Parametres : 2 colonnes, 4 sections (profil, securite, notifications, preferences)
  dashboard-kanban.html # Tableau Kanban : 4 colonnes, toolbar (search + filter-bar + CTA)
  empty-state.html      # 3 variantes : aucun resultat, pas de donnees, erreur chargement
  error-404.html        # Erreur 404 : code large, card centree, 2 CTA
  billing.html          # Facturation : 3 plans tarifaires, abonnement actuel, historique
themes/                 # Sources JSON des themes (v2.39.0) — msyx.json, acssi.json, nhood.json, auchan.json (#849), noel.json (#939)
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
- **`bin/generate-registry.js`** v1.3 : normalisation du champ `react` (règle de défaut : `kind:module` → `n-a`, `kind:component` sans valeur → `pending`) + bloc parité React (#523) : valide que toute classe émise par `packages/react/` existe dans le CSS du DS (a) et que le marquage `react:ported` est cohérent (b) — extraction de `extractReactClasses` reconnaît désormais les classes BEM `bloc__element` (#747) et le motif « variable intermédiaire » `const x = [...].join(" ")` + `className={x}` (#889, gardé par un principe anti faux-positif : seuls les noms réellement référencés dans un `className={...}` sont scannés) — `bin/lib/extract-react-classes.js`, testable en isolation. + validation warn-only du champ `example` (#748, `bin/lib/validate-example.js`) : classe principale du composant citée + attributs `data-*` réellement lus par `shared/components.js`/`shared/nav.js` (fail-closed si fichier manquant) ; bascule bloquante `--example-strict`. Écart global affiché dans les logs CI à chaque run. Greffé sur le validateur fantôme #516 — un seul step CI bloquant.
- **`bin/lib/check-orphans.js`** (#938) : moteur de la passe « orphelins » de `shared/check-components.sh --orphans=<src>` (module Node + CLI interne, testable en isolation). `scanOrphans({ registry, cssDir, srcDir, allowlist })` classe chaque entrée non-`module` du registre en `consommee` / `orphelin` / `orphelin-structurel` / `accepte` / `non-mesurable` / `non-livree` : « livrée » = une classe simple définie dans les copies `ds-*.css` / `components/*.css` du consommateur ; « consommée » = un des signaux S1 classe propre, S2 import `@msyx-dev/react` (champ dérivé `reactExports`), S3 prop de composition (`versionNotes={`), S4 shell `ds-nav.js` chargé ; tests exclus du corpus ; toute incertitude compte « consommé ». Seules les entrées `structural: true` font échouer. `bin/lib/react-exports.js` dérive `reactExports`. Preuves : `tests/test-check-components.sh` (cas A–I sur consommateurs synchronisés par le vrai `sync.sh`) et `tests/regression/check-orphans.test.js`, tous deux dans le job CI `lint`.
- **`bin/generate-nav-sections.js`** v1.0 (#528) : scanne `.main > section[id]` (enfants directs) + label `(.section-header h2)||h2` via Playwright sur chaque page de `NAV_PAGES` et inline le manifeste `NAV_SECTIONS_MANIFEST` dans `shared/nav.js` entre marqueurs `AUTO-GENERATED`. Mode `--check` (CI bloquant) : régénère en mémoire et compare à l'inliné — exit 1 si divergence. Élimine les fetch runtime fragiles (immunisé auth-gate préprod, cache, CSP).
- **`bin/generate-version-notes.js`** (#645) : miroir de `generate-nav-sections.js` — lit `shared/version-notes.json` (données curées à la main, contrat `{next, released[]}`), valide le schéma (enum `type`, dates ISO, versions sans préfixe `v`, ordre récent-d'abord) et inline `const VERSION_NOTES = …;` dans `shared/nav.js` entre marqueurs `AUTO-GENERATED VERSION NOTES START/END`. Mode `--check` (CI bloquant) : régénère en mémoire et compare à l'inliné — exit 1 si divergence. Zéro fetch runtime (#528).
- **`bin/check-innerhtml.js`** (#758) : garde-fou anti-XSS — scanne `shared/components.js` + `shared/nav.js`, échoue (exit 1, fail-closed y compris sur fichier manquant) sur toute affectation `.innerHTML =` concaténée à une variable (ou `constantMarkup(...)` non littéral) sans dérogation justifiée `// ds-allow-innerhtml: <raison>`. Zéro dépendance (scanner artisanal conscient des chaînes/template literals imbriquées). Testé par `tests/test-check-innerhtml.sh`, câblé bloquant dans `ci.yml`. Cf. `docs/DS-PRINCIPLES.md` §11.
- **`bin/check-categorical-palette.js`** (#800) : garde-fou de l'échelle catégorielle `--cat-1..8` — parse `shared/css/tokens.css` + `shared/css/themes.css` (zéro navigateur, zéro dépendance), résout la cascade 4 couches pour les 10 combos theme/mode, vérifie la complétude des 80 déclarations + la forme (hex littéral obligatoire) **avant** le contrat C1 (ΔH OKLCh ≥ 30°) / C2 (ΔE OKLab ≥ 0,12) / C3 (contraste ≥ 3:1 vs `--surface-solid`, WCAG 2.1 SC 1.4.11). Exit 2 = complétude/forme, exit 1 = contrat, exit 0 = conforme. Conçu extensible : la liste de tokens à vérifier et les seuils sont des paramètres (`SCALES`), pas des constantes enfouies — #812 (`--chart-1..5`) réutilisera le même moteur. Testé par `tests/regression/categorical-palette.test.js` (calcul pur) + `tests/test-check-categorical-palette.sh` (codes de sortie), câblé bloquant dans `ci.yml` dès la 1ère version. Cf. `docs/DS-PRINCIPLES.md` §2.

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
- **Header (#977)** : les captures de sections masquent `.site-header` (`display: none`, #669 — son badge de version churnait les sections plus hautes que le viewport à chaque bump), donc le header n'était couvert par aucun test visuel. Un `test.describe` dédié (`Visual regression — header (#977)`, test `header`, fin de `visual.spec.ts`) capture `.site-header` sur `/pages/navigation.html` (config `MSYX_HEADER` statique) à `scrollY = 0` : baseline `header__site-header.png`, soit `visual-tests/baseline/msyx-{dark,light}-{desktop,mobile}/header-site-header.png` (Playwright normalise `__` en `-`). **Périmètre MSYX seul** : 4 projets, mobile inclus (le header y diffère réellement, cf. compaction < 640px) ; les 8 autres projets sont `skip`. Le seul élément du header qui varie d'un run à l'autre est le numéro du badge de version : `neutralizeVersionBadge(page)` remplace ce nœud texte par `HEADER_VERSION_PLACEHOLDER` (`v0.0.0`) avant la capture, avec un garde-fou dur (`expect(...).toBe(1)`) qui échoue si `shared/nav.js` restructure le badge. Le `mask` de Playwright est écarté : sa boîte suit la largeur réelle du badge (police proportionnelle, `2.99` → `2.100`), donc une release suffirait à dépasser la tolérance ; la constante fige la largeur et laisse le style du badge (bordure, icône, pastille) sous couverture. Les baselines viennent de la récolte CI (soft-harvest), jamais d'une génération locale.
- **CI** : `.github/workflows/visual.yml` — bloque les PR si diff > seuil, timeout 30 min
- **Pas d'impact prod** : Caddy `file_server` ignore `node_modules/`, `package.json`, `playwright.config.ts`. Le runtime DS reste 100% static.

## Contraste des boutons à fond plein (depuis #944)

Sonde par **échantillonnage des pixels rendus** : axe ne rend qu'un `incomplete` sur un fond en dégradé et ne voit pas le reflet de survol.

- **Spec** : `visual-tests/button-contrast.spec.ts` (+ fixture `visual-tests/fixtures/button-contrast-944.html`, un bouton par cas `data-probe`). Listée dans le `testMatch` de `playwright.config.ts`, donc jouée par `test:visual` dans les 10 projets desktop (les 2 `*-mobile` la sautent : le contraste ne dépend pas du viewport).
- **Méthode** : par bouton et par état (`rest`, `hover`) — lit la couleur de texte réellement peinte (le reflet `::before` éclaircit un texte sombre), capture le bouton texte masqué, décode la capture dans la page (canvas) et calcule le contraste WCAG minimal entre le texte et chaque pixel sous la boîte du texte (`pixelMin`) ; au repos, calcule aussi le contraste du pire arrêt du dégradé (`stopMin`).
- **Cas** : `SOLID` (bloquants, `ENFORCE = true`, seuil 4,5:1 — valeurs visées ≥ 4,6) = `btn-primary`, `btn-danger`, `btn-success`, `btn-warning`, `btn-primary.btn-danger` (markup de la démo `composants.html`), `.login-submit`, `.login-compact button`, `.login-authentik-btn`, + (#968, fond transparent, `FLAT_BG`) `btn-outline-danger` (`.btn-outline-danger.btn-sm`, `overlays.html`) et `btn-secondary-btn-outline-danger` (`composants.html`) ; `REPORT_ONLY` : `btn-secondary`, `btn-ghost`, `btn-outline-danger-bare` (classe nue sans padding). `disabled` et `.btn-loading` exclus (composants inactifs, exemptés par WCAG).
- **Garde-fous de la sonde** (toujours actifs) : texte opaque, ≥ 2 arrêts opaques, pixels échantillonnés, pixel rendu ≥ pire arrêt − 0,05, couleur peinte au repos = couleur calculée.
- **Tokens** : les fonds des boutons pleins sont les 8 tokens `--btn-{primary,danger,success,warning}-bg-{start,end}` (hex littéral, 4 couches, jamais dérivés — `DS-PRINCIPLES` §2), réglés à la mesure par la sonde. Le texte des boutons pleins suit les tokens `--btn-on-{primary,danger,success,warning}` ; `--btn-on-primary` est un alias de `--text-on-accent` (`tokens.css`), surchargé en blanc par Auchan sombre seul (`themes/auchan.json`), pour que `--text-on-accent` — consommé par 43 autres règles — reste inchangé. Un 2e test de la spec (Node pur, projet `msyx-dark-desktop` seul) vérifie leur **complétude** dans `tokens.css`, `themes/*.json`, `themes.css` et le miroir `themes/msyx.json`.
- **Survol des boutons de connexion** : `.login-submit` et `.login-authentik-btn` utilisent le reflet + l'élévation de `.btn-primary` (plus d'opacité au survol : elle rendait le contraste dépendant du fond de page). `.login-compact button` n'a pas d'état de survol.
- **Règle complète** : `docs/DS-PRINCIPLES.md` §3.3.

## A11y audit (depuis v2.52.0 — #242)

Infrastructure d'audit d'accessibilité automatisé via axe-core.

- **Outils** : `@axe-core/playwright` v4.x (devDep) — API Deque officielle `AxeBuilder`
- **Spec** : `visual-tests/a11y.spec.ts` — distinct de `visual.spec.ts`, pas d'impact sur les baselines VR
- **Matrice** : 10 pages × 5 thèmes × 2 modes = 100 runs (même couverture que VR sans viewport ; `auchan` et `noel` ajoutés en #939 — `auchan` n'y avait jamais été ajouté ; `user-feedback` ajoutée en #976)
- **Règles** : `wcag2a`, `wcag2aa`, `wcag21aa` (WCAG 2.0 + 2.1 A/AA)
- **Config dédiée** : `playwright.a11y.config.ts` — 1 projet Chromium, port 3001, séparé du pipeline VR
- **Périmètre bloquant** (#983) : `BLOCKING_RULES` (`color-contrast`) × `BLOCKING_COMBOS` (MSYX dark + light), constantes de `a11y.spec.ts` — une assertion par run, posée après l'attachement du résultat. Tout le reste (autres règles, autres thèmes, résultats axe `incomplete`) reste en rapport, sans assertion. Une garde de matrice fait échouer la collecte si un combo bloquant n'est plus dans `THEME_COMBOS`
- **Complétude du banc** (#983) : le reporter renvoie `{ status: "failed" }` si un run manque ou tombe en erreur, quel que soit le thème (`[a11y] banc incomplet`) — un `test.skip` ne passe donc plus en vert
- **Rapport** : `docs/audit-a11y-<date>.md` (tableau par règle + détail par run, « Runs rapportés N / total ») et export `test-results-a11y/a11y-runs.json` (tableau de `A11yRun`, avec `fg`/`bg`/`ratio` par nœud `color-contrast`) — produits par le **reporter Playwright** `visual-tests/reporters/a11y-report.ts` (processus du runner, insensible aux redémarrages de worker : chaque test attache son résultat, plus de tampon global ni d'`afterAll`, #976). Ne jamais passer `--reporter=…` à la CLI : il remplace les reporters de la config.
- **Banc hermétique** : les requêtes hors `localhost` sont abandonnées (`page.route`) et le chargement attend `load`, pas `networkidle` — une ressource tierce (avatar de démo de `navigation.html`) ne ralentit ni ne fait expirer un run (#976)
- **CI** : `.github/workflows/a11y.yml` — séparé de `visual.yml`, bloquant : `color-contrast` MSYX dark + light et complétude du banc ; le reste en rapport ; artefact `audit-a11y-report` uploadé même en échec
- **Scripts npm** : `test:a11y` (run) + `test:a11y:report` (open report HTML)
- **Résultat initial** (v2.52.0, 2026-05-09) : « 0 violations / 54 runs » — **faux négatif** : le flag `-s` de `serve` faisait auditer `index.html` (issue #286). Rapport régénéré sur le vrai contenu en v2.56.1 : **141 violations réelles** (60 critical, 81 serious) sur 7 règles distinctes — défauts a11y DS pré-existants, tickets de suivi séparés (hors scope #286).

## Navigation et layout

### Header fixe (56px)
- Position fixed, z-index 150, pleine largeur
- Contenu : logo msyx.design, badge de version cliquable, selecteur theme, toggle dark/light
- **Dogfood notes de version (v2.96.0 #645, montée de niveau v2.97.0 #649)** : le `span.header-version` statique est remplacé par un bouton `.version-badge.header-version-badge` (`data-version-notes` + `data-modal-trigger="ds-version-notes-modal"` + `data-latest-version="${VERSION}"`) — le DS consomme désormais son propre composant `version-notes` (#614). Le badge porte une icône `<svg class="icon">` (`#i-sparkles`, `color: var(--accent)`) avant le numéro et rend en `var(--font-sans)` (Inter, ex-`--font-mono`, #649). `ensureVersionNotesDialog()` injecte une fois la `<dialog id="ds-version-notes-modal">` dans `<body>` (`<h3 class="modal-title">`, sous-titre optionnel `.version-notes-sub` si `VERSION_NOTES.subtitle` défini, `<ol class="timeline">`). La timeline est rendue par `renderVersionNotesUpcoming()` (item `.timeline-item--upcoming` en tête si `VERSION_NOTES.next.highlights` non vide, nœud pointillé d'annonce de la prochaine version) puis `renderVersionNotesTimeline()` depuis `VERSION_NOTES.released` (bloc inliné au build, cf. `bin/generate-version-notes.js`) — la 1re entrée porte une pastille `.badge.badge-success` « Nouveau ». Les nœuds de la timeline sont scopés `.version-notes .timeline` (anneau creux calé sur `--surface`, 1er nœud plein + halo) : la primitive globale `.timeline`/`.timeline-dot` de `lists.css` reste visuellement inchangée (utilisée par `divers.html#timeline`). Ouverture déléguée à `initModals()`, pastille « nouveau » à `initVersionNotes()` (les deux déjà présents dans `reinitAll()`).
- **Dogfood bouton feedback (v2.111.0 #708)** : le composant **UserFeedback** (#692-695, démo vitrine #705) devient un élément **standard** du header — bouton `.header-notification.btn-icon#header-feedback-btn` (`#i-message-circle`, `aria-haspopup="dialog"`, `aria-label="Donner un retour"`) rendu **près de la cloche**, sur toutes les pages, indépendamment de l'auth. `ensureUserFeedbackDialog()` (même patron que `ensureVersionNotesDialog()`) injecte une fois la `<dialog id="ds-user-feedback-modal">` dans `<body>` avec le même markup formulaire que la démo (ids préfixés `ds-uf-` pour éviter toute collision quand le header est rendu sur `pages/user-feedback.html` elle-même). Contrairement à la démo (toggle Connecté/Anonyme manuel), le mode est déterminé **une fois à l'injection** depuis l'état réel `window.MSYX_HEADER.user` (présent ⇒ connecté, champ email masqué `hidden` ; absent ⇒ anonyme, champ visible + `required`). `initHeaderUserFeedback()` (`shared/components.js`, `reinitAll()`) gère la soumission : validation native, capture du contexte réel (`app_id`/`version`/`env`/`route`/`browser`/`device`/`viewport`/`langue`/`user`+`tenant`), toast succès, fermeture + reset — ouverture/fermeture déléguées à `initModals()`. Désactivable via `MSYX_HEADER.feedback.enabled = false`.
- Zone utilisateur (auth) : avatar cliquable + dropdown menu + cloche notifications + panel popover + bouton feedback (#708)
- Configuration consommateur : `window.MSYX_HEADER` (auth, user, notifications, menu, feedback)
- Sans `window.MSYX_HEADER` ou `auth: false` : header minimal (logo + theme switcher) — le bouton feedback reste affiché (indépendant de l'auth, comme la cloche) sauf `feedback: { enabled: false }`
- **Mode démo DS** : toutes les pages du DS définissent `window.MSYX_HEADER` avec un user "Preview" et 3 notifications fictives, activant le header enrichi en conditions réelles
- Mobile : burger menu integre (visible sous 768px, `layout.css`). Le badge de notes de version est **masqué sous 640px** (#711) : `@media (max-width: 640px)` dans `layout.css` applique `.site-header .version-badge { display: none }`, avec le wordmark texte et le sélecteur de thème, pour supprimer l'overflow horizontal du header (le mark logo, le burger, le mode, la cloche, le bouton feedback et l'avatar restent). Il est visible au-dessus de 640px. La règle `.site-header .header-version-badge { display: none }` héritée de #645 (masquage ≤768px) avait été supprimée en v2.97.0 (#649), puis #711 a réintroduit un masquage plus étroit (≤640px) sur `.version-badge`. `.version-badge` garde `min-height: 44px` en base (cible tactile, visible entre 640px et 768px) et se compacte (`min-height: 0`) via `@media (min-width: 768px)` dans `version-notes.css`.
- Variable CSS : `--header-h: 56px`
- Fonctions nav.js : `buildHeader()`, `initHeaderUser()`, `initHeaderNotifications()`, `updateHeaderUser()`, `updateNotificationCount()`, `renderNotifications()`, `ensureUserFeedbackDialog()` (#708)

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
- `data-theme` sur `<html>` : palette de couleurs (msyx, acssi, nhood, auchan, noel)
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
- **Chart palette** : chart-1 a chart-5 (non touche par #800, non contractuel — cf. Task de suite #812)
- **Palette categorielle** (#800, v2.121.0) : cat-1 a cat-8, categoriel != semantique, garantis separables (C1 ΔH OKLCh>=30°, C2 ΔE OKLab>=0.12) et lisibles (C3 contraste>=3:1 vs --surface-solid) sur les 10 combos par `bin/check-categorical-palette.js`. Utilitaires `.bg-cat-*`/`.border-cat-*` (pas de `.text-cat-*`). Vitrine `pages/fondation.html#palette-categorielle`.
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
- **Tree View** (`initTreeView()`) : expand/collapse branches, selection item, icones dossier/fichier, nav clavier WAI-ARIA APG Tree (roving tabindex ↑↓←→/Home/End/Enter/Espace, pattern repris d'initJsonViewer, #824)
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
- **Input Counter** (`initInputCounters()`, #952) : compteur de caractères `.input-counter` d'un `.input-group`, champ = `.input[maxlength]` du même groupe ; texte `N / MAX` via `textContent` (unité = `value.length` UTF-16, comme le `maxlength` natif), classe `.input-counter--over` si `N > MAX` (valeur initiale/programmatique), région `.sr-only[aria-live="polite"]` du `.input-footer` qui annonce « Limite de caractères atteinte » uniquement à `N >= MAX` (écrite seulement quand son texte change), resynchronisation au `reset` du formulaire (`setTimeout(…, 0)`), anti-double-bind dataset.bound, exposé `window.__initInputCounters`
- **Diff Viewer** (`.diff`, CSS-only) : présentation d'un diff pré-calculé (bloc dans `interactive.css`, pas de JS). Lignes `.diff-line--add/--del/--ctx` (fonds `rgba(var(--success-rgb)/--danger-rgb, 0.12)`), `.diff-gutter` (n°), `.diff-sign` (+/− hors couleur, tokens AA `--status-*-fg`), `.diff-hunk-header`, mode `.diff--split` (grid 2 colonnes ≥768px). Le consumer fournit le markup ligne-par-ligne typé ; le DS ne calcule pas le diff. (#447)
- **Virtual List** (`initVirtualList()`) : liste fenêtrée (windowing) — viewport `--vlist-height`, lignes `--vlist-row-h` fixes, 2 spacers (haut/bas, `aria-hidden`) dimensionnés au total logique, rendu des seules lignes `[first, first+visibleCount)` (+overscan 5) recalculé sur `scroll`/rAF avec mémoïsation, `aria-rowcount`/`aria-rowindex` = total LOGIQUE. Données consumer (`data-vlist-count` démo, `window.__vlistRenderRow` extension). Hauteur de ligne fixe assumée. `dataset.bound`. (#440)
- **Heatmap Calendar** (`initHeatmapCalendar()`) : grille temporelle 7×N (style contributions) — lit des cellules `[data-date][data-value]`, binning value→niveau (quantile/max, O(n)), pose `data-level` (coloration `rgba(var(--accent-rgb))`), place en `grid-row`/`grid-column`, tooltip jour+valeur (survol/focus, pattern risk-matrix), légende + labels, nav clavier (roving tabindex). Consumer fournit la série ; zéro fetch. `dataset.bound`. (#442)
- **JSON Viewer** (`initJsonViewer()`) : arbre JSON repliable lecture seule — parse `data-json`/`<script application/json>` (JSON.parse, try/catch), génère le DOM récursivement (`role=tree/treeitem/group`, `aria-expanded`), colore par type via `--code-*`, nav clavier WAI-ARIA tree (roving tabindex, ↑↓←→ Home/End). Distinct d'`initTreeView` (data-driven vs HTML statique). Zéro dépendance, `dataset.bound`. (#446)
- **Version Notes** (`initVersionNotes()`) : badge `.version-badge[data-version-notes]` + pastille « nouveau » — seule logique admise = lire `data-storage-key`/`data-latest-version`, comparer à `localStorage.getItem(storageKey)` par **égalité de chaîne** (pas de semver), poser/retirer `.version-badge--new` + enrichir/restaurer l'`aria-label`. Au clic : `localStorage.setItem` + retrait de la classe. L'ouverture de la modale reste déléguée à `data-modal-trigger` + `initModals()` (2 listeners coexistants). Présentationnel strict (#445) : réutilise `dialog.modal-dialog` + `.timeline` telles quelles, zéro rendu de données, zéro contenu en dur. `dataset.bound`. (#614)
- **Split Pane** (`initSplitPane()`) : panneaux redimensionnables — `.split-gutter` `role=separator` `tabindex=0`, drag Pointer Events (`setPointerCapture`, ratio clientX/Y vs `getBoundingClientRect`, clamp min/max), clavier flèches/Home/End sur `aria-valuenow`, persistance `localStorage` opt (`data-split-persist-key`), `CustomEvent('split:resize')`. Variante `--vertical`. Zéro dépendance, `dataset.bound`. (#443)
- **User Feedback demo** (`initUserFeedbackDemo()`, `pages/user-feedback.html`) : gère UNIQUEMENT le toggle Connecté/Anonyme (`[data-uf-mode-toggle]` → montre/cache `#uf-email-group`, ajuste `required`) et le submit du formulaire démo (`[data-uf-form]` → `showToast()` succès + fermeture de la `<dialog>`). L'ouverture/fermeture de la modale reste déléguée à `initModals()` (`data-modal-trigger`/`data-modal-close`), pas de réimplémentation. Peuple aussi `#uf-context` (navigator/location réels). `dataset.bound`. Appelé dans `initComponents()` et `reinitAll()`. (#705)
- **Graph** (`initGraph()`) : filet monolithe — lit `.graph[data-graph] > script.graph-config` (JSON), délègue à `window.MSYXGraph.createGraph(el, cfg)` (`shared/graph/global-entry-engine.js`, no-op si le bundle `graph.global.js` n'est pas chargé sur la page). Le moteur lui-même (`shared/graph/`) : pipeline `measure→layout→paint` (mesure interne, jamais de mutation du modèle `GraphModel` #665), layouts `fixed`/`tree`/`radial`/`mindmap` purs DOM-free (`layout/`) + `layered` (Sugiyama via **dagre vendoré**, `shared/graph/vendor/`, dynamic import — **seul layout ASYNC**, `run()`→`Promise<Map>`, gère les cycles nativement, #670) + `auto` (auto-détection topologique via `adjacency` : 1 racine acyclique → `tree`, DAG/cyclique → `layered` — réellement enregistré depuis #670 — `radial`/`mindmap` toujours explicites, jamais auto-choisis, `fixed` jamais par défaut, #669/#670). `paint()` **async-tolérant** (`_applyLayout()` + token anti-course `_paintToken`, #670) — les layouts synchrones restent inchangés. Rendu SVG + noeud riche `foreignObject`/`graphCard()` + alternative a11y `.graph-table` (`aria-describedby`, contrat primaire), cycle observe(`graph:model:change`)→repaint(rAF debounce)→destroy (`window.__registerInstance`, invalide aussi tout paint async en vol). Couleurs 100% `var(--graph-*)` — repaint gratuit au toggle theme/mode. `dataset.bound`. **Viewport pan/zoom/pinch** (`render/viewport.js`, #667, I2-1) : transform portée par un nouveau `<g class="graph-viewport">` (enveloppe `.graph-edges`+`.graph-nodes`, survit au wipe `innerHTML` de `paint()`, transform préservée entre repaints) — le `viewBox` calculé par `paint()` reste le cadre « monde/home » inchangé. `screenToWorld` passe par `svg.getScreenCTM().inverse()` (le SVG n'est pas 1:1 px à cause du `viewBox`+`preserveAspectRatio`) puis inverse la transform vp — fonctions pures `userToWorld`/`worldToUser`/`zoomAt`/`clampZoom` DOM-free testables Node. Pan via `window.__pointerDrag` (deltas calculés depuis le dernier point client, le contrat réel n'expose que `{clientX,clientY}`), pinch via un tracker 2-pointeurs dédié (`Map<pointerId>`, `pinchActive` neutralise le pan pendant le pinch), wheel-zoom ancré curseur (rAF-throttle, `zoomAt` garantit le point écran fixe). Bornes `--graph-zoom-min/-max` (tokens I1a) ou override `opts.zoomMin`/`zoomMax`. `opts.initialViewport` = état déterministe (clé VR). Anti-distorsion : `vector-effect:non-scaling-stroke` sur les arêtes (épaisseur constante au zoom) + LOD `.graph--lod-compact` (masque les labels d'arête sous un seuil de `k`) — `--graph-inv-k` posée sur le `<g>` pour un consumer qui voudrait contre-scaler un label, non appliquée par défaut (les labels de nœud scalent avec leur nœud, comportement attendu d'un zoom node-link). Événement `graph:viewport:change` (`CustomEvent`, `detail:{tx,ty,k}`, `bubbles:true`) émis sur `.graph` (`el`), pas sur `GraphModel`. API retournée par `createGraph()` : `getViewport()`/`setViewport(v)`/`screenToWorld(cx,cy)` (no-op si `opts.viewport===false`). **Contrainte d'intégration** : un ancêtre en `transform:scale()` casse `getScreenCTM()` — interdit côté consumer. **Fit-to-content** (`fit()`, #668, I2-2) : reset à l'identité (`{tx:0,ty:0,k:1}`) — aucun calcul de bbox, le `viewBox` posé par `paint()` cadre déjà le contenu, l'identité EST le fit. `zoomToNode(id, k=1.5)` centre+zoome sur un nœud via `this.positions` (désormais stocké par `_applyLayout()`, jeté auparavant) + `screenToUser`. **Sélection** (`select(id|null)`/`getSelection()`, #668, I2-2) : concern du **renderer**, pas du `GraphModel` (invariant #665/#666, données pures) — pré-requis de l'édition (I5). Classes `.graph-node--selected`/`.graph-edge--selected` (modificateurs BEM, cohérents `.graph-edge--strong`), focus `tabindex="-1"` sur le nœud sélectionné, événement `graph:selection:change` (`detail:{id,kind}`, `bubbles:true`) sur `.graph`, même canal que `graph:viewport:change`. Détail au clic : `opts.onSelect(sel)` sinon `window.__openModal` (label/type/voisins via `model.neighbors()`), `opts.selectionDetail:false` désactive. Clic sur le fond ne désélectionne jamais (le pan tire dessus) — seuls `select(null)`/`Escape` désélectionnent. `opts.initialSelection` pose le halo dès l'init **sans** ouvrir le détail (état déterministe VR). La sélection **survit à un repaint** (`_restoreSelectionVisual()`, appelée en fin d'`_applyLayout()` — sans ça, une mutation du modèle pendant qu'un élément est sélectionné ferait disparaître le halo tout en laissant `getSelection()` pointer sur un id fantôme ; désélection propre + événement re-émis si l'id a disparu). Tooltip **hors scope** (CSS-hover inadapté aux coordonnées SVG transformées, divergence assumée vs DoD #659) — le détail modal couvre le besoin. **Clavier viewport** (`_initKeyboard()`, distinct de la nav nœud-à-nœud I4) : `Escape` désélectionne, `f`/`F` fit, `+`/`-` zoom centré (délègue `zoomAt`), flèches pan — conteneur `tabindex="0"`. **`ResizeObserver`** (`_initResize()`, 1ʳᵉ primitive RO du DS) : le responsive de base est déjà assuré par le `viewBox` (`getScreenCTM()` s'adapte à la taille rendue, centre-monde/zoom préservés sans JS) — le RO ajoute un re-fit **conditionnel** (`opts.refitOnResize`, défaut `false`), skip si le viewport n'est pas à l'identité (ne casse jamais une vue déjà navigée). Débounce `requestAnimationFrame`, `disconnect()` dans `destroy()`. **Nav clavier nœud-à-nœud** (`_initNodeNav()`/`_handleNodeKey()`/`_sibling()`/`_focusNode()`/`_setRoving()`/`_syncRovingTabindex()`/`_ensureNodeVisible()`/`_restoreNodeNav()`, #671, I4-1) : nouvel util pur DOM-free **`buildSpanningTree(model, rootId?)`** (`shared/graph/lib/spanning-tree.js`, exporté par `shared/graph/lib/index.js`) — DFS déterministe (`model.neighbors()`), racine = `layoutOptions.root` sinon 1er nœud du modèle, **forêt** pour les composants disjoints, `order` = préordre couvrant 100% des nœuds même cyclique. **Roving tabindex** : exactement un `.graph-node` porte `tabindex="0"` (le courant), tous les autres `-1`, restauré après chaque repaint (`_restoreNodeNav()` appelée dans `_applyLayout()` juste après `_restoreSelectionVisual()` — même raison : `nodesG.innerHTML=''`). **Conflit avec le pan clavier #668 résolu** par un listener **délégué sur `nodesG`** (survit aux repaints, distinct du listener flèches=pan sur `this.el`) : sur un nœud focusé, les flèches traversent puis `preventDefault()`+`stopPropagation()` — le pan conteneur ne se déclenche jamais ; focus hors nœud → pan #668 intact. Mapping **WAI-ARIA APG tree** : `↑`=parent, `↓`=1er enfant, `←`/`→`=frère précédent/suivant (pas de wrap), `Home`/`End`=`order[0]`/`order[dernier]`, `Enter`/`Espace`=`select(id)` ; `Échap`/`f`/`+`/`-` jamais stoppés (bubblent, comportement #668 réutilisé). `select(id)` (nœud) appelle désormais `_setRoving(id)` — sélection et roving harmonisés (continuité souris↔clavier). `_ensureNodeVisible()` recentre la caméra (`zoomToNode(id, kCourant)`, zoom conservé) **uniquement** si le nœud ciblé est hors du `viewBox` courant — un nœud déjà visible ne bouge pas la caméra. Rôles ARIA : `<svg>` `role:'graphics-document'` (était `'img'`), nœuds `role:'graphics-symbol'` (était `'img'`, `aria-label` conservé) — filet conforme = la table a11y déjà livrée (#666). `opts.keyboardNav` (bool, défaut `true`, symétrique `viewport`/`selectable`) désactive entièrement cette nav ; `createGraph()` expose `focusNode(id)`. Cross-edges (hors arbre couvrant) non navigables aux flèches — restent couvertes par la table a11y, annoncées dynamiquement en I4-2 (#672, live-region, hors scope). **Live-region SR + forced-colors + contraste** (`_initLive()`/`_announce()`/`_announceConnections()`, #672, I4-2) : `<div class="graph-live" aria-live="polite" aria-atomic="true">` créée dans `_build()` (à côté de `.graph-a11y`, masquée SR-only). Hookée dans `_focusNode(id)` (#671) et `select(id)` (branche nœud, hors `silent`) : écrit le **label immédiatement**, programme les **connexions** (`model.neighbors()`, in∪out, couvre aussi les cross-edges hors arbre couvrant) après `LIVE_ANNOUNCE_DEBOUNCE_MS`=300ms de repos, ou immédiatement sur la touche **`i`** (listener délégué sur `nodesG`, distinct de `_onNodeKeydown`). Le timer précédent est **toujours** annulé avant reprogrammation — une traversée rapide n'empile jamais d'annonces, seul l'état final s'annonce ; `destroy()` clear le timer + retire le listener. `@media (forced-colors: active)` (`graph.css`) : les `var(--graph-*)` ne sont **pas auto-remappées** par le navigateur sur `fill`/`stroke` SVG en High Contrast Mode (contrairement aux propriétés HTML standard) → overrides explicites `fill:Canvas`/`stroke:CanvasText` sur les nœuds (distinction **forme+bordure**), `CanvasText` sur arêtes/labels/icônes (`--strong` en `stroke-width:3`, épaisseur = 2e signal), sélection/focus via `outline:3px solid Highlight` (couleur **système**, indépendante de `--accent`), `forced-color-adjust:none` **ciblé** sur ces éléments (évite le double-traitement UA sur nos couleurs système explicites). `@media (prefers-reduced-motion: reduce)` : kill-switch local (`.graph, .graph * { transition:none!important; animation:none!important; }`) — `graph.css` étant hors barrel, il n'hérite pas de la règle globale `_a11y.css`. **Aucun bouton pause** : le moteur read-only n'a aucune boucle rAF d'animation continue (le rAF de `viewport.js` throttle le wheel/pinch, transitoire) → WCAG 2.2.2 non déclenché, divergence assumée documentée en **dette technique conditionnelle** (cf. section « Dette technique connue »). **2e indice de contraste sélection** : `outline-offset` porté à 3px (le ring se lit hors du fill du nœud) + `filter:drop-shadow()` avec le nouveau token `--graph-select-halo: color-mix(in srgb, var(--text) 55%, transparent)` (`tokens.css`) — dérivé de `--text`, jamais confondu avec `--accent`, couvre un nœud custom déjà accent-coloré (`opts.nodeTypes`). Contraste mesuré sur les 6 combos thème/mode : `--graph-edge`≥3.66:1, `--graph-label`≥9.85:1, sélection≥3.57:1 (cf. RELEASES.md v2.106.0, tous conformes sans correction de token). (#666, #669, #670, #667, #668, #671, #672)
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
- Variables CSS exclusives (zero couleur hardcodee) — compatible 5 themes x 2 modes automatiquement

## Flux de donnees

Aucun backend. Toutes les donnees sont mockees en HTML statique ou en JS inline (DATA_GRID_ROWS).
Les composants interactifs utilisent du JS vanilla avec pattern `dataset.bound` pour eviter les double-listeners lors des reinit SPA.

## Infrastructure

- Servi par une image Docker (`caddy:2-alpine`, `Caddyfile.container` en `file_server`), déployée par Coolify en préprod uniquement
- Authentification : forward_auth **Authentik** au Caddy edge (`*.miklaw.fr`, snippet `miklaw_auth`) — un visiteur non connecté est redirigé (302) vers `auth.msyx.fr` ; la déconnexion `/auth/logout` redirige vers le `sign_out` de l'outpost (`Caddyfile.container`). L'ancienne auth gate (cookie HMAC, page de login `index.html`) est retirée (#997).
- En-têtes de sécurité posés par le Caddy edge (HSTS preload, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP) — mesurés sur `https://design-system.miklaw.fr/health.json`
- CSP : `script-src 'self' 'unsafe-inline'` (requis pour anti-FOUC)
- Deploy : aucune compilation au déploiement ; auto-deploy Coolify désactivé, redéploiement par `~/.claude/scripts/pipeline/coolify-deploy.sh design-system --wait` (voir `README.md` et `CLAUDE.md` § Deploy)

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

**Surcharge par thème (v2.139.0, #940)** : un thème peut habiller le fond de toutes les pages sans mécanique nouvelle, en surchargeant simplement ces deux tokens dans son `themes/<nom>.json`. `themes/noel.json` le fait en dark et en light (motif SVG flocons/étoiles, opacité plus basse en light — un motif sombre sur fond clair se voit davantage) : c'est un fond **statique**, donc actif par défaut sur `[data-theme="noel"]`, sans obligation WCAG 2.2.2.

### Décor festif (v2.139.0, #940)

Deuxième volet du thème Noël, au-delà de la palette (#939) : `shared/css/components/festive.css` (voir tableau des modules ci-dessus) fournit `.snowfall` et `.garland`, primitifs décoratifs CSS-only sur le modèle de `.orb` (#357). Règle d'activation à deux vitesses :
- **Fond de page + guirlande** : statiques, **ON par défaut** sur `[data-theme="noel"]` — aucune obligation de contrôle (WCAG 2.2.2 ne s'applique qu'aux animations permanentes). La guirlande clignote (cycle 1,8s, `--garland-cycle`), largement sous le plancher de 3 flashs/s de WCAG 2.3.1.
- **`.snowfall`** : animation permanente, donc **opt-in**, pilotée par la clé `localStorage` `msyx-festive` (défaut OFF). Patron de bascule démontré dans `pages/fondation.html#festif` (`initFestiveDemo()`, `shared/components.js`) et dogfoodé dans le header de toutes les pages du DS (`ensureFestiveDecor()`/`updateFestiveDecor()`, `shared/nav.js`, injectées depuis `buildHeader()` sur le modèle de `ensureUserFeedbackDialog()`).
- **Live-switch** : `initThemeSwitcher()` (`shared/components.js`) rappelle `updateFestiveDecor()` juste après `updateModeSwitch()`, afin que le décor apparaisse/disparaisse sans rechargement quand l'utilisateur change de thème depuis le sélecteur du header.
- `--z-decor: 1` a été ajouté à l'échelle d'empilement en tokens (`tokens.css`, #932) : le décor passe au-dessus du fond et sous tout contenu interactif.
- **Réserve de fin de page du sapin** (#1005, v2.143.2) : `.festive-character` est `position: fixed; bottom: 0`, hors flux — il n'ajoute aucune hauteur au document. `festive.css` pose `--festive-clearance` (largeur du sapin × 1,5 — viewBox 200 × 300 — + `--space-lg`) sur `:root[data-theme="noel"]:has(.festive-character)`, et les trois gabarits de page la consomment en `padding-bottom` : `.main`, `.page-content`, `.content-grid` (`layout.css`, `max()` avec le dégagement de la bottom-nav pour les deux derniers). Hors Noël la variable n'est pas posée (0px) ; même CSS pour le sapin vanilla et `<FestiveDecor>`. Garde : `visual-tests/festive-clearance.spec.ts` (navigateur réel).
- **Décalage latéral du décor** (#1011) : `.garland--header` et `.ornaments` (hors de `<main>`) se décalent de `var(--festive-inset-start, 0px)`, posée sur `:root:has(.sidebar, .rail-sidebar--fixed)` — seulement si une barre latérale DS est dans le DOM **et** à l'écran (`@media (min-width: 768.02px)`, complément exact du `max-width: 768px` qui la renvoie hors écran) ; elle vaut alors `--sidebar-w`. Avant, ils lisaient `--sidebar-w` résolu à `:root` (260px, jamais 0 : `.main--no-rail` ne le sature que sur `<main>`) : un consumer sans rail ni sidebar, ou la vitrine ≤ 768px, avait le décor décalé de 260px. Un `.rail-sidebar` non fixe (dans le flux) ne pousse rien. Garde : `visual-tests/festive-sans-rail.spec.ts`.

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
8. Rien dans `CLAUDE.md` : la liste des composants vit dans `shared/components-registry.json` (dérivée par `bin/generate-registry.js`), le N2 n'est pas à éditer par composant
9. `RELEASES.md` (racine) — changelog Added/Changed (artefact DS CSS ; **jamais** une entrée `@msyx-dev/react` ici)

**Qualité** : tester les **10 combos** thème/mode (MSYX, ACSSI, Nhood, Auchan, Noël × dark + light), mobile-first (`@media (min-width: …)`), a11y baseline (aria-label icon-only, `:focus-visible`, contraste 4.5:1, target 44px mobile), anti-FOUC.

## Convention a11y — zéro `color: white` hardcodé (v2.30.1, #165)

Règle absolue depuis v2.30.1 : **aucune valeur `color: white`, `color: #fff` ou `color: #ffffff` hardcodée** dans `shared/css/`. Utiliser exclusivement `color: var(--text-on-accent)` quand le texte est posé sur un fond `--accent`, `--gradient-*`, `--danger` ou tout fond teinté.

Exception autorisée : si le fond est **thème-indépendant** (ex. `rgba(0,0,0,0.5)`) et que `--text-on-accent` produirait un contraste inversé, conserver `#fff` avec commentaire explicite `/* a11y: fond indépendant du thème, blanc lisible toujours */`.

Vérification : `grep -rn "color:\s*white\|color:\s*#fff[^a-f]" shared/css/` doit retourner uniquement les dérogations commentées.

## Dette technique connue

- Avatars hardcodes dans composants.html + templates.html (couleurs directes au lieu de variables)
- post-merge.sh echoue quand GitHub auto-close l'issue avant le script (dette depuis sprint 4)
- Compteur footer site.html parfois desynchronise du hero (corrige manuellement)
- Issue #6 (tests visuels) toujours dans le backlog
- **Dette conditionnelle — moteur graph, bouton pause `prefers-reduced-motion`** (#672, I4-2) :
  le moteur read-only livre uniquement un kill-switch CSS (`@media (prefers-reduced-motion:
  reduce) { .graph, .graph * { transition:none!important; animation:none!important; } }`,
  `shared/css/components/graph.css`) — **aucun bouton pause/lecture**, car aucune boucle
  rAF d'animation continue n'existe aujourd'hui (le rAF de `viewport.js` throttle le
  wheel/pinch, transitoire, pas une animation ; WCAG 2.2.2 non déclenché). **Dès qu'une
  animation JS continue est introduite** (ex. layout animé/transition automatique vNext,
  I5+ édition avec re-layout anime), ce bloc devient **insuffisant** : il faudra alors (a)
  une écoute dynamique `matchMedia('(prefers-reduced-motion: reduce)').addEventListener
  ('change', ...)` (le kill-switch CSS actuel ne réagit qu'au chargement de la page, pas
  à un changement de préférence OS en cours de session) et (b) un bouton pause/lecture
  explicite (WCAG 2.2.2 Pause, Stop, Hide). Divergence assumée vs le DoD générique #661.