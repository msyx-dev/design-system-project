# Releases

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
