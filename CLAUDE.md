# CLAUDE.md — design-system
# Niveau 2 — Contexte projet

## Role
Design system vivant de msyx.fr — source de verite pour tous les composants UI.
Tout projet msyx.fr qui a besoin d'un composant manquant doit le creer ICI d'abord.

## Principes & anti-patterns — lecture obligatoire
**Avant toute modification de code DS, lire `docs/DS-PRINCIPLES.md`.** Le document consolide les règles de qualité (tokens-first, theming, a11y WCAG AA, mobile-first, perf budgets, naming, versioning), la checklist anti-dette par composant, et les anti-patterns observés sur les consumers à ne JAMAIS reproduire dans le DS.

Rappels condensés (la version complète est dans `docs/DS-PRINCIPLES.md`) :
- **Aucune valeur hardcodée** (hex/rgb/px/font) — toujours `var(--token)` depuis `tokens.css`
- **10 combos theme/mode à tester** — MSYX/ACSSI/Nhood/Auchan/Noël × dark/light (5 × 2, `THEME_CONFIG` de `shared/components.js`)
- **Mobile-first uniquement** — `@media (min-width: ...)`, jamais `max-width`
- **A11y baseline** — `aria-label` sur icon-only, `:focus-visible`, contraste 4.5:1, target 44px mobile
- **Anti-FOUC** — script synchrone inline `<head>`, lit `msyx-theme` + `msyx-mode` (jamais de naming divergent)
- **Anti-double-bind JS** — pattern `dataset.bound` sur tous les event listeners
- **Pas d'override de classe DS** — customiser via variables CSS, jamais redéfinir
- **Version bump synchrone** — 10 sources verifiees par `shared/check-versions.sh` (`@ds-version` dans `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `base.css`, `themes.css`, `nav.js` + `const VERSION` de `nav.js` + `version` de `shared/components-registry.json` + `version` de `package.json` racine). `themes.css` est autogenere : son en-tete est derive de `tokens.css` par `node shared/build-themes.js` (relancer apres chaque bump, #951)
- **Contraste des boutons pleins** — fonds = 8 tokens dédiés `--btn-{primary,danger,success,warning}-bg-{start,end}` (hex littéral, 4 couches, jamais dérivés), réglés à la mesure ; texte = `--btn-on-*` (`--btn-on-primary` = alias `--text-on-accent`, blanc en Auchan sombre) ; sonde pixels `visual-tests/button-contrast.spec.ts` **bloquante** (≥ 4.5:1, visé ≥ 4.6, repos + survol, 10 combos) ; jamais d'`opacity` au survol d'un bouton plein ; ne jamais baisser le seuil ni retirer un cas `SOLID` pour passer (§3.3, #944)
- **Checklist anti-dette** — 9 dimensions à valider par composant (HTML/CSS/JS/A11y/Perf/Doc/Version/Registre/VR)
- **Jamais de donnée consumer concaténée dans `innerHTML`** — construire les nœuds (`createElement`/`setAttribute`/`textContent`) ; `escapeHTML` ne protège qu'un contexte texte, jamais un attribut (voir `docs/DS-PRINCIPLES.md` §11)

Si une règle te paraît ambiguë : `docs/DS-PRINCIPLES.md` a un exemple ❌ Don't / ✅ Do pour chaque cas.

## Stack
- HTML/CSS/JS statique pur (pas de framework, pas de build)
- Servi en préprod par Coolify (app `design-system-preprod`), 100% Authentik-gated
- URL (préprod-only) : https://design-system.miklaw.fr — ⚠️ le DS ne vit QU'EN préprod ; `design-system.msyx.fr` N'EXISTE PAS (absent de la config Caddy active)

## Structure
```
assets/             # Brand assets SVG (v2.43.0) — logos MSYX revectorisés depuis logoMSYX.png (#954, potrace une passe par zone, mesuré : IoU zones 0,9991, ΔE2000 moyen 0,08 ; planches et mesures dans docs/renders/954/) ; distribués par `sync.sh` dans <cible>/assets/ (MSYX toujours, charte cliente via --assets=<c>) et vérifiés par `check-sync.sh` (sha256)
  logo-msyx.svg     # PRIMARY mark (viewBox 1475×1562, quasi-carré), fidèle au PNG officiel
  logo-msyx-mark.svg  # Mark alias (identique à logo-msyx.svg)
  logo-msyx-dark.svg  # Variante fond sombre (dégradés du PNG officiel, ids distincts)
  logo-msyx-light.svg # Variante fond clair (gradients assombris pour contraste WCAG AA)
  logo-acssi*.svg   # Charte ACSSI (4 fichiers) — opt-in côté consommateur via sync.sh --assets=acssi
  tree-noel.svg     # Sapin du thème Noël — JAMAIS distribué (un SVG en <img> est opaque au CSS : ni tokens ni .tree-lights) ; le décor l'inline (FestiveDecor / ensureFestiveDecor)
  sources/          # Sources de référence — logoMSYX.png (1475×1562 PNG officiel msyx.fr)
  explorations/     # Historique conception S23 (wordmark-monogram-a/b, NE PAS SUPPRIMER)
index.html          # Page login auth gate
site.html           # Hub principal + lazy-loader des 8 categories
pages/
  getting-started.html  # Installation (3 niveaux), premiers pas, theming, tokens, bonnes pratiques
  fondation.html    # Couleurs, typographie, espacements, ombres, theming (+ .theme-card / .color-grid--compact v2.54.7), theme switcher (v2.47.0), mode-switch iOS-style (v2.55.0), brand identity (wordmark + mark DS, v2.56.0), classes utilitaires (+ .hidden-mobile/.hidden-desktop responsive v2.78.0 #568, + .page-content/.main--no-rail consumers sans sidebar v2.78.0 #567, + .page-content--wide vues de donnees (token --content-max-wide 1440px, remappe --content-max) v2.133.0 #859), iconographie (Lucide sprite, v2.33.0), performance (glass vs solid, v2.33.0), + .orb ambient primitif (orb.css, modifs couleur/taille + --float opt-in, v2.86.0 #357) + decor festif (festive.css, .snowfall nappe de flocons CSS-only 3 couches de gradients radiaux + variantes densite --sparse/--dense, .garland guirlande d'ampoules dephasees cycle 1.8s WCAG 2.3.1, --z-decor ajoute a l'echelle d'empilement #932 ; fond de page decore du theme Noel via --texture-grain/--texture-grain-opacity de themes/noel.json, ON par defaut sur [data-theme="noel"] ; neige opt-in cle localStorage msyx-festive defaut OFF, dogfoodee dans le header via ensureFestiveDecor()/updateFestiveDecor() de nav.js + initFestiveDemo() de components.js ; + couche illustrative (retour Mike) : sapin illustre assets/tree-noel.svg (.festive-character/--left, lumieres .tree-lights synchronisees sur --garland-cycle), ornements suspendus sous le header (.ornaments/.ornament, --ornament-color/--size/--drop, --i dephase), givre sur les bords (.frost, --frost-color/--height/--top), neige posee sur cartes/boutons (.snowcap/--sm, --snowcap-color, demo sur une vraie carte), bouton canne a sucre (.btn-candy, decor dans la bordure border-box uniquement — contraste du libelle strictement inchange, contrainte de conception) ; palette multicolore du theme Noel (accent rouge vif/or/vert emeraude/bleu glacier/rose/violet satures, 54 valeurs remplacees, dark 4.60:1 accent/surface, light 7.61:1), v2.139.0 #940) + Motion : durations, easings, 6 patterns canoniques (#514), + .detail-grid 2 colonnes + .section-header--sticky (#795), + palette categorielle (#palette-categorielle, 8 teintes --cat-1..8 separables jalons/series/tags/legendes, categoriel != semantique, contrat C1 ΔH(OKLCh)>=30°/C2 ΔE(OKLab)>=0.12/C3 contraste>=3:1 verifie par bin/check-categorical-palette.js sur les 10 combos, utilitaires .bg-cat-*/.border-cat-* — pas de .text-cat-N, v2.121.0 #800)
  composants.html   # Cards (+ card-link a11y v2.49.0, + card-muted WCAG-safe v2.78.0 #569, + card-media vignette bleed v2.79.0 #37), badges (+ badge-nav compact v2.49.0), boutons (+ polish sémantique theme-aware v2.54.11 : tokens fg dédiés --btn-on-*, shadow alpha --btn-shadow-alpha, border subtil, + .btn-group attaché v2.83.0 #451, + .split-button caret menu v2.84.0 #438), chips, dividers, rating, avatars, alertes, modals (+ focus restore WAI APG v2.41.0), toasts (+ toast-message v2.49.0), segmented control (ARIA `role="radiogroup"`/`role="radio"` + roving tabindex + flèches, décision #613 v2.116.0, + démo « conteneur étroit » du cas réel #866, v2.127.0 #900), achievement badges, popovers, reset natif (a + :focus-visible, v2.31.0), disabled global (éléments natifs hors .btn-*/.input, v2.40.2)
  navigation.html   # Header user zone (avatar, dropdown, notifications, brand configurable window.MSYX_HEADER.brand v2.78.0 #570), Tabs, breadcrumbs, stepper, bottom navigation, action-menu (v2.47.0), demos « conteneur etroit » pour .tabs et .stepper (scrollbar visible au debordement, v2.127.0 #900)
  formulaires.html  # Inputs, selects, checkboxes, file upload, login, login-screen (3 variants Authentik + slots providers, v2.57.0), calendrier interactif single/range INLINE + time-picker 24h/12h (#432/#436, + etat vide : champ vide = null dans time:change (empty:true), heure incomplete = absente, bouton [data-time-clear] opt-in, React value/defaultValue nullable + clearable et NumberInput value={null}+onEmpty, v2.134.0 #860), slider/range, dropdown (+ entrée de création `.dropdown-create` quand la recherche ne donne rien, événement `dropdown:create`, React `onCreateOption`/`searchQuery` contrôlée, v2.129.0 #855), search input (+ patron combobox WAI-ARIA 1.2 « liste pilotee par le consumer » : role/aria-activedescendant sur l'input, demo statique, v2.127.0 #899), number input, OTP input, tag input, quiz/poll, filter-bar, password-toggle (show/hide œil, v2.72.0), validation-formulaires (initFormValidation a11y v2.82.0 #433), color-picker (.color-input <input type=color> natif v2.87.0 #448), transfer-list (.transfer-list disponibles↔assignés + initTransferList v2.88.0 #444), textarea + compteur de caractères (`.input-footer`/`.input-counter`/`--over`, `initInputCounters`, section `#textarea`, #952 ; React `<Textarea>`), markdown-editor (éditeur Markdown léger — `<textarea>` source de vérité + toolbar d'insertion de syntaxe + aperçu `.prose` ; rendu par whitelist de nœuds, jamais d'innerHTML ; `initMarkdownEditor`, `window.__renderMarkdownInto`, React `<MarkdownEditor>`/`renderMarkdown` ; parité verrouillée par `tests/fixtures/markdown-cases.json`, v2.131.0 #854)
  data.html         # 17 sections en 6 familles (v2.71.0+) — Graphiques (charts, pie-donut) · Indicateurs chiffrés (stats + note quand-utiliser, animated-counters) · Jauges & progression/Meter (progress + note famille Meter, progress-tracker, gauge, usage-meter) · Tabulaire (tables, comparison, data-grid + col actions sticky-end, server-data-grid initServerDataGrid #434) · Listes & flux (tree-view, lists, activity-feed, risk-matrix) · Heatmap (heatmap-calendar contributions-style, initHeatmapCalendar v2.92.0 #442) · Virtualisation (virtual-list fenêtrée, initVirtualList v2.93.0 #440) · Graphe (moteur node-link maison, pipeline measure→layout→paint (paint() async-tolérant #670), layouts fixed+tree+radial+mindmap (bilatéral maison, use case NHOOD) DOM-free + layered (Sugiyama via dagre vendoré, seul layout async, dynamic import) + auto-détection topologique (layout:'auto', route réellement vers layered depuis #670), viewport pan/zoom/pinch (transform sur <g class="graph-viewport">, screenToWorld via getScreenCTM, non-scaling-stroke, LOD, initialViewport démo VR figée, v2.103.0 #667), fit-to-content (fit()=reset identité, le viewBox cadre déjà) + sélection nœud/arête côté renderer (select()/getSelection(), classes .graph-node--selected/.graph-edge--selected, événement graph:selection:change, pré-requis édition I5) + ResizeObserver (1re primitive RO du DS, re-fit conditionnel opts.refitOnResize, débounce rAF, teardown destroy()) + clavier viewport (Échap/f/+/-/flèches) + zoomToNode(id), démo viewport+sélection avec initialSelection déterministe (VR), v2.104.0 #668, + nav clavier nœud-à-nœud (roving tabindex — un seul .graph-node tabindex=0 à la fois, traversée via arbre couvrant déterministe buildSpanningTree(), mapping WAI-ARIA APG tree ↑↓←→/Home/End/Enter, listener délégué sur nodesG cohabitant avec le pan flèches #668 sans conflit, _ensureNodeVisible recentre seulement si le nœud est hors cadre, rôles graphics-document/graphics-symbol, opts.keyboardNav, v2.105.0 #671), + SR live-region + forced-colors I4-2 (.graph-live aria-live="polite" annonçant label immédiat puis connexions model.neighbors() après debounce 300ms ou touche `i`, jamais empilée en traversée rapide, hookée dans _focusNode()/select() ; @media (forced-colors:active) nœuds/arêtes/sélection distingués par forme+bordure et couleurs système Canvas/CanvasText/Highlight ; kill-switch prefers-reduced-motion local ; 2e indice de contraste sélection outline-offset+halo token --graph-select-halo, v2.106.0 #672), + mode édition I5-1 (opts.mode:'view'|'edit' — mode view inchangé ; en edit : toolbar .graph-toolbar .btn-group Ajouter/Relier/Supprimer ≥44px, création nœud double-clic fond (_hitTest elementFromPoint + screenToWorld → addNode) + bouton, création arête mode « Relier » clic source→cible → addEdge, suppression Suppr/Backspace + cascade, contrat focus create→nouveau nœud / delete→nextFocusAfterRemoval (edit-focus.js pur : voisin→parent arbre couvrant→order→null) calculé avant mutation appliqué après repaint rAF, role=graphics-document CONSERVÉ arbitrage A opt1 #662 — application réservé inline I5-2, graph:edit alias de graph:model:change, v2.107.0 #673), + inline-label + ports 44px I5-2 (double-clic nœud → overlay <input> .graph-inline-edit pré-rempli + focus ; Enter/blur → updateNode, Échap → annule, fermeture → re-focus du nœud ; role=application posé sur le <svg> UNIQUEMENT pendant l'édition inline — arbitrage A opt1, graphics-document restauré ensuite ; ports .graph-port hit-area ≥44px révélés hover/focus + drag-to-connect via __pointerDrag → addEdge, ligne fantôme .graph-port-link, désambiguïsation cible = port-drop.js pur testable Node, v2.108.0 #674), + undo/redo I5-3 (GraphHistory pile de patches inverses observant graph:model:change ; Ctrl/Cmd+Z annule, Ctrl/Cmd+Shift+Z ou Ctrl+Y refait ; coalescing 1 patch/session via beginTransaction/commit autour de l'édition inline ; create/delete + addEdge (drag) atomiques = 1 patch (le drag n'ouvre pas de transaction — repaint-annulation en vol la laisserait ouverte, review #675) ; events update-node/update-edge enrichis d'un `prev` non-breaking ; undo/redo appliquent via les mutations existantes, round-trip toJSON exact ; API createGraph expose undo()/redo()/canUndo()/canRedo() ; clavier (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) + boutons toolbar tactiles Annuler/Rétablir (2e `.btn-group` ≥44px, glyphes `i-undo-2`/`i-redo-2` ajoutés au sprite Lucide via build-sprite.sh, état disabled piloté par `graph:history:change {canUndo,canRedo}` déjà émis par GraphHistory — aucune réimplémentation, `.btn-icon[disabled]` de buttons.css suffit déjà visuellement, v2.114.0 #697), v2.109.0 #675), alternative a11y table aria-describedby, initGraph, opt-in graph.css via link, v2.100.0 #666 + v2.101.0 #669 + v2.102.0 #670 + v2.103.0 #667 + v2.104.0 #668 + v2.105.0 #671 + v2.106.0 #672 + v2.107.0 #673 + v2.108.0 #674 + v2.109.0 #675 + v2.114.0 #697)
  templates.html    # Kanban, roadmap, backlog, sprint board, pricing (v2.47.0)
  feedback.html     # 13 sections états — alertes (.alert--kpi ex-zone-banner, .alert--cta ex-upgrade-prompt #519), tokens status, toasts, skeleton, empty states, spinners, auto-save, pagination, comments, access-denied page 403 (v2.58.0) — #514, + mention @ (.mention-dropdown, initMentionInput, dropdown positionné au caret via mirror-div, #441)
  user-feedback.html  # NOUVEAU (v2.110.0 #705) — catégorie « User Feedback » distincte du `feedback` système, 2 sections : contexte capturé par le Provider (#user-feedback-intro) + parcours complet bouton header (.header-notification.btn-icon data-modal-trigger) → modale (.modal-dialog) → formulaire (.input/.input-group/.input-label) → envoi (#user-feedback-flow), toggle Connecté/Anonyme (email conditionnel requis en anonyme). Démo 100% vanilla dogfoodant les classes consommées par @msyx-dev/react UserFeedback* (#692-695). JS : initUserFeedbackDemo()
  overlays.html     # 8 sections surfaces flottantes — modals (+ largeur par token `--modal-w` : defaut 480px, variante `.modal-dialog--lg` 640px, sur-mesure `style="--modal-w: …"` ; combinaison `dialog.modal-dialog.cmd-palette` = 560px + reset du transform de repos, v2.132.0 #917), drawer, bottom sheet, FAB, notification center, confirm popover, tooltip (scindé depuis feedback.html #514), notes de version (badge + modale timeline + pastille localStorage, initVersionNotes, v2.95.0 #614 — désormais dogfoodée dans le header du DS, badge cliquable + modale alimentée par shared/version-notes.json, v2.96.0 #645 ; chips catégorie par highlight — badge statut mappé sur type, v2.96.1 #647 ; montée de niveau v2.97.0 #649 — badge en Inter + icône spark (i-sparkles), visible en mobile (44px) et compact en desktop (min-width:768px), timeline scopée `.version-notes .timeline` (nœuds anneau-creux, 1er nœud plein+halo, nœud « À venir » pointillé — la primitive globale `.timeline`/`.timeline-dot` de lists.css reste intacte), item « À venir » piloté par `next.highlights`, pastille « Nouveau » sur la dernière version, sous-titre optionnel `subtitle`, modale en `<ol>`/`<li>` + `.modal-title`)
  divers.html       # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks + .code-inline refactor v2.50.0, video embed, + .prose rendu markdown v2.85.0 #439) + Interaction (accordion, command palette fonctionnelle, context menu, copy button) + splitter/resizable panels (.split-pane, initSplitPane v2.90.0 #443) + json-viewer (arbre JSON repliable, initJsonViewer v2.91.0 #446) + diff-viewer (.diff présentation diff pré-calculé, CSS-only, v2.94.0 #447)
shared/
  styles.css        # Agregateur CSS — @import fonts, tokens, themes, utilities, layout, components, base
  css/
    tokens.css      # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood/auchan)
    utilities.css   # Classes utilitaires couleur, backgrounds, bordures, espacement, layout, radius, shadows, typo, accessibilité
    layout.css      # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides, + .detail-grid 2 colonnes contenu/aside sticky (#795)
    components.css       # Barrel pur (v2.36.0) — 39 @import vers components/ dans l'ordre cascade (compte réel v2.139.0 #940 ; graph.css est opt-in via <link> séparé, modals.css est un stub #513 fusionné dans overlays.css — ni l'un ni l'autre n'est importé ici)
    components-core.css  # Barrel essentiel (v2.36.0) — 10 modules essentiels pour consumers légers (menu.css requis par alias forms/navigation)
    components/          # 39 modules CSS importés (v2.139.0 #940, +festive.css) : _base, orb (primitif ambient décoratif #357), festive (décor festif thème Noël, .snowfall/.garland, v2.139.0 #940), menu (primitif .menu/.menu-item/.menu-divider #520), signature (v2.42.0), brand (v2.56.0 — wordmark + mark DS), cards, buttons, badges, theming, forms, data,
                         #   avatars, tables, lists, alerts, overlays, navigation, modals, feedback,
                         #   interactive, templates, media, _responsive, tracker, quiz, _a11y,
                         #   pricing, notifications, motion, access-denied, theme-toggle (v2.60.0), section-header
  sync.sh                    # Sync CSS vers un projet consommateur (--no-showcase, --components=core|list, --with-graph moteur graph.global.js+graph.css v2.100.0 #666, + vendor/graph-layered.js+LICENSE-*/NOTICE v2.102.0 #670, + --assets=<charte>[,…] logos de marque dans <cible>/assets/ : MSYX toujours, charte cliente opt-in, charte inconnue = erreur exit 1 avant toute copie, copie non destructive, tree-noel.svg jamais distribué #954)
  check-sync.sh              # Vérifie un consommateur : version ET contenu (sha256) des fichiers copiés à l'identique (tokens, themes, utilities, base), version seule pour ceux que sync.sh transforme (layout --no-showcase, components) — #951 ; + sha256 des logos distribués dans assets/ (MSYX toujours attendue → MISSING si absente, charte cliente vérifiée si un de ses fichiers est présent) #954 ; + mode --check-overrides
  check-components.sh        # Lint projets consommateurs — détecte composants custom hors DS + passe orphelins opt-in `--orphans=<src>` (#938)
  components-registry.json   # Registre de tous les composants DS (classes CSS, init JS, page)
  version-notes.json         # Données curées {next, released[]} des notes de version — éditées à la main, inlinées au build par bin/generate-version-notes.js (v2.96.0 #645)
  CONSUMER_GUIDE.md          # Guide d'integration pour projets consommateurs
  icons/
    sprite.svg             # Sprite SVG Lucide self-hosted (v2.33.0) — 61 glyphes (+undo-2/redo-2 v2.114.0 #697, +snowflake v2.140.0 #946), ~11 KB
    build-sprite.sh        # Build reproductible (lucide-static + svgo)
  graph/             # Moteur graphique node-link — fondations I1a (v2.98.0 #657) + modele I1b-1 (v2.99.0 #665) + rendu I1b-2 (v2.100.0 #666) + layouts riches I3-1 (v2.101.0 #669) + I3-2 (v2.102.0 #670) + viewport pan/zoom/pinch I2-1 (v2.103.0 #667) + fit/selection/ResizeObserver I2-2 (v2.104.0 #668)
    vendor/           # graph-layered.js — @dagrejs/dagre@3.0.0+@dagrejs/graphlib@4.0.1 VENDORES (ESM lisible, MIT, AUCUN min.js), 1re dep tierce vendoree du DS. build-vendor.sh (reproductible) + VENDOR.md (version pinnee, hash, owner CVE) + LICENSE-*/NOTICE — v2.102.0 #670
    lib/              # pointer-drag.js, svg.js (ES modules) + index.js (barrel) + global-entry.js (IIFE, cf. build.sh)
    model/            # GraphModel (EventTarget observable, DOM-free) + toModel() + index.js (barrel) — data plat Cytoscape-aligne, v2.99.0 #665 ; + history.js (GraphHistory undo/redo pile de patches inverses, buildRecord pur, coalescing beginTransaction/commit, DOM-free testable Node ; events update-* enrichis `prev`), v2.109.0 #675 I5-3
    layout/           # fixed.js + tree.js (Reingold-Tilford naif deterministe) + radial.js (mindmap radiale 360°) + mindmap.js (mindmap BILATERALE maison, use case NHOOD, v2.102.0 #670) + layered.js (Sugiyama via dagre vendore, SEUL layout async, v2.102.0 #670) + detect.js (auto-détection topologique) + auto.js (wrapper layout 'auto', route reellement vers layered depuis #670) + index.js (registre registerLayout/resolveLayout/hasLayout) — purs DOM-free, testables Node, v2.100.0 #666 + v2.101.0 #669 + v2.102.0 #670
    render/           # svg-renderer.js (SvgRenderer measure→layout→paint, paint() async-tolerant #670 ; <g class="graph-viewport"> instancie dans _build()/_initViewport() #667 ; this.positions stocke par _applyLayout() #668 ; sélection _initSelection()/select()/getSelection() classes --selected + graph:selection:change ; fit()/zoomToNode() ; ResizeObserver _initResize() refitOnResize débounce rAF ; clavier _initKeyboard() Échap/f/+/-/flèches ; teardown complet destroy() #668) + node-types.js (graphCard) + a11y-table.js (table aria-describedby) + viewport.js (Viewport pan/zoom/pinch : screenToWorld getScreenCTM, non-scaling-stroke, LOD, fonctions pures clampZoom/userToWorld/worldToUser/zoomAt testables Node) — v2.100.0 #666 + v2.103.0 #667 + v2.104.0 #668 ; + I5-3 undo/redo dans _initEdit() (this.history=GraphHistory, Ctrl+Z/Ctrl+Shift+Z dans _onEditKeydown, _undo/_redo/_afterHistoryNav, transaction inline uniquement (drag=addEdge atomique), history.destroy() teardown ; API undo()/redo() passent par _undo()/_redo()), v2.109.0 #675
    index.js          # createGraph(el, opts) — API publique ESM
    global-entry-engine.js  # IIFE -> window.MSYXGraph, bundle DISTINCT de graph-lib.global.js (build.sh 2e sortie)
  nav.js            # Header (badge de version cliquable dogfoodant version-notes #614, VERSION_NOTES généré au build par bin/generate-version-notes.js #645, inliné entre marqueurs AUTO-GENERATED, ZÉRO fetch runtime, + bouton feedback standard près de la cloche dogfoodant UserFeedback #692-695/#705 — ensureUserFeedbackDialog() injecte la modale une fois dans <body>, mode connecté/anonyme depuis window.MSYX_HEADER.user réel, désactivable via MSYX_HEADER.feedback.enabled, v2.111.0 #708), décor festif dogfoodé (ensureFestiveDecor()/updateFestiveDecor() : injecte .snowfall + .garland une fois dans <body> depuis buildHeader(), visibilité pilotée par data-theme="noel" + localStorage msyx-festive (neige ON PAR DEFAUT depuis #946 — seule la valeur "off" la coupe ; bouton flocon #header-festive-btn dans la zone user du header, WCAG 2.2.2), rappelée par initThemeSwitcher() (components.js) au changement de thème en direct, v2.139.0 #940), sidebar (NAV_SECTIONS_MANIFEST généré au build par bin/generate-nav-sections.js, inliné entre marqueurs AUTO-GENERATED, ZÉRO fetch runtime v2.70.0 #528), scroll spy, SPA navigation, LazyLoader
  components.js     # Composants JS partages (markdown editor #854, toasts, modals, tabs, kanban, sliders, chips, search inputs, data grids, carousel, copy buttons, rating, segmented controls, bottom nav, number inputs, OTP, tag inputs, tree view, bottom sheet, lightbox, context menu, FAB, theme/mode switcher, video embeds, quiz/poll, command palette, matrice risque, compteur de caractères initInputCounters() #952, initFestiveDemo() décor festif démo fondation.html — bascule + densité, persiste localStorage msyx-festive, v2.139.0 #940)
```

## Convention RELEASES.md par package (monorepo)

Le repo distribue **deux artefacts indépendants** :
1. **DS CSS statique** (`shared/css/*`, tokens, registry, `sync.sh`) — servi en préprod via `design-system.miklaw.fr` (Coolify, Authentik-gated).
2. **`@msyx-dev/react`** (workspace `packages/react/`) — package npm publié sur GitHub Packages.

**Chaque artefact a son propre `RELEASES.md`** :

| Artefact | Fichier RELEASES | Versioning | Publish |
|---|---|---|---|
| DS CSS | `RELEASES.md` (racine) | SemVer aligné `package.json` racine (`msyx-design-system`) | Push commit sur `main` → Caddy sert le repo |
| `@msyx-dev/react` | `packages/react/RELEASES.md` | SemVer aligné `packages/react/package.json` (`3.x-alpha` en cours) | Tag `react-v*` → workflow `publish-react.yml` → GitHub Packages |

**Règles d'écriture** :
- **PR touchant uniquement `shared/css/**`, `shared/*.js`, `index.html`, `pages/**`, `site.html`** → entrée dans `RELEASES.md` racine, bump `package.json` racine.
- **PR touchant uniquement `packages/react/**`** → entrée dans `packages/react/RELEASES.md`, bump `packages/react/package.json`. **Aucun bump DS racine**.
- **PR touchant les deux** (cas rare) → 2 entrées (1 dans chaque RELEASES) avec mention croisée.

**Anti-pattern** : ne JAMAIS ajouter d'entrée `@msyx-dev/react` (composants React, versions `3.x-alpha`) dans le `RELEASES.md` racine. Inversement : ne JAMAIS ajouter d'entrée DS CSS (tokens, modules CSS, sync.sh) dans `packages/react/RELEASES.md`.

Cf. issue #314 (convention décidée 2026-05-25, option A).

## Conventions
- Chaque page importe `/shared/styles.css` + `/shared/nav.js` + `/shared/components.js`
- Variables CSS dans `shared/css/tokens.css` — ne pas dupliquer
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
- 5 themes : MSYX (dark+light), ACSSI (dark+light), Nhood (dark+light), Auchan (dark+light, #849), Noël (dark+light, #939)
- `THEME_CONFIG` dans components.js : modes disponibles par theme, extensible
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Toggle sun/moon dans le header, grise si theme dark-only
- Variable `--accent-rgb` : triplet RGB brut par theme, pour les declinaisons `rgba(var(--accent-rgb), X)`
- Variables RGB semantiques : `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`
- **Ajouter un theme** (source de verite depuis v2.39.0 — PAS d'edition manuelle de bloc CSS) :
  1. `./shared/scaffold-theme.sh <nom>` — cree `themes/<nom>.json` depuis `themes/msyx.json`
  2. Remplir les 2 modes (`dark`/`light`) dans ce JSON — s'aligner sur `themes/acssi.json` (couverture la plus complete, 111 cles dark / 105 light — acssi, auchan et noel declarent aussi `--text-on-accent`)
  3. Un theme peut aussi porter sa TYPO : `--font-display`/`--font-sans` sont surchargeables depuis le JSON (acssi = Montserrat, #948). Police auto-hebergee dans `shared/fonts/` + `@font-face` dans `fonts.css`, jamais un CDN tiers.
  3bis. `node shared/build-themes.js` — regenere `shared/css/themes.css` (**AUTOGENERE, ne jamais l'editer a la main**)
  4. `--cat-1..8`/`--chart-1..5` : arbitres par `node bin/check-categorical-palette.js --scale=cat|chart`, pas a l'oeil
  5. 1 entree `THEME_CONFIG`/`THEME_LABELS` (`shared/components.js`) + 1 `<option>` dans le select (`shared/nav.js`)

## Charte graphique MSYX (reference par defaut)
- Theme dark : `--primary: #0a0f1e`
- Accent bleu : `--accent: #3b82f6`
- Gradients : bleu→violet, cyan→bleu, violet→rose
- Typo : Space Grotesk (titres) + Inter (corps) + Fira Code (mono)
- Glassmorphism + border glow subtil
- **Logo officiel (v2.43.0, revectorisé #954)** : `assets/logo-msyx.svg` — mark seul revectorisé à l'identique depuis le source officiel MSYX (`msyx.fr/media/logo/logoMSYX.png`, mark only, 1475×1562 PNG conservé en `assets/sources/logoMSYX.png`). Gradient vertical turquoise→vert→bleu→violet. ViewBox 1475×1562 (ratio quasi-carré). Pas de wordmark texte. Toujours utiliser ce fichier SVG (pas de texte CSS gradient, pas de réinterprétation paths). Variantes dark/light dans `assets/`. Mark alias : `assets/logo-msyx-mark.svg`. Wordmark Monogram historique conservé en `assets/explorations/`.
- **Signature spatiale (v2.42.0)** : gradient underline 2px sous `.section-header .overline` via `signature.css`. Automatique sur toutes les pages.
- **Texture grain (v2.42.0)** : `--texture-grain` + `--texture-grain-opacity: 0.015` dans `tokens.css`. `body::after` global.

## Process ajout composant
Checklist a suivre pour tout nouveau composant (agent coder ou humain) :

1. **HTML** : ajouter la section dans la page thematique appropriee
   - Pattern : `<section id="nom">` + `section-header` + `demo-box` avec exemples
   - Variantes : montrer au moins 2-3 variantes (tailles, etats, couleurs)
   - Respecter le style des sections existantes dans la meme page
2. **CSS** : nouveau module `shared/css/components/<nom>.css` + `@import` dans `components.css`
   - Section dediee avec commentaire `/* ===== NOM COMPOSANT ===== */`
   - Variables CSS uniquement (jamais de hex/rgb hardcode)
   - Mobile-first : media queries co-localisees avec le composant
   - Tester les 10 combinaisons theme/mode (MSYX/ACSSI/Nhood/Auchan/Noël × dark/light)
3. **JS** (si interactif) : ajouter dans `shared/components.js`
   - Fonction `initNomComposant()` exportee
   - Pattern `dataset.bound` anti-double-bind sur les event listeners
   - Appel dans le bloc `reinitAll()` pour compatibilite SPA
4. **Compteur** : mettre a jour le nombre dans `site.html` (hero + hub cards si applicable)
5. **Version** : bumper `@ds-version`/`version` sur les **10 sources** verifiees par `shared/check-versions.sh` : `shared/css/tokens.css`, `shared/css/utilities.css`, `shared/css/components.css`, `shared/css/layout.css`, `shared/css/base.css`, `shared/css/themes.css` (**autogenere** : ne pas le bumper a la main, relancer `node shared/build-themes.js` qui lit `@ds-version` dans `tokens.css` et echoue si elle est illisible), `shared/nav.js` (le commentaire `@ds-version` **et** `const VERSION`), `shared/components-registry.json` (`version`), `package.json` racine (`version`)
   - Feature : minor (2.31 → 2.32)
   - Fix : patch (2.31.0 → 2.31.1)
   - Convention validee Sprint 16 + 17 (memory.md 2026-05-01), gate `shared/check-versions.sh` (issue #377)
   - `bash shared/check-versions.sh` doit sortir `rc=0` avant de commiter le bump
   - **Pre-allocation des versions** : pour les sprints multi-bumps (>2 issues touchant @ds-version), le parent /sprint pre-alloue les versions et les injecte dans le prompt /dev de chaque issue (« Ta version cible : v2.X.Y »). Garantit zero conflit git sur les bumps. Valide Sprint 17 (0 conflit vs 2 attendus en S16).
6. **Docs** :
   - `docs/ARCHITECTURE.md` : ajouter dans la structure + section composants JS si init*
   - `CLAUDE.md` : mettre a jour la liste des composants dans la description de la page
   - `RELEASES.md` : entree Added/Changed
7. **Qualite** :
   - Anti-FOUC : le composant ne doit pas flasher au chargement (script inline <head>)
   - Accessibilite : aria-labels, role, keyboard navigation si interactif
   - Responsive : tester 320px, 768px, 1280px
8. **Registre** : mettre a jour `shared/components-registry.json`
   - Ajouter une entree avec `name`, `page`, `cssClasses` (classes principales), `jsInit` (ou null)
   - Déclarer le statut React : `react: "pending"` (défaut auto — laisser vide, le générateur le matérialise) ou `react: "ported"` si un wrapper `@msyx-dev/react` est créé dans la MEME PR (ajouter au mapping `REACT_TO_REGISTRY` dans `bin/generate-registry.js`). Voir politique `docs/DS-PRINCIPLES.md` Section 8.1.
   - **`module[]` : NE PAS saisir à la main** — auto-dérivé par `generate-registry.js` depuis `cssClasses`. Lancer `npm run generate-registry` après toute modif de `cssClasses`. Voir politique `docs/DS-PRINCIPLES.md` Section 8.2.
   - **Modificateur en sélecteur composé** (`.tooltip.tooltip--bottom`, `.chip.chip-icon`) : `generate-registry.js` ne le capte pas — le saisir à la main dans les `cssClasses` de l'entrée curée ; le step CI bloquant `check-components registry lint` le vérifie (#967).
   - Maintenir la version `"version"` en coherence avec le bump de `@ds-version`

## Deploy
Fichiers servis directement par Caddy. Aucun build necessaire.
Modifier les fichiers → commit/push → visible immediatement.
