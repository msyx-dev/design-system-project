# Changelog

Toutes les évolutions notables de **msyx-design-system**.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versioning : [SemVer](https://semver.org/lang/fr/).

> 📚 **Historique complet et détaillé** : voir [`RELEASES.md`](./RELEASES.md).
> Ce fichier suit la convention globale « CHANGELOG par PR » ; les entrées sous `[Unreleased]` sont alimentées à chaque PR, puis datées à la release.

## [Unreleased]

### Added
- **Password toggle** : composant `.password-field` + `.password-toggle` + `initPasswordToggle()` — toggle show/hide sur input[type=password], icône `i-eye-off` ajoutée au sprite, 3 variantes dans `formulaires.html` (vide, rempli, + `.login-strength`). (#435)

### Changed
- **`entrypoint.sh`** : bump `VERSION` 2.69.0 → 2.71.1 — cohérence `/version.json` préprod après redeploy suite passe audit nocturne (4 fixes mergés v2.69.1→v2.71.1). Pas de bump DS (entrypoint uniquement).

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
