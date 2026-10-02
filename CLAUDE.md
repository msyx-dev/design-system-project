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
- **Version bump synchrone** — 10 sources verifiees par `shared/check-versions.sh` (`@ds-version` dans `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `base.css`, `themes.css`, `nav.js` + `const VERSION` de `nav.js` + `version` de `shared/components-registry.json` + `version` de `package.json` racine). `themes.css` est autogenere : son en-tete est derive de `tokens.css` par `node shared/build-themes.js` (relancer apres chaque bump)
- **Contraste des boutons pleins** — fonds = 8 tokens dédiés `--btn-{primary,danger,success,warning}-bg-{start,end}` (hex littéral, 4 couches, jamais dérivés), réglés à la mesure ; texte = `--btn-on-*` (`--btn-on-primary` = alias `--text-on-accent`, blanc en Auchan sombre) ; sonde pixels `visual-tests/button-contrast.spec.ts` **bloquante** (≥ 4.5:1, visé ≥ 4.6, repos + survol, 10 combos) ; jamais d'`opacity` au survol d'un bouton plein ; ne jamais baisser le seuil ni retirer un cas `SOLID` pour passer (§3.3)
- **Checklist anti-dette** — 9 dimensions à valider par composant (HTML/CSS/JS/A11y/Perf/Doc/Version/Registre/VR)
- **Jamais de donnée consumer concaténée dans `innerHTML`** — construire les nœuds (`createElement`/`setAttribute`/`textContent`) ; `escapeHTML` ne protège qu'un contexte texte, jamais un attribut (voir `docs/DS-PRINCIPLES.md` §11)

Si une règle te paraît ambiguë : `docs/DS-PRINCIPLES.md` a un exemple ❌ Don't / ✅ Do pour chaque cas.

## Stack
- HTML/CSS/JS statique pur, sans framework : les fichiers sont servis tels quels, sans étape de compilation au déploiement. Les artefacts générés (`shared/css/themes.css`, `shared/icons/sprite.svg`, `shared/dist/*.global.js`, blocs AUTO-GENERATED de `shared/nav.js`) sont produits par leurs scripts puis commités
- Livraison : image Docker (`Dockerfile` : `caddy:2-alpine` + `COPY . /srv` ; `Caddyfile.container` en `file_server` avec repli SPA sur `site.html` ; `/health` et `/version` en JSON ; `HEALTHCHECK` ; `entrypoint.sh` écrit `version.json` au démarrage), déployée par Coolify (voir « Deploy »)
- URL (préprod-only) : https://design-system.miklaw.fr, 100% Authentik-gated — le DS ne vit QU'EN préprod ; `design-system.msyx.fr` N'EXISTE PAS (absent de la config Caddy active)

## Structure
```
assets/             # Logos et marques SVG, distribués aux consommateurs par `sync.sh` (MSYX toujours, charte cliente via `--assets=<c>`) et vérifiés par `check-sync.sh` (sha256)
  logo-msyx.svg     # PRIMARY mark (viewBox 1475×1562, quasi-carré), fidèle au PNG officiel
  logo-msyx-mark.svg  # Mark alias (identique à logo-msyx.svg)
  logo-msyx-dark.svg  # Variante fond sombre (dégradés du PNG officiel, ids distincts)
  logo-msyx-light.svg # Variante fond clair (gradients assombris pour contraste WCAG AA)
  logo-acssi*.svg   # Charte ACSSI (4 fichiers) — opt-in côté consommateur via sync.sh --assets=acssi
  tree-noel.svg     # Sapin du thème Noël — JAMAIS distribué (un SVG en <img> est opaque au CSS : ni tokens ni .tree-lights) ; le décor l'inline (FestiveDecor / ensureFestiveDecor)
  sources/          # Sources de référence — logoMSYX.png (1475×1562 PNG officiel msyx.fr)
  explorations/     # Explorations de conception du wordmark (monogram a/b) — NE PAS SUPPRIMER
index.html          # Redirection vers site.html (ancienne page de login de l'auth gate legacy, retirée #997)
site.html           # Hub principal + lazy-loader des catégories
pages/              # Une page par famille de composants ; le détail composant par composant vit dans `shared/components-registry.json`
  getting-started.html  # Installation (3 niveaux), premiers pas, theming, tokens, bonnes pratiques
  fondation.html    # Couleurs, typographie, espacements, ombres, theming, iconographie, mouvement, utilitaires et décor festif du thème Noël
  composants.html   # Cards, badges, boutons, chips, avatars, alertes, modales, toasts, segmented control (`role="radiogroup"`, DS-PRINCIPLES §3.2), popovers
  navigation.html   # Header (zone utilisateur, marque configurable via `window.MSYX_HEADER.brand`), tabs, breadcrumbs, stepper, bottom navigation, action-menu
  formulaires.html  # Inputs, sélecteurs, calendrier, éditeurs et autres contrôles de formulaire (éditeur Markdown : rendu par whitelist de nœuds, parité vanilla↔React verrouillée par `tests/fixtures/markdown-cases.json`)
  data.html         # Graphiques, indicateurs, jauges, tableaux et data grids, listes et flux, heatmap, liste virtualisée, moteur de graphe (`shared/graph/`)
  templates.html    # Kanban, roadmap, backlog, sprint board, pricing
  feedback.html     # États système : alertes, toasts, skeleton, empty states, spinners, pagination, commentaires, page 403, mentions @
  user-feedback.html  # Parcours « User Feedback » (bouton header → modale → formulaire), distinct du feedback système ; démo 100% vanilla qui dogfoode les classes consommées par `@msyx-dev/react` `UserFeedback*`
  overlays.html     # Surfaces flottantes : modales (largeur par token `--modal-w`), drawer, bottom sheet, FAB, centre de notifications, popover de confirmation, tooltip, notes de version
  divers.html       # Contenu riche (timeline, carousel, lightbox, code, vidéo, rendu Markdown `.prose`), interaction (accordion, command palette, context menu, copy button), splitter, json-viewer, diff-viewer
shared/
  styles.css        # Agregateur CSS — @import fonts, tokens, themes, utilities, layout, components, base
  css/
    tokens.css      # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood/auchan)
    utilities.css   # Classes utilitaires couleur, backgrounds, bordures, espacement, layout, radius, shadows, typo, accessibilité
    layout.css      # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides, `.detail-grid` 2 colonnes contenu/aside sticky
    components.css       # Barrel pur : un @import par module de components/, dans l'ordre cascade. `graph.css` (opt-in via <link> séparé) et `modals.css` (stub fusionné dans `overlays.css`) n'y sont pas importés
    components-core.css  # Barrel essentiel pour consumers légers (`menu.css` requis par les alias forms/navigation)
    components/          # Un module CSS par composant ou primitive (le répertoire fait foi ; `module[]` du registre en dérive) ; `_base`, `_responsive`, `_a11y` sont transverses ; `festive.css` = décor festif du thème Noël (`.snowfall`, `.garland` à cycle 1,8 s — WCAG 2.3.1 ; `.btn-candy` décore la bordure uniquement, le contraste du libellé reste celui du bouton plein)
  sync.sh                    # Sync CSS vers un projet consommateur (`--no-showcase`, `--components=core|list`, `--with-graph` : moteur `graph.global.js` + `graph.css` + `vendor/graph-layered.js` avec LICENSE-*/NOTICE, `--assets=<charte>[,…]` : logos dans `<cible>/assets/`, MSYX toujours, charte cliente opt-in, charte inconnue = erreur exit 1 avant toute copie, copie non destructive ; `tree-noel.svg` jamais distribué)
  check-sync.sh              # Vérifie un consommateur : version ET contenu (sha256) des fichiers copiés à l'identique (tokens, themes, utilities, base), version seule pour ceux que sync.sh transforme (layout `--no-showcase`, components) ; sha256 des logos distribués dans `assets/` (MSYX toujours attendue → MISSING si absente, charte cliente vérifiée si un de ses fichiers est présent) ; mode `--check-overrides`
  check-components.sh        # Lint projets consommateurs — détecte composants custom hors DS + passe orphelins opt-in `--orphans=<src>`
  components-registry.json   # Registre des composants DS (classes CSS, init JS, page, statut React) — SOURCE UNIQUE de la liste des composants, dérivée par `bin/generate-registry.js`
  version-notes.json         # Données curées {next, released[]} des notes de version — éditées à la main, inlinées par `bin/generate-version-notes.js` ; alimentent le badge du header (timeline scopée `.version-notes .timeline`, la primitive globale `.timeline` de `lists.css` reste intacte)
  CONSUMER_GUIDE.md          # Guide d'intégration pour projets consommateurs
  icons/
    sprite.svg             # Sprite SVG Lucide self-hosted
    build-sprite.sh        # Build reproductible (lucide-static + svgo)
  graph/             # Moteur graphique node-link maison (SVG, modèle observable, layouts, viewport pan/zoom/pinch, édition avec undo/redo) ; `graph.css` est opt-in via <link> séparé
    vendor/           # graph-layered.js — @dagrejs/dagre@3.0.0 + @dagrejs/graphlib@4.0.1 VENDORÉS (ESM lisible, MIT, AUCUN min.js), dépendance tierce vendorée du DS ; `build-vendor.sh` reproductible + `VENDOR.md` (version pinnée, hash, owner CVE) + LICENSE-*/NOTICE
    lib/              # pointer-drag.js, svg.js (ES modules) + index.js (barrel) + global-entry.js (IIFE, cf. build.sh)
    model/            # GraphModel (EventTarget observable, données plates alignées Cytoscape) + toModel() + history.js (GraphHistory : undo/redo par pile de patches inverses) — DOM-free, testables Node
    layout/           # fixed, tree (Reingold-Tilford), radial, mindmap (bilatérale), layered (Sugiyama via dagre vendoré, SEUL layout async), detect + auto (auto-détection topologique, route vers layered), registre registerLayout/resolveLayout/hasLayout — purs, DOM-free, testables Node
    render/           # svg-renderer.js (SvgRenderer measure→layout→paint, paint() tolérant l'async ; viewport, sélection, fit, ResizeObserver, clavier roving tabindex, live-region SR, `forced-colors` : états distingués par forme et bordure, mode édition) + node-types.js + a11y-table.js (alternative a11y : table `aria-describedby`) + viewport.js (pan/zoom/pinch, fonctions pures testables Node). `role="graphics-document"` en vue ; `role="application"` posé sur le <svg> UNIQUEMENT pendant l'édition inline (arbitrage #662). Undo/redo : 1 patch par action, seule l'édition inline ouvre une transaction (le drag = addEdge atomique)
    index.js          # createGraph(el, opts) — API publique ESM
    global-entry-engine.js  # IIFE -> window.MSYXGraph, bundle DISTINCT de graph-lib.global.js (2e sortie de build.sh)
  nav.js            # Header (badge de version cliquable qui ouvre les notes de version, bouton feedback standard dogfoodant `UserFeedback*` et désactivable via `MSYX_HEADER.feedback.enabled`, décor festif du thème Noël : `ensureFestiveDecor()`/`updateFestiveDecor()` injectent `.snowfall` + `.garland` une fois dans <body>, actifs sous `data-theme="noel"`, coupables par l'utilisateur — bouton flocon, clé localStorage `msyx-festive` = `off` — WCAG 2.2.2), sidebar, scroll spy, navigation SPA, LazyLoader. `VERSION_NOTES` (`bin/generate-version-notes.js`) et `NAV_SECTIONS_MANIFEST` (`bin/generate-nav-sections.js`) sont GÉNÉRÉS et inlinés entre marqueurs AUTO-GENERATED : ne pas les éditer à la main, aucun fetch au runtime
  components.js     # Composants JS partagés : une fonction `init*` par composant interactif (liste : `jsInit` du registre), `THEME_CONFIG`/`THEME_LABELS`, sélecteur de thème/mode, `initFestiveDemo()` (démo du décor festif de `fondation.html`, persiste `msyx-festive`)
