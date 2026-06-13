# Guide d'integration — Design System msyx.design

## Regle d'or : pas de composant hors DS

**Ne jamais reimplementer un composant UI dans un projet consommateur.**

Si un composant dont vous avez besoin n'existe pas encore dans le DS :
1. Ouvrir une issue sur le repo `design-system-project` avec le label `composant`
2. Le composant est cree dans le DS (HTML + CSS + JS si interactif)
3. Synchroniser avec `sync.sh`
4. Consommer les classes DS dans votre projet

### Pourquoi cette regle ?

- **Coherence** : tous les projets msyx.fr partagent le meme langage visuel
- **Maintenance** : corriger un bug ou changer un style se fait en un seul endroit
- **Theming** : les composants DS respectent automatiquement tous les themes (MSYX, ACSSI, Nhood)

### Registre des composants

Le fichier `shared/components-registry.json` liste tous les composants disponibles avec :
- Leurs classes CSS principales
- La page thematique ou ils sont documentes
- La fonction JS d'initialisation (si interactif)

### Scripts de verification

Trois scripts sont disponibles pour detecter les drifts :

```bash
# 1. Verifier que la copie locale du DS est a jour
./check-sync.sh /chemin/projet/styles/ds-tokens.css

# 2. Detecter les composants custom reimplementes hors DS
./check-components.sh /chemin/projet/styles/

# 3. Detecter les overrides de classes DS
./check-sync.sh --check-overrides /chemin/projet/styles/
```

**check-components.sh** detecte les classes CSS avec des prefixes composant-like (`.btn-`, `.card-`, `.modal-`, etc.) qui ne sont pas dans le registre DS. Pour les cas legitimes (ex : Tailwind, librairie tierce), ajouter les classes dans un fichier `.ds-allowlist` (une classe par ligne) a la racine du dossier CSS analyse.

**check-sync.sh --check-overrides** detecte les redefinitions de classes DS dans vos CSS locaux. La regle : ne jamais redefinir une classe DS — customiser via les variables CSS (`var(--token)`).

---

## Structure des fichiers CSS

| Fichier | Contenu | Obligatoire ? |
|---------|---------|---------------|
| `tokens.css` | Variables CSS + themes (couleurs, spacing, radius, shadows) | **OUI** |
| `utilities.css` | Classes utilitaires (`.text-muted`, `.bg-surface`, `.border-accent`, `.sr-only`) | Recommande |
| `layout.css` | Header, sidebar, main (shell de navigation) | Optionnel — si layout custom |
| `components.css` | Boutons, cards, badges, forms, modals, tables, etc. | Optionnel — selon besoins |

## Comment integrer

### Option A — Tout importer (projet qui reutilise le shell DS)

```css
@import url('ds-tokens.css');
@import url('ds-utilities.css');
@import url('ds-layout.css');
@import url('ds-components.css');
```

### Option B — Minimal (projet avec son propre layout et composants)

```css
@import url('ds-tokens.css');
@import url('ds-utilities.css');
```

Les variables CSS (`var(--accent)`, `var(--surface)`, etc.) sont disponibles partout.
Les classes utilitaires (`.text-muted`, `.bg-accent`, `.border-subtle`) evitent les couleurs en dur.

### Option C — Selectif

```css
@import url('ds-tokens.css');
@import url('ds-utilities.css');
@import url('ds-components.css');  /* composants sans le layout shell */
```

### Niveau C — Shell complet (CSS + JS) (#372)

Pour reproduire le shell DS complet (layout header/sidebar, scroll-spy, navigation
SPA, composants interactifs : modals, toasts, sliders, kanban...) **sans dependre
de `design-system.msyx.fr`**, `sync.sh` distribue aussi les fichiers JS et
l'agregateur CSS, prefixes `ds-` comme les CSS :

- `ds-styles.css` — agregateur CSS (importe tous les modules `ds-*.css`)
- `ds-nav.js` — header, sidebar, scroll-spy, navigation SPA, LazyLoader. La sidebar est **générée dynamiquement** depuis vos `.main > section[id]` (v2.69.0) : si vos sections portent un `.section-header h2`, elles apparaissent automatiquement dans la navigation. Aucune ancre à maintenir. Si aucune section n'est trouvée → sidebar vide propre (pas de crash).
- `ds-components.js` — composants interactifs (toasts, modals, tabs, sliders...)

