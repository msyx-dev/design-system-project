# Releases

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
