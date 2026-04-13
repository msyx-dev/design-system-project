# Releases

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
- Nouveaux tokens RGB : `--violet-rgb`, `--cyan-rgb`, `--text-muted-rgb` (tous themes)
- Semantiques WCAG AA dans le bloc light generique (protection futurs themes)
- Semantiques WCAG AA dans le bloc Nhood light (meme pattern qu'ACSSI)

### Fixed
- Contraste WCAG AA : success/warning/info assombries en ACSSI light (#15803d, #c2410c, #0369a1)
- Contraste WCAG AA : code-string et code-comment assombries (ACSSI + Nhood light)
- badge-neutral : rgba hardcode → `rgba(var(--text-muted-rgb),...)`
- Orbs hero : violet/cyan MSYX hardcodes → `rgba(var(--violet-rgb/--cyan-rgb),...)`
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
