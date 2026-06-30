# CLAUDE.md — design-system
# Niveau 2 — Contexte projet

## Role
Design system vivant de msyx.fr — source de verite pour tous les composants UI.
Tout projet msyx.fr qui a besoin d'un composant manquant doit le creer ICI d'abord.

## Principes & anti-patterns — lecture obligatoire
**Avant toute modification de code DS, lire `docs/DS-PRINCIPLES.md`.** Le document consolide les règles de qualité (tokens-first, theming, a11y WCAG AA, mobile-first, perf budgets, naming, versioning), la checklist anti-dette par composant, et les anti-patterns observés sur les consumers à ne JAMAIS reproduire dans le DS.

Rappels condensés (la version complète est dans `docs/DS-PRINCIPLES.md`) :
- **Aucune valeur hardcodée** (hex/rgb/px/font) — toujours `var(--token)` depuis `tokens.css`
- **5 combos theme/mode à tester** — MSYX/ACSSI/Nhood × dark/light
- **Mobile-first uniquement** — `@media (min-width: ...)`, jamais `max-width`
- **A11y baseline** — `aria-label` sur icon-only, `:focus-visible`, contraste 4.5:1, target 44px mobile
- **Anti-FOUC** — script synchrone inline `<head>`, lit `msyx-theme` + `msyx-mode` (jamais de naming divergent)
- **Anti-double-bind JS** — pattern `dataset.bound` sur tous les event listeners
- **Pas d'override de classe DS** — customiser via variables CSS, jamais redéfinir
- **Version bump synchrone** — 5 fichiers (`tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`)
- **Checklist anti-dette** — 9 dimensions à valider par composant (HTML/CSS/JS/A11y/Perf/Doc/Version/Registre/VR)

Si une règle te paraît ambiguë : `docs/DS-PRINCIPLES.md` a un exemple ❌ Don't / ✅ Do pour chaque cas.

## Stack
- HTML/CSS/JS statique pur (pas de framework, pas de build)
- Servi par Caddy `file_server` (pas de Docker)
- URL : https://design-system.msyx.fr

