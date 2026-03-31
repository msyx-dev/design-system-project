# CLAUDE.md — design-system
# Niveau 2 — Contexte projet

## Role
Design system vivant de msyx.fr — source de verite pour tous les composants UI.
Tout projet msyx.fr qui a besoin d'un composant manquant doit le creer ICI d'abord.

## Stack
- HTML/CSS/JS statique pur (pas de framework, pas de build)
- Servi par Caddy `file_server` (pas de Docker)
- URL : https://design-system.msyx.fr

## Structure
```
index.html          # Page login auth gate
site.html           # Hub principal + lazy-loader des 8 categories
pages/
  fondation.html    # Couleurs, typographie, espacements, ombres, theming
  composants.html   # Cards, badges, boutons, chips, dividers, rating, avatars, alertes, modals, toasts, segmented control, theme switcher, achievement badges
  navigation.html   # Tabs, breadcrumbs, stepper, bottom navigation
  formulaires.html  # Inputs, selects, checkboxes, file upload, login, calendrier, slider/range, search input, number input, OTP input, tag input, quiz/poll
  data.html         # Tables, data grid, stats, charts, KPI, tree view
  templates.html    # Kanban, roadmap, backlog, sprint board
  feedback.html     # Empty states, spinners, tooltips, pagination, drawer, zone banner, modals interactifs, bottom sheet, FAB
  divers.html       # Avancé — Contenu riche (timeline, carousel, lightbox, code blocks, video embed) + Interaction (accordion, command palette, context menu, copy button)
shared/
  styles.css        # Agregateur CSS — imports des 4 modules + base reset
  css/
    tokens.css      # Design tokens purs — variables CSS uniquement (:root, [data-mode="light"], themes acssi/nhood)
    utilities.css   # Classes utilitaires couleur, backgrounds, bordures, accessibilité
    layout.css      # Layout shell — header, sidebar, main, section patterns, responsive/theming overrides
    components.css  # Tous les composants UI (buttons, cards, badges, forms, modals, tables, etc.)
  sync.sh           # Sync les 4 fichiers CSS vers un projet consommateur
  check-sync.sh     # Vérifie si le DS consommé est à jour (@ds-version)
  CONSUMER_GUIDE.md # Guide d'integration pour projets consommateurs
  nav.js            # Header, sidebar, scroll spy, SPA navigation, LazyLoader
  components.js     # Composants JS partages (toasts, modals, tabs, kanban, sliders, chips, search inputs, data grids, carousel, copy buttons, rating, segmented controls, bottom nav, number inputs, OTP, tag inputs, tree view, bottom sheet, lightbox, context menu, FAB, theme/mode switcher, video embeds, quiz/poll)
```

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
5. **Version** : bumper `@ds-version` dans `shared/css/tokens.css` ET `shared/css/utilities.css`
   - Feature : minor (2.9 → 2.10)
   - Fix : patch (2.9.0 → 2.9.1)
   - Bumper aussi la version dans `shared/nav.js` (header-version)
6. **Docs** :
   - `docs/ARCHITECTURE.md` : ajouter dans la structure + section composants JS si init*
   - `CLAUDE.md` : mettre a jour la liste des composants dans la description de la page
   - `RELEASES.md` : entree Added/Changed
7. **Qualite** :
   - Anti-FOUC : le composant ne doit pas flasher au chargement (script inline <head>)
   - Accessibilite : aria-labels, role, keyboard navigation si interactif
   - Responsive : tester 320px, 768px, 1280px

## Deploy
Fichiers servis directement par Caddy. Aucun build necessaire.
Modifier les fichiers → commit/push → visible immediatement.
