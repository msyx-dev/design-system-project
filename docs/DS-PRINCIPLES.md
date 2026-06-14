# DS-PRINCIPLES.md — Principes & anti-patterns du design system msyx

> **À lire avant de créer ou modifier un composant DS.**
> Ce document consolide les règles de conception/code du design-system-project, les anti-patterns à éviter, et la checklist anti-dette.
>
> **Versionné** avec le projet. **Mis à jour** à chaque sprint qui révèle un nouveau pattern ou anti-pattern.

---

## Pourquoi ce document existe

Un design system tient sa valeur de sa **cohérence**. Une seule classe hardcodée, un seul composant qui ignore le theming, une seule page sans `section-header` — et la dette commence. Sur 32 sprints, cette dette se compose silencieusement.

Ce document liste les règles concrètes à respecter pour garder un DS sain. Il n'est pas exhaustif (le code source l'est) mais il capture les **règles que les agents doivent respecter par défaut** et les **erreurs déjà observées qu'il ne faut pas reproduire**.

---

## Section 1 — Tokens d'abord (jamais de valeur hardcodée)

### Règle
**Toute valeur de design doit passer par un token** défini dans `shared/css/tokens.css`.

### Anti-patterns concrets

❌ **Don't** :
```css
.my-component {
  color: #3b82f6;            /* hex hardcodé */
  background: rgb(10, 15, 30); /* rgb literal */
  padding: 16px;              /* px brut */
  font-family: 'Inter', sans-serif; /* font-family directe */
  border-radius: 8px;         /* px sur radius */
}
```

✅ **Do** :
```css
.my-component {
  color: var(--accent);
  background: var(--primary);
  padding: var(--space-4);
  font-family: var(--font-body);
  border-radius: var(--radius-md);
}
```

### Règle `px` recalibrée (#393)
Tous les `px` ne se valent pas. La règle n'est PAS « zéro px » (ce serait 340 lignes à tokeniser sans gain) mais **« px là où un token existe »** :

