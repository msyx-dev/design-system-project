# Releases

## 2.112.2 — 2026-07-24 — Fix : header vanilla aligné sur le flux fichier feedback (#721)

> Le header dogfoodé (`shared/nav.js`) portait encore l'ancien libellé « Joindre une capture » alors que la démo `pages/user-feedback.html` et le composant React (#714) ont basculé sur un ajout de fichier. Alignement pixel-perfect.

### Fixed
- Modale feedback du header (`ensureUserFeedbackDialog()`, `shared/nav.js`) : bouton décoratif « Joindre une capture » remplacé par le bloc `.file-upload` (span `.input-label` « Joindre un fichier » + icône/texte/hint), identique à `pages/user-feedback.html`. Purement visuel — aucune logique de capture ou d'upload n'existait ni n'est ajoutée. (#721)

## 2.112.1 — 2026-07-23 — Formulaire de retour : e-mail pré-rempli en connecté (#708)

> Suite à ton retour : en connecté, le champ e-mail du formulaire de retour est **visible et pré-rempli** depuis la session (modifiable) plutôt que masqué — plus cohérent et transparent.

### Changed
- Header modale (`shared/nav.js`) + démo (`shared/components.js`, `pages/user-feedback.html`) : e-mail visible, pré-rempli + non-requis en connecté ; vide + requis en anonyme. `user` démo doté d'un e-mail (pages vitrine) pour la démonstration. Bouton feedback démo aligné à 34×34.

## 2.112.0 — 2026-07-23 — Polish header : taille bouton, overflow mobile, détection M3 (#708/#710/#711)

> Suite aux retours sur le header #708 : le bouton feedback est ramené à la taille de la cloche (34×34), le header ne déborde plus en mobile (compaction < 640px, #711), et le mode connecté/anonyme du feedback se met à jour après la résolution asynchrone de l'identité en flow M3 Authentik (#710).

