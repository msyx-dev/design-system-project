# Changelog

Toutes les évolutions notables de **msyx-design-system**.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versioning : [SemVer](https://semver.org/lang/fr/).

> 📚 **Historique complet et détaillé** : voir [`RELEASES.md`](./RELEASES.md).
> Ce fichier suit la convention globale « CHANGELOG par PR » ; les entrées sous `[Unreleased]` sont alimentées à chaque PR, puis datées à la release.

## [Unreleased]

### Added
- Moteur graph **I3-1** (#669) — layout **`radial`** (`shared/graph/layout/radial.js`) : mindmap radiale 360° pure DOM-free — racine au centre, profondeur → anneau (rayon cumulatif ∝ extent max du palier + `ringGap`), enfants répartis en secteurs angulaires proportionnels à la **charge feuille** de leur sous-arbre (pas de chevauchement angulaire), parent centré angulairement sur ses enfants, déterministe (ordre d'insertion), mêmes garanties de couverture que `tree.js` (racines = nœuds sans arête entrante, `opts.root`, garde anti-cycle + racines de secours). **Auto-détection de layout** (`layout:'auto'`) : `detect.js` (`detectLayout(model)`, pure, DFS sur `adjacency` pour l'acyclicité) route 1 racine acyclique → `tree`, DAG multi-racines/cyclique → `layered` ; `radial`/`mindmap` restent **explicites** (jamais auto-choisis, choix esthétique), `fixed` **jamais** par défaut. `auto.js` (wrapper `autoLayout`) **dégrade gracieusement vers `tree`** via le nouveau helper `hasLayout(name)` (`layout/index.js`) tant que `layered` (#670) n'est pas enregistré — garantit que `{nodes,edges}` sans coordonnées rend **out-of-the-box** et que #669 est mergeable **avant** #670 sans jamais produire de `Promise` ni casser le rendu. Enregistrés dans `layout/index.js` (pattern import-puis-`registerLayout`, cf. déviation TDZ documentée #666). JSDoc `createGraph(el,opts)` (`shared/graph/index.js`) : union `opts.layout` étendue à `'fixed'|'tree'|'radial'|'auto'`. Sous-démo radiale dans `data.html#graph` (`size` explicite sur chaque nœud → géométrie déterministe, VR stable). Tests Node **DOM-free** (`tests/regression/graph-layout-radial.test.js`, 25 assertions : déterminisme, racine centrée, rayon croissant par profondeur, angles distincts, cycle pur/forêt, `detectLayout` sur les 3 topologies + graphe vide, dégradation `auto` sans Promise, `hasLayout()`), `npm run test:graph-layout-radial`, step CI dédié. `shared/dist/graph.global.js` régénéré (`npm run build:graph`, budget perf `shared/perf-budget.json` réévalué : 8.66 KB gzip, +0.75 KB vs I1b-2). v2.101.0.
- Moteur graph **I1b-2** (#666) — le **1er rendu** : `SvgRenderer` (`shared/graph/render/svg-renderer.js`) pipeline `measure→layout→paint` (mesure interne dans une `Map`, `node.size` si fourni sinon mesurée — **le modèle n'est jamais muté** par le rendu, évite la boucle measure→update→repaint→measure), cycle `observe(graph:model:change)→repaint(rAF-debounce)→destroy` enregistré via `window.__registerInstance` (#657, teardown SPA). Layouts **purs, DOM-free** (`shared/graph/layout/`) : `fixed` (lit `node.position.{x,y}`, Cytoscape) et `tree` (Reingold-Tilford naïf déterministe — racines = nœuds sans arête entrante, forêt supportée, garde anti-cycle, `direction:'TB'|'LR'`), testables en Node (`tests/regression/graph-layout.test.js`, 22 cas, `npm run test:graph-layout`, step CI dédié). Alternative a11y **`table`** (contrat PRIMAIRE, WCAG 1.1.1/1.3.1) : `graphToTableModel()` pure + `renderA11yTable()`, reliée au SVG par `aria-describedby`, resynchronisée à chaque repaint. `nodeTypes` + `graphCard()` (support nœud riche NHOOD via `foreignObject` + `.card`/`.badge`/`.chip`). API publique `createGraph(el, opts)` (`shared/graph/index.js`) + **bundle global dédié** `shared/graph/global-entry-engine.js` → `shared/dist/graph.global.js` (`window.MSYXGraph`, 2e sortie `build.sh`, **distinct** de `graph-lib.global.js`). `graph.css` sort du stub (tokens `var(--graph-*)` uniquement, toujours hors barrel — `check-graph-isolation.sh` reste vert). Section démo `#graph` dans `data.html` (organigramme `fixed` + arbre `tree`, `size` explicite sur chaque nœud → passe `measure` skippée → **géométrie déterministe**, VR stable). `sync.sh --with-graph` (livré, corrige le gap latent I1a : `graph-lib.global.js` copié **par défaut** désormais). Registre (`graph`, `kind:component`, `jsInit:initGraph`, `react:pending`). `schemaVersion:1` **non figé** (jalon nexus post-merge, piloté par le parent). v2.100.0.
- Moteur graph **I1b-1** (#665) — `GraphModel` (`shared/graph/model/graph-model.js`) : structure node-link plate, data pure, `class GraphModel extends EventTarget` observable (`CustomEvent('graph:model:change', { detail, bubbles:true })`), testable **sans DOM** (aucun `document`, Node 20, zéro jsdom). Shape Cytoscape-alignée : sémantique dans `data{}`, géométrie (`position`/`size`) en sibling — `size` **porté, jamais mesuré**. CRUD atomique (`addNode`/`updateNode`/`removeNode` cascade/`addEdge`/`updateEdge`/`removeEdge`, 1 op ⇒ 1 event effectif), accès (`get*`/`has*`/`*Count`/itération), index d'adjacence incrémental (`adjacency`/`inEdges`/`outEdges`/`neighbors`), invariants **lenient** (`console.warn` + skip, jamais de `throw`). `toModel()` (`shared/graph/model/to-model.js`) normalise toute entrée tolérante (shape nu, id généré, pendante droppée, doublon droppé). `schemaVersion:1` **PROVISOIRE non figé** (réserve documentée en tête de fichier, forward-tolérant, aucune logique version-gated — gravure repoussée au round-trip `nexus` en I1b-2 #666). `tests/regression/graph-model.test.js` (17 cas, `npm run test:graph-model`, câblé en CI). `build.sh`/`render/`/`layout/` inchangés — aucun rendu, aucun registry, aucune CSS dans cette issue. v2.99.0.

### Fixed
- Chrome modal (v2.97.2) — **a11y** : bouton fermer des modales porté à 44×44px en mobile (`dialog.modal-dialog .modal-close`, mobile-first, compact desktop) ; utilitaire `.modal-title` (20px) qui était écrasé par `dialog.modal-dialog .modal-header h3` → scopé `h3:not(.modal-title)`. Trouvés au challenge designer sur la modale notes de version, vérifiés au rendu réel (modale ouverte). Affecte toutes les modales DS.

### Changed
- `initSplitPane`/`initBeforeAfter` migrés sur `pointerDrag()` — corrige une fuite mémoire SPA réelle (before-after posait 4 listeners sur `document`, jamais retirés) ; le drag before-after démarre désormais sur `.before-after-handle`. 5 sites `createElementNS` (pie/donut, progress-tracker) migrés sur `svg()`. (#657)
- Notes de version — montée de niveau (v2.97.0) : badge de version en `--font-sans` (Inter) + icône spark (`#i-sparkles`), désormais **visible en mobile** (cible 44px) et compact en desktop (`min-width:768px`). Timeline de la modale restylée **de façon scopée** (`.version-notes .timeline` : nœuds anneau-creux, dernière version mise en avant plein+halo, nœud « À venir » pointillé) — la primitive globale `.timeline` (lists.css) reste iso-visuelle. Rendu du bucket « À venir » (`next.highlights`, jusque-là non rendu), pastille « Nouveau » sur la dernière version, sous-titre optionnel (`subtitle`), modale sémantique `<ol>`/`<li>` + `.modal-title`. Aligne le composant DS sur le pilote cap-transfo (prérequis migration #355). (#649)

### Fixed
- Notes de version (v2.97.1) — **puces natives parasites** dans la modale : les `<ul>` de highlights héritaient du marqueur de liste (l'UA repose `list-style` directement sur `<ul>`, ce que le reset de `.timeline` sur l'`<ol>` parent ne neutralise pas). Reset scopé `.version-notes .timeline-content ul` + mise en page chip/texte propre. Bug préexistant (#645) attrapé au **rendu réel** (la VR ne capture pas la modale ouverte). Plus ajout de l'entrée de note pour la montée de niveau elle-même (v2.97.0 n'avait aucune note dans `version-notes.json`).
- Notes de version — nœud « récent » découplé de `:first-child` (classe `.timeline-item--latest` posée par le JS sur la 1re version *released*) : évite que le style plein+halo n'écrase le nœud pointillé de l'item « À venir » quand le bucket `next` est en tête. (#649)
- Notes de version — pastilles de catégorie : chaque highlight de la timeline affiche désormais un `.badge` de statut (Nouveauté / Amélioration / Correction / Sécurité) dérivé de son champ `type`, dans le header dogfoodé (#645) comme dans la vitrine `overlays.html`. Le rendu (`renderVersionNotesTimeline` + démo) ignorait ce champ, les catégories n'apparaissaient pas. Mapping `badge-success`/`badge-info`/`badge-warning`/`badge-danger` aligné sur le pilote cap-transfo (`release-chip-*`, cohérence future #355). (#647)

### Added
- Moteur graph **I1a** (#657) — fondations : utils partagés `pointerDrag()` + `svg()` (`shared/graph/lib/`, 1ʳᵉ brique DS avec build esbuild borné → `shared/dist/graph-lib.global.js` chargé avant `components.js`), discipline de teardown SPA (`__registerInstance`/`__sweepDetached` en tête de `reinitAll()`), tokens `--graph-*` (dérivés `color-mix()`, contraste ≥3:1 vérifié sur les 6 combos), squelette `shared/graph/` + `graph.css` hors barrel, `check-graph-isolation.sh` (CI), ADR `docs/adr/ADR-0001-moteur-graph.md`, budget perf dédié. v2.98.0.
- Dogfood header notes de version : le badge de version du header devient cliquable et ouvre la modale « Notes de version » (timeline) alimentée par `shared/version-notes.json` (données curées, inlinées au build par `bin/generate-version-notes.js`, zéro-fetch runtime #528). Le DS consomme désormais son propre composant `version-notes` (#614). Générateur avec mode `--check` anti-drift en CI. (#645)
- Notes de version (.version-badge / initVersionNotes) : badge version cliquable + pastille "nouveau" pilotée par localStorage (comparaison par égalité de chaîne, aucun semver) + modale timeline réutilisant purement dialog.modal-dialog + .timeline. Présentationnel strict (#445) : zéro rendu de données, zéro contenu en dur, ouverture déléguée à data-modal-trigger + initModals() existant. Section #version-notes (overlays.html). (#614)
- Diff viewer (.diff) : présentation CSS-only d'un diff pré-calculé par le consumer (lignes typées add/del/contexte, gouttière n° de ligne, préfixe +/− pour le sens hors couleur, séparateur de hunk, modes unified + side-by-side `.diff--split`). Fonds `rgba(var(--success-rgb)/--danger-rgb)`, signe via tokens AA `--status-*-fg`. Zéro dépendance, aucun calcul de diff (couche présentation comme .code-block). Section #diff-viewer (divers.html). (#447)
- Virtualized list (.virtual-list / initVirtualList) : liste fenêtrée (windowing) — viewport hauteur fixe + 2 spacers dimensionnés au total logique + rendu des seules lignes visibles (+overscan) sur rAF, `aria-rowcount`/`aria-rowindex` sur total logique. Hauteur de ligne fixe (contrainte zéro-dépendance assumée). Données fournies par le consumer (`data-vlist-count` en démo, `window.__vlistRenderRow` en extension). Section #virtual-list (data.html). (#440)
- Heatmap calendrier (.heatmap-cal / initHeatmapCalendar) : grille 7×N jours style contributions GitHub, intensité 5 paliers `rgba(var(--accent-rgb))` dérivée des valeurs (binning quantile/max), tooltip jour+valeur (survol+focus), légende moins↔plus, labels mois/jours, nav clavier (roving tabindex). Série {date,value} fournie par le consumer (cellules `data-date`/`data-value`), zéro dépendance. Section #heatmap-calendar (data.html). (#442)
- JSON viewer (.json-viewer / initJsonViewer) : arbre JSON repliable généré depuis `data-json` ou `<script type="application/json">` (JSON.parse, lecture seule), coloration par type via tokens `--code-*`, repli/expand + boutons tout déplier/replier, navigation clavier WAI-ARIA tree (roving tabindex, ↑↓←→ Home/End). Zéro dépendance. Section #json-viewer (divers.html). (#446)
- Splitter / resizable panels (.split-pane) : layout maître-détail redimensionnable — `.split-gutter` (Pointer Events + `setPointerCapture`), clavier `role=separator` + `aria-valuenow` (flèches/Home/End), min/max via `data-split-min`/`max`, persistance `localStorage` optionnelle (`data-split-persist-key`), `CustomEvent('split:resize')`. Variante `.split-pane--vertical`. `initSplitPane()` zéro-dépendance. Section #splitter (divers.html). (#443)
- Mention @ (.mention-dropdown / initMentionInput) : autocomplete @ inline dans un textarea (détection token @, positionnement du dropdown au caret via mirror-div, nav clavier + aria-activedescendant, insertion + repositionnement). Réutilise le look .search-item. Liste fournie par le consumer (data-mention-source), zéro fetch. Section #mention (feedback.html). (#441)
- Transfer list (.transfer-list) : double liste disponibles↔assignés + colonne de boutons →/←/⇒/⇐, sélection clic+clavier (Enter/Espace/flèches), filtre par panneau, annonces aria-live, `CustomEvent('transfer:change')`. `initTransferList()` zéro-dépendance (déplacement de nœuds DOM). Section #transfer-list (formulaires.html). (#444)
- Color picker (.color-input) : wrapper stylisant un `<input type=color>` natif (reset chrome navigateur ::-webkit/::-moz-color-swatch, focus-ring DS, carré 44px) + presets `.color-swatch[data-color]` cliquables (aria-pressed) + `initColorInput()` (sync input↔hex↔preset, dispatch event natif). Picker visuel délégué au navigateur — zéro dépendance, zéro calcul colorimétrique. Section #color-picker (formulaires.html). (#448)
- Primitif .orb canonique (orb.css) : ambient background décoratif (position absolute, blur var(--orb-blur), opacity var(--orb-opacity), pointer-events none, will-change), modificateurs couleur (.orb--accent/--primary-light/--violet/--danger) + taille (.orb--sm/--md/--lg) + animation opt-in (.orb--float, @keyframes orbFloat). Refactor des 4 copies divergentes (hero/login/access-denied/index.html) vers le primitif, iso-visuel ; hex hardcodés d'index.html tokenisés ; aria-hidden harmonisé. (#357)
- Module .prose (prose.css) : styles de rendu de contenu markdown/HTML riche (headings, listes, blockquote, code, hr ; tables et liens hérités du DS). CSS-only, scope :where() anti-collision. Section #prose (divers.html). (#439)
- Split button (.split-button) : action primaire + caret menu attache, panneau bati sur le primitif .menu (#520), initSplitButton dedie (open/close, aria-haspopup/expanded sur le caret, nav clavier fleches/Home/End/Echap, fermeture outside-click+Escape). Section #split-button (fin de composants.html). (#438)
- Button group attache (.btn-group) : conteneur CSS-only inline-flex qui accolle des .btn-* (radius mitoyens via proprietes logiques, bordure partagee, z-index focus), role=group + aria-label. Remplace un hack inline (.tab detournes). Distinct de .segmented (choix exclusif). (#451)
- Pattern de validation de formulaire a11y (`#form-validation`) : `initFormValidation()` traduit la validité HTML5 native en messages FR, pose `aria-invalid`/`aria-describedby`, région live polite au blur + résumé `.alert[role=alert]` focusable au submit. Opt-in via `<form data-validate>`. Réutilise `.input-error`/`.alert` (#519), 0 nouveau token. (#433)
- Calendrier interactif INLINE (#432) — `initCalendar()` : single + range 2-bornes (1 calendrier, 2 clics), navigation mois, grille a11y clavier complète (roving tabindex, role grid/row/gridcell, aria-live mois), événement `calendar:change`. Time-picker `initTimePicker()` 24h/12h (#436) mutualisant `.number-input-wrap` + `.segmented`, événement `time:change`. JS Date natif, zéro dépendance.
- **Table server-driven — M#40 (#434)** : pattern `server-data-grid` (data.html en fin) + `initServerDataGrid()` distincte, opt-in `.data-grid[data-server]` + `data-page-size`, pagination num&eacute;rot&eacute;e/ellipsis, skeleton rows, `aria-busy`, live region, fetch mock&eacute; setTimeout 600ms 26 lignes, extension CustomEvent `dg:page-change`. CSS additif tables.css, feedback.css intact, mode client non modifi&eacute;. (#434)

### Changed
- Registre parité React (M#41) : reclassement `react:"n-a"` de 7 entrées présentationnelles/utilitaires (reset-natif, texture-grain, brand-acssi, code-inline, avatar-img, sidebar-link-disabled, sidebar-sublinks) — dénominateur juste (79→72 pending), aucun wrapper concerné. Bump synchrone 8 sources 2.95.0→2.95.1 (patch). (#396)
- Registre : `file-upload` passé `react:"ported"` (#469).
- Registre : `tag-input` passé `react:"ported"` (#466).
- Registre : `number-input` passé `react:"ported"` (#464).
- Registre : `search-input` passé `react:"ported"` (#465).
- Registre : `slider` passé `react:"ported"` (#463).
- Registre : `dropdown` passé `react:"ported"` (#457).
- Registre : `segmented-control` passé `react:"ported"` (wrapper `@msyx-dev/react`, #467).
- Registre : `inputs` passé `react:"ported"` (wrappers `@msyx-dev/react`, #458).
- Registre : `action-menu` passé `react:"ported"` (wrapper `@msyx-dev/react`, #456).
- Registre : `tabs` passé `react:"ported"` (wrapper `@msyx-dev/react`, #455).
- Registre : `modal` passé `react:"ported"` (wrapper `@msyx-dev/react`, #454).
- Registre : `toast` passé `react:"ported"` (wrapper `@msyx-dev/react` livré, #453).
- Registre : suppression du doublon `color-input` (2 entrées identiques pour le color picker natif ; l'entrée canonique `color-picker` — celle qui matche `<section id="color-picker">` et porte le champ `example` — est conservée). Seul doublon de signature du registre. `kind:component` **105 → 104**, total composants 134 → 133, compteurs `site.html` (hero/meta/footer) recâblés **105 → 104**. Parité React : **5 ported / 102 portables** (97 pending, 31 n-a). (#603)
- Registre : `react:"n-a"` posé sur les 4 composants M#40 **CSS-only** (`btn-group`, `prose`, `orb`, `diff-viewer`) — non portables en wrapper React interactif (aucun `jsInit`). `npm run generate-registry` recompute la parité : **5 ported / 103 portables** (98 pending, 31 n-a — vs 5/107 / 27 n-a avant). Setup du sprint 1 M#41 (parité React, epic #396). `kind` inchangé, compteurs `site.html` intacts, aucun impact CSS/JS servi. (#601)
- Registre : `kind:component` posé sur 7 entrées M#40 (`form-validation`, `btn-group`, `split-button`, `prose`, `orb`, `color-input`, `json-viewer`) — elles entrent désormais dans la validation phantom / pont `module[]` / frontière page↔registre. `kindComponentTotal` 98 → 105. Compteurs `site.html` (hero, meta, footer) recâblés sur ce total : 89/89/88 → 105 ; version meta rafraîchie v2.79.0 → v2.94.1. (#588)

### Fixed
- A11y overlays fermés (`shared/components.js`) : `initFAB`/`initBottomSheet` posent `inert` + `aria-modal`/`role` conditionnels sur les panneaux fermés (contrôles hors-écran non tabulables). Pendant React en `@msyx-dev/react` v3.0.0-alpha.12. Bump 8 sources 2.95.1→2.95.2. (#396)
- **Header `/me.json` 404 sur la vitrine (#531)** : ajout d'un `me.json` de démo à la racine (servi par Caddy `file_server`) → le bootstrap session de `site.html` reçoit `200` au lieu de `404`, supprimant la seule erreur console du DS. Bonus : la zone utilisateur du header (avatar + dropdown) est désormais peuplée d'un user de démo (showcase). Le bootstrap gérait déjà le `null` gracieusement ; le 404 était un log réseau navigateur insuppressible par JS. Aucun impact consumer (`me.json` non distribué par `sync.sh` ; les consumers M3 exposent `/me.json` via le `handle` Caddy/Authentik qui prime). (#531)
- `.btn-group` : le lift `transform: translateY(-2px)` des boutons au survol désalignait verticalement les boutons mitoyens du groupe. Neutralisé via `.btn-group > :hover { transform: none }` (z-index de focus préservé), miroir du fix déjà en place sur `.split-button`. (#589)

## [2.77.0] — 2026-06-18 — Consolidation doublons composants (M#44, Epic #517)

### Changed
- **Unification messaging — M#44 (#519)** : `.alert` élu **canonique unique** des 3 patterns de messaging (`.alert` / `.zone-banner` / `.upgrade-banner`). Ajout de deux modificateurs : `.alert--kpi` (ex-`.zone-banner` : border-left 4px, display block, valeur KPI) et `.alert--cta` (ex-`.upgrade-banner` : icône lg, slot actions, radius-lg). Slots mutualisés `.alert-title` / `.alert-body` / `.alert-desc` / `.alert-value` / `.alert-actions`. Tokenisation des 3 alphas divergents : `--alert-bg-alpha` (8 % défaut) + `--alert-border-alpha` (20 % défaut), surchargés à 10 %/30 % par `.alert--kpi`. Migration `upgrade-banner` hors de `pricing.css` → `alerts.css`. HTML vitrine `feedback.html` migré (`.zone-banner` → `.alert--kpi`, `#upgrade-prompt` → `.alert--cta`) avec `role="alert"` + `aria-hidden` sur icônes. Alias `@deprecated` complets (`.zone-banner`/`.zone-loss|warning|profit|info` + `.upgrade-banner`/`--warning|--danger` + tous les slots) conservés jusqu'à v3 — rendu pixel identique aux originaux. Registre : nouvelle entrée `upgrade-prompt` (page feedback), `.upgrade-banner*` retiré de `pricing`, `cssClasses` `alert` étendu. Non-breaking. (#519)
- **Primitif `.menu` — M#44 (#520)** : nouveau module `shared/css/components/menu.css` — primitif `.menu` / `.menu-item` / `.menu-divider` (surface flottante mutualisée : `surface-solid`, border, `--radius-md`, `--shadow-menu`, padding, hover/danger/focus-visible). Token `--shadow-menu` ajouté dans `tokens.css` (dark : `0 8px 32px var(--overlay-black-35)` ; light : `0 8px 32px var(--overlay-black-stripes)`). Importé en tête de cascade dans `components.css` et `components-core.css`. Les 6 surfaces existantes deviennent des **alias `@deprecated v3`** (markup HTML/JS/React inchangé, NON-BREAKING) : `.context-menu` / `.action-menu` (`overlays.css`), `.dropdown-menu` (`forms.css`, tokenisation `10px` → `--radius-md`), `.header-dropdown` / `-item` / `-divider` (`layout.css`, tokenisation shadow `0 8px 32px` → `--shadow-menu`), `.user-menu-dropdown` / `-item` / `-divider` (`navigation.css`, tokenisation idem, a11y `visibility:hidden` #382 préservée). `.cmd-item` / `.cmd-results` / triggers / `.context-submenu` hors scope (décision spec §2.4). Churn VR HIGH assumé (header sur 10 pages) — rebaseline via soft-harvest CI. (#520)
- **Consolidation saisie jetons — M#44 (#522)** : `tag-input` élu **canonique unique** (`.tag-input-wrap` / `.tag-item` / `.tag-input-field`, `forms.css`) — sur-ensemble strict de `chip-input` (limite `data-max`, compteur, erreur/disabled, label, hint, événements). `.chip-input-*` (`badges.css`) marqués `@deprecated v2.77.0`, alias rétro-compat restituant le rendu canonique (radius 20px, padding, couleur) — suppression v3. **Tokenisation `.tag-input-wrap`** : `border-radius: 10px` → `var(--radius-sm)` (8px, −2px visuel assumé churn VR M#44) et `transition: 0.2s` → `var(--duration-base)`. Garde anti-double-bind renforcée : clé `dataset.chipInputBound` dédiée au bloc `initChips` (isolation future-proof). Registre : exemple `contenteditable` erroné corrigé en `<input>` réel + note dépréciation. Non-breaking (aliases conservés, aucune modif HTML consumer). (#522)
- **Consolidation stepper 2→1 — M#44 (#521)** : `.wizard-step*` (`tracker.css`) réduit à des **alias `@deprecated`** du primitif canonique `.step*` de `navigation.css` (suppression réelle en v3). Layout enveloppe (`.wizard`, `.wizard-steps`, `.wizard-content`, `.wizard-panel`, `.wizard-actions`, `.wizard-step-indicator`) conservé ; apparence wizard historique préservée (ring 4px, bordure 2px) pour garantir 0 régression VR. Tokenisation au passage : `border-radius:50%` → `var(--radius-full)`. Non-breaking : l'API `.step*` canonique reste strictement additive (compatible consumer `acssi-core`). Note de dépréciation ajoutée dans `formulaires.html#wizard`. (#521)
- **Bascule dark/light unifiée — M#44 (#518)** : `.mode-switch` (`layout.css`) élu **canonique unique**. `theme-toggle.css` réduit à des alias `@deprecated` (suppression réelle en v3, adoptent les dimensions canoniques iOS-style 56×32 / 24×24). Wrapper React `ThemeToggle` réécrit pour émettre le markup `.mode-switch` (icônes sun/moon, classe `.is-dark`) ; `aria-checked` aligné sur le vanilla (`true === DARK`, #382), test corrigé. Entrées registre `theme-toggle`/`theme-switcher` fusionnées, `REACT_TO_REGISTRY` remappé (check parité préservé). Non-breaking (alias rétro-compat CSS). (#518)

## [2.76.0] — 2026-06-16

### Changed
- **Réorganisation des pages vitrine (#514)** : `feedback.html` scindé (19→12 sections « états ») + nouvelle page **`overlays.html`** (7 surfaces flottantes : modals, drawer, bottom-sheet, FAB, notification-center, confirm-popover, tooltip) ; `motion.html` repliée dans `fondation.html` (13→16 sections, page supprimée). Manifeste sidebar (`generate-nav-sections.js`), registre (pointeurs `page`), compteurs hero et specs VR/a11y/modal-focus réalignés ; **9 pages** inchangé. Aucun CSS modifié. Baselines VR régénérées via récolte des `actual` CI (overlines `OVERLAYS`/`FONDATION` des sections déplacées). (#514)

## [2.75.0] — 2026-06-15

> Lot churn-VR du milestone #43 (Epic #505) — réorganisation des modules CSS par destination sémantique, **zéro diff de rendu** (déplacements purs, cascade finale identique via le barrel). #514 (réorg pages vitrine) reporté (blocage régénération baselines VR, cf. issue).

### Changed
- **login-screen — rapatriement CSS** : bloc AUTH FLOWS (`.login-step`, `.login-strength`, `.login-strength-bar`, `.login-strength-fill`, `.login-strength-label`, `.login-cgu`, `.login-success-msg`, `.login-back-link`) déplacé de `pricing.css` → `forms.css` (co-localisation login) ; registre réattribué `pricing`→`login-screen` ; `module[]` régénéré. Rendu inchangé. (#510)
- **Éclatement `interactive.css` + `pricing.css` vers modules existants** : FAB + AUTO-SAVE → `feedback.css` ; SEGMENTED → `navigation.css` ; INLINE-EDIT + SETTINGS → `forms.css` ; COMMENTS → `feedback.css` ; ICON (`.icon`/`--sm`/`--lg`) → `_base.css` (primitif sprite). `interactive.css` conserve CODE+COPY ; `pricing.css` conserve PRICING/UPGRADE/USAGE. `module[]` auto-dérivé. (#512)
- **Fusion `modals.css` → `overlays.css`** : module unique « surfaces flottantes » (modal/popover/command-palette/drawer/bottom-sheet/confirm-popover + tooltip/context-menu/action-menu). `modals.css` réduit à un stub `@import` (compat consumer 1-2 versions), import retiré du barrel (anti double-inclusion). `@keyframes fadeIn` préservé dans `overlays.css` (consommé par `quiz.css`). (#513)

## [2.74.0] — 2026-06-14

> Sprint #43 — Cohérence taxonomie & navigation (axe registre & doc). Pont page↔module, registre complété, règle frontière. Aucune modification CSS de rendu (bump synchrone des 8 sources pour cohérence `check-versions`).

### Added
- **Registre — champ `module[]` (pont page↔module)** : `bin/generate-registry.js` dérive automatiquement `module[]` (string[], chemins repo) pour chaque `kind:component` via la map inverse classe→fichier ; 76 entrées peuplées (3 exemptées : `reset-natif`, `texture-grain`, `brand-acssi`), `code-inline` normalisé string→array. Contrôle d'intégrité ajouté au mode `--check` (résolubilité + cohérence fichiers réels + idempotence). Politique documentée dans `docs/DS-PRINCIPLES.md` §8.2. (#506)
- **Registre — 10 entrées composants** : ajout des `kind:component` manquants (templates : kanban, roadmap, backlog, sprint, settings-panel ; data : charts, gauge, activity-feed, risk-matrix, usage-meter) ; `module[]` auto-dérivé ; correctif curatif `.settings-*`/`.usage-*` retirés de l'entrée `pricing` ; compteurs hero 78→88. (#508)
- **Règle frontière page↔registre** : nouvelle Section 6.1 dans `docs/DS-PRINCIPLES.md` — invariant triplet `<section id>` ↔ entrée registre `kind:component` ↔ `module[]`, exemptions transverses (`_base`, `_a11y`, `_responsive`, `theming`, `section-header`, `signature`) et pages de référence (`fondation`, `motion`, `getting-started`), anti-patterns ❌/✅. Garde-fou CI : `generate-registry.js --check` étendu avec contrôle frontière bidirectionnel (section sans entrée + entrée orpheline), warn-only par défaut, `--frontier-strict` opt-in après #508. (#511)

### Fixed
- **Doc core preset** : `CONSUMER_GUIDE.md` reflète les 9 modules réels du preset core (`navigation` inclus depuis v2.73.0, `modals` exclu), poids gzip recalculés (~14,5 KB core / ~37 KB barrel complet), liste « Modules disponibles » complétée (+`access-denied`, `brand`, `section-header`, `signature`, `theme-toggle`). Compteur modules corrigé dans `CLAUDE.md`. (#507)

### Changed
- **`entrypoint.sh`** : bump `VERSION` 2.72.0 → 2.73.0 — cohérence `/version.json` préprod après #542 (header par défaut). Pas de bump DS (entrypoint uniquement).

## [2.73.0] — 2026-06-14

### Changed
- **Header DS — cloche hors auth** : `notifBellHtml` extrait du bloc `if (authEnabled)` — cloche rendue par défaut (masquable via `notifications.enabled:false`), profil reste derrière `auth:true`, switcher thème derrière `themeSwitcher` (défaut `false`). (#542)
- **FIX FOUC #251** : `updateModeSwitch()` déplacé avant le guard `if (!select) return` dans `initThemeSwitcher` — synchro dark/light garantie même sans switcher thème. (#542)
- **`components-core.css`** : `navigation.css` ajouté au barrel core (tabs/breadcrumb/stepper/bottom-nav) + `cp` correspondant dans `sync.sh --components=core`. (#542)
- **9 pages DS** : `themeSwitcher:true` dans le `MSYX_HEADER` inline pour conserver le switcher après le changement de défaut. (#542)
- **`CONSUMER_GUIDE.md`** : section Header refaite — tableau éléments/défauts, `themeSwitcher` documenté, exemples consumer mono-thème et vitrine. (#542)

## [2.72.0] — 2026-06-14

### Added
- **Password toggle** : composant `.password-field` + `.password-toggle` + `initPasswordToggle()` — toggle show/hide sur input[type=password], icône `i-eye-off` ajoutée au sprite, 3 variantes dans `formulaires.html` (vide, rempli, + `.login-strength`). (#435)

## [2.71.2] — 2026-06-14

### Fixed
- **15 sections orphelines réintégrées dans `.main`** (`fondation` 6, `formulaires` 6, `navigation` 3) — cause racine des « libellés absents » de la sidebar : des `<section id>` réelles étaient placées **hors** du conteneur `.main` (HTML déséquilibré : `</div>` parasites sur fondation/formulaires ; sections après la fermeture de `.main` sur navigation) → invisibles dans la nav verticale ET rendues en pleine largeur par-dessus la sidebar. Rééquilibrage des `<div>` → sections dans la colonne de contenu + +15 liens sidebar. (#538)
- Sections réintégrées : `utilities`, `brand`, `iconographie`, `performance-glass`, `texture`, `svg-theme-aware` (fondation) ; `otp-input`, `tag-input`, `quiz`, `wizard`, `inline-edit`, `filter-bar` (formulaires) ; `sidebar-rail`, `action-menu`, `user-menu` (navigation). (#538)

### Changed
- **`bin/generate-nav-sections.js`** : `EXPECTED_COUNTS` mis à jour (fondation 7→13, formulaires 9→15, navigation 5→8 ; total 93→108) + garde-fou conservé. (#538)
- **`entrypoint.sh`** : bump `VERSION` 2.69.0 → 2.71.2 — cohérence `/version.json` préprod après redeploy.

## [2.71.1] — 2026-06-14

### Fixed
- **Overflow horizontal — 5 pages restantes** : `html{overflow-x:clip}` dans `base.css` (filet page, neutralise `.copy-tooltip`, popovers header, `.drawer-panel` absolute/transform) + confinements UX sur `pre > code.typo-mono` (scroll interne), `.segmented` (pill scrollable), `.stepper` et `.tabs` (scroll mobile). 0 overflow sur 11 pages × 4 viewports. (#530)

## [2.71.0] — 2026-06-14

### Added
- **`.stat-value--sm`** : variante `font-size: 1.5rem` dans `data.css` — ferme la dette A8 inline `templates.html`. (#515)

### Changed
- **`data.html`** : 15 sections réordonnées en 5 familles (Graphiques · Indicateurs chiffrés · Jauges & progression · Tabulaire · Listes & flux). Notes « quand utiliser » ajoutées (stats/counters et famille Meter). Non-breaking. (#515)
- **`templates.html`** : 3× `style="font-size:1.5rem"` remplacés par `.stat-value--sm`. (#515)

## [2.70.0] — 2026-06-14

### Fixed
- **Sidebar — sous-sections absentes préprod auth-gated** : `resolvePageSections()` fetch runtime → HTTP 302 Authentik → 0 sections. Fix : manifeste `NAV_SECTIONS_MANIFEST` généré au build (`bin/generate-nav-sections.js`), inliné dans `shared/nav.js`, ZÉRO fetch runtime. Immunisé auth-gate, cache, CSP. (#528)
- **Sidebar — doublon « Getting Started »** : lien parent `page.label` supprimé si la 1ère section porte le même label. 95 → **94 liens**, 0 doublon. (#528)

### Changed
- **`bin/generate-nav-sections.js`** (nouveau) : scanne `.main > section[id]` direct-child via Playwright, produit `NAV_SECTIONS_MANIFEST` inliné dans `nav.js`. Mode `--check` CI bloquant. (#528)
- **CI** : step `Nav sections manifest validation (#528)` dans job `lint`. (#528)

## [2.69.1] — 2026-06-14

### Fixed
- **Overflow grilles `.demo-grid-*`** : `1fr` → `minmax(0, 1fr)` dans les 4 déclarations `grid-template-columns` (base, media 1024, media 768, @container) — le plancher `auto` = max-content (~441px) causait un débordement +399px à 1280px, +90px à 375px. Ajout `min-width: 0` sur `.demo-box`. (`shared/css/layout.css`, #529)
- **`.login-preview`** : ajout `width: 100%; max-width: 100%` défensif. (`shared/css/components/forms.css`, #529)

## [2.69.0] — 2026-06-13

### Fixed
- **Sidebar nav.js — 6 liens morts** (`composants#theme-switcher/tooltip/fab/action-menu`, `navigation#segmented-control/pagination`) : mauvais rangement page↔composant corrigé mécaniquement par la génération dynamique depuis le DOM réel. (#509)
- **Sidebar nav.js — 38 sections orphelines** : 38 des 108 `<section id>` absentes de la navigation apparaissent désormais automatiquement. (#509)

### Changed
- **`shared/nav.js` — sidebar dynamique** : tableau `NAV_SECTIONS` (~80 ancres) remplacé par manifeste `NAV_PAGES` (11 pages) + scan DOM runtime (`extractSections`, `resolvePageSections`, `buildSidebar` async, `renderEmptySidebar`). Non-breaking consumers. (#509)

## [2.68.0] — 2026-06-13

### Added
- **Registre — champ `react`** (`ported`/`pending`/`n-a`) par composant : rend l'écart CSS↔React auditable (#523).
- **CI parité React** : `generate-registry.js --check` valide que toute classe émise par `packages/react/` existe dans le CSS du DS + cohérence du marquage `react: ported` (extension du validateur #516, autonome) ; écart global affiché. (#523)
- **DS-PRINCIPLES Section 8.1** : politique « gap tracé » → bascule lockstep dès qu'une app React ship. (#523)

### Changed
- **`bin/generate-registry.js` v1.2** : normalisation du champ `react` + check parité React (a)+(b)+réciproque ; écart global dans les deux rapports (écriture et `--check`) (#523).
- **CI step lint renommé** : « Registry validation — phantoms (#516) + React parity (#523) » — même commande, périmètre documenté élargi (#523).

## [2.67.1] — 2026-06-13

### Added
- **CI `lint`** : step `Registry phantom-class validation (#516)` → `node bin/generate-registry.js --check` (sans `continue-on-error`) — bloque le merge si un composant hand-written introduit une classe fantôme (#516, PR #524).

### Fixed
- **Registre** : 9 entrées `kind:component` corrigées — classes `cssClasses`/`example` fantômes alignées sur le CSS réel et la démo (`code`, `tag-input`, `breadcrumb`, `skeleton`, `accordion`, `stepper`, `empty-state`, `filter-bar`) (#516, PR #524).

## [2.66.0] — 2026-06-03

### Added
- `shared/css/base.css` : socle global (reset, focus accessible, `html`, `body`, `body::after` texture grain) **désormais distribué aux consumers** via `sync.sh` (→ `ds-base.css`) — auparavant inline dans `styles.css`, jamais synchronisé (acssi-core#592, PR #362).

### Fixed
- Les consumers ne recevaient jamais le socle et recréaient un `body` appauvri (rendu « plat », sans texture). `body` du socle : `font-family: 'Inter'` (literal) → `var(--font-sans)` (tokens-first, compatible next/font).

### Changed
- `styles.css` : bloc « BASE RESET » extrait vers `css/base.css` puis ré-importé (showcase inchangé, source unique du socle).