**✅ AUTORISÉS sans token** (valeurs structurelles ou hors échelle de design) :
- **Dimensions structurelles** : `width` / `height` fixes d'un élément (`width: 56px` d'un switch track, `width: 40px` d'une icône, `width: 300px` d'un panel).
- **Bordures / outlines fins** : `1px` ou `2px` sur `border` / `outline` (cf. `border: 1px solid var(--border-color)`).
- **`0`** sans unité.
- **Radius « pill »** : `50px`, `999px`, `9999px` (cercle/capsule — pas une valeur d'échelle), ou directement `var(--radius-full)`.

**🔴 REQUIS en token** (valeurs qui appartiennent à une échelle de design) :
- **Espacement** : tout `padding` / `margin` / `gap` → `var(--space-*)`.
- **`font-size`** : pas de `px` brut — utiliser `rem` (le DS dimensionne la typo en `rem`, pas en `px`).
- **`border-radius`** qui correspond à une valeur de l'échelle `--radius-*` :
  `24px → var(--radius-lg)`, `16px → var(--radius-card)`, `12px → var(--radius-md)`, `8px → var(--radius-sm)`, `4px → var(--radius-xs)`.

❌ **Don't** :
```css
.card {
  padding: 16px;            /* espacement → token */
  border-radius: 8px;       /* radius = valeur d'échelle (8 = --radius-sm) → token */
  font-size: 14px;          /* font-size en px → utiliser rem */
}
```

✅ **Do** :
```css
.card {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;      /* typo en rem */
  width: 320px;             /* dimension structurelle → px OK */
  border: 1px solid var(--border-color); /* 1px border → px OK */
  border-radius: 50px;      /* pill → px OK (hors échelle --radius-*) */
}
```

### Autres exceptions tolérées
- Caractères Unicode pour icons textuels dans composants legacy (à migrer vers sprite).

### Garde-fou
- **Script CI bloquant** : `shared/check-hardcoded-tokens.sh` detecte les font-family literals, hex hardcodes, rgba numeriques **et couleurs nommees (`white`/`black` hors `color-mix` structurel)**. Perimetre par defaut élargi (#379) à `shared/css/components/` **+ `utilities.css` + `layout.css`**. Integre dans `.github/workflows/ci.yml` job `lint` (anti-regression #279). Exit 1 si findings > 0.
  - **Allowlist** : suffixer une ligne d'un commentaire `/* allow-hardcoded: <raison> */` exclut la valeur du scan (réservé aux cas légitimement non-tokenisables, ex. `rgba(15,23,42,0.08)` slate light-mode sans token noir dédié).
- Script tiers (consumer) : `audit-ds-compliance/scripts/scan-hardcoded-tokens.sh` detecte les hex/rgb/px hardcodes dans les projets consommateurs.

### Exceptions documentees §1 (couleurs de marque — voir DS-PRINCIPLES commentaires inline dans tokens.css)
Trois categories de valeurs hardcodees **legitimement tokenisees** sans lien au theme :
1. **`--login-authentik-accent`** (`#fd4b2d`) — couleur de marque Authentik, non-thematique.
2. **`--achievement-bronze/silver/gold`** (`#cd7f32`, `#c0c0c0`, `#ffd700`) — couleurs metaux universelles Achievement badges (non-thematiques par essence).
3. **`--brand-google[-rgb]`** (`#4285f4`) + **`--brand-microsoft[-rgb]`** (`#0078d4`) — couleurs de marque Google/Microsoft pour les boutons providers OAuth login-screen.

---

## Section 2 — Theming (3 themes × 2 modes = 5 combos à tester)

### Règle
- 2 attributs HTML : `data-theme` (palette : msyx / acssi / nhood) + `data-mode` (dark / light).
- Cascade CSS 4 couches : `:root` → `[data-theme]` → `[data-mode="light"]` → `[data-theme][data-mode]`.
- Tout composant doit être **testable** sur les 5 combos (MSYX dark+light, ACSSI dark+light, Nhood dark+light → certaines combos peuvent être restrictes selon `THEME_CONFIG`).

### Variables RGB pour rgba()
Pour les declinaisons opaques :
```css
/* ❌ Don't — opacite figee, change pas avec theme */
background: rgba(59, 130, 246, 0.1);

/* ✅ Do — utilise --accent-rgb (triplet brut) */
background: rgba(var(--accent-rgb), 0.1);
```

Variables RGB sémantiques disponibles : `--accent-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`, `--info-rgb`.

### Anti-FOUC obligatoire
Tout composant qui dépend du theme/mode **doit** s'afficher correctement dès le premier paint.

Pattern requis (script synchrone inline dans `<head>`) :
```html
<script>
  (function(){
    var t = localStorage.getItem('msyx-theme') || 'msyx';
    var m = localStorage.getItem('msyx-mode') || 'dark';
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.mode = m;
  })();
</script>
```

Conventions localStorage **obligatoires** : `msyx-theme` (palette) + `msyx-mode` (dark/light). **Pas** de divergence avec des clés project-specific (anti-pattern observé sur aksyva : `aksyva-theme` stockait le mode 🤦).

### Ajouter un nouveau theme
1. Bloc CSS `[data-theme="X"]` dans `tokens.css`
2. Variable `--accent-rgb: R, G, B` (triplet sans virgule entre var)
3. Entrée dans `THEME_CONFIG` de `components.js`
4. Option `<option>` dans le selector header
5. Test visuel sur toutes les pages avec dark + light

---

## Section 3 — Accessibilité (WCAG AA — non-négociable)

### Règles baseline

| Critère | Exigence |
|---|---|
| Contraste texte/fond | 4.5:1 minimum (AA) |
| Contraste UI interactif | 3:1 minimum |
| Focus visible | `:focus-visible` style explicite, jamais `outline: none` nu |
| Icon-only buttons | `aria-label` obligatoire |
| Form inputs | `<label>` associé OU `aria-labelledby` |
| Switch/Toggle | `role="switch"` + `aria-checked` |
| Dialog/Modal | `role="dialog"` + `aria-modal="true"` + focus trap + restore on close |
| Keyboard | Tout interactif doit être navigable au clavier (Tab, Enter, Esc) |
| Click target | 44×44px minimum sur mobile (WCAG 2.5.5) — appliqué v2.55.0 sur mode-switch |

### Anti-patterns concrets

❌ **Don't** :
```html
<button onclick="...">🗑️</button>  <!-- icon sans label -->
<input type="text" placeholder="Email">  <!-- placeholder ne remplace pas label -->
<div onclick="...">Cliquer</div>  <!-- div pas focusable, pas keyboard -->
```

✅ **Do** :
```html
<button aria-label="Supprimer" onclick="...">
  <svg><use href="/shared/icons/sprite.svg#i-trash" /></svg>
</button>

<label for="email">Email</label>
<input id="email" type="email" />

<button onclick="...">Cliquer</button>  <!-- button natif, focusable, keyboard -->
```

### 3.1 — Label vs aria-label : règle de décision (capitalisation Lot 3 a11y — #340)

| Cas | Pattern recommandé | Exemple |
|---|---|---|
| Input avec label visible adjacent dans `.input-group` | **`<label for="…">` + `id` sur input** | `<label class="input-label" for="email">Email</label><input id="email" type="email">` |
| Checkbox/Radio avec texte court inline | **Wrapper natif `<label><input>texte</label>`** | `<label class="checkbox"><input type="checkbox"> Next.js</label>` |
| Toggle (input + slider décoratif, texte externe) | **`aria-label` sur l'input** | `<label class="toggle"><input type="checkbox" aria-label="Mode sombre"><span class="toggle-slider"></span></label>` |
| Settings-row (label = `<div>`, layout flex strict) | **`aria-label` sur l'input** (le `<div>` reste label visuel) | `<div class="settings-row-label">Email</div>...<input aria-label="Email">` |
| Tableau dense — checkbox sélection ligne | **`aria-label` dynamique** "Sélectionner {nom-ligne}" | `<input type="checkbox" aria-label="Selectionner Buttons">` |
| Input filtre avec placeholder visuel uniquement | **`aria-label`** (le placeholder ne compte pas WCAG) | `<input placeholder="Filtrer…" aria-label="Filtrer par composant">` |

**Anti-pattern** : `title="…"` sur input — axe-core ne le considère pas comme accessible name fiable (extension navigateur, pas screen-reader). Préférer `aria-label`.

**Anti-pattern** : `placeholder="…"` comme unique label — disparaît au focus, contraste insuffisant, pas annoncé par les SR. Toujours combiner avec `<label>` ou `aria-label`.

**Référence** : décision capitalisée dans Lot 3 a11y (#340, v2.64.5). Audit baseline : `docs/audit-a11y-2026-05-15.md`.

### Garde-fou
- Audit `@axe-core/playwright` sur 54 pages × 6 themes (cf `docs/audit-a11y-*.md`)
- Objectif : 0 violation WCAG A/AA/AA21 (atteint depuis v2.52.0)

---

## Section 4 — Responsive (mobile-first)

### Règle
**Mobile-first uniquement.** `@media (min-width: ...)` — jamais `max-width` (sauf cas exceptionnel documenté).

### Breakpoints DS
| Breakpoint | Largeur | Usage |
|---|---|---|
| `--bp-sm` | 480px | Téléphones larges |
| `--bp-md` | 768px | Tablette portrait |
| `--bp-lg` | 1024px | Tablette landscape / petit desktop |
| `--bp-xl` | 1280px | Desktop standard |

### Anti-patterns concrets

❌ **Don't** :
```css
.card {
  width: 400px;          /* fixed-width casse à 320px */
  padding: 32px;         /* trop large mobile */
}
@media (max-width: 768px) {  /* max-width = desktop-first, à éviter */
  .card { padding: 16px; }
}
```

✅ **Do** :
```css
.card {
  width: 100%;
  padding: var(--space-4);  /* compact par défaut */
}
@media (min-width: 768px) {  /* enrichit à mesure que l'écran grandit */
  .card { padding: var(--space-6); }
}
```

### Test obligatoire
- 320px (iPhone SE) — la page doit rester usable sans scroll horizontal
- 768px (iPad portrait) — layout adapté
- 1280px (desktop) — utilisation pleine largeur

---

## Section 5 — Performance (budgets fermes)

### Règle
Tout ajout/modif d'un composant CSS/JS doit respecter le budget gzip.

### Budgets actuels (cf `docs/PERF-BUDGET.md`)
| Fichier | Baseline (gzip -9) | Seuil (+5%) |
|---|---|---|
| `tokens.css` | 5 136 B | 5 392 B |
| `utilities.css` | 2 371 B | 2 489 B |
| `components.css` | 364 B (barrel) | 382 B |
| `nav.js` | mesuré par run | mesuré par run |
| `components.js` | mesuré par run | mesuré par run |

Dépassement = warn, devient block après stabilisation (post-S31 plan).

### Trade-offs perf connus
- **Glass vs solid** (v2.33.0) : `backdrop-filter` coûte ~3-8ms de paint sur low-end devices. Réservé aux composants visibles (header, modals). Pour cards et listes : préférer solid.
- **Lucide sprite self-hosted** (v2.33.0) : 21 KB pour 50 glyphes, économise 1 requête HTTP + permet le caching navigateur.
- **Anti-FOUC inline** : script `<head>` synchrone < 200 octets. Pas de fetch externe.

### Garde-fou
- `shared/perf-budget.sh` exécuté en CI sur chaque PR
- Lighthouse CI configuré dans `lighthouserc.cjs` (warn-only, à passer en block)

---

## Section 6 — Naming & conventions

### Classes CSS — convention simplifiée BEM-like
- `.composant` — root
- `.composant--variant` — variante (taille, état, color)
- `.composant-element` — sous-élément (préfixé par le composant)
- `.composant-element--variant` — variante du sous-élément

Exemples observés cohérents :
```
.btn               .btn-primary        .btn-sm
.card              .card-icon          .card-link
.mode-switch       .mode-switch-track  .mode-switch-thumb
.header-dropdown   .header-dropdown-header  .header-dropdown-item
```

### Modules CSS — un composant = un fichier
Dans `shared/css/components/` :
- 1 composant logique = 1 fichier `.css` dédié (ex : `buttons.css`, `mode-switch.css`)
- Le fichier `components.css` (barrel) importe tous les modules dans l'ordre cascade
- Le fichier `components-core.css` importe uniquement les 7 modules essentiels (~42 KB pour consumers light)

### JS — anti-double-bind obligatoire
Tout event listener doit utiliser le pattern `dataset.bound` pour éviter le double-binding lors de SPA navigation / reinit :

```js
function initMyComponent() {
  document.querySelectorAll('.my-component').forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = 'true';
    el.addEventListener('click', handleClick);
  });
}
```

Toute fonction `init*` doit être appelée dans le bloc `reinitAll()` de `components.js` pour compat SPA.

---

## Section 7 — Versioning (@ds-version)

### Règle
**Chaque ajout/modif visible côté consumer** = bump `@ds-version` synchronisé sur 5 fichiers :
1. `shared/css/tokens.css`
2. `shared/css/utilities.css`
3. `shared/css/components.css`
4. `shared/css/layout.css`
5. `shared/nav.js` (header-version)

### Convention semver
- **Feature** (ajout composant, nouveau token) → bump **minor** (2.55 → 2.56)
- **Fix** (bug, ajustement existant) → bump **patch** (2.55.0 → 2.55.1)
- **Breaking change** (rare) → coordonné avec consumers, bump **major**

### Pré-allocation pour sprints multi-bumps
Si un sprint touche `@ds-version` sur 3+ issues, le parent `/sprint` **pré-alloue les versions** et les injecte dans le prompt `/dev` de chaque issue. Garantit zéro conflit git sur les bumps. Validé Sprint 17 (0 conflit vs 2 attendus en S16).

### Garde-fou
- Script `check-sync.sh` (consumers) vérifie le drift de version
- CI sur DS vérifie cohérence inter-fichiers

---

## Section 8 — Checklist anti-dette pour tout nouveau composant

Avant de merger un nouveau composant, valider TOUS les points :

### HTML
- [ ] Section dans la page thématique appropriée (`composants.html`, `navigation.html`, etc.)
- [ ] Pattern `<section id="..."><section-header>...</section-header><demo-box>...</demo-box></section>`
- [ ] Au moins 2-3 variantes (tailles, états, couleurs)
- [ ] Cohérent stylistiquement avec les sections existantes de la page

### CSS
- [ ] Fichier dédié dans `shared/css/components/<name>.css`
- [ ] Import ajouté dans `components.css` (barrel) à la bonne place dans la cascade
- [ ] Commentaire en-tête `/* ===== NOM COMPOSANT ===== */`
- [ ] Aucune valeur hardcodée (cf Section 1)
- [ ] Mobile-first (cf Section 4)
- [ ] Testé sur les 5 combos theme/mode (cf Section 2)

### JS (si interactif)
- [ ] Fonction `init<NomComposant>()` exportée
- [ ] Pattern `dataset.bound` sur tous les event listeners
- [ ] Appel dans `reinitAll()` pour compat SPA
- [ ] Pas de fuite mémoire (cleanup si nécessaire)

### A11y (cf Section 3)
- [ ] aria-label / aria-labelledby sur tous les interactifs sans texte
- [ ] Focus visible préservé
- [ ] Keyboard navigation OK (Tab, Enter, Esc selon contexte)
- [ ] Contraste vérifié (axe-core en CI)

### Performance (cf Section 5)
- [ ] Budget gzip respecté (warn CI)
- [ ] Pas d'animation coûteuse sur les composants haute fréquence (lists, tables)
- [ ] Anti-FOUC respecté si dépendance theme/mode

### Documentation
- [ ] `docs/ARCHITECTURE.md` mis à jour (structure + section JS si init*)
- [ ] `CLAUDE.md` mis à jour (description page)
- [ ] `RELEASES.md` entrée Added/Changed
- [ ] Compteur composants dans `site.html` mis à jour (hero + hub cards)

### Versioning
- [ ] `@ds-version` bumpé sur les 5 fichiers (cf Section 7)
- [ ] Tag git aligné si release

### Registre
- [ ] Entrée dans `shared/components-registry.json` :
  - `name`, `page`, `cssClasses` (toutes les classes principales), `jsInit` (ou null), `example`
  - `react` : statut de portage React — `ported` (wrapper `@msyx-dev/react` existe) / `pending` (portable, pas encore porté) / `n-a` (non portable : token, layout, primitive). **Défaut auto = `pending` pour tout `kind:component`** ; à passer `ported` uniquement avec le wrapper React dans le mapping `REACT_TO_REGISTRY` de `bin/generate-registry.js`.
  - `module` : **NE PAS SAISIR À LA MAIN** — champ `string[]` auto-dérivé par `generate-registry.js` à partir de `cssClasses` (voir Section 8.2 — Pont module[] ci-dessous).
- [ ] `version` global du registry mis à jour

### Tests visuels (Visual Regression)
- [ ] Nouvelle baseline VR générée pour la page concernée
- [ ] Tests sur les 5 combos theme/mode (où applicable)

---

## Section 8.1 — Parité React (gouvernance anti-dérive)

Le DS distribue deux artefacts : CSS statique (78 composants) et `@msyx-dev/react`
(5 composants au 2026-06-13). L'écart s'est creusé en silence faute de mesure (#523).

### Donnée, pas découverte

Chaque entrée du registre porte un champ `react` : `ported` / `pending` / `n-a`.
L'écart global (N ported / M portables) est imprimé par `generate-registry.js`
et dans les logs CI à chaque run — jamais silencieux.

### Check CI (autonome, greffé sur le validateur #516)

`node bin/generate-registry.js --check` (step lint bloquant) valide :
- **(a)** toute classe émise par un composant `packages/react/` existe dans le CSS du DS
  (aurait attrapé `btn-icon-left` du 1er jour — voir incident #374-376) ;
- **(b)** un composant `react: ported` qui dérive (classe React absente du CSS, ou
  marquage incohérent) → echec CI.

### Politique : « gap tracé », PAS lockstep — jusqu'à présent

Tant qu'**aucun consumer React n'a shipé en production** :
- nouveau composant → marqué `react: pending` (suivi auto, pas de wrapper obligatoire) ;
- le portage React se fait **en lot sur surface gelée** (M#41), pas composant par composant.

### Bascule en LOCKSTEP — dès qu'une app React ship

Au premier consumer React en prod, la politique bascule :
- **tout nouveau composant DS DOIT inclure son wrapper React dans la MÊME PR** (`react: ported`) ;
- mettre à jour cette section (date + nom de l'app déclencheuse) ;
- ajouter le composant au mapping `REACT_TO_REGISTRY` de `bin/generate-registry.js`.

Cette bascule est une décision explicite tracée ici (pas automatique).

---

## Section 8.2 — Pont page↔module : champ `module[]` (#506)

### Rôle

Le champ `module` (ajouté v2.73.0) ferme le triplet **composant → page → module(s) CSS** en indiquant pour chaque `kind:component` dans quel(s) fichier(s) CSS vivent ses classes. Il rend le registre auditable mécaniquement (question : « le composant X est stylé par quel fichier ? » a désormais une réponse directe).

### Contrat figé (consommé en aval par #508)

| Propriété | Valeur |
|---|---|
| **Type** | `string[]` (tableau) — jamais une string nue |
| **Format des items** | chemin repo complet `shared/css/components/X.css` (cohérent avec `source_file`) |
| **Portée** | `kind:component` UNIQUEMENT — les `kind:module` gardent `source_file`, ne reçoivent pas `module` |
| **Dédoublonnage** | items uniques |
| **Tri** | modules propres (sans `_`) d'abord par ordre alphabétique, transverses (`_a11y`, `_responsive`, `_base`…) en fin — tri stable, requis pour l'idempotence |
| **Absence légitime** | champ **omis** si 0 classe résoluble (voir exemptions) |

### Source de vérité unique : auto-dérivation

`module[]` est **exclusivement calculé par `bin/generate-registry.js`** à partir de `cssClasses`, via la map inverse classe→fichiers (`classToFiles`). **Ne JAMAIS saisir ou modifier `module` à la main** — la prochaine régénération écraserait la saisie.

### Exemptions (3 entrées légitimement sans `module`)

| name | page | cause |
|---|---|---|
| `reset-natif` | composants | `cssClasses: []` (sélecteurs natifs/pseudo) |
| `texture-grain` | fondation | `cssClasses: []` (pseudo-élément `body::after`) |
| `brand-acssi` | fondation | `cssClasses: null` |

Ces 3 entrées sont whitelistées dans `MODULE_EXEMPT` et ne font PAS échouer le check d'intégrité.

### Check CI (greffé sur `--check`)

`node bin/generate-registry.js --check` valide le pont module[] :
- tout `kind:component` hors exemptions DOIT avoir `module` non vide ;
- tout item de `module[]` DOIT correspondre à un fichier réellement scanné par le générateur.

Erreur → `process.exit(1)` avec liste des composants orphelins.

### Règle pratique (ajout composant)

Lors de l'ajout d'un composant (Section 8 checklist) : renseigner `cssClasses` correctement, puis lancer `npm run generate-registry`. Le champ `module[]` se calcule automatiquement — aucune action supplémentaire.

---

## Section 9 — Anti-patterns observés (apprentissages cross-consumers)

Ces patterns ont été repérés sur les apps consumers et **doivent être proscrits côté DS**. Le DS doit fournir l'alternative correcte pour qu'aucun consumer n'ait à les reproduire.

### A1 — Theme hardcodé au lieu de selector
**Observé** : aksyva v2.24 — `<html data-theme="acssi">` figé dans le layout root.
**À éviter dans le DS** : tout exemple HTML/demo doit montrer le selector multi-palette, jamais une palette en dur.

### A2 — localStorage naming divergent
**Observé** : aksyva utilise `aksyva-theme` (clé) pour stocker le **mode** dark/light.
**Convention DS** : `msyx-theme` (palette) + `msyx-mode` (dark/light). Toujours documenter ces clés dans les exemples header.

### A3 — Theme-toggle custom au lieu de mode-switch DS
**Observé** : aksyva implémente son propre `.theme-toggle` alors que le DS fournit `mode-switch` v2.55.0.
**À éviter dans le DS** : ne JAMAIS proposer un composant qui ferait doublon avec un composant DS existant. Toujours étendre / variante.

### A4 — Logo en texte brut au lieu d'asset
**Observé** : aksyva — `<span>AKSYVA</span>` sans traitement visuel.
**À éviter dans le DS** : les exemples header doivent montrer le wordmark stylisé OU l'asset SVG, jamais du texte nu.

### A5 — Pattern `section-header` skipped
**Observé** : aksyva — `<h1 className="page-title">` sans le wrapper `.section-header > .overline + h1`.
**À éviter dans le DS** : toutes les démos doivent utiliser le pattern complet pour montrer l'exemple. Une page DS = un cas d'école.

### A6 — Inline styles à la chaîne
**Observé** : aksyva — 34 `style={{...}}` dans le TSX.
**À éviter dans le DS** : aucun exemple HTML de la doc DS ne doit utiliser d'inline style (sauf cas exceptionnel motivé en commentaire).

### A7 — Emoji Unicode pour icons UI
**Observé** : aksyva — `icon: "✓"`, `"◎"` dans page modules.
**À éviter dans le DS** : tous les exemples icons doivent passer par le sprite Lucide. Les emojis sont OK pour du décoratif (badges achievement, etc.) mais pas pour de l'UI structurelle.

### A8 — Override de classe DS au lieu de modifier var token
**Observé** : pattern fréquent en pre-DS — `.btn-primary { padding: 32px }` dans un fichier consumer.
**À éviter dans le DS** : documenter explicitement que les classes DS ne se redéfinissent JAMAIS. Customisation via variables CSS uniquement, ou variante modifier (`.btn-primary--spacious`).

---

## Section 10 — Garde-fous outillés

### Scripts disponibles
| Script | Usage |
|---|---|
| `shared/check-sync.sh` | Vérifie version sync sur consumer |
| `shared/check-components.sh` | Détecte composants custom hors DS sur consumer |
| `shared/check-diacritics.sh` | Vérifie accents français corrects |
| `shared/perf-budget.sh` | Mesure budget gzip |
| `~/.claude/skills/audit-ds-compliance/scripts/*` | Audit cross-cutting consumer |

### CI workflows (DS repo)
- Visual regression (Playwright + 108 baselines)
- Perf budget warn
- A11y axe-core dry-run
- Lighthouse CI warn

### Skills associés
- `/audit-ds-compliance` — audit complet d'un consumer
- `/code-review` — review code quality DS et consumer
- `/ux-review` — review UX/UI mobile-first

---

## Maintien de ce document

**Quand mettre à jour ?**
- Après chaque sprint qui révèle un nouveau pattern ou anti-pattern (section 9)
- Après chaque modification de convention (sections 1-7)
- Après chaque audit transverse (consumers, a11y, perf)

**Qui peut éditer ?**
- Mike + agents pipeline avec validation Mike
- Préférer ajouter une nouvelle entrée à modifier une règle existante (audit trail)

**Référencé par** :
- `CLAUDE.md` du DS (N2)
- Skills pipeline (groom, spec, dev, review)
- Skill `audit-ds-compliance`

---

*Dernière mise à jour : 2026-05-11 — synthèse post-S32 et audit aksyva v1.1.*
