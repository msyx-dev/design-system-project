# @msyx-dev/react — Releases

Historique des releases du package npm `@msyx-dev/react` (publié sur GitHub Packages, registry `npm.pkg.github.com`, access restricted).

> Pour l'historique du DS CSS distribué (`shared/css/*`, tokens, sync.sh), voir `../../RELEASES.md` à la racine du monorepo.

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