## Structure
```
assets/             # Brand assets SVG (v2.43.0)
  logo-msyx.svg     # PRIMARY mark vectorisé depuis source officiel (viewBox 1475×1562, quasi-carré)
  logo-msyx-mark.svg  # Mark alias (identique à logo-msyx.svg)
  logo-msyx-dark.svg  # Variante fond sombre (gradients identiques, saturés)
  logo-msyx-light.svg # Variante fond clair (gradients assombris pour contraste WCAG AA)
  sources/          # Sources de référence — logoMSYX.png (1475×1562 PNG officiel msyx.fr)
  explorations/     # Historique conception S23 (wordmark-monogram-a/b, NE PAS SUPPRIMER)
index.html          # Page login auth gate
site.html           # Hub principal + lazy-loader des 8 categories
pages/
  getting-started.html  # Installation (3 niveaux), premiers pas, theming, tokens, bonnes pratiques
  fondation.html    # Couleurs, typographie, espacements, ombres, theming (+ .theme-card / .color-grid--compact v2.54.7), theme switcher (v2.47.0), mode-switch iOS-style (v2.55.0), brand identity (wordmark + mark DS, v2.56.0), classes utilitaires (+ .hidden-mobile/.hidden-desktop responsive v2.78.0 #568, + .page-content/.main--no-rail consumers sans sidebar v2.78.0 #567), iconographie (Lucide sprite, v2.33.0), performance (glass vs solid, v2.33.0) + Motion : durations, easings, 6 patterns canoniques (#514)
  composants.html   # Cards (+ card-link a11y v2.49.0, + card-muted WCAG-safe v2.78.0 #569, + card-media vignette bleed v2.79.0 #37), badges (+ badge-nav compact v2.49.0), boutons (+ polish sémantique theme-aware v2.54.11 : tokens fg dédiés --btn-on-*, shadow alpha --btn-shadow-alpha, border subtil, + .btn-group attaché v2.83.0 #451, + .split-button caret menu v2.84.0 #438), chips, dividers, rating, avatars, alertes, modals (+ focus restore WAI APG v2.41.0), toasts (+ toast-message v2.49.0), segmented control, achievement badges, popovers, reset natif (a + :focus-visible, v2.31.0), disabled global (éléments natifs hors .btn-*/.input, v2.40.2)
  navigation.html   # Header user zone (avatar, dropdown, notifications, brand configurable window.MSYX_HEADER.brand v2.78.0 #570), Tabs, breadcrumbs, stepper, bottom navigation, action-menu (v2.47.0)
  formulaires.html  # Inputs, selects, checkboxes, file upload, login, login-screen (3 variants Authentik + slots providers, v2.57.0), calendrier interactif single/range INLINE + time-picker 24h/12h (#432/#436), slider/range, search input, number input, OTP input, tag input, quiz/poll, filter-bar, password-toggle (show/hide œil, v2.72.0), validation-formulaires (initFormValidation a11y v2.82.0 #433)
  data.html         # 16 sections en 5 familles (v2.71.0+) — Graphiques (charts, pie-donut) · Indicateurs chiffrés (stats + note quand-utiliser, animated-counters) · Jauges & progression/Meter (progress + note famille Meter, progress-tracker, gauge, usage-meter) · Tabulaire (tables, comparison, data-grid + col actions sticky-end, server-data-grid initServerDataGrid #434) · Listes & flux (tree-view, lists, activity-feed, risk-matrix)
  templates.html    # Kanban, roadmap, backlog, sprint board, pricing (v2.47.0)
  feedback.html     # 12 sections états — alertes (.alert--kpi ex-zone-banner, .alert--cta ex-upgrade-prompt #519), tokens status, toasts, skeleton, empty states, spinners, auto-save, pagination, comments, access-denied page 403 (v2.58.0) — #514
  overlays.html     # 7 sections surfaces flottantes — modals, drawer, bottom sheet, FAB, notification center, confirm popover, tooltip (scindé depuis feedback.html #514)
  divers.html       # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks + .code-inline refactor v2.50.0, video embed, + .prose rendu markdown v2.85.0 #439) + Interaction (accordion, command palette fonctionnelle, context menu, copy button)
shared/
  styles.css        # Agregateur CSS — imports des 4 modules + base reset
  css/
    tokens.css      # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
    utilities.css   # Classes utilitaires couleur, backgrounds, bordures, espacement, layout, radius, shadows, typo, accessibilité
    layout.css      # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides
    components.css       # Barrel pur (v2.36.0) — 31 @import vers components/ dans l'ordre cascade
    components-core.css  # Barrel essentiel (v2.36.0) — 10 modules essentiels pour consumers légers (menu.css requis par alias forms/navigation)
    components/          # 31 modules CSS (v2.77.0, +menu.css #520) : _base, menu (primitif .menu/.menu-item/.menu-divider #520), signature (v2.42.0), brand (v2.56.0 — wordmark + mark DS), cards, buttons, badges, theming, forms, data,
                         #   avatars, tables, lists, alerts, overlays, navigation, modals, feedback,
                         #   interactive, templates, media, _responsive, tracker, quiz, _a11y,
                         #   pricing, notifications, motion, access-denied, theme-toggle (v2.60.0), section-header
  sync.sh                    # Sync CSS vers un projet consommateur (--no-showcase, --components=core|list)
  check-sync.sh              # Vérifie version (@ds-version) + mode --check-overrides
  check-components.sh        # Lint projets consommateurs — détecte composants custom hors DS
  components-registry.json   # Registre de tous les composants DS (classes CSS, init JS, page)
  CONSUMER_GUIDE.md          # Guide d'integration pour projets consommateurs
  icons/
    sprite.svg             # Sprite SVG Lucide self-hosted (v2.33.0) — 50 glyphes, ~21 KB
    build-sprite.sh        # Build reproductible (lucide-static + svgo)
  nav.js            # Header, sidebar (NAV_SECTIONS_MANIFEST généré au build par bin/generate-nav-sections.js, inliné entre marqueurs AUTO-GENERATED, ZÉRO fetch runtime v2.70.0 #528), scroll spy, SPA navigation, LazyLoader
  components.js     # Composants JS partages (toasts, modals, tabs, kanban, sliders, chips, search inputs, data grids, carousel, copy buttons, rating, segmented controls, bottom nav, number inputs, OTP, tag inputs, tree view, bottom sheet, lightbox, context menu, FAB, theme/mode switcher, video embeds, quiz/poll, command palette, matrice risque)
```