Integration dans une page consumer :

```html
<head>
  <link rel="stylesheet" href="/styles/ds-styles.css">
  <!-- ou les @import Option A/B/C ci-dessus -->
</head>
<body>
  <header class="site-header" id="site-header"></header>
  <aside class="sidebar" id="sidebar"></aside>
  <div class="main"><!-- contenu --></div>

  <script src="/styles/ds-nav.js"></script>
  <script src="/styles/ds-components.js"></script>
</body>
```

> `ds-styles.css` reecrit ses `@import` vers les `ds-*.css` voisins (resolus dans
> le meme dossier styles/). Les fichiers JS sont distribues **byte-identiques** a
> la source DS — recopier a chaque sync ulterieur pour rester aligne sur la version.

## Comment synchroniser

### Sync manuelle (un seul projet)

```bash
# Copier les fichiers DS dans votre projet
./sync.sh /chemin/vers/projet/styles/

# Verifier si votre copie est a jour (4 fichiers verifies)
./check-sync.sh /chemin/vers/projet/styles/
```

Le script `sync.sh` copie les fichiers DS avec le prefixe `ds-` :
- `ds-tokens.css`, `ds-themes.css`, `ds-base.css`, `ds-utilities.css`, `ds-layout.css`, `ds-components.css`
- `ds-fonts.css` (+ `fonts/*.woff2`) et `icons/sprite.svg` (self-hosted)
- **Niveau C (#372)** : `ds-styles.css` (agregateur), `ds-nav.js`, `ds-components.js` (shell JS)

### Sync automatique (tous les consommateurs)

Le script `sync-all.sh` synchronise en une seule commande tous les projets
enregistres dans `shared/consumers.json` :

```bash
# Synchroniser tous les consommateurs enregistres
./sync-all.sh

# Voir ce qui serait fait sans modifier quoi que ce soit
./sync-all.sh --dry-run

# Synchroniser en mode --no-showcase (recommande pour projets hors DS)
./sync-all.sh --no-showcase
```

Exemple de sortie :

```
=== sync-all.sh — Design System v2.18.0 ===

  OK    [acssi-core]    : v2.17.0 → v2.18.0
  OK    [acssistender]  : v2.17.0 → v2.18.0
  SKIP  [aksyva]        — répertoire absent : /home/.../src/styles

─── Récapitulatif ───────────────────────────────────────────
  Consommateurs enregistrés : 3
  Synchronisés              : 2
  Ignorés (absent)          : 1

OK — 2 consommateur(s) synchronisé(s) vers v2.18.0
```

### Enregistrer un nouveau consommateur

Editer `shared/consumers.json` et ajouter une entree :

```json
{
  "consumers": [
    {"name": "mon-projet", "path": "/home/deployer/projects/prod/mon-projet", "css_dir": "src/styles"}
  ]
}
```

Le champ `css_dir` indique le chemin relatif depuis `path` ou se trouvent
les fichiers `ds-*.css`. Valeur par defaut : `src/styles`.

## Regles d'or

### Jamais de couleurs en dur

```css
/* MAL */
color: #94a3b8;
background: #1e293b;
border: 1px solid rgba(59, 130, 246, 0.2);

/* BIEN */
color: var(--text-muted);
background: var(--surface);
border: 1px solid rgba(var(--accent-rgb), 0.2);
```

### Jamais de style inline avec des variables

```jsx
/* MAL */
style={{ color: "var(--text-muted)" }}
style={{ background: "var(--surface)" }}

/* BIEN — utiliser les classes utilitaires */
className="text-muted"
className="bg-surface"
```

### Variables RGB pour les opacites

```css
/* Utiliser les triplets RGB pour rgba() */
background: rgba(var(--accent-rgb), 0.1);
border: 1px solid rgba(var(--success-rgb), 0.2);
box-shadow: 0 0 12px rgba(var(--danger-rgb), 0.3);
```

Variables RGB disponibles : `--accent-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`.

## Themes disponibles

Mettre `data-theme` sur `<html>` pour changer la palette :

```html
<html data-theme="msyx" data-mode="dark">   <!-- defaut -->
<html data-theme="acssi" data-mode="dark">  <!-- corporate or -->
<html data-theme="nhood" data-mode="dark">  <!-- corporate vert -->
<html data-theme="nhood" data-mode="light"> <!-- nhood clair -->
```

| Theme | Modes | Accent |
|-------|-------|--------|
| MSYX | dark, light | `#3b82f6` bleu |
| ACSSI | dark | `#e0cd1e` or |
| Nhood | dark, light | `#008837` vert |

Les variables se mettent a jour automatiquement — aucun changement CSS necessaire.

## Header avec utilisateur connecte

Le header integre nativement la gestion de l'utilisateur connecte (avatar + dropdown), les notifications (cloche + panel popover) et les transitions douces de theme.

### Configuration via window.MSYX_HEADER

Definir cet objet **avant** le chargement de `nav.js` :

```html
<script>
window.MSYX_HEADER = {
  auth: true,                    // false = header sans zone user
  user: {
    name: 'Mike',
    initials: 'M',               // utilise si pas d'avatar
    avatar: '/img/avatar.png'    // URL image (optionnel)
  },
  notifications: {
    enabled: true,
    count: 3,                    // badge initial
    items: [                     // liste affichee dans le panel (optionnel)
      {
        title: 'Nouveau message',
        desc: 'Description courte',
        time: '2 min',
        icon: '&#128172;',
        unread: true
      }
    ]
  },
  menu: [
    { label: 'Profil',       icon: '&#128100;', href: '/profil' },
    { label: 'Preferences',  icon: '&#9881;',   href: '/settings' },
    { divider: true },
    { label: 'Deconnexion',  icon: '&#128682;', action: 'logout', class: 'danger' }
  ]
};
</script>
<script src="/shared/nav.js"></script>
```

### Sans auth

```javascript
window.MSYX_HEADER = { auth: false };
// ou simplement ne pas definir window.MSYX_HEADER
```

Le header affiche alors uniquement le logo + theme switcher.

### Mises a jour dynamiques

```javascript
// Apres login : mettre a jour l'avatar
updateHeaderUser({ name: 'Mike', initials: 'M' });

// Apres reception de notifications
updateNotificationCount(5);
```

### Event logout

```javascript
document.addEventListener('msyx:logout', function() {
  // Votre logique de deconnexion
  window.location.href = '/logout';
});
```

### Transitions theme

Le changement de theme/mode via le header declenche automatiquement :
- `html.theme-transitioning` sur le document (transition CSS douce, 250ms)
- Un toast de confirmation ("Theme : ACSSI", "Mode : Light")

## Anti-FOUC

Pour eviter le flash de theme au chargement, ajouter ce script inline dans `<head>` :

```html
<script>
  (function(){
    var t = localStorage.getItem('msyx-theme') || 'msyx';
    var m = localStorage.getItem('msyx-mode') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-mode', m);
  })();
</script>
```

## Utilities

Classes utilitaires disponibles dans `utilities.css` pour les cas courants.

### `.icon-svg` (v2.59.0, #282)

Utility pour SVG inline dans conteneur flex. Empêche l'écrasement du SVG par le parent flex (`flex-shrink:0`). Sans width/height par défaut — passer les attributs HTML `width` et `height` au `<svg>` directement.

Exemple :
```html
<button class="btn btn-primary">
  <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24">...</svg>
  <span>Ajouter</span>
</button>
```

Cas d'usage typiques : bouton avec icône + texte, cellule de tableau avec icône de statut, badge avec pictogramme. Combinable avec `.icon` (sprite Lucide) :

```html
<button class="btn-primary" aria-label="Télécharger">
  <svg class="icon icon-svg" aria-hidden="true" width="16" height="16">
    <use href="/shared/icons/sprite.svg#i-download"/>
  </svg>
  Télécharger
</button>
```

> Note : `.icon-svg` ne définit pas de taille — toujours spécifier `width` et `height` sur le `<svg>` pour éviter le layout shift.

---

## Mapping aksy DS-EXCEPTION → DS msyx.fr (v2.27.0+)

Les variantes destructives suivantes utilisees en aksy sont couvertes par le DS standard :

| Classe aksy (custom) | Equivalent DS | Notes |
|---|---|---|
| `.btn-ghost.btn-danger` | `.btn-outline-danger` | Border + texte rouge sans fond, hover = bg rouge transparent. Semantiquement identique. |
| `.btn-primary.btn-danger` | `.btn-primary.btn-danger` (gradient) | DS expose `.btn-danger` en gradient (style charte msyx). Si flat strict requis, override projet (DS-EXCEPTION acceptee). |
| `.btn-icon--danger` | `.btn-icon.btn-icon--danger` | Disponible depuis v2.27.0 (#156). Combine `.btn-icon` (taille 44x44, forme) et `.btn-icon--danger` (couleur rouge). |

Les projets consumers SHOULD migrer leurs overrides custom vers les classes DS pour profiter du theming automatique (3 themes x 2 modes).

**Exemple d'usage :**
```html
<!-- Bouton icone destructif (aria-label obligatoire) -->
<button class="btn-icon btn-icon--danger" aria-label="Supprimer">&#128465;</button>
<button class="btn-icon btn-icon--danger" aria-label="Retirer">&#10005;</button>

<!-- Bouton outline danger (equivalent .btn-ghost.btn-danger) -->
<button class="btn-secondary btn-outline-danger">Annuler</button>

<!-- Bouton plein danger (equivalent .btn-primary.btn-danger) -->
<button class="btn-primary btn-danger">Supprimer</button>
```

---

## Paires fg/bg safe — ACSSI light (WCAG AA)

Ratios mesurés sur palette ACSSI light (`[data-theme="acssi"][data-mode="light"]`) v2.30.0+.
Recalibrage effectué en v2.30.0 (closes #164, fixes consumer bugs aksy#267 #268 #271).

### A utiliser

| Texte | Fond | Ratio | Usage |
|-------|------|-------|-------|
| `--text` (#00243f) | `--surface-solid` (#fff) | 16.4:1 | Tout texte standard |
| `--text` | `--primary` (#f0f4f8) | 14.9:1 | Texte sur sidebar/section |
| `--text-muted` (#2c4358) | `--surface-solid` | 5.45:1 | Legendes, metadonnees |
| `--text-muted` | `--primary` | 5.12:1 | Legendes sur sidebar |
| `--text-on-accent` (#fff) | `--accent` (#00345f) | 9.7:1 | Texte sur boutons primary |
| `--text-on-accent` | `--accent-light` (#00457a) | 7.5:1 | Texte sur etats hover/active |
| `--text-dim` (#4a6a84) | `--surface-solid` | 3.97:1 | **UI / large text only** (>=18px ou >=14px bold) |

### A eviter (paires illisibles)

| Texte | Fond | Ratio | Action |
|-------|------|-------|--------|
| `--accent-light` (#00457a) | `--accent` (#00345f) | 1.29:1 | Utiliser `--text-on-accent` a la place |
| `--text-dim` | surfaces marines (`--surface-solid` quand override) | < 2:1 | Bascule sur `--text-muted` |

### Regle d'or ACSSI light

- **Texte sur fond accent** → toujours `--text-on-accent`
- **Texte sur fond surface clair** → `--text` (body) ou `--text-muted` (secondaire)
- **`--text-dim`** → seulement decoratif (legend, label de chart) sur fond `--surface-solid` blanc — jamais sur surfaces marines
- **`--accent-light`** → decoratif sur fonds **tintes transparents** (`color-mix --accent 8-12%`), JAMAIS sur `--accent` solide

---

## Bannir `color: white` côté consumer (v2.30.1, #165)

**Règle** : ne jamais utiliser `color: white`, `color: #fff` ou `color: #ffffff` en dur dans le code consumer.

### Pourquoi ?

Les tokens `--accent`, `--gradient-*` et `--danger` varient par thème. En ACSSI dark, l'accent est **or** (`#e0cd1e`) — du blanc sur fond or donne un ratio < 3:1, illisible. Le token `--text-on-accent` est thème-aware et garantit WCAG AA minimum dans toutes les combinaisons.

### Tokens à utiliser

| Situation | Token correct | Ne pas écrire |
|-----------|---------------|---------------|
| Texte sur fond `--accent` | `color: var(--text-on-accent)` | `color: #fff` |
| Texte sur fond `--gradient-1` / `--gradient-*` | `color: var(--text-on-accent)` | `color: white` |
| Texte sur fond `--danger` | `color: var(--text-on-accent)` | `color: #ffffff` |
| Badge/compteur sur fond coloré | `color: var(--text-on-accent)` | `color: #fff` |

### Dérogation autorisée

Si le fond est **thème-indépendant** (ex. `rgba(0,0,0,0.5)`, fond noir overlay), conserver `#fff` est correct. Documenter le choix avec un commentaire :

```css
color: #fff; /* a11y: fond noir 50% indépendant du thème, blanc lisible toujours (ratio ~10:1) */
```

### Vérification rapide

```bash
grep -rn "color:\s*white\|color:\s*#fff" votre-projet/src/
# → aucun résultat sans commentaire de dérogation
```

---

## Tree-shaking — sélectionner uniquement les composants nécessaires

Depuis v2.36, le DS expose 3 niveaux d'intégration :

### Niveau 1 — Tout (par défaut, recommandé)
```bash
./sync.sh /path/to/target/styles/
```
Copie `ds-components.css` (barrel complet, ~175 KB d'overhead initial, ~25 KB après gzip).

### Niveau 2 — Core (consumers légers : auth gate, landing)
Couvre ~80% des cas courants (boutons, cards, forms, alerts, badges).
```bash
./sync.sh --components=core /path/to/target/styles/
```
Copie `components-core.css` (~42 KB) vers `ds-components.css` + 7 modules dans `components/`.

### Niveau 3 — Sélection custom (avancé)
```bash
./sync.sh --components=buttons,cards,modals,forms /path/to/target/styles/
```
Copie un barrel généré à la volée + uniquement les modules listés dans `components/`.

### Modules disponibles
`buttons`, `cards`, `badges`, `alerts`, `forms`, `navigation`, `tables`, `modals`, `overlays`,
`data`, `lists`, `feedback`, `media`, `interactive`, `avatars`, `theming`, `templates`,
`tracker`, `pricing`, `notifications`, `quiz`, `motion`.

Modules transverses (toujours inclus automatiquement) : `_base` (reset natif), `_a11y` (focus-visible global), `_responsive`.

### Avertissement
- **Cascade** : l'ordre est imposé par le barrel généré. Ne pas réordonner manuellement.
- **Mise à jour** : à chaque sync ultérieur, repasser le même flag `--components=<list>`.
- **Pas de tree-shake automatique** : si vous ajoutez un composant côté consumer, ajouter son module à la liste.

### Dry-run (test sans modification)
```bash
./sync-all.sh --components=buttons,cards --dry-run
# Affiche les fichiers qui seraient copiés sans rien modifier
```

### Poids reels par module (gzip -9) — baseline v2.54.0

Mesure effectuee le 2026-05-09 sur `shared/css/components/`.
Modules tries par poids decroissant.

| Module | Taille gzip | Cas d'usage |
|--------|-------------|-------------|
| `forms` | 4 540 B | Inputs, selects, checkboxes, OTP, tag input, file upload |
| `data` | 3 421 B | Tables, data grid, stats, charts, tree view |
| `interactive` | 3 111 B | Accordion, command palette, context menu, copy button |
| `pricing` | 2 728 B | Cartes pricing, plans |
| `modals` | 2 663 B | Modals, focus trap, backdrop |
| `navigation` | 2 498 B | Header, sidebar, tabs, breadcrumbs, stepper, bottom nav |
| `media` | 2 415 B | Carousel, lightbox, video embed |
| `templates` | 2 114 B | Kanban, roadmap, sprint board |
| `lists` | 2 086 B | Listes structurees, activity feed |
| `cards` | 1 979 B | Cards, card-link a11y |
| `feedback` | 1 870 B | Empty states, spinners, pagination, tooltip, drawer, FAB |
| `badges` | 1 829 B | Badges, badge-nav, achievement badges |
| `tracker` | 1 695 B | Progress tracker, stepper avance |
| `overlays` | 1 616 B | Toasts, popovers, notification center |
| `tables` | 1 542 B | Tables simples (sans data grid) |
| `motion` | 1 542 B | Animations canoniques, transitions |
| `buttons` | 1 289 B | Boutons, btn-icon, variantes |
| `notifications` | 1 214 B | Notification center, bottom sheet |
| `theming` | 1 194 B | Theme switcher, mode toggle |
| `alerts` | 1 060 B | Alertes, bannieres |
| `quiz` | 975 B | Quiz/poll, filter-bar |
| `_a11y` | 876 B | Focus-visible global (inclus auto) |
| `_base` | 714 B | Reset natif (inclus auto) |
| `avatars` | 609 B | Avatars, initiales |
| `_responsive` | 551 B | Media queries transverses (inclus auto) |
| `signature` | 360 B | Gradient underline overline |

**Total modules non-transverses** : ~41 KB gzip (ensemble complet)
**Core preset (7 modules)** : buttons + cards + badges + alerts + forms + navigation + modals ≈ 14 KB gzip

Pour un projet minimal (auth gate, landing page) : `--components=core` suffit (~14 KB vs ~41 KB en plein).

---

## Tokens dépréciés (deadline v3.0.0)

Depuis **v2.34.0** (Sprint 20), cinq tokens ont été renommés pour lever des ambiguïtés sémantiques. Les anciens noms sont conservés comme **aliases** dans `tokens.css` jusqu'à la v3.0.0 — vos CSS continuent de fonctionner sans modification.

### Tableau de migration

| Ancien token (déprécié) | Nouveau token canonique | Raison |
|-------------------------|-------------------------|--------|
| `--border` | `--border-color` | Évite la confusion avec `--border-width` (longueur) |
| `--radius` | `--radius-card` | Évite la confusion avec l'échelle `--radius-{xs,sm,md,lg,full}` |
| `--violet` | `--deco-violet` | Couleur décorative, pas un rôle sémantique |
| `--violet-rgb` | `--deco-violet-rgb` | Idem |
| `--cyan` | `--deco-cyan` | Idem |
| `--cyan-rgb` | `--deco-cyan-rgb` | Idem |
| `--pink` | `--deco-pink` | Idem |

### Ce qui se passe en v3.0.0

Les aliases seront supprimés. Si votre projet utilise encore les anciens noms à ce moment, vos composants se casseront visuellement (les tokens renverront `unset`).

### Migration recommandée

À votre prochain sprint UI, exécutez le codemod fourni dans le design system (depuis votre dossier `shared/` après un `sync.sh`) :

```bash
./shared/codemod-rename-tokens.sh
```

Puis vérifiez l'idempotence :

```bash
./shared/codemod-rename-tokens.sh --check-idempotent
```

### Vérification manuelle

Pour lister les occurrences restantes dans votre codebase :

```bash
grep -rn -- '--border[^-]' --include="*.css" --include="*.html" --include="*.js" .
grep -rn -- '--radius[^-]' --include="*.css" --include="*.html" --include="*.js" .
grep -rn -- '--violet\|--cyan\|--pink' --include="*.css" --include="*.html" --include="*.js" .
```

---

## Adding a theme (v2.39.0+)

Le design system utilise un generateur JSON → CSS depuis v2.39.0. Les themes sont definis dans `themes/*.json` et compiles vers `shared/css/themes.css` via `node shared/build-themes.js`.

### Workflow complet

**Etape 1 — Creer le fichier JSON du theme**

Utiliser le script scaffold pour creer un nouveau theme depuis le template MSYX :

```bash
# Depuis la racine du design-system-project
./shared/scaffold-theme.sh <theme-name>
```

Cela cree `themes/<theme-name>.json` et recompile `shared/css/themes.css` automatiquement.

Ou manuellement, creer `themes/<theme-name>.json` avec la structure suivante :

```json
{
  "name": "mon-theme",
  "displayName": "Mon Theme",
  "modes": {
    "dark": {
      "--accent": "#rrggbb",
      "--accent-rgb": "r, g, b",
      "--primary": "#rrggbb"
    },
    "light": {
      "--accent": "#rrggbb",
      "--accent-rgb": "r, g, b",
      "--primary": "#rrggbb"
    }
  }
}
```

**Regles JSON importantes :**
- Inclure UNIQUEMENT les variables qui overrident `:root` (pas le set complet)
- Les cles `_comment_*` sont ignorees par le generateur (annotations facultatives)
- Valeurs literales exactes : espaces, casse hex, virgules preserves

**Etape 2 — Compiler themes.css**

```bash
node shared/build-themes.js
```

Le script produit un CSS deterministe (tri alphabetique des proprietes, encoding UTF-8, LF). Le fichier `shared/css/themes.css` est autogenere — ne pas editer manuellement.

**Etape 3 — Activer le theme dans components.js**

Dans `shared/components.js`, ajouter une entree dans `THEME_CONFIG` :

```js
const THEME_CONFIG = {
    // ...themes existants...
    'mon-theme': { modes: ['dark', 'light'], label: 'Mon Theme' }
};
```

Et ajouter une option dans le selecteur HTML du theme switcher.

**Etape 4 — Verifier la byte-identite (VR)**

Apres chaque modification de theme, lancer les tests visuels de reference pour s'assurer qu'aucune regression n'est introduite :

```bash
npm run test:visual
```

Les 108 baselines (3 themes × 2 modes × 9 pages × 2 viewports) doivent passer sans `--update-snapshots`. Si un diff est detecte :
1. Lire le rapport Playwright pour identifier le theme/mode/viewport touche
2. Comparer les valeurs dans le fichier JSON vs les blocs CSS originaux
3. Corriger la valeur incorrecte dans le JSON et relancer `node shared/build-themes.js`

### Structure du theme generator

```
themes/
  msyx.json       # Theme MSYX (reference — msyx reste dans :root de tokens.css)
  acssi.json      # Theme ACSSI (bleu marine / or)
  nhood.json      # Theme Nhood (vert foret / menthe)
  <custom>.json   # Vos themes additionnels
shared/
  build-themes.js   # Compilateur JSON → CSS (no deps, deterministe)
  scaffold-theme.sh # Helper scaffold depuis le template msyx
  css/
    themes.css      # AUTOGENERATED — ne pas editer directement
```

---

## Accessibilité — Skip link WCAG 2.4.1 (v2.62.0)

### Contexte

WCAG 2.4.1 *Bypass Blocks* exige qu'un mécanisme permette aux utilisateurs clavier et lecteurs d'écran de sauter la navigation répétitive (header, nav) pour accéder directement au contenu principal.

Le DS fournit la classe `.skip-to-content` dans `shared/css/components/_a11y.css` (inclus automatiquement via `components.css`).

### Utilisation

Placer le lien en **premier enfant de `<body>`**, avant tout autre élément (header, nav, scripts) :

```html
<body>
  <a href="#main-content" class="skip-to-content">Aller au contenu principal</a>
  <!-- header, nav... -->
  <main id="main-content">
    <!-- contenu principal -->
  </main>
</body>
```

L'élément cible (`id="main-content"`) doit exister dans la page.

### Comportement

- **Par défaut** : masqué hors-écran (`transform: translateY(-200%)`), invisible visuellement.
- **Au focus clavier** (`:focus-visible`) : glisse en position visible en haut à gauche de la page, avec outline DS.
- **Couleurs** : fond `--accent`, texte `--text-on-accent` — thème-aware (conforme WCAG AA sur tous les thèmes DS).
- **Transition** : 120 ms ease-out (respectée par `prefers-reduced-motion: reduce` — réduite à 0.01 ms).

### Tokens utilisés

| Token | Valeur par défaut | Usage |
|---|---|---|
| `--accent` | `#3b82f6` | Fond du skip link |
| `--text-on-accent` | `#ffffff` | Couleur texte (thème-aware) |
| `--space-2` | `0.75rem` | Position top/left + padding vertical |
| `--space-md` | `1rem` | Padding horizontal |
| `--radius-sm` | `8px` | Border-radius |
| `--accent-light` | `#60a5fa` | Couleur outline au focus |

### Note consumers existants (AKSY, aksyva...)

Si votre app implémente un skip link local, vous pouvez retirer votre override après synchronisation DS v2.62.0 avec `shared/sync.sh`.
