# Changelog

Toutes les évolutions notables de **msyx-design-system**.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versioning : [SemVer](https://semver.org/lang/fr/).

> 📚 **Historique complet et détaillé** : voir [`RELEASES.md`](./RELEASES.md).
> Ce fichier suit la convention globale « CHANGELOG par PR » ; les entrées sous `[Unreleased]` sont alimentées à chaque PR, puis datées à la release.

## [Unreleased]

### Changed
- **login-screen — rapatriement CSS** : bloc AUTH FLOWS (`.login-step`, `.login-strength`, `.login-strength-bar`, `.login-strength-fill`, `.login-strength-label`, `.login-cgu`, `.login-success-msg`, `.login-back-link`) déplacé de `pricing.css` → `forms.css` (co-localisation login) ; registre réattribué `pricing`→`login-screen` ; `module[]` régénéré. Rendu inchangé. (#510)

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