## Convention RELEASES.md par package (monorepo)

Le repo distribue **deux artefacts indépendants** :
1. **DS CSS statique** (`shared/css/*`, tokens, registry, `sync.sh`) — servi par Caddy via `design-system.msyx.fr`.
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
- Variables CSS dans `:root` de `shared/styles.css` — ne pas dupliquer
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
- 3 themes : MSYX (dark+light), ACSSI (dark+light), Nhood (dark+light)
- `THEME_CONFIG` dans components.js : modes disponibles par theme, extensible
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Toggle sun/moon dans le header, grise si theme dark-only
- Variable `--accent-rgb` : triplet RGB brut par theme, pour les declinaisons `rgba(var(--accent-rgb), X)`
- Variables RGB semantiques : `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`
- Ajouter un theme = 1 bloc CSS `[data-theme]` + `--accent-rgb` + 1 entree THEME_CONFIG + 1 option select

## Charte graphique MSYX (reference par defaut)
- Theme dark : `--primary: #0a0f1e`
- Accent bleu : `--accent: #3b82f6`
- Gradients : bleu→violet, cyan→bleu, violet→rose
- Typo : Space Grotesk (titres) + Inter (corps) + Fira Code (mono)
- Glassmorphism + border glow subtil
- **Logo officiel (v2.43.0)** : `assets/logo-msyx.svg` — mark seul vectorisé depuis le source officiel MSYX (`msyx.fr/media/logo/logoMSYX.png`, mark only, 1475×1562 PNG conservé en `assets/sources/logoMSYX.png`). Gradient vertical turquoise→vert→bleu→violet. ViewBox 1475×1562 (ratio quasi-carré). Pas de wordmark texte. Toujours utiliser ce fichier SVG (pas de texte CSS gradient, pas de réinterprétation paths). Variantes dark/light dans `assets/`. Mark alias : `assets/logo-msyx-mark.svg`. Wordmark Monogram historique conservé en `assets/explorations/`.
- **Signature spatiale (v2.42.0)** : gradient underline 2px sous `.section-header .overline` via `signature.css`. Automatique sur toutes les pages.
- **Texture grain (v2.42.0)** : `--texture-grain` + `--texture-grain-opacity: 0.015` dans `tokens.css`. `body::after` global.

## Process ajout composant
Checklist a suivre pour tout nouveau composant (agent coder ou humain) :

1. **HTML** : ajouter la section dans la page thematique appropriee
   - Pattern : `<section id="nom">` + `section-header` + `demo-box` avec exemples
   - Variantes : montrer au moins 2-3 variantes (tailles, etats, couleurs)
   - Respecter le style des sections existantes dans la meme page
2. **CSS** : ajouter dans `shared/styles.css`
   - Section dediee avec commentaire `/* ===== NOM COMPOSANT ===== */`
   - Variables CSS uniquement (jamais de hex/rgb hardcode)
   - Mobile-first : media queries co-localisees avec le composant
   - Tester les 5 combinaisons theme/mode (MSYX dark/light, ACSSI dark, Nhood dark/light)
3. **JS** (si interactif) : ajouter dans `shared/components.js`
   - Fonction `initNomComposant()` exportee
   - Pattern `dataset.bound` anti-double-bind sur les event listeners
   - Appel dans le bloc `reinitAll()` pour compatibilite SPA
4. **Compteur** : mettre a jour le nombre dans `site.html` (hero + hub cards si applicable)
5. **Version** : bumper `@ds-version` dans **5 fichiers** : `shared/css/tokens.css`, `shared/css/utilities.css`, `shared/css/components.css`, `shared/css/layout.css`, `shared/nav.js` (header-version)
   - Feature : minor (2.31 → 2.32)
   - Fix : patch (2.31.0 → 2.31.1)
   - Convention validee Sprint 16 + 17 (memory.md 2026-05-01)
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
   - Maintenir la version `"version"` en coherence avec le bump de `@ds-version`

## Deploy
Fichiers servis directement par Caddy. Aucun build necessaire.
Modifier les fichiers → commit/push → visible immediatement.