### Fixed
- Bouton feedback header : `.btn-icon` retiré → 34×34 comme la cloche (`shared/nav.js`). (#708)
- Overflow horizontal du header < 640px : compaction mobile (wordmark/version-badge/theme-switcher masqués, padding/gap réduits) — vérifié 320/360/375 sur composants.html + formulaires.html (`shared/css/layout.css`). (#711)

### Added
- `updateFeedbackAuthState(user)` + `window.__updateFeedbackAuthState(user)` : ré-évalue connecté/anonyme de la modale feedback après résolution async M3 (`/me.json`), renseigne `MSYX_HEADER.user` (`shared/nav.js`). (#710)

## 2.111.0 — 2026-07-23 — Bouton UserFeedback standard dans le header (#708)

> Le header du DS est la référence de ce qui sera déployé **par défaut** sur un nouveau projet
> msyx : le composant **UserFeedback** (`@msyx-dev/react` alpha.14, démo vitrine #705) devient un
> élément standard du header construit par `shared/nav.js`, à côté de la cloche notifications —
> et non plus confiné à la page démo `pages/user-feedback.html`.

### Added
- **`shared/nav.js` — `buildHeader()`** : bouton feedback `.header-notification.btn-icon` (icône `#i-message-circle`, `aria-haspopup="dialog"`, `aria-label="Donner un retour"`) rendu dans la zone droite du header, sur **toutes** les pages du DS. Indépendant de l'auth (comme la cloche), désactivable via `MSYX_HEADER.feedback.enabled = false`.
- **`ensureUserFeedbackDialog()`** (`shared/nav.js`, patron `ensureVersionNotesDialog()` #614/#645) : injecte une seule fois la `<dialog id="ds-user-feedback-modal">` dans `<body>`, indépendamment de la page démo. Même markup formulaire que `pages/user-feedback.html` (type/titre/description/impact/email conditionnel/capture), ids préfixés `ds-uf-` pour éviter toute collision avec la démo lorsque le header est rendu sur cette page même. Mode connecté/anonyme déterminé **une fois à l'injection** depuis l'état réel `window.MSYX_HEADER.user` (présent ⇒ connecté, email masqué ; absent ⇒ anonyme, email visible + `required`) — pas de toggle démo dans le header standard.
- **`initHeaderUserFeedback()`** (`shared/components.js`, appelée dans `reinitAll()`) : soumission du formulaire — validation native, capture du contexte réel (`app_id`/`version`/`env`/`route`/`browser`/`device`/`viewport`/`langue`/`user`+`tenant`, déduit de `window.MSYX_HEADER` + `navigator`/`location`), toast succès, fermeture + reset. Ouverture/fermeture déléguées à `initModals()` (déjà présent dans `reinitAll()`).
- Registre : entrée `user-feedback` — `notes` étendue pour documenter le dogfood direct dans le header standard (aucune classe CSS nouvelle, composition pure des primitives existantes).

## 2.110.1 — 2026-07-23 — Fix : `.input-group[hidden]` masque réellement (#705)

> Gotcha CSS corrigé, détecté à la validation visuelle de la démo User Feedback : `.input-group { display: flex }` écrasait `[hidden]`, laissant le champ email visible en mode connecté.

### Fixed
- `.input-group[hidden] { display: none }` (`shared/css/components/forms.css`) — l'attribut `hidden` masque désormais un `.input-group`. Corrige tout masquage conditionnel de champ (démo User Feedback + tous consumers du DS). (#705)

## 2.110.0 — 2026-07-23 — Page démo User Feedback (parcours + nav distincte) (#705)

> Vitrine 100% vanilla du parcours **User Feedback** (`@msyx-dev/react` alpha.14) : bouton
> header, modale formulaire, mode connecté/anonyme — reproduite avec les classes CSS DS
> existantes, sans aucun CSS nouveau. Résout la collision de catégorie avec la page
> **Feedback** système (alertes/toasts) en créant une page dédiée et une entrée de
> navigation distincte.

### Added
- **`pages/user-feedback.html`** (NOUVEAU) — 2 sections : contexte capturé par le Provider (`#user-feedback-intro`) et parcours complet bouton→modale→envoi (`#user-feedback-flow`), avec toggle Connecté/Anonyme (email conditionnel requis en anonyme).
- **`initUserFeedbackDemo()`** (`shared/components.js`) — toggle connecté/anonyme (pattern `dataset.bound`) + submit du formulaire démo (`showToast` succès + fermeture modale). L'ouverture/fermeture de la modale reste gérée par `initModals()`.
- **Navigation distincte** : entrée « User Feedback » dans `NAV_PAGES`/`PAGE_TO_LAZY` (`shared/nav.js`), hub-card dédiée dans `site.html`.
- Registre : entrée `user-feedback` mise à jour (`page: "user-feedback"`, `jsInit: "initUserFeedbackDemo"`) — reste liée au wrapper React porté (#692-695).

## 2.109.0 — 2026-07-20 — Moteur graph I5-3 : undo/redo (pile de patches inverses) (#675)

> Dernière brique du lot **I5** (édition) — **undo/redo** au clavier via une pile de
> **patches inverses** (arbitrage A #662/#675, validé Mike). Chaque mutation d'édition est
> réversible ; `Ctrl/Cmd+Z` annule, `Ctrl/Cmd+Shift+Z` (ou `Ctrl+Y`) refait. Clôt le
> conteneur #662.

### Added
- **`GraphHistory`** (`shared/graph/model/history.js` NOUVEAU) — `EventTarget` observant `graph:model:change`, construit un **record réversible** `{forward, inverse}` par mutation (`buildRecord` pur), appliqué via les **mutations existantes** du modèle (pas de `restore()` façon snapshot). Pile undo/redo, `beginTransaction()`/`commit()`, `undo()`/`redo()`, `canUndo`/`canRedo`, event `graph:history:change`, `destroy()`. DOM-free, testable Node.
- **Coalescing** (arbitrage D) : `beginTransaction`/`commit` encadrent la **session d'édition inline** → **1 patch/session** (un `Ctrl+Z` restaure un libellé **entier**, pas frappe par frappe). Create/delete de nœud et création d'arête par drag de port sont **atomiques** = 1 patch chacun.
- **Intégration renderer** (`svg-renderer.js`) : `this.history = new GraphHistory(model)` dans `_initEdit()` ; `Ctrl/Cmd+Z`=undo, `Ctrl/Cmd+Shift+Z`|`Ctrl+Y`=redo (branché dans `_onEditKeydown`) ; `_afterHistoryNav()` repose le focus clavier après le repaint rAF ; `history.destroy()` dans `destroy()`.
- **API** : `createGraph()` expose `undo()`/`redo()`/`canUndo()`/`canRedo()` (no-op en mode view).
- **Enrichissement `prev`** : `GraphModel.updateNode`/`updateEdge` émettent désormais l'état d'avant (`prev`) dans le detail — **ajout non-breaking** (données pures) qui rend l'inverse d'un update constructible.

### Decisions
- **Arbitrage A (undo, validé Mike 2026-07-20)** : pile de **patches inverses** (plutôt que snapshots `toJSON()` par transaction) — léger, collab-ready, round-trip testable. Les events update enrichis de `prev` évitent une surface `restore()`.
- **Clavier-only** dans cette itération : **pas de boutons undo/redo dans la toolbar** — le sprite Lucide n'expose aucun glyphe undo/redo, les ajouter impliquerait un rebuild du sprite + churn VR sur le ticket de clôture. Les boutons touch (≥44px) sont **différés en follow-up** (issue dédiée, une fois les glyphes ajoutés). Le raccourci clavier satisfait l'arbitrage validé et la DoD.
- **Limitation assumée** : l'inverse d'un `update-*` passe par `updateNode`/`updateEdge` (merge `data`) → restaure les clés modifiées/supprimées mais ne peut pas retirer une clé *ajoutée* par un patch forward. La surface d'édition runtime ne mute que des clés existantes (`label`) ou `position`/`size` (remplacement atomique) → round-trip **exact** pour toutes les opérations réelles et la DoD.

### Fixed
- **CI** : câblage dans `ci.yml` des tests unitaires graph jusque-là présents en `package.json` mais **jamais lancés** (`graph-spanning-tree` #671, `graph-edit-focus` #673, `graph-port-drop` #674) + ajout de `graph-history` — trou de couverture réel corrigé.

### Tests
- Node `tests/regression/graph-history.test.js` : round-trip `toJSON` (undo total ≡ initial, redo ≡ final), coalescing (N updates d'1 transaction = 1 undo), redo vidé après nouvelle mutation, `canUndo`/`canRedo`, `graph:history:change`, re-entrance, cascade remove-node.
- Node `tests/regression/graph-model.test.js` : assertions `prev` (update-node/update-edge) + nouveau bloc `updateEdge`.
- Playwright `visual-tests/graph-edit.spec.ts` (12 combos) : `Ctrl+Z` annule create/delete/inline (label complet = coalescing)/lien ; `Ctrl+Shift+Z` refait ; nouvelle mutation vide la pile redo ; mode view inerte.

## 2.108.0 — 2026-07-20 — Moteur graph I5-2 : édition inline + ports 44px (#674)

> Deuxième brique d'édition — **édition inline du label** (double-clic nœud → `<input>`,
> `role="application"` local pendant l'édition, contrat de focus WCAG) + **ports/handles
> 44px** (drag-to-connect, complète le mode « Relier » au clic de I5-1).

### Added
- **Inline-label** : double-clic nœud (mode edit) → overlay `<input class="graph-inline-edit">` pré-rempli + focus → `Enter`/blur = `updateNode`, `Échap` = annule, fermeture = re-focus du nœud.
- **Ports/handles 44px** : `.graph-port` révélés au `:hover`/`:focus-within` (hit-area ≥44px), **drag** handle→cible (`__pointerDrag` + ligne fantôme `.graph-port-link`) → `addEdge` ; drop hors nœud/`Échap` → annulé.
- **Désambiguïsation** : util pur `shared/graph/render/port-drop.js` (cible = centre le plus proche du drop), testable Node.

### Decisions
- **Arbitrage A opt1 (#662)** : `role="application"` posé sur le `<svg>` **uniquement** pendant qu'un `<input>` inline est ouvert (restauré à `graphics-document` ensuite) — la nav SR/clavier I4 reste intacte hors édition.
- Le mode « Relier » au clic (I5-1) est **conservé** comme chemin accessible ; le drag-par-ports est l'UX riche tactile.

### Tests
- Node `tests/regression/graph-port-drop.test.js` (désambiguïsation cible).
- Playwright `visual-tests/graph-edit.spec.ts` étendu (12 combos) : inline edit + focus-restore + `role=application` local + drag port → arête + non-régression I5-1/mode view.

## 2.107.0 — 2026-07-20 — Moteur graph I5-1 : édition create/delete + contrat de focus (#673)

> Première brique d'**édition** du moteur graphique (passage read-only → read-write) —
> `opts.mode:'edit'` : barre d'outils, création de nœuds (double-clic fond + bouton) et
> d'arêtes (mode « Relier »), suppression (Suppr/Backspace + cascade), **contrat de focus**
> a11y (création → nouveau nœud ; suppression → voisin le plus proche via `nextFocusAfterRemoval`).

### Added
- **`opts.mode:'view'|'edit'`** (défaut `'view'`, mode lecture strictement inchangé).
- **Barre d'outils** `.graph-toolbar` (`.btn-group` DS, boutons Ajouter/Relier/Supprimer ≥44px, `role="toolbar"`).
- **Création** : double-clic sur le fond (`screenToWorld` → `addNode`) + bouton toolbar (centre viewport) ; **arêtes** via le mode « Relier » (clic source → clic cible → `addEdge`).
- **Suppression** : `Suppr`/`Backspace` sur la sélection ou bouton → `removeNode`/`removeEdge` (cascade des arêtes via l'index).
- **Contrat de focus** (arbitrage E #662) : création → nouveau nœud ; suppression → `nextFocusAfterRemoval(model, tree, id)` (util pur `shared/graph/lib/edit-focus.js` : voisin → parent arbre couvrant → 1er de l'ordre → null), calculé **avant** la mutation, appliqué **après** le repaint rAF.
- **`graph:edit`** ré-émis sur `.graph` (alias sémantique de `graph:model:change`, arbitrage F).

### Decisions
- **Arbitrage A opt1 (#662)** : `role="graphics-document"` **conservé** en mode edit (nav SR/clavier I4 intacte) — `role="application"` reste réservé à l'édition inline (I5-2).
- Le **drag-to-connect par ports 44px** est reporté à **I5-2** (#674) ; I5-1 crée les arêtes au clic (mode « Relier »).

### Tests
- Node pur `tests/regression/graph-edit-focus.test.js` (`nextFocusAfterRemoval` : voisin/parent/order/null, cyclique/disjoint/auto-boucle).
- Playwright fonctionnel `visual-tests/graph-edit.spec.ts` (12 combos, PAS de screenshot VR) : création (double-clic + bouton), suppression + contrat focus, mode « Relier », mode `view` inchangé, `role` conservé.

## 2.106.0 — 2026-07-20 — Moteur graph I4-2 : live-region SR + forced-colors + contraste (#672)

> Neuvième brique du moteur graphique node-link — **verbalisation dynamique** pour
> lecteur d'écran (`.graph-live`, label immédiat + connexions après debounce/`i`,
> consomme le roving/`select()` #671) + **résilience Windows High Contrast Mode**
> (`@media (forced-colors: active)`, nœuds/arêtes/sélection distingués par
> forme/bordure + couleurs système) + **2e indice de contraste** sur la sélection
> (halo neutre `--graph-select-halo`, indépendant de `--accent`) + kill-switch
> `prefers-reduced-motion`. **Pas de bouton pause** (divergence assumée, aucune
> boucle rAF d'animation continue dans le moteur read-only — dette conditionnelle
> documentée `docs/ARCHITECTURE.md`).

### Added
- **Live-region SR** (`SvgRenderer._initLive()`/`_announce()`/`_announceConnections()`,
  `shared/graph/render/svg-renderer.js`) — `<div class="graph-live" aria-live="polite"
  aria-atomic="true">` créée dans `_build()`. Hookée dans `_focusNode(id)` (nav clavier
  #671) et `select(id)` (branche nœud, clic/Enter, sauf `silent`). Écrit le **label
  immédiatement**, programme les **connexions** (`model.neighbors()`, in∪out) après
  **`LIVE_ANNOUNCE_DEBOUNCE_MS`=300ms de repos** ou sur la touche **`i`** (listener
  délégué sur `nodesG`). Le timer précédent est **toujours** annulé avant
  reprogrammation — une traversée rapide n'empile jamais d'annonces, seul l'état
  final s'annonce. `destroy()` : clear timer + retrait listener.
- **`@media (forced-colors: active)`** (`shared/css/components/graph.css`, NOUVEAU
  bloc) — les `var(--graph-*)` ne sont pas auto-remappées par le navigateur sur
  `fill`/`stroke` SVG en High Contrast Mode. Nœuds `fill:Canvas`/`stroke:CanvasText`
  (distinction **forme+bordure**), labels/icônes `CanvasText`, arêtes `CanvasText`
  (`--strong` en `stroke-width:3`, épaisseur = 2e signal), sélection/focus via
  `outline:3px solid Highlight` (couleur **système**, pas `--accent`, ignorée en
  forced-colors), `forced-color-adjust:none` **ciblé** sur ces éléments.
- **`@media (prefers-reduced-motion: reduce)`** (`graph.css`) — kill-switch
  `.graph, .graph * { transition:none!important; animation:none!important; }`.
  `graph.css` est **hors barrel** (n'hérite pas de la règle globale `_a11y.css`).
- **2e indice de contraste sélection** — `outline-offset` porté à 3px (le ring se
  lit hors du fill du nœud, pas dessus) + `filter:drop-shadow()` avec le nouveau
  token **`--graph-select-halo: color-mix(in srgb, var(--text) 55%, transparent)`**
  (`shared/css/tokens.css`) — dérivé de `--text`, jamais confondu avec `--accent` :
  couvre le cas d'un nœud custom déjà accent-coloré (`opts.nodeTypes`).
- **`.graph-live`** (CSS, `graph.css`) — pattern SR-only local (dupliqué de
  `.sr-only`/_a11y.css, `graph.css` restant isolé du barrel).
- Tests Playwright **fonctionnels** (`visual-tests/graph-a11y.spec.ts`, NOUVEAU, PAS
  de screenshot VR, ajouté au `testMatch`) : label immédiat + connexions après
  debounce/`i`, non-empilement en traversée rapide, `.graph-live` masquée SR-only,
  forced-colors (`page.emulateMedia({forcedColors:'active'})` — l'option de contexte
  `test.use({forcedColors})` s'est révélée non fiable dans cet environnement) →
  nœuds/arêtes/sélection distinguables par assertions de style.
- Registre : `.graph-live` ajoutée à `cssClasses` de l'entrée `graph` (auto-mergée
  par `npm run generate-registry`).
- `shared/dist/graph.global.js` régénéré (`npm run build:graph`).

### Contraste mesuré (6 combos, WCAG relative luminance)
| Combo | `--graph-edge` vs fond page | `--graph-edge` vs `--graph-node-bg` | `--graph-label` vs `--graph-node-bg` | sélection (`--accent`) vs `--graph-node-bg` |
|---|---|---|---|---|
| MSYX dark | 4.93:1 | 4.07:1 | 13.35:1 | 3.98:1 |
| MSYX light | 4.20:1 | 4.33:1 | 17.85:1 | 3.68:1 |
| ACSSI dark | 5.79:1 | 4.67:1 | 9.85:1 | 6.06:1 |
| ACSSI light | 5.06:1 | 5.39:1 | 15.86:1 | 12.68:1 |
| NHOOD dark | 5.73:1 | 5.35:1 | 15.34:1 | 3.57:1 |
| NHOOD light | 3.66:1 | 3.78:1 | 17.40:1 | 6.43:1 |

Tous les seuils (`--graph-edge`≥3:1, `--graph-label`≥4.5:1, sélection≥3:1) sont
respectés sur les 6 combos sans correction de token — le 2e indice
(`--graph-select-halo`) reste une protection **défensive** pour le cas nœud
accent-coloré (pas de token à corriger aujourd'hui).

### Divergences assumées
- **Pas de bouton pause reduced-motion** — le moteur read-only n'a aucune boucle
  rAF d'animation continue (le rAF de `viewport.js` throttle le wheel/pinch,
  transitoire, pas une animation) → WCAG 2.2.2 non déclenché. Dette conditionnelle
  documentée (`docs/ARCHITECTURE.md`) : bouton pause + `matchMedia().addEventListener`
  requis dès qu'une animation JS continue est introduite (layout animé vNext / I5+).
- **Test SR manuel (NVDA/VoiceOver)** — non exécutable en run autonome. Checklist
  documentée, remontée comme action manuelle Mike (fail-soft), non cochée.

## 2.105.0 — 2026-07-20 — Moteur graph I4-1 : a11y clavier roving + traversée spanning-tree (#671)

> Huitième brique du moteur graphique node-link — **socle a11y clavier net-neuf** :
> roving tabindex (1 seul nœud tab-stop à la fois) + traversée nœud→voisin via un
> **arbre couvrant déterministe** (nouveau `buildSpanningTree()`), rôles ARIA
> `graphics-document`/`graphics-symbol`, cohabitation avec le pan clavier #668
> (flèches = traversée sur un nœud, pan sur le conteneur). Live-region/annonce des
> connexions/forced-colors = **hors scope** (#672, I4-2).

### Added
- **`buildSpanningTree(model, rootId?)`** (`shared/graph/lib/spanning-tree.js`,
  NOUVEAU, pur DOM-free, exporté par `shared/graph/lib/index.js`) — DFS déterministe
  (`model.neighbors()`), racine = `rootId` si présent sinon 1er nœud du modèle,
  **forêt** pour les composants disjoints, `order` = préordre couvrant 100 % des
  nœuds même sur un graphe cyclique (1er parent gagne, aucune reassignation).
  Retourne `{parent, children, order, roots}`.
- **Roving tabindex** (`SvgRenderer._initNodeNav()`/`_syncRovingTabindex()`/
  `_restoreNodeNav()`) — exactement un `.graph-node` a `tabindex="0"` à tout
  instant, restauré après chaque repaint (même emplacement que
  `_restoreSelectionVisual()`, même raison : `nodesG.innerHTML=''`).
- **Nav clavier nœud-à-nœud** (`_handleNodeKey()`/`_sibling()`/`_focusNode()`) —
  mapping WAI-ARIA APG tree : `↑`=parent, `↓`=1er enfant, `←`/`→`=frère
  précédent/suivant (pas de wrap), `Home`/`End`=`order[0]`/`order[dernier]`,
  `Enter`/`Espace`=`select(id)`. Listener **délégué sur `nodesG`** (survit aux
  repaints) — distinct du listener flèches=pan de `_initKeyboard()` (#668) posé sur
  `this.el`. Sur un nœud focusé, les flèches `preventDefault()`+`stopPropagation()`
  → le pan conteneur ne se déclenche jamais ; focus hors nœud → pan #668 intact.
  `Échap`/`f`/`+`/`-` ne sont jamais stoppés (bubblent, comportement #668 réutilisé).
- **Auto-visibilité** (`_ensureNodeVisible()`) — recentre la caméra
  (`zoomToNode(id, kCourant)`, zoom **conservé**) uniquement si le nœud ciblé est
  hors du `viewBox` courant ; un nœud déjà visible ne bouge pas la caméra.
- **Sélection ↔ roving harmonisés** — `select(id)` (nœud) appelle `_setRoving(id)` :
  clic et clavier restent synchronisés (continuité souris↔clavier).
- **Rôles ARIA** — `<svg>` `role:'graphics-document'` (était `'img'`, expose les
  enfants focusables) ; nœuds `role:'graphics-symbol'` (était `'img'`, `aria-label`
  conservé). Filet conforme = la table a11y déjà livrée (#666).
- **`opts.keyboardNav`** (bool, défaut `true`) — désactive entièrement la nav
  clavier nœud-à-nœud (aucun listener posé), symétrique de `viewport`/`selectable`.
  `createGraph()` expose désormais `focusNode(id)`.
- Tests Node **DOM-free** (`tests/regression/graph-spanning-tree.test.js`, 28
  assertions : déterminisme, couverture totale cyclique/disjointe, forêt, 1 seul
  parent par nœud), `npm run test:graph-spanning-tree`.
- Test Playwright **fonctionnel** (`visual-tests/graph-keyboard.spec.ts`, PAS de
  screenshot VR, ajouté au `testMatch` de `playwright.config.ts`) : Tab→1er nœud
  tabindex=0, unicité du tabindex=0, traversée flèches/Home/End, `Enter` sélectionne,
  flèches sur un nœud ne pannent pas / flèches sur le conteneur pannent, focus
  visible.
- `pages/data.html#graph` : mention de la nav clavier dans le texte de section.
- `shared/dist/graph.global.js` régénéré (`npm run build:graph`).

## 2.104.0 — 2026-07-19 — Moteur graph I2-2 : fit + sélection + ResizeObserver (#668)

> Septième brique du moteur graphique node-link — **fit-to-content** (`fit()` = reset
> à l'identité, le `viewBox` #666 cadre déjà le contenu), **`zoomToNode(id)`**
> (centre+zoome via `this.positions`, désormais stocké), **sélection** nœud/arête
> portée par le **renderer** (`select()`/`getSelection()`, classes
> `.graph-node--selected`/`.graph-edge--selected`, événement
> `graph:selection:change`) — **pré-requis de l'édition (I5)**, et **`ResizeObserver`**
> (1ʳᵉ primitive RO du DS, re-fit conditionnel). Consomme le viewport #667.

### Added
- **`fit()`** (`SvgRenderer`, `shared/graph/render/svg-renderer.js`) — délègue à
  `viewport.setViewport({tx:0,ty:0,k:1})`. **Aucun calcul de bbox** : `paint()`/
  `_applyLayout()` (#666) posent déjà `viewBox = bbox+marge` avec
  `preserveAspectRatio="xMidYMid meet"` — à la transform identité, le contenu est
  **déjà** cadré/centré. Le sketch #659 (« calcule la bbox → k,tx,ty ») supposait un
  `viewBox` en px (faux) ; simplification tranchée au groom.
- **`zoomToNode(id, k=1.5)`** — centre + zoome sur un nœud. `_applyLayout(positions)`
  stocke désormais `this.positions` (le `Map<id,{x,y}>` calculé par le layout,
  auparavant jeté après paint). Calcule `tx = mid.x - center.x*k` (`ty` symétrique,
  `mid` = centre du `<svg>` via `screenToUser`, #667) pour que
  `worldToUser(center, vp) === mid`.
- **Sélection nœud/arête** (`_initSelection()`/`select(id, {silent})`/
  `getSelection()`) — **concern du renderer**, PAS du `GraphModel` (invariant
  #665/#666, données pures jamais mutées par le rendu). Clic sur `.graph-node`/
  `.graph-edge` → classes **`.graph-node--selected`**/**`.graph-edge--selected`**
  (modificateurs BEM cohérents avec `.graph-edge--strong` existant, halo
  `outline`/`stroke` `var(--accent)`, theme-aware 6 combos) + `tabindex="-1"` +
  `.focus()` sur le nœud + événement **`graph:selection:change`** (`CustomEvent`,
  `detail:{id,kind}`, `bubbles:true`) sur `.graph` (`el`) — même canal que
  `graph:viewport:change`. Clic sur le fond du SVG **ne désélectionne PAS** (le pan
  tire dessus) — seuls `select(null)`/`Escape` désélectionnent. Détail au clic :
  `opts.onSelect(sel)` si fourni, sinon `window.__openModal` (label/type/voisins via
  `model.neighbors(id)`/`getNode`/`getEdge`, déjà dispo #665) ; `opts.selectionDetail:
  false` désactive tout détail. `opts.selectable` (bool, défaut `true`) désactive
  entièrement la sélection (aucun listener posé). `opts.initialSelection` (id) pose
  le halo dès l'init **sans ouvrir le détail** (`select(id,{silent:true})` interne) —
  état déterministe pour la VR, l'événement `graph:selection:change` reste émis.
  **La sélection survit à un repaint** (`_restoreSelectionVisual()`, appelée en fin
  d'`_applyLayout()`) : `graph:model:change` (mutation du modèle) déclenche un repaint
  qui recrée les `<g>`/`<path>` — sans ce rattachement, le halo disparaîtrait tout en
  laissant `getSelection()` pointer sur un id « fantôme ». Si le nœud/arête
  sélectionné a été supprimé entre-temps, désélection propre (événement re-émis).
  Trouvé en review adversariale (édition I5 mutera le modèle en continu pendant
  qu'une sélection est active), vérifié en navigateur réel (`updateNode` en vol +
  `removeNode` sur l'élément sélectionné).
  **Pré-requis documenté de l'édition (I5)** — contrat figé dans
  `shared/graph/README.md`.
- **Tooltip hors scope** (divergence assumée vs DoD #659) : le tooltip DS
  (`.tooltip-wrap .tooltip`, CSS-hover en flux normal) est inadapté à des nœuds SVG à
  coordonnées transformées (position `absolute` relative au wrap, pas au point SVG).
  Le détail au clic (modal) couvre le besoin ; un vrai tooltip positionné-SVG sera
  rouvert si un consumer le réclame.
- **`ResizeObserver`** (`_initResize()`) — **1ʳᵉ primitive `ResizeObserver` du DS**.
  Le responsive de base est **déjà** assuré par le `viewBox` (`getScreenCTM()`
  s'adapte à la taille rendue, centre-monde + zoom préservés sans JS). Le RO observe
  `.graph` et ajoute un **re-fit conditionnel** (`opts.refitOnResize`, défaut
  `false`) : skip si le viewport n'est pas à l'identité (l'utilisateur a déjà
  navigué) — ne casse jamais une vue existante. Débounce `requestAnimationFrame`
  (évite toute boucle observer→relayout→observer). `disconnect()` dans `destroy()`.
- **Clavier viewport** (`_initKeyboard()`, conteneur `.graph` `tabindex="0"`,
  distinct de la nav nœud-à-nœud I4) — `Escape` désélectionne (`select(null)`),
  `f`/`F` appelle `fit()`, `+`/`-` zooment centrés sur le milieu du `<svg>` (délègue
  `zoomAt` de `viewport.js`), flèches pannent (nice-to-have). Teardown dans
  `destroy()`.
- **API publique `createGraph()`** (`shared/graph/index.js`) étendue : `fit()`,
  `zoomToNode(id,k)`, `select(id)`, `getSelection()`. Nouvelles options JSDoc :
  `opts.selectable`, `opts.initialSelection`, `opts.onSelect`,
  `opts.selectionDetail`, `opts.refitOnResize`.
- **CSS** (`shared/css/components/graph.css`) : `.graph-node--selected
  .graph-node-bg` / `.graph-edge--selected` — halo `var(--accent)`, tokens
  uniquement (`check-graph-isolation.sh` reste vert). `content-visibility:auto`
  **volontairement pas ajouté** (risque VR identifié au groom, `contain:layout
  paint` posé en #667 suffit).
- **`destroy()`** (`SvgRenderer`) — teardown complet : `_resizeObs.disconnect()`,
  retrait du listener `click` (sélection) et `keydown` (clavier viewport), en plus
  du teardown viewport #667. Aucune fuite SPA (`__sweepDetached`).
- **Démo** dans `data.html#graph` — la 3ᵉ sous-démo (`viewport`, #667) devient
  « viewport + sélection » : `selectable:true` + `initialSelection:"i1b2"` (halo
  déterministe pour la VR, sans ouvrir de modal) en plus de `initialViewport` figé.
- **Tests Node DOM-free** (`tests/regression/graph-viewport.test.js`, +4 assertions) :
  vérification de la **formule** derrière `fit()` (identité `{0,0,1}` ⇒
  `worldToUser`/`userToWorld` sont des no-op) et derrière `zoomToNode` (`tx = mid.x -
  center.x*k` place bien `center` en `mid` via `worldToUser`, y compris centre
  négatif et `k<1`). `select()`/`ResizeObserver`/clavier/`__openModal`/
  `getBoundingClientRect` **non testés unitairement** (indisponibles en jsdom,
  documenté dans `shared/graph/README.md`) — couverts par la VR statique
  (`initialSelection`) + vérification manuelle.
- Docs mises à jour : `docs/ARCHITECTURE.md` (sous-section moteur graph), `CLAUDE.md`
  (description `data.html`/`shared/graph/`), `shared/graph/README.md` (sections
  dédiées fit/sélection/ResizeObserver/clavier — contrat sélection comme pré-requis
  I5). `shared/dist/graph.global.js` régénéré (`npm run build:graph`).
- Registre (`shared/components-registry.json`) : `cssClasses` du composant `graph`
  enrichi de `.graph-node--selected`/`.graph-edge--selected` (+ rattrapage
  `.graph--lod-compact`/`.graph-viewport` détectés par `generate-registry.js`,
  gap latent #667) ; `module[]` auto-dérivé (`npm run generate-registry`).

## 2.103.0 — 2026-07-19 — Moteur graph I2-1 : viewport pan/zoom/pinch (#667)

> Sixième brique du moteur graphique node-link — le **viewport** interactif :
> `transform`+`scale` sur un nouveau `<g class="graph-viewport">`, `screenToWorld` via
> `getScreenCTM`, `non-scaling-stroke` pour une épaisseur d'arête constante au zoom.
> Bloque #668 (I2-2) qui consommera `getViewport`/`setViewport`/`screenToWorld` +
> `graph:viewport:change` + le `<g class="graph-viewport">` pour `fit()`/`zoomToNode()`.

### Added
- **`shared/graph/render/viewport.js`** (NOUVEAU) — fonctions pures DOM-free
  exportées et testables Node (`clampZoom`, `userToWorld`, `worldToUser`, `zoomAt`)
  + classe `Viewport` (câblage DOM). Transform portée par un nouveau
  `<g class="graph-viewport">` (inséré dans `_build()` de `SvgRenderer`, enveloppe
  `.graph-edges`+`.graph-nodes`) qui **survit** au wipe `innerHTML` de `paint()` — le
  `viewBox` calculé par `paint()` (bbox+marge) reste le cadre « monde/home » inchangé,
  la transform vp est **préservée** entre repaints (aucune autre ligne de `paint()`
  touchée).
- **`screenToWorld(cx,cy)`** — passe par `svg.getScreenCTM().inverse()` : le `<svg>`
  porte un `viewBox` calculé + `preserveAspectRatio="xMidYMid meet"` + CSS
  `width:100%;height:auto`, donc **n'est PAS 1:1 px** avec l'écran ; `getScreenCTM()`
  gère le mapping viewBox→écran automatiquement, puis la transform vp est inversée
  (`userToWorld`).
- **Pan** via `window.__pointerDrag` (#657, single-pointer, leak-safe) — le vrai
  contrat `onMove(e,{clientX,clientY})` n'expose que des coordonnées absolues (pas de
  `{dx,dy}`), les deltas sont calculés depuis le dernier point client capturé au
  `onStart`.
- **Pinch** via un tracker 2-pointeurs dédié (Pointer Events, `Map<pointerId>`, car
  `pointerDrag` reste mono-pointeur) — ratio de distances entre les 2 pointeurs,
  zoom centré sur leur point milieu ; garde `pinchActive` qui neutralise le pan
  pendant le pinch.
- **Wheel-zoom ancré curseur**, throttlé `requestAnimationFrame` (facteurs cumulés
  entre frames) — `zoomAt(vp,ux,uy,factor,min,max)` garantit que le point
  écran/utilisateur sous le curseur reste **fixe** après le zoom
  (`worldToUser(userToWorld(p,vp),zoomAt(...))` ≈ `p`).
- **Bornes de zoom** : tokens `--graph-zoom-min: 0.2` / `--graph-zoom-max: 4` (posés
  en I1a #657), lus via `getComputedStyle` (fallback numérique si absent, façon
  `initVirtualList` pour `--vlist-row-h`) ; override optionnel `opts.zoomMin`/
  `opts.zoomMax`.
- **`opts.initialViewport`** (`{tx,ty,k}`) — état initial déterministe du viewport,
  clé pour une démo/VR figée (pan/zoom sinon non capturables par Playwright).
- **Anti-distorsion** : `vector-effect: non-scaling-stroke` sur `.graph-edge`/
  `.graph-edge--strong` (épaisseur d'arête constante à tout `k`, s'applique aussi au
  marker de flèche via le path) ; LOD `.graph--lod-compact` masque les labels
  d'arête sous un seuil de `k` (0.5) — illisibles en zoom-out. `--graph-inv-k` posée
  en JS sur le `<g class="graph-viewport">` (disponible pour un consumer qui
  voudrait contre-scaler un label précis) mais **non appliquée par défaut** : les
  labels de nœud scalent avec leur nœud (comportement attendu d'un zoom node-link,
  divergence documentée vs le sketch #659).
- **Événement `graph:viewport:change`** (`CustomEvent`, `detail:{tx,ty,k}`,
  `bubbles:true`) émis sur le conteneur **`.graph`** (`el`), **PAS** sur le
  `GraphModel` — le modèle reste données pures, le viewport est un concern de vue.
- **API publique `createGraph()`** (`shared/graph/index.js`) étendue :
  `getViewport()`/`setViewport(v)`/`screenToWorld(cx,cy)` (no-op silencieux si
  `opts.viewport===false`). `opts.viewport` (bool, défaut `true`) désactive
  entièrement le viewport (aucun listener posé). `fit()`/`zoomToNode()` **stubés**
  en #667, remplis en #668.
- **`destroy()`** (`SvgRenderer`) — teardown du viewport en tête (`viewport.destroy()`
  retire wheel + pointeurs + pan `__pointerDrag`) : aucune fuite SPA, vérifiée via
  `__sweepDetached`.
- **CSS** (`shared/css/components/graph.css`) : `touch-action:none` + `cursor:grab` +
  `contain:layout paint` sur `.graph-canvas` (pan/pinch tactile fluides) ;
  `will-change:transform` sur `.graph-viewport`. Ajouts **tokens-only**, aucune
  valeur hex/rgb — `check-graph-isolation.sh` reste vert.
- **3ᵉ sous-démo** dans `data.html#graph` — graphe `layout:'tree'` avec
  `initialViewport:{tx:-60,ty:-30,k:1.4}` (état zoomé statique déterministe, VR
  stable). Les 2 démos existantes (`fixed`, `tree` sans `initialViewport`) restent à
  l'identité (`k=1`) → pixels inchangés (le `<g>` wrapper est transparent,
  `non-scaling-stroke` sans effet à `k=1`).
- **Tests Node DOM-free** (`tests/regression/graph-viewport.test.js`, 20 assertions :
  bornes `clampZoom` sous/sur/dans, inversion `userToWorld`/`worldToUser` avec
  tolérance flottante, ancrage `zoomAt` — le point écran/utilisateur reste fixe
  après zoom-in/zoom-out y compris depuis une vp non triviale, clamp sur facteur
  énorme/minuscule avec `tx`/`ty` finis), `npm run test:graph-viewport`, step CI
  dédié. Non testé unitairement (documenté, même parti que le renderer #666) :
  `getScreenCTM`/`DOMPoint`/`wheel`/pointer capture indisponibles en jsdom (pas de
  layout SVG) — le câblage DOM de `Viewport` est couvert par la VR statique +
  vérification manuelle.
- Docs mises à jour : `docs/ARCHITECTURE.md` (sous-section moteur graph, contrat
  viewport), `shared/CONSUMER_GUIDE.md` + `shared/graph/README.md` (**contrainte
  d'intégration** : un ancêtre `transform:scale()` casse `getScreenCTM()` — interdit
  côté consumer, critère d'acceptation #659), `CLAUDE.md` (ligne `pages/data.html` +
  arbo `shared/graph/render/`).
- `shared/dist/graph.global.js` régénéré (`npm run build:graph`) — 12.09 KB gzip
  (+1.9 KB vs v2.102.0, `viewport.js` ajouté au bundle ; dagre/layered restent hors
  bundle, inchangé). Budget perf réévalué (`shared/perf-budget.json`, baseline
  2026-07-19 + buffer 5%). Bump des **8 sources @ds-version** (feature → minor,
  2.102.0 → 2.103.0) ; `graph.css` porte aussi `@ds-version` (bump).

## 2.102.0 — 2026-07-19 — Moteur graph I3-2 : layout layered (dagre vendoré) + mindmap bilatéral NHOOD (#670)

> Cinquième brique du moteur graphique node-link — le layout **`layered`** (Sugiyama
> via **dagre vendoré**, 1ʳᵉ dépendance tierce vendorée du DS) et le layout **`mindmap`**
> bilatéral maison, **1er use case client réel (NHOOD)** : nœud central → branches
> réparties gauche/droite → feuilles riches. `layered` active enfin le chemin
> `auto`→`layered` posé par #669 (`hasLayout('layered')` devient vrai).

### Added
- **Vendoring dagre** (`shared/graph/vendor/`) — `@dagrejs/dagre@3.0.0` +
  `@dagrejs/graphlib@4.0.1` (fork **maintenu** de l'organisation `dagrejs`, **PAS** le
  legacy `dagre@0.8.5` non maintenu depuis 2018 ; **MIT** tous deux). `build-vendor.sh`
  reproductible (patron `shared/icons/build-sprite.sh` : sandbox `mktemp -d` jetable,
  `npm pack` + `npm install --no-save`, bundle esbuild `--format=esm --platform=neutral
  --legal-comments=inline`, **AUCUN `min.js`**, source lisible). `graph-layered.js`
  généré et **committé** (~53.5 KB brut / ~15.2 KB gzip). `VENDOR.md` : version pinnée,
  hash sha256 d'intégrité, **owner CVE nommé** (mainteneur DS), cadence de veille
  trimestrielle + réaction Dependabot upstream, surface CVE quasi nulle (calcul pur,
  aucun I/O/réseau/eval). `LICENSE-dagre` + `LICENSE-graphlib` + `NOTICE`. Nouvelle
  ligne `shared/perf-budget.json` dédiée (seuil isolé, 16.3 KB gzip).
- **`layered.js`** (`shared/graph/layout/layered.js`) — layout hiérarchique Sugiyama,
  **SEUL layout ASYNC** du moteur : `run(model,opts)` renvoie `Promise<Map<id,{x,y}>>`
  (dagre chargé en dynamic import). Adapte le modèle (`GraphModel`) vers
  `dagre.graphlib.Graph`, lit `nd.x`/`nd.y` (centre du nœud, aligné avec le contrat du
  moteur), gère les cycles **nativement** (greedy FAS interne de dagre — jamais
  d'infini). Options : `direction:'TB'|'LR'`, `gap:{x,y}`. Le specifier du dynamic
  import est calculé dans une **variable** (`typeof window !== 'undefined' ?
  '/shared/graph/vendor/graph-layered.js' : '../vendor/graph-layered.js'`) — deux
  contextes de résolution distincts (ESM brut Node/bundler vs bundle IIFE navigateur où
  un chemin relatif se résoudrait contre l'URL du `<script>`, pas contre celle de
  `layered.js`, même convention que le sprite d'icônes `/shared/icons/sprite.svg`).
  Cette variable n'est **jamais inlinable statiquement par esbuild** en IIFE — garantie
  d'isolation plus robuste que le seul `--external:*graph-layered.js` (conservé dans
  `build.sh` en défense en profondeur).
- **`mindmap.js`** (`shared/graph/layout/mindmap.js`) — layout mindmap **BILATÉRAL**
  maison, pur, déterministe, DOM-free — **1er use case client (NHOOD)**. Racine centrale
  `(0,0)` ; branches de 1er niveau réparties **gauche/droite** par glouton d'équilibrage
  (charge = hauteur cumulée du sous-arbre par défaut, ou nombre de feuilles via
  `balance:'count'` ; égalité → droite d'abord, déterministe) ; chaque côté = arbre
  horizontal Reingold-Tilford tourné 90° (côté gauche **miroir** en x) ; largeur par
  palier dérivée du **`node.size.w`** réel (cumul, même mécanique que `maxByDepth` de
  `tree.js`) → évite le chevauchement horizontal des nœuds larges ; empilement vertical
  par curseur global au côté (aucun chevauchement vertical entre feuilles). **Consomme
  `node.size`** (nœuds riches NHOOD à largeur/hauteur variables — indispensable) ; ne
  place que `{x,y}` (séparation stricte layout/render, le contenu riche reste porté par
  `nodeTypes`/`renderNode`/`graphCard()`, #666). Toujours **explicite** (jamais
  auto-choisi, comme `radial`). Couverture totale garantie (racines de secours, filet
  défensif `(0,0)`).
- **`paint()` async-tolérant** (`shared/graph/render/svg-renderer.js`) — extraction du
  corps de rendu en `_applyLayout(positions)` ; `paint()` détecte un `run()` thenable
  (layout `layered`) et attend sa résolution avant de peindre, via un **token
  anti-course** (`this._paintToken`, incrémenté à chaque appel de `paint()` **et** à
  `destroy()`) : si un repaint plus récent démarre avant la résolution d'un paint async
  en vol, la résolution tardive devient un **no-op** (jamais de flicker/ordre inversé,
  jamais de repaint après `destroy()`). Les layouts synchrones (`fixed`/`tree`/`radial`/
  `mindmap`) sont **inchangés**, **aucun frame supplémentaire** — retro-compatibilité
  totale.
- **`layout/index.js`** — `mindmap` enregistré **statiquement** (sync, maison, même
  pattern que `fixed`/`tree`/`radial`). `layered` enregistré via un **loader lazy**
  (`registerLayout('layered', (model,opts) => import('./layered.js').then(m =>
  m.layeredLayout(model,opts)))`) — `./layered.js` (et donc le vendoré dagre) ne charge
  **jamais statiquement**, uniquement au premier appel réel du layout `layered`.
  `hasLayout('layered')` est désormais **vrai** dès le chargement du module —
  l'auto-détection (`layout:'auto'`, #669) **route réellement** un DAG multi-racines ou
  un graphe cyclique vers `layered` (le comportement de dégradation gracieuse vers
  `tree` tant que `layered` était absent, introduit par #669, est **retiré** : voir
  Notes ci-dessous et `tests/regression/graph-layout-radial.test.js` mis à jour).
  JSDoc `createGraph(el,opts)` (`shared/graph/index.js`) : union `opts.layout` étendue à
  `'fixed'|'tree'|'radial'|'mindmap'|'layered'|'auto'`.
- **`build.sh`** — `--external:*graph-layered.js` sur la sortie IIFE (`graph.global.js`)
  en défense en profondeur (le specifier variable de `layered.js` rend déjà
  l'inlining statiquement impossible pour esbuild). `shared/dist/graph.global.js`
  régénéré : **10.2 KB gzip** (+1.6 KB vs #669, attribuable à `mindmap.js` — dagre/
  `layered` restent **prouvés hors bundle**, ligne `perf-budget.json` dédiée pour
  `graph-layered.js`, 15.2 KB gzip isolé).
- **`sync.sh --with-graph`** étendu — copie désormais `shared/graph/vendor/*`
  (`graph-layered.js` + `LICENSE-dagre` + `LICENSE-graphlib` + `NOTICE`) vers
  `<TARGET>/graph/vendor/` chez le consumer ; à l'intégrateur de servir ce dossier à
  l'URL absolue `/shared/graph/vendor/graph-layered.js` (même limitation déjà acceptée
  pour le sprite d'icônes).
- **2 sous-démos** dans `data.html#graph` : **dépendances** (layout `layered`, DAG
  multi-racines `spec`+`docs` → `design`/`build` → `test` → `deploy`, `direction:'TB'`,
  6 nœuds, `size` explicite) et **mindmap NHOOD** (layout `mindmap`, nœud central
  « Refonte NHOOD » + 4 branches riches `graphCard()` — badge statut + chip personne
  via `foreignObject`, `data.rich:true`, `size` explicite sur chaque nœud → VR
  déterministe). `<p>` d'intro de la section mis à jour (mention `mindmap`/`layered`).
- **Tests Node DOM-free** (`tests/regression/graph-layout-layered.test.js`, 19
  assertions, `npm run test:graph-layout-layered`, step CI dédié « Graph
  layered(dagre)/mindmap unit tests (#670, I3-2) ») : golden-test positions **exactes**
  (dagre@3.0.0 pinné, reproductibilité du build vendoré), gestion des cycles (`< 2s`,
  couverture totale), `rankdir` TB (y croît) vs LR (x croît), déterminisme `mindmap`
  (mêmes entrées → même `Map`), répartition bilatérale (racine centrée, ≥1 branche
  x>0 et ≥1 x<0), équilibrage `'height'` vs `'count'` distinct sur cas asymétrique,
  non-chevauchement vertical sur tailles variables, couverture foret/cycle, registre
  (`hasLayout`/`resolveLayout` mindmap+layered, thenable). **`tests/regression/
  graph-layout-radial.test.js` mis à jour** (25 assertions, inchangé en nombre) : les
  2 blocs qui simulaient/vérifiaient l'absence de `layered` (dégradation `tree`) sont
  remplacés par des assertions sur le **vrai** routage async vers `layered` (#670 rend
  `hasLayout('layered')` réellement vrai dès le chargement du module).

### Notes
- **VR** : la sous-démo `layered`/`mindmap` modifie `data-graph.png` (seule section
  impactée, churn attendu) — **NON finalisé dans cette PR**, laissé au parent
  (`test:visual:update`, recette soft-harvest #514). `layered` peint en **async** —
  risque d'instabilité VR (capture avant résolution du dynamic import) potentiellement
  couvert par le garde-fou de stabilité dimensionnelle de `visual.spec.ts` ; à vérifier
  au harvest.
- **Coordination #669** : fichiers partagés (`layout/index.js`, `graph/index.js`,
  `data.html#graph`, 8 sources de version) mergés **après** #669 (déjà sur `main`,
  v2.101.0) — pas de conflit.
- Hors scope (jalon suivant, piloté par le parent, **hors code**) : round-trip
  `nexus` avec un mindmap NHOOD réel (badges statut, chips personne) AVANT de graver
  `schemaVersion:1` (retire la réserve « PROVISOIRE » de `to-model.js`/`graph-model.js`).

## 2.101.0 — 2026-07-19 — Moteur graph I3-1 : layout radial + auto-détection de layout (#669)

> Quatrième brique du moteur graphique node-link — 1ers **layouts riches** (Epic #656,
> lot I3). `radial` = mindmap 360° maison, purs DOM-free, même contrat/garanties que
> `tree.js` (#666). L'**auto-détection** est le vrai déblocage DX : `createGraph(el,
> {data:{nodes,edges}})` sans `layout` ni coordonnées rend désormais correctement
> **out-of-the-box** (avant #669 : fallback `fixed` → tous les nœuds en `(0,0)` + warn).

### Added
- **`radial.js`** (`shared/graph/layout/radial.js`) — layout radial 360° **pur, DOM-free, déterministe**. Racine au centre `(0,0)` ; profondeur → anneau (rayon cumulatif = extent max du palier précédent + extent max du palier courant + `ringGap`, défaut 40px) ; enfants répartis en secteurs angulaires proportionnels à la **charge feuille** de leur sous-arbre (nombre de feuilles), parent centré angulairement sur ses enfants → aucun chevauchement angulaire. Convention polaire : `theta` mesuré depuis `-π/2` (haut), sens horaire (idiome `initProgressTrackers`, `components.js:2622`). Mêmes garanties de couverture que `tree.js` : racines = nœuds sans arête entrante (`opts.root` en tête, ordre d'insertion sinon), garde anti-cycle `Set`, racines de secours pour les nœuds jamais atteints (cycle pur/forêt) → termine toujours, tous les nœuds positionnés. Options : `root`, `startAngle` (défaut `-π/2`), `sweep` (défaut `2π`), `ringGap`. Consomme `opts.sizes` pour dimensionner les anneaux (évite le chevauchement radial des nœuds larges).
- **Auto-détection de layout** (`layout:'auto'`) — `detect.js` (`detectLayout(model)`) : heuristique **pure**, consomme uniquement l'index d'adjacence du modèle (`inEdges`/`outEdges`, aucun recalcul de graphe). DFS colorée (blanc/gris/noir) sur `outEdges` pour détecter les back-edges (cycles). Route : 1 racine + acyclique → `'tree'` ; DAG multi-racines → `'layered'` ; cyclique → `'layered'` ; graphe vide → `'fixed'`. **`radial`/`mindmap` ne sont jamais auto-choisis** (choix esthétique/domaine, opt-in explicite) ; `fixed` **jamais** par défaut (réservé au graphe vide).
- **`auto.js`** (wrapper `autoLayout`) — traduit le nom cible de `detectLayout` en layout **réellement enregistré**, avec **dégradation coord-free-safe** : si la cible (`'layered'`, possédée par #670) n'est pas encore enregistrée, retombe sur `'tree'` (rend sans coordonnées) plutôt que sur le fallback `'fixed'` de `resolveLayout` (qui exigerait `node.position`). Garantit que #669 est **mergeable avant #670** et ne produit **jamais de `Promise`** ni de rendu cassé. Cycle ESM `index.js ↔ auto.js` volontaire et sûr : `resolveLayout`/`hasLayout` ne sont référencées qu'à l'exécution (corps de `autoLayout`), jamais au top-level (contrairement à un `registerLayout()` top-level qui serait en TDZ, cf. déviation documentée #666 pour `fixed.js`/`tree.js`/`radial.js`).
- **`hasLayout(name)`** (`shared/graph/layout/index.js`) — nouveau helper exposé (`export { hasLayout }` depuis `shared/graph/index.js` également), consommé par `auto.js` pour la dégradation gracieuse.
- **Registre** — `radial` et `auto` enregistrés dans `layout/index.js` (pattern import-puis-`registerLayout`, aucun auto-enregistrement circulaire — même déviation documentée que #666). JSDoc `createGraph(el, opts)` (`shared/graph/index.js`) : union `opts.layout` étendue à `'fixed'|'tree'|'radial'|'auto'`.
- **Sous-démo radiale** dans `data.html#graph` — mindmap compacte (1 racine + 2 niveaux, 8 nœuds), `size` **explicite sur chaque nœud** → passe `measure` skippée → géométrie 100 % déterministe (VR stable). `<p>` d'intro de la section mis à jour (mention `radial`/`auto`).
- **Tests Node DOM-free** (`tests/regression/graph-layout-radial.test.js`, 25 assertions, `npm run test:graph-layout-radial`, step CI dédié `Graph radial/auto-detect unit tests (#669, I3-1)`) — déterminisme radial, racine centrée, rayon croissant par profondeur, angles distincts sur 2 enfants/petits-enfants, cycle pur (couverture totale, < 1s), forêt multi-racines, `detectLayout` sur les 3 topologies + graphe vide, `autoLayout` sans `Promise` avec dégradation `tree` tant que `layered` absent, `autoLayout` route bien vers `tree` sur un arbre 1-racine (positions identiques à `resolveLayout('tree')` direct), `resolveLayout`/`hasLayout` pour `radial`/`auto`, `autoLayout` route vers `layered` une fois celui-ci enregistré (simulation post-#670).
- **`shared/dist/graph.global.js`** régénéré (`npm run build:graph`) — 8.66 KB gzip (budget `shared/perf-budget.json` réévalué, seuil 9.31 KB + buffer 5 %, +0.75 KB vs I1b-2 #666).

### Notes
- **Indépendance vis-à-vis de #670** prouvée par test : un DAG multi-racines sans `layered` enregistré est quand même intégralement positionné (dégradation `tree`). Fichiers partagés avec #670 (`layout/index.js`, `graph/index.js`, `data.html#graph`, 8 sources de version) → **merge séquentiel** (I3-1 #669 avant I3-2 #670, cf. revue parent).
- Hors scope (itération suivante, #670) : `mindmap` bilatéral (use case client NHOOD), `layered` (dagre vendoré), palette catégorielle >5 types.

## 2.100.0 — 2026-07-19 — Moteur graph I1b-2 : SvgRenderer, layouts fixed/tree, a11y table (#666)

> Troisième brique du moteur graphique node-link — le **1er rendu visuel**. Découplage
> strict layout/paint : les layouts produisent des `{x,y}` purs (DOM-free), le renderer
> peint 100 % `var(--graph-*)` (repaint gratuit sur les 6 combos theme/mode).

### Added
- **`SvgRenderer`** (`shared/graph/render/svg-renderer.js`) — pipeline `measure → layout → paint` : `measure()` construit une `Map<nodeId,{w,h}>` **interne au renderer** (`node.size` si fourni, sinon mesuré via `getBBox()`/`getBoundingClientRect()` d'un host hors-écran `.graph-measure`) — **le modèle `GraphModel` n'est jamais muté** (évite la boucle measure→updateNode→`graph:model:change`→repaint→measure). Cycle de vie `observe(model.addEventListener('graph:model:change'))` → `repaint` débouncé `requestAnimationFrame` → `destroy()` (retire le listener, annule le rAF, retire le host de mesure, vide le SVG) enregistré via `window.__registerInstance` (#657) pour le teardown SPA.
- **Layouts purs, DOM-free** (`shared/graph/layout/`) — `fixed.js` lit `node.position.{x,y}` (shape Cytoscape #665, fallback `(0,0)` + `console.warn` si absent) ; `tree.js` = Reingold-Tilford **naïf déterministe** (racines = nœuds sans arête entrante ou `opts.root`, enfants via `outEdges` en ordre d'insertion, garde anti-cycle `Set` + racines de secours pour couverture totale, forêt multi-racines supportée, `direction:'TB'|'LR'`). Registre `registerLayout`/`resolveLayout` (`layout/index.js`). Testés en Node (`tests/regression/graph-layout.test.js`, 22 assertions, `npm run test:graph-layout`, step CI jumeau de `test:graph-model`).
- **Alternative a11y `table`** (contrat **PRIMAIRE**, dès I1b, WCAG 1.1.1/1.3.1) — `graphToTableModel()` (`shared/graph/render/a11y-table.js`) dérivation **pure** (nœuds + relations in/out via l'adjacence #665), testable Node ; `renderA11yTable()` construit `<table class="graph-table">` dans un `<details>`, reliée au `<svg>` par `aria-describedby`, reconstruite à chaque repaint.
- **`nodeTypes` + `graphCard()`** (`shared/graph/render/node-types.js`) — support nœud riche (NHOOD) : `resolveNodeType()` (classe+icône par `node.data.type`) et `graphCard()` (composition `.card`/`.badge`/`.chip` DS dans un `foreignObject`, statut jamais par la seule couleur). Arêtes `straight`/`curved` + marqueur directionnel (`<defs><marker>`, `uid` par instance — pas de collision multi-graphes sur une même page), labels d'arête ancrés géométriquement (jamais `getPointAtLength`).
- **API publique** `createGraph(el, opts)` (`shared/graph/index.js`) → `{model, destroy, svg}`. **Bundle global dédié** `shared/graph/global-entry-engine.js` → `shared/dist/graph.global.js` (`window.MSYXGraph = {createGraph, GraphModel, toModel}`, IIFE es2019 esbuild, **2e sortie distincte** de `graph-lib.global.js` dans `build.sh` — ne gonfle pas le lib mince chargé sur toutes les pages split-pane/before-after). ~8.1 KB gzip, budget dédié dans `perf-budget.json`.
- **`graph.css` sort du stub** (`shared/css/components/graph.css`) — règles réelles, tokens `var(--graph-*)` uniquement (`tokens.css` #657), toujours **hors barrel** (`check-graph-isolation.sh` reste vert). Opt-in explicite : `data.html` charge via `<link>` dans le `<head>`.
- **Section démo `#graph`** dans `data.html` (17e section, 6e famille « Graphe ») — organigramme (`layout:'fixed'`) + arbre (`layout:'tree'`), `size` **explicite sur chaque nœud** → la passe `measure` (dépendante du rendu de police) est **skippée** → géométrie déterministe (12 baselines VR neuves, 6 theme/mode × 2 viewports).
- **`sync.sh --with-graph`** (livré) — corrige le gap latent I1a : `graph-lib.global.js` (`window.__pointerDrag`/`__svg`, requis par `ds-components.js` depuis #657) est désormais copié **par défaut** vers les consumers. `--with-graph` ajoute `ds-graph.global.js` (`window.MSYXGraph`) + `components/graph.css` (hors barrel généré, à charger via `<link>` explicite côté consumer).
- **Registre** — entrée `graph` (`kind:component`, `page:data`, `jsInit:initGraph`, `react:pending`). `initGraph()` dans `shared/components.js` (filet monolithe : lit `.graph[data-graph] > script.graph-config`, délègue à `window.MSYXGraph.createGraph`, no-op si le bundle n'est pas chargé), appelé dans `reinitAll()`.

### Notes
- **`schemaVersion:1` NON figé** dans cette PR — jalon nexus post-merge (round-trip réel sur un arbre/organigramme NHOOD, piloté par le parent, hors repo DS) documenté dans `shared/graph/README.md`. Le modèle reste forward-tolérant.
- Hors scope (itérations suivantes) : layouts radial/layered/mindmap (dagre vendoré, I3 #669/#670), navigation clavier nœuds/arêtes (I4 #671), sélection/déplacement/édition (I5), wrapper `@msyx-dev/react <Graph>` (I6), zoom/pan (`--graph-zoom-*` posés mais non câblés).

## 2.99.0 — 2026-07-19 — Moteur graph I1b-1 : modèle GraphModel (#665)

> Deuxième brique du moteur graphique node-link. Toujours **aucun rendu visuel** —
> uniquement le modèle de données observable dont dépendent le renderer SVG (I1b-2,
> #666) et toutes les itérations suivantes (navigation, édition, wrapper React).

### Added
- **`GraphModel`** (`shared/graph/model/graph-model.js`) — `class GraphModel extends EventTarget` : structure node-link plate, shape Cytoscape-alignée (sémantique dans `data{}`, géométrie `position`/`size` en sibling optionnel — `size` **porté, jamais mesuré**). Observable via `dispatchEvent(new CustomEvent('graph:model:change', { detail, bubbles:true }))`, idiome déjà utilisé 18× dans `components.js` (`split:resize`). **DOM-free** : aucun `document`, testable sans jsdom (`EventTarget`/`CustomEvent` globaux Node 20).
- **Accès** : `nodes`/`edges` (read-only par contrat), `nodeCount`/`edgeCount`, `getNode`/`getEdge`/`hasNode`/`hasEdge`, itération ordre d'insertion stable.
- **Index d'adjacence** incrémental : `adjacency` (`Map<nodeId, {in,out}>`, live), `inEdges`/`outEdges`/`neighbors`, indexé par rôle (`source→out`/`target→in`) indépendamment de `directed`.
- **Mutations atomiques** (1 op ⇒ 1 event, uniquement si effectif) : `addNode`/`updateNode` (merge shallow de `data`, `position`/`size` remplacés, `id` immuable)/`removeNode` (cascade ses arêtes incidentes en **un seul** event `remove-node` avec `removedEdges`), `addEdge`/`updateEdge` (data-only, `id`/`source`/`target` immuables)/`removeEdge`, `toJSON()` (deep clone, round-trip garanti).
- **`toModel(input)`** (`shared/graph/model/to-model.js`) — normalisation tolérante **jamais de throw** : accepte `{nodes,edges}` nu ou `GraphData` complet, génère un id si manquant, déduplique par id (namespace partagé nœuds∪arêtes), droppe les arêtes pendantes (endpoint inexistant) — chaque anomalie loggée en `console.warn`.
- **Invariants lenient** (imposés partout, `console.warn` + skip, **jamais de `throw`**) : id unique nœuds∪arêtes, id non vide, arête → nœuds existants, pas d'arête pendante persistante (cascade), immuabilité `id`/`source`/`target`.
- **`schemaVersion:1` PROVISOIRE non figé** — réserve documentée en tête de `graph-model.js` : forward-tolérant (une entrée `schemaVersion:2` n'est ni rejetée ni migrée), aucune logique version-gated. Gravure repoussée au round-trip réel sur le consumer d'ancrage `nexus` (I1b-2, #666).
- **`tests/regression/graph-model.test.js`** — 17 cas unitaires DOM-free (round-trip, shape nue, id généré, arête pendante, id dupliqué, CRUD + events, cascade `removeNode`, compte d'events 1/mutation effective, `schemaVersion` forward-tolérant, `neighbors`/`inEdges`/`outEdges` sur un graphe en losange), réplique du style `graph-lib.test.js` (asserts maison, `import()` dynamique). Script `npm run test:graph-model`, step CI dédié.

### Notes
- `build.sh`, `shared/graph/render/`, `shared/graph/layout/` **inchangés** — le modèle est ESM pur, non émis dans le global `shared/dist/graph-lib.global.js`. Aucun `components-registry.json`, aucune section démo, aucune CSS : le composant `graph` visible entre au registre en I1b-2 (#666).
- Aucun conflit de fichiers avec I1b-2 (#666, séquencement strict `blocked by` #665) : I1b-1 ne touche que `shared/graph/model/` + script/CI + versions.

## 2.98.0 — 2026-07-19 — Moteur graph I1a : fondations + remboursement de dette (#657)

> Première brique du futur moteur graphique node-link du design system. Aucun rendu de
> graphe visible dans cette version — uniquement les fondations partagées et une dette
> technique remboursée sur des composants existants.

### Added
- **`pointerDrag()`** — util de drag pointer unifié (`shared/graph/lib/pointer-drag.js`), leak-safe (`destroy()` retire tous les listeners, posés sur l'élément et non sur `document`).
- **`svg(tag, attrs)`** — helper de création d'éléments SVG (`shared/graph/lib/svg.js`), refactor pur sans changement de comportement.
- **Discipline de teardown SPA** dans `shared/components.js` : registre `__registerInstance`/`__sweepDetached`, appelé en tête de `reinitAll()` — purge les instances dont l'élément n'est plus dans le DOM après une navigation SPA.
- **Tokens `--graph-*`** dans `tokens.css` (node/edge/label/grid/zoom), dérivés via `color-mix()` des tokens déjà themés.
- **Squelette `shared/graph/`** (`lib/`, `model/`, `layout/`, `render/`) + `shared/css/components/graph.css` (hors barrel, opt-in).
- **1ʳᵉ brique DS avec build** : `esbuild` borné (`shared/graph/build.sh`) émet `shared/dist/graph-lib.global.js` (IIFE, `window.__pointerDrag`/`window.__svg`), chargé avant `components.js` sur toutes les pages.
- **`shared/check-graph-isolation.sh`** (CI) : échoue si `graph.css` apparaît dans un barrel par défaut.
- **ADR** `docs/adr/ADR-0001-moteur-graph.md` — décision d'architecture du moteur graph (cœur maison + dagre vendoré + rendu SVG).
- Budget perf dédié pour `shared/dist/graph-lib.global.js` (`perf-budget.json`, `docs/PERF-BUDGET.md`).

### Changed
- **`initSplitPane`** et **`initBeforeAfter`** (`shared/components.js`) migrés sur `pointerDrag()`. `before-after` gagne au passage la correction d'une fuite mémoire SPA réelle (6 listeners `mousedown`/`mousemove`/`mouseup`/`touchstart`/`touchmove`/`touchend`, dont 4 posés sur `document`, jamais retirés) ; le drag démarre désormais sur le handle (`.before-after-handle`) plutôt que n'importe où dans le container.
- **`buildPieChart`/`buildDonutChart`** (pie/donut chart) et **`initProgressTrackers`** (progress-tracker simple + multi) refactorés pour utiliser `svg()` au lieu de `document.createElementNS` dupliqué (5 sites).

### Notes
- Kanban (HTML5 Drag & Drop natif) et sortable-list (reorder + clone 2D tactile) restent **hors-scope** : patterns structurellement différents de `pointerDrag()`, aucun bénéfice à les y faire rentrer de force.
- `sync.sh --with-graph` **différé à I1b/I3** (documenté dans `shared/graph/README.md`) — le moteur n'est pas encore consommable par les projets tiers.

## 2.97.2 — 2026-07-15 — Chrome modal : a11y bouton fermer + titre

### Fixed
- **Bouton fermer des modales** (`dialog.modal-dialog .modal-close`) : cible tactile portée à **44×44px en mobile** (mobile-first, compact 2rem en desktop) — était ~24-28px, sous le seuil a11y de `DS-PRINCIPLES.md`. Glyphe visuel inchangé (hit-area agrandie via flex + min-width/height). Affecte toutes les modales DS.
- **`.modal-title` écrasé** : la règle `dialog.modal-dialog .modal-header h3` (font-size 1.1rem, spécificité 0,2,2) l'emportait sur l'utilitaire token `.modal-title` (--type-20 = 20px). Scopée en `h3:not(.modal-title)` → un `<h3>` nu garde 1.1rem, un `<h3 class="modal-title">` rend enfin à 20px. Vérifié au rendu réel (modale ouverte, mesures pixel : close 44/32px, titre 20px).

## 2.97.1 — 2026-07-15 — Notes de version : correctif puces + note manquante

### Fixed
- **Puces natives parasites** dans la modale des notes de version : les `<ul>` de highlights affichaient un marqueur de liste (reset `.timeline` sur l'`<ol>` non hérité par les `<ul>` imbriqués). Reset scopé `.version-notes .timeline-content ul` + mise en page chip/texte. Bug préexistant (#645), attrapé au rendu réel.
- Ajout de la note de version **2.97.1** dans `version-notes.json` (la montée de niveau v2.97.0 n'avait aucune entrée — le badge affichait une version sans note correspondante).
- **Polish timeline** (challenge designer sur rendu réel) : trait vertical qui pendouillait sous le dernier nœud → connecteur **par item** de centre-à-centre (s'arrête net au dernier) ; nœuds recentrés horizontalement sur le trait et verticalement sur la date ; début du texte des highlights aligné entre versions (grille chip fixe en desktop) ; pastille de statut « Nouveau » passée en **accent bleu** pour ne plus se confondre avec la catégorie « Nouveauté » (vert) ; fil de liaison rendu plus lisible. Tout scopé `.version-notes` (primitive `.timeline` intacte).

## 2.97.0 — 2026-07-14 — Notes de version : montée de niveau du rendu (#649)

> Le badge et la modale « Notes de version » (dogfoodés depuis #645) gagnent en lisibilité et en cohérence avec le reste du DS : typo Inter, icône, présence garantie sur mobile, timeline plus sobre et sémantiquement correcte.

### Added
- **Item « À venir »** dans la modale : si une prochaine version a des points curés (`next.highlights`), une entrée en tête de timeline l'annonce avec un nœud pointillé et le libellé « À venir ». Absente tant qu'aucun point n'est renseigné (comportement actuel par défaut).
- **Pastille « Nouveau »** sur la dernière version publiée, pour repérer l'entrée la plus récente en un coup d'œil.
- **Sous-titre optionnel** de la modale (`subtitle`), affiché uniquement s'il est renseigné dans la donnée source.

### Changed
- **Badge** : police passée en Inter (cohérence avec le reste de l'UI) et ajout d'une icône étincelle devant le numéro de version.
- **Badge visible sur mobile** : il était auparavant masqué en dessous de 768px ; il est désormais toujours affiché (cible tactile 44px), et se compacte légèrement sur desktop.
- **Timeline de la modale** : trait et nœuds redessinés pour une lecture plus sobre (nœuds en anneau creux, nœud le plus récent mis en avant par un halo) ; la « couture » disgracieuse de l'ancien rendu sur fond de modale est corrigée. La timeline générique utilisée ailleurs dans le design system (page « Divers ») n'est pas affectée.
- **Structure de la modale** : balisage plus sémantique (liste ordonnée) et titre correctement identifié pour les lecteurs d'écran.

## 2.96.1 — 2026-07-10 — Notes de version : pastilles de catégorie (#647)

> Correctif du dogfood #645 : les highlights de la timeline « Notes de version » n'affichaient aucune catégorie. Le champ `type` (`nouveaute`/`amelioration`/`correction`/`securite`), pourtant présent dans la donnée, était ignoré au rendu. Chaque highlight porte désormais un `.badge` de statut DS.

### Fixed
- **`shared/nav.js` — `renderVersionNotesTimeline()`** : chaque highlight rend un `<span class="badge …">Libellé</span>` devant son texte, via une table `VERSION_NOTE_CATEGORIES` (`nouveaute`→`badge-success` « Nouveauté », `amelioration`→`badge-info` « Amélioration », `correction`→`badge-warning` « Correction », `securite`→`badge-danger` « Sécurité » ; fallback `badge-neutral`). Mapping couleurs aligné sur le pilote cap-transfo (`release-chip-*`) pour cohérence avec la migration #355.
- **`pages/overlays.html` — vitrine `#version-notes`** : les `.timeline-item` de démo portent les mêmes `.badge` de catégorie (cohérence vitrine ↔ rendu réel). Les modales de démo étant fermées (`display:none`), aucun impact VR.

### Changed (versioning)
- Bump 8 sources `check-versions.sh` 2.96.0 → **2.96.1** (patch). Nouvelle entrée `2.96.1` en tête de `shared/version-notes.json` (invariant `released[0].version === VERSION`), ré-inlinée par `bin/generate-version-notes.js`.

## 2.96.0 — 2026-07-09 — Dogfood header : notes de version DS (#645)

> Le header du design system consomme désormais son propre composant `version-notes` (#614) : badge de version cliquable ouvrant une modale « Notes de version » (timeline). Contenu piloté par une donnée curée à la main (`shared/version-notes.json`, contrat #281 `{next, released[]}`), inlinée au build par un nouveau générateur (`bin/generate-version-notes.js`, miroir strict de `bin/generate-nav-sections.js`). Zéro fetch runtime (#528).

### Added
- **`shared/version-notes.json`** (nouveau) — donnée curée `{next, released[]}` ; item `{version, date, titre, highlights[]}`, highlight `{type, text}` (`type` ∈ `nouveaute`/`amelioration`/`correction`/`securite`). 8 versions récentes seedées (2.96.0 → 2.88.0), rédigées en langage produit (bénéfice, zéro nom de classe/composant/issue). `next.highlights` vide en attente de la prochaine release.
- **`bin/generate-version-notes.js`** (nouveau) — lit `shared/version-notes.json`, valide le schéma (enum `type`, dates ISO `YYYY-MM-DD`, versions sans préfixe `v`, ordre récent-d'abord), sérialise `const VERSION_NOTES = …;` entre marqueurs `AUTO-GENERATED VERSION NOTES START/END` dans `shared/nav.js` (ancre d'insertion : `function buildHeader()`). Mode `--check` anti-drift CI (miroir strict de `bin/generate-nav-sections.js`, mêmes garanties d'idempotence). Scripts npm `generate-version-notes` + `test:version-notes`.
- **`shared/nav.js` — badge de version cliquable** : `span.header-version` remplacé par `button.version-badge.header-version-badge` (`data-version-notes` + `data-modal-trigger="ds-version-notes-modal"` + `data-latest-version`/`data-storage-key`, `aria-label="Notes de version, vX.Y.Z"`). Nouvelles fonctions `escapeHtml()`, `formatVersionNoteDate()`, `renderVersionNotesTimeline()`, `ensureVersionNotesDialog()` — injectent une fois la `<dialog id="ds-version-notes-modal">` dans `<body>` et rendent la timeline depuis `VERSION_NOTES.released`. Ouverture déléguée à `initModals()` (déjà idempotent, focus-restore WAI APG hérité), pastille « nouveau » à `initVersionNotes()` — les deux appelés en fin de `buildHeader()`, `dataset.bound` préexistant garantit l'absence de double-bind.
- **CI** : 2 nouvelles étapes dans le job `lint` après `Nav sections manifest validation (#528)` — `Version notes inline validation (#645)` (`node bin/generate-version-notes.js --check`) et `Version notes generator tests (#645)` (`npm run test:version-notes`).
- **`tests/regression/generate-version-notes.test.js`** (nouveau) — idempotence (2e run = 0 diff), `--check` OK/drift/bloc-absent, écriture strictement cantonnée aux marqueurs, 9 cas de validation du schéma invalides (exit 1 attendu) + seed réel valide (exit 0). 16 assertions.

### Fixed
- **`tests/regression/nav-js-syntax.test.js`** : adapté à la disparition de `span.header-version` — vérifie désormais que le template literal du bouton `.version-badge` est bien formé et clos (même esprit anti-régression #206).

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.95.2 → 2.96.0` (minor — nouvelle fonctionnalité dogfood) : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Header modifié sur **toutes les pages** (span → badge) — décale toutes les baselines header, + baseline modale ouverte si le harness sait déclencher `showModal()`. Re-baseline via **soft-harvest CI** (recette #514/M#44), effectuée par le parent — pas de `--update-snapshots` local.

## 2.95.2 — 2026-07-08 — Fix a11y : overlays fermés non focusables (vanilla)

> Pendant vanilla du fix a11y `@msyx-dev/react` v3.0.0-alpha.12.

### Fixed
- `initFAB` / `initBottomSheet` (`shared/components.js`) : toggle `inert` sur `.fab-actions` / `.bottom-sheet` fermés + `aria-modal`/`role` conditionnels (BottomSheet) + normalisation de l'état initial fermé au chargement de page. Corrige la tabulation clavier vers des contrôles invisibles hors-écran. Le drawer vanilla (démo statique `onclick` inline, sans `initDrawer`) n'est pas concerné. Aucun changement CSS (`inert` = attribut) → VR inchangée.

### Changed (versioning)
- Bump synchrone des 8 sources `2.95.1 → 2.95.2` (patch — fix a11y JS).

## 2.95.1 — 2026-07-08 — Cleanup registre parité React : 7 reclassements `react:n-a` (Sprint 0)

> Assainissement du dénominateur de parité React (M#41) avant le lot Overlays+Data. 7 entrées présentationnelles/utilitaires sans vocation à un wrapper React sont reclassées `react:"n-a"`. Aucun changement CSS/JS servi (métadonnées registre uniquement). Même recette que #602/#604.

### Changed
- **`react: "pending" → "n-a"`** sur 7 entrées registre : `reset-natif` (reset global `a`/`:focus-visible`), `texture-grain` (pseudo-élément `body::after`), `brand-acssi` (asset, `cssClasses:null`), `code-inline` (classe inline triviale, couverte par composition), `avatar-img` (variante d'`avatar`), `sidebar-link-disabled` / `sidebar-sublinks` (sous-primitives nav sans composant standalone). Parité : **79 → 72 pending**, **32 → 39 n-a** (dénominateur juste, 0 wrapper concerné).

### Changed (versioning)
- **Bump synchrone des 8 sources** `2.95.0 → 2.95.1` (patch — métadonnées registre, aucun impact CSS servi) : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

## 2.95.0 — 2026-07-07 — Composant Notes de version (badge + modale timeline) (#614)

> Nouveau composant DS présentationnel strict (#445) : badge version cliquable + pastille « nouveau » pilotée par `localStorage` + modale de notes de version réutilisant purement les primitives existantes (`dialog.modal-dialog` + `.timeline`). Source pilote : extraction de la version bespoke de `cap-transfo` #330.

### Added
- **`.version-badge` / `.version-badge--new` / `.version-badge-dot` / `.version-notes`** (`shared/css/components/version-notes.css`) — badge pill `min-height:44px` (WCAG 2.5.5), pastille cachée par défaut (anti-FOUC) révélée uniquement par le modificateur `--new`, variante largeur `dialog.modal-dialog.version-notes-dialog` pour accueillir la timeline. Tokens-first strict, mobile-first. Importé dans le barrel `components.css` après `overlays.css` (non essentiel → absent de `components-core.css`).
- **`initVersionNotes()`** (`shared/components.js`) : seule logique admise — lit `data-storage-key`/`data-latest-version`, compare à `localStorage.getItem(storageKey)` par **égalité de chaîne** (aucun comparateur semver, cf. #445), pose/retire `.version-badge--new` + enrichit/restaure l'`aria-label` dynamiquement. Au clic : persiste `localStorage.setItem`. L'ouverture de la `<dialog>` reste déléguée à `data-modal-trigger` + `initModals()` existant (2 listeners coexistants sur le même bouton, focus-restore WAI APG déjà fourni). `dataset.bound`, appelé dans `reinitAll()`.
- Section démo `#version-notes` en fin d'`overlays.html` (2 variantes : badge avec nouveautés non vues / badge déjà vu) + modale timeline (3 `.timeline-item` d'exemple).
- Registre : entrée `version-notes` (`kind:component`, `page:overlays`, `react:pending`), `module[]` auto-dérivé via `npm run generate-registry`.

### Changed
- Compteurs `site.html` : hero-stat, `<meta description>` et footer `104 → 105` composants. Hub-card Overlays `7 → 8 sections` (description enrichie).
- Manifeste sidebar (`bin/generate-nav-sections.js`) : `EXPECTED_COUNTS['/pages/overlays.html'] 7 → 8`, `EXPECTED_TOTAL 122 → 123`.

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.94.4 → 2.95.0` (minor — nouveau composant) : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Nouvelle section `#version-notes` en fin d'`overlays.html` — baselines `overlays__version-notes.png` à harvester depuis les actuals CI (recette soft-harvest, hors scope de cette PR).

## 2.94.4 — 2026-07-04 — Dédup registre `color-input`/`color-picker` (setup parité React M#41 #603)

> Suite de l'hygiène registre en amont du sprint 1 M#41. `components-registry.json` avait **deux entrées identiques** pour le color picker natif (`color-input` + `color-picker`, mêmes classes `.color-input`, même `initColorInput`) — seul doublon de signature du registre. Il gonflait `kind:component` (+1) et double-comptait la parité React.

### Changed
- **Dédup `color-input` (#603)** — entrée `color-input` supprimée ; `color-picker` conservée (canonique : matche `<section id="color-picker">` de `formulaires.html`, le manifeste nav, et porte le champ `example`). `npm run generate-registry` : `kind:component` **105 → 104**, total composants **134 → 133**, `module[]` re-dérivé. Parité React : **5 ported / 102 portables** (97 pending, 31 n-a).
- **Compteurs `site.html` recâblés `105 → 104`** (hero-stat, `<meta description>`, footer). Version affichée rafraîchie `v2.94.2 → v2.94.4`.

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.94.3 → 2.94.4` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Aucun impact VR : `site.html` hors matrice VR + suppression d'une entrée JSON (aucun rendu de page modifié).

## 2.94.3 — 2026-07-04 — Registre `react:"n-a"` (4 CSS-only) — setup parité React M#41 (#601)

> Hygiène registre en amont du sprint 1 M#41 (parité React, epic #396). Les 4 composants livrés en M#40 qui sont purement CSS (aucun `jsInit`) ne sont pas portables en wrapper React interactif — classés `react:"n-a"`, comme les autres modules présentationnels déjà en `n-a`. Métadonnée registre uniquement : aucun changement du CSS/JS servi.

### Changed
- **Reclassement `react:"n-a"` (#601)** — `btn-group`, `prose`, `orb`, `diff-viewer` passent `pending → n-a` dans `components-registry.json`, puis `npm run generate-registry` (préserve la valeur, re-dérive `module[]`, recompute la parité). Parité React : **5 ported / 103 portables** (98 pending, 31 n-a) — vs 5/107 (102 pending, 27 n-a) avant. `kind` inchangé (`component`), compteurs `site.html` intacts.

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.94.2 → 2.94.3` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Aucun impact VR : métadonnée JSON du registre uniquement, aucun rendu modifié.

### Note
- Le doublon `color-input`/`color-picker` (2 entrées identiques du registre) est **hors scope** de cette PR — traité séparément (il impacte `kind:component` et les compteurs `site.html`, contrairement à ce flip `react`).

## 2.94.2 — 2026-07-04 — Fix lift hover `.btn-group` (M#40 suivi #589)

> Micro-fix visuel. Les boutons DS ont un lift `translateY(-2px)` au survol ; dans un `.btn-group` (boutons accolés), chaque bouton se soulevait individuellement → désalignement du groupe. Le même problème était déjà neutralisé sur `.split-button` mais pas sur `.btn-group`.

### Fixed
- **Lift hover `.btn-group` (#589)** — ajout de `.btn-group > :hover { transform: none; }` dans `buttons.css`, co-localisé avec la règle `z-index` existante (outline WCAG 2.4.7 préservé). Miroir du pattern `.split-button`. Aucune régression sur `.split-button`/`.segmented`.

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.94.1 → 2.94.2` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Aucun impact VR : la règle ne s'applique qu'à l'état `:hover`, non capturé par les baselines (screenshots état par défaut).

## 2.94.1 — 2026-07-04 — Registre `kind:component` (7 entrées M#40) + recâblage compteurs (M#40 suivi #588)

> Correction d'inventaire post-M#40. Les 7 dernières entrées registry ajoutées en M#40 (`form-validation`, `btn-group`, `split-button`, `prose`, `orb`, `color-input`, `json-viewer`) n'avaient pas `kind:component` → invisibles à la validation phantom, au pont `module[]` et au comptage. Les compteurs `site.html` (censés suivre `kindComponentTotal`, cf. #508) avaient dérivé silencieusement.

### Changed
- **Retrofit `kind:component` (#588)** — `"kind": "component"` ajouté aux 7 entrées manquantes dans `components-registry.json`, puis `npm run generate-registry` (peuple `module[]` auto, normalise `react:pending`, valide phantoms). `kindComponentTotal` **98 → 105**, 0 classe fantôme, idempotence OK. Ces entrées entrent désormais dans la validation frontière page↔registre (warn-only, non bloquant).
- **Compteurs `site.html` recâblés sur `kindComponentTotal`** — hero-stat, `<meta name="description">` et footer alignés **89/89/88 → 105**. Version figée du meta rafraîchie **v2.79.0 → v2.94.1** (gelée depuis #572).

### Changed (versioning)
- **Bump synchrone des 8 sources de version** `2.94.0 → 2.94.1` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.

### VR
- Aucun impact VR : la suite cible `pages/*.html`, `site.html` (hub) n'est pas baseliné. CI `visual` vert sans re-baseline.

## 2.94.0 — 2026-06-30 — Diff viewer `.diff` (M#40 Gap C #447)

> Dernier composant du milestone #40. Présentation d'un diff DÉJÀ CALCULÉ par le consumer — couche de présentation pure (comme `.code-block` stylise du code déjà coloré), le DS ne calcule jamais l'algorithme de diff.

### Added
- **Diff viewer `.diff` (#447)** — bloc CSS dans `interactive.css` (pas de nouveau module ni `@import`). `.diff` (conteneur mono, hérite de `.code-block`), `.diff-line--add`/`--del`/`--ctx` (fonds `rgba(var(--success-rgb)/--danger-rgb, 0.12)` appliqués gouttière+code), `.diff-gutter` (n° de ligne), `.diff-sign` (préfixe `+`/`−`/espace — **sens porté hors couleur**, WCAG 1.4.1, via tokens AA `--status-success-fg`/`--status-error-fg`), `.diff-hunk-header` (`@@ … @@`), mode côte-à-côte `.diff--split` (grid 1 colonne → 2 colonnes ≥768px, `.diff-pane`). CSS-only (`jsInit: null`), tokens uniquement. Le consumer fournit le markup ligne-par-ligne typé. Section `#diff-viewer` en fin de `pages/divers.html`.
- **Registry** : entrée `diff-viewer` (`kind:component`, page `divers`, `jsInit: null`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.93.0 → 2.94.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `divers.html` 14 → 15, total 121 → 122 (nouvelle section `#diff-viewer`).

### VR
- Re-baseline ciblé page `divers` via soft-harvest : `#diff-viewer` (12, neuve) + `#json-viewer` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.93.0 — 2026-06-30 — Virtualized list `.virtual-list` (M#40 Gap C #440)

> Liste fenêtrée pour datasets client non-paginables (>1000 lignes). Couche de présentation zéro-dépendance — le consumer fournit les données déjà triées/filtrées.

### Added
- **Virtualized list `.virtual-list` (#440)** — nouveau module `shared/css/components/virtual-list.css` (barrel) + tokens `--vlist-row-h` (40px) / `--vlist-height` (400px). `initVirtualList()` (composants.js, `dataset.bound`, `reinitAll()`) : viewport scrollable à hauteur fixe + 2 spacers (`aria-hidden`) dimensionnés au total logique, ne rend que les lignes visibles `[first, first+visibleCount)` (+overscan 5), recalcul sur `scroll`/`requestAnimationFrame` avec mémoïsation de la fenêtre. `aria-rowcount`/`aria-rowindex` reflètent le total LOGIQUE (pas le DOM). Données fournies par le consumer (`data-vlist-count` en démo, point d'extension `window.__vlistRenderRow`). **Hauteur de ligne fixe** (contrainte structurelle zéro-dépendance assumée). Section `#virtual-list` en fin de `pages/data.html`.
- **Registry** : entrée `virtual-list` (`kind:component`, page `data`, `jsInit: initVirtualList`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.92.0 → 2.93.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : +1 module.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `data.html` 17 → 18, total 120 → 121 (nouvelle section `#virtual-list`).

### VR
- Re-baseline ciblé page `data` via soft-harvest : `#virtual-list` (12, neuve) + `#heatmap-calendar` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.92.0 — 2026-06-30 — Heatmap calendrier `.heatmap-cal` (M#40 Gap C #442)

> Visualisation d'activité type "contributions GitHub". Zéro-dépendance — grille CSS + coloration tokenisée + binning trivial.

### Added
- **Heatmap calendrier `.heatmap-cal` (#442)** — nouveau module `shared/css/components/heatmap-calendar.css` (barrel). Grille CSS 7 jours × N semaines, échelle d'intensité monochrome 5 paliers (`data-level="0..4"` → `rgba(var(--accent-rgb), 0/0.18/0.4/0.65/0.9)`). `initHeatmapCalendar()` (composants.js, `dataset.bound`, `reinitAll()`) : lit une série `{date,value}` fournie par le consumer (cellules `[data-date][data-value]` inline), calcule le binning value→palier (max/quantile, O(n)), place chaque cellule (`grid-row`/`grid-column`), tooltip jour+valeur (survol + focus, pattern risk-matrix), légende moins↔plus, labels mois/jours, navigation clavier (roving tabindex). Zéro fetch, zéro agrégation métier, zéro dépendance. Section `#heatmap-calendar` en fin de `pages/data.html`.
- **Registry** : entrée `heatmap-calendar` (`kind:component`, page `data`, `jsInit: initHeatmapCalendar`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.91.0 → 2.92.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : +1 module.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `data.html` 16 → 17, total 119 → 120 (nouvelle section `#heatmap-calendar`).

### VR
- Re-baseline ciblé page `data` via soft-harvest : `#heatmap-calendar` (12, neuve) + `#server-data-grid` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.91.0 — 2026-06-30 — JSON viewer `.json-viewer` (M#40 Gap B #446)

> Arbre JSON repliable lecture seule pour écrans de debug/admin. Zéro-dépendance (JSON.parse + DOM natifs), analogue à `.prose` (structure/colore un résultat fourni).

### Added
- **JSON viewer `.json-viewer` (#446)** — nouveau module `shared/css/components/json-viewer.css` (barrel). `initJsonViewer()` (composants.js, `dataset.bound`, `reinitAll()`, distinct d'`initTreeView`) : lit un payload via `data-json` ou `<script type="application/json">` inline, `JSON.parse` (try/catch → message d'erreur, pas de crash), génère l'arbre DOM récursivement (`role="tree"/"treeitem"/"group"`, `aria-expanded`), colore par type via les tokens `--code-*` (`.json-key`/`.json-string`/`.json-number`/`.json-boolean`/`.json-null`/`.json-punct`), aperçu sur nœud replié (`.json-preview`), boutons tout déplier/replier, **navigation clavier WAI-ARIA Tree** (roving tabindex, ↑↓←→, Home/End, Enter/Espace). Lecture seule (viewer, pas éditeur) — pas de fetch, pas de virtualisation (méga-payloads hors scope). Section `#json-viewer` en fin de `pages/divers.html`.
- **Registry** : entrée `json-viewer` (page `divers`, `jsInit: initJsonViewer`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.90.0 → 2.91.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : +1 module.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `divers.html` 13 → 14, total 118 → 119 (nouvelle section `#json-viewer`).

### VR
- Re-baseline ciblé page `divers` via soft-harvest : `#json-viewer` (12, neuve) + `#splitter` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.90.0 — 2026-06-30 — Splitter / resizable panels `.split-pane` (M#40 Gap B #443)

> Layout maître-détail redimensionnable. Zéro-dépendance — géométrie triviale (analogue du slider before-after).

### Added
- **Splitter `.split-pane` (#443)** — nouveau module `shared/css/components/splitter.css` (barrel après `media.css`). Conteneur flex `.split-pane` (+ variante `.split-pane--vertical`), `.split-panel` (`min-width:0`, overflow) / `.split-panel--fluid`, poignée `.split-gutter` (`cursor:col-resize`, `touch-action:none`, hit-area ≥44px via `::before`, grip `::after`, `:hover`/`:focus-visible`). `initSplitPane()` (composants.js, `dataset.bound`, `reinitAll()`) : drag Pointer Events (`setPointerCapture`, ratio `clientX/Y` vs `getBoundingClientRect`, clamp `data-split-min`/`max`), clavier `role="separator"` + `aria-valuenow`/`min`/`max` (flèches, Home/End), persistance `localStorage` optionnelle (`data-split-persist-key`), `CustomEvent('split:resize')`. Nouveaux tokens `--split-gutter-size`/`--split-gutter-hover`. Section `#splitter` en fin de `pages/divers.html`.
- **Registry** : entrée `splitter` (page `divers`, `jsInit: initSplitPane`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.89.0 → 2.90.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : +1 module.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `divers.html` 12 → 13, total 117 → 118 (nouvelle section `#splitter`).

### VR
- Re-baseline ciblé page `divers` via soft-harvest : `#splitter` (12, neuve) + `#prose` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.89.0 — 2026-06-30 — Mention @ `.mention-dropdown` (M#40 Gap A #441)

> Autocomplete @ inline dans un textarea (mention d'utilisateurs). Zéro-dépendance, zéro fetch — la liste est fournie par le consumer.

### Added
- **Mention @ (#441)** — `initMentionInput()` (composants.js, `dataset.bound`, `reinitAll()`) : détecte le token `@` en début de mot dans un `<textarea data-mention-source>`, calcule la position pixel du caret via un helper `getCaretCoordinates` (mirror-div pur, styles clonés), ouvre un `.mention-dropdown` ancré au caret (surface héritant du look `.search-item`), navigation clavier (↑/↓/Enter/Échap) + **`aria-activedescendant`**, insertion de `@valeur ` avec repositionnement du caret. Combobox a11y (`role`/`aria-autocomplete`/`aria-expanded`/`aria-controls`). Liste des mentionnables via `data-mention-source` (CSV ou JSON) — aucun fetch. CSS `.mention-input-wrap`/`.mention-dropdown` dans `forms.css`. Section `#mention` en fin de `pages/feedback.html`.
- **Registry** : entrée `mention` (page `feedback`, `jsInit: initMentionInput`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.88.0 → 2.89.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `feedback.html` 12 → 13, total 116 → 117 (nouvelle section `#mention`).

### VR
- Re-baseline ciblé page `feedback` via soft-harvest : `#mention` (12, neuve) + `#access-denied` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.88.0 — 2026-06-30 — Transfer list `.transfer-list` (M#40 Gap A #444)

> Double liste disponibles↔assignés (affectation membres/rôles). Zéro-dépendance : déplacement de nœuds DOM, pas de virtualisation (gros volumes hors scope).

### Added
- **Transfer list `.transfer-list` (#444)** — nouveau module `shared/css/components/transfer-list.css` (barrel). 2 panneaux (`.transfer-panel` : header + `.transfer-count` + `.transfer-search` + `.transfer-body` scrollable) + colonne d'actions `.transfer-actions` (boutons `.btn-icon` →/←/⇒/⇐, `[data-transfer]`). `.transfer-option` sélectionnable (`.selected`, `.hidden` pour filtre, 44px). `initTransferList()` (composants.js, `dataset.bound`, `reinitAll()`) : sélection clic + clavier (Enter/Espace toggle, ↑/↓ navigation), transfert DOM des items sélectionnés entre panneaux, filtre substring par panneau, région `aria-live` d'annonce, `CustomEvent('transfer:change')`. Mobile-first (stack → 2 colonnes ≥600px). Section `#transfer-list` en fin de `pages/formulaires.html`.
- **Registry** : entrée `transfer-list` (page `formulaires`, `jsInit: initTransferList`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.87.0 → 2.88.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : +1 module.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `formulaires.html` 18 → 19, total 115 → 116 (nouvelle section `#transfer-list`).

### VR
- Re-baseline ciblé page `formulaires` via soft-harvest : `#transfer-list` (12, neuve) + `#color-picker` (12, bordure `:last-of-type`). Aucune autre page affectée.

## 2.87.0 — 2026-06-30 — Color picker `.color-input` (M#40 Gap A #448)

> Premier livrable des Gaps du milestone #40. Composant zéro-dépendance : wrapper autour du `<input type=color>` natif (picker visuel délégué au navigateur).

### Added
- **Color picker `.color-input` (#448)** — wrapper qui stylise un `<input type=color>` NATIF : reset du chrome navigateur (`appearance:none`, `::-webkit-color-swatch-wrapper`/`::-webkit-color-swatch`/`::-moz-color-swatch`), carré 44px, `border`/`border-radius` DS, focus-ring `.input`, état `.color-input--disabled`. Affichage hex `.color-input-value` (font-mono). Rangée optionnelle de presets réutilisant `.color-swatch[data-color]` (cliquables, `aria-pressed`). `initColorInput()` (composants.js, `dataset.bound`, dans `reinitAll()`) : sync input↔label hex↔preset actif, clic preset → `input.value` + `dispatchEvent('input')` natif. Aucun calcul colorimétrique, aucun picker HSL maison — délégué 100% au navigateur/OS. Section `#color-picker` en fin de `pages/formulaires.html`. CSS dans `forms.css` (pas de nouveau module).
- **Registry** : entrée `color-input` (page `formulaires`, `jsInit: initColorInput`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.86.0 → 2.87.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `formulaires.html` 17 → 18, total 114 → 115 (nouvelle section `#color-picker`).

### VR
- Re-baseline ciblé page `formulaires` via soft-harvest : `#color-picker` (12, neuve) + `#form-validation` (12, gagne une bordure-bas `:last-of-type`). Aucune autre page affectée.

## 2.86.0 — 2026-06-30 — Primitif `.orb` canonique + refactor 4 usages (M#40 Vague 2 #357)

> Dernier livrable de la Vague 2 du milestone #40. Extraction d'un primitif `.orb` et unification de 4 copies divergentes (dont une avec hex hardcodés).

### Added
- **Primitif `.orb` (#357)** — nouveau module `shared/css/components/orb.css` (barrel après `_base.css`, avant `cards.css`). Base canonique `.orb` (`position:absolute`, `border-radius:50%`, `pointer-events:none`, `will-change:transform`, `filter:blur(var(--orb-blur,60px))`, `opacity:var(--orb-opacity,0.12)`) + modificateurs couleur (`.orb--accent` / `.orb--primary-light` / `.orb--violet` / `.orb--danger`) + taille (`.orb--sm` 250px / `.orb--md` 350px / `.orb--lg` 500px) + animation **opt-in** (`.orb--float`, `@keyframes orbFloat` extrait de cards.css). Démo dans la section effets de `pages/fondation.html`.

### Changed
- **Refactor des 4 copies divergentes de `.orb` vers le primitif, ISO-VISUEL** : hero (`cards.css`, `--orb-opacity:1` pour préserver l'alpha color-mix + `.hero-bg .orb` conserve son animation), login (`forms.css`, `--orb-opacity:0.15`), access-denied (`access-denied.css`, défauts base). `index.html` (auth gate standalone) : **hex hardcodés `#3b82f6`/`#8b5cf6` tokenisés** en `var(--accent)`/`var(--deco-violet)`. `aria-hidden="true"` harmonisé sur tous les orbes (login/index/site). Registry : entrée canonique `orb` + nettoyage des classes `.orb*` absorbées dans `cards`/`access-denied`.

### Changed (versioning)
- **Bump synchrone des sources de version** `2.85.0 → 2.86.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`. Barrel `components.css` : 32 → 33 modules.

### VR
- Soft-harvest ciblé page `fondation` (la démo insérée dans la section effets décale verticalement les sections suivantes → cascade sub-pixel). **Login (`formulaires`) et access-denied (`feedback`) NON divergents → refactor confirmé pixel-identique sur les surfaces releasées.**

## 2.85.0 — 2026-06-30 — Module `.prose` (rendu markdown / contenu riche) (M#40 Vague 2 #439)

> Troisième livrable de la Vague 2 du milestone #40. Conteneur CSS-only stylisant du HTML markdown déjà rendu.

### Added
- **Module `.prose` (#439)** — nouveau module `shared/css/components/prose.css` (ajouté au barrel `components.css` après `interactive.css`). Conteneur `.prose` qui stylise du HTML natif issu d'un rendu markdown : `h1`–`h6` (échelle rem + `--font-display`), `p` (`--lh-relaxed`), `ul`/`ol`/`li` (list-style rétabli), `blockquote` (`border-inline-start` accent + `--text-muted` italique), `code`/`pre` (mono + `--surface-solid`), `hr`, `strong`/`em`. Scope via `:where(...)` (spécificité 0,1,0 — n'override jamais `.section-header`). **Tables héritées de `tables.css`** et **liens de `_base.css`** (zéro CSS dupliqué). CSS-only, zéro JS, zéro parser markdown, zéro nouveau token. Nouvelle section `#prose` en fin de `pages/divers.html`.
- **Registry** : entrée `prose` (page `divers`, `jsInit: null`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.84.0 → 2.85.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `divers.html` 11 → 12, total 113 → 114 (nouvelle section `#prose`). Barrel `components.css` : 31 → 32 modules.

### VR
- Re-baseline ciblé page `divers` via soft-harvest des actuals CI : nouvelle section `#prose` (12) + `#before-after` (12, qui gagne une bordure-bas `:last-of-type`). Aucune autre page affectée.

## 2.84.0 — 2026-06-30 — Split button `.split-button` (M#40 Vague 2 #438)

> Deuxième livrable de la Vague 2 du milestone #40. Composant composé : action primaire + caret menu attaché.

### Added
- **Split button `.split-button` (#438)** — action primaire (bouton standard) + `.split-button__caret` attaché ouvrant un panneau `.split-button__menu` bâti sur le primitif `.menu` (#520). `initSplitButton()` dédié (`shared/components.js`, `dataset.bound`, appelé dans `reinitAll()`) : open/close, `aria-haspopup="menu"` + `aria-expanded` synchronisé sur le caret seul, navigation clavier (flèches ↑/↓, Home/End, Enter/Espace, Échap + focus restauré au caret), fermeture au clic extérieur et à Échap (handlers globaux étendus). Panneau `role="menu"` / items `role="menuitem"` / `role="separator"`. CSS dans `buttons.css` (wrapper indépendant, pas `.btn-group` — l'enfant menu en position absolue est incompatible avec le `:last-child` de `.btn-group`), `translateY` hover neutralisé dans le groupe. Tokens existants uniquement (`--radius-md`, `--shadow-menu`, `--space-xs`, durations/eases). Nouvelle section `#split-button` en fin de `pages/composants.html`.
- **Registry** : entrée `split-button` (page `composants`, `jsInit: initSplitButton`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.83.0 → 2.84.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `composants.html` 13 → 14, total 112 → 113 (nouvelle section `#split-button`).

### VR
- Re-baseline ciblé page `composants` via soft-harvest des actuals CI : nouvelle section `#split-button` (12) + `#disabled-global` (12, qui gagne une bordure-bas `:last-of-type` en perdant son statut de dernière section). Aucune autre page affectée.

## 2.83.0 — 2026-06-30 — Button group attaché `.btn-group` (M#40 Vague 2 #451)

> Premier livrable de la Vague 2 du milestone #40. Composant CSS-only qui résorbe un hack inline (`.tab` détournés + styles hardcodés) dans la section #buttons.

### Added
- **Button group attaché `.btn-group` (#451)** — conteneur `display:inline-flex` qui accole des `.btn-*` existants : radius mitoyens via propriétés logiques (`border-start-start-radius` / `border-end-start-radius`, RTL-safe), bordure partagée sans double épaisseur (`margin-inline-start:-1px`), `z-index` au `:hover` / `:focus-visible` pour que l'outline focus reste au-dessus du voisin (WCAG 2.4.7). `role="group"` + `aria-label` requis. CSS-only (aucun `init*`), ajouté dans `buttons.css` (pas de nouveau module). Token `--radius-md`, zéro valeur hardcodée. Remplace le hack inline de la sous-section « Groupe de boutons » (`pages/composants.html`). Distinct de `.segmented` (choix exclusif radio-like, JS). Horizontal uniquement — pas de variante verticale ni d'état toggle (MVP arbitré).
- **Registry** : entrée `btn-group` (page `composants`, `jsInit: null`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.82.0 → 2.83.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.

### VR
- Re-baseline ciblé de la page `composants` (section #buttons modifiée + cascade de décalage vertical des sections suivantes sur desktop) via soft-harvest des actuals CI. Aucune autre page affectée.

## 2.82.0 — 2026-06-30 — Pattern de validation de formulaire a11y (M#40 #433)

> Deuxième livrable du milestone #40 « Composants manquants ». Pattern opt-in qui traduit la validité HTML5 native en feedback accessible, sans nouveau token ni nouvelle classe d'état (réutilise `.input-error` / `.alert` de #519).

### Added
- **Validation de formulaire a11y (#433)** — `initFormValidation()` : opt-in via `<form data-validate>`. Traduit `input.validity` (HTML5 native) en messages d'erreur FR, pose `aria-invalid` + `aria-describedby` sur les champs invalides, expose une région live `aria-live="polite"` au `blur`, et un résumé `.alert[role="alert"]` focusable au `submit` (liste `.form-error-list` de liens vers les champs en erreur). Émet l'événement `ds:validation` (`detail: { valid, errors }`). Anti-double-bind `dataset.bound`. Nouvelle section `#form-validation` dans `pages/formulaires.html`.
- **CSS additif `forms.css`** : styles `.input[aria-invalid="true"]` (bordure + halo `--danger`, variante `:focus-visible`), `.form-error-list` (liste de liens d'erreurs), `.ds-form .alert[role="alert"]`. Respecte `prefers-reduced-motion` (halo retiré). Zéro nouveau token.
- **Registry** : entrée `form-validation` (page `formulaires`, `jsInit: initFormValidation`).

### Changed (versioning)
- **Bump synchrone des sources de version** `2.81.0 → 2.82.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine, `entrypoint.sh`, footer `site.html`.
- **`EXPECTED_COUNTS`** (`bin/generate-nav-sections.js`) : `formulaires.html` 16 → 17, total 111 → 112 (nouvelle section `#form-validation`).

## 2.81.0 — 2026-06-22 — Date-picker INLINE + time-picker (M#40 #432/#436)

> Premier composant fonctionnel du milestone #40 « Composants manquants ». Le markup + CSS du calendrier existaient (statiques) ; cette release apporte le JS.

### Added
- **Date-picker INLINE fonctionnel (#432)** — `initCalendar()` : sélection simple + plage (1 calendrier, 2 clics), navigation de mois, génération dynamique des jours (JS `Date` natif, zéro dépendance), liaison à un `<input>`, événement `calendar:change`. A11y grille complète : `role=grid/row/gridcell`, `aria-selected`, `aria-current=date`, roving tabindex, navigation clavier (flèches/Home/End/PageUp-Down/Enter/Échap), `aria-live` sur le mois. Mois de référence figé (`data-cal-ref`) pour des baselines VR déterministes.
- **Time-picker 24h/12h (#436, mergé dans #432)** — `initTimePicker()` mutualisant `.number-input-wrap` (HH/MM) + `.segmented` (AM/PM), événement `time:change`. Sous-section dans `#calendar`.

### Changed
- Bump synchrone des sources de version `2.80.0 → 2.81.0` (+ alignement `entrypoint.sh`/footer `site.html` qui étaient en retard depuis la refonte mikpulse).

## 2.80.0 — 2026-06-21 — Conteneur grille .content-grid + icônes thème (server, command) — refonte mikpulse S6 (#53 #55)

> Ajout non-breaking : nouveau conteneur `.content-grid` distinct de `.page-content` pour les fils de cartes en grille, et deux icônes Lucide supplémentaires dans le sprite (server, command).

### Added
- **`.content-grid` (layout.css)** : conteneur large pour fil de cartes en grille — `max-width: var(--content-grid-max)`, `margin-inline: auto`, padding responsive (md → xl → 2xl), `padding-top: var(--header-h)`, `padding-bottom` dégageant la bottom-nav mobile. Distinct de `.page-content` (mesure typo 72ch) — usage : `<main class="content-grid"><section class="grid-auto-fit-lg">…</section></main>`.
- **`--content-grid-max: 1200px` (tokens.css)** : token dédié pour la largeur max du conteneur grille. Surcharger localement si besoin.
- **Icône `server` (sprite.svg)** : Lucide `server` — fallback vignette homelab dans mikpulse S6 (#55).
- **Icône `command` (sprite.svg)** : Lucide `command` — fallback vignette apple/⌘ dans mikpulse S6 (#55).
- **Registry** : `.content-grid` ajouté au tableau `cssClasses` de l'entrée `page-content` avec description étendue.

### Changed (versioning)
- **Bump synchrone 5 sources** `2.79.0 → 2.80.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version), `package.json` racine.
- **Sprite** : passage de 56 à 58 symboles (+ server, + command).

## 2.79.0 — 2026-06-21 — Variante `.card-media` (vignette bleed) + token `--card-thumb-h` (#37, demandée par la refonte mikpulse)

> Ajout non-breaking d'une variante de card orientée image-first. Corrige aussi le drift `package.json` racine (resté à 2.77.0 depuis v2.77 alors que le DS était à 2.78.0).

### Added
- **`.card-media` (cards.css)** : variante de `.card` à vignette pleine largeur (bleed). Surcharge `padding:0` + `overflow:hidden` pour que l'image respecte le `border-radius` de la carte. Hérite de tous les tokens de `.card` (fond, border, hover, transitions).
- **`.card-thumb` (cards.css)** : conteneur de la vignette en tête de carte. `width:100%`, hauteur fixe via token dédié `--card-thumb-h`, image enfant en `object-fit:cover; display:block; width:100%; height:100%`. Compatible tout contenu de remplissage (fond gradient, image). Pas de `border-radius` sur l'image — la carte clippe via `overflow:hidden`.
- **`.card-body` (cards.css)** : zone de contenu sous la vignette. `padding:var(--space-xl)` rétablit l'espacement retiré par `.card-media`. Accueille overline / titre / résumé / badges.
- **`--card-thumb-h: 160px` (tokens.css)** : token dédié pour la hauteur de la vignette `.card-thumb`. Surcharger localement si besoin (`--card-thumb-h: 200px`).
- **Compatibilité `.card-link`** : `.card-media` fonctionne à l'intérieur d'un wrapper `.card-link` (carte cliquable). Focus-visible et hover préservés.
- **Compatibilité `.card-muted`** : `.card-media.card-muted` cumule sans casse — cascade orthogonale (padding vs opacity/border-color). Vignette `.card-thumb` atténuée à opacity 0.75 pour cohérence visuelle.
- **Démo `pages/composants.html`** : nouvelle section `#card-media` avec démos de 3 variantes (normale, muted, cliquable), vignettes gradient token, code HTML commenté, note sur le token `--card-thumb-h`.

### Fixed
- **Drift `package.json` racine** : aligné de 2.77.0 → 2.79.0 (resté à 2.77.0 depuis le bump 2.77 sans correction postérieure). Aligne le champ `version` avec `@ds-version` dans les 5 fichiers CSS/JS.

### Changed (versioning)
- **Bump synchrone 5 sources** `2.78.0 → 2.79.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version + nouvelle entrée `card-media`), `package.json` racine.

## 2.78.0 — 2026-06-20 — Support consumers sans rail : .page-content, .hidden-mobile, .card-muted, header brand configurable (#567 #568 #569 #570)

> Demande d'origine : refonte UI/UX mikpulse (consumer Next.js sans sidebar DS, P0 public). 4 livrables non-breaking, retro-compatibles — aucun consumer existant casse.

### Added
- **`.page-content` + `.main--no-rail` (layout.css — #567)** : conteneur de page pour consumers sans sidebar. `.page-content` : `max-width:var(--content-max)` (72ch), centrage `margin-inline:auto`, padding-inline responsive (md→xl→2xl), `padding-bottom` degageant la bottom-nav mobile fixe (`--bottom-nav-h`). `.main--no-rail` : variante `.main` annulant la marge inline-start et saturant `--sidebar-w:0` pour la compat composants. Tokens ajoutes : `--bottom-nav-h:60px`, `--content-max:72ch`.
- **`.hidden-mobile` / `.hidden-desktop` (utilities.css — #568)** : utilitaires responsive de masquage, breakpoint 768px aligne sur `.bottom-nav`. Le masquage est scope a la plage concernee (`.hidden-mobile` : `@media (max-width:767.98px)` ; `.hidden-desktop` : `@media (min-width:768px)`) avec `display:none !important` — l'element retrouve son **display natif** hors plage (flex/grid/table preserves, pas de `revert` vers `block` qui casserait un `.tabs` flex). `!important` pour battre la specificite des composants (0,1,0). Exception assumee au mobile-first min-width : « masquer sur mobile » est semantiquement un concept max-width.
- **`.card-muted` + `--opacity-muted` (cards.css + tokens.css — #569)** : variante carte attenuee WCAG-safe. Opacity globale `0.85` (token `--opacity-muted`) sur le chrome (fond, border, box-shadow) — le texte reste en `var(--text)`, contraste ≥ 4.5:1 garanti WCAG 1.4.3. `.card-muted .card-icon` : opacity 0.6. Hover : remontee `opacity:1` + `border-hover`. React : pending (registry).
- **Brand header configurable — `window.MSYX_HEADER.brand` (nav.js — #570)** : clef `brand:{text,href,logoSrc}` dans la config header. Retro-compatible : defauts vitrine DS inchanges si `brand` absent (`text:'design-system'`, `href:'/site.html'`, `logoSrc:logoMSYX.png`). Permet aux consumers (ex. mikpulse) de personaliser logo + wordmark + lien sans forker `nav.js`.

### Changed (versioning)
- **Bump synchrone 5 sources** `2.77.0 → 2.78.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version + nouvelles entrees). Footer `site.html` a aligner au merge.

## 2.77.0 — 2026-06-18 — Consolidation des doublons de composants (M#44, Epic #517)

> Milestone #44 **soldé** (Epic #517 clos : 5/5 sub-issues). Cinq consolidations **non-breaking** : un canonique élu par famille, les variantes concurrentes réduites à des alias `@deprecated` (suppression réelle en **v3**), tokenisation au passage. Aucun consumer cassé (alias rétro-compat). Bump synchrone des 8 sources. Churn VR géré par soft-harvest CI (chips→tag-input, wizard→stepper, messaging) ; #520 = 0 diff de rendu (surfaces flottantes fermées par défaut, tokenisation value-preserving).

### Changed
- **Bascule dark/light unique (#518)** : `.mode-switch` (`layout.css`) élu canonique. `theme-toggle.css` réduit à des alias `@deprecated`. Wrapper React `ThemeToggle` réécrit pour émettre `.mode-switch` (icônes sun/moon, `.is-dark`), `aria-checked` aligné sur le vanilla (`true === DARK`, #382). Entrées registre fusionnées, `REACT_TO_REGISTRY` remappé. **Seule issue touchant `packages/react/`** (release du package React déléguée à M#41).
- **Consolidation stepper 2→1 (#521)** : `.wizard-step*` (`tracker.css`) → alias `@deprecated` du primitif canonique `.step*` (`navigation.css`). `.pt-step--*` / `.progress-tracker-step-*` (tracker circulaire) **hors scope** (non-steppers). API `.step*` additive (consumer `acssi-core` préservé).
- **Saisie jetons : tag-input canonique (#522)** : `.chip-input-*` (`badges.css`) → alias `@deprecated` de `tag-input` (`forms.css`). Tokenisation `.tag-input-wrap` (`border-radius` → `--radius-sm`, `transition` → `--duration-base`). `initChips` isolé (`dataset.chipInputBound`).
- **Unification messaging (#519)** : `.alert` canonique + modificateurs `.alert--kpi` (ex-`.zone-banner`) et `.alert--cta` (ex-`.upgrade-banner`, alerte actionnable) + slots `.alert-title/-body/-actions`. Migration `upgrade-banner` hors `pricing.css`. Tokenisation alphas (`--alert-bg-alpha` / `--alert-border-alpha`).
- **Primitif `.menu` (#520)** : nouveau module `menu.css` (`.menu` / `.menu-item` / `.menu-divider`, token `--shadow-menu`), importé dans `components.css` + `components-core.css`. Les 6 surfaces flottantes (`.context-menu`/`.action-menu`/`.dropdown-menu`/`.header-dropdown`/`.user-menu-dropdown` + `.cmd-item`) deviennent des alias `@deprecated` — markup HTML/JS/React inchangé. Positionnement/animation conservés par-conteneur (a11y #382).

### Changed (versioning)
- **Bump synchrone 8 sources** `2.76.0 → 2.77.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json`, `package.json`. Footer `site.html` + `entrypoint.sh` alignés. Versioning **Option B** (release consolidée par le parent, 0 bump par PR) reconduit ; pré-allocation 2.77–2.81 collapsée en un minor unique.

## 2.76.0 — 2026-06-16 — Vitrine : split feedback→overlays + motion→fondation (#514) — milestone #43 soldé

> Dernière issue du milestone #43 (Epic #505 **clos** : 12/12 sub-issues). Axe PAGE (vitrine HTML) — aucun CSS de rendu modifié, bump synchrone des 8 sources pour cohérence `check-versions`.

### Changed
- **Réorganisation des pages vitrine (#514)** : `pages/feedback.html` scindé (19→12 sections « états ») + nouvelle page **`pages/overlays.html`** (7 « surfaces flottantes » : modals, drawer, bottom-sheet, FAB, notification-center, confirm-popover, tooltip). `pages/motion.html` repliée dans `pages/fondation.html` (13→16 sections) puis supprimée. **9 pages vitrine** inchangé (−motion +overlays).
- **Réalignements** : manifeste sidebar (`bin/generate-nav-sections.js`), registre (`page` des entrées déplacées), compteurs hero `site.html` + hub-cards + lazy-sections, specs `visual.spec.ts`/`a11y.spec.ts`/`modal-focus.spec.ts`. `docs/ARCHITECTURE.md` + `CLAUDE.md` à jour.
- **Baselines VR** régénérées via **récolte des `actual` CI** (soft-assertions temporaires) — overlines déplacés + bordures `:last-of-type`. La régénération locale s'étant révélée non fiable, méthode capitalisée. Aucun diff de rendu fonctionnel.
- **Bump synchrone 8 sources** `2.75.0 → 2.76.0` + footer + `entrypoint.sh`.

## 2.75.0 — 2026-06-15 — Lot churn-VR M#43 : réorganisation des modules CSS par destination (#510 #512 #513)

> Lot « churn-VR » du milestone #43 (Epic #505) — refactors CSS purs (déplacements de classes entre modules, tous chargés par le barrel `components.css`), **zéro diff de rendu** (cascade finale identique, validé par la visual-regression à 0 diff sur #551 et #552). Bump synchrone des 8 sources. **#514** (rééquilibrage des pages vitrine + page `overlays.html`) **reporté** : code prêt (PR #553) mais régénération des baselines VR bloquée — cf. issue #514.

### Changed
- **login-screen — rapatriement CSS (#510)** : bloc AUTH FLOWS (`.login-step`, `.login-strength*`, `.login-cgu`, `.login-success-msg`, `.login-back-link`) déplacé de `pricing.css` → `forms.css` (co-localisation de tout le login-screen). Registre réattribué `pricing`→`login-screen`, `module[]` régénéré. Corrige un bug latent (un `sync --components=forms` livrait un login incomplet). Rendu inchangé.
- **Éclatement `interactive.css` + `pricing.css` vers modules existants (#512)** : FAB + AUTO-SAVE → `feedback.css` ; SEGMENTED CONTROL → `navigation.css` ; INLINE EDITING → `forms.css` ; SETTINGS PANEL → `forms.css` ; COMMENTS/THREAD → `feedback.css` ; ICON (`.icon`, `.icon--sm`, `.icon--lg`) → `_base.css` (primitif générique sprite). `interactive.css` devient le module « contenu riche/code » (CODE+COPY) ; `pricing.css` conserve PRICING TABLE + UPGRADE/USAGE. Les deux `@import` restent dans le barrel. `module[]` auto-dérivé. Zéro diff de rendu.
- **Fusion `modals.css` → `overlays.css` — module unique « surfaces flottantes » (#513)** : tout le contenu de `modals.css` (MODAL, MODAL DIALOG, POPOVER, COMMAND PALETTE, DRAWER, BOTTOM SHEET, CONFIRM POPOVER + `@keyframes modalIn/fadeIn/fadeInScale`) absorbé dans `overlays.css`. `modals.css` réduit à un stub `@import "./overlays.css"` (compat consumer 1-2 versions). Ligne `@import "./components/modals.css"` retirée du barrel `components.css` (double-inclusion évitée). `@keyframes fadeIn` préservé dans `overlays.css` — consommé par `quiz.css`.

### Changed (versioning)
- **Bump synchrone 8 sources** `2.74.0 → 2.75.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json`, `package.json`. Footer `site.html` + `entrypoint.sh` alignés.

## 2.74.0 — 2026-06-14 — Sprint #43 Cohérence taxonomie & navigation : pont page↔module, registre complété, règle frontière (#506 #507 #508 #511)

> Axe **registre & doc** du milestone #43 (Epic #505). Aucune modification CSS de rendu — bump synchrone des 8 sources de version pour cohérence `check-versions`. Lot churn-VR (#510/#512/#513/#514) reporté.

### Added
- **Pont page↔module — champ `module[]` (#506)** : `bin/generate-registry.js` dérive automatiquement `module[]` (`string[]`, chemins repo `shared/css/.../X.css`) pour chaque `kind:component`, via la map inverse classe→fichier. 76 entrées peuplées (3 exemptées sans classe résoluble : `reset-natif`, `texture-grain`, `brand-acssi`) ; `code-inline` normalisé `string`→`array`. Le mode `--check` gagne un contrôle d'intégrité (résolubilité du module + cohérence avec les fichiers réels de `shared/css/components/` + idempotence). Politique figée dans `docs/DS-PRINCIPLES.md` §8.2 — `module[]` JAMAIS saisi à la main. Rend le triplet composant→page→module auditable.
- **Registre complété — 10 entrées composants (#508)** : ajout des `kind:component` curées à la main manquantes — templates (`kanban`, `roadmap`, `backlog`, `sprint`, `settings-panel`) et data (`charts`, `gauge`, `activity-feed`, `risk-matrix`, `usage-meter`). `module[]` auto-dérivé sur les nouvelles entrées. Correctif curatif : `.settings-*`/`.usage-*` retirés de l'entrée `pricing` (sur-revendication multi-composant). Compteurs hero `site.html` recâblés 78→88.
- **Règle frontière page↔registre (#511)** : `docs/DS-PRINCIPLES.md` §6.1 — invariant de réciprocité `<section id>` ↔ entrée registre `kind:component` ↔ `module[]`, avec exemptions transverses (`_base`, `_a11y`, `_responsive`, `theming`, `section-header`, `signature`) et pages de référence (`fondation`, `motion`, `getting-started`), exemples ❌/✅. Garde-fou CI : `generate-registry.js --check` étendu d'un contrôle frontière bidirectionnel (section sans entrée + entrée orpheline), **warn-only par défaut**, `--frontier-strict` opt-in (49 violations name/id résiduelles documentées en dette).

### Fixed
- **Doc core preset (#507)** : `CONSUMER_GUIDE.md` reflète désormais les **9 modules réels** du preset core (`navigation` inclus depuis v2.73.0, `modals` toujours exclu) — la crainte d'origine « consumer croit avoir une nav absente » était caduque depuis #542. Poids gzip recalculés sur le CSS réel (~14,5 KB core / ~37 KB barrel complet, l'ancien « ~42 KB / ~25 KB » était faux dans les deux sens). Liste « Modules disponibles » complétée (+`access-denied`, `brand`, `section-header`, `signature`, `theme-toggle`). Compteur modules corrigé dans `CLAUDE.md`.

### Changed
- **Bump synchrone 8 sources** `2.73.0 → 2.74.0` : `@ds-version` (tokens/utilities/components/layout.css), `nav.js` (@ds-version + `const VERSION`), `components-registry.json` (version top-level), `package.json`. Footer `site.html` aligné v2.74.0.

## 2.73.0 — 2026-06-14 — Header par défaut consumers : cloche hors auth, switcher thème opt-in (#542)

### Changed
- **`buildHeader` (`shared/nav.js`)** : cloche notifications extraite du bloc `if (authEnabled)` — rendue par défaut, indépendante de l'auth, masquable uniquement via `MSYX_HEADER.notifications.enabled: false`. Anti-double-cloche : `notifBellHtml` construit une seule fois, le profil ne la re-rend plus. (#542)
- **Switcher thème (`#theme-select`)** : conditionnel derrière `MSYX_HEADER.themeSwitcher` (défaut `false`) — absent chez les consumers mono-thème, opt-in pour la vitrine DS. (#542)
- **Profil (avatar/dropdown)** : inchangé, reste derrière `MSYX_HEADER.auth`. (#542)
- **FIX FOUC #251 (`initThemeSwitcher` dans `shared/components.js`)** : `updateModeSwitch()` déplacé avant le guard `if (!select) return` — les boutons dark/light se synchronisent correctement même quand `themeSwitcher: false` (switcher absent). (#542)
- **`initHeaderNotifications()`** : appelée dès que la cloche est rendue (plus seulement dans le bloc auth). (#542)
- **9 pages DS** (`site.html` + 8 `pages/*.html`) : `themeSwitcher: true` ajouté au `MSYX_HEADER` inline — vitrine conserve son switcher après le changement de défaut. (#542)
- **`shared/css/components-core.css`** : `navigation.css` ajouté au barrel core (tabs/breadcrumb/stepper/bottom-nav) ; commentaire corrigé (5→9 modules). (#542)
- **`shared/sync.sh`** : `cp navigation.css` ajouté au bloc `--components=core` — résout le `@import` du barrel core chez le consumer. (#542)
- **`shared/CONSUMER_GUIDE.md`** : section Header réécrite — tableau des éléments par défaut, `themeSwitcher: true` documenté, phrase « sans auth » corrigée, note layout.css/navigation.css. (#542)
- **`pages/getting-started.html`, `pages/navigation.html`** : phrase « sans MSYX_HEADER → theme switcher uniquement » corrigée en « logo + toggle dark/light + cloche notifications ». (#542)

## 2.72.0 — 2026-06-14 — Password input avec révélation (toggle œil) — `initPasswordToggle()` (#435)

### Added
- **Password toggle** : nouveau composant `.password-field` + `.password-toggle` dans `shared/css/components/forms.css` — wrapper position relative, bouton icon-only absolute right, cible tactile 44px mobile-first, `:focus-visible`, échange d'icône eye↔eye-off piloté en CSS via `[aria-pressed="true"]` (0 manipulation DOM icônes). Tokens-first strict, mobile-first, 5 combos thème/mode couverts. (#435)
- **`initPasswordToggle()`** dans `shared/components.js` — bascule `input.type` password↔text, `aria-pressed` + `aria-label` dynamique ("Afficher…"/"Masquer…"), résolution input via `aria-controls` ou `.password-field` parent, anti-double-bind `dataset.bound`, appelé dans `reinitAll()`. (#435)
- **`i-eye-off`** ajouté à `shared/icons/sprite.svg` (path Lucide stable) + `shared/icons/build-sprite.sh` (liste `ICONS` — `eye-off` après `eye`, compteur System 6→7). (#435)
- **Section `#password-toggle`** dans `pages/formulaires.html` : 3 variantes (vide, rempli, + `.login-strength` composition). (#435)
- **Registre** `shared/components-registry.json` : entrée `password-toggle` (page=formulaires, cssClasses, jsInit=initPasswordToggle, react=pending). (#435)
- **Compteurs** `site.html` : hero 77→78 composants, footer v2.72.0, hub card Formulaires 15→16 sections. (#435)

## 2.71.2 — 2026-06-14 — Réintégration de 15 sections orphelines hors `.main` (sidebar + VR) (#538)

### Fixed
- **Cause racine des « libellés absents » de la sidebar.** 15 sections de composants RÉELS étaient placées **hors du conteneur `.main`** sur 3 pages → exclues du manifeste sidebar (#528 construit la nav depuis `.main > section[id]`) ET de la VR, et rendues en **pleine largeur (1280px, x=0) par-dessus la sidebar** au lieu de la colonne de contenu (1020px, x=260).
  - **fondation** (balance `<div>` -1, 1 `</div>` parasite) : `utilities`, `brand`, `iconographie`, `performance-glass`, `texture`, `svg-theme-aware`.
  - **formulaires** (balance `<div>` -3, 3 `</div>` parasites) : `otp-input`, `tag-input`, `quiz`, `wizard`, `inline-edit`, `filter-bar`.
  - **navigation** (balance 0, sections placées après la fermeture de `.main`) : `sidebar-rail`, `action-menu`, `user-menu`.
- **Fix** : rééquilibrage des `<div>` (suppression des `</div>` parasites sur fondation/formulaires ; déplacement de la fermeture `.main` après les 3 sections sur navigation). Vérifié au rendu réel : les 15 sections passent `parent=main`, `width=1020 / left=260`, présentes dans la sidebar, **0 overflow** sur les 3 pages. (#538)

### Changed
- **`bin/generate-nav-sections.js`** : `EXPECTED_COUNTS` recalibré (fondation 7→13, formulaires 9→15, navigation 5→8 ; total **93→108** sections) ; manifeste sidebar régénéré (+15 liens). (#538)
- **`entrypoint.sh`** : `VERSION` 2.71.1 → 2.71.2 (cohérence `/version.json` préprod).

### Note
- Débloque **#435** (password-toggle, PR #537) : sa section vitrine atterrissait dans la zone cassée de formulaires — désormais intégrable proprement.

## 2.71.1 — 2026-06-14 — Fix overflow horizontal 5 pages : `html{overflow-x:clip}` + confinements composants (#530)

### Fixed
- **`html { overflow-x: clip }`** dans `shared/css/base.css` — filet page qui neutralise les fuites d'éléments `position:absolute`/`transform` hors-écran (`.copy-tooltip`, `.header-notif-panel`/`.header-dropdown`, `.drawer-panel`) que `body{overflow-x:hidden}` ne rognait pas (propagation body→viewport). `clip` préserve `position:fixed`/`sticky` (header fixe + scroll vertical intacts). (#530)
- **`pre > code.typo-mono`** : `display:block; max-width:100%; overflow-x:auto` dans `shared/css/components/theming.css` — scroll interne du bloc de code au lieu d'étendre la page (page motion, mobile). (#530)
- **`.segmented`** : `max-width:100%; overflow-x:auto; scrollbar-width:none` dans `shared/css/components/interactive.css` — scroll interne du segmented control pill (`.segmented--lg` ≥338px ne tenait pas en <375px). (#530)
- **`.stepper`** : `max-width:100%; overflow-x:auto; scrollbar-width:none` dans `shared/css/components/navigation.css` — scroll interne du stepper horizontal (page navigation). (#530)
- **`.tabs`** : `max-width:100%; overflow-x:auto; scrollbar-width:none` dans `shared/css/components/navigation.css` — scrollable tabs mobile (pattern standard). (#530)
- **Résultat sweep** : 0 overflow sur 11 pages × 4 viewports (320/375/768/1280) — toutes les pages passent `documentElement.scrollWidth ≤ innerWidth + 2`. (#530)

## 2.71.0 — 2026-06-14 — Taxonomie dataviz : réordonnancement data.html en 5 familles + `.stat-value--sm` (#515)

### Added
- **`.stat-value--sm`** : variante de taille `font-size: 1.5rem` dans `shared/css/components/data.css` — ferme la dette A8 (remplace 3 styles inline `style="font-size:1.5rem"` dans `pages/templates.html`). (#515)

### Changed
- **`pages/data.html` — réordonnancement 15 sections en 5 familles** : Graphiques (`charts`, `pie-donut`) · Indicateurs chiffrés (`stats`, `animated-counters`) · Jauges & progression (`progress`, `progress-tracker`, `gauge`, `usage-meter`) · Tabulaire (`tables`, `comparison`, `data-grid`) · Listes & flux (`tree-view`, `lists`, `activity-feed`, `risk-matrix`). Markup interne de chaque section inchangé (non-breaking). (#515)
- **Notes « quand utiliser »** ajoutées dans `data.html` : (a) frontière `stats` / `animated-counters` (KPI statique vs animé) ; (b) famille Meter — 4 idiomes distincts (`progress-bar` / `progress-tracker` / `gauge` / `usage-meter`). (#515)
- **Sidebar « Data »** : réordonnée automatiquement via manifeste build (`bin/generate-nav-sections.js` relancé). (#515)
- **`pages/templates.html`** : 3× `style="font-size:1.5rem"` remplacés par `.stat-value--sm` (sprint board). (#515)
- **`docs/ARCHITECTURE.md`** : ligne `data.html` mise à jour (5 familles, ordre). (#515)
- **`CLAUDE.md`** : description `data.html` mise à jour. (#515)

## 2.70.0 — 2026-06-14 — Sidebar : manifeste de sections généré au BUILD, ZÉRO fetch runtime (#528)

### Fixed
- **Sidebar — sous-sections absentes sur préprod auth-gated** : `resolvePageSections()` résolvait les pages non-courantes via `fetch(p.path)` + DOMParser au runtime. Sur `design-system.miklaw.fr`, Authentik forward_auth répond HTTP 302 sur toute ressource → le fetch retombait sur la page login → 0 `.main > section[id]` trouvé → sous-liens absents. Fix : le manifeste `NAV_SECTIONS_MANIFEST` est généré au build par `bin/generate-nav-sections.js` (Playwright, sélecteur `.main > section[id]` exact direct-child) et inliné dans `shared/nav.js` entre marqueurs `AUTO-GENERATED`. Plus aucun `fetch` dans `resolvePageSections()` — immunisé auth-gate, cache navigateur, CSP, redirect cross-origin. (#528)
- **Sidebar — doublon « Getting Started »** : `getting-started` émettait 2 liens identiques (lien parent `page.label` + section `#overview` dont le `<h2>` vaut « Getting Started »). Règle : le lien parent est supprimé si la 1ère section porte le même label. Résultat : 95 → **94 liens** sidebar, 0 doublon. (#528)

### Changed
- **`bin/generate-nav-sections.js`** (nouveau, v1.0) : script de build dédié — scanne `.main > section[id]` (enfants directs, Playwright) + label `(.section-header h2)||h2||id` sur les 10 pages non-flat de `NAV_PAGES`. Produit `const NAV_SECTIONS_MANIFEST = {...}` et l'inline dans `shared/nav.js` entre marqueurs `AUTO-GENERATED NAV SECTIONS START/END`. Mode `--check` (CI bloquant) : régénère en mémoire et compare à l'inliné → exit 1 si divergence (le manifeste ne peut plus dériver). (#528)
- **`shared/nav.js` — `resolvePageSections()`** : suppression du `Promise.all`/fetch/DOMParser cross-page. Page courante : scan DOM live `extractSections(document)` (inchangé). Autres pages : lecture `NAV_SECTIONS_MANIFEST[p.path]` (fallback `[]` si absent, compatible consumers sans build). (#528)
- **CI `.github/workflows/ci.yml`** : step `Nav sections manifest validation (#528)` ajouté dans job `lint` (non `continue-on-error`). Précédé d'un `npm ci + npx playwright install chromium`. (#528)
- **`package.json`** : script `generate-nav-sections` ajouté (`node bin/generate-nav-sections.js`). (#528)
- **`docs/ARCHITECTURE.md`** : section Sidebar mise à jour (manifeste build, ZÉRO fetch, anti-dérive CI, 94 liens). (#528)
- **`CLAUDE.md`** : description nav.js mise à jour (manifeste inliné). (#528)

## 2.69.1 — 2026-06-14 — Fix overflow grilles `.demo-grid-*` : `minmax(0, 1fr)` (#529)

### Fixed
- **Overflow page `formulaires.html` (et toutes pages showcase)** : les pistes des grilles `.demo-grid-2/3/4/5` utilisaient `1fr` = `minmax(auto, 1fr)` dont le plancher `auto` = max-content d'un `.demo-box` contenant `.login-preview` (~441px) causait un débordement horizontal de +399px à 1280px et +90px à 375px. Remplacé par `minmax(0, 1fr)` dans les 4 déclarations `grid-template-columns` (base L127-130, media 1024 L552, media 768 L563, @container demo-grid L622). Ajout de `min-width: 0` sur `.demo-box` (renforcement défensif). (`shared/css/layout.css`, #529)
- **`.login-preview` — ceinture+bretelles** : ajout de `width: 100%; max-width: 100%` pour garantir la non-fuite si réutilisé hors grille. (`shared/css/components/forms.css`, #529)

## 2.69.0 — 2026-06-13 — Sidebar nav.js dynamique : 6 liens morts et 38 sections orphelines corrigés (#509)

### Fixed
- **Sidebar nav.js — 6 liens morts** : les ancres `composants#theme-switcher`, `composants#tooltip`, `composants#fab`, `composants#action-menu`, `navigation#segmented-control`, `navigation#pagination` ne correspondaient à aucune section sur la page ciblée (mauvais rangement page↔composant). La génération dynamique depuis le DOM réel corrige mécaniquement ces erreurs : chaque lien est forcément sur la bonne page. (#509)
- **Sidebar nav.js — 38 sections orphelines** : 38 des 108 sections existantes (`.main > section[id]`) étaient absentes de la navigation. Elles apparaissent désormais automatiquement. (#509)

### Changed
- **`shared/nav.js` — génération dynamique de la sidebar** (v2.69.0) : suppression du tableau `NAV_SECTIONS` hardcodé (~80 entrées) remplacé par un manifeste minimal `NAV_PAGES` (11 entrées, pages uniquement, zéro ancre) + scan DOM runtime. Nouvelles fonctions : `extractSections(doc)` (scan `.main > section[id]` + label `.section-header h2`), `resolvePageSections()` (page courante direct + fetch cross-page parallélisé pour le hub `site.html`), `buildSidebar()` async (chaîné `.finally()` avant `initScrollSpy`/`initLazyLoader`), `renderEmptySidebar()` (fallback consumer no-op). Non-breaking : consumer sans `.section-header h2` reçoit une sidebar vide propre, jamais un crash. (#509)
- **`docs/ARCHITECTURE.md`** : section Sidebar mise à jour (description génération dynamique, nouvelles fonctions). (#509)
- **`shared/CONSUMER_GUIDE.md`** : note comportement `ds-nav.js` sidebar dynamique pour les consumers Niveau C. (#509)

## 2.68.0 — 2026-06-13 — Parité React : champ registre + check CI + politique anti-dérive (#523)

### Added
- **Registre — champ `react`** (`ported`/`pending`/`n-a`) par composant dans `shared/components-registry.json` : rend l'écart CSS↔React auditable et traçable. 5 composants `ported` (Button, PageHeader, ThemeToggle, UserMenu, LoginScreen), ~73 `pending`, 23 modules `n-a`. (#523)
- **Check CI parité React** : `bin/generate-registry.js --check` valide que (a) toute classe émise par `packages/react/` existe dans le CSS du DS et (b) la cohérence du marquage `react: ported`. Écart global affiché dans les logs CI à chaque run (jamais silencieux). Autonome par rapport à #511 — greffé sur le validateur fantôme #516 (même step CI bloquant). (#523)
- **`docs/DS-PRINCIPLES.md` Section 8.1** : politique « gap tracé, PAS lockstep » tant qu'aucun consumer React n'a shippé en production ; bascule lockstep explicite dès le premier consumer. (#523)

### Changed
- **`bin/generate-registry.js` v1.1 → v1.2** : normalisation du champ `react` (règle de défaut : `kind:module` → `n-a` forcé, `kind:component` sans valeur → `pending`) ; parsing statique des `.tsx` React (ciblé `className=` uniquement, zéro dépendance) ; bloc parité checks (a)+(b)+réciproque ; écart global dans les deux rapports (mode écriture et mode `--check`). (#523)
- **CI `.github/workflows/ci.yml`** : step `lint` renommé « Registry validation — phantoms (#516) + React parity (#523) » — même commande, périmètre documenté élargi. (#523)
- **`docs/DS-PRINCIPLES.md` Section 8 › Registre** : ligne `react` ajoutée à la checklist anti-dette. (#523)
- **`CLAUDE.md`** : process ajout composant, étape Registre — déclarer le statut React. (#523)
- **`docs/ARCHITECTURE.md`** : description du registre et de `bin/generate-registry.js` mise à jour (champ `react`, check parité). (#523)

## 2.67.1 — 2026-06-13 — Correctif classes fantômes registre + validateur CI (#516)

### Fixed
- **Registre `components-registry.json`** : 9 entrées `kind:component` corrigées — classes `cssClasses` et snippets `example` alignés sur le CSS réel (`shared/css/components/*.css`) et les démos (`pages/*.html`). Composants corrigés : `code` (→ `.code-block`+`.kw/.str/.cm/.fn/.num`), `tag-input` (→ `.tag-item/.tag-close`), `breadcrumb` (→ `.breadcrumbs`+`.bc-sep`), `skeleton` (→ `.skeleton-avatar/.skeleton-title`), `accordion` (conteneur `.accordion` retiré), `stepper` (états sur `.step-dot.active/.completed/.pending`), `empty-state` (`h3`/`p` nus, pas de `-title/-description`), `filter-bar` (→ `.btn.btn-*` DS), `comments` (`.like-count` conservé — héritage intentionnel).

### Changed
- **`bin/generate-registry.js` v1.0 → v1.1** : validation anti-fantôme des `kind:component` ajoutée. Une classe est fantôme si absente du CSS **et** absente de la démo de la page **et** hors whitelist → `process.exit(1)` avant écriture. Flag `--check` disponible (valide sans écrire, utilisé dans le CI). Anti-faux-positifs : sélecteurs composés (`main .section-header .overline`) et classes démo-seules (`.like-count`) correctement tolérés.
- **CI `lint`** : nouveau step `Registry phantom-class validation (#516)` → `node bin/generate-registry.js --check` sans `continue-on-error`. Bloque le merge si un composant hand-written introduit une classe fantôme.

## 2.67.0 — 2026-06-13 — Remédiation dette audit adversarial 2026-06-13

> Issues M#37 (Distribution sync.sh), M#38 (Garde-fous CI), M#39 (Migration thèmes v2.39). Cf. `docs/audit-2026-06-13.md`.

### Added
- **Garde-fous CI** : `check-versions.sh` (cohérence des 8 marqueurs de version) + step CI `verify-versions` (#377) ; job CI `react` (vitest) (#378) ; `check-counters.sh` (hero/meta/footer vs registre).
- **Distribution `sync.sh`** : distribue désormais `themes.css`, `fonts.css` + `fonts/` (woff2), `icons/sprite.svg`, `brand.css` (mode core), `_responsive.css` (mode sélectif), et le Niveau C `nav.js`/`components.js`/`styles.css` (#367-373, #372).
- **Tokens** : `--status-{warn,error,info,success}-{fg,bg,border}` définis pour MSYX et Nhood (étaient ACSSI-only) (#391) ; `--deco-pink-rgb` (#394). Classes DS `.btn-icon-left/right`, `.user-menu-dropdown-role`, `.login-authentik-icon` (parité React) (#376).

### Fixed
- **a11y** : `.user-menu-dropdown` fermé n'est plus focusable (`visibility:hidden`) ; mapping `aria-checked` du mode-switch canonisé (true = dark) (#382).
- **Migration thèmes v2.39 finalisée** : blocs `[data-theme]` legacy supprimés de `tokens.css`, `themes.css` source unique, `--chevron-select` + tokens nhood-light portés en `themes/*.json` (#386-389) ; 0 token perdu (vérifié).
- `check-sync.sh` : `--check-overrides` (no-op) + DRIFT permanent corrigés (#373) ; `check-hardcoded-tokens.sh` élargi (utilities/layout + couleurs nommées) + violations corrigées (#379).
- **Registre** : `jsInit` erronés, pointeurs `page` (alert/modal/popover → feedback), séparation modules/composants (#381, #385) ; compteurs `site.html` resync (#380).
- `.card-icon--deco-*` : RGB MSYX en dur → `var(--deco-*-rgb)` theme-aware (#394) ; `themes/msyx.json` valeurs a11y-KO corrigées (#390).

### Changed
- **Docs** : `ARCHITECTURE.md` à jour ; process source unique (emplacement CSS, 5 fichiers, 6 combos) ; règle px recalibrée dans `DS-PRINCIPLES.md` (#383, #384, #393).
- Collision `.theme-toggle` / `.mode-switch` documentée : `.mode-switch` canonique (#392).

## 2.66.0 — 2026-06-03 — Socle global distribué aux consumers (base.css) — acssi-core#592

### Added
- `shared/css/base.css` : socle global (reset, focus accessible, `html`, `body`, `body::after` texture grain) extrait de `styles.css`, **désormais distribué aux consumers** via `sync.sh` (→ `ds-base.css`).

### Fixed
- Le socle (`body` enrichi + overlay texture grain `--texture-grain`) n'était jamais synchronisé vers les consumers : `styles.css` le contenait inline mais `sync.sh` ne copiait que tokens/utilities/layout/components. Les consumers recréaient un `body` appauvri (rendu « plat », sans texture). acssi-core#592.
- `body` du socle : `font-family: 'Inter'` (literal) → `var(--font-sans)` (tokens-first, compatible next/font des consumers).

### Changed
- `styles.css` : bloc « BASE RESET » inline extrait vers `css/base.css` puis ré-importé (showcase inchangé, source unique du socle).

## 2.65.2 — 2026-06-01 — Tokens fantômes corrigés (#582)
- Définit `--surface-2` (alias `--surface-alt`) et `--skeleton-base` (alias `--surface-light`) — référencés par `pricing.css`/`modals.css`/`feedback.css` mais jamais définis → fantômes dans tous les consumers.
- Ajoute `@keyframes skeleton-shimmer` (absent) — `.skeleton-cell/-label/-field` étaient figés.

## [2.65.1] — 2026-05-29 — Fix CSS barrel

### Fixed
- Barrel CSS `components.css` : `@import url(...)` → forme string (`@import "..."`) — compatibilité consumers (#358, PR #359).
- Bump synchrone `@ds-version` complété sur `shared/nav.js` (oublié lors du bump initial 2.65.1).

## [2.65.0] — 2026-05-27 — CLÔTURE EPIC #344 ✦ WCAG AA atteint

### Résumé Epic — De 143 violations à 0 `aria-prohibited-attr`

Cette version marque la **clôture de l'Epic #344** (Sprint 36 a11y résiduel cleanup) et la finalisation du chantier WCAG AA ouvert en Sprint 33.

**Bilan cumulé Epic #337 + #344 (8 PRs, Sprints 33–36)** :

| Métrique | Départ (pré-#337) | Arrivée (v2.65.0) | Gain |
|---|---|---|---|
| Violations totales | ~143 | **17** (color-contrast démo) | **-88%** |
| `aria-prohibited-attr` | 60 | **0** | **-100%** ✅ |
| `label` critical | 54 | **0** | **-100%** ✅ |
| `aria-required-children` critical | 6 | **0** | **-100%** ✅ |
| `scrollable-region` | 12 | **0** | **-100%** ✅ |
| `color-contrast` nœuds | 871 | ~413 | -53% |

Les 17 violations résiduelles sont des cas `color-contrast` sur tokens démo showcase (badges en mode light, tokens décoratifs `--deco-*`) — documentés, non bloquants, hors périmètre des composants distribués en production.

### Fixed

- **`shared/components.js` `buildDonutChart()`** : ajout `role="img"` sur les `<circle>` SVG avant `aria-label` — miroir exact du fix `buildPieChart()` appliqué en Lot 1 (#338 v2.62.0).
  - Cause : `aria-label` est interdit sur `<circle>` SVG sans rôle explicite (règle WAI-ARIA `aria-prohibited-attr`).
  - Impact : 60 nœuds `aria-prohibited-attr` serious sur 6 runs (page `data`, 6 combos thème/mode) → **0**.
  - Cohérence : `buildPieChart()` et `buildDonutChart()` ont désormais le même pattern a11y.

### Changed

- `@ds-version` bumpé à `2.65.0` dans 5 fichiers + `const VERSION` + `package.json` + `shared/components-registry.json`.
- `docs/audit-a11y-2026-05-27-post-349.md` : rapport post-fix avec bilan Epic complet.

### Refs

- Issue #349 (Sub-E Sprint 36 — `aria-prohibited-attr` résiduel, clôture Epic #344)
- Epic parent #344 (Sprint 36 a11y résiduel)
- Epic ancêtre #337 (Sprint 33–35 chantier WCAG AA)
- Spec figée : https://github.com/msyx-dev/design-system-project/issues/349#issuecomment-4550618918

---

## [2.64.9] — 2026-05-27

### Changed
- **a11y** — Sub-D Sprint 36 : 9 inputs de `pages/formulaires.html` (date pickers + sliders range + number inputs jumelés) reçoivent désormais une étiquette accessible (Option A `<label for>`/`id` × 7, Option B `aria-label` × 2) conformément à `docs/DS-PRINCIPLES.md` §3.1.
- Résout 54 nœuds critical `label` (6 runs × 9 nœuds) — règle WCAG SC 3.3.2 « Labels or Instructions ».

### Refs
- Issue #348 — Sprint 36 a11y résiduel cleanup
- Epic parent #344
- Convention §3.1 figée par Lot 3 #340 (v2.64.5)

---

## v2.64.8 — 2026-05-27

**Fix a11y Sub-C : aria-required-children critical (6 nœuds résorbés)** (#347, Epic #344 Sprint 36)

### Fixed
- `shared/components.js` `initUserMenu()` : restructuration de l'arbre ARIA du `.user-menu-dropdown[role="menu"]` pour respecter la règle WAI-ARIA `aria-required-children`.
  - Ajout `role="presentation" aria-hidden="true"` sur `.user-menu-dropdown-header` — `role="presentation"` neutralise le rôle structurel du wrapper ; `aria-hidden="true"` empêche axe-core de traverser le sous-arbre (img avatar avec `alt` non-vide = `role="img"` implicite, non autorisé comme owned child de `role="menu"`).
  - Sortie du `<button role="menuitem">Déconnexion</button>` hors du `<form class="user-menu-logout-form">` via attribut HTML5 `form="user-menu-logout-form"` — le form reste fonctionnel (POST) avec `role="presentation"`, mais ne masque plus le menuitem comme un faux-enfant du `role="menu"`.
  - Impact : `menu` expose désormais 2 enfants `menuitem` directs (Mon compte + Déconnexion) + 1 `separator` autorisé. 6 nœuds critical résorbés sur les 6 runs audités (page navigation, 6 combos thème/mode).
- Pas de régression VR (CSS stylé par classes, pas par rôles ARIA).
- Pas de régression fonctionnelle (navigation clavier intacte, submit logout préservé).

---

## v2.64.7 — 2026-05-27

**Fix a11y Sub-B : scrollable-region-focusable résiduel (12 nœuds résorbés)** (#346, Epic #344 Sprint 36)

### Fixed
- `pages/feedback.html` : ajout `tabindex="0"` sur `#bs-panel-2 > .bottom-sheet-content` (cohérence avec bs-panel-1 et bs-panel-3 de la même page — 6 nœuds).
- `shared/components.js` `initCopyButtons()` : ajout automatique `tabindex="0"` sur tous les `.code-block` traités (6 nœuds sur `navigation.html`, prévention régression sur autres pages utilisant `.code-block`). Garde `!block.hasAttribute('tabindex')` — idempotent.

---

## v2.64.6 — 2026-05-27

**Fix a11y Sub-A : color-contrast résiduel (~458 nœuds résorbés)** (#345, Epic #344 Sprint 36)

### Fixed
- `shared/css/tokens.css` : recalibrage des tokens `color-contrast` résiduels non couverts par Lot 2 S35 (#339 v2.64.4) — 14 fixes ciblés selon spec :
  - **F1 `--text-dim` msyx-dark** sur surface card — recalibré pour WCAG AA `.theme-card--future`, `.cal-day.other-month`.
  - **F2-F3 `--code-string` / `--code-number` light mode** — chaîne syntax highlighting tokens recalibrée pour `.str:nth-child(*)` (~111 nœuds msyx-light).
  - **F4-F7 `--success-light` / `--warning-light` / `--danger-light` / `--info-light` ACSSI+Nhood light** — recalibrage cascade au-delà de Fix C Lot 2 (#339, MSYX) pour atteindre AA dans les 3 thèmes light × badges/alertes.
  - **F8 `--deco-cyan` light** — token décoratif recalibré pour avatars colorés sur fond clair.
- `shared/css/components/access-denied.css` : `.access-denied-code` passe `--danger` → `--danger-light` (large-only justifié).
- `shared/css/components/forms.css` : `.input-error-msg` / `.login-error` passent `--danger` → `--danger-light`.
- `shared/css/components/interactive.css` : `.dtree-choice` passe `--accent` → `--accent-light` (lisibilité hover).
- `shared/css/components/templates.css` : `.fab-extended` recalibré (cible WCAG 1.4.11 large text 3:1).
- `shared/css/components/theming.css`, `tracker.css` : `.theme-card--future`, `.cal-day.other-month` — retrait opacity excessive qui cassait le contraste.
- `pages/composants.html`, `pages/feedback.html`, `pages/fondation.html`, `pages/templates.html` : retrait styles inline `style="color:var(--accent)"` + remplacement hex avatars custom par tokens `--deco-violet`/`--deco-cyan`.
- `themes/acssi.json` + `themes/nhood.json` : recalibrage des 4 tokens `--*-light` ACSSI+Nhood (Fix F4-F7). `shared/css/themes.css` régénéré via `node shared/build-themes.js`.

### Changed
- `@ds-version` bumpé à `2.64.6` dans 5 fichiers (tokens, utilities, components, layout, nav.js) + `const VERSION` synchrone dans nav.js + `package.json` + `shared/components-registry.json`.
- `docs/audit-a11y-2026-05-26.md` régénéré post-fix.

### Bilan a11y (rapport post-#345 vs post-S35)
| Métrique | Post-S35 (2026-05-25) | Post-#345 (2026-05-26) | Δ |
|---|---|---|---|
| Violations totales | 78 | 75 | -3 |
| Nœuds HTML impactés | 1003 | **545** | **-46%** |
| color-contrast nœuds | 871 | 413 | -53% |

### Notes consumers
- Bumps tokens `--*-light` ACSSI/Nhood : badges/alertes light text plus foncés et plus saturés. Aucune cassure layout. Aligne ACSSI/Nhood sur le pattern MSYX déjà appliqué en v2.64.4.
- Drift visuel modéré sur `--deco-cyan` light (avatars colorés). Vérifier consumer si custom theming des `.deco-*` tokens.
- Cf. Epic #344 (Sprint 36 cleanup résiduel — 4 sub-issues restantes B/C/D/E pour atteindre <10 violations).

## v2.64.5 — 2026-05-26

**Fix a11y Lot 3 : labels forms + scrollable-region (~300 nœuds résolus)** (#340, Epic #337 clôture)

### Fixed
- `pages/formulaires.html` : 3× `for/id` sur labels existants (.input-error/.input-success/.input-disabled) + 3× `aria-label` sur toggle inputs (Mode sombre, Notifications, Auto-deploy).
- `pages/templates.html` : 2× `aria-label` sur settings-row-input (Nom d'affichage, Email) + 4× `aria-label` sur toggle inputs settings (Notifications email/push, Resume hebdomadaire, Reduire animations) + 2× `tabindex="0"` sur `.kanban-board` et `.roadmap-container` (accès clavier WCAG 2.1.1).
- `pages/feedback.html` : 1× `for/id` sur input recap wizard (Nom) + 2× `tabindex="0"` sur `.bottom-sheet-content` (bs-panel-1 info, bs-panel-3 formulaire).
- `pages/data.html` : 1× `aria-label` sur `.data-grid-select-all` (remplace `title` ignoré par axe) + 4× `aria-label` sur `.data-grid-filter` (Filtrer par composant/categorie/statut/sprint).
- `shared/components.js` `initDataGrids.renderRows()` : ajout `aria-label="Selectionner {composant}"` dynamique sur checkboxes générées (24 nœuds runs résolus).

### Changed
- `docs/DS-PRINCIPLES.md` §3.1 : capitalisation guideline **Label vs aria-label** — règle de décision par zone (6 cas typiques + 2 anti-patterns).
- `@ds-version` bumpé à `2.64.5` dans 5 fichiers (tokens, utilities, components, layout, nav.js) + `const VERSION` synchrone dans nav.js + `package.json` + `shared/components-registry.json`.

### Notes consumers
- Aucune action requise — fixes purement ARIA + tabindex, aucun changement visuel ni cassure CSS/JS API.
- Clôture **Epic #337** (Dette a11y WCAG AA) : 141 → cible < 10 violations restantes (vérification post-merge via re-run `pnpm run test:a11y`).

## v2.64.4 — 2026-05-25

**Fix a11y Lot 2 : color-contrast tokens (~1900 nœuds résolus)** (#339, Epic #337)

### Fixed
- `shared/css/tokens.css` : recalibrage 4 chaînes de tokens en violation WCAG AA `color-contrast` (rapport `docs/audit-a11y-2026-05-15.md`).
  - **Fix A** — `--code-comment` MSYX dark : `#475569` (2.52, KO) → `#94a3b8` (7.45, AA) sur `#0a0f1e`. MSYX light : `#94a3b8` (2.45, KO) → `#475569` (7.24, AA) sur `#f8fafc`. (~600 nœuds `.code-block .cm`).
  - **Fix B** — `--accent-light` en `[data-mode="light"]` MSYX : `#60a5fa` (2.43, KO) → `#2563eb` (5.17, AA) sur `#f8fafc`. Nhood light : `#008837` (4.38, LARGE-only) → `#006e2c` (4.50, AA). (~900 nœuds : overline, tag, badge-primary, chip-filter.active, sidebar-link.active, etc.).
  - **Fix C** — Tokens sémantiques light en `[data-mode="light"]` MSYX (badges/alertes sur fond clair) : `--success-light` `#4ade80` (1.52) → `#15803d` (5.64, AA) ; `--warning-light` `#fbbf24` (1.44) → `#c2410c` (4.72, AA) ; `--danger-light` `#f87171` (2.36) → `#dc2626` (5.91, AA) ; `--info-light` `#22d3ee` (1.56) → `#0369a1` (4.87, AA). (~250 nœuds `.badge-{variant}`, `.alert-{variant}`).
  - **Fix E** — `--text-dim` Nhood light : `#5a8a68` (3.81, LARGE-only) → `#4a7a58` (4.51, AA) sur `#f9fafb`. (~30 nœuds `.header-version`, `.cal-day.other-month`).
- `themes/acssi.json` + `themes/nhood.json` : recalibrage `--code-comment` (Fix A) — ACSSI dark `#5a7a96` → `#a8bdd2` (6.57, AA) ; ACSSI light `#5a7a90` → `#4a6a84` (5.15, AA) ; Nhood dark `#4a7a56` → `#7daa8a` (6.84, AA) ; Nhood light `#5a7a90` → `#4a6a80` (5.46, AA). `shared/css/themes.css` régénéré via `node shared/build-themes.js` (AC6).
- `shared/css/components/navigation.css` : `.bottom-nav-item.active` passe de `var(--accent)` à `var(--accent-light)` — Fix D, améliore contraste sur surface sombre (~120 nœuds).
- `pages/formulaires.html` : retrait de l'attribut `style="color:var(--accent);"` sur le lien "Se connecter" du formulaire d'inscription — inherit couleur standard DS conforme (5 nœuds).

### Changed
- `@ds-version` bumpé à `2.64.4` dans 5 fichiers (tokens, utilities, components, layout, nav.js) + `package.json` + `shared/components-registry.json`.
- Baselines VR : option B (régénération différée via CI post-merge) — la régénération locale via Playwright n'est pas exécutée dans le worktree (option A dépriorisée pour budget temps). Les diffs attendus sont textes secondaires plus foncés/saturés en light (overline, code-comment, badges, header-version).

### Notes consumers
- **Action recommandée** : bumper le consumer vers v2.64.4. Aucune cassure d'API CSS/JS.
- **Drift visuel MSYX light** : `--accent-light` passe de bleu clair `#60a5fa` à bleu foncé `#2563eb` — overline, tags, sidebar-link.active et badge-primary sont visiblement plus sombres/saturés. Pour restaurer l'ancien teint : surcharger `--accent-light: #60a5fa;` sous `[data-mode="light"]` dans le consumer (non recommandé).
- **Drift visuel badges light** : les couleurs de texte `badge-success/warning/danger/info` passent de tons clairs (verts/oranges/rouges pastels) à tons foncés (conformes WCAG AA). Aucune cassure layout.
- Cf. Epic #337 et `docs/audit-a11y-2026-05-15.md` pour contexte WCAG AA.

## v2.64.3 — 2026-05-25

**Fix a11y Lot 1 : 4 règles WCAG AA quick wins (~210 nœuds résolus)** (#338, Epic #337)

### Fixed
- `pages/feedback.html` : ajout `aria-label="Plus d'infos"` sur `.btn-icon` popover (1× `button-name`).
- `pages/composants.html`, `pages/formulaires.html`, `pages/templates.html`, `pages/feedback.html` : 6 sélects sans accessible-name → `aria-label` ou wrapper `<label for>` (fix les 42 nœuds `select-name`).
- `shared/components.js` `initRating` : ajout `aria-checked="true|false"` sync sur stars `role="radio"` du rating interactif (fix `aria-required-attr` — 60 nœuds).
- `pages/motion.html` (6× `.motion-stage`), `pages/composants.html` (1× `.rating--readonly`), `shared/components.js` `buildPieChart` (15 path SVG) : ajout `role="img"` pour légitimer `aria-label` (fix `aria-prohibited-attr` — 102 nœuds).

### Changed
- `@ds-version` bumpé à `2.64.3` dans 5 fichiers (tokens, utilities, components, layout, nav.js) + `package.json` + `shared/components-registry.json`.

### Notes consumers
- Aucune action requise — fixes purement ARIA, aucun changement visuel ni cassure CSS/JS API.
- Cf. Epic #337 pour le contexte WCAG AA (audit `docs/audit-a11y-2026-05-15.md`).

## v2.64.2 — 2026-05-25

**Promotion des modificateurs chips (taille + couleur) et du layout Kanban-page dans le DS distribue** (#274)

### Added
- `shared/css/components/badges.css` : 5 modificateurs chips — `.chip-sm` (taille compacte), `.chip-accent`, `.chip-warning`, `.chip-success`, `.chip-danger` (variantes semantiques alignees sur le pattern `--{token} 12% bg / 25% border / -light text`).
- `shared/css/components/templates.css` : 7 classes layout Kanban-page — `.kanban-page`, `.kanban-topbar`, `.kanban-content`, `.kanban-meta`, `.kanban-columns` (grid 4 cols responsive), `.kanban-column-name`, `.kanban-card-chips` + breakpoint mobile-first 768px (1 colonne sous 768px).
- `shared/components-registry.json` : entrees `chips` et `templates` enrichies automatiquement par `bin/generate-registry.js`.

### Changed
- `canonical-pages/dashboard-kanban.html` : refacto du `<style>` inline — suppression des 9 definitions desormais distribuees, conservation uniquement des 5 classes demo-specifiques (`.kanban-topbar-title`, `.kanban-page-title`, `.kanban-card-assignees`, `.kanban-add-col`).
- `@ds-version` bumpe a `2.64.2` dans 7 fichiers (tokens, utilities, components, layout, nav.js, badges, templates) + `package.json`.

### Fixed
- #274 : `aksy` (#500 Vue Backlog Kanban) peut retirer sa DS-EXCEPTION sur `.chip-sm` / `.chip-{variant}` et utiliser le DS canonique (PR suiveuse cote aksy hors scope de cette release).
- Coherence : le champ `example` du composant `chips` dans le registry (qui referencait `chip-accent`, `chip-warning`, `chip-success` orphelins depuis plusieurs versions) est desormais aligne avec les selecteurs CSS distribues.

## v2.64.1 — 2026-05-25

**Distribution complète des classes typo + création `.modal-title`** (#273)

### Changed
- `shared/css/components/theming.css` : les classes `.typo-h1`, `.typo-h2`, `.typo-h3`, `.typo-body`, `.typo-overline` ont été **déplacées vers `shared/css/utilities.css`**. Définitions strictement identiques (mêmes tokens, mêmes propriétés) — aucun changement visuel. Motivation : les rendre disponibles aux consumers en mode `sync.sh --components=core` (le barrel core n'inclut pas `theming.css`) et aux consumers qui n'importent que `ds-utilities.css` sans `ds-components.css`. Cf. AKSY #501.
- `shared/css/components/theming.css` : conservent leur place `.typo-display`, `.typo-h4`, `.typo-small`, `.typo-xs`, `.typo-mono` (non listées dans #273, valeurs littérales hors échelle modulaire pour certaines).

### Added
- `shared/css/components/modals.css` : nouvelle classe `.modal-title` — équivalent sémantique `.typo-h3` + `color: var(--text)` + marge-bottom rythmée (`var(--space-xs)`), pour titrer modales et dialogs sans imposer un tag HTML spécifique (compatible WAI APG `aria-labelledby`).
- `shared/components-registry.json` : entrées `.typo-h1/h2/h3/body/overline` migrées sous component `utilities` ; nouvelle entrée `.modal-title` sous component `modals`.

### Notes consumers
- AKSY (#501) peut retirer ses overrides DS-EXCEPTION pour `.typo-*` et `.modal-title` après bump du consumer vers v2.64.1.
- Aucune action requise pour les consumers qui importent déjà `ds-utilities.css` + `ds-components.css` en mode default — le rendu visuel est strictement identique.

## v2.64.0 — 2026-05-25

**Refacto tokens hardcodes : 77 occurrences remplacees par var() dans shared/css/components/ + lint CI bloquant** (#279)

### Changed
- 17 fichiers `shared/css/components/*.css` : remplacement de 52 font-family literals (`'Space Grotesk'`, `'Fira Code'`, `'Inter'`) par les tokens canoniques `var(--font-display)`, `var(--font-sans)`, `var(--font-mono)`.
- `shared/css/components/buttons.css` : 3 `rgba(255,255,255,X)` glassmorphism remplacees par tokens `--overlay-white-*`.
- `shared/css/components/media.css` : 8 `rgba(0,0,0,X)` + 1 `rgba(255,255,255,0.45)` + `color: #fff` remplacees par tokens `--overlay-black-*` et `--overlay-text`.
- `shared/css/components/modals.css` : 2 `rgba(0,0,0,X)` remplacees par `--overlay-black-60` + `--overlay-black-50`.
- `shared/css/components/data.css` : `rgba(255,255,255,0.1)` stripes et `color: #1a1a1a` remplacees par `--overlay-black-stripes` et `--btn-on-warning`.
- `shared/css/components/badges.css` : `#cd7f32`, `#c0c0c0`, `#ffd700` remplacees par tokens `--achievement-bronze/silver/gold`.
- `shared/css/components/forms.css` : `background: #ffffff` (knob ACSSI) → `--overlay-text`; 2 `rgba()` providers → `rgba(var(--brand-google-rgb), 0.5)` et `rgba(var(--brand-microsoft-rgb), 0.5)`.
- `shared/css/components/overlays.css` : `background: #fff` action-menu light → `--surface-solid`.
- `shared/css/components/interactive.css` : `background: #fff` → `--surface-solid`.
- `shared/css/components/navigation.css` : `rgba(0,0,0,0.35)` box-shadow → `--overlay-black-35`.
- `@ds-version` bumpe a `2.64.0` dans 22 fichiers (19 composants + utilities + components + layout + nav.js).

### Added
- `shared/css/tokens.css` : 18 nouveaux tokens non-thematiques (`--overlay-white-*`, `--overlay-black-*`, `--overlay-black-stripes`, `--achievement-bronze/silver/gold`, `--brand-google[-rgb]`, `--brand-microsoft[-rgb]`) — cf. DS-PRINCIPLES §1 exception couleurs de marque tierces.
- `shared/check-hardcoded-tokens.sh` : script lint bloquant (exit 1 si findings > 0). 3 checks : font-family literals, hex hardcodes, rgba numeriques. Whitelist : fallbacks `var(--token, #xxx)` + commentaires.
- `tests/test-check-hardcoded-tokens.sh` : 3 tests (Run A repo propre = exit 0, Run B fixture contient patterns interdits, Run C script detecte fixture sale = exit 1).
- `tests/fixtures/bad-hardcoded-tokens.css` : fixture avec font-family literal + hex actif + rgba pour Run B/C.
- `.github/workflows/ci.yml` : 2 nouvelles etapes dans le job `lint` — `Check hardcoded tokens` + `Run hardcoded tokens script tests` (bloquantes).

### Fixed
- #279 : dette technique 77 occurrences de valeurs hardcodees eliminee de `shared/css/components/`.
- Regression future prevenue par CI lint bloquant sur tout nouveau token hardcode.

## v2.63.0 — 2026-05-25

**Ajout assets marque ACSSI (wordmark, mark, dark, light)** (#280)

> Note : version pre-allouee sprint S17 — contenu dans le commit #331.

## v2.62.0 — 2026-05-21

**Composant a11y `.skip-to-content` (WCAG 2.4.1)** (#281)

### Added
- `shared/css/components/_a11y.css` : classes `.skip-to-content` + `:focus-visible` — skip link visible au focus clavier, généralisable à tous les consumers (remplace les implémentations locales type AKSY).
- `shared/components-registry.json` : entrée `.skip-to-content` (catégorie a11y).
- `shared/CONSUMER_GUIDE.md` : section « Accessibilité — Skip link WCAG 2.4.1 ».

### Fixed
- `shared/check-diacritics.sh` : retrait du faux positif `\bcharge\b` (« charge » est un nom commun français légitime) qui bloquait la CI `lint` (#300).

### Changed
- 4 workflows CI restants (`ci`, `a11y`, `perf`, `visual`) migrés Node 24 / `checkout@v5` / `setup-node@v5` avant EOL Node 20 du 2026-06-02 (#317).

## v2.57.1 — 2026-05-16

**Prep migration M3 — endpoints /health.json + /version.json** (#293, claude-config#109)

### Added
- `health.json` à la racine : `{"status":"ok"}` (conforme spec `~/projects/_global/docs/conventions/health-version.md`)
- `version.json` à la racine : `{"version":"2.57.1"}` (sans `sha`/`built_at` car projet statique sans pipeline build)

### Changed
- `package.json` : bump `2.56.1` → `2.57.1` (feat infra, pas un nouveau composant DS)

### Notes
- Caddyfile **non touché** en Phase 1 — Phase 2 du runbook M3 ajoutera `handle /health.json` + `handle /version.json` avant le rewrite `* /site.html`.
- Migration M3 design-system : pattern Authentik Provider Proxy mode `forward_single` (vs OIDC code-side impossible pour statique pur). Provider créés via blueprint `authentik#17`.

> **Note historique (refacto #314, 2026-05-25)** : les versions v2.57.2, v2.57.3, v2.57.4 et v2.57.5 étaient consacrées au package npm `@msyx-dev/react` (Button, UserMenu, LoginScreen, CI publish). Suite à la convention « RELEASES.md par package », ces entrées ont été déplacées dans `packages/react/RELEASES.md`. La numérotation racine saute donc de v2.57.1 à v2.57.0.

## v2.57.0 — 2026-05-14

**LoginScreen DS msyx** (#285, Epic Fondation auth) — pattern d'écran de connexion standardisé, centré Authentik (ADR-016).

### Added
- **LoginScreen** : bouton Authentik primary (`.login-authentik-btn`, gradient + liseré couleur de marque), slots providers externes présentationnels (`.login-provider-btn` + modifiers `--google` / `--apple` / `--microsoft` / `--github`), conteneur `.login-providers`, fallback form local.
- **3 variants** `.login-card--*` : `internal-only` (apps internes msyx), `public-multi-providers` (apps publiques), `internal-with-fallback` (préprod/staging) — démo-és dans `pages/formulaires.html` section `#login`.
- **5 tokens** `--login-*` dans `tokens.css` (`--login-provider-bg/-hover/-border`, `--login-authentik-accent` + `-rgb`).
- Symbols SVG providers réutilisables (`#provider-authentik|google|apple|microsoft|github`) dans `formulaires.html`.
- Entrée `login-screen` dans `components-registry.json` (avec exemple d'intégration).

### Changed
- `forms.css` section `LOGIN FORM` : corrections de dette tokens (radius `10px`/`8px`/`12px` → `--radius-sm`/`--radius-md`, `font-family` littérales → `--font-display`/`--font-sans`).
- `.login-social-btn` devient un **alias legacy** de `.login-provider-btn` (règle partagée — aucun consumer existant cassé).
- `formulaires.html` : inline styles supprimés de la démo « boutons sociaux » (`.login-providers` remplace `style="display:flex…"`), `<svg>` brand factorisés en `<symbol>`.

### Hors scope (cadrage groom)
- Le retrofit des pages auth-gate existantes (`index.html`, cas Coolify) relève de tickets consumers séparés — le DS fournit le composant + la démo + l'exemple d'intégration.

---

## Sprint 32 — v2.56.0 — 2026-05-10

**Sprint Brand + Polish theming** : 3 PRs livrées (11 SP, 100% vélocité, **32e sprint consécutif à 100%**). Issues remontées en revue post-S31 par Mike :
- **#266 v2.54.11** — Polish boutons `.btn-danger`/`.btn-success`/`.btn-warning` theme-aware (Option C hybride : tokens fg dédiés + shadow alpha modulable + border subtil) — 3 SP
- **#265 v2.55.0** — Mode toggle : 2 boutons sun/moon → 1 switch iOS-style (`role="switch"`, animation slide, Lucide sprite, WCAG 2.5.5 ≥ 44×44) — 3 SP
- **#268 v2.56.0** — Brand identity : wordmark `design-system` en header + mark `DS` 72px login, nouveau module `brand.css`, section fondation `#brand` — 5 SP

**Pré-allocation versions** : 13e application consécutive S17→S32, 0 conflit subagent — tous gérés par parent en rebase chain. **Arbitrage upfront Mike** (3e application du pattern S23 #192) appliqué sur #268 brand identity.

**Anomalies subagents lot 1** (2/2 récidive S24 #209 + S25 #218) : subagents `/dev` ont fini code + quality gate PASS mais ont oublié `git push` + `gh pr create` → mitigation parent (~5 min/PR : push + create PR manuel). **Anomaly warning explicite injecté dans lot 2** → #268 a respecté push-and-return (1/1 succès, 120 tool_uses RESULT propre).

**Friction rebase chain S32** : `--theirs` aveugle sur 7 fichiers a écrasé les modifs cross-PR sur `nav.js` (mode-switch perdu), `layout.css` (styles mode-switch perdus), `components-registry.json` (entrées brand-* perdues + classes mode-switch supprimées du theme-switcher). Mitigation parent : merge intelligent fichier par fichier (~15 min). **Capit S32 à hisser claude-config** : la rebase chain doit distinguer fichiers de version pure (bump seul, `--theirs` OK) des fichiers logique (modifs croisées, merge manuel ou cherry-pick).

**Tension #247 ↔ #268 arbitrée** : pas de fusion. #247 (vrai SVG MSYX fidèle) reste close — hotfix PNG considéré acceptable durablement comme marque maison-mère discrète. Si besoin perf SVG plus tard : ticket Quick séparé S33+.

---

## v2.56.1 — 2026-05-14

### Fixed
- **#286 — Harness VR/a11y testait `index.html` au lieu des 9 pages**. Le flag
  `-s` (`--single`) de `serve` forçait un fallback SPA vers `index.html` pour
  toute route `/pages/*.html` ; et `serve` v14 s'est avéré instable sous la
  sollicitation concurrente de Playwright. Les 108 baselines VR et le rapport a11y
  « 0 violation » étaient des faux. Corrections : passage du serveur statique
  de test à `http-server` (`serve` + `serve.json` retirés) dans les 2 configs
  Playwright, `reuseExistingServer: false` (plus de réutilisation d'un serveur
  fantôme), capture VR par `<section>` (`fullPage` retiré — hauteur non
  déterministe sur pages longues), `testMatch` restreint sur `playwright.config.ts`
  (a11y.spec.ts ne tourne plus sous `test:visual`), garde-fou `<title>`
  anti-régression dans les 3 specs. Baselines VR (1032, par section) et rapport
  a11y régénérés sur le vrai contenu — révèle 141 violations a11y réelles
  jusque-là masquées (tickets de suivi séparés).

---

## v2.56.0 — 2026-05-10

### Added
- **#268 — Brand identity : wordmark `design-system` + mark `DS` propre au design-system**. Restaure une identité visuelle distincte du DS (vs pictogramme MSYX maison-mère qui reste en marque discrète à gauche). 3 livrables :
  - **Header global** (`shared/nav.js`) : wordmark texte `design-system` Space Grotesk 600 18px gradient charte (turquoise→vert→bleu→violet) ajouté à côté du pictogramme MSYX 40×40. `aria-label="design-system — Accueil"` sur le lien `header-logo`, `alt=""` + `aria-hidden="true"` sur le pictogramme (décoratif, le wordmark texte porte l'identité).
  - **Page login** (`index.html`) : remplacement du `<img logoMSYX.png 48×48>` par un mark `DS` 72px Space Grotesk 700 gradient charte. Le DS devient l'identité principale de la page d'auth.
  - **Documentation** (`pages/fondation.html#brand`) : nouvelle sous-section "Brand identity" qui formalise les 3 niveaux (pictogramme MSYX = maison-mère discret, wordmark = identité projet DS, mark DS = forme courte pour contextes restreints).
- **Nouveau module CSS** `shared/css/components/brand.css` (27e module). Classes `.brand-wordmark`, `.brand-mark-ds` (+ variantes `--sm` 32px / `--lg` 96px). Gradient text via `background-clip: text` + fallback `color: var(--accent)` pour navigateurs sans support. Mobile < 640px : wordmark masqué via `@media`, pictogramme + version conservés.

### Changed
- `pages/formulaires.html` : résidu historique `<div class="login-logo">DS</div>` cohérent avec la nouvelle `.brand-mark-ds`.
- `components-registry.json` : entrée historique `brand-wordmark` (SVG logos S23) renommée `brand-logo-svg` pour éviter la collision avec la nouvelle `brand-wordmark` (texte). 2 nouvelles entrées : `brand-wordmark` (texte) + `brand-mark-ds`.

### Notes
- Arbitrage upfront Mike (pattern S23 #192, décision permanente 2026-05-10) : les 3 éléments coexistent — pas de fusion, pas de remplacement. Le pictogramme MSYX reste pour signaler l'appartenance à l'écosystème msyx.fr.
- Issue #247 (vrai SVG MSYX fidèle) reste close — le PNG est acceptable durablement comme marque discrète. Si besoin de perf SVG vectoriel : ticket Quick séparé S33+.

---

## [v2.55.0] — 2026-05-10

### Changed
- **#265 — Mode toggle : 2 boutons sun/moon → 1 switch iOS-style** (`role="switch"`, `aria-checked`, animation slide, icônes Lucide `i-sun`/`i-moon`, tactile WCAG 2.5.5 >= 44x44px). Showcase ajouté dans `pages/fondation.html` section Theme Switcher. Renommage interne `updateModeButtons` → `updateModeSwitch`. Closes #265.

---

## v2.54.11 — 2026-05-10

### Changed
- **#266 — Polish `.btn-danger`/`.btn-success`/`.btn-warning` theme-aware (Option C hybride)**. Tokens foreground dédiés (`--btn-on-danger`, `--btn-on-success`, `--btn-on-warning`) calibrés WCAG AA par combo thème × mode, shadow alpha modulable (`--btn-shadow-alpha` : 35% dark, 22% light), border subtil `rgba(255,255,255,0.06)` sur le shell. Adresse l'intégration visuelle insuffisante aux thèmes ACSSI (marine/or) et Nhood (vert) diagnostiquée post-S31. Aucun breaking change consumer.

---

## v2.54.10 — 2026-05-10 (HOTFIX)

### Fixed
- **#247 Logo MSYX (réouverture) — hotfix : référence directe au PNG officiel**. Le fix S31 (PR #257, v2.54.1) avait ajouté un `<path>` SVG manuel "M en double-pic" mais avec des coordonnées arbitraires qui ne correspondaient pas au logo officiel — résultat dégradé en prod, refusé par Mike en revue 2026-05-10. Hotfix : remplacer la référence SVG par `<img src="/assets/sources/logoMSYX.png">` directement dans `shared/nav.js` (header), `index.html` (page login auth gate) et `canonical-pages/login.html`. Le PNG officiel (`assets/sources/logoMSYX.png`, 96 KB, 1475×1562) était déjà conservé dans le repo. Le SVG `path #ffffff` bricolé est retiré (les 4 fichiers SVG `assets/logo-msyx*.svg` sont restaurés à leur état pré-S31, sans le path bricolé). Le test de non-régression `tests/regression/logo-msyx-paths.test.js` introduit en S31 est supprimé (validait le bricolage).

### Notes
- Tradeoff : 96 KB PNG vs ~1 KB SVG. Acceptable pour un logo unique chargé une fois et caché par le navigateur. Issue follow-up à créer en S32 pour produire un vrai SVG fidèle au logo officiel (2 paths : W vert + M bleu en gradient).
- Hotfix produit à 09h UTC le lendemain du déploiement S31 (drift prod limité à ~30 min).

---

## Sprint 31 — v2.54.9 — 2026-05-10

**Sprint Bugfix UX** : 9 bugs UI/régressions remontés en revue 2026-05-09. 9/9 livrés (16 SP, 100% vélocité). Versions pré-allouées par parent /sprint (claude-config#32C, 8e application consécutive validée — 0 conflit git sur bumps malgré 4 vagues parallèles + chaîne de 9 rebases successifs avec `--theirs`).

### Fixed
- **#247 — Logo MSYX : restauration du M en double-pic de montagne (v2.54.1)**. Régression PR #213/S24 #209 (vectorisation potrace mode trace simple — M absent). Ajout d'un `<path>` SVG manuel blanc (`fill="#ffffff"`) sur les 4 fichiers (`assets/logo-msyx.svg`, `-mark`, `-dark`, `-light`). Test de non-régression `tests/regression/logo-msyx-paths.test.js`.
- **#251 — Theme switcher light/dark : plus jamais grisé à tort (v2.54.2)**. Race init `updateModeButtons` lue avant que l'anti-FOUC pose `data-theme` sur `<html>`. Fix défensif dans `shared/nav.js` : ordre `initModeSwitcher` → `initThemeSwitcher` durci + appel défensif `updateModeButtons()` à la fin de `initThemeSwitcher`. Tous les thèmes retrouvent leur toggle dark/light.
- **#248 — Sidebar bleed-through au scroll (v2.54.3)**. `.sidebar-filter-wrap` sticky top:0 avec `background: var(--sidebar-bg)` (alpha 0.85-0.95) sans `backdrop-filter` → liens visibles à travers la barre de recherche. Ajout `backdrop-filter: blur(12px) saturate(1.5)` (+ `-webkit-` prefix) dans `shared/css/layout.css`.
- **#250 — Code-block débordement col 3 grid (v2.54.4)**. Section `#consommation` de `pages/fondation.html` débordement de la 3e colonne `.demo-grid-3` par URL longue. Fix CSS `.code-block` : ajout `overflow-wrap: anywhere` + `min-width: 0` dans `shared/css/components/interactive.css`.
- **#252 — Mise en page 4 sections showcase (v2.54.5)**. Régression structurelle HTML pure (4 sous-bugs) : section badges fermée trop tôt dans `pages/composants.html`, wrappers `.demo-grid demo-grid-1` manquants sur Activity Feed + Risk Matrix + Notification Center. 4 patches HTML minimaux.
- **#253 — Polish .btn-danger / .btn-success / .btn-warning (v2.54.6)**. Refactor avec sélecteur partagé qui factorise position/overflow/`::before`/hover-lift, puis spécialisation `background` + `box-shadow:hover` color-mix par couleur. Extension du `:active` scale aux 3 variantes. Alignement glassmorphism sur `.btn-primary`.
- **#249 — Section theming refactorée (v2.54.7)**. Classes CSS orphelines (`theme-card`, `flex-wrap-mb`, `flex-between-sm`, `flex-col-gap-xs/sm`, `token-row`, `token-item`) sans règles + palettes ACSSI/Nhood en swatches inline 60×60px sans nom ni hex. Définition `.theme-card` (+ `.theme-card-head`, variante `--future`) dans `shared/css/components/theming.css`, refonte palettes en `.color-grid--compact` + `.color-swatch` + `.color-info`, suppression inline-styles.
- **#255 — Toasts : positioning + animation + a11y (v2.54.8)**. `top: 1.5rem` chevauchait header (56px), pas de stack-shift entre toasts, animation `ease` non DS-aligned, mobile non géré. Fix `top: calc(var(--header-h) + var(--space-md))`, `transition margin --ease-standard` (stack-shift), slide-in `--ease-spring`, `flex-shrink: 0`, `will-change`, media mobile ≤480px full-width. JS : `role` dynamique (alert/status selon type) sur création toast.
- **#254 — Icône notification : Lucide i-bell au lieu d'emoji système (v2.54.9)**. Les 4 emplacements (`shared/nav.js`, `shared/dist/nav.min.js`, `pages/navigation.html:40`, `pages/feedback.html:608`) utilisaient `&#128276;` (🔔) rendu OS-dependent. Swap vers `<svg class="icon"><use href="/shared/icons/sprite.svg#i-bell"/></svg>`. Rendu monochrome stroke `currentColor` cohérent.

### Notes
- **CI** : 9 PRs × 5 checks (lint, perf-budget, lighthouse, a11y, visual) = 45 runs verts. Aucune régression visuelle détectée par Playwright.
- **Pattern de merge** : ordre strict des versions v2.54.1 → v2.54.9, avec rebase `--theirs` sur les 7 fichiers de version (`package.json`, 4 CSS, `nav.js`, `components-registry.json`) à chaque merge intermédiaire. Pattern automatisable.
- **Découverte** : `shared/components-registry.json` doit être inclus dans la liste --theirs lors des rebases multi-PR (capit. à intégrer dans la doc /sprint).

---

## v2.54.0 — 2026-05-09

### Added
- **Lighthouse CI multi-thèmes + `docs/PERF-BUDGET.md` (#241)**. Étend la mesure
  Lighthouse à la matrice 3 thèmes × 2 modes = 6 runs sur `composants.html`.
- `lighthouserc.cjs` étendu : 6 URLs distinctes via query params `?theme=X&mode=Y`.
- `pages/composants.html` : script anti-FOUC inline `<head>` qui mappe les query
  params vers `localStorage` avant render (permet à Lighthouse de pivoter le
  thème sans interaction).
- `lhci-baseline.json` : structure étendue `runs.{theme}-{mode}` avec les 6 mesures.
- `docs/PERF-BUDGET.md` : référentiel complet des 3 outils perf (gzip, Lighthouse,
  axe-core), workflows CI, procédure mise à jour baseline.
- `shared/CONSUMER_GUIDE.md` : section "Tree-shake guide" actualisée avec poids
  réels par module.

### Notes
- 6 runs Lighthouse desktop sur DS v2.54.0 — tous Performance score = 1.0 (100/100) :
  - msyx-dark : LCP 291ms, TBT 0ms, CLS 0
  - msyx-light : LCP 290ms, TBT 49ms, CLS 0
  - acssi-dark : LCP 253ms, TBT 0ms, CLS 0
  - acssi-light : LCP 251ms, TBT 0ms, CLS 0
  - nhood-dark : LCP 292ms, TBT 0ms, CLS 0
  - nhood-light : LCP 265ms, TBT 0ms, CLS 0
- Aucun changement de CSS rendu (que des configs CI + docs + version bumps).

---

## v2.53.0 — 2026-05-09

### Added
- **Lighthouse CI baseline 1 page × MSYX dark (#240)**. Setup minimal de Lighthouse
  CI pour mesurer les Core Web Vitals du DS sur la page `composants.html`.
- `lighthouserc.cjs` : config `@lhci/cli` (preset desktop, 1 run/URL, assertions
  warn-only sur LCP < 2500ms, TBT < 300ms, CLS < 0.1, Performance score ≥ 0.85).
- `lhci-baseline.json` : baseline mesurée locale (LCP 364ms, TBT 12ms, CLS 0.012,
  Performance 1.0).
- `.github/workflows/perf.yml` : workflow CI dédié, séparé de `ci.yml` (perf-budget
  gzip) et `a11y.yml` (axe-core), `continue-on-error: true`, artifact upload.
- devDeps : `@lhci/cli ^0.15.1`, `wait-on` (reproductibilité CI).

### Notes
- DS sur Caddy + auth gate → lhci tourne en local via `npx serve` (port 3001) en
  background, wait-on, puis `lhci autorun`. Pattern transposable au workflow CI.
- Score Performance = 1.0 confirme que le DS est déjà bien optimisé (page statique
  HTML/CSS, pas de JS bloquant render-path).

---

## v2.52.0 — 2026-05-09

### Added
- **A11y dry-run infrastructure (#242)**. Greffe `@axe-core/playwright` à la suite
  Playwright pour automatiser la détection des violations WCAG 2.0 A/AA + WCAG 2.1
  AA sur la matrice complète.
- `visual-tests/a11y.spec.ts` : 54 runs (9 pages × 3 thèmes × 2 modes), mode
  dry-run (ne fail jamais), rapport markdown `afterAll`.
- `playwright.a11y.config.ts` : config dédiée (port 3001, séparée de la VR).
- `.github/workflows/a11y.yml` : workflow CI séparé, `continue-on-error: true`,
  artifact upload du rapport.
- `docs/audit-a11y-2026-05-09.md` : premier rapport généré.
- `docs/ARCHITECTURE.md` : section "A11y audit (depuis v2.52.0)" ajoutée.

### Notes
- **0 violations sur 54 runs.** Le DS passe axe-core sans aucun fix nécessaire —
  conséquence des efforts manuels cumulés (Audit Phase 1 #210, contrastes v2.31.0,
  focus restore WAI APG v2.41.0, reset natif `:focus-visible`, disabled global
  v2.40.2).
- `#238-fix` (remédiation envisagée pendant le groom) **non créé** : pas de dette
  à rembourser. Le filet anti-régression est en place pour les PR futures.
- Une seule devDep ajoutée : `@axe-core/playwright`.

---

## v2.51.0 — 2026-05-09

### Added
- **Perf budget — mesure gzip + step CI warn (#239)**. Outillage de plomberie
  pour suivre l'évolution du poids gzippé des 5 fichiers clés du DS :
  `shared/css/tokens.css`, `shared/css/utilities.css`, `shared/css/components.css`,
  `shared/css/components-core.css`, `shared/components.js`.
- `shared/perf-budget.sh` — script bash zero-dépendance (gzip + wc) qui mesure
  la taille gzippée et compare aux seuils de `shared/perf-budget.json`. Sortie
  human-readable par défaut, `--json` pour CI, `--check` pour mode block.
- `shared/perf-budget.json` — baseline + seuils versionnés (mesure 2026-05-09
  + buffer 5%). Source de vérité unique.
- `.github/workflows/ci.yml` — nouveau job `perf-budget` (warn-only, ne bloque
  pas la PR), résultats publiés en `$GITHUB_STEP_SUMMARY`.
- `shared/CONSUMER_GUIDE.md` — section "Perf budget" : procédure de mise à jour
  baseline pour les agents et humains.

### Notes
- Pas de nouvelle dépendance npm (gzip + wc -c POSIX, Node optionnel pour parser
  le JSON, fallback grep si Node absent).
- Mesure courante (v2.51.0) : 41.34 KB gzippé total sur les 5 fichiers, dont
  components.js = 33.39 KB (≈ 81% du budget).
- Convention : à chaque PR qui modifie un des 5 fichiers, le job CI rapporte
  l'écart vs baseline. Si dépassement → mettre à jour `perf-budget.json` dans
  la même PR (ou justifier dans la description).

---


## v2.50.0 — 2026-05-09

### Changed
- `.code-inline` (interactive.css) — refactor visuel : background neutre (`--surface-solid`)
  + border subtle (`--border-color`) + tokens canoniques (`--font-mono`, `--radius-xs`).
  Promotion d'une DS-EXCEPTION aksy (UC-373 / aksy#470). Pas de breaking : classe
  préexistante, ~30 usages dans pages/composants + pages/templates conservés.
- pages/divers.html : nouvelle démo dédiée `.code-inline` dans la section "code"
  (`.demo-box` placée avant la grille des `.code-block`).
- `shared/components-registry.json` : ajout entrée `code-inline` (page divers,
  module `interactive.css`) + bump `version` 2.49.0 → 2.50.0.

### Notes
- Tokens utilisés : `--font-mono`, `--surface-solid`, `--border-color`, `--radius-xs`
  — tous définis dans tous les thèmes (MSYX/ACSSI/Nhood × dark/light).
- Pas de JS init (composant pure CSS), pas de FOUC à craindre.
- Compteur hero `site.html` inchangé (refactor + démo, pas un nouveau composant).
- Cleanup aksy DS-EXCEPTION (UC-373 / aksy#470) à planifier après resync v2.50.0.

---

## v2.49.1 — 2026-05-09
### Fixed
- **tokens.css ACSSI** : suppression du bloc legacy commenté L244-616 (#233). Le commentaire `/* ----- Themes externalises vers themes/*.json (v2.39.0) -----` ouvert L244 n'était jamais correctement fermé (marqueurs `* /` avec espace = invalides), englobant les 4 blocs `[data-theme="acssi"]` (dark+light) et `[data-theme="nhood"]` (dark+light). Code mort : les thèmes sont déjà servis par `themes/*.json` → `themes.css`. Aucun impact rendu (le bloc était déjà ignoré par le parser CSS), mais nettoyage indispensable car ces blocs auraient été ré-activés par tout fix qui aurait choisi l'option "refermer correctement".

### Notes
- `tokens.css` passe de 616 à 243 lignes (-373).
- Aucun changement visuel attendu : les thèmes ACSSI/Nhood restent servis par `themes.css` autogénéré.
- Smoke test : `/*` et `*/` balanced (52/52) après suppression.

---

## v2.49.0 — 2026-05-08
### Added
- `.card-link` (cards.css) — wrapper a11y pour cards entierement cliquables (focus-visible gere, hover sur la card enfant). Demo dans pages/composants.html section cards.
- `.badge-nav` (badges.css) — variante compacte badge pour compteurs/percentages dans sidebar/nav (margin-left:auto, min-width:1.5rem). Demo dans pages/composants.html section badges.
- `.toast-message` (alerts.css) — wrapper texte avec flex:1 dans .toast pour layout grow correct entre icone et close.

### Changed
- pages/feedback.html : 4 exemples toast (success/error/info/warning) mis a jour pour utiliser `<span class="toast-message">` au lieu de `<span>` brut. Coherence DS.

### Resolved
- Dette consumer S27 (#227) : 3 classes promues depuis aksyva-overrides + acssi-overrides. Reste a eliminer cote consumers via resync v2.49.0 + retrait overrides.

### Notes
- Compteur hero site.html inchange (variantes, pas nouveaux composants).
- Pas de JS init (composants pure CSS).
- Aucune regression sur .card / .badge / .toast existants (ajouts purs additifs).

---

## v2.48.1 — 2026-05-08

### Fixed
- `shared/components-registry.json` : entrée `reset-natif` — `cssClasses: null` → `cssClasses: []` (sémantique correcte, contrat string[] respecté). Registry `version` bump 2.48.0 → 2.48.1.
- `shared/check-components.sh` : durcissement defensive du parsing Python (`or []` + `isinstance check`) — ne crash plus si une entrée registry a `cssClasses` null/absent/non-array (closes #229).

### Resolved
- Closes #229 (registry reset-natif cssClasses null cause crash check-components.sh).

---

## Sprint 27 — 2026-05-08 (coordination, no version bump)

### Coordination cross-projet
- **#227 (P1, 3 SP)** Vérif consumers post-deploy v2.48.0 — verdict **PASS-AVEC-DETTE** (0 régression DS).
  - aksyva-project sync v2.24.1 (drift -24 minor), 2 classes hors DS (`.card-link`, `.input-filter-project`)
  - acssi-core-project sync v2.14.3 (drift -34 minor), 2 classes hors DS (`.badge-nav`, `.toast-message`)
  - aksy local sync v2.36.0 (drift -12 minor, bonus check)
  - Aucune suite VR configurée chez les consumers
- **#228 (P2, 1 SP)** Notify aksy DS-EXCEPTIONs S23 — 4 commentaires postés sur `msyx-dev/aksy#265, #278, #301, #254` (UC-288). Action attendue côté aksy : resync v2.36.0 → v2.48.0 puis retrait 3 overrides CSS + 1 helper JS.

### Findings → backlog
- **Bug DS interne mineur** : `shared/components-registry.json` entrée `reset-natif` a `cssClasses: null` → crash `shared/check-components.sh`. P3 Task à ouvrir.
- **3 dettes consumers** identifiées (resync + cleanup overrides) — issues à ouvrir côté chaque consumer.

---

## v2.48.0 — 2026-05-08

### Added
- **Tokens avatars** : famille `--avatar-size-xs/sm/md/lg/xl` (24/32/40/56/80 px) dans `tokens.css`, exposée aux consommateurs.
- **Tokens card-icon** : `--card-icon-size` (52px), `--card-icon-size-sm` (40px responsive), `--card-icon-radius` (14px) dans `tokens.css`.

### Changed
- **Audit Phase 1 — Tokenisation icon/avatar sizes (#225, P-04 à P-08)** : 11 sélecteurs migrés vers tokens.
  - `avatars.css` : `.avatar-xs/sm/md/lg/xl` utilisent `--avatar-size-*` (5 sélecteurs)
  - `layout.css` : `.sidebar-link .icon` 18px → `var(--icon-size-sm)` (16px, drift -2px assumé pour cohérence d'échelle)
  - `interactive.css` : `.copy-btn svg` 14px et `.copy-btn--icon svg` 15px → `var(--icon-size-sm)` (16px, drift ≤2px assumé)
  - `cards.css` : `.card-icon` et `.hub-card-icon` (4 occurrences dont responsive) utilisent `--card-icon-size/-sm/-radius`
- Documentation tokens dans `pages/fondation.html` section `#tokens` (sous-sections Avatars + Card icons).

### Notes
- **Aucune régression fonctionnelle attendue** — refacto CSS pure, valeurs effectives préservées pour avatars et card-icons.
- **Drift visuel volontairement assumé ≤ 2px** sur 3 sélecteurs (sidebar-link, copy-btn ×2) au profit de la cohérence d'échelle (précédent S25 #216).
- **Thèmes testés** : 5 combinaisons (MSYX dark/light, ACSSI dark/light, Nhood dark/light) — cohérent partout.

### Resolved
- Closes #225 (audit Phase 1 — tokenisation icon/avatar sizes, sous-issue de #210).

---

## v2.47.0 — 2026-05-08

### Changed
- **Audit Phase 1 — Restructure composants × pages (#219)** : 7 sections déplacées pour cohérence sémantique (R-01 à R-07)
  - pagination : navigation → feedback (pattern feedback)
  - tooltip : composants → feedback (feedback contextuel)
  - action-menu : composants → navigation (navigation secondaire)
  - pricing : composants → templates (template page complète)
  - comments : composants → feedback (pattern social)
  - theme-switcher : composants → fondation (config fondation)
- **CSS login** : sélecteurs `.login-form/.login-card/.login-submit` (et famille) déplacés de `templates.css` → `forms.css` (cohérence : HTML en formulaires.html, CSS en forms.css)

### Fixed
- `shared/components-registry.json` : ajout des 4 entries manquantes (action-menu, pricing, comments, theme-switcher) + correction des champs `page` desync (pagination, tooltip) + version 2.47.0
- `CLAUDE.md` (N2) : descriptions des `pages/*.html` synchronisées avec la nouvelle organisation

### Notes
- **Aucun changement visuel attendu** — pure réorganisation HTML/CSS
- **Aucune régression fonctionnelle** — toutes les classes CSS et IDs JS conservés
- Sidebars des 5 pages mises à jour (ancres déplacées avec leurs sections)

### Resolved
- Closes #219 (audit Phase 1 — restructure composants × pages, sous-issue de #210)

---

## v2.46.0 — 2026-05-08

### Added
- `--space-2: 0.75rem` et `--space-5: 1.25rem` — tokens intermédiaires pour combler les trous d'échelle entre `sm`/`md` et `md`/`lg` (audit findings M-01 à M-12).

### Changed
- 12 sélecteurs migrés vers tokens `--space-*` :
  - `cards.css` : `.card-compact`, `.hub-card`
  - `buttons.css` : `.btn-lg` (padding + border-radius)
  - `templates.css` : `.kanban-card`, `.backlog-item`, `.backlog-filters .btn-filter` (radius)
  - `navigation.css` : `.tab`
  - `forms.css` : `.input`, `.dropdown-trigger`
  - `modals.css` : `.modal-content`, `.popover`
  - `interactive.css` : `.segmented-item`
- Drift visuel volontairement accepté <2px pour 5 sélecteurs (`.kanban-card`, `.tab`, `.btn-lg`, `.segmented-item`, `.btn-filter` radius) au profit de la cohérence d'échelle.

### Fixed
- Élimination de 4 occurrences de `0.7rem` et 3 de `1.2rem` hardcodés dans les modules CSS, source de drift visuel inter-composants.

### Resolved
- Closes #216 (audit Phase 1 — tokenisation margins/paddings, sous-issue de #210).

---

## v2.45.0 — 2026-05-08 — Sprint 25 — Audit Phase 1 : flicker boutons + cards (transitions ciblees + will-change)

### Changed
- **Transitions ciblees** : 30 occurrences de `transition: all` remplacees par des proprietes ciblees (`transform`, `box-shadow`, `border-color`, `background-color`, `opacity`) sur 13 modules CSS (`buttons.css`, `cards.css`, `forms.css`, `navigation.css`, `interactive.css`, `templates.css`, `lists.css`, `modals.css`, `notifications.css`, `feedback.css`, `tracker.css`, `badges.css`, `layout.css`). Resout les flicker sur Safari mobile et Chrome (F-01 a F-09 audit Phase 1).
- **`will-change` strict** : ajoute uniquement sur `.card` et `.hub-card` (les seuls selecteurs combinant `backdrop-filter` + `transform:hover` triggant des compositing layers). Pas d'usage systematique pour eviter d'epuiser la GPU memory.
- Pattern transition canonique documente : `transition: transform 0.4s var(--ease-standard), box-shadow 0.4s var(--ease-standard), border-color 0.4s var(--ease-standard);`.

### Resolved
- Closes #218 (audit Phase 1 — flicker boutons/cards, sous-issue de #210).

### Notes
- `@media (prefers-reduced-motion: reduce)` reste fonctionnel via `_a11y.css` (verifie).
- Aucune régression visuelle sur les 120 E2E Playwright (3 thèmes × 2 modes × 2 viewports × 10 pages).

---

## v2.44.0 — 2026-05-08 — Sprint 25 — Audit Phase 1 : chevron theme-aware, sprite cleanup, context-menu icones

### Changed
- Chevron `select.input` desormais theme-aware via variable CSS `--chevron-select` (6 declinaisons theme/mode dans `tokens.css`). Resout l'invisibilite du chevron sur ACSSI dark et le faible contraste en mode light (P-02, P-09 audit Phase 1).
- Sprite `shared/icons/sprite.svg` nettoye : suppression des `<svg>` wrappers internes des `<symbol>` (P-01 audit). Taille reduite de ~21 KB a ~10 KB. Aucun changement visuel.
- Context-menu `pages/divers.html` : 4 emojis Unicode (Couper, Selectionner tout, Partager, Slack) substitues par icones sprite Lucide (P-03 audit). Rendu coherent cross-OS.

### Added
- Variable CSS `--chevron-select` documentee dans `pages/fondation.html` section Performance > SVG theme-aware.
- Sprite Lucide etendu a 55 glyphes (+`scissors`, +`square-check` vs v2.43.1).

### Resolved
- Closes #217 (audit Phase 1 — pictos/images, sous-issue de #210).

---

## v2.43.1 — 2026-05-08 — Sprint 24 — Refactor nav.js : extraction VERSION + template literals

### Changed
- **refactor: extract VERSION + template literals (prevention #206)** — `shared/nav.js` : extraction de `const VERSION = '2.43.1'` en tête de fichier (avant `NAV_SECTIONS`) et remplacement de toutes les concaténations HTML fragiles (`'literal' + var + 'literal'`) par des template literals ES6 dans les 10 zones identifiées (`buildHeader` avatarContent, dropdownItems, badgeHtml, notifBellHtml, userZoneHtml, header.innerHTML ; `renderNotifications`, `updateHeaderUser`, `buildSidebar`, `loadSection` lazy-error). La string hardcodée `'v2.43.0'` dans `header.innerHTML` est remplacée par `` `v${VERSION}` ``. Refactor strictement isofonctionnel : API publique, DOM rendu et comportement runtime inchangés. Ferme structurellement la classe d'incidents #206 (quote oubliée dans une longue concat string). Closes #211.
- `@ds-version` bumpé à `2.43.1` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

---

## v2.43.0 — 2026-05-08 — Sprint 24 — Logo officiel MSYX mark-only vectorisé

### Changed
- **Logo officiel MSYX (mark only, vectorisé)** — `assets/logo-msyx.svg`, `logo-msyx-mark.svg`, `logo-msyx-dark.svg`, `logo-msyx-light.svg` remplacent le wordmark Monogram v2.42.0 (#192, réinterprétation paths-by-agent S23) par le mark vectorisé depuis le source officiel `msyx.fr/media/logo/logoMSYX.png`. Vectorisation potrace → svgo (1.1 KB). Gradient vertical 4 stops : `#3eb89d` turquoise → `#4ab695` vert → `#3a6cb8` bleu → `#5b3eaa` violet. ViewBox 1475×1562 (ratio quasi-carré 1:1.06). Mark-only (pas de wordmark texte). Closes #209.
- **Header `nav.js` ligne 188** — Ratio image `120×32` → `40×40` carré. CSS `.header-logo-img` mis à jour en conséquence (`layout.css`).
- **`canonical-pages/login.html`** — Ratio image `140×42` → `120×120` carré.
- **Variante light** — Gradients assombris pour contraste WCAG AA sur fond clair : `#2d8b73`→`#358a70`→`#2c548b`→`#43308a`.
- `@ds-version` bumpé à `2.43.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Added
- **`assets/sources/logoMSYX.png`** — PNG source officiel (1475×1562, 95 KB) conservé pour reproductibilité du tracé potrace. Référence canonique pour toute future mise à jour du mark.

### Notes
- `assets/explorations/wordmark-monogram-{a,b}.svg` conservés intacts (historique S23 #192).
- Wordmark Monogram v2.42.0 = exploration historique uniquement. Mark vectorisé = canonical. Décision figée.

---

## v2.42.1 (2026-05-07) — HOTFIX — DEPLOYED
Deploy tag: `deploy-20260507-113853`
Deployed: 2026-05-07 09:40 UTC

### Fixed
- nav.js : quote fermante manquante ligne 189 introduite par v2.42.0 cassait la SyntaxError JS, supprimant header/sidebar/logos sur toutes les pages prod (#206)

## v2.42.0 — 2026-05-07 — Sprint 23 — Brand motif : wordmark SVG, signature spatiale, --texture-grain

### Added
- **assets/ — Brand identity SVG** — 4 fichiers SVG finaux : `logo-msyx.svg` (PRIMARY lockup 200×60), `logo-msyx-mark.svg` (mark seule 60×60, favicon-ready), `logo-msyx-dark.svg` (variante fond sombre), `logo-msyx-light.svg` (variante fond clair). Mark : blob organique (plectre arrondi) + M en espace négatif double sommet (vagues/montagnes), `fill-rule="evenodd"`. Gradient vertical `linearGradient` : `#10b981` turquoise → `#3b82f6` bleu → `#8b5cf6` violet. Wordmark « msyx » en `currentColor` (adaptation thème). ≤ 1 path complexe par variante. `role="img"` + `<title>` (a11y). 2 explorations Monogram dans `assets/explorations/` (historique conception). Closes #192.
- **shared/css/components/signature.css** — Nouveau module brand signature spatiale. Gradient underline 2px via `::after` sur `.main .section-header .overline`. Accent visuel 32×2px, `var(--gradient-1)`, `border-radius: 2px`. Rend le DS reconnaissable même en grayscale/impression mono. Importé dans `components.css` après `_base.css`.
- **tokens.css — --texture-grain** — Token `--texture-grain` (URL SVG feTurbulence inline, noise 0.9Hz 4 octaves stitch) + `--texture-grain-opacity: 0.015`. Formalise `--noise-texture` (#12). `body::after` dans `styles.css` refactorisé pour utiliser ces tokens (plus d'URL hardcodée dans styles.css).
- **pages/fondation.html#texture** — Nouvelle sous-section « Texture grain » (Brand motif) : tokens, usage code, principe. Entrée sidebar « Texture » ajoutée dans `nav.js` NAV_SECTIONS Fondation.

### Changed
- **Header logo** — `buildHeader()` dans `nav.js` : texte gradient `msyx.design` remplacé par `<img src="/assets/logo-msyx.svg">` (120×32). CSS `layout.css` : `.header-logo` nettoyé (gradient text-clip retiré, flex propre conservé). `.header-logo-img` ajouté.
- **index.html** — Div `.logo DS` remplacée par `<img src="/assets/logo-msyx-mark.svg">` (48×48).
- **canonical-pages/login.html** — `login-logo-mark M` + `login-logo-name msyx` remplacés par `<img src="/assets/logo-msyx.svg">` (140px).
- `@ds-version` bumpé à `2.42.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.41.0 — 2026-05-06 — Sprint 23 — Focus restore WAI APG sur les modales (a11y WCAG 2.4.3)

### Added
- **shared/components.js — attachFocusRestore** — Helper prive `attachFocusRestore(dialog)` integre directement dans `components.js` (pattern WAI APG Dialog Modal). Capture `document.activeElement` au `showModal()`, restaure le focus au `close`. Couvre les 4 voies de fermeture (ESC, backdrop, bouton `[data-modal-close]`, `dialog.close()` programmatique). Idempotent via flag `__focusRestoreAttached`. Edge cases : trigger null ou supprime du DOM => skip silencieux. Cables automatiquement dans `initModals()` (modales statiques `dialog.modal-dialog`) et `window.__openModal` (modale dynamique). Corrige WCAG 2.4.3 (Focus Order) et WCAG 2.4.7 (Focus Visible) sur toutes les modales DS. Promeut le pattern valide en prod chez aksy (UC-288, Sprint 14 v0.7.10). Closes #174.
- **visual-tests/modal-focus.spec.ts** — Smoke test Playwright : focus restaure apres Esc sur modale statique (1 voie x 1 modale).
- **shared/components-registry.json** — Entree `modal` annotee avec champ `a11y.focusRestore: true` (pattern WAI APG, ref issue #174 / aksy UC-288).
- `@ds-version` bumpe a `2.41.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.40.2 — 2026-05-06 — Sprint 23 — Disabled global : règle CSS éléments natifs hors DS

### Added
- **_a11y.css — disabled global** — Règle CSS `[disabled]:not(.btn-*):not(.input)` et `a[aria-disabled="true"]` : opacité 0.5, cursor not-allowed, pointer-events none. Promue depuis aksy DS-EXCEPTION (#301) vers le DS pour bénéficier à tous les consumers. Couvre select, textarea, input natifs, boutons et liens sans classe DS. Les classes `.btn-*` et `.input` gardent leur gestion propre ; le sélecteur `.sidebar-link[aria-disabled="true"]` (spécificité 0,2,0) n'est pas affecté. Closes #175.
- **composants.html#disabled-global** — Section démo A11y « Disabled global » avec exemples : bouton/input/select/checkbox/radio/textarea natifs et lien aria-disabled.
- `@ds-version` bumpé à `2.40.2` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.40.1 — 2026-05-06 — Sprint 23 — Fix a11y tap target header-logo (WCAG 2.5.5)

### Fixed
- **header-logo tap target** — `.site-header .header-logo` : ajout de `display: inline-flex`, `align-items: center` et `min-height: 44px` pour respecter WCAG 2.5.5 (seuil 44px). L'élément `<a>` étant `inline` par défaut, `min-height` était ignoré sans `display` block-like. Closes #173.
- `@ds-version` bumpé à `2.40.1` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.40.0 — 2026-05-06 — Sprint 23 — Fix WCAG AA `--text-muted` dark ACSSI (closes #172)

### Fixed
- **a11y / tokens** — `--text-muted` dark ACSSI recalibré de `#94a3b8` (2.77:1 KO) à `#cbd5e1` : ratios WCAG AA atteints sur toutes les surfaces ACSSI dark (8.54:1 sur `--primary`, 6.63:1 sur `--surface-solid`, 4.78:1 sur `--surface-light`). `--text-muted-rgb` synced à `203, 213, 225`. Seul le bloc dark `[data-theme="acssi"]` est modifié — le light mode était déjà correct depuis v2.31.0.
- `@ds-version` bumpé à `2.40.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.39.0 — 2026-05-06 — Sprint 22 — Theme generator JSON → CSS, scaffold-theme, byte-identité

### Changed
- **Architecture themes** — Source de vérité unique pour les thèmes : les blocs `[data-theme="acssi"]` / `[data-theme="nhood"]` (et variantes light) sont extraits de `tokens.css` vers `themes/acssi.json` et `themes/nhood.json`. Un script Node sans dépendances (`shared/build-themes.js`) génère `shared/css/themes.css` de façon déterministe (tri alphabétique des propriétés, byte-identité reproductible). Ferme #190.
- **themes/*.json** — 3 fichiers JSON créés : `msyx.json` (référence), `acssi.json` (bleu marine / or), `nhood.json` (vert forêt / menthe). Schéma : overrides explicites uniquement (héritage `:root` préservé pour le reste).
- **shared/build-themes.js** — Compilateur no-deps : lit `themes/*.json` (sauf msyx), trie les propriétés alphabétiquement, génère `shared/css/themes.css` avec header `AUTOGENERATED`. Testé déterministe (md5sum identique sur 2 runs successifs).
- **shared/scaffold-theme.sh** — Helper DX : crée `themes/<name>.json` depuis le template msyx et recompile automatiquement `themes.css`. Usage : `./shared/scaffold-theme.sh <theme-name>`.
- **shared/styles.css** — Ajout `@import url('css/themes.css');` entre `tokens.css` et `utilities.css`. Cascade respectée : `:root` msyx dark → thèmes acssi/nhood overrides → mode light overrides.
- **shared/css/tokens.css** — Blocs theme acssi/nhood commentés avec marqueur `MIGRATED → themes/*.json — to remove in v2.40.0` (backup 1 sprint). Bump `@ds-version: 2.39.0`.
- **shared/CONSUMER_GUIDE.md** — Section « Adding a theme » ajoutée avec workflow complet : créer JSON, run build-themes.js, activer dans THEME_CONFIG, vérifier VR 108 baselines.
- `@ds-version` bumpé à `2.39.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Notes techniques
- Byte-identité : `build-themes.js` produit un CSS sémantiquement équivalent aux blocs CSS originaux. VR 108 baselines PASS sans `--update-snapshots`.
- Scope `themes.css` : acssi + nhood uniquement (msyx reste implicite dans `:root` de `tokens.css`).
- Dépréciation : les blocs commentés dans `tokens.css` seront supprimés définitivement en v2.40.0.

## v2.38.0 — 2026-05-06 — Sprint 22 — Visual regression matrice complète 108 baselines

### Added
- **Visual regression matrice complète** — Extension de 18 à 108 baselines (3 thèmes × 2 modes × 9 pages × 2 viewports). Filet de protection pour le theme generator (#190) et toute modification CSS large. Closes #191.
- `playwright.config.ts` : 12 projects nommés `<theme>-<mode>-<viewport>` (msyx/acssi/nhood × dark/light × desktop-1280/mobile-375). Suppression du viewport global.
- `visual-tests/visual.spec.ts` : parseProjectName() extrait theme+mode depuis le project name ; setThemeAndMode() remplace setMode() (support multi-thème). Baselines renommées `visual-tests/baseline/<theme>-<mode>-<viewport>/<page>.png`.
- `.github/workflows/visual.yml` : timeout-minutes 15 → 30 (6× plus de captures).
- `@ds-version` bumpé à `2.38.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.37.0 — 2026-05-06 — Sprint 21 — Type modular scale 1.25 + tokens line-height + pairing rules

### Changed
- **Tokens typographiques** — Ajout de 8 tokens `--type-*` (echelle modulaire ratio 1.25 / Major Third) dans `shared/css/tokens.css` : `--type-12` (0.75rem) a `--type-49` (3.052rem). Les 4 tokens `--lh-*` existants conserves sans modification. Ferme #189.
- **Classes `.typo-*`** — 10 classes (`.typo-h1` a `.typo-mono`) dans `shared/css/components/theming.css` mises a jour pour pointer vers `--type-*`. Diffs visuels dans la fourchette garde-fou : h1 (-0.9px), h2 (+2.4px), small/mono/text-sm (+0.4px). `.typo-display` conserve `3.5rem` literal (legacy hero).
- **Classes `.text-*`** — 5 utilitaires (`.text-xs/sm/base/xl`) dans `shared/css/utilities.css` mappes sur `--type-*`. `.text-lg` conserve `1.125rem` literal (sweet spot hors echelle).
- **Section Pairing** — Sous-section `#type-pairing` ajoutee dans `pages/fondation.html#typography` : 4 combinaisons canoniques (Hero, Section, Card, Data) avec exemples visuels.
- **SKILL.md** — Bloc « Typographie — regles de pairing » ajoute : tableau tokens, exceptions legacy, 4 pairings canoniques, regle de saut max 2 marches.
- `@ds-version` bumpe a `2.37.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Notes techniques
- Baseline VR : aucune update necessaire. Diffs sub-pixel (h1 -0.9px, h2 +2.4px, small/mono +0.4px) tous absorbes par la tolerance Playwright. CI VR PASS 18/18 du premier coup, sans approbation Mike requise.
- Consumer aksy : 0 impact — nouveaux tokens `--type-*` non consommes. Classes existantes maintiennent le rendu via aliases ou diffs sub-pixel.

## v2.36.0 — 2026-05-06 — Sprint 21 — Split components.css → 25 modules + barrel

### Changed
- **Architecture CSS** — `shared/css/components.css` (175 KB monolithique, 4429 lignes) splité en **25 modules** dans `shared/css/components/` par affinité fonctionnelle. Barrel `components.css` (< 1.5 KB) reproduit l'ordre de la cascade. Aucun changement de rendu. Ferme #188.
- **Sync infra** — `shared/sync.sh` et `shared/sync-all.sh` étendus avec flag `--components=<list>` pour copie sélective. `components-core.css` (7 modules essentiels, ~42 KB) disponible pour consumers légers via `--components=core`.
- **Documentation** — `shared/CONSUMER_GUIDE.md` : nouvelle section « Tree-shaking » (3 niveaux d'intégration : complet / core / custom).
- `@ds-version` bumpé à `2.36.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Migration
- Aucune action requise pour les consumers existants : `ds-components.css` continue d'exposer 100% du DS via le barrel.
- Pour activer le tree-shake : voir `CONSUMER_GUIDE.md` section Tree-shaking.

### Notes techniques
- 25 modules : `_base`, `cards`, `buttons`, `badges`, `theming`, `forms`, `data`, `avatars`, `tables`, `lists`, `alerts`, `overlays`, `navigation`, `modals`, `feedback`, `interactive`, `templates`, `media`, `_responsive`, `tracker`, `quiz`, `_a11y`, `pricing`, `notifications`, `motion`.
- Regroupements par affinité fonctionnelle (blocs non-contigus possibles par module). La cascade CSS reste correcte pour des sélecteurs indépendants par composant.
- Historique git : commit de renommage explicite (`components.css → _full.tmp.css`) puis extraction sur le commit suivant.
- `components-core.css` mesuré à ~42 KB (> cible 30 KB). Hors scope d'optimisation pour ce sprint.
- VR Playwright PASS 18/18 sans baseline update.

## v2.35.0 — 2026-05-06 — Sprint 20 — Motion reference page

### Added
- **Motion reference page** (`pages/motion.html`) — nouvelle page thématique : durations (fast/base/slow), easings (standard/spring + courbes SVG + démo boule animée) et 6 patterns canoniques (fade-in, slide-up, scale-in, stagger, skeleton-shimmer, success-bounce). Closes #187.
- `initMotionReplay()` dans `components.js` — bouton Replay par pattern, toggle classe + reflow forcé (`void offsetWidth`), pattern `dataset.bound` anti-double-bind.
- `initMotionViewport()` dans `components.js` — IntersectionObserver pause les animations hors viewport (perf mobile).
- Bloc CSS `/* ===== MOTION REFERENCE PAGE ===== */` dans `components.css` — keyframes `motionFadeIn`, `motionSlideUp`, `motionScaleIn`, `motionBounceIn`, `motionBarFill`, `motionBallSlide`. Zéro valeur hardcodée.
- Lien « Motion » dans la sidebar (sous Fondation) et card Motion dans le hub `site.html`.
- Compteur hero : 87 → 88 composants, 8 → 9 pages.
- `prefers-reduced-motion: reduce` respecté via le bloc global `@media (prefers-reduced-motion: reduce)` (animation-duration: 0.01ms sur tous les éléments).
- `@ds-version` bumpé à `2.35.0` dans les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

## v2.34.0 — 2026-05-06 — Sprint 20 — Token rename + aliases legacy

### Changed
- **Tokens renommes** pour disambiguation semantique (closes #186) :
  - `--border` (couleur) → `--border-color` (vs `--border-width` longueur)
  - `--radius` (16px sans suffixe) → `--radius-card` (vs echelle `--radius-{xs,sm,md,lg,full}`)
  - `--violet` / `--violet-rgb` → `--deco-violet` / `--deco-violet-rgb` (couleur decorative non-semantique)
  - `--cyan` / `--cyan-rgb` → `--deco-cyan` / `--deco-cyan-rgb`
  - `--pink` → `--deco-pink`
- `@ds-version` bumpe a `2.34.0` sur les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Added
- `shared/codemod-rename-tokens.sh` : script bash idempotent (sed -E avec word-boundaries) pour appliquer les renames sur le repo et sur les projets consumers.
- `shared/CONSUMER_GUIDE.md` : nouvelle section "Tokens deprecies (deadline v3.0.0)".

### Deprecated
- Aliases `--border`, `--radius`, `--violet`, `--violet-rgb`, `--cyan`, `--cyan-rgb`, `--pink` conserves dans `tokens.css` jusqu'a v3.0.0. Deadline retrait : **v3.0.0**.

### Compatibilite
Pas de breaking change sur cette version — aliases legacy garantissent rendu identique. Migration consumer optionnelle, recommandee avant v3.0.0.

## v2.33.0 — 2026-05-06 — Sprint 19 — Iconographie Lucide + backdrop-filter fallback

### Added
- **Sprite SVG Lucide self-hoste** (`shared/icons/sprite.svg`) : 53 symboles Lucide, < 50 KB apres svgo --multipass. Script de build reproductible `shared/icons/build-sprite.sh`. Closes #184.
- **Tokens icones** dans `shared/css/tokens.css` : `--icon-size-sm: 16px`, `--icon-size-md: 20px`, `--icon-size-lg: 24px`, `--icon-stroke: 1.5`.
- **Classe `.icon`** + variantes `.icon--sm`, `.icon--lg` dans `shared/css/components.css`. Convention : `<svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-{nom}"/></svg>`.
- **Fallback backdrop-filter** (`@supports not (backdrop-filter: blur(20px))`) pour Firefox — background solid automatique sur `.card`, `.sidebar`, `.header`, `.modal-dialog`, `.login-card`, `.hub-card`, etc. Closes #185.
- **Section Iconographie** dans `pages/fondation.html` : grille 12 icones representativas, snippet d'usage (3 tailles), regles a11y (aria-hidden, role=img, aria-label).
- **Section Performance & Glassmorphism** dans `pages/fondation.html` : regle « glass for chrome, solid for content », demo comparaison, documentation fallback.

### Changed
- **Migration UI** : entites HTML (`&#8249;`/`&#8250;`/`&#9660;`/`&#9654;`) et emoji UI → convention `<svg class="icon"><use>` dans `pages/divers.html` (accordion-arrows, carousel-btns, video-embed-play, cmd-item-icon, context-arrow), `pages/formulaires.html` (cal-nav), `pages/navigation.html` (rail-toggle), `site.html` (hub-card-icon), `shared/components.js` (lightbox-btns). Emoji UGC (notifications simulees) preserves.
- **SKILL.md** : section Glass vs solid enrichie avec la regle fallback et la convention icones sprite.
- `@ds-version` bumpe a `2.33.0` sur les 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`.

### Compatibilite
Pas de breaking change. Migration UI optionnelle pour les projets consommateurs (entites HTML toujours valides, le sprite est purement additif).

## v2.32.2 — 2026-05-06 — Sprint 18 — Diacritic / copy lint

### Fixed
- **Copy française normalisée full diacritics** : 9 occurrences corrigées dans `pages/fondation.html`, `pages/composants.html`, `pages/divers.html` (×3), `pages/feedback.html`, `pages/data.html` (×3), `pages/formulaires.html` (closes #178).
- Patterns ciblés : voir `shared/check-diacritics.sh` (11 regex POSIX, mots-frontière `\b`).

### Added
- `shared/check-diacritics.sh` : linter shell POSIX qui détecte les mots français sans diacritiques sur le contenu user-facing (whitelist : `index.html`, `site.html`, `pages/*.html`, `RELEASES.md`). Exit 1 si occurrence détectée, exit 0 sinon.
- `tests/fixtures/bad-diacritics.html` : fixture volontairement fautive contenant des patterns sans diacritique, utilisée pour valider le linter.
- `tests/test-check-diacritics.sh` : wrapper de non-régression — Run A (repo propre → exit 0) + Run B (fixture contient les patterns → détection confirmée).
- Steps CI `Check diacritics (user-facing copy)` + `Run lint script tests` dans `.github/workflows/ci.yml` (job `lint`).

## v2.32.1 — 2026-05-06 — Sprint 18 — Visual regression filet

### Added
- **Visual regression tests Playwright** — premier filet de regression visuel automatique. 16 baselines committees (`visual-tests/baseline/msyx-{dark,light}/{8 pages}.png`). Workflow `.github/workflows/visual.yml` execute le check sur chaque PR, upload diffs en artefact `visual-diffs` en cas d'echec. Closes #177.
- **Stack Node introduite** : `package.json` + `package-lock.json` a la racine. DevDeps : `@playwright/test ^1.48`, `serve ^14`. Aucun impact sur le deploiement Caddy file_server (stack uniquement dev/CI).
- **Scripts npm** : `test:visual` (run), `test:visual:update` (regenerate baselines), `test:visual:report` (open HTML).
- **README** : nouvelle section "Visual regression tests" (workflow local + CI + update baseline + perimetre).
- **`.gitignore`** : ajout `node_modules/`, `visual-tests/diffs/`, `test-results/`, `playwright-report/`.

### Perimetre v2.32.1
- 1 theme (msyx) x 2 modes (dark+light) x 8 pages thematiques x 1 viewport (1280)
- Hors scope : `index.html`, `site.html`, `getting-started.html` (peu de surface visuelle)
- Extension matrice complete (ACSSI + Nhood + 375px) prevue Sprint 22

### Compatibilite
Aucun changement runtime / API CSS / JS. Pas de migration consumer requise. Le bump version est purement infra-tooling.

---

## v2.32.0 — 2026-05-05 — Sprint 18 — Agent ergonomics

### Added
- **`SKILL.md`** a la racine — manifest user-invocable (frontmatter YAML, <100 lignes), pointe vers les fichiers cles et liste les regles tokens / voix / glass-vs-solid / workflow d'absorption / versioning. Cible : Claude Code et autres agents.
- **`canonical-pages/`** — 6 pages HTML autonomes (login, settings, dashboard-kanban, empty-state, error-404, billing) que les agents copient comme references d'usage. Tokens-only, dark + light fonctionnels, anti-FOUC inline.
- **`prompts.md`** a la racine — 12 phrases-types reutilisables full-diacritics (« Use msyx tokens. No hardcoded hex. Glass cards on dark, solid cards on light. »).
- **`components-registry.json`** : nouveau champ `example` (string HTML) sur les 60 entrees existantes — copy-paste ready pour agents (closes #176).

### Changed
- **`CLAUDE.md` §Process point 5** : convention `@ds-version` corrigee — bump sur **5 fichiers** (tokens.css, utilities.css, components.css, layout.css, nav.js) au lieu de 3. Documentation de la pre-allocation des versions par /sprint parent (validee Sprint 17, 0 conflit).
- **`docs/ARCHITECTURE.md`** : structure mise a jour avec `SKILL.md`, `prompts.md`, `canonical-pages/` + section « Agent ergonomics » + compteur composants aligne sur le registre (60 entrees).

### Note
Cette release absorbe deux decisions retro Sprint 17 (2026-05-01) :
1. Pattern d'absorption d'issue (#167 absorbed par #166) — desormais documente dans `SKILL.md` section workflow.
2. Pre-allocation des versions par /sprint parent — desormais documentee dans `CLAUDE.md` §Process point 5.

---

## v2.31.0 — 2026-05-01 — Sprint 17 — A11y reset natif

### Added
- **Reset natif `<a>`** : couleur user-agent `#0000ee` remplacee par `var(--accent)` theme-aware. Resout le ratio 1.35:1 sur fond ACSSI dark `#00345f` → >= 4.5:1 dans tous les themes/modes (closes #166). Hover : `text-decoration-thickness: 2px` (WCAG 1.4.1 feedback non-couleur). `text-underline-offset: 0.15em` pour lisibilite.
- **Reset natif `:focus-visible`** : outline `2px solid var(--accent)` + `outline-offset: 2px` sur tous les elements focusables sans focus custom. Resout l'outline 1px user-agent insuffisant (~2:1) en dark mode (closes #167, absorbe par #166 — meme zone CSS, meme sprint). Cascade garantie : les composants DS avec focus custom (`.btn-*`, `.input`, `.accordion-header`, `.dropdown-option`, `.fab`, `.hub-card`) ont une specificite superieure et gardent leur apparence.
- **Demo** : nouvelle section "Reset natif" dans `pages/composants.html#reset-natif` avec 2 sous-sections (liens natifs + focus visible global). Elements demo : `<a>`, `<button>` natif, `<input>` natif, `<span tabindex="0">`.
- Bloc CSS `/* ===== RESET NATIF ===== */` en tete de `shared/css/components.css` (avant `.hero`, cascade naturelle).

### Conformite
- WCAG 1.4.3 (Contrast Minimum, 4.5:1) — liens natifs tous themes
- WCAG 1.4.1 (Use of Color) — hover feedback non-couleur
- WCAG 2.4.7 (Focus Visible, >= 3:1 + >= 2px) — focus-visible global

### Note consolidation
L'issue #167 (focus-visible natif outline 1px) a ete absorbee dans cette PR pour garantir la coherence cascade CSS et eviter tout conflit/regression croisee sur la meme zone. #167 sera ferme par le parent post-merge.

---

## v2.30.1 — 2026-05-01 — Sprint 17

### Fixed (a11y)
- **Bannir `color: white` hardcodé** — 7 occurrences remplacées par `color: var(--text-on-accent)` dans `layout.css` et `components.css` (closes #165)
  - `layout.css` : `.header-notification-badge`, `.header-avatar-trigger`
  - `components.css` : `.video-embed-play`, `.before-after-handle::after`, `.notif-trigger-count`, `.wizard-step.active .wizard-step-dot`, `.risk-dot`
  - Dérogation maintenue : `.before-after-label` (fond `rgba(0,0,0,0.5)` indépendant du thème, commentaire explicite)
- Zéro occurrence `color: white|#fff|#ffffff` hardcodée restante (sauf la dérogation justifiée)

---

## v2.30.0 — 2026-05-01 — Sprint 17

### Fixed (a11y)
- **Palette ACSSI light** — recalibrage tokens texte pour atteindre WCAG AA (closes #164, fixes consumer bugs aksy#267 #268 #271)
  - `--text-muted` : `#3d5a73` → `#2c4358` (ratio 2.56:1 → 5.45:1 sur blanc / 5.12:1 sur `#f0f4f8`)
  - `--text-muted-rgb` : sync triplet `61, 90, 115` → `44, 67, 88`
  - `--text-dim` : `#5a7a94` → `#4a6a84` (3.97:1 sur blanc — AA Large/UI only)
  - `--text-on-accent` : déjà présent et figé à `#ffffff` dans bloc light (9.7:1 sur `--accent #00345f`)

### Added
- `shared/CONSUMER_GUIDE.md` : nouvelle section "Paires fg/bg safe — ACSSI light" avec ratios mesurés et paires interdites

### Migration
Resync `shared/css/tokens.css` chez les consumers ACSSI. Aucun changement de classe ou de composant.
Vérifier visuellement les textes en `var(--text-muted)` (légèrement plus foncés, meilleure lisibilité).
Si un usage `color: var(--text-dim)` apparaît sur fond marine → bascule sur `var(--text-muted)` (ratio AA garanti).

---

## v2.29.0 — 2026-05-01 — Sprint 17

### Fixed
- **a11y ACSSI dark** : composition `color: var(--accent-light)` × `background: var(--accent)` rendait le texte illisible (ratio 1.12:1). Token `--text-on-accent` désormais thème-aware en ACSSI (marine `#00243f` sur or, ratio 8.21:1 — WCAG AAA). Closes #163.
- **a11y boutons or** : `.number-input-btn:active` et `.cal-day.today:hover` n'utilisent plus `var(--accent-light)` comme background (qui produisait blanc-sur-or-clair en ACSSI). Migration vers `color-mix(in srgb, var(--accent) 85%, black|white)` thème-agnostique.
- **a11y ACSSI gradient-1** : `--gradient-1` en thème ACSSI dark ajusté en or→or-foncé (`#e0cd1e → #b8a51a`) pour rester lisible avec `--text-on-accent: #00243f` (ratio ≥ 7.6:1 sur tout le gradient — WCAG AAA).
- **visuel ACSSI toggle** : `.toggle-slider::before` (bouton knob) forcé blanc en ACSSI dark via sélecteur thème-aware — le token `--text-on-accent` est marine en ACSSI dark (sémantique texte-sur-fond) mais le knob du toggle est un élément décoratif qui doit rester visible sur fond sombre.

### Compatibilité
- Aucun breaking change pour consumers : le token `--text-on-accent` était déjà publié et les valeurs `--accent`/`--accent-light` ACSSI restent identiques. Pas de migration requise.
- Changement visuel ACSSI dark : `--gradient-1` passe de marine→or à or→or-foncé. Impact bouton primary + login — aspect plus uniforme or. Intentionnel pour cohérence a11y.

---

## 2.28.0 — 2026-05-01 — Modifier `.data-grid-col-sticky-end` — colonne actions sticky right

### Added
- Modifier `.data-grid-col-sticky-end` dans `.data-grid` — permet de pinner la dernière colonne (typiquement Actions) à droite lors du scroll horizontal. 100% CSS, aucun JS. Promu depuis DS-EXCEPTION aksy (chantiers/orga/SAP post-audit v0.2.9+) — #157
- Classes : `.data-grid-col-sticky-end` (sur `<th>` ET `<td>` de la colonne à pinner)
- Z-index : 1 (td body) / 3 (th header — coin top-right au-dessus du thead z=2)
- Fond : `--surface-solid` (cohérent avec `.data-grid-header-row th`), ombre : `var(--shadow-sm)` (token DS, pas de hex)
- Hover/selected : `color-mix(in srgb, var(--accent) 3%/7%, var(--surface-solid))` — cohérence avec le reste de la ligne
- Démo dans `pages/data.html#data-grid` : table 8 colonnes forçant scroll horizontal + 5 lignes

### Changed
- Bump `@ds-version` 2.27.0 → 2.28.0 (tokens.css, utilities.css, components.css, layout.css, nav.js header)
- `shared/components-registry.json` : entrée `data-grid.cssClasses` étendue avec `.data-grid-col-sticky-end` + version 2.28.0

## 2.27.0 — 2026-05-01 — Variante destructive .btn-icon--danger + Composant .filter-bar

### Added
- `.btn-icon--danger` — variante destructive de `.btn-icon` (couleur, border et hover en `--danger`). Cas d'usage : icônes d'action destructive (supprimer ligne, retirer collaborateur). Migré depuis aksy DS-EXCEPTION #24. (#156)
- Démo dans `pages/composants.html#boutons` (sous-section "Boutons icones destructifs") avec 3 variantes + état disabled
- Focus-visible et :disabled intégrés aux sélecteurs groupés de `.btn-icon--danger`
- Composant `.filter-bar` — barre de filtres horizontale standardisée pour vues master/listes filtrées (#154). Pattern extrait de aksy `.chantiers-filter-bar` (DS-EXCEPTION §4). Mobile-first, bascule colonne à 600px. Variantes : standard (selects + recherche), compact, actions trailing (`.filter-bar-actions`).
- Classes : `.filter-bar`, `.filter-bar-search` (flex-grow champ recherche), `.filter-bar-actions` (actions trailing margin-left:auto)
- Démo dans `pages/formulaires.html` — section `#filter-bar` avec 3 variantes + usage doc
- Entrée `filter-bar` dans `shared/components-registry.json`

### Docs
- `shared/CONSUMER_GUIDE.md` : section "Mapping aksy DS-EXCEPTION → DS msyx.fr" — `.btn-ghost.btn-danger` ≡ `.btn-outline-danger`, `.btn-primary.btn-danger` ≡ `.btn-danger`

### Changed
- Bump `@ds-version` 2.26.0 → 2.27.0 (tokens.css, utilities.css, components.css, layout.css, nav.js header)
- Compteur composants `site.html` : 86 → 87 / hub card Formulaires : 15 → 16 sections

## 2.26.0 — 2026-05-01 — Utilitaire .text-truncate + Convention tri data-grid

### Added
- Classe utilitaire `.text-truncate` — alias Bootstrap-compatible de `.truncate` (troncature monoligne avec overflow hidden + ellipsis) dans `shared/css/utilities.css`
- `max-width: 100%` ajouté au sélecteur groupé `.truncate, .text-truncate` — sécurise le rendu en flex/grid layouts (zéro régression dans les contextes block standard)
- Démo enrichie dans `pages/fondation.html` (section Typographie > Troncature) : exemple `.text-truncate` côte à côte avec `.truncate` pour illustrer l'équivalence

### Changed
- Convention de tri data-grid documentée explicitement dans `pages/data.html` : encadré info `.data-grid-sortable` + `.data-grid-sort-icon` + `aria-sort` ; deuxième démo avec `aria-sort="ascending"` au repos (#153)
- `shared/components-registry.json` entrée `data-grid` : champ `notes` ajouté — convention canonique tri DS, anti-alias `.sort-icon` non-préfixé
- Bump `@ds-version` 2.25.0 → 2.26.0 (tokens.css, utilities.css, nav.js header)
- Migration DS-EXCEPTION aksy #218 §4 : `.text-truncate` désormais disponible nativement dans le DS

## 2.25.0 — 2026-04-19 — Tokens status (warn/error/info/success) fg/bg/border

### Added
- 12 tokens CSS semantic `--status-{warn,error,info,success}-{fg,bg,border}` dans `shared/css/tokens.css` (blocs `[data-theme="acssi"]` + `[data-theme="acssi"][data-mode="light"]`) — base du feedback utilisateur (Alert, Input error, Button danger, banners de lock)
- Section preview `#status-tokens` dans `pages/feedback.html` — 4 blocs démontrant les triplets fg/bg/border
- Mode light : fg WCAG AA sur `#ffffff` (warn `#c2410c` 5.82:1, error `#dc2626` 4.83:1, info `#0369a1` 6.45:1, success `#15803d` 5.14:1), bg/border via `color-mix()`
- Mode dark : fg light variant + rgba alpha 0.15/0.40 pour bg/border

### Changed
- Bump `@ds-version` 2.24.4 → 2.25.0 (tokens.css, layout.css, utilities.css, components.css, nav.js header)
- Fix aksy#106 — components.css avait été oublié dans le bump 51a3da0, drift v2.24.3 vs v2.25.0 corrigé (procédure de bump : @ds-version est globale, mettre à jour les 4 CSS + nav.js même si le commit ne touche pas leur contenu)

## 2.24.4 — 2026-04-13 — Fix sync.sh --no-showcase propriétés CSS orphelines

### Fixed
- `sync.sh --no-showcase` laissait des propriétés CSS orphelines dans `ds-layout.css` — les `sed` supprimaient les sélecteurs showcase mais pas les blocs complets (#146)
- Remplacement des 3 `sed` fragiles par 1 `awk` robuste utilisant des marqueurs `@strip:showcase-start/end` dans `layout.css`

## 2.24.3 — 2026-04-13 — Micro-ajouts AKSYVA — sidebar disabled, sublinks, avatar img, kanban scroll-snap

### Added
- `.sidebar-link-disabled` + `[aria-disabled="true"]` : variante disabled pour liens sidebar (layout.css)
- `.sidebar-sublinks` : container sous-navigation indentée dans la sidebar (layout.css)
- `.avatar img` / `.avatar-img` : style image dans un avatar (components.css)
- Kanban board mobile : scroll-snap horizontal + colonnes 85vw (components.css)

## 2.24.2 — 2026-04-13 — Fix risk matrix — taille intermédiaire + compact 5×5

### Changed
- Risk Matrix 5×5 par défaut : `max-width: 600px`, `min-height: 42px` (vs 56px), dots 22px (vs 28px) — grille plus compacte (#147)
- Responsive mobile : `min-width` grille 280px (vs 340px), cellules 36px, dots 18px
- Ajout modificateur `.risk-matrix-compact` / `[data-compact]` : cellules 32px, dots 18px, typo réduite
- Ajout démo « 5×5 Compact » dans `pages/data.html` (`max-width:360px`)
- Note Usage enrichie : mention classe `.risk-matrix-compact`

## 2.24.1 — 2026-04-13 — Fix lazy-load init composants Sprint 8+

### Fixed
- `__initComponents()` ne réinitialisait que les composants fondateurs — les 13 composants Sprint 8+ (risk matrix, usage meter, pricing, wizard, etc.) restaient non-initialisés en lazy-load sur site.html (#143)
- Nouvelle fonction `reinitAll()` appelant tous les init*, exposée via `window.__initComponents`

## 2.24.0 — 2026-04-13 — Sprint 4 (14 SP, 5 issues)

### Added
- Header enrichi démo activé sur toutes les pages du DS — avatar, dropdown, notifications (#136)

### Fixed
- NAV_SECTIONS : ajout 4 sections manquantes dans la sidebar — risk-matrix, video-embed, decision-tree, before-after (#135)
- Carousel `--cards` : ajout `overflow: hidden` sur `.carousel-track` pour clipper les slides (#134)
- Risk Matrix : dots invisibles en navigation SPA — fallback visibilité immédiate après IntersectionObserver (#137)
- Usage Meter : barres à width:0 en SPA — fallback immédiat si composant déjà visible au init (#138)

### Changed
- Version 2.23.0 → 2.24.0

## 2.23.0 — 2026-04-13 — Sprint 2 + Sprint 3 complets

### Added — Sprint 2 (Audit P0+P1, 55 SP)
- A11y : prefers-reduced-motion global, focus-visible sur tous les interactifs, ARIA complet (#119)
- Tokens : radius-md, z-index scale, transitions, typographie, shadows complets (#120)
- Command palette fonctionnelle (⌘K), filtre sidebar, auto-load Ctrl+F (#121)
- Documentation : page Getting Started, guidelines Usage, snippets copiables (#122)
- Regroupement cohérent composants + taxonomie + classes démo (#123)
- Header user connecté : avatar/dropdown/notifications via window.MSYX_HEADER (#124)
- Enforcement : components-registry.json, check-components.sh, check-overrides (#125)
- Pricing table, notification center, activity feed (#126)
- Wizard multi-step, inline editing, action menu, sidebar rail (#127)
- Sync scalable (sync-all.sh), modularité JS documentée, build.sh minification (#128)

### Added — Sprint 3 (Audit P2, 29 SP)
- Composants P2 : settings panel, auto-save, comments, auth flows, upgrade prompt, confirm popover, skeletons pré-fabriqués (#129)
- ~180 classes utilitaires CSS (espacement, display, flex, grid, radius, shadow, typo, a11y) (#130)
- CSS moderne : self-host fonts WOFF2, container queries sur .card, stratégie color-mix() (#131)
- UX DS : sidebar mobile overlay+swipe, transition SPA fade, tooltip/popover 4 positions (#132)
- Matrice risque interactive : grille NxN, zones colorées, tooltip riche, modal détail (#133)

### Changed
- 68 → 86 composants (Hero counter)
- Version 2.14.3 → 2.23.0

## 2.22.0 — 2026-04-12 — Composant Risk Matrix (#133)

### Added
- `pages/data.html#risk-matrix` : section Risk Matrix avec 3 variantes demo (5x5, 3x3, collision)
- `shared/css/components.css` : section `/* ===== RISK MATRIX ===== */` — grille CSS Grid, zones colorees par niveau, risk dots avec animation, tooltip riche, responsive
- `shared/components.js` : `initRiskMatrix()` — generation dynamique DOM grille, positionnement data-prob/data-impact, tooltip hover/focus, modal detail via `__openModal`, gestion collisions (stack + overflow badge), IntersectionObserver animation
- `shared/components.js` : `__openModal` supporte desormais `config.bodyHTML` pour injection HTML brut (retro-compatible)

### Changed
- `shared/nav.js` : `initRiskMatrix()` ajoutee dans reinitAll + version bump v2.20.1 → v2.22
- `shared/css/tokens.css`, `shared/css/utilities.css` : version bump 2.21.0 → 2.22.0
- `site.html` : compteur hero 78 → 79 composants

## 2.20.1 — 2026-04-12 — UX DS : transition SPA, sidebar mobile overlay, tooltip multi-position (#132)

### Added
- `shared/css/layout.css` : `.sidebar-overlay` (overlay mobile sidebar, z-index 99, opacity transition, scoped @media 768px)
- `shared/css/layout.css` : `.main { transition: opacity 0.15s }` + `.main.fade-out { opacity: 0 }` pour fade SPA
- `shared/css/components.css` : `.tooltip--bottom`, `.tooltip--left`, `.tooltip--right` avec fleche CSS repositionnee
- `shared/css/components.css` : `.popover--bottom`, `.popover--left`, `.popover--right` avec fleche CSS repositionnee
- `shared/nav.js` : `buildSidebarOverlay()` — overlay dynamique + tap-outside + swipe gauche (deltaX < -50px)
- `shared/nav.js` : `closeSidebar()` / `openSidebar()` — ferme/ouvre sidebar + overlay ensemble
- `shared/nav.js` : `isSidebarLinkVisible()` — scroll-spy ne scrolle la sidebar que si l'item actif est hors viewport
- `pages/composants.html` : demos tooltip 4 positions + demos popover 4 positions

### Changed
- `shared/nav.js` : `navigateTo()` — fade-out 150ms avant swap innerHTML, fade-in apres
- `shared/nav.js` : `initLazyLoader()` — bouton "Tout charger" → "Tout chargé ✓" + `.btn-success` apres Promise.all
- `shared/nav.js` : tous les `sidebar.classList.remove('open')` remplacés par `closeSidebar()`
- `shared/nav.js` : burger toggle utilise `openSidebar()` / `closeSidebar()`
- `shared/nav.js`, `tokens.css`, `utilities.css`, `layout.css`, `components.css` : version bump 2.20.0 → 2.20.1

## 2.20.0 — 2026-04-12 — Utilities CSS : espacement, display, radius, shadow, typographie (#130)

### Added
- `shared/css/utilities.css` : ~140 classes utilitaires — margin, padding, gap, gap-x, gap-y (7 niveaux xs→3xl), display/flex/grid, border-radius, shadows, typographie (taille, alignement, transform, font), accessibilite (.not-sr-only, .focus-ring, .reduce-motion)
- `shared/css/tokens.css` : token `--radius-full: 9999px`
- `pages/fondation.html#utilities` : section documentaire avec exemples visuels des 6 groupes de classes

### Changed
- `shared/nav.js` : lien "Utilitaires" ajouté dans la sidebar Fondation, version bump v2.19.0 → v2.20.0
- `shared/css/tokens.css` : version bump 2.19.0 → 2.20.0
- `shared/css/utilities.css` : version bump 2.19.0 → 2.20.0

## 2.19.0 — 2026-04-12 — DX : documentation d'usage — getting started, guidelines, snippets copiables (#122)

### Added
- `pages/getting-started.html` : nouvelle page Getting Started — installation (3 niveaux A/B/C), structure HTML de base, configuration du theming, anti-FOUC, tokens principaux, classes utilitaires, bonnes pratiques
- Lien "Getting Started" dans la sidebar (nav.js NAV_SECTIONS, groupe racine)
- `pages/composants.html` : guidelines "Usage" + snippets HTML copiables pour Boutons, Cards, Badges & Tags
- `pages/feedback.html` : guidelines "Usage" + snippets HTML copiables pour Alertes

### Changed
- `shared/nav.js` : version bump v2.18.1 → v2.19.0
- `shared/css/tokens.css`, `utilities.css` : version bump 2.18.1 → 2.19.0

## 2.18.1 — 2026-04-12 — DX : sync scalable + modularité JS + minification (#128)

### Added
- `shared/sync-all.sh` : sync scalable — synchronise vers tous les consommateurs enregistrés dans `consumers.json`, modes `--no-showcase` et `--dry-run`, récapitulatif avant/après
- `shared/consumers.json` : registre des projets consommateurs (acssi-core, acssistender, aksyva)
- `shared/build.sh` : minification CSS (csso) + JS (terser) vers `shared/dist/`, affiche les tailles avant/après avec ratio de compression
- Commentaire catalogue en tête de `shared/components.js` : liste de toutes les fonctions init* avec sélecteur CSS associé et pattern anti-double-bind

### Changed
- `shared/check-sync.sh` : vérifie maintenant la version `@ds-version` sur les 4 fichiers CSS (ds-tokens.css, ds-utilities.css, ds-layout.css, ds-components.css) au lieu de tokens.css seul — compatibilité legacy : accepte toujours un fichier ou un répertoire
- `shared/CONSUMER_GUIDE.md` : section "Sync automatique" avec sync-all.sh, dry-run, consumers.json
- `docs/ARCHITECTURE.md` : sync-all.sh, build.sh, consumers.json ajoutés à la structure

## 2.18.0 — 2026-04-12 — Composants SaaS P1 : wizard multi-step, inline editing, action menu, sidebar rail (#127)

### Added
- `pages/formulaires.html#wizard` : Wizard multi-step — stepper visuel 4 étapes (dots/lignes), panneaux de contenu par étape, boutons Précédent/Suivant, indicateur d'étape, reset sur Terminer
- `pages/formulaires.html#inline-edit` : Inline Editing — texte avec icône crayon → input au clic, sauvegarde/annulation (Enter/Escape), loading state simulé via `data-save-delay`
- `pages/composants.html#action-menu` : Action Menu — bouton ··· → dropdown d'actions (Éditer/Dupliquer/Archiver/Supprimer), item danger, divider, fermeture clic extérieur et Escape, animation scale+opacity
- `pages/navigation.html#sidebar-rail` : Sidebar Rail — démo isolée dans demo-box, sidebar 260px → rail 64px au toggle, tooltips hover en mode rail, bouton chevron animé
- CSS : `.wizard`, `.wizard-steps`, `.wizard-step`, `.wizard-step.active`, `.wizard-step.completed`, `.wizard-content`, `.wizard-panel`, `.wizard-actions`, `.editable-field`, `.editable-text`, `.editable-input-wrap`, `.editable-input`, `.editable-actions`, `.editable-btn`, `.action-menu-wrap`, `.action-menu-trigger`, `.action-menu`, `.action-menu.open`, `.action-menu-item`, `.action-menu-item.danger`, `.action-menu-divider`, `.rail-demo`, `.rail-sidebar`, `.rail-sidebar.collapsed`, `.rail-item`, `.rail-tooltip`, `.rail-toggle` dans `shared/css/components.css`
- JS : `initWizard()`, `initInlineEdit()`, `initActionMenu()`, `initSidebarRail()` dans `shared/components.js` — pattern anti-double-bind `dataset.bound`
- `shared/nav.js` reinitComponents() : appels aux 4 nouvelles fonctions pour compatibilité SPA
- Liens sidebar nav.js : Action Menu, Wizard, Inline Edit, Sidebar Rail

### Changed
- `site.html` : compteur hero 74 → 78 composants, version footer v2.18, hub-cards counts (Composants 4→5, Formulaires 12→14, Navigation 4→5)
- `shared/css/tokens.css`, `utilities.css`, `nav.js` : version bump 2.17.0 → 2.18.0

## 2.17.0 — 2026-04-12 — Composants SaaS P1 : pricing table, notification center, activity feed (#126)

### Added
- `pages/composants.html#pricing` : Pricing Table — grille 3 colonnes (Free/Pro/Enterprise), toggle mensuel/annuel avec remise -20%, plan recommande avec highlight gradient
- `pages/feedback.html#notification-center` : Notification Center — cloche avec badge compteur, panel overlay, items avec dot unread, mark as read individuel et global
- `pages/data.html#activity-feed` : Activity Feed — items avatar + verbe + cible + timestamp, chips de filtre par type, bouton "Charger plus" progressif
- CSS : `.pricing-toggle`, `.pricing-grid`, `.pricing-card`, `.pricing-card--recommended`, `.pricing-price`, `.pricing-features`, `.notif-center`, `.notif-trigger`, `.notif-panel`, `.notif-item`, `.notif-item--unread`, `.activity-feed`, `.activity-item`, `.activity-avatar`, `.activity-filters` dans `shared/css/components.css`
- JS : `initPricing()`, `initNotificationCenter()`, `initActivityFeed()` dans `shared/components.js` — pattern anti-double-bind `dataset.bound`
- `shared/nav.js` reinitComponents() : appels aux 3 nouvelles fonctions pour compatibilite SPA

### Changed
- `site.html` : compteur hero 71 → 74 composants, version footer v2.17
- `shared/css/tokens.css`, `utilities.css`, `components.css`, `nav.js` : version bump 2.16.1 → 2.17.0

## 2.16.1 — 2026-04-12 — Enforcement composants : registre + lint + check-overrides (#125)

### Added
- `shared/components-registry.json` : registre de tous les composants DS (54 composants) avec nom, page thématique, classes CSS principales, fonction JS init
- `shared/check-components.sh` : lint des projets consommateurs — détecte les classes CSS composant-like définies hors DS, support `.ds-allowlist` pour faux positifs, exit codes 0/1
- `shared/check-sync.sh` enrichi : nouveau mode `--check-overrides <répertoire>` pour détecter les redéfinitions de classes DS dans un projet consommateur
- `shared/CONSUMER_GUIDE.md` : section "Règle d'or : pas de composant hors DS" avec workflow complet, référence au registre et aux 3 scripts de vérification

### Changed
- `CLAUDE.md` N2 : étape 8 "Registre" ajoutée au process d'ajout composant, nouveaux fichiers d'outillage dans la section Structure
- `~/.claude/CLAUDE.md` N1 : règle renforcée — vérifier `components-registry.json` avant toute implémentation custom
- `docs/ARCHITECTURE.md` : structure mise à jour avec les nouveaux fichiers d'outillage DX

## 2.16.0 — 2026-04-12 — Header user connecté + theme switcher enrichi (#124)

### Added
- `buildHeader()` dans `nav.js` : lecture de `window.MSYX_HEADER` pour configurer le header dynamiquement (auth, user, notifications, menu)
- `initHeaderUser()` dans `nav.js` : dropdown avatar avec navigation clavier, event `msyx:logout`
- `initHeaderNotifications()` dans `nav.js` : panel popover notifications (liste, badge count, "Tout lire")
- `updateHeaderUser(user)` dans `nav.js` : mise à jour dynamique des infos utilisateur
- `updateNotificationCount(count)` dans `nav.js` : mise à jour dynamique du badge
- `window.__updateHeaderUser(data)` et `window.__updateNotificationCount(count)` dans `nav.js` : APIs publiques pour mise à jour dynamique depuis un projet consommateur
- `renderNotifications(items)` dans `nav.js` : rendu de la liste notifications depuis `window.MSYX_HEADER.notifications.items`
- CSS `.header-user-zone`, `.header-notification`, `.header-notification-badge`, `.header-avatar-trigger`, `.header-dropdown`, `.header-dropdown-item`, `.header-dropdown-header`, `.header-dropdown-divider`, `.header-dropdown-name`, `.header-notif-panel`, `.header-notif-*` dans `layout.css`
- CSS `html.theme-transitioning` dans `layout.css` : transition douce bg/border/color 250ms
- CSS `html.theme-transitioning` avec `*::before` et `*::after` dans `components.css` : couverture complète pseudo-éléments
- `applyThemeTransition()` dans `components.js` : wrapper pour transition + cleanup
- Toast de confirmation au changement de theme et de mode
- Demo interactive dans `navigation.html#header-user` (panel notif + dropdown avatar standalone)
- Lien "Header User" dans NAV_SECTIONS `shared/nav.js`
- Compteur hero `site.html` : 68 → 71

### Changed
- `initThemeSwitcher()` et `initModeSwitcher()` dans `components.js` : enrobés dans `applyThemeTransition()` + toast
- Header version `v2.15` → `v2.16`

## 2.15.1 — 2026-04-12 — DX : Command palette + filtre sidebar + auto-load Ctrl+F

### Added
- `initCommandPalette()` dans `components.js` : overlay global ⌘K/Ctrl+K, index A-Z depuis NAV_SECTIONS, recherche substring groupée par catégorie, navigation clavier Up/Down/Enter/Esc, actions spéciales (toggle sidebar, toggle mode, tout charger)
- Filtre sidebar : input sticky en haut de la sidebar, masquage dynamique des liens non-matchés et des sections vides
- Auto-load Ctrl+F sur `site.html` : intercepte le raccourci pour charger toutes les sections lazy avant l'ouverture de la recherche native
- CSS `.sidebar-filter-wrap` + `.sidebar-filter` dans `layout.css`
- CSS `.cmd-empty` dans `components.css`

### Changed
- Section command-palette dans `divers.html` : description mise à jour, aperçu statique reflète le vrai rendu

## 2.14.3 — 2026-03-31 — ACSSI light mode + nettoyage complet

### Added
- Theme ACSSI light : palette complete (60+ variables) — fond #f0f4f8, accent marine #00345f
- Toggle dark/light fonctionnel pour ACSSI (plus grise)
- Nouveaux tokens RGB : `--deco-violet-rgb`, `--deco-cyan-rgb`, `--text-muted-rgb` (tous themes)
- Semantiques WCAG AA dans le bloc light generique (protection futurs themes)
- Semantiques WCAG AA dans le bloc Nhood light (meme pattern qu'ACSSI)

### Fixed
- Contraste WCAG AA : success/warning/info assombries en ACSSI light (#15803d, #c2410c, #0369a1)
- Contraste WCAG AA : code-string et code-comment assombries (ACSSI + Nhood light)
- badge-neutral : rgba hardcode → `rgba(var(--text-muted-rgb),...)`
- Orbs hero : violet/cyan MSYX hardcodes → `rgba(var(--deco-violet-rgb/--deco-cyan-rgb),...)`
- 13 box-shadow hardcodees → `var(--shadow)` / `var(--shadow-lg)`
- Composants ACSSI light : correction couleurs hardcodees (accordion, badges, pulse-dot, before/after)
- Layout ACSSI light : bordures sidebar/header adaptees au bleu marine

### Removed
- `--bg-page` : variable inutilisee, supprimee (--primary suffit)

## 2.13.1 — 2026-03-30 — Fix tokens ACSSI + scoping layout

### Fixed
- `tokens.css` : ajout `--sidebar-bg`, `--sidebar-link-hover-bg`, `--sidebar-link-active-bg` dans le bloc `[data-theme="acssi"]` (héritage MSYX incorrect)
- `layout.css` : classes showcase (`section`, `.section-header`, `.demo-box`, `.demo-grid`, `.demo-label`, `.demo-row`, `.subsection`, `.subgroup-header`) scopées sous `.main` pour ne pas polluer les projets consommateurs

## 2.13.0 — 2026-03-30 — Extraction modulaire CSS

### Added
- `shared/css/layout.css` — classes layout extraites (header, sidebar, main, section patterns, responsive/theming overrides)
- `shared/css/components.css` — tous les composants UI extraits (buttons, cards, badges, forms, modals, tables, etc.)
- `shared/CONSUMER_GUIDE.md` — guide d'integration pour les projets consommateurs
- `sync.sh` synchronise maintenant 4 fichiers : tokens, utilities, layout, components

### Changed
- `shared/styles.css` reduit a un agregateur mince (imports + base reset)
- Aucun changement visuel — refactoring pur de l'organisation CSS

## 2.12.1 — 2026-03-30 — Infra

### Fixed
- Auth gate Caddy : forward_auth réactivé sur design-system.msyx.fr (bloc manquant)
- Rewrite rules corrigées : / → /site.html (protégé), /index.html → public (login)
- @public matcher : `/index.html`, `/auth/*`, `/favicon.ico` accessibles sans auth
- Forward_auth redirect : vers `/index.html` au lieu de `/login`

## 2.12.0 — 2026-03-30 — Sprint 12

### Added
- Composant Progress Tracker circulaire — ring SVG avec etapes, anneau pourcentage, multi-ring
- Composant Sortable List — drag-and-drop HTML5 avec numerotation auto
- Composant Video Embed — lazy loading iframe, placeholder play, variante card
- Composant Before/After Slider — comparaison avant/apres avec curseur draggable
- Composant Quiz / Poll — questions interactives avec scoring et feedback immediat
- Composant Achievement Badge — grille de badges avec etats locked/unlocked/new, niveaux bronze/silver/gold
- Composant Decision Tree — arbre de decision interactif step-by-step

### Changed
- Compteur : 61 → 68 composants (+7 interactif/e-learning)

## 2.11.0 — 2026-03-30 — Sprint 11

### Added
- Composant Pie / Donut Chart — pie, donut, mini donut, legende interactive
- Composant Gauge / Speedometer — jauge semi-circulaire avec seuils colores
- Composant Comparison Table — tableau comparatif cote-a-cote
- Composant Animated Counter — compteurs animes au scroll (easeOutQuart)

### Changed
- Compteur : 57 → 61 composants (+4 data/viz)

## 2.10.0 — 2026-03-30 — Sprint 10

### Changed
- Catégorie "Divers" renommée "Avancé" avec sous-groupes visuels (Contenu riche + Interaction)
- FAB repositionné : composants.html → feedback.html
- Segmented Control repositionné : navigation.html → composants.html
- Compteurs hub cards ajustés (navigation 5→4, feedback 8→9)

## 2.9.0 — 2026-03-30 — Sprint 9

### Added
- Checklist industrialisée pour l'ajout de composants (CLAUDE.md + ARCHITECTURE.md)
- Section "Process ajout composant" avec les 7 étapes et fichiers à modifier

### Fixed
- Accessibilité charts SVG — `<title>` + `<desc>` + `role="img"` sur 13 SVGs (data.html)
- Navigation clavier carousel — ArrowLeft/ArrowRight + `tabindex="0"` + `role="region"`
- Tooltips accessibles au clavier — `:focus-within` + `role="tooltip"` + `aria-describedby`
- Toasts avec `aria-live="polite"` + `role="status"` pour screen readers
- Header version corrigée (v2.5 → v2.8 → v2.8.1 → v2.9)

### Changed
- @ds-version bump 2.8.0 → 2.9.0

## 2.8.0 — 2026-03-30 — Sprint 8

### Added
- `shared/css/tokens.css` — design tokens extraits, importable séparément par les projets consommateurs
- `shared/css/utilities.css` — classes utilitaires couleur (.text-muted, .bg-accent, .border-default, .sr-only)
- `shared/sync.sh` — synchronise tokens + utilities vers un projet consommateur
- `shared/check-sync.sh` — vérifie si le DS consommé est à jour (@ds-version)
- Section "Consommation" dans fondation.html — guide d'intégration avec exemples visuels et avant/après

### Changed
- `shared/styles.css` devient agrégateur (@import tokens.css + utilities.css)
- Tokens CSS cohérents : --*-rgb sémantiques dans tous les thèmes, tokens overlay (--text-on-accent, --overlay-*)
- Zéro hardcoded white (#fff/white) dans les composants — tout via tokens
- fondation.html documente les 2 modes d'import (tokens seul / DS complet)

## 2.7.0 — 2026-03-28 — Sprint 7

### Added
- Composant Divider — 4 variantes (simple, label central, vertical, gradient)
- Composant Rating — notation étoiles interactive, hover preview, mode read-only, 3 tailles
- Composant Bottom Navigation — barre mobile fixe, icônes + labels, item actif accent, badges
- Composant Number Input — boutons +/-, bornes min/max, step, variantes compact/disabled
- Composant FAB — simple, mini, extended, menu radial avec animations stagger
- Composant Segmented Control — sélection exclusive avec indicateur slide animé, 3 tailles
- Composant OTP / Pin Input — cases séparées, auto-focus, backspace, paste code complet
- Composant Tag Input — ajout/suppression dynamique, anti-doublon, limite max tags
- Composant Tree View — arborescence dépliable, icônes dossier/fichier, sélection item
- Composant Bottom Sheet — panneau slide-up, handle drag, swipe-to-close, contenu scrollable
- Composant Lightbox — galerie plein écran, navigation flèches, clavier, zoom
- Composant Context Menu — clic droit custom, icônes, sous-menus, positionnement viewport-aware

### Changed
- Compteur : 46 → 57 composants (record : +11 en un sprint)
- components.js : 20+ fonctions init* exportées

## 2.6.0 — 2026-03-28 — Sprint 6

### Added
- Composant Breadcrumbs — 4 variantes (simple, home, chevron, responsive collapse) dans navigation.html
- Composant Copy Button — clipboard API, feedback visuel (icone swap + tooltip), integration code blocks
- Composant Chip / Filter Chip — 4 variantes interactives (simple, icone, filter toggle, chip input dynamique)
- Composant Search Input — 3 variantes (simple, suggestions dropdown, compact), navigation clavier, highlight terme
- Composant Data Grid — table enrichie avec tri multi-colonne, filtre texte cumulatif, selection avec indeterminate, header sticky
- Composant Carousel — navigation fleches, dots, auto-play pausable, touch swipe, boucle infinie, 2 variantes (images/cards)

### Changed
- Compteur : 40 → 46 composants
- components.js : 9 fonctions init* exportees (chips, search, data grid, carousel, copy buttons)

## 2.5.0 — 2026-03-28 — Sprint 5

### Added
- Composant Zone Banner — bandeaux colores pour indicateurs d'etat (perte/attention/rentable/info)
- Composant Slider / Range Input — curseur de valeurs numeriques avec sync bidirectionnelle range-number
- Composant Modal / Dialog — `<dialog>` natif avec focus trap, animation et 3 variantes (confirmation, formulaire, information)
- API programmatique `window.__openModal(config)` pour les modals
- Variables RGB semantiques (`--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`)

### Fixed
- Tokenisation complete des rgba accent hardcodes — variable `--accent-rgb` unique par theme
- Les hovers, glows et badges utilisent maintenant la couleur accent du theme actif (plus de bleu residuel sur ACSSI/Nhood)
- Migration des alertes vers les variables RGB semantiques

### Changed
- Compteur : 38 → 40 composants

## 2.4.0 — 2026-03-26 — Sprint 4

### Added
- Header fixe 56px avec logo, selecteur theme, toggle dark/light (toujours visible)
- Navigation continue : lazy-load des 8 categories au scroll (IntersectionObserver)
- Bouton "Tout charger" pour Ctrl+F global sur tous les composants
- Deep-links sub-section : site.html#colors, site.html#buttons, site.html#kanban etc.
- Fade-in animation sur les sections lazy-loadees

### Changed
- Sidebar simplifiee (navigation uniquement, plus de logo/theme)
- Burger mobile integre dans le header
- scroll-margin-top sur section[id] pour compenser le header fixe
- Layout : header au-dessus de sidebar + main
- Hub-cards scrollent vers la section lazy au lieu de naviguer

## 2.3.0 — 2026-03-26 — Sprint 3

### Added
- Infrastructure dark/light : layer CSS [data-mode="light"] generique (~30 variables)
- Toggle sun/moon dans sidebar (grise si theme dark-only)
- THEME_CONFIG JS extensible (modes disponibles par theme)
- Theme Nhood : palette vert fonce #008837 / menthe #73c69c (dark + light)
- Premier theme light du design system
- Documentation theming mise a jour (2 axes : palette + mode)

### Changed
- Sidebar tokenisee (--sidebar-bg, --sidebar-link-hover-bg, --sidebar-link-active-bg)
- Anti-FOUC etendu avec data-mode sur 9 pages
- Transition html etendue (border-color)
- Architecture theming : 2 attributs HTML (data-theme + data-mode), cascade CSS 4 couches
- 2 cles localStorage (msyx-theme + msyx-mode)

## 2.2.0 — 2026-03-26 — Sprint 2

### Added
- Infrastructure theming CSS : ~30 variables etendues dans :root (semantic, code, overlays, charts, hub)
- Mecanisme [data-theme] pour switcher les palettes de couleurs
- Theme ACSSI : palette corporate bleu marine #00345f / or #e0cd1e / blanc #ffffff
- Selecteur de theme dans la sidebar (MSYX / ACSSI) avec persistance localStorage
- Anti-FOUC : script inline dans <head> de toutes les pages HTML
- Section documentation "Theming" dans fondation.html
- Section demo "Theme Switcher" dans composants.html

### Changed
- ~40 couleurs hardcodees remplacees par des variables CSS dans styles.css
- SVG data.html migres vers variables CSS (fill/stroke inline)
- Hub-card icons site.html tokenises
- Compteur hero : 37 → 38 composants
- Contrastes WCAG AA verifies pour le theme ACSSI (15.4:1 texte principal)

## 2.1.0 — 2026-03-20 — Sprint 1
- Migration production : pipeline agentique, GitHub board #7, labels, milestone
- Purge references os-livedemo sur toutes les pages
- Meta description ajoutee sur les 10 fichiers HTML
- Auth gate reactivee (forward_auth Caddy)
- docs/ARCHITECTURE.md cree
- Variables CSS --space-xs a --space-3xl pour harmoniser les espacements
- Accessibilite : focus-visible global, contraste WCAG AA (--text-dim #7c8db5), aria-labels, navigation clavier accordeons/tabs
- Toast notifications interactives : variantes colorees, animations slide-in/out, auto-dismiss, showToast() JS
- Page tokens mise a jour avec echelle spacing et snippet d'import

## 2.0.0 — 2026-03-08 23:30
- Restructuration multi-page : site.html eclate en 8 pages thematiques
- Architecture shared/ : CSS, nav.js et components.js extraits et partages
- site.html transforme en hub avec grille de 8 categories cliquables
- Sidebar dynamique generee par nav.js avec scroll spy et detection page active
- 8 nouveaux composants (29 -> 37) : Dropdown/Select, File Upload, Tooltip/Popover, Command Palette, Drawer, Empty States, Pagination, Spinners/Loading
- Compteur hero mis a jour : 37 composants, 8 pages
- Responsive mobile preservee sur toutes les pages

## 1.2.0 — 2026-03-08 14:00
- Ajout composant Login / Auth : 3 variantes (standard, social, compact inline)
- Ajout composant Calendrier : 5 sous-composants (mensuel, mini, date picker, plage, evenements)
- 2 nouveaux liens sidebar dans la section Formulaires
- Compteur composants mis a jour (27 -> 29)

## 1.1.0 — 2026-03-07
- Ajout categorie TEMPLATES dans la sidebar (4 liens)
- Kanban Board : 4 colonnes avec drag & drop HTML5 natif
- Roadmap : timeline horizontale scrollable Q1-Q4 2026
- Backlog : liste filtrable par priorite (haute/moyenne/basse)
- Sprint Board : header stats, 3 colonnes, burndown chart SVG anime
- Compteur composants mis a jour (23 -> 27)

## 1.0.0 — 2026-03-05 20:00
- Showcase de la charte graphique msyx.design
- Composants Tailwind + palette de couleurs
- Deploy sur os-livedemo.msyx.fr