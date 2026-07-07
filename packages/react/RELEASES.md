# @msyx-dev/react — Releases

Historique des releases du package npm `@msyx-dev/react` (publié sur GitHub Packages, registry `npm.pkg.github.com`, access restricted).

> Pour l'historique du DS CSS distribué (`shared/css/*`, tokens, sync.sh), voir `../../RELEASES.md` à la racine du monorepo.

## Unreleased (next alpha)

### Added
- `<SearchInput>` : champ de recherche contrôlé (`value`/`onChange`), émet le markup canonique `.search-input-wrap`/`.search-icon`/`.search-input`/`.search-clear` (+ variantes `.search-with-suggestions`/`.search-compact`) (`components/forms.css`, `initSearchInputs` de `shared/components.js`). **Classes d'état critiques répliquées à l'identique du CSS DS** : `.search-clear.hidden` (masqué tant que `value` est vide) et `.search-suggestions.hidden` (panneau invisible sans son retrait — piège identique à `<ActionMenu>`/`<Dropdown>`, #612/#457), `.search-item.active` (item navigué au clavier, sans déplacement de focus réel — l'input garde le focus, comme le vanilla). Sans prop `suggestions` : simple champ + bouton clear, aucun panneau rendu (`role="search"`). Avec `suggestions` (`string[]` ou `{value, label?}[]`) : dropdown filtré (insensible à la casse), navigation clavier ↑/↓ (bornée, ne boucle pas)/Enter/Escape, highlight `<mark>` du terme (labels texte simple uniquement), `.search-no-result` si aucun résultat, sélection via `onSelect`. A11y : `role="combobox"`/`aria-haspopup="listbox"`/`aria-expanded` sur le wrap, `aria-autocomplete="list"`/`aria-controls` sur l'input, `role="option"`/`aria-selected` sur chaque `.search-item`. Fermeture différée (150ms) au blur, calquée sur `initSearchInputs` — la sélection d'un item utilise `onMouseDown`+`preventDefault` pour ne jamais déclencher ce blur. `REACT_TO_REGISTRY` mappe `SearchInput → search-input` ; registre `search-input` passé `react:"ported"`. (#465)
- `<Slider>` : curseur de sélection de valeur numérique contrôlé (`value`/`onChange`), variante simple uniquement (une poignée — la variante duale `.slider-dual` + input numérique compagnon n'est pas couverte). Émet le markup canonique `.slider-group`/`.slider-header`/`.input-label`/`.slider-value-display`/`.slider-track` (`components/forms.css`). **État critique répliqué à l'identique du CSS DS** : le remplissage visuel n'est pas une classe mais la custom property inline **`--slider-fill: <pct>%`** posée sur `.slider-track` (consommée par le gradient `forms.css:95`), recalculée à chaque render depuis `value`/`min`/`max` — calque `updateFill()` de `initSliders` (`shared/components.js:553-582`), piège équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612) si omis. `showValue` affiche `.slider-value-display` (+ `unit`), `disabled` pose `.slider-disabled` + attribut natif. `REACT_TO_REGISTRY` mappe `Slider → slider` ; registre `slider` passé `react:"ported"`. (#463)
- `<Dropdown>` : menu déroulant custom contrôlé (div-based), à ne pas confondre avec `<Select>` (`Input/Select.tsx`, wrapper du `<select>` natif). Émet le markup canonique `.dropdown`/`.dropdown-trigger`/`.dropdown-value`/`.arrow`/`.dropdown-menu`/`.dropdown-search`/`.dropdown-option`/`.check` (`components/forms.css`, handler « Dropdowns » de `shared/components.js`). Classes d'état critiques répliquées à l'identique du CSS DS : `.dropdown-menu.open`/`.dropdown-trigger.open` (sans elles le panneau reste `opacity:0`/`pointer-events:none` — piège identique à `<ActionMenu>`, #612) et `.dropdown-option.selected` (pilote la couleur accent + l'opacité de `.check`). Mode `multi` (`value: string[]`, attribut `data-multi="true"` sur `.dropdown`) : sélection **sans fermeture**. Mode single (`value: string`) : sélection ferme le menu et restaure le focus trigger. `searchable` ajoute `.dropdown-search` (filtre sur le libellé, insensible à la casse). A11y ajoutée au-delà du vanilla (qui n'émet aucun aria) : `aria-haspopup="listbox"`/`aria-expanded` sur le trigger, `role="listbox"` (+ `aria-multiselectable` si multi) sur le menu, `role="option"`/`aria-selected` sur les options, navigation clavier ↑/↓ (focus réel, boucle, sautant les `disabled`), `Home`/`End`, `Enter`/`Espace` pour sélectionner, `Echap` + clic extérieur pour fermer (écoutes `document`, calquées sur `<ActionMenu>`). Focus posé sur la recherche à l'ouverture si `searchable`, sinon sur la première option activable. `REACT_TO_REGISTRY` mappe `Dropdown → dropdown` ; registre `dropdown` passé `react:"ported"`. (#457)
- `<ThemeSwitcher>` + hook `useTheme()` : port complet du sélecteur de palette + interrupteur de mode (pas seulement le visuel). `<ThemeSwitcher>` émet `.theme-switcher`/`.theme-switcher-label`/`.theme-switcher-select` et compose `<ThemeToggle>` (déjà porté) pour le `.mode-switch`, calqué sur le markup `fondation.html`/`shared/nav.js:111-116`. Le hook `useTheme(config?)` réplique le moteur runtime `applyThemeTransition`/`applyMode` (`shared/components.js:771-834`) : attributs `documentElement` `data-theme`/`data-mode` (retirés pour les défauts implicites `msyx`/`dark`), persistance `localStorage['msyx-theme'|'msyx-mode']`, réconciliation automatique du mode si le thème choisi ne le supporte pas, et support du mécanisme mono-mode (`modes: ['dark']` seul → toggle `disabled`/`aria-disabled`, dormant côté DS vanilla mais activable via un `config` custom, design IdP-agnostique). SSR-safe : aucun accès `window`/`document`/`localStorage` pendant le rendu, resynchronisation depuis `localStorage` dans un `useEffect` post-montage. `REACT_TO_REGISTRY` (`bin/generate-registry.js`) mappe `ThemeSwitcher → theme-switcher` (même entrée que `ThemeToggle` — deux dirs, un composant DS). (#452)

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
