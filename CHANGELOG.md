# Changelog

Toutes les évolutions notables de **msyx-design-system**.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versioning : [SemVer](https://semver.org/lang/fr/).

> 📚 **Historique complet et détaillé** : voir [`RELEASES.md`](./RELEASES.md).
> Ce fichier suit la convention globale « CHANGELOG par PR » ; les entrées sous `[Unreleased]` sont alimentées à chaque PR, puis datées à la release.

## [Unreleased]

### Added
- **Registre — champ `react`** (`ported`/`pending`/`n-a`) par composant : rend l'écart CSS↔React auditable (#523).
- **CI parité React** : `generate-registry.js --check` valide que toute classe émise par `packages/react/` existe dans le CSS du DS + cohérence du marquage `react: ported` (extension du validateur #516, autonome) ; écart global affiché. (#523)
- **DS-PRINCIPLES Section 8.1** : politique « gap tracé » → bascule lockstep dès qu'une app React ship. (#523)
- **CI `lint`** : step `Registry phantom-class validation (#516)` → `node bin/generate-registry.js --check` (sans `continue-on-error`) — bloque le merge si un composant hand-written introduit une classe fantôme (#516, PR #524).

### Fixed
- **Registre** : 9 entrées `kind:component` corrigées — classes `cssClasses`/`example` fantômes alignées sur le CSS réel et la démo (`code`, `tag-input`, `breadcrumb`, `skeleton`, `accordion`, `stepper`, `empty-state`, `filter-bar`) (#516, PR #524).

### Changed
- **`bin/generate-registry.js` v1.2** : normalisation du champ `react` + check parité React (a)+(b)+réciproque ; écart global dans les deux rapports (écriture et `--check`) (#523).
- **CI step lint renommé** : « Registry validation — phantoms (#516) + React parity (#523) » — même commande, périmètre documenté élargi (#523).

## [2.66.0] — 2026-06-03

### Added
- `shared/css/base.css` : socle global (reset, focus accessible, `html`, `body`, `body::after` texture grain) **désormais distribué aux consumers** via `sync.sh` (→ `ds-base.css`) — auparavant inline dans `styles.css`, jamais synchronisé (acssi-core#592, PR #362).

### Fixed
- Les consumers ne recevaient jamais le socle et recréaient un `body` appauvri (rendu « plat », sans texture). `body` du socle : `font-family: 'Inter'` (literal) → `var(--font-sans)` (tokens-first, compatible next/font).

### Changed
- `styles.css` : bloc « BASE RESET » extrait vers `css/base.css` puis ré-importé (showcase inchangé, source unique du socle).
