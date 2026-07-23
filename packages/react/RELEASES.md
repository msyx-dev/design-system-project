# @msyx-dev/react — Releases

Historique des releases du package npm `@msyx-dev/react` (publié sur GitHub Packages, registry `npm.pkg.github.com`, access restricted).

> Pour l'historique du DS CSS distribué (`shared/css/*`, tokens, sync.sh), voir `../../RELEASES.md` à la racine du monorepo.

## Unreleased (next alpha)

_Rien pour l'instant._

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
