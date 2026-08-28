# @msyx-dev/react — Releases

Historique des releases du package npm `@msyx-dev/react` (publié sur GitHub Packages, registry `npm.pkg.github.com`, access restricted).

> Pour l'historique du DS CSS distribué (`shared/css/*`, tokens, sync.sh), voir `../../RELEASES.md` à la racine du monorepo.

## v3.0.0-alpha.40 — 2026-08-28 — Lot 1 « décoratifs A » : `<Card>`/`<CardMedia>`/`<Badge>`/`<Avatar>`/`<Divider>` (#871)

### Added
- **`<Card>` + `<CardIcon>`** — `.card` + modificateurs cumulables `flat`/`compact`/`horizontal`/`muted` (toujours ajoutés à `.card`, jamais seuls — vérifié sur le markup réel de `composants.html`, l'exemple `cssClasses.example` du registre qui omet `.card` sur `card-flat` est une erreur de doc préexistante, non reproduite). `href` enveloppe dans `<a class="card-link">` (a11y WAI, focus-visible/hover 100% CSS, aucune logique JS nécessaire). `CardIcon` émet `.card-icon.card-icon--{accent|deco-violet|deco-cyan|deco-pink}` (`utilities.css:296-299`) — `--green` cité dans le HTML de doc (`composants.html:225`) n'a aucune règle CSS déclarée, non repris. **Hors périmètre** : `.hero-*`/`.hub-*`/`.lazy-*`/`.label`/`.number`/`.orb-3`, lumpés dans l'entrée registre `cards` par un artefact de regroupement par fichier CSS (dette déjà tracée #770) — classes de chrome de page (hero, hub, lazy-loader) sans rapport avec le composant `Card` réutilisable.
- **`<CardMedia>` + `<CardThumb>` + `<CardBody>`** — compose `Card` en interne, ajoute `.card-media`. `muted`/`href` cumulables (`composants.html:257,288` : `card card-media card-muted`, `card-link` autour). N'expose PAS `flat`/`compact`/`horizontal` : aucune combinaison de ce type n'existe dans le DS — surface d'API restreinte plutôt que des combinaisons non démontrées.
- **`<Badge>`** — `.badge.badge-{variant}` + `nav` (`.badge-nav`) + `pulse` (`.pulse-dot` décoratif, `aria-hidden`). 6 variantes sémantiques réellement stylées dans `badges.css` (`primary/success/warning/danger/info/neutral`) — **l'issue #871 en annonçait 7** ; grep exhaustif de `.badge-*` sur tout `shared/css/` : aucune 7e classe sémantique n'existe. Divergence documentée, pas de 7e variante inventée.
- **`<Avatar>` + `<AvatarGroup>`** — `.avatar.avatar-{xs|sm|md|lg|xl}` (+`gradient`→`.avatar-gradient`). `src` rend `<img class="avatar-img">` (prioritaire sur `children`). `status` (`online`/`busy`/`offline`) enveloppe dans `.avatar-status.{status}` — compound `.avatar-status.online/.busy/.offline` vérifié manuellement dans `avatars.css` (undetectable par le scanner CSS-side car aucun séparateur entre les deux classes, valeur passée dynamiquement donc jamais vue littéralement par `extractReactClasses` — sous-détection assumée du scanner, pas un cas à whitelister). `AvatarGroup` **composant à part plutôt qu'une prop** : `.avatar-group .avatar` cible un sélecteur descendant côté CSS (relation 1-groupe/N-avatars-frères), qu'une prop sur `Avatar` obligerait chaque enfant à connaître individuellement — même logique de composition que `CardMedia`/`CardThumb`/`CardBody`.
- **`<Divider>`** — sans `label` : `<hr class="divider">`. Avec `label` : `<div class="divider-label">`. Périmètre limité à `.divider`/`.divider-label` (`cssClasses` de l'entrée registre `divider`) : `.divider-gradient`/`.divider-vertical` existent bien dans `feedback.css` et sont démontrés sur la page, mais hors du périmètre explicite de l'issue (« avec et sans libellé ») — non portés plutôt qu'ajoutés sans mandat.
- 5 clés `REACT_TO_REGISTRY` (`bin/generate-registry.js`) : `Card→cards`, `CardMedia→card-media`, `Badge→badges`, `Avatar→avatar`, `Divider→divider`. 5 entrées registre `react: pending → ported`. `node bin/generate-registry.js --check` : rc=0, 0 classe fantôme, 0 dérive.
- 52 tests unitaires (les 5 composants), asservissant les classes réellement émises par variante — pas seulement le rendu par défaut. `npx tsc --noEmit` vert, suite complète du package 75 fichiers/1521 tests verts.
- `packages/react` uniquement → **pas de bump `@ds-version`**, rien dans le `RELEASES.md` racine (#314).

## v3.0.0-alpha.39 — 2026-08-28 — `<ProgressTracker>` : retrait de `.progress-tracker-multi-layout`, classe morte (#889)

### Fixed
- **`<ProgressTracker>` (variante `rings`) émettait `.progress-tracker-multi-layout` sur son wrapper — classe qui n'existe dans AUCUN CSS du DS et qu'aucun hook (vanilla ou React) ne consomme.** Trouvée par le scanner anti-fantôme réparé dans la même PR (#889, côté `bin/`) : contrairement à `.search-with-suggestions`/`.sortable-list--numbered` (deux autres classes sans CSS repérées par la même repasse, mais qui ont chacune un hook `querySelector`/`classList.contains` vanilla réel), aucune occurrence de `.progress-tracker-multi-layout` n'existe ailleurs dans le repo que son émission dans `ProgressTracker.tsx`. Le vanilla de référence (`pages/data.html`) n'a jamais eu de classe à cet endroit — juste un `<div style="display:flex;…">` sans classe, que le wrapper React duplique déjà via son propre style inline. Code mort intégral, retiré du wrapper (le `style` inline existant suffit, calque exact du vanilla). Aucun test n'assertait cette classe (22/22 tests `ProgressTracker` toujours verts).

## v3.0.0-alpha.38 — 2026-08-28 — `<SortableList>` : réordonnancement souris/tactile/clavier (#853)

### Added
- **`<SortableList>`** — premier wrapper React de `.sortable-list*` (`lists.css`), demandé par **KeepThread** pour réordonner les lignes d'une Session pendant une réunion. **Entièrement contrôlé** (`items`+`onReorder`, aucun ordre interne — une réorganisation ne fait QUE calculer le tableau cible et appeler `onReorder`). Trois modes de réordonnancement : **(1)** souris via HTML5 Drag & Drop natif (`.dragging`/`.drag-over`, `aria-grabbed` togglé) ; **(2)** tactile via Pointer Events réimplémenté (`setPointerCapture` + clone DOM fantôme suivant le doigt, calque `<SplitPane>` — `window.__pointerDrag()` non importable côté React) ; **(3)** clavier — **contrat repris à l'identique de #836** côté vanilla (roving tabindex, ↑/↓ déplacent le focus, `Home`/`End` aux extrémités, `Ctrl`+↑/↓ déplace l'item avec annonce `aria-live="polite"` `"<label> déplacé en position N sur M"`). Le focus DOM survit à un `Ctrl`+↑/↓ sans `.focus()` explicite (`key={item.id}`, React réutilise le même nœud). `numbered` (`.sortable-list--numbered`/`.sortable-num`) dérive directement de l'index dans `items`. Zéro classe CSS nouvelle. 32 tests (dont le parcours clavier complet et un audit `axe-core` sur les deux variantes).
- **`sortable-list` passé à `react: "ported"`** dans le registre (`shared/components-registry.json`) + `SortableList` ajouté à `REACT_TO_REGISTRY` (`bin/generate-registry.js`). La région `aria-live` n'émet QUE `.sr-only` — `.sortable-live` du vanilla n'a aucune règle CSS dédiée (hook JS pur) et n'est jamais réémise côté React pour respecter le critère « zéro classe CSS nouvelle chez le consumer ».
- **`jest-axe`** ajouté en devDependency (+ matcher `toHaveNoViolations` câblé dans `src/test-setup.ts`) — premier composant du package à embarquer un audit `axe-core` en test unitaire.

## v3.0.0-alpha.35 — 2026-08-28 — `<Dropdown>`/`<ActionMenu>` : portail hors de `.card` (#856)

> Touche `packages/react/**` ET `shared/css/components/forms.css` + `shared/css/components/overlays.css` + `shared/components.js` (cf. `../../RELEASES.md` racine v2.126.1 pour le détail du défaut et sa gravité réelle).

### Fixed
- **`<Dropdown>`/`<ActionMenu>` : panneau rendu en enfant inline, clippé/incliquable dans une `.card`** — les deux composants rendaient leur panneau (`.dropdown-menu`/`.action-menu`) en `position: absolute` à l'intérieur de leur wrapper contrôlé (`.dropdown`/`.action-menu-wrap`), donc clippé par tout ancêtre `overflow: hidden` (`.card` en particulier, `will-change: transform` piégeant en plus tout `position: fixed` non déplacé du sous-arbre). Constaté en recette `keepthread` : le menu Actions du panneau de détail d'un Périmètre était incliquable à la souris. Les deux composants portent désormais leur panneau via `createPortal` dans `document.body` — même mécanisme que `RiskMatrix`/`HeatmapCalendar`/`Toast` — avec sa position calculée à l'ouverture (`useLayoutEffect`, pas de flash de position) depuis `getBoundingClientRect()` du déclencheur. Le check de clic extérieur (fermeture) a été étendu pour inclure le panneau porté (`menuRef`) : sans ça, tout clic sur une option/un item du panneau porté — désormais hors de `wrapRef` — se serait vu interprété comme "extérieur" et aurait refermé le menu avant la sélection. Aucun changement d'API (`props` inchangées), aucune régression clavier (navigation flèches/Home/End/Escape/focus management inchangés).

## v3.0.0-alpha.37 — 2026-08-28 — `<ActionMenu>` : ancrage droit fragile via `window.innerWidth` (#886)

> Touche `packages/react/**` ET `shared/components.js` (bug jumeau, cf. `../../RELEASES.md` racine v2.126.2 pour le diagnostic complet des 2 causes derrière les échecs CI de `card-floating-panel-clip.spec.ts`, #880/#886).

### Fixed
- **`<ActionMenu>` : position du panneau porté calculée via `right: window.innerWidth - rect.right`** — `window.innerWidth` n'est pas garanti identique au bord droit réel du containing block d'un `position: fixed` (scrollbar classique vs overlay selon l'environnement) : un écart de quelques px suffit à décaler tout le panneau hors de son ancre réelle. Constaté flaky côté vanilla (`openFloatingPanel()`, `shared/components.js`) sur le job `visual` CI, jamais reproduit en local — le même calcul existait à l'identique dans `<ActionMenu>` (`ActionMenu.tsx:163`), corrigé à la volée dans la même PR plutôt que de laisser diverger vanilla et React dès le lendemain du portage #856. Fix : `left` calculé depuis `rect.right - menuRef.current.offsetWidth`, entièrement dans l'espace de coordonnées du déclencheur — plus aucune dépendance à une métrique globale de viewport. Aucun changement d'API, aucun test existant n'assertait l'ancien calcul (`ActionMenu.test.tsx` inchangé, 14/14 verts). `npx tsc --noEmit` + suite complète du package (69 fichiers / 1437 tests) verts.

## v3.0.0-alpha.36 — 2026-08-28 — Lot 0 : assainissement du registre de parité React (#870)

> Touche `packages/react/**` (export public) ET `bin/generate-registry.js`/`shared/components-registry.json` (registre DS, pas de CSS/page/composant vanilla modifié) → **aucun bump `@ds-version`**.

### Fixed
- **`Icon` exporté depuis l'entrée publique du package** — `packages/react/src/icons/Icon.tsx` est consommé par plus de dix wrappers internes (`Calendar`, `Dropdown`, `TreeView`, `TransferList`, `ThemeToggle`, `Accordion`, `SplitButton`, `ContextMenu`, `VersionNotes`, `UserFeedbackButton`…) mais était absent de `index.ts` : `import { Icon } from "@msyx-dev/react"` ne compilait pas chez un consumer, qui devait réécrire son propre `<svg><use href="…/sprite.svg#i-x">` avec le chemin du sprite en dur. `Icon`/`IconProps`/`IconName` désormais exportés. Verrouillé par un nouveau test `src/index.test.ts` qui échoue si l'export régresse.

### Added
- **Détection registre de `Icon`** — `REACT_SRC_ROOT` (`bin/generate-registry.js`) ne scannait que `src/components/`, jamais `src/icons/` : l'entrée `icon` restait `pending` à tort. Ajout d'une résolution de chemin dans `REACT_TO_REGISTRY` : une clé de mapping peut désormais désigner un chemin relatif à `src/` (`icons/Icon`) plutôt qu'un dossier de `src/components/` — un seul point de résolution (`resolveReactCompDir`), sans dupliquer la logique de scan ni désactiver le contrôle anti-fantôme pour cette entrée. `icon` passé à `react: "ported"`.
- **Registre de parité assaini (#870)** : `zone-banner`/`upgrade-prompt` (variantes `.alert--kpi`/`.alert--cta` d'`alert`, #519), `copy-button` (intégré à `code`, même `initCopyButtons`) et `brand-wordmark`/`brand-mark-ds` (déclinaisons du futur `<Logo>`, #878) documentés comme absorbés par un autre composant via le champ `reactComponent` — laissés `react: "pending"`, aucune entrée supprimée (réciprocité section↔registre, DS-PRINCIPLES §6.1). `brand-signature`, `page-content`, `detail-grid`, `motion-replay` reclassés `react: "n-a"` (token/layout/primitive de showcase, DS-PRINCIPLES §8).
- **Parité React** : 55 ported / 99 portables (44 pending, 42 n-a) → **56 ported / 95 portables (39 pending, 46 n-a)**.

## v3.0.0-alpha.34 — 2026-08-28 — `<Timeline>` : fil vertical à deux niveaux, entièrement contrôlé (#852)

> Touche `packages/react/**` ET `shared/css/components/lists.css` (5 nouvelles classes, cf. `../../RELEASES.md` racine v2.126.0).

### Added
- **`<Timeline>`** — premier wrapper React de `.timeline*` (`lists.css`), demandé par KeepThread (msyx-dev/keepthread#32) dont le Journal est cette timeline. Conception tranchée par le challenge de l'issue #852, contre `ActivityFeed` comme socle possible (liste plate, filtrage interne non contrôlé, `load-more` révélant du DOM déjà chargé, `avatar` obligatoire — quatre traits disqualifiants) : **(1)** reprend tel quel le vocabulaire de rendu d'`ActivityFeed` pour les items (`.activity-type-icon`/`.activity-meta`/`.activity-time`/`.activity-tag`, déjà des classes de premier niveau dans `lists.css` — aucune extraction de primitive n'a été nécessaire) ; **(2)** entièrement contrôlé — `compact`/`previewCount` sont des props, aucun état de filtre ni d'expansion interne, le clic sur « Afficher les N autres » ne fait QUE remonter `onExpandGroup` (les items au-delà de `previewCount` ne sont jamais montés dans le DOM, contrairement au `load-more` d'`ActivityFeed`) ; **(3)** regroupement à deux niveaux `groups[].items[]` (un en-tête d'événement porte N items, chacun sur son propre sous-fil). Pas d'`avatar` imposé — `children` est un slot libre. Séparateurs de date (`dateSeparator`) au choix du consumer. 23 tests.
- **`timeline` passé à `react: "ported"`** dans le registre (`shared/components-registry.json`) + `Timeline` ajouté à `REACT_TO_REGISTRY` (`bin/generate-registry.js`).

## v3.0.0-alpha.33 — 2026-08-27 — Test de régression : grille `<Calendar>` transposée (#864)

> Touche `packages/react/**` (test uniquement) ET `shared/css/components/templates.css` (2 entrées, cf. `../../RELEASES.md` racine v2.125.1). Le correctif lui-même vit côté DS CSS ; `Calendar.tsx` n'est pas modifié.

### Fixed
- **`<Calendar>` : régression de test couvrant la grille transposée #864** — le composant émettait déjà le bon markup (`<div role="row">` par semaine, calque JSDoc), mais aucun test ne contrôlait la disposition VISUELLE réelle de la grille CSS ; le défaut (semaines en colonnes au lieu de jours) a donc survécu jusqu'en recette applicative (`keepthread` v0.4.0). Nouveau test `Calendar.test.tsx` : charge le vrai `templates.css` du repo dans jsdom (jamais dupliqué à la main) et vérifie via `getComputedStyle` que chaque `[role="row"]` résout en `display: contents`, puis que le 27 août 2026 (jeudi) atterrit en 4e colonne / 5e ligne d'une grille aplatie à 42 items — pas 6. Confirmé rouge sur `templates.css` d'origine (sans le correctif DS), vert après.

## v3.0.0-alpha.32 — 2026-08-26 — `<Rail>` : nav verticale rétractable (#857)

> Touche `packages/react/**` ET `shared/css/components/navigation.css` (2 entrées, cf. `../../RELEASES.md` racine v2.125.0).

### Added
- **`<Rail>`** — premier wrapper React des familles CSS `.rail-*` (`navigation.css`) et `.sidebar-link-disabled` (`layout.css`), jusqu'ici sans portage (`react: "n-a"`/absentes du registre). **Un seul composant, deux états** — rail compact (64px, icônes + tooltip) et sidebar déployée (260px) sont le même arbre DOM, `.rail-sidebar.collapsed` togglé (voir JSDoc `Rail.tsx` pour la justification complète face à l'alternative « deux composants »). Couvre : items de premier niveau (icône/libellé/actif), sous-entrées imbriquées sur 1 niveau (disclosure `aria-expanded`/`aria-controls`, jamais un lien — ambiguïté clavier navigation-vs-dépli), état désactivé (`aria-disabled` + retiré du tab order, réutilise `.sidebar-link-disabled` telle quelle), zone basse `footerItems` (ex. Paramètres), en-tête de marque, repli/dépli avec tooltip. Contrôlé/non contrôlé sur `collapsed` et `expandedIds` (convention `<Accordion>`/`<TreeView>`). Limite connue documentée en JSDoc et sur #856 (tooltip potentiellement clippé par `.rail-nav` en très longue liste). 24 tests.
- **`sidebar-rail` ajouté à `REACT_TO_REGISTRY`** (`bin/generate-registry.js`) — `react: "ported"`.

## v3.0.0-alpha.31 — 2026-08-24 — 4e thème Auchan dans `<ThemeSwitcher>` (#849)

### Added
- **`<ThemeSwitcher>`/`useTheme()` : thème `auchan` (dark+light)** — `DEFAULT_THEME_CONFIG.auchan = { modes: ["dark", "light"], defaultMode: "dark" }` et libellé `THEME_LABELS.auchan = "Auchan"`. Réplique côté React le 4e thème ajouté au DS CSS (`themes/auchan.json`, tokens `--accent`/`--danger`/`--warning`/`--info`/`--cat-*`/`--chart-*` dédiés, cf. `RELEASES.md` racine). Le select du switcher expose désormais 4 options (MSYX/ACSSI/Nhood/Auchan) par défaut ; les tests existants sur le nombre d'options ont été adaptés en conséquence.

## v3.0.0-alpha.30 — 2026-08-04 — Fiabilisation consumers : erreurs parlantes, screenshot normalisé, parité `SiteHeader` (#799, #803, #802)

> Milestone #47 « Fiabilisation consumers ». Les trois défauts ont été remontés par des consumers réels (`feedbacks`, `cap-transfo`) en migrant vers `SiteHeader`/`UserFeedback` — aucun n'avait été vu par la CI du DS. Ce lot ne touche que `packages/react/`, donc aucun bump `@ds-version` de son fait (cf. #314).

### Added
- **`<UserFeedbackModal>` : la pièce jointe est normalisée avant `onSubmit` — WebP redimensionné, ≤ 512 Ko (#803)** — depuis #714 la modale transmettait le `Blob` brut, jusqu'à 5 Mo et pas nécessairement WebP : chaque app cliente devait donc réimplémenter le même redimensionnement et le même ré-encodage avant de l'envoyer à son backend (le service `feedbacks` attend un WebP ≤ 512 Ko et sert ensuite l'image avec un `Content-Type: image/webp` figé — le dogfooding avait dû désactiver la capture, `allowScreenshot=false`). Désormais `values.screenshot` porte un `File` WebP (renommé `.webp`, donc `FormData.append` et `.name` restent exploitables), redimensionné à 1600 px et plafonné à 512 Ko ; le blob d'origine reste accessible en `values.screenshotOriginal` pour les consumers qui veulent leur propre traitement. Configuration par une seule prop `normalizeScreenshot?: false | { maxBytes?, maxDimension? }` (disponible sur la modale et sur le Provider). L'échelle de réduction est déterministe et bornée à 5 tentatives, sa trace chiffrée est figée en test. **Le contrôle porte sur `blob.type` après `toBlob`, pas sur un `null`** : la spécification HTML impose un repli silencieux sur `image/png` quand le type demandé n'est pas supporté, un contrôle naïf aurait donc livré un PNG étiqueté WebP — c'est-à-dire le défaut même que ce ticket corrige. En cas d'échec de conversion, la politique est fail-closed **sur la pièce jointe seulement** : la capture est abandonnée avec un message distinct selon la cause (décodage, format non supporté, taille inatteignable), et l'envoi du retour reste possible. Module `normalizeScreenshot.ts` pur, avec `decode`/`encode` injectables — 13 tests sans le moindre canvas, exporté publiquement.

### Fixed
- **`<UserFeedbackModal>` : le message d'erreur du consumer remonte enfin à l'utilisateur (#799)** — le `catch` de `handleValidSubmit` n'avait **aucune liaison** : quelle que soit la cause réelle du rejet de `onSubmit` (413, 422, 429, refus de compression, coupure réseau), la modale affichait « L'envoi du retour a échoué. Vérifiez votre connexion et réessayez. ». Un consumer n'avait donc aucun moyen de faire remonter une explication utile, même en levant une `Error` au message explicite — le seul contournement était d'afficher son propre état d'erreur **en dehors** de la modale, c'est-à-dire de renoncer à sa gestion d'erreur. Le défaut a coûté trois jours de diagnostic sur un incident réel où un utilisateur cherchait un problème de connexion pour un refus de taille de pièce jointe. L'erreur est désormais liée et son `message` affiché tel quel lorsqu'il est non vide ; le message générique reste le repli exact pour tout ce qui n'est pas une `Error` porteuse de message (compatibilité : une `TypeError` qui s'échappe continue d'afficher un texte présentable). Reproduction prouvée avant correctif.
- **`<SiteHeader>` : slot `identity.extraItems` (#802)** — un consumer qui composait `<UserMenu>` à la main disposait de son prop `extraItems` ; en migrant vers `<SiteHeader>` — ce que le DS recommande — il le **perdait**, sans équivalent (cas réel : `feedbacks`, lien « retour à l'accueil » piloté par `APP_HOME_URL`/`APP_HOME_LABEL`, débranché en attendant ce ticket). Le slot est ajouté à `SiteHeaderIdentity`, à côté de `roleBadge`, et non à `SiteHeaderProps` : ces entrées n'ont de sens qu'en mode connecté, et ce placement rend impossible de les fournir en mode anonyme (`identity={null}`) ou en chargement (`identity={undefined}`), où elles auraient été acceptées puis ignorées en silence. Passe-plat strict vers `<UserMenu extraItems>` — le séparateur supplémentaire et l'intégration à la navigation clavier restent la propriété de `UserMenu`, rien n'est dupliqué ; la traversée clavier est néanmoins prouvée de bout en bout depuis `SiteHeader`.

### Changed
- **JSDoc de `<UserFeedbackModal>` corrigée** — la documentation de classe promettait encore une transmission de la pièce jointe « sans re-encodage » (#714), affirmation devenue fausse par défaut avec #803. Relevé en review.

## v3.0.0-alpha.29 — 2026-07-27 — `useTheme` écrasait le `data-theme`/`data-mode` d'un consumer mono-thème (#793)

> Régression introduite par le correctif #785 (alpha.28), signalée par cap-transfo (thème NHOOD). Ce lot ne touche que `packages/react/`, donc aucun bump `@ds-version` de son fait (cf. #314).

### Fixed
- **`useTheme` : l'effet de montage écrasait le `data-theme`/`data-mode` déjà posé par un consumer mono-thème sans `localStorage` (#793)** — #785 avait ajouté l'appel `applyThemeAttr`/`applyModeAttr` dans l'effet de montage pour éviter que React réconcilie et efface l'attribut posé par le script anti-FOUC (bug alpha.27 → alpha.28). Mais quand le storage est vide, l'état initial React (`msyx`/`dark`) était appliqué tel quel au DOM — un consumer mono-thème qui pose `data-theme="nhood"` sur `<html>` au boot sans jamais écrire `localStorage['msyx-theme']` (pas de sélecteur de palette) se retrouvait donc avec son thème effacé et retombé sur `msyx` dès l'hydratation. Signalé par cap-transfo (thème NHOOD, cap-transfo#431). Correctif : ordre de priorité d'initialisation `localStorage` > attribut déjà porté par `<html>` > défaut, appliqué symétriquement au thème **et** au mode (le même défaut existait sur `data-mode`, latent côté cap-transfo car son toggle écrit `msyx-mode`). Un `data-theme` consumer absent de la config par défaut (`DEFAULT_THEME_CONFIG`) est désormais respecté, pas écrasé — c'est le cas d'usage central du ticket. `applyThemeAttr`/`applyModeAttr` restent appelés (acquis #785), idempotents quand la valeur retenue vient déjà du DOM. Même traitement pour le cas où `localStorage.getItem` **lève** (mode privé strict, storage désactivé) : l'effet ne sort plus prématurément — un storage qui lève est un storage muet, le DOM du consumer fait donc foi comme quand les clés sont absentes, au lieu de laisser l'état React sur `msyx`/`dark` en divergence avec ce que porte `<html>` (relevé en review). Reproduction prouvée avant correctif (3 tests rouges sur le code d'origine, +1 pour le cas storage-qui-lève), 21/21 verts après. 6 nouveaux tests dédiés dans `useTheme.test.tsx`, les 15 existants inchangés.

## v3.0.0-alpha.28 — 2026-07-27 — Correctif critique : `useTheme` perdait le mode clair à chaque rechargement (#785, #783)

> Sprint 7. Un seul correctif fonctionnel, mais un **bug de production** rapporté par un utilisateur externe (cap-transfo, préprod) — traité en priorité. Ce lot ne touche que `packages/react/`, donc aucun bump `@ds-version` de son fait ; le DS CSS a par ailleurs été publié en **2.119.0** dans ce même sprint (#777/#781/#744), voir `../../RELEASES.md`.

### Fixed
- **`useTheme` : le mode (et le thème) n'étaient jamais appliqués au DOM au montage (#785)** — bug de production. L'effet de montage lisait `localStorage` et mettait à jour l'état React (`setThemeState`/`setModeState`), mais n'appelait jamais `applyThemeAttr`/`applyModeAttr`. React réconciliant les attributs de `<html>` à l'hydratation, le `data-mode` posé par le script anti-FOUC (avant paint) était systématiquement effacé et jamais reposé : **le mode clair était perdu à chaque rechargement de page, dans toutes les apps consommatrices**. Correctif appliqué symétriquement au thème ET au mode (le rapport ne mentionnait que le mode, mais l'omission était identique sur les deux). SSR-safety préservée, défaut implicite conservé (`dark`/`msyx` → attribut absent). Reproduction prouvée avant correctif (version pré-fix restaurée → 2 tests rouges), 15/15 verts après. Nouveaux tests dédiés dans `useTheme.test.tsx`.
- **`<VirtualList>` : JSDoc corrigée (#783)** — la prémisse du ticket d'origine était fausse (JSDoc prise pour du code) : le composant n'émettait déjà plus le wrapper `.virtual-list-rows` (retiré côté vanilla en #776), seule la documentation en ligne décrivait encore ce markup obsolète. Doc alignée sur le comportement réel, aucun changement de code.

## v3.0.0-alpha.27 — 2026-07-27 — `<ContextMenu>` : navigation clavier du sous-menu (#773)

> Sprint 6 « Fin de backlog ». Un seul port : la limite a11y assumée du sous-menu contextuel (« ouverture clavier impossible », #468) est levée, en parité avec le correctif vanilla #750 livré en DS 2.117.0. Ce lot ne touche que `packages/react/`, donc aucun bump `@ds-version` de son fait — le DS CSS a par ailleurs été publié en **2.118.0** dans ce même sprint (#775/#776/#770), voir `../../RELEASES.md`.

### Added
- **`<ContextMenu>` : navigation clavier du sous-menu, parité #750 (#773)** — la limite « sous-menu au survol uniquement, ouverture clavier impossible » (#468) est **levée** : `.context-submenu` a désormais une classe d'état **`.show`** côté vanilla (`initContextMenu`, #750) et le wrapper React la reproduit à l'identique. Roving tabindex par niveau de menu (un seul item du niveau courant à `tabindex=0`, racine et sous-menu indépendants) ; `ArrowRight`/`Entrée`/`Espace` sur un item porteur d'un sous-menu (`aria-haspopup="menu"`, était `"true"`) **ouvre systématiquement** le sous-menu — pose `.show` sur `.context-submenu` + `aria-expanded="true"` sur l'item parent — et focus impérativement son premier item (**jamais** d'activation directe de `onSelect` au clavier pour un item porteur d'un sous-menu, calque exact `initContextMenu` qui n'appelle `item.click()` que pour les items SANS sous-menu) ; `ArrowLeft` referme le sous-menu et rend le focus à l'item parent ; `Escape` referme d'abord le sous-menu ouvert le plus profond (le menu racine reste `.show`), sinon tout le menu (cascade, calque `initContextMenu`).
  - **`stopPropagation()` obligatoire** sur les handlers de sous-menu : `.context-submenu` est un descendant DOM du `.context-menu-item` parent (contrainte HTML — un `<button>` ne peut pas contenir de contenu interactif), donc un `keydown` sur un sous-item remonte AUSSI au `onKeyDown` du parent sans elle, provoquant une double navigation (bug intercepté par les tests avant merge, pas en prod).
  - Tests dédiés assertant `.show` **dans les deux sens** (présente à l'ouverture clavier, absente à la fermeture `ArrowLeft`/`Escape`) — pas seulement l'ARIA, rejeu du principe anti-`<ActionMenu>`/`<Graph>`.
  - 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).

## v3.0.0-alpha.26 — 2026-07-27 — Sprint 4 « Parité React — fin de milestone » : JsonViewer, SplitPane, Calendar, TimePicker (#596/#595/#760/#761)

> 4 nouveaux composants portés, release consolidée en fin de sprint (versionnage volontairement différé ticket par ticket, cf. #314). **Ce lot solde le milestone « Parité React » (Epic #396, 78/78 sous-issues).**

### Added
- **`<Calendar>` (#760)** : port React du date-picker INLINE, modes `single` et `range` (`formulaires.html` #calendar, calque `initCalendar` — `shared/components.js:5151-5424`). Le time-picker (`initTimePicker`) n'est **pas** couvert ici (#761, ticket séparé, scindés depuis #628). Émet `.cal-wrap`/`.cal-header`/`.cal-nav`/`.cal-weekdays`/`.cal-grid` (`role="grid"`/`"row"`/`"gridcell"`), grille 42 cellules (6×7, lundi en 1re colonne) construite à la main — **zéro dépendance** (pas de `date-fns`/`dayjs`, comme le vanilla).
  - **⚠️ `.range-start`/`.range-end` portent AUSSI `.selected`** : calque exact `classList.add('range-start','selected')`/`'range-end','selected'` — un wrapper qui n'émettrait que la classe de bord casserait visuellement les extrémités du range tout en restant ARIA-valide (classe de bug déjà vécue `<ActionMenu>`/`<Graph>`). Tests dédiés assertant les DEUX classes simultanément sur chaque extrémité.
  - **Range d'un seul jour** (`start === end`) : la cellule reçoit `.range-start`+`.selected` mais **jamais** `.range-end` — précédence `if`/`else if` iso-vanilla (`sameDay(rangeStart)` testé avant `sameDay(rangeEnd)`), testé explicitement.
  - **Machine 2-clics** (`computeNextRange`, pure) : reset si aucun `start`, si la plage est déjà complète, ou si le clic précède `start` ; sinon complète la plage. `onChange` (range) livre `{ start, end }` avec `end: Date | null` — appelé à **CHAQUE** clic (1er clic, complétion, reset), pas seulement à la complétion. Le `CustomEvent('calendar:change')` DOM du vanilla n'est dispatché QUE pour une plage complète, mais le vanilla `render()` sa grille (retour visuel immédiat sur `rangeStart`/`rangeEnd`) à chaque clic : l'absence d'événement DOM ne signifie pas absence de retour visuel. Un composant React **contrôlé** n'a pas cet état interne (`value` appartient au parent) — si `onChange` ne fire qu'à la complétion, le 1er clic resterait invisible en mode contrôlé, rompant la parité avec le vanilla. `onChange` fire donc à chaque étape ; un consumer qui ne veut que les plages complètes filtre sur `end !== null`.
  - **Roving tabindex** : une seule cellule à `tabIndex=0` (`computeTabbableKey` : cellule focusée si visible, sinon `.today`, sinon 1er jour du mois — calque exact du fallback `render()` vanilla). Le focus est déplacé impérativement via `ref.focus()` (`useLayoutEffect` + ref de focus en attente) pour la navigation clavier ; le clic, lui, focus nativement la cellule (tout `.cal-day` porte un `tabIndex`, y compris `-1`) — aucun appel `.focus()` explicite au clic, iso-vanilla.
  - **Clavier grille** (calque exact) : `←/→/↑/↓` (jour/semaine), `Home`/`End` (lundi/dimanche de la semaine), `PageUp`/`PageDown` (mois), `Entrée`/`Espace` (sélection, no-op sur `.other-month`). `Échap` et toute autre touche : no-op (calendrier INLINE, pas de popover à fermer).
  - **Mois affiché** — non contrôlé par défaut (`defaultReferenceMonth`, @default mois courant réel) + contrôlé via `referenceMonth`/`onReferenceMonthChange` (convention alignée sur `<SplitPane ratio>`/`<Accordion openIds>`).
  - **Légende optionnelle** (`legend`) : `.cal-legend`/`.cal-legend-item`/`.cal-legend-dot`, couleur posée en `style` inline (cette classe n'a **aucun** `background` par défaut dans le DS — même piège que `<FileUpload>`). Les marqueurs `.cal-dots`/`.cal-dot` par jour ne sont **pas** portés : `initCalendar` n'a aucune logique pour eux (markup mort côté JS, uniquement illustré statiquement dans la démo `formulaires.html`), hors contrat du composant source.
  - Registre : `REACT_TO_REGISTRY:{Calendar:'calendar'}` + entrée `calendar` passée en `react:"ported"` (même PR, DS-PRINCIPLES §8.1). `.cal-prev`/`.cal-next` ajoutées à `REACT_CSS_UNDETECTABLE` (hooks JS query-selector du vanilla, sans règle CSS dédiée — le style vient de `.cal-nav button`).
  - 100 % `packages/react/` — aucun bump `@ds-version`.
- **`<JsonViewer>` (#596)** : port React de l'arbre JSON repliable en lecture seule (`divers.html` #json-viewer, calque `initJsonViewer` — `shared/components.js:6025-6314`). `data` est une valeur JS **déjà résolue** (pas la chaîne `data-json`/`<script type="application/json">` du vanilla) — normalisée via un aller-retour `JSON.stringify`/`JSON.parse` qui détecte au passage les valeurs non sérialisables (`undefined` racine, référence circulaire, `BigInt`…) et les rend en `.json-viewer-error`, équivalent du bloc `catch` vanilla. Gère les 6 types de valeur (objet, tableau, string, number, boolean, null) ; index de tableau rendu comme une clé **quotée** (`"0"`, `"1"`…), calque exact du vanilla (pas la convention usuelle d'un highlighter JSON). Toolbar « Tout déplier »/« Tout replier » optionnelle (`toolbar`, défaut `true`), « Tout replier » garde la racine ouverte (iso-vanilla). Navigation clavier WAI-ARIA Tree complète (roving tabindex : ↓/↑/→/←/Home/End/Entrée/Espace), déjà présente côté vanilla.
  - **`.open` va sur `.json-node` (le PARENT)** ; `.json-children` porte la classe `"open"` **en dur** (jamais togglée) — le CSS masque via `.json-node:not(.open) > .json-children { max-height: 0 }`. Poser `.open` sur `.json-children` au lieu du `.json-node` = composant visuellement mort (rejeu de l'incident `<ActionMenu>`). Tests **négatifs** dédiés (assertion `.open` absent à l'état replié, pas seulement `aria-expanded`).
  - **Trouvaille de parité** : la fonction `isVisible()` du vanilla est en pratique du **code mort** (elle teste que `.json-children` n'a pas la classe `open`, qui — voir ci-dessus — l'a toujours) : la navigation clavier ↓/↑/Home/End traverse donc aussi les sous-arbres visuellement repliés, y compris côté React (comportement copié tel quel, source de vérité = le code vanilla, pas l'intention supposée).
  - **Expansion** — non contrôlée par défaut, graine `defaultExpandedDepth` (défaut `Infinity`, tout déplié comme le vanilla qui n'a aucune troncature). **Contrôlée** via `expandedPaths`/`onExpandedChange` — convention alignée sur `<Accordion openIds>` (multi-ouverture indépendante), pas sur `<TreeView selectedId>` (sélection unique), car plusieurs nœuds JSON peuvent être ouverts simultanément comme plusieurs items d'accordéon.
  - **Classes non émises** : `.json-tree`, `.json-node--last`, `.json-close-punct` — grep sur `shared/css/**` confirme qu'aucune des trois n'a de règle CSS (crochets JS morts du vanilla, absentes aussi du registre `cssClasses` de `json-viewer`). Le rôle ARIA `role="tree"` est conservé sur un `<div>` non classé.
  - Registre : `REACT_TO_REGISTRY:{JsonViewer:'json-viewer'}` + entrée `json-viewer` passée en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).
  - 100 % `packages/react/` — aucun bump `@ds-version`.
- **`<SplitPane>` (#595)** : port React des panneaux redimensionnables (`divers.html` #splitter, calque `initSplitPane` — `shared/components.js:5713-5799`). Émet `.split-pane`/`.split-panel`/`.split-panel--fluid`/`.split-gutter`, panneau `first` seul piloté par `flex-basis: {ratio}%` (le second, `.split-panel--fluid`, absorbe le reste — iso-vanilla).
  - **Drag réimplémenté en Pointer Events** : le vanilla délègue à `window.__pointerDrag()`/`window.__registerInstance()`, primitives globales du DS **non disponibles** côté React. Comportement reproduit à l'identique (`setPointerCapture`/`releasePointerCapture` sur le gutter, axe contraint par `orientation`, ratio recalculé depuis `getBoundingClientRect()` du conteneur), sans importer les globals.
  - **`aria-orientation` — piège volontaire conservé** : pour un split **vertical**, `aria-orientation` vaut `"horizontal"` (et inversement) — l'attribut décrit l'orientation du **séparateur**, pas celle du split (`vertical ? 'horizontal' : 'vertical'`, calque exact). Test dédié + commentaire pour ne pas l'inverser plus tard.
  - **Classe d'état `.split-pane--dragging`** : posée sur `.split-pane` pendant le drag, retirée à la fin (iso-vanilla). Cette classe n'a **aucune règle CSS** dans le DS aujourd'hui (bug suivi séparément, **#763**) — émise quand même côté React (parité), `.split-pane--dragging` ajoutée à `REACT_CSS_UNDETECTABLE` (`bin/generate-registry.js`) avec référence explicite à #763.
  - **Ratio** — non contrôlé par défaut (`defaultRatio`, @default 50) + contrôlé via `ratio`/`onResize` (convention alignée sur `<Accordion openIds>`). Clavier : `ArrowLeft`/`ArrowRight` (horizontal) ou `ArrowUp`/`ArrowDown` (vertical) par pas de 2, `Home`→`min`, `End`→`max` (défauts 15/85).
  - **Persistance `persistKey`** : restaurée dans un `useEffect` de montage (mode non contrôlé uniquement, SSR-safe — calque `VersionBadge`), réécrite à chaque déplacement ; la restauration initiale ne réécrit pas `localStorage` (iso-vanilla `persist:false`).
  - Registre : `REACT_TO_REGISTRY:{SplitPane:'splitter'}` + entrée `splitter` passée en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).
  - 100 % `packages/react/` — aucun bump `@ds-version`.
- **`<TimePicker>` (#761)** : port React du sélecteur d'heure 24h/12h AM/PM (`formulaires.html` #time-picker, calque `initTimePicker` — `shared/components.js:5427-5538`). Émet `.time-input-wrap[data-time][data-format]`/`.time-sep` (`components/templates.css:125-127`).
  - **Composition, pas réimplémentation** : les steppers heures/minutes délèguent entièrement à `<NumberInput>` (déjà porté) et le groupe AM/PM à `<SegmentedControl>` (déjà porté, décision ARIA #613) — aucune logique de clamp/step/ARIA dupliquée.
  - **Écarts de composition documentés** (JSDoc `TimePicker.tsx`, aucun contournement silencieux) : (1) `<NumberInput>` n'expose pas de passthrough `data-*` sur sa racine fixe → chaque instance est enveloppée dans un `<div data-time-part="hh"|"mm">` sans classe/style, transparent pour le sélecteur descendant `.time-input-wrap .number-input-wrap` et pour le layout flex ; (2) les boutons +/- de `<NumberInput>` posent des `aria-label` génériques et non paramétrables (`"Diminuer"`/`"Augmenter"`) là où le vanilla les qualifie par champ (`"Diminuer les heures"`) — étendre `<NumberInput>` (partagé par ~10 consumers) est hors périmètre de ce ticket ; (3) `<SegmentedControl>` n'expose pas de `data-*` par option (`data-ampm` vanilla non reproductible, cibler `role="radio"`/libellé à la place) et rend toujours un `.segmented-indicator` que le vanilla omet volontairement pour cette instance (`initSegmentedControls` saute les groupes sans indicateur, ARIA géré à la main côté vanilla) — additif et décoratif (`aria-hidden`), `.segmented-item.active` + `aria-checked` + roving tabindex restent identiques bit-à-bit.
  - **Bornes — PAS de wrap-around** (vérifié dans `clamp()` vanilla, `components.js:5471-5473` : simple `Math.min(max, Math.max(min, val))`) : 23h+1 reste **23**, 55min+5 (step 5) reste **59** — jamais de report sur les heures ni de retour à 0. Bornes heure selon le format : 0-23 (24h) / 1-12 (12h) ; minutes toujours 0-59, `step` configurable via `minuteStep` (défaut 5, aligné démo).
  - **Format de sortie** : `HH:MM` (24h) ou `HH:MM AM|PM` (12h), zero-paddé sur la valeur BRUTE de l'heure (calque exact de `sync()`, pas de conversion 12h→24h).
  - **Contrôlé/non contrôlé** : `value`/`onChange` vs `defaultValue`, convention alignée sur `<SplitPane ratio/defaultRatio>`. Contrairement au vanilla (`sync()` appelée une fois au montage), `onChange` ne fire qu'après interaction utilisateur — convention du package, le consumer connaît déjà la valeur initiale via `value`/`defaultValue`.
  - Registre : `REACT_TO_REGISTRY:{TimePicker:'calendar'}` — **co-localisé** avec `<Calendar>` (#760) dans la MÊME entrée registre `calendar` (le vanilla ne fait qu'une section pour date-picker + time-picker), pattern déjà établi par `ThemeToggle`/`ThemeSwitcher` et `VersionBadge`/`VersionNotes`. Entrée `calendar` passée en `react:"ported"`.
  - 100 % `packages/react/` — aucun bump `@ds-version`.

### Notes
- **Milestone « Parité React » soldé** (Epic #396, 78/78 sous-issues fermées) — ce lot de 4 ports clôt le dernier lot restant de la roadmap de parité CSS↔React.
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).

## v3.0.0-alpha.25 — 2026-07-26 — Sprint 3 « React interactifs » : ContextMenu, Accordion, SplitButton, MentionInput (#468/#461/#600/#594/#743)

> 4 nouveaux composants interactifs portés + 1 correctif a11y. Aucun bump `@ds-version` : le DS CSS n'a pas été modifié (le sprint est 100 % `packages/react/`, hors outillage CI #745).
>
> **Note de sécurité** : `<MentionInput>` **ne reproduit pas** la faille XSS du vanilla ([#746](https://github.com/msyx-dev/design-system-project/issues/746)) — le surlignage est construit en JSX (échappé par React), là où `highlightMatch` de `shared/components.js` injecte via `innerHTML`. Le wrapper React est donc, sur ce point, plus sûr que le composant vanilla qu'il porte, jusqu'à correction de #746.

### Added
- **`<ContextMenu>` (#468)** : port du menu contextuel (clic droit) `initContextMenu`. Zone cible via `onContextMenu` ; panneau `.context-menu` TOUJOURS monté, visibilité pilotée par la classe **`.show`** (≠ `.open` d'`<ActionMenu>`) — `overlays.css` base `display:none` → `.show{display:block}`. Positionnement `position:fixed` + bornage 8px du viewport reproduit fidèlement (`clampToViewport()`, fonction pure co-localisée, testée isolément — jsdom renvoie `offsetWidth`/`offsetHeight` à 0). Fermeture : clic gauche hors du panneau, clic droit hors de la zone (une seule instance ouverte à la fois), `Escape` (+ restauration focus). **Au-delà du vanilla** (DS-PRINCIPLES §3.2 / #613) : navigation clavier WAI-ARIA APG Menu (↑/↓ bouclants, `Home`/`End`, `Entrée`/`Espace`). Items feuilles = `<button role="menuitem">` (focus natif `:focus-visible`) ; item parent de sous-menu = `<div role="menuitem" aria-haspopup="true" tabIndex={-1}>` (contrainte HTML : un `<button>` ne peut pas contenir de contenu interactif, et le CSS DS exige que `.context-submenu` soit un enfant direct du `.context-menu-item`).
- **`<Accordion>` (#461)** : port React des sections repliables (`divers.html` #accordion). Calque de la logique **inline d'`initComponents`** (`shared/components.js:121-140`) — il n'existe PAS de fonction `initAccordion`, le titre de l'issue vient d'un audit automatique. Data-driven (`items: {id,title,content,defaultOpen}[]`), **multi-ouverture indépendante** (iso-vanilla : rien ne ferme les frères, aucune prop d'exclusivité), ouverture **non contrôlée** par défaut (graine `item.defaultOpen`) ou **contrôlée** via `openIds` + `onOpenChange` (convention alignée sur `<TreeView selectedId>`).
- **A11y montée au pattern WAI-ARIA APG « Accordion »** (`<Accordion>`, #461) : `aria-expanded`, `aria-controls`, panneau en `role="region"` + `aria-labelledby`, ids `useId()` (uniques entre instances, SSR-safe), heading enveloppant configurable (`headingLevel`, défaut `"h3"`, `"div"` pour l'opt-out). Zéro impact visuel : aucun de ces attributs n'a de sélecteur CSS, et le heading est neutralisé par le reset `* { margin:0; padding:0 }` de `base.css` + le `font-size` en `rem` de `.accordion-header`.
- **`Icon`** (interne, #461) : glyphe `chevron-down` ajouté (path copié depuis `shared/icons/sprite.svg`) — la flèche reste **auto-contenue**, sans `<use href="/shared/icons/sprite.svg#…">` (contrat #713).
- **`<SplitButton>` (#600)** : port React du composant vanilla `split-button` (`pages/composants.html` #split-button, calque `initSplitButton` — `shared/components.js:3881-3983`). Action primaire + caret ouvrant un panneau bâti sur le primitif **canonique** `.menu`/`.menu-item`/`.menu-divider` (#520), **pas** les alias `@deprecated` `.action-menu-*` qu'émet `<ActionMenu>` (structures incompatibles : composant indépendant, aucune composition). `variant` restreint à `"primary" | "secondary"` — seules variantes couvertes par `buttons.css:122-123` (`.split-button > .btn-*:first-child`). **Non contrôlé** (état d'ouverture interne, comme `<ActionMenu>`/`<UserMenu>`). Couverture test du glyphe `chevron-down` (déjà ajouté à `Icon.tsx` par #461) complétée à cette occasion.
- **`<MentionInput>` (#594)** : port React du composant vanilla `mention` (`initMentionInput`). Autocomplete `@` inline sur textarea contrôlé, dropdown positionné **au caret** — le mirror-div de `shared/components.js` n'étant pas importable (script global, pas un module ESM), il est **réimplémenté dans le package**, sans dépendance npm. Découpe imposée : tout le calcul est **pur et testé en Node** (`mention-core.ts` — détection du token, filtre, insertion + position de caret, projection rect→style, calque de `viewport.js`/`clampZoom`), seule la lecture des offsets du miroir reste DOM (`caret-position.ts`, non testable en valeur — jsdom renvoie 0).
  - **Classes d'état** : `.mention-dropdown.open` (convention **inverse** de `.search-suggestions.hidden` de `<SearchInput>`) et `.search-item.active`. Les tests assertent les classes réelles **et l'absence** de `hidden`/`mention-dropdown--open`/`show`.
  - **Contrat de données** : `suggestions` fourni par le consumer (le DS ne fetch rien), filtre interne par défaut, `filter={false}` + `onQueryChange` pour une source distante. `ariaLabel` **requis** (typecheck, précédent `<Graph>`) — le vanilla ne pose aucun nom accessible sur le textarea.
  - **Écarts assumés avec le vanilla** (documentés, en faveur du port) : pas d'`innerHTML` pour le surlignage (le vanilla injecte du HTML consumer non échappé — XSS #746, hors périmètre ici), `try/finally` autour de la mesure (le vanilla peut laisser un miroir fantôme dans `<body>`), `useId()` au lieu de `Math.random()`. Défauts vanilla relevés et **non corrigés ici** — tickets de suite proposés dans le groom de #594.
  - Registre : `REACT_TO_REGISTRY:{MentionInput:'mention'}` + entrée `mention` en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).

### Fixed
- **`<SegmentedControl>`** : garde-fou roving tabindex (#743, review adversariale F4 de #613/#742) — si `value` ne correspond à aucune `option.value`, tous les boutons tombaient à `tabIndex={-1}` et le `radiogroup` devenait inatteignable au clavier. Désormais la première option non `disabled` reçoit `tabIndex={0}` (`aria-checked` reste `false`) ; si toutes les options sont `disabled`, aucun `tabIndex={0}` n'est posé (groupe inerte). Aligné sur le garde-fou déjà présent côté vanilla (`initSegmentedControls`, `shared/components.js`).

### Notes
- ~~**Limite assumée** : sous-menu ouvert au survol CSS uniquement — `overlays.css` n'expose aucune règle d'état sur `.context-submenu` (seulement `:hover >`), l'ouverture clavier du sous-menu est donc hors périmètre (CSS nouveau interdit dans ce ticket). Ticket de suite à créer côté DS CSS.~~ **Levée** : `overlays.css` expose désormais `.context-submenu.show` (#750, DS 2.117.0) et le wrapper React porte la navigation clavier correspondante — voir « Unreleased (next alpha) » ci-dessus (#773). `aria-haspopup` du parent est passé de `"true"` à `"menu"` à cette occasion (parité vanilla).
- Pas de portal : rendu in-place, `position:fixed` peut être décalé par un ancêtre `transform`/`filter`/`contain` (comportement CSS standard).
- Registre : `REACT_TO_REGISTRY:{ContextMenu:'context-menu'}` + entrée `context-menu` passée en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).
- **`<Accordion>` (#461)** — Classe d'état `.open` sur le `.accordion-item` (le PARENT), jamais sur `.accordion-header` — les deux seuls sélecteurs du DS sont `.accordion-item.open .accordion-body` et `.accordion-item.open .accordion-arrow` (`components/lists.css:44-52`). Un test **négatif** verrouille l'absence de `.open` sur l'en-tête et de toute variante inventée (`.accordion--open`, `.accordion-item--open`, `.active`), pour ne pas rejouer l'incident `<ActionMenu>`.
- **`<Accordion>`** : pas de conteneur `.accordion` (la classe n'existe pas dans le DS, la racine ne porte que le `className` du consumer). Pas d'animation de hauteur : le DS fait un `display:none → block` sec, seule la flèche a une transition.
- **`<Accordion>` — écart assumé vs APG** : l'en-tête reste un `<div role="button" tabindex="0">` (iso-vanilla). Un `<button>` natif hériterait de la bordure UA `outset`, de la police système et de `color: ButtonText` — **ce dernier cassant le dark mode** — car le DS n'a aucun reset global `button` et `.accordion-header` ne déclare ni `border`, ni `font-family`, ni `color`. Le corriger imposerait de modifier `lists.css` (bump `@ds-version`) → ticket DS dédié, pas ici.
- **`<Accordion>` — drift repéré, hors périmètre** : la démo vanilla `pages/divers.html` a oublié `accordion-arrow` sur ses `<svg class="icon icon--sm">` → rotation morte sur la page (le registre, lui, est correct). Le wrapper React émet bien la classe. Correction de la démo = ticket séparé.
- Registre : `REACT_TO_REGISTRY:{Accordion:'accordion'}` + entrée `accordion` en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).
- **`<SplitButton>` (#600)** : classe d'état `.open` posée sur `.split-button__menu` **uniquement** (`buttons.css:170`) — jamais sur `.split-button`, jamais sur `.split-button__caret`. Le panneau reste **toujours monté** (bascule de classe, pattern `Drawer`/`BottomSheet`) pour préserver la transition CSS de sortie. Tests dédiés à cette garde (incident `<ActionMenu>` #612). A11y : pattern WAI-ARIA APG « Menu Button » (`aria-haspopup="menu"` + `aria-expanded` + `role="menu"`/`menuitem`), conforme au vanilla. `docs/DS-PRINCIPLES.md` §3.2 (`radiogroup`) ne s'applique pas : un split-button est un menu d'actions, pas un choix exclusif. Ajouts vs vanilla : `aria-labelledby`/`aria-controls` entre caret et panneau, roving `tabindex="-1"` sur les items, `inert` sur le panneau fermé. Registre : `REACT_TO_REGISTRY:{SplitButton:'split-button'}` + entrée `split-button` en `react:"ported"` (même PR, DS-PRINCIPLES §8.1) ; `'menu'` ajouté à `REACT_KNOWN_SINGLE` (classe mono-mot émise par le panneau).

## v3.0.0-alpha.24 — 2026-07-26 — Modal aria-labelledby + Input .input-disabled (#613)

> Alignement sur la convention ARIA radiogroup tranchée pour le DS vanilla (#613) : le wrapper `<SegmentedControl>` était déjà conforme, aucun changement fonctionnel n'y est apporté (seules les assertions de test d'absence des conventions abandonnées ont été ajoutées). Les 2 seuls changements de comportement du package concernent `<Modal>` et `<Input>`.

### Changed
- **`<Modal>`** : le `<dialog>` porte désormais `aria-labelledby` via `useId()`, associé à un `<span id={titleId}>` autour du `title` — accessible name explicite pour les lecteurs d'écran (posé avant `{...rest}`, donc surchargeable par l'appelant).
- **`<Input>`** : émet la classe `.input-disabled` quand `disabled` est vrai, alignée sur la convention DS.

### Tests
- **`SegmentedControl.test.tsx`** : ajout d'assertions d'absence des conventions ARIA abandonnées (`aria-pressed`, `role="tablist"`, `aria-selected`) — le wrapper était déjà conforme `radiogroup`/`radio`/`aria-checked`/roving tabindex, aucun changement fonctionnel.

## v3.0.0-alpha.23 — 2026-07-25 — Presets Graph + mode édition (I6-2, #677)

> Complète `<Graph>` (I6-1, #676, view-only) : presets métier + exposition du mode édition (I5) du moteur.

### Added
- **`<Mindmap>`, `<OrgChart>`, `<DependencyMap>`** : presets composant PAR-DESSUS `<Graph>` — defaults d'options purs, **aucune duplication du moteur ni du wrapper**. `<Mindmap>` → `layout:'mindmap'` (bilatéral maison, use case NHOOD). `<OrgChart>` → `layout:'tree'` + `layoutOptions:{direction:'TB'}`. `<DependencyMap>` → `layout:'layered'` (Sugiyama/dagre vendoré, DAG — le seul layout ASYNC du moteur, invisible côté wrapper). Toutes les props de `<Graph>` sont acceptées ; un `layout`/`layoutOptions` explicite du consumer **gagne** sur le défaut du preset. Co-localisés dans `components/Graph/` — pas de nouvelle clé `REACT_TO_REGISTRY` (variantes de l'entrée `graph`, déjà `react:"ported"` depuis #676).
- **Mode édition exposé sur `<Graph>`** — périmètre initial d'I6-2 (spec #663) perdu au split #676/#677, réintégré ici : prop `mode?:'view'|'edit'` (défaut `'view'`, comportement I6-1 **strictement inchangé**), option de construction au même titre que `layout` (remonte l'instance moteur au changement — `_initEdit()` du renderer n'est appelé qu'au constructeur). `mode:'edit'` monte la `.graph-toolbar` (Ajouter/Relier/Supprimer + Annuler/Rétablir) et active création/suppression/édition inline/undo-redo côté moteur (#673→#675, déjà livrés côté DS CSS).
- **`onModelChange?`** : branché sur l'événement RÉEL du modèle, `CustomEvent('graph:model:change')` sur `instance.model` (PAS l'alias DOM `graph:edit` posé sur le conteneur — celui-ci n'est qu'un rebalance optionnel pour les consumers qui écoutent l'élément hôte plutôt que le modèle, explicitement documenté « pas un 2e canal de vérité » dans `shared/graph/render/svg-renderer.js`). Se déclenche pour toute mutation atomique du modèle (`{op,...}` retranscrit fidèlement), y compris celles issues de la réconciliation warm-start des props `nodes`/`edges` — aucune mutation à la construction initiale (le modèle n'émet rien tant qu'aucun abonné n'existe encore).
- **`GraphHandle` (ref impérative)** : `undo()`/`redo()`/`canUndo()`/`canRedo()` exposés via `useImperativeHandle` — choix retenu car ce sont des COMMANDES ponctuelles adressées au moteur (pas un état à refléter dans le JSX), cas d'usage canonique de la ref impérative React. No-op sûr hors `mode:'edit'` (le moteur n'instancie pas de `GraphHistory` en mode `view`). `<Mindmap>`/`<OrgChart>`/`<DependencyMap>` relaient la même ref.

### Notes
- Registre : aucun changement à `REACT_TO_REGISTRY`/`components-registry.json` — les 3 presets sont des variantes co-localisées de l'entrée `graph` (`npm run generate-registry` vérifié OK).
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).

## v3.0.0-alpha.22 — 2026-07-25 — `<Graph>` : wrapper React du moteur node-link (I6-1, #676)

> Le moteur graph (`shared/graph/`, v2.98→v2.114) n'était pilotable qu'en vanilla. `<Graph>` l'expose en React data-driven, **view-only** — les presets Mindmap/OrgChart/DependencyMap et l'exposition du mode édition sont l'objet de #677 (I6-2).

### Added
- **`<Graph>` (#676)** : wrapper data-driven qui **pilote le moteur bundlé** (ne le réimplémente pas). Le moteur est **inliné dans le package** par tsup depuis `shared/graph/` — une source, deux cibles (le consumer npm n'a aucune dépendance vers un fichier servi par Caddy).
- **SSR-safe** (Next 15 App Router) : montage client-only, aucun accès DOM au render server. **Warm-start** : au changement de `nodes`/`edges`, les positions précédentes servent de graine → pas de saut visuel.
- **Contrôlé / non-contrôlé** : `selectedId` / `defaultSelectedId` (+ miroirs edge), convention alignée sur `<TreeView>`. Génériques `GraphNode<TData>` propagés jusqu'à `onSelect`/`renderNode`. `ariaLabel` **requis** (typecheck).
- **Teardown** : `destroy()` du moteur appelé au démontage (listeners, ResizeObserver, toolbar) — pas de fuite.

### Notes
- **Écart spec ↔ moteur documenté** : la spec #663 annonçait des classes d'état `.graph-node.selected` et un `onSelect(node)`. Le moteur réel pose `.graph-node--selected` / `.graph-edge--selected` et émet `{id, kind}`. Le wrapper **traduit** : `onSelect` reçoit bien le nœud complet typé, et les tests assertent les classes réelles (en vérifiant explicitement l'ABSENCE de `.selected`, dont dépendrait à tort le CSS).
- Registre : `REACT_TO_REGISTRY:{Graph:'graph'}` + entrée `graph` en `react:"ported"` (même PR, DS-PRINCIPLES §8.1).
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).

## v3.0.0-alpha.21 — 2026-07-25 — Fix packaging : directive `"use client"` manquante (#703)

> Bug P1 packaging (#703) — le barrel `dist/index.js`/`dist/index.cjs` genere par tsup n'avait AUCUNE directive `"use client"` en tete. Un consumer Next 15 App Router important un composant de `@msyx-dev/react` depuis un **Server Component** cassait (hooks/etat client non marques comme client boundary). Decouvert sur `<PageHeader>`, alpha.14.

### Fixed
- **Barrel `dist/index.js` + `dist/index.cjs`** : les deux artefacts (ESM et CJS) commencent desormais par `"use client";`, faisant du barrel un client boundary propre — importable tel quel depuis un Server Component. `@msyx-dev/react` est un package de composants majoritairement interactifs (Modal, Tabs, hooks, etat), le pattern standard est une directive globale sur tout le bundle plutot qu'un decoupage par module (aucune directive `"use client"` par fichier n'existait dans `src/` avant ce fix — verifie).

### Notes techniques
- L'option tsup/esbuild native `banner: { js: '"use client";' }` a ete essayee en premier mais **silencieusement strippee au build** par esbuild >=0.19 (`Module level directives cause errors when bundled` — une directive de prologue injectee en tete d'un bundle multi-modules est rejetee ; verifie empiriquement : `dist/index.cjs` sortait avec `'use strict';` seul). Fix retenu dans `tsup.config.ts` : hook `onSuccess` qui prefixe le texte APRES l'ecriture des fichiers par esbuild (hors de son pipeline de parsing/validation des directives) — deterministe, sans warning de build.
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).
- Publish = tag `react-v3.0.0-alpha.21` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.20 — 2026-07-24 — Parité header : taille bouton feedback + sparkle VersionNotes

> Bugs de parité visuelle découverts en migrant cap-transfo vers `<SiteHeader>` (#731, #732).

### Fixed
- **`<UserFeedbackButton>` (#731)** : émet désormais `<button class="header-notification">` **seul** (retrait de `.btn-icon`) — parité stricte 34×34 avec `<NotificationBell>`, qui n'ajoute pas `.btn-icon`. Avant : `.btn-icon` (`buttons.css`) forçait `min-width`/`min-height: 44px`, faisant déborder le bouton feedback par rapport à la cloche voisine dans le header. Le commentaire JSDoc du composant, qui affirmait à tort que le markup canonique était `.header-notification` + `.btn-icon`, est corrigé.
- **`<VersionNotes>` (#732)** : le `.version-badge` rend désormais le picto sparkle (`<Icon name="sparkles">`, #713) devant `v${latestVersion}`, à parité avec le header vanilla (`shared/nav.js`, badge `✨ vX.Y.Z`). Le CSS `.version-badge svg` (`version-notes.css`) était déjà prévu mais resté sans effet, le composant React ne rendant aucun `<svg>`.
- **`Icon` : glyphe `sparkles`** : ajout de `sparkles` au type `IconName` + à `ICON_CHILDREN` (copie fidèle du symbole `i-sparkles` de `shared/icons/sprite.svg`). Le primitif passe de 12 à 13 glyphes.

### Notes
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).
- Publish = tag `react-v3.0.0-alpha.20` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.19 — 2026-07-24 — `<SiteHeader>` : toggle clair/sombre standard, palette opt-in

> Fix (#725) — le toggle clair/sombre du header vanilla est « toujours visible » (CLAUDE.md) ; `<SiteHeader>` (alpha.18, #716) le rendait couplé à `themeSwitch` (opt-out) via `<ThemeSwitcher>` (palette + toggle), donc **absent par défaut**. Décision Mike 2026-07-24 : toggle = standard, sélecteur de palette = opt-in.

### Fixed
- **`<SiteHeader>` (#725)** : le toggle clair/sombre (`<ThemeToggle>`, `.mode-switch`) est désormais **toujours rendu**, dans les 3 états d'identité — via `useTheme()` (même hook que `<ThemeSwitcher>`). Le sélecteur de palette (`<select class="theme-switcher-select">`, MSYX/ACSSI/Nhood) reste **opt-in**.

### Changed
- **Prop renommée** `themeSwitch?: boolean` → `paletteSwitch?: boolean` sur `SiteHeaderProps`. `paletteSwitch: true` → `<ThemeSwitcher>` (palette + toggle, sans doublon car il inclut déjà le toggle) ; sinon → `<ThemeToggle>` seul. Pas de breaking réel : alpha.18 n'est pas publié npm.

### Notes
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314).
- `shared/CONSUMER_GUIDE.md` (mention `themeSwitch: true` ligne ~424) non touché — suivi doc séparé pour éviter la règle dual-artefact #314 (cf. issue #725 « Note doc »).

## v3.0.0-alpha.18 — 2026-07-24 — `<SiteHeader>` : header applicatif composable

> Feature (#716, sous-issue 1/3 du chantier #712) — brique de composition qui assemble les composants header déjà portés en un header applicatif prêt à l'emploi. Deuxième pièce du chantier SiteHeader (après `<NotificationBell>` #717).

### Added
- **`<SiteHeader>`** (#716) : composant **100 % présentationnel** (zéro fetch interne, zéro ownership de données) qui **compose** `NotificationBell`, `UserMenu`, `VersionNotes`, `UserFeedbackButton` (+ `UserFeedbackProvider` si `feedback.provider` fourni) et `ThemeSwitcher`. **Zéro CSS nouveau** — réutilise `.header-*` (`layout.css`) + `.skeleton`/`.skeleton-avatar` (`feedback.css`), ordre de placement calqué sur le header vanilla (`shared/nav.js buildHeader`). **Identité 3 états** : `identity===undefined` → skeleton avatar (loading, pas de flash), `identity===null` → anonyme (zone user réduite), objet → `<UserMenu>` (défauts sûrs `email:""`/`authentikUserUrl:"#"`/`logoutUrl:"#"`). Chaque feature **opt-out** (rendue seulement si sa prop/données fournies) : `notifications`→`NotificationBell`, `feedback`→`UserFeedbackButton`, `versionNotes`→`VersionNotes`, `themeSwitch`→`ThemeSwitcher`, `onMenuToggle`→burger. Coexiste avec `<PageHeader>` (rôles distincts). Types exportés : `SiteHeaderProps`, `SiteHeaderIdentity`, `SiteHeaderFeedbackConfig`.
- **Exports + registre** (#716) : `index.ts` expose `SiteHeader` + types. Nouvelle entrée registre `site-header` (`react:"ported"`, `REACT_TO_REGISTRY: SiteHeader → site-header`).

### Notes
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314). 0 fichier `shared/css/**` touché.
- `CONSUMER_GUIDE` + démo vitrine = **sous-issue #718** (hors scope).
- Publish = tag `react-v3.0.0-alpha.18` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.17 — 2026-07-23 — `<NotificationBell>` : cloche de notifications du header

> Feature (#717) — port React du contrat "cloche de notifications" du header vanilla (`shared/nav.js`). Première pièce du chantier SiteHeader côté React.

### Added
- **`<NotificationBell>`** (#717) : composant **présentationnel/contrôlé** cloche + panel + badge + mark-all-read. **Zéro CSS nouveau** — réutilise `.header-notification`/`.header-notif-panel`/`.header-notif-item`… (`layout.css`) et `.header-user-zone` comme ancre `position:relative` (parité vanilla). `notifications: NotificationItem[]`, badge via `unreadCount` (défaut dérivé de `notifications.filter(n => n.unread).length`, masqué si 0, « 99+ » au-delà). Mark-all-read **GLOBAL** seul (`onMarkAllRead`, parité header — pas de mark-as-read individuel) ; clic item = `onItemClick(item)` (ne marque pas lu, ne ferme pas). Contrôlé/non-contrôlé (`open`/`onOpenChange`, convention `UserMenu`). Panel `role="dialog"` **non-modal, sans focus trap** ; fermé, neutralisé par `inert` + `aria-hidden` (précédent alpha.12 #396). aria : cloche `aria-haspopup="dialog"` + `aria-expanded` + `aria-controls` (`useId`), Échap ferme + refocus, clic extérieur ferme. Items rendus `<a href>` si `href`, sinon `<div role="button" tabIndex=0>` quand `onItemClick` fourni. Icône via primitif interne `<Icon name="bell">`.
- **`Icon` : glyphe `bell`** (#717) : ajout de `bell` au type `IconName` + à `ICON_CHILDREN` (copie fidèle du symbole `i-bell` de `shared/icons/sprite.svg`). Le primitif passe de 11 à 12 glyphes.
- **Exports + registre** (#717) : `index.ts` expose `NotificationBell` + types `NotificationBellProps`/`NotificationItem`. Nouvelle entrée registre `notification-bell` (`react:"ported"`, `REACT_TO_REGISTRY`).

### Notes
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md`/`CHANGELOG.md` racine (convention #314). 0 fichier `shared/css/**` touché.
- Publish = tag `react-v3.0.0-alpha.17` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.16 — 2026-07-23 — `<UserFeedbackModal>` : pièce jointe via `<FileUpload>` (fin de la capture d'écran live)

> Bug (#714) — décision Mike : la capture d'écran live (`getDisplayMedia` + ré-encodage WebP) posait un risque de fiabilité/permissions ; remplacée par un ajout de fichier explicite via le composant DS `<FileUpload>`.

### Fixed
- **`<UserFeedbackModal>` (#714)** : la capture d'écran live (`getDisplayMedia` + ré-encodage WebP) est **remplacée** par un ajout de fichier via `<FileUpload>` DS (drag & drop + parcourir, libellé « Joindre un fichier »). Validation `image/*` + 5 Mo max, sans re-encodage, rejet **non bloquant** (message + soumission toujours possible). `FeedbackFormValues.screenshot` inchangé (`Blob | null` accepte un `File`) — **aucun breaking**. Suppression du pipeline `captureScreenCanvas`/`encodeScreenshotWebp`/`captureFeedbackScreenshot` (internes, non exportés par `index.ts`).

### Notes
- 100 % `packages/react/` (+ démo vanilla `pages/user-feedback.html`, classes `.file-upload*` déjà existantes — aucun bump `@ds-version`, aucune entrée `RELEASES.md` racine, convention #314).
- Publish = tag `react-v3.0.0-alpha.16` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.15 — 2026-07-23 — Icônes React auto-contenues (inline SVG, zéro dépendance sprite)

> Correctif de packaging (#713) : 7 composants référençaient `<use href="/shared/icons/sprite.svg#i-…">`, rendant leurs icônes invisibles chez tout consumer ne servant pas le sprite DS à `/shared/icons/sprite.svg`. Introduction d'un primitif interne `<Icon>` qui inline les paths des glyphes Lucide.

### Fixed
- **Icônes invisibles sans sprite servi (#713)** : nouveau primitif INTERNE `src/icons/Icon.tsx` (`<Icon name=… />`, 11 glyphes) qui inline les `<path>`/`<circle>` des symboles de `shared/icons/sprite.svg` au lieu de `<use href>`. Consommé par `UserFeedbackButton` (message-circle), `ThemeToggle` (sun/moon), `Dropdown` (check), `FileUpload` (upload/file), `PasswordInput` (eye/eye-off), `TreeView` (folder/file), `TransferList` (chevron-left/right). Les composants sont désormais 100 % autonomes — plus aucun sprite à servir côté app. `className="icon"` conservé (rendu identique via CSS `.icon`) ; `fill`/`stroke`/`stroke-width` posés en attributs de présentation (écrasés par `.icon`, et garantissant la visibilité de `.mode-switch-icon` qui ne porte pas de règle de trait). `Icon` reste interne (non exporté depuis `index.ts`). `data-icon={name}` ajouté comme hook de test/debug.

### Notes
- 100 % `packages/react/` — aucun bump `@ds-version`, aucune entrée `RELEASES.md` racine (convention #314).
- Publish = tag `react-v3.0.0-alpha.15` (hors scope du /dev — cut de release parent).

## v3.0.0-alpha.14 — 2026-07-21 — Feedback Core ① : UserFeedback* + DataGrid

> Milestone « Feedback Core ① — Design System » (#691, 5 issues). Brique transverse de retour utilisateur (Provider + Modal + Button) composée **exclusivement de primitives DS existantes** (zéro CSS nouveau), plus le port React du `DataGrid`. Registre : `data-grid` porté, nouvelle entrée `user-feedback` distincte de la catégorie `feedback`. Contrats inter-issues figés en amont par le parent /sprint (groom léger).

### Added
- **`<UserFeedbackProvider>` + `useUserFeedback()`** (#692) : contexte transverse de feedback. Capture automatique — environnement par nom d'hôte (`*.miklaw.fr` → préprod, `*.msyx.fr` → prod, `localhost`/`127.*` → dev), version via `fetch(/version)` tolérant, route, navigateur/appareil/viewport, langue, utilisateur + tenant. Mode connecté ET anonyme. Expose `openFeedback()`/`closeFeedback()`/`isOpen`, snapshot rafraîchi à l'ouverture. Patron `ToastProvider`, SSR-safe. Types partagés dans `components/UserFeedback/types.ts` (`UserFeedbackContextData`, `FeedbackFormValues`, `FeedbackSubmitHandler`, …).
- **`<UserFeedbackModal>`** (#693) : formulaire de retour composant `<Modal>` + `<Input>`/`<Select>`/`<Button>` + `useFormValidation()`/`<FormErrorSummary>` pour l'accessibilité. Champs type / titre / description / impact + email conditionnel (requis en mode anonyme). Capture d'écran optionnelle (opt-in) réduite en **WebP ≤ 512 Ko** via `<canvas>.toBlob('image/webp', q)`, sans dépendance externe. Montée par le Provider sur `isOpen`.
- **`<UserFeedbackButton>`** (#694) : bouton icône déclencheur pour le header d'une app. Réutilise `.header-notification`/`.btn-icon` (zéro CSS nouveau), `aria-haspopup="dialog"` + `aria-expanded`, contrôlé/non-contrôlé (convention `UserMenu`). Appelle `openFeedback()` par défaut.
- **`<DataGrid>`** (#696) : port React du composant DS `data-grid` (`tables.css`). API générique typée `DataGridProps<T>`/`DataGridColumn<T>`, tri interne avec gestion `aria-sort`, colonnes `stickyEnd`, états `loading`/vide. Markup canonique `.data-grid-*` (jamais de classe non préfixée).
- **Exports + registre** (#695) : `index.ts` expose les 5 composants et leurs types. Registre régénéré — `data-grid` passe `pending → ported`, nouvelle entrée `user-feedback` (mappée sur le dossier co-localisé `components/UserFeedback/`, une seule clé `REACT_TO_REGISTRY`).

### Notes
- Versioning consolidé (convention #314) : les 5 PR sont mergées en `[skip-changelog]`, cette entrée agrège le lot au cut de release.
- Icône par défaut du bouton : `i-message-circle` (le sprite Lucide DS n'expose pas `message-square`).

## v3.0.0-alpha.13 — 2026-07-15 — `<VersionNotes>` data-driven (badge + modale + timeline)

> Parité React (#650) — remonte l'API d'un cran : les consumers (cap-transfo #355) passent des **données** (`releases`/`next`) au lieu d'écrire le markup timeline à la main. Rend le CSS DS livré en v2.97.0 (#649).

### Added
- `<VersionNotes latestVersion storageKey releases next? subtitle? className?>` : composant complet **badge + modale + timeline** data-driven. **Compose** `<VersionBadge>` (localStorage `.version-badge--new`, SSR-safe, hérité — pas de duplication) et `<Modal className="version-notes-dialog">` (focus restore, ESC/backdrop). Types exportés : `VersionNotesProps`, `ReleaseNote` (`{version, date, titre?, highlights}`), `Highlight` (`{type, text}`), `VersionNoteCategory`. **Classes d'état** (dont dépend le CSS #649) répliquées : `.timeline-item--latest` sur la 1re release uniquement, `.timeline-item--upcoming` en tête si `next` non vide, chips `.badge badge-{success,info,warning,danger}` mappés par `type` (calque `VERSION_NOTE_CATEGORIES`, `nav.js:178`). `titre`/`subtitle`/`next` optionnels : `<h4>` rendu seulement si `titre`, `.version-notes-sub` seulement si `subtitle`. Date via `<time dateTime>` (format FR calqué `formatVersionNoteDate`). `useId()` pour `aria-labelledby`. `REACT_TO_REGISTRY` mappe `VersionNotes → version-notes` (2e dir, même entrée que `VersionBadge`). (#650)

## v3.0.0-alpha.12 — 2026-07-08 — Fix a11y : overlays fermés non focusables (Drawer/BottomSheet/FAB)

> Correctif a11y détecté en vérif adversariale du lot alpha.11 : les overlays gardaient leurs contrôles focusables + `aria-modal` persistant quand fermés (markup monté off-screen). Pendant vanilla dans DS CSS v2.95.2.

### Fixed
- `<Drawer>` / `<BottomSheet>` / `<FAB>` : quand fermés, le sous-arbre off-screen est neutralisé via `inert` (overlay+panel ; `.fab-actions` pour FAB) + `tabIndex={-1}` en défense ; `role="dialog"`/`aria-modal="true"` posés UNIQUEMENT quand ouvert. Corrige la tabulation clavier vers des contrôles invisibles. Type local `InertAttr` (`inert` non typé par `@types/react` 18, sans `@ts-ignore`). (#396)

## v3.0.0-alpha.11 — 2026-07-08 — Lot « Overlays + Data » (17 composants/hooks)

> Milestone #41 — regroupement Sprints 4+5+6. Parité **23 → 40** entrées registre portées. 3 reclassées `n-a` (table, comparison-table, stats — layout pur couvert par composition). `data-grid` (#459) déféré (trop gros, sprint dédié).

### Added
- **Overlays** : `<Tooltip>` (#631, wiring `aria-describedby` + position typée) · `<Popover>` (#470, classe d'état `.open` — piège #612) · `<Drawer>` (#462, `.open` + focus-trap) · `<BottomSheet>` (#632) · `<FAB>` (#633, `.open` menu d'actions) · `<VersionBadge>` (#634, localStorage `.version-badge--new`, SSR-safe).
- **Data** : `<Progress>` + `<ProgressRing>` (#635, `width`/`--dash` inline) · `<ProgressTracker>` (#636) · `<Gauge>` (#637, arc SVG) · `<UsageMeter>` (#638) · `<ActivityFeed>` (#639, filtres + load-more) · `<RiskMatrix>` (#640, `grid-template`/positionnement inline + tooltip curseur portal, `.risk-dot-visible`/`-hidden`) · `<TreeView>` (#460, roving tabindex, `.tree-icon` + sprite) · `<HeatmapCalendar>` (#598, binning quartiles `data-level`, roving tabindex, tooltip portal) · `<VirtualList>` (#597, windowing spacers + `.virtual-list-row`, structure vanilla).
- **Hooks** : `useChartReveal` / `useChartTooltip` / `useChart` (#641, IntersectionObserver `.chart-visible` — le SVG hand-authored reste composé) · `useCountUp` (#642, animation de nombre headless).

### Changed
- Registre : `table`, `comparison-table`, `stats` → `react:"n-a"` (layout présentationnel, couvert par composition).
- `REACT_CSS_UNDETECTABLE` (`bin/generate-registry.js`) : ajout `.version-notes-dialog`, `.risk-dot-hidden`, `.risk-dot-visible` (classes réelles en sélecteur compound, non captées par le scanner CSS).

## v3.0.0-alpha.10 — 2026-07-08 — Sprint 3 « Formulaires B » (6 composants)

> Milestone #41 « Parité React » — sprint 3 : parité 17 → 23 entrées registre portées (`@msyx-dev/react`). Famille Formulaires B : champs interactifs riches + validation a11y. `filter-bar` reclassé `n-a` (layout flex pur, couvert par composition — pas de wrapper).

### Added
- `<OTPInput>` : champ code OTP contrôlé (`value: string`/`onChange`), `length` (défaut 6), `onComplete`, `disabled`, `autoFocus`, `ariaLabel`. Émet `.otp-group`/`.otp-digit`. **Classe d'état** `.otp-digit.filled` dérivée par case depuis `value[i]` non vide (piège capitalisé ActionMenu `.open` : sans elle, la bordure « remplie » ne s'applique pas). `.otp-group--disabled` + `disabled` natif + `aria-disabled`. Orchestration focus impérative (auto-advance, backspace-vers-précédent, ←/→, `select()` au focus), distribution du paste en un seul `onChange`, `autocomplete="one-time-code"` sur la 1ʳᵉ case, `inputmode="numeric"`, sanitation `[0-9]`. Divergence assumée et testée : `value` étant l'unique source de vérité, un trou au milieu (backspace) est collapsé (calque `.join('')` du vanilla). `REACT_TO_REGISTRY` mappe `OTPInput → otp-input`. (#625)
- `<Quiz>` + `<Poll>` : quiz interactif à machine à états et sondage animé, contrôlés/data-driven (co-localisés dans `components/Quiz/`). `<Quiz questions onComplete feedbackCorrect? feedbackWrong? autoAdvanceMs=1000 onRestart?>` gère progression/scoring en interne, `useId()` isole le `name` des radios par instance. `<Poll question results onVote voted?>` 100 % contrôlé (les résultats viennent du parent — pas de random vanilla). **Classes d'état** (display:none sans elles) : `.quiz-question.active`, `.quiz-feedback.show`(+`.correct`/`.wrong`), `.quiz-option.correct`/`.wrong`/`.selected`, `.quiz-result.show`, `.quiz-poll-results.show`. **Styles inline obligatoires** (piège FileUpload `.progress-fill`) : `.quiz-progress-bar`/`.quiz-poll-fill` `style.width` (le CSS ne déclare aucun width) ; la barre de sondage part de `0%` puis anime vers `pct%` via double `requestAnimationFrame` (fallback `setTimeout` sous jsdom). Le bouton « Recommencer » émet `.btn-primary` seul (la classe hook JS `.quiz-restart` du vanilla est superflue en React — `onClick` direct). `aria-live` sur feedback/score/résultats. `REACT_TO_REGISTRY` mappe `Quiz → quiz-poll`. (#626)
- `<PasswordInput>` : champ mot de passe propriétaire de son `<input>` (le `type` doit être déclaratif) + bouton révéler/masquer. Émet `.password-field`/`.password-toggle` avec les DEUX `<svg><use>` (`.password-toggle-on`/`-off`, hrefs sprite `#i-eye`/`#i-eye-off`) toujours montés. **Attribut d'état** `aria-pressed` sur `.password-toggle` (driver unique du swap CSS des 2 icônes) + bascule `type` `password`↔`text`. Contrôlé (`revealed`/`onRevealedChange`) ou non-contrôlé (`defaultRevealed`), `forwardRef`, passe-plat des attributs `<input>` natifs, `disabled` propagé aux 2 éléments, libellés a11y paramétrables. `REACT_TO_REGISTRY` mappe `PasswordInput → password-toggle`. (#627)
- `<ColorInput>` : sélecteur de couleur contrôlé (`value` hex/`onChange`) wrappant un `<input type="color">` natif + affichage hex en **MAJUSCULES** (`.color-input-value`) + pastilles `presets` optionnelles. **Style inline obligatoire** (récidive exacte du piège FileUpload `.progress-fill`) : chaque `.color-swatch` porte `style.background = <hex>` — sans lui les pastilles sont invisibles (couvert par un test dédié). `data-color` + `aria-pressed` (comparaison casse-insensible) sur le preset actif, `.color-input--disabled`. `REACT_TO_REGISTRY` mappe `ColorInput → color-picker`. (#592)
- `<TransferList>` : liste à double panneau contrôlée (disponibles ↔ assignés), modèle par `id` stable (`items`/`assigned`/`onChange(assignedIds)`). **Classes d'état** : `.transfer-option.selected` (+ `aria-selected`), `.transfer-option.hidden` (filtre par panneau, insensible à la casse), `.transfer-empty` (opt-in). Navigation clavier ↑/↓/Enter/Espace bornée aux options visibles du panneau, boutons de transfert sélection vs tout-le-panneau, compteurs live, région `aria-live="polite"` (trick reset+reflow). `REACT_TO_REGISTRY` mappe `TransferList → transfer-list`. (#593)
- `useFormValidation()` : **hook** d'orchestration a11y de validation de formulaire (pas un composant — le rendu par champ est déjà couvert par `<Input error>`). Retourne `{ formProps, getFieldProps, fieldErrors, errors, isValid, validate, summaryRef }`. Traduit la Constraint Validation API native en messages **FR** paramétrables (+ override `data-validate-msg-*` par champ), gère le cycle blur (validation immédiate) / input (retrait immédiat si redevenu valide) / submit (passage complet + focus `summaryRef`). **Attribut d'état** `aria-invalid="true"` posé sur le champ invalide et **retiré** quand il redevient valide (jamais `"false"` dans le DOM), `aria-describedby` reliant le message. Région live `.sr-only` `aria-live="polite"` (trick reset+reflow d'`announce()`). SSR-safe. `REACT_TO_REGISTRY` mappe `useFormValidation → form-validation`. (#599)
- `<FormErrorSummary>` : composant compagnon présentationnel du résumé d'erreurs a11y (calque `renderSummary` du vanilla). Émet `.alert.alert-danger` (`role="alert"`, `tabIndex={-1}`) + `.alert-title` + `.alert-body` > `ul.form-error-list`. Brique non triviale = le **focus-link** : cliquer une erreur `preventDefault` + focus le champ correspondant par `id` (surchargeable via `onFocusField`). Reçoit le `summaryRef` du hook (focus post-commit au submit invalide). Ne rend rien si `errors` est vide. `REACT_TO_REGISTRY` mappe `FormValidation → form-validation`. (#599)

### Changed
- Registre : `filter-bar` reclassé `react:"pending"` → `react:"n-a"` (layout flex présentationnel sans état ni JS — couvert par composition côté consumer, comme `btn-group`/`prose`/`orb`).

### Fixed
- `<Input>` — `aria-describedby` pendant corrigé : quand `hint` ET `error` étaient fournis simultanément, l'attribut référençait aussi `${id}-hint` alors que le span `.input-hint` n'est pas rendu dans ce cas (error le masque) → idref pendant (défaut a11y). Ne référence plus que l'id du message réellement monté. Même correctif que `<PasswordInput>` de ce sprint. (#627 connexe)

## v3.0.0-alpha.9 — 2026-07-07 — Sprint 2 « Formulaires A » (7 composants)

> Milestone #41 « Parité React » — sprint 2 : parité 11 → 18 composants portés (`@msyx-dev/react`). Famille Formulaires A : champs de saisie + theming.

### Added
- `<ThemeSwitcher>` + hook `useTheme()` : port complet du sélecteur de palette + interrupteur de mode (pas seulement le visuel). `<ThemeSwitcher>` émet `.theme-switcher`/`.theme-switcher-label`/`.theme-switcher-select` et compose `<ThemeToggle>` (déjà porté) pour le `.mode-switch`, calqué sur le markup `fondation.html`/`shared/nav.js:111-116`. Le hook `useTheme(config?)` réplique le moteur runtime `applyThemeTransition`/`applyMode` (`shared/components.js:771-834`) : attributs `documentElement` `data-theme`/`data-mode` (retirés pour les défauts implicites `msyx`/`dark`), persistance `localStorage['msyx-theme'|'msyx-mode']`, réconciliation automatique du mode si le thème choisi ne le supporte pas, et support du mécanisme mono-mode (`modes: ['dark']` seul → toggle `disabled`/`aria-disabled`, dormant côté DS vanilla mais activable via un `config` custom, design IdP-agnostique). SSR-safe : aucun accès `window`/`document`/`localStorage` pendant le rendu, resynchronisation depuis `localStorage` dans un `useEffect` post-montage. `REACT_TO_REGISTRY` (`bin/generate-registry.js`) mappe `ThemeSwitcher → theme-switcher` (même entrée que `ThemeToggle` — deux dirs, un composant DS). (#452)
- `<Dropdown>` : menu déroulant custom contrôlé (div-based), à ne pas confondre avec `<Select>` (`Input/Select.tsx`, wrapper du `<select>` natif). Émet le markup canonique `.dropdown`/`.dropdown-trigger`/`.dropdown-value`/`.arrow`/`.dropdown-menu`/`.dropdown-search`/`.dropdown-option`/`.check` (`components/forms.css`, handler « Dropdowns » de `shared/components.js`). Classes d'état critiques répliquées à l'identique du CSS DS : `.dropdown-menu.open`/`.dropdown-trigger.open` (sans elles le panneau reste `opacity:0`/`pointer-events:none` — piège identique à `<ActionMenu>`, #612) et `.dropdown-option.selected` (pilote la couleur accent + l'opacité de `.check`). Mode `multi` (`value: string[]`, attribut `data-multi="true"` sur `.dropdown`) : sélection **sans fermeture**. Mode single (`value: string`) : sélection ferme le menu et restaure le focus trigger. `searchable` ajoute `.dropdown-search` (filtre sur le libellé, insensible à la casse). A11y ajoutée au-delà du vanilla (qui n'émet aucun aria) : `aria-haspopup="listbox"`/`aria-expanded` sur le trigger, `role="listbox"` (+ `aria-multiselectable` si multi) sur le menu, `role="option"`/`aria-selected` sur les options, navigation clavier ↑/↓ (focus réel, boucle, sautant les `disabled`), `Home`/`End`, `Enter`/`Espace` pour sélectionner, `Echap` + clic extérieur pour fermer (écoutes `document`, calquées sur `<ActionMenu>`). Focus posé sur la recherche à l'ouverture si `searchable`, sinon sur la première option activable. `REACT_TO_REGISTRY` mappe `Dropdown → dropdown` ; registre `dropdown` passé `react:"ported"`. (#457)
- `<Slider>` : curseur de sélection de valeur numérique contrôlé (`value`/`onChange`), variante simple uniquement (une poignée — la variante duale `.slider-dual` + input numérique compagnon n'est pas couverte). Émet le markup canonique `.slider-group`/`.slider-header`/`.input-label`/`.slider-value-display`/`.slider-track` (`components/forms.css`). **État critique répliqué à l'identique du CSS DS** : le remplissage visuel n'est pas une classe mais la custom property inline **`--slider-fill: <pct>%`** posée sur `.slider-track` (consommée par le gradient `forms.css:95`), recalculée à chaque render depuis `value`/`min`/`max` — calque `updateFill()` de `initSliders` (`shared/components.js:553-582`), piège équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612) si omis. `showValue` affiche `.slider-value-display` (+ `unit`), `disabled` pose `.slider-disabled` + attribut natif. `REACT_TO_REGISTRY` mappe `Slider → slider` ; registre `slider` passé `react:"ported"`. (#463)
- `<NumberInput>` : champ numérique contrôlé (`value`/`onChange`) avec boutons +/- (`formulaires.html` #number-input, calque `initNumberInputs` — `shared/components.js:1449-1509`). Émet le markup canonique `.number-input-wrap`/`.number-input-btn` (`data-action="dec"|"inc"`)/`.number-input-field` (`components/forms.css:132-214`). **État critique répliqué à l'identique du CSS DS** : les boutons +/- ne portent PAS de classe d'état — `updateButtons()` du vanilla (`components.js:1472-1475`) pose l'attribut natif `disabled` (`btnDec.disabled = value<=min`, `btnInc.disabled = value>=max`), recalculé ici à chaque render depuis `value`/`min`/`max`/`disabled`, piège équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612) si omis. Arrondi au step calqué sur `round()` (`components.js:1467-1470`, origine 0). Clic dec/inc et flèches clavier ↑/↓ appellent `onChange` avec la valeur clampée/arrondie ; changement direct dans le champ re-clampe. `compact` pose `.number-input--compact`, `disabled` pose `.number-input--disabled` + attribut natif sur le champ et les 2 boutons. Pas de `CustomEvent('numberinput:change')` DOM côté React — pendant : l'appel `onChange`. `REACT_TO_REGISTRY` mappe `NumberInput → number-input` ; registre `number-input` passé `react:"ported"`. (#464)
- `<SearchInput>` : champ de recherche contrôlé (`value`/`onChange`), émet le markup canonique `.search-input-wrap`/`.search-icon`/`.search-input`/`.search-clear` (+ variantes `.search-with-suggestions`/`.search-compact`) (`components/forms.css`, `initSearchInputs` de `shared/components.js`). **Classes d'état critiques répliquées à l'identique du CSS DS** : `.search-clear.hidden` (masqué tant que `value` est vide) et `.search-suggestions.hidden` (panneau invisible sans son retrait — piège identique à `<ActionMenu>`/`<Dropdown>`, #612/#457), `.search-item.active` (item navigué au clavier, sans déplacement de focus réel — l'input garde le focus, comme le vanilla). Sans prop `suggestions` : simple champ + bouton clear, aucun panneau rendu (`role="search"`). Avec `suggestions` (`string[]` ou `{value, label?}[]`) : dropdown filtré (insensible à la casse), navigation clavier ↑/↓ (bornée, ne boucle pas)/Enter/Escape, highlight `<mark>` du terme (labels texte simple uniquement), `.search-no-result` si aucun résultat, sélection via `onSelect`. A11y : `role="combobox"`/`aria-haspopup="listbox"`/`aria-expanded` sur le wrap, `aria-autocomplete="list"`/`aria-controls` sur l'input, `role="option"`/`aria-selected` sur chaque `.search-item`. Fermeture différée (150ms) au blur, calquée sur `initSearchInputs` — la sélection d'un item utilise `onMouseDown`+`preventDefault` pour ne jamais déclencher ce blur. `REACT_TO_REGISTRY` mappe `SearchInput → search-input` ; registre `search-input` passé `react:"ported"`. (#465)
- `<TagInput>` : champ de saisie multi-valeurs contrôlé (`values`/`onChange`), émet le markup canonique `.tag-input-wrap`/`.tag-item`/`.tag-close`/`.tag-input-field`/`.tag-input-limit` (+ `.tag-input-label`/`.tag-input-hint`) (`formulaires.html` #tag-input, calque `initTagInputs` — `shared/components.js:1716-1825`, `components/forms.css:325-406`). **État critique répliqué à l'identique du CSS DS** : `.tag-item--removing` — le vanilla (`removeTag()`) pose la classe AVANT de démonter le tag pour laisser jouer l'animation opacity/scale 150ms puis retire l'élément ; répliqué ici via un état interne (`Set` de valeurs en cours de suppression, timer nettoyé au démontage) qui pose la classe immédiatement et n'appelle `onChange` (retrait effectif du tableau) qu'après le délai — piège équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612) si le délai est omis. Enter ou `,` crée un tag (trim, anti-doublon, respecte `max`) ; Backspace sur champ vide programme le retrait du dernier tag. À la limite (`values.length >= max`) : champ `disabled` natif + placeholder "Limite atteinte" + `.tag-input-limit` = `count/max`, calqué sur `updateInputState()`. `disabled` (prop globale) pose `.tag-input-wrap--disabled` + champ natif `disabled` — les `.tag-close` ne sont PAS rendus (calque exact du markup vanilla désactivé). `error` (`string|boolean`) pose `.tag-input-wrap--error` ; une chaîne remplace en plus le `.tag-input-hint` avec `.tag-input-hint--error`. `REACT_TO_REGISTRY` mappe `TagInput → tag-input` ; registre `tag-input` passé `react:"ported"`. (#466)
- `<FileUpload>` : zone de dépôt drag & drop + liste de fichiers contrôlée (`pages/formulaires.html` #file-upload, `components/forms.css:61-74`). **Particularité** : le DS vanilla est 100% présentationnel — aucun `initFileUpload` n'existe dans `shared/components.js`, le wrapper React ajoute donc l'intégralité de la logique (input file caché, drag & drop, liste). Émet le markup canonique `.file-upload`/`.file-upload-icon`/`.file-upload-text`/`.file-upload-browse`/`.file-upload-hint` + `.file-list`/`.file-item`/`.file-item-icon`/`.file-item-info`/`.file-item-name`/`.file-item-size`/`.progress-bar`/`.progress-fill`/`.file-item-remove`. **État critique implémenté côté wrapper (absent du vanilla)** : `.file-upload.dragover` — la classe est définie dans `forms.css:62` (`.file-upload:hover, .file-upload.dragover { border-color: var(--accent); ... }`) mais aucun JS vanilla ne la pose puisque le composant DS est purement statique ; sans cette implémentation le feedback visuel du drag serait absent, piège équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612). Posée sur `dragEnter`/`dragOver`, retirée sur `dragLeave` ET sur `drop`. `onFiles(files: File[])` appelé au drop ou à la sélection via l'input caché (`accept`/`multiple` passthrough) ; l'input est un **sibling** de `.file-upload`, jamais un enfant, pour éviter la ré-entrance du clic synthétique dans le handler du parent. `.file-upload` porte `role="button"`/`tabIndex`/`aria-label`, Enter/Espace déclenchent l'input. Liste contrôlée via `files`/`onRemove` (aucun état interne, comme `<TagInput>`) : `.progress-fill` seulement si `progress` est défini, `.file-item-size` seulement si `size` est défini. `disabled` bloque drag/clic + désactive l'input natif. N'émet jamais `.has-file` (classe absente du DS). `REACT_TO_REGISTRY` mappe `FileUpload → file-upload` ; registre `file-upload` passé `react:"ported"`. (#469)

### Fixed
- **`<FileUpload>` — `.progress-fill` invisible sans `background`** : le CSS DS `.progress-fill` (`data.css:6`) ne pose AUCUN fond par défaut — le fond est TOUJOURS posé inline côté markup statique (`pages/formulaires.html:537/543/549` : `style="width:65%;background:var(--gradient-1);"`). Le wrapper omettait ce `background`, rendant la barre de progression invisible. Ajout d'un `background` inline par défaut (`var(--gradient-1)`, calque du DS), paramétrable via le nouveau champ optionnel `color?: string` de `FileUploadFileItem`. Détecté en vérification adversariale post-port (#469).

## v3.0.0-alpha.8 — 2026-07-05 — Fix `<ActionMenu>` invisible (`.open` manquant)

> Correctif d'un bug de rendu détecté en vérification post-alpha.7 : le panneau du menu était monté dans le DOM mais restait invisible.

### Fixed
- **`<ActionMenu>` — panneau invisible** : le wrapper montait `<div class="action-menu">` sans la classe d'état `.open`. Or le CSS DS (`overlays.css`) laisse `.action-menu` en `opacity:0`/`visibility:hidden` et ne le révèle qu'avec `.action-menu.open`. Résultat : le menu s'ouvrait (`aria-expanded="true"`) mais restait invisible à l'écran chez tout consumer. Le wrapper émet désormais `.action-menu.open` à l'ouverture. Garde anti-régression ajoutée au test (assertion `.open`).

## v3.0.0-alpha.7 — 2026-07-05 — Sprint 1 parité React (6 composants) + dette #518

> Milestone #41 « Parité React » — sprint 1 : parité **5 → 11 composants portés** (`@msyx-dev/react`). Bundle la remédiation dette audit 2026-06-13 (#374/#375/#376) et la dette #518 (ThemeToggle réécrit, non publié depuis alpha.6).

### Changed
- **`<ThemeToggle>` réécrit — émet `.mode-switch` (dette #518)** : bascule de l'ancienne API `.theme-toggle` vers le markup canonique `.mode-switch` (`layout.css`, iOS-style, `role="switch"`). Sémantique `aria-checked="true"` === mode **DARK** actif (#382). `REACT_TO_REGISTRY` remappé `ThemeToggle → theme-switcher`. ⚠️ **BREAKING (alpha)** : les consumers stylant `.theme-toggle` doivent basculer sur `.mode-switch` (fourni par la distribution DS CSS).

### Added
- `<SegmentedControl>` : segmented control contrôlé (`value`/`onChange`), émet `.segmented`/`.segmented-item`/`.segmented-indicator` (+ `.segmented--sm`/`--lg`/`--subtle`), `role="radiogroup"/"radio"`, `aria-checked`, roving tabindex. Indicateur glissant mesuré via ref + `useLayoutEffect` (`transform: translateX(offsetLeft)` + `width: offsetWidth`, style inline de position uniquement), calqué sur `initSegmentedControls` (`shared/components.js`). Navigation clavier WAI-ARIA radiogroup ←/→/↑/↓ + Home/End, boucle, saute les options `disabled`. (#467)
- `<Input>` / `<Select>` / `<Checkbox>` / `<Radio>` / `<Toggle>` : famille de champs de formulaire présentationnels et contrôlés, émettent les classes DS canoniques `.input`/`.input-group`/`.input-label`/`.input-hint`/`.input-error`/`.input-error-msg`/`.input-success`/`.input-with-icon`/`.checkbox`/`.radio`/`.toggle`+`.toggle-slider` (`components/forms.css`). `id` auto-généré via `useId` (label `htmlFor` + `aria-describedby` hint/error) si absent, `aria-invalid` posé quand `error` est fourni. `Select` accepte `options` ou des `children` `<option>`. Tous `forwardRef` vers l'élément natif. (#458)
- `<ActionMenu>` : menu déroulant d'actions non-contrôlé (état d'ouverture interne), émet `.action-menu-wrap`/`.action-menu-trigger`/`.action-menu`/`.action-menu-item`/`.action-menu-divider`/`.action-menu-icon`, `aria-haspopup="menu"`/`aria-expanded` sur le trigger, `role="menu"/"menuitem"/"separator"`. Ouverture au clic trigger, fermeture au clic item (`onSelect`), Échap, clic extérieur (listener `document` nettoyé), navigation clavier ↑/↓ (roving focus, boucle) + Home/End sautant les items `disabled`, focus posé sur le premier item activable à l'ouverture — au-delà du DS vanilla `initActionMenu` (`shared/components.js`) qui ne gère que l'ouverture/fermeture au clic. (#456)
- `<Tabs>` : onglets contrôlés (`value`/`onChange`), émet `.tabs`/`.tab` (+ classe `active`), `role="tablist"/"tab"/"tabpanel"`, roving tabindex, navigation clavier WAI-ARIA Tabs (←/→/↑/↓ + Home/End, boucle, saute les onglets `disabled`) calquée sur `initComponents` tabs (`shared/components.js`). (#455)
- `<Modal>` : dialogue modal contrôlé porté sur `<dialog>` natif, émet `.modal-dialog`/`.modal-header`/`.modal-body`/`.modal-close`/`.modal-actions`. Synchronisation `open`↔`showModal()`/`close()` via `useEffect`, focus restore WAI-APG (WCAG 2.4.3) répliquant `attachFocusRestore` du DS (capture du trigger avant ouverture, restauration après fermeture), fermeture par ESC natif (`close` event), clic backdrop, ou bouton `.modal-close`. (#454)
- `<ToastProvider>` + hook `useToast()` : toasts impératifs via context React, émet `.toast`/`.toast-{type}`/`.toast-message`/`.toast-close`, role/aria-live a11y par type, auto-dismiss + enter/exit. (#453)

### Fixed
- Retiré l'export `./styles.css` (jamais généré par tsup) du `package.json` ; `sideEffects: false` (tree-shaking) (#374).
- README : chemin d'import CSS corrigé (le CSS provient de la distribution DS CSS, pas d'un package npm), install GitHub Packages (`.npmrc` + token), props des 5 composants documentées (#375).

### Added
- Export des types `ButtonVariant`, `ButtonSize` depuis `src/index.ts` (#376).

> Parité classes vérifiée : toutes les classes émises ont un équivalent CSS DS (classes manquantes ajoutées côté DS CSS en v2.67.0 racine). Publié dans **v3.0.0-alpha.7**.

## v3.0.0-alpha.6 — 2026-05-24

**Composant `<PageHeader>`** (#276, #330)

### Added
- `<PageHeader>` : header de page standardisé (titre + sous-titre + actions slot). API présentationnelle, ARIA roles, responsive.
- Export `PageHeader`, `PageHeaderProps` depuis `src/index.ts`.
- Tests Vitest dans `src/components/PageHeader/PageHeader.test.tsx`.

### Notes
- Publié sur GitHub Packages (`@msyx-dev/react@3.0.0-alpha.6`, access restricted).
- Bump majeur 2.x → 3.x correspond à la stabilisation de l'API React du DS (alpha series).

## v3.0.0-alpha.5 — 2026-05-20

**Composant `<Button>` — variante `warning`** (#320, #325)

### Added
- `<Button variant="warning">` : variante sémantique warning (tokens `--warning-*`).

### Notes
- DS CSS : bump v2.61.0 (tokens `--warning-*` distribués côté DS — livrés conjointement).

## v3.0.0-alpha.4 — 2026-05-20

**`<ThemeToggle>` promu dans le package React** (#319, #324)

### Added
- Composant `<ThemeToggle>` : toggle dark/light thème-aware, exporté depuis `src/index.ts`.

## v3.0.0-alpha.3 — 2026-05-20

**`<UserMenu>` — slot `extraItems` + `roleBadge`** (#318, #321)

### Added
- `<UserMenu>` : slot `extraItems` (items de menu additionnels) + prop `roleBadge` (badge de rôle utilisateur).

## v3.0.0-alpha.2 — 2026-05-19

**Fix publish `pnpm publish --ignore-scripts`** (#307)

### Fixed
- Remplacement de `--no-scripts` (option npm, non reconnue par pnpm) par `--ignore-scripts` dans le workflow publish.

## v3.0.0-alpha.1 — 2026-05-19

**Smoke test publish** (#307)

### Notes
- Bump alpha.1 pour valider la chaîne de publication GitHub Packages end-to-end.

## v2.58.0 — v2.61.0 — Phase B (#301)

> **Trou d'historique consolidé Phase B** : les versions intermédiaires v2.58 à v2.61 ont été livrées dans la Phase B de l'Epic [#301](https://github.com/msyx-dev/design-system-project/issues/301) sans entrées RELEASES dédiées au moment du publish. Le détail fin n'est pas récupéré (pas d'archéologie git rétroactive — décision Mike issue #314, option A, 2026-05-25). Les composants/changements introduits sur ces versions sont **fonctionnellement présents** dans les versions alpha.3 à alpha.6 (cumul Phase B).

## v2.57.5 — 2026-05-19

**CI publish `@msyx-dev/react` — workflow GitHub Actions** (#307, Epic #301)

### Added
- `.github/workflows/publish-react.yml` : publish auto `@msyx-dev/react` sur GitHub Packages quand un tag `v*` est poussé (steps : checkout → setup-pnpm → setup-node → install --frozen-lockfile → build → test Vitest → guard tag↔version → publish --access restricted).
- `packages/react/PUBLISHING.md` : procédure release (bump version → commit → tag → push), garde-fou tag↔version, instructions consumer `.npmrc`.
- Exception `.gitignore` pour committer `packages/react/pnpm-lock.yaml` (CI --frozen-lockfile).

## v2.57.4 — 2026-05-19

**Composant React `<LoginScreen>`** (#306, Epic #301)

### Added
- `@msyx-dev/react` : composant `<LoginScreen>` (3 variants : `internal-only`, `public-multi-providers`, `internal-with-fallback`).
- API présentationnelle : `onAuthentikClick`, `providers?: Array<{id, label?, onClick}>`, `showFallbackForm` + `onFallbackSubmit({login, password})`, `logo?: ReactNode`, `appName?`, `subtitle?`.
- `<ProviderIcons>` SVG inline : Authentik, Google, Apple, Microsoft, GitHub (couleurs marque tierce conservées — exception §1 DS-PRINCIPLES).
- A11y : `aria-label` fallback automatique sur boutons providers, `label/htmlFor` associés via `useId()` SSR-safe, `autoComplete="current-password"`, `type="button"` explicite sur bouton Authentik, `.login-logo` `aria-hidden="true"`.
- Tests Vitest 31/31 (variants, callbacks, a11y baseline, password autocomplete, displayName).
- Export `LoginScreen`, `LoginScreenProps`, `LoginScreenVariant`, `LoginScreenProvider` depuis `src/index.ts`.

## v2.57.3 — 2026-05-19

**Composant React `<UserMenu>`** (#305, Epic #301)

### Added
- `@msyx-dev/react` : composant `<UserMenu>` (avatar + dropdown utilisateur + lien "Mon compte" + form POST logout).
- Props plates : `displayName`, `email`, `avatarUrl?`, `authentikUserUrl`, `logoutUrl`. Support controlled optionnel via `open`/`onOpenChange`.
- A11y WAI-ARIA 1.2 : `aria-haspopup="menu"`, `aria-expanded`, `role="menu"/menuitem/separator`, focus return trigger après Escape, Tab quitte le menu, ArrowUp/Down/Home/End navigation avec wrap.
- `useId()` React 18+ pour menuId/triggerId SSR-safe.
- Cleanup `useEffect` correct (pas de memory leak StrictMode Next.js).
- Tests Vitest 39/39 (render, keyboard nav, click-outside, focus return, ARIA states, controlled mode).
- Export `UserMenu`, `UserMenuProps` depuis `src/index.ts`.

## v2.57.2 — 2026-05-19

**Composant React `<Button>`** (#304, Epic #301)

### Added
- `@msyx-dev/react` : composant `<Button>` (variants primary/secondary/ghost/danger, sizes sm/md/lg, loading/disabled/icons/fullWidth, forwardRef, ARIA complet).
- peer-dep React étendu à `>=18 <20` pour compatibilité consumers Next.js 15.
- Tests unitaires Vitest 26/26 (variants, loading, disabled, icons, forwardRef, a11y).
- README `packages/react/` : contrat CSS séparé (consumer doit importer `@msyx-dev/design-system/dist/style.css`).

### Fixed
- `.btn-loading::after` : spinner thème-aware via `currentColor` — corrige le rendu cassé sur btn-secondary/ghost (était `var(--text-on-accent)` non contrastant sur fond transparent).

---

## Convention

- **Versioning** : SemVer (`MAJOR.MINOR.PATCH[-prerelease]`). Série `3.x-alpha` en cours pour stabilisation API React du DS.
- **Publish** : automatique via `.github/workflows/publish-react.yml` quand un tag `react-v*` est poussé sur le repo. Garde-fou tag ↔ `package.json` version.
- **Registry** : GitHub Packages (`npm.pkg.github.com`), access `restricted`. Consumer doit configurer `.npmrc` (cf. `PUBLISHING.md`).
- **Source de vérité** : ce fichier. Le `RELEASES.md` racine du monorepo ne contient PAS d'entrées React.