```

## Convention RELEASES.md par package (monorepo)

Le repo distribue **deux artefacts indépendants** :
1. **DS CSS statique** (`shared/css/*`, tokens, registry, `sync.sh`) — servi en préprod via `design-system.miklaw.fr` (Coolify, Authentik-gated).
2. **`@msyx-dev/react`** (workspace `packages/react/`) — package npm publié sur GitHub Packages.

**Chaque artefact a son propre `RELEASES.md`** :

| Artefact | Fichier RELEASES | Versioning | Publish |
|---|---|---|---|
| DS CSS | `RELEASES.md` (racine) | SemVer aligné `package.json` racine (`msyx-design-system`) | Push sur `main`, puis redéploiement préprod (voir « Deploy ») |
| `@msyx-dev/react` | `packages/react/RELEASES.md` | SemVer aligné `packages/react/package.json` (`3.x-alpha` en cours) | Tag `react-v*` → workflow `publish-react.yml` → GitHub Packages |

**Règles d'écriture** :
- **PR touchant uniquement `shared/css/**`, `shared/*.js`, `index.html`, `pages/**`, `site.html`** → entrée dans `RELEASES.md` racine, bump `package.json` racine.
- **PR touchant uniquement `packages/react/**`** → entrée dans `packages/react/RELEASES.md`, bump `packages/react/package.json`. **Aucun bump DS racine**.
- **PR touchant les deux** (cas rare) → 2 entrées (1 dans chaque RELEASES) avec mention croisée.

**Anti-pattern** : ne JAMAIS ajouter d'entrée `@msyx-dev/react` (composants React, versions `3.x-alpha`) dans le `RELEASES.md` racine. Inversement : ne JAMAIS ajouter d'entrée DS CSS (tokens, modules CSS, sync.sh) dans `packages/react/RELEASES.md`.

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
- LazyLoader (site.html) : un placeholder par catégorie, IntersectionObserver, deep-links #categorie et #sub-section
- Bouton "Tout charger" pour Ctrl+F global

## Theming
- 2 attributs HTML : `data-theme` (palette) + `data-mode` (dark/light)
- Cascade CSS 4 couches : `:root` → `[data-theme]` → `[data-mode="light"]` → `[data-theme][data-mode]`
- 5 themes : MSYX (dark+light), ACSSI (dark+light), Nhood (dark+light), Auchan (dark+light), Noël (dark+light)
- `THEME_CONFIG` dans components.js : modes disponibles par theme, extensible
- 2 cles localStorage : `msyx-theme` + `msyx-mode`
- Toggle sun/moon dans le header, grise si theme dark-only
- Variable `--accent-rgb` : triplet RGB brut par theme, pour les declinaisons `rgba(var(--accent-rgb), X)`
- Variables RGB semantiques : `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`
- **Ajouter un theme** (source de verite : `themes/<nom>.json` — PAS d'edition manuelle de bloc CSS) :
  1. `./shared/scaffold-theme.sh <nom>` — cree `themes/<nom>.json` depuis `themes/msyx.json`
  2. Remplir les 2 modes (`dark`/`light`) dans ce JSON — s'aligner sur `themes/acssi.json` (couverture la plus complete ; acssi, auchan et noel declarent aussi `--text-on-accent`)
  3. Un theme peut aussi porter sa TYPO : `--font-display`/`--font-sans` sont surchargeables depuis le JSON (acssi = Montserrat). Police auto-hebergee dans `shared/fonts/` + `@font-face` dans `fonts.css`, jamais un CDN tiers.
  3bis. `node shared/build-themes.js` — regenere `shared/css/themes.css` (**AUTOGENERE, ne jamais l'editer a la main**)
  4. `--cat-1..8`/`--chart-1..5` : arbitres par `node bin/check-categorical-palette.js --scale=cat|chart` (contrat cat sur les 10 combos : ΔH(OKLCh) ≥ 30°, ΔE(OKLab) ≥ 0,12, contraste ≥ 3:1 ; utilitaires `.bg-cat-*`/`.border-cat-*` seulement, jamais `.text-cat-N`), pas a l'oeil
  5. 1 entree `THEME_CONFIG`/`THEME_LABELS` (`shared/components.js`) + 1 `<option>` dans le select (`shared/nav.js`)

## Charte graphique MSYX (reference par defaut)
- Theme dark : `--primary: #0a0f1e`
- Accent bleu : `--accent: #3b82f6`
- Gradients : bleu→violet, cyan→bleu, violet→rose
- Typo : Space Grotesk (titres) + Inter (corps) + Fira Code (mono)
- Glassmorphism + border glow subtil
- **Logo officiel** : `assets/logo-msyx.svg` — mark seul revectorisé à l'identique depuis le source officiel MSYX (`msyx.fr/media/logo/logoMSYX.png`, conservé en `assets/sources/logoMSYX.png`), gradient vertical turquoise→vert→bleu→violet, pas de wordmark texte. Toujours utiliser ce fichier SVG (pas de texte CSS gradient, pas de réinterprétation paths) ; variantes dark/light, alias mark et wordmark historique : voir `assets/`.
- **Signature spatiale** : gradient underline 2px sous `.section-header .overline` via `signature.css`. Automatique sur toutes les pages.
- **Texture grain** : `--texture-grain` + `--texture-grain-opacity: 0.015` dans `tokens.css`. `body::after` global.

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
   - Gate : `shared/check-versions.sh`
   - `bash shared/check-versions.sh` doit sortir `rc=0` avant de commiter le bump
   - **Pre-allocation des versions** : pour les sprints multi-bumps (>2 issues touchant @ds-version), le parent /sprint pre-alloue les versions et les injecte dans le prompt /dev de chaque issue (« Ta version cible : v2.X.Y »). Garantit zero conflit git sur les bumps.
6. **Docs** :
   - `docs/ARCHITECTURE.md` : ajouter dans la structure + section composants JS si init*
   - **Ne PAS éditer `CLAUDE.md`** pour un composant : la liste des composants vit dans `shared/components-registry.json` (source unique, dérivée par `bin/generate-registry.js`)
   - `RELEASES.md` : entree Added/Changed
7. **Qualite** :
   - Anti-FOUC : le composant ne doit pas flasher au chargement (script inline <head>)
   - Accessibilite : aria-labels, role, keyboard navigation si interactif
   - Responsive : tester 320px, 768px, 1280px
8. **Registre** : mettre a jour `shared/components-registry.json`
   - Ajouter une entree avec `name`, `page`, `cssClasses` (classes principales), `jsInit` (ou null)
   - Déclarer le statut React : `react: "pending"` (défaut auto — laisser vide, le générateur le matérialise) ou `react: "ported"` si un wrapper `@msyx-dev/react` est créé dans la MEME PR (ajouter au mapping `REACT_TO_REGISTRY` dans `bin/generate-registry.js`). Voir politique `docs/DS-PRINCIPLES.md` Section 8.1.
   - **`module[]` : NE PAS saisir à la main** — auto-dérivé par `generate-registry.js` depuis `cssClasses`. Lancer `npm run generate-registry` après toute modif de `cssClasses`. Voir politique `docs/DS-PRINCIPLES.md` Section 8.2.
   - **Modificateur en sélecteur composé** (`.tooltip.tooltip--bottom`, `.chip.chip-icon`) : `generate-registry.js` ne le capte pas — le saisir à la main dans les `cssClasses` de l'entrée curée ; le step CI bloquant `check-components registry lint` le vérifie.
   - Maintenir la version `"version"` en coherence avec le bump de `@ds-version`

## Deploy
- Le DS est servi par l'image Docker décrite dans « Stack » (build/run autonome, variables, healthcheck et profil d'auth P0 : `README.md`). Rien n'est compilé dans l'image : `COPY . /srv` embarque les fichiers commités
- Déployée par Coolify en préprod UNIQUEMENT (app `design-system-preprod`, slug des scripts `design-system`, `design-system.miklaw.fr` derrière Authentik). Pas de prod (`design-system.msyx.fr` n'existe pas) : aucune promotion à proposer
- Auto-deploy Coolify désactivé (1 sprint = 1 déploiement) : un push sur `main` ne publie rien. Redéployer = `~/.claude/scripts/pipeline/coolify-deploy.sh design-system --wait`
- Vérifier = `~/.claude/scripts/m3/validate-preprod.sh design-system`
