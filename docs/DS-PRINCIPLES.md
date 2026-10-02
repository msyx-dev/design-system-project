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

## Section 2 — Theming (5 themes × 2 modes = 10 combos à tester)

### Règle
- 2 attributs HTML : `data-theme` (palette : msyx / acssi / nhood / auchan / noel) + `data-mode` (dark / light).
- Cascade CSS 4 couches : `:root` → `[data-theme]` → `[data-mode="light"]` → `[data-theme][data-mode]`.
- Tout composant doit être **testable** sur les **10 combos** (MSYX dark+light, ACSSI dark+light, Nhood dark+light, Auchan dark+light, Noël dark+light — `THEME_CONFIG` de `shared/components.js` donne bien `['dark','light']` aux 5 themes ; `playwright.config.ts` génère 5×2×2=20 projets, cf. correction #800 + #849 + #939 — l'ancien chiffre « 5 combos » était déjà stale, puis « 8 combos » l'est devenu à son tour).

### Tokens de fond des boutons pleins (#944)
- Le fond de `.btn-primary`, `.btn-danger`, `.btn-success`, `.btn-warning` (et des 3 boutons de connexion `.login-submit`, `.login-compact button`, `.login-authentik-btn`, qui peignent le même couple que `.btn-primary`) est un dégradé `linear-gradient(135deg, var(--btn-<variante>-bg-start), var(--btn-<variante>-bg-end))`.
- Les **8 tokens** `--btn-{primary,danger,success,warning}-bg-{start,end}` sont **dédiés** : hex littéral à 6 chiffres, déclarés dans les **4 couches** (`tokens.css` `:root` + `[data-mode="light"]`, `themes/<nom>.json` `modes.dark` + `modes.light` → `themes.css` autogénéré), **jamais dérivés** (`var(--gradient-1)`, `var(--danger)`, `color-mix()` interdits) : ces valeurs sont partagées hors boutons (logo, badges, alertes, graphiques) et ne peuvent pas être assombries pour un bouton sans dégrader le reste.
- Ils sont **réglés à la mesure** (contraste ≥ 4,6:1 visé, voir §3.3), thème par thème, en OKLCh : teinte conservée, chroma ramenée dans le gamut sRGB, L par pas de 0,01 en s'éloignant de la couleur du texte ; ΔL(OKLCh) entre début et fin ≥ 0,04 pour garder un dégradé visible. La couleur de texte (`--text-on-accent`, `--btn-on-*`) n'est pas touchée par ce réglage des fonds.
- **Texte des boutons pleins** : `--btn-on-{primary,danger,success,warning}`. `--btn-on-primary` (couleur du texte de `.btn-primary`, `.login-submit`, `.login-compact button`, `.login-authentik-btn`) est déclaré dans `tokens.css` `:root` comme alias `var(--text-on-accent)` : rendu identique partout. Seul **Auchan sombre** le surcharge (`themes/auchan.json` `modes.dark`, `#ffffff`) : son `--text-on-accent` est sombre (`#1a0a0b`) et est partagé par 43 règles hors boutons (toggle, badges, etc.) — il ne doit pas changer ; le bouton primaire passe donc en texte blanc sur un rouge foncé (`--btn-primary-bg-start/-end` d'Auchan sombre réglés en conséquence, ΔL ≥ 0,04). Un thème dont le texte d'accent ne convient pas à un fond de bouton surcharge `--btn-on-primary`, jamais `--text-on-accent`.
- Un thème ajouté doit déclarer les 8 tokens dans ses 2 modes : le test de complétude de `visual-tests/button-contrast.spec.ts` échoue en nommant le fichier, le mode et le token manquant.

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
1. Bloc `modes.dark`/`modes.light` dans `themes/{nom}.json`, puis `node shared/build-themes.js` (régénère `shared/css/themes.css` — **AUTOGÉNÉRÉ, ne jamais l'éditer à la main**). MSYX seul reste dans `:root`/`[data-mode="light"]` de `tokens.css` (miroir non autoritatif dans `themes/msyx.json`, skippé par le build).
2. Variable `--accent-rgb: R, G, B` (triplet sans virgule entre var)
3. Entrée dans `THEME_CONFIG` de `components.js`
4. Option `<option>` dans le selector header
5. Test visuel sur toutes les pages avec dark + light

### Catégoriel ≠ sémantique (#800)

`--success` / `--warning` / `--danger` / `--info` portent un **état** — les employer pour coder une catégorie libre (jalon, série, tag, légende) fait mentir l'interface (un jalon « violet » n'est ni un succès ni une alerte).

Le DS expose une échelle dédiée `--cat-1` à `--cat-8` : elle ne veut rien dire d'autre que « pas la même que la précédente ».

❌ **Don't** :
```css
/* Coder la catégorie "Livraison" avec un rôle sémantique — mensonge d'état */
.milestone-livraison { background: var(--success); }
```

✅ **Do** :
```css
/* Catégorie libre — index arbitraire, aucune sémantique d'état */
.milestone-livraison { background: var(--cat-4); }
```

**Contrat vérifié par `bin/check-categorical-palette.js`** (CI, bloquant) sur les 10 combos theme/mode :
- **C1** — écart de teinte ΔH(OKLCh) ≥ 30° entre deux entrées quelconques.
- **C2** — distance perceptuelle ΔE(OKLab) ≥ 0,12 entre deux entrées quelconques (ferme le trou de C1 : deux teintes lointaines à faible chroma restent confondues).
- **C3** — contraste ≥ 3:1 vs `--surface-solid` (WCAG 2.1 SC 1.4.11, objet graphique non-textuel — **pas** 4,5:1).

**Règle des 4 couches** : `[data-theme="X"]` et `[data-mode="light"]` ont la même spécificité, et `themes.css` est importé après `tokens.css` → un token présent en couche 3 mais absent de la couche 4 garde sa valeur **dark** en mode clair. Les 8 entrées sont donc **redéclarées explicitement** dans les 4 couches (`:root`, `[data-mode="light"]`, `[data-theme="X"]`, `[data-theme="X"][data-mode="light"]`) — jamais d'omission « parce que ça hérite ».

**Hex littéral obligatoire** pour `--cat-N` : jamais `var()`, jamais `color-mix()` — le gate est un parseur Node qui ne reproduit pas la cascade du navigateur, la forme littérale est ce qui rend ce parsing honnête. Déclinaisons douces via `color-mix(in srgb, var(--cat-3) 12%, transparent)` — pas de `--cat-N-rgb`.

**Utilitaires** : `.bg-cat-1..8` + `.border-cat-1..8` uniquement. **Pas de `.text-cat-N`** — le contrat garantit 3:1 (non-textuel), pas les 4,5:1 requis pour du texte ; l'exposer inviterait silencieusement à une violation WCAG.

**Au-delà de 8 catégories, le DS ne garantit rien** : ajouter un second canal d'encodage (forme, motif, libellé) ou regrouper. Ce n'est pas un manque, c'est une position assumée (12 entrées ramènerait l'espacement idéal à 30°, exactement le plancher du contrat, marge nulle).

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
| Choix exclusif (segmented) | `role="radiogroup"` + items `role="radio"` + `aria-checked` + roving tabindex + ←/→/↑/↓/Home/End |
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

### 3.2 — Choix exclusif : radiogroup (décision #613)

**Convention retenue** : conteneur `role="radiogroup"`, items `role="radio"` + `aria-checked`, roving tabindex (`0` sur l'item actif, `-1` sur les autres) + navigation clavier ←/→/↑/↓/Home/End avec bouclage (pattern WAI-ARIA APG « Radio Group »). C'est le seul pattern qui exprime l'exclusivité du choix : un lecteur d'écran annonce « Semaine, sélectionné, 1 sur 3 ». C'est déjà l'implémentation du wrapper `@msyx-dev/react` `<SegmentedControl>` → zéro régression côté package.

❌ **Don't** — `group` + `aria-pressed` :
```html
<div class="segmented" role="group" aria-label="Vue">
  <button class="segmented-item active" aria-pressed="true">Semaine</button>
  <button class="segmented-item" aria-pressed="false">Mois</button>
</div>
```
N'exprime ni l'exclusivité du choix ni la position « X sur N ». `aria-pressed` est sémantiquement un bouton bascule indépendant (toggle button), pas un choix radio-like au sein d'un groupe. L'adopter comme convention canonique aurait imposé de **dégrader** le wrapper React (retrait du roving tabindex et des flèches) pour rester cohérent avec le vanilla — inacceptable.

❌ **Don't** — `tablist` / `tab` :
```html
<div class="segmented" role="tablist">
  <button class="segmented-item active" role="tab" aria-selected="true">Semaine</button>
  <button class="segmented-item" role="tab" aria-selected="false">Mois</button>
</div>
```
`role="tab"` implique par contrat ARIA un `aria-controls` vers un `role="tabpanel"` associé. Le segmented control pilote un filtre ou une vue, pas un panneau de contenu — et le DS a déjà un composant `Tabs` distinct pour ce cas d'usage. Réutiliser `tablist`/`tab` ici est une usurpation de rôle relevable par `axe-core`.

✅ **Do** :
```html
<div class="segmented" role="radiogroup" aria-label="Vue">
  <div class="segmented-indicator" aria-hidden="true"></div>
  <button class="segmented-item active" type="button" role="radio" aria-checked="true" tabindex="0">Semaine</button>
  <button class="segmented-item" type="button" role="radio" aria-checked="false" tabindex="-1">Mois</button>
  <button class="segmented-item" type="button" role="radio" aria-checked="false" tabindex="-1">Annee</button>
</div>
```
- `.segmented-indicator` (élément décoratif, l'indicateur slide animé) porte `aria-hidden="true"`.
- Roving tabindex : un seul item à `tabindex="0"` (l'actif), tous les autres à `-1`. Si aucun item n'est `.active` au chargement, le **premier item non `disabled`** reçoit quand même `tabindex="0"` (sinon le groupe devient inatteignable au Tab, ou pire, inatteignable *et* invisible si on cible naïvement le tout premier item du DOM alors qu'il est désactivé) — son `aria-checked` reste `false`. Si tous les items sont `disabled`, aucun `tabindex="0"` n'est posé (groupe inerte, comportement attendu).
- Sélection suit le focus (« selection follows focus », pattern APG) : les flèches déplacent le focus **et** sélectionnent l'item cible.
- Contrat public JS inchangé : `dataset.bound` (anti-double-bind) et l'événement `segmented:change` avec `detail { value, index }`.

**Référence** : décision Mike 2026-07-26, issue #613, v2.116.0.

### 3.3 — Contraste des boutons à fond plein : mesuré sur les pixels, bloquant (#944)

**Règle** : le texte d'un bouton à fond plein (dégradé) respecte **4,5:1 minimum** (valeur visée **≥ 4,6** : l'anticrénelage et le tramage du dégradé font bouger la mesure de quelques centièmes) sur **trois mesures**, dans les **10 combos** thème/mode, au repos **et** au survol :
1. le **pire arrêt** du dégradé (`stopMin`) ;
2. le **pire pixel rendu** sous le texte au repos ;
3. le **pire pixel rendu** sous le texte au survol — le reflet `::before` (`--overlay-white-15`) éclaircit le fond **et** le texte sombre (peint au-dessus de lui) : un texte sombre n'est pas « gratuit » au survol.

**Pourquoi pas axe** : sur un fond en dégradé, `color-contrast` ne rend qu'un `incomplete` — il ne voit ni le dégradé ni le reflet. Seule la capture voit ce que l'utilisateur lit. La sonde `visual-tests/button-contrast.spec.ts` est **bloquante** (`ENFORCE = true`) : chaque cellule fautive est nommée (`<projet> <cas> stop|rest|hover = X:1 < 4.5`).

**Règles de conception** :
- Les fonds des boutons pleins sont les tokens dédiés `--btn-*-bg-*` (§2), **jamais dérivés** du dégradé de marque ni des couleurs sémantiques.
- Le survol d'un bouton plein ne change **jamais l'opacité** de l'élément (elle mélange texte et fond avec le fond de page : le contraste dépendrait du contexte). Mécanisme unique : reflet `::before` + élévation, celui de `.btn-primary` — repris par `.login-submit` et `.login-authentik-btn`.
- **Ne jamais** baisser `CONTRAST_MIN` ni retirer un cas de `SOLID` pour faire passer la sonde : on règle le token.
- Nouveau bouton plein (nouvelle variante, nouveau composant peignant un fond plein) : ajouter un `data-probe` dans `visual-tests/fixtures/button-contrast-944.html` et le cas dans `SOLID`.
- **`.btn-outline-danger`** (#968) : bloquant (`SOLID`, fond transparent donc `FLAT_BG` : pas d'arrêts de dégradé, seul le pixel rendu est mesuré), sur les deux markups que le DS livre — `.btn-outline-danger.btn-sm` (`overlays.html`) et `.btn-secondary.btn-outline-danger` (`composants.html`). Son texte lit le token dédié `--btn-outline-danger-fg` (famille `--btn-on-*`, hex littéral dans les 4 couches, réglé en OKLCh à teinte de `--danger` conservée, ≥ 4,6:1 au pire pixel, repos ET survol teinté `--danger` 8 %). Il ne lit **jamais** `--danger-light`, partagé avec les statuts. Le test de complétude couvre ce token comme les 8 fonds.
- **Texte sémantique** (#981) : sur un fond de statut teinté (badge, chip, alerte, KPI, zone), le texte prend `--status-{success,warn,error,info}-fg` ; hors fond de statut (utilitaires `.text-*`, titre « Zone danger », `.pricing-badge`), il prend `--status-{success,warn,error,info}-text`. `--success`, `--warning`, `--danger` et `--info` servent aux aplats, bordures et teintes, **jamais** au texte d'un nouveau composant. L'aplat de la pastille de notifications lit le token de composant `--notification-badge-bg`. Les deux familles coexistent parce que `--X` diffère de `--X-light` hors MSYX (acssi sombre : `#ef4444` contre `#f87171`) : les fusionner changerait le rendu des autres thèmes. Valeurs MSYX réglées à la mesure (≥ 4,6:1 sur teinte 12 % posée sur `#fff`/`#f8fafc`/`#f1f5f9`), hex littéral recopié dans les 4 JSON de thème. **Jamais d'`opacity` sur un texte** si elle le fait passer sous 4,5:1 (`.access-denied-code` : 5,97 → 4,27:1 avec `opacity: 0.8`).
- Hors périmètre bloquant (rapport seul, `REPORT_ONLY`) : `.btn-secondary`, `.btn-ghost` (fond translucide ou transparent) et `btn-outline-danger-bare` (la classe nue, sans padding : aucun markup du DS ne l'émet ; la boîte du texte avale la colonne de pixels de la bordure, la mesure y lit la bordure et non le fond).

### Accent en texte et aplat accent (#980)
Le défaut est le couple token/rôle, pas un composant : `--accent` (`#3b82f6` en MSYX) en couleur de texte de taille normale échoue 4,5:1 sur toute surface claire (3,5 à 3,7:1) et sur le voile `--accent-glow` en sombre ; le blanc posé sur `--accent` donne 3,68:1. Trois tokens dédiés (hex littéraux, réglés à la mesure à ≥ 4,6:1 au pire fond mesuré, teinte de `--accent` conservée), définis dans `tokens.css` (`:root` + `[data-mode="light"]`) et recopiés avec la valeur ACTUELLE dans `themes/*.json` (rendu inchangé hors MSYX) :
- `--accent-text` : accent en texte de taille normale, sur surface neutre ou voile `--accent-glow` ;
- `--accent-text-strong` : accent en texte sur une teinte accent ≥ 12 % (puces, tags, segmented subtle) ou sur un fond relevé gris ;
- `--accent-surface` : aplat accent qui porte du texte `--text-on-accent` (le texte reste `--text-on-accent`, inchangé).

**Règles** : jamais `var(--accent)` en `color:` de texte de taille normale ; jamais `--text-on-accent` sur `var(--accent)` en fond plein. Exceptions : texte large (≥ 24 px, ou ≥ 18,66 px gras : 3:1), icônes et glyphes de contrôle (WCAG 1.4.11, 3:1), teintes accent ≤ 8 % (`--accent-light` ≥ 4,5:1), `a:hover` sur `--accent-light`. Les préfixes `--accent-text-*` et `--accent-surface*` sont réservés. Si l'accent d'un thème change, re-régler ces tokens à la mesure : ne pas les remplacer par `var(--accent)`.

```css
/* ❌ Don't */ .tag { color: var(--accent); }        .pill.active { background: var(--accent); color: var(--text-on-accent); }
/* ✅ Do    */ .tag { color: var(--accent-text); }   .pill.active { background: var(--accent-surface); color: var(--text-on-accent); }
```
Preuve : décompte axe `color-contrast` MSYX F1/F2 avant/après et mutations des 3 tokens, consignés dans la PR #980.

### État inactif : contrôle désactivé ou contenu inactif (#982)
Deux cas, deux règles — ne pas les confondre :
- **Un contrôle désactivé** (champ, slider, sélecteur de couleur, tag-input) se balise `disabled` sur l'élément natif ; un contrôle **composite** (conteneur de plusieurs éléments) porte en plus `role="group" aria-disabled="true"` sur son conteneur. Il bénéficie alors de l'exemption de contraste WCAG 1.4.3 (composant d'interface inactif) et garde son apparence atténuée. Un contrôle désactivé n'est **jamais** réactivable par le JS du composant et reste hors de l'ordre de tabulation : `initTagInputs()` ne lie rien sur un `.tag-input-wrap--disabled`.
- **Un contenu inactif** (succès verrouillé, fonctionnalité non incluse à un forfait : ce ne sont pas des contrôles, donc aucune exemption) prend le token `--inactive-text` (hex littéral réglé à ≥ 4,6:1 en MSYX ; égal à `--text-muted` dans les autres thèmes). **Jamais** d'`opacity` sur du texte : elle mélange le texte avec le fond de page, et aucune couleur ne tient plus 4,5:1 dessous. L'effet « grisé » reste porté par l'icône seule (`opacity` + `grayscale`), jamais par le libellé.

```css
/* ❌ Don't — contrôle : classe visuelle seule, rien ne déclare l'état (axe mesure le libellé à plein contraste) */
/* <div class="slider-group slider-disabled"> … <input … disabled> */
/* ✅ Do    — contrôle : même classe, état déclaré sur le conteneur (exemption 1.4.3) */
/* <div class="slider-group slider-disabled" role="group" aria-disabled="true"> … <input … disabled> */

/* ❌ Don't — contenu : l'opacité traverse le texte (3:1 au mieux) */
.pricing-feature--disabled { color: var(--text-muted); opacity: 0.5; }
/* ✅ Do    — contenu : token dédié sur le texte, opacité réservée à l'icône */
.pricing-feature--disabled { color: var(--inactive-text); }
.pricing-feature--disabled .pricing-feature-icon { opacity: 0.5; }
```
Préfixe `--inactive-*` réservé à cette famille. Preuve : mutation M3 (retrait de la garde `tag-input-wrap--disabled` → 6 tests vanilla rouges, `tests/vanilla/tag-input.test.js`) et assertion React `aria-disabled` sur `TagInput`, consignées dans la PR #982.

### Garde-fou
- Audit `@axe-core/playwright` : 10 pages × 5 thèmes × 2 modes = 100 runs (`visual-tests/a11y.spec.ts`). Le rapport `docs/audit-a11y-<date>.md` et l'export `test-results-a11y/a11y-runs.json` sont joints à l'artefact CI `audit-a11y-report`.
- **Bloquant**, sur le job `a11y` : `color-contrast` sur MSYX dark + light (`BLOCKING_RULES` × `BLOCKING_COMBOS`), et la complétude du banc (chaque run rapporté, aucun en erreur).
- **En rapport**, non bloquant : les autres règles, les autres thèmes, et les résultats axe `incomplete` (fonds en dégradé).
- **Boutons à fond plein** : la sonde pixels `button-contrast.spec.ts` est bloquante (§3.3). Elle complète axe : elle mesure le pire pixel rendu sur un dégradé.
- **Ne jamais**, pour faire passer le job : retirer un combo de `BLOCKING_COMBOS` ou une page de `PAGES`, ajouter un `exclude()` ou un `disableRules()` axe, ou remettre `continue-on-error`. On règle le token, selon la convention de #976 : token dédié, réglé à la mesure, teinte conservée.

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
.card              .card-icon          .card-link
.mode-switch       .mode-switch-track  .mode-switch-thumb
.header-dropdown   .header-dropdown-header  .header-dropdown-item
```

**Exception boutons (#777)** : pas de classe root `.btn`. Les variantes de forme
(`.btn-primary`, `.btn-secondary`, `.btn-ghost`) sont autonomes — chacune porte
l'intégralité de ses règles (display/padding/radius/typo/transition), et se
combinent avec des modificateurs de couleur (`.btn-danger`, `.btn-success`,
`.btn-warning`) et de taille (`.btn-sm`, `.btn-xs`, `.btn-lg`). Cf.
`shared/CONSUMER_GUIDE.md` § Boutons pour le détail.

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

## Section 6.1 — Frontière page ↔ entrée registre ↔ module (réciprocité)

### Règle
Le DS a trois axes que le registre relie en un triplet auditable :

```
<section id> (pages/*.html)  ↔  entrée registre (kind:component)  ↔  module[] (shared/css/components/*.css)
```

**Réciprocité (invariant) :**
1. **Toute `<section id>` d'une page composant** (`composants`, `formulaires`, `data`, `feedback`, `navigation`, `divers`, `templates`) **DOIT avoir une entrée registre `kind:component`** dont le champ `page` pointe cette page.
2. **Toute entrée registre `kind:component`** avec un `page` **DOIT correspondre à une `<section id>` réelle** de cette page (pas d'entrée fantôme orpheline).
3. Le pont vers le CSS est porté par le champ `module[]` (cf. #506) : chaque entrée référence le(s) fichier(s) `shared/css/components/*.css` qui définit ses classes.

### Exemptions transverses (ne participent PAS à la réciprocité)
Sont exemptés de la règle 1↔2 :
- **Modules transverses** (pas de section vitrine dédiée) :
  `_base`, `_a11y`, `_responsive`, `theming`, `section-header`, `signature`.
  Convention : préfixe `_` (`_base.css`) **OU** appartenance à la liste transverse en dur.
  Dans le registre ils sont `kind:module` (jamais `kind:component`) et **sans** champ `page`.
- **Pages de référence** (`fondation`, `motion`, `getting-started`) : leurs sections
  (couleurs, typographie, tokens, durations, easings…) documentent des **fondations**, pas des
  composants → elles **n'exigent pas** d'entrée `kind:component`. Ces pages sont hors périmètre
  de la règle 1 (allowlist de pages).

### Anti-patterns concrets

❌ **Don't** — ajouter une `<section id="mon-widget">` dans `data.html` sans entrée registre :
```html
<!-- pages/data.html -->
<section id="mon-widget"> ... </section>
<!-- ...aucune entrée correspondante dans components-registry.json → orphelin -->
```

❌ **Don't** — laisser une entrée registre pointer une section supprimée :
```json
{ "name": "old-widget", "kind": "component", "page": "data", "cssClasses": [".old-widget"] }
// alors que <section id="old-widget"> n'existe plus dans data.html → entrée fantôme
```

✅ **Do** — section ⇆ entrée ⇆ module alignés :
```html
<!-- pages/data.html -->
<section id="usage-meter"> ... </section>
```
```json
{
  "name": "usage-meter", "kind": "component", "page": "data",
  "cssClasses": [".usage-meter", ".usage-meter-bar"],
  "module": ["shared/css/components/data.css"]
}
```

✅ **Do** — un module transverse reste `kind:module` sans `page` (exempté) :
```json
{ "name": "section-header", "kind": "module", "cssClasses": [".section-header", ".overline"] }
```

### Garde-fou
La réciprocité est vérifiée en CI par `node bin/generate-registry.js --check`
(voir Section 10). Toute section composant sans entrée, ou toute entrée fantôme,
est signalée en **informatif** (warn-only, sans effet sur le code retour). La bascule
bloquante a été **abandonnée le 2026-10-02** (rétro du milestone #50, #999) : aucun défaut
réel n'a été attribué à cette règle depuis son introduction, 44 violations sont tolérées.
`--frontier-strict` reste disponible comme **diagnostic local opt-in** (code retour 1 en cas
de violation), sans bascule prévue et jamais passé en CI. (#511)

---

## Section 7 — Versioning (@ds-version)

### Règle
**Chaque ajout/modif visible côté consumer** = bump synchronisé sur **10 sources** vérifiées par `shared/check-versions.sh` :
1. `shared/css/tokens.css`
2. `shared/css/utilities.css`
3. `shared/css/components.css`
4. `shared/css/layout.css`
5. `shared/css/base.css`
6. `shared/css/themes.css` — **AUTOGÉNÉRÉ** : ne pas le bumper à la main, relancer `node shared/build-themes.js` (il lit `@ds-version` dans `tokens.css` et échoue si elle est illisible). Sa version était figée à 2.67.0 en dur dans le générateur jusqu'à #951.
7. `shared/nav.js` — commentaire `@ds-version`
8. `shared/nav.js` — `const VERSION`
9. `shared/components-registry.json` — `version`
10. `package.json` racine — `version`

### Convention semver
- **Feature** (ajout composant, nouveau token) → bump **minor** (2.55 → 2.56)
- **Fix** (bug, ajustement existant) → bump **patch** (2.55.0 → 2.55.1)
- **Breaking change** (rare) → coordonné avec consumers, bump **major**

### Pré-allocation pour sprints multi-bumps
Si un sprint touche `@ds-version` sur 3+ issues, le parent `/sprint` **pré-alloue les versions** et les injecte dans le prompt `/dev` de chaque issue. Garantit zéro conflit git sur les bumps. Validé Sprint 17 (0 conflit vs 2 attendus en S16).

### Garde-fou
- Script `check-sync.sh` (consumers) vérifie le drift de version ET le contenu (sha256) des fichiers que `sync.sh` copie à l'identique (`ds-tokens/themes/utilities/base.css`) ; `ds-layout.css` et `ds-components.css`, transformés par `sync.sh` (`--no-showcase`, `--components=…`), restent comparés par leur seul en-tête (#951) ; il couvre aussi les logos de marque que `sync.sh` dépose dans `assets/` (sha256, `OK`/`DRIFT`/`MISSING` par fichier, #954)
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
- [ ] Testé sur les 10 combos theme/mode (cf Section 2)

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
- [ ] `shared/components-registry.json` à jour (liste des composants, dérivée par `bin/generate-registry.js`) — `CLAUDE.md` n'est pas à éditer par composant
- [ ] `RELEASES.md` entrée Added/Changed
- [ ] Compteur composants dans `site.html` mis à jour (hero + hub cards)

### Versioning
- [ ] `@ds-version` bumpé sur les 10 sources (cf Section 7 ; `themes.css` via `node shared/build-themes.js`)
- [ ] Tag git aligné si release

### Registre
- [ ] Entrée dans `shared/components-registry.json` :
  - `name`, `page`, `cssClasses` (toutes les classes principales), `jsInit` (ou null), `example`
  - `react` : statut de portage React — `ported` (wrapper `@msyx-dev/react` existe) / `pending` (portable, pas encore porté) / `n-a` (non portable : token, layout, primitive). **Défaut auto = `pending` pour tout `kind:component`** ; à passer `ported` uniquement avec le wrapper React dans le mapping `REACT_TO_REGISTRY` de `bin/generate-registry.js`.
  - `cssClasses` — les **modificateurs écrits en sélecteur composé** (`.tooltip.tooltip--bottom`, `.chip.chip-icon`) ne sont **pas** captés par `generate-registry.js` (`extractClasses` ne lit que la tête du sélecteur) : les saisir à la main dans l'entrée curée. Le step CI bloquant `check-components registry lint` le vérifie ; sans cela, tout consommateur synchronisé échoue à `check-components.sh` (#967).
  - `module` : **NE PAS SAISIR À LA MAIN** — champ `string[]` auto-dérivé par `generate-registry.js` à partir de `cssClasses` (voir Section 8.2 — Pont module[] ci-dessous).
  - `reactExports` : **NE PAS SAISIR À LA MAIN** — `string[]` trié, dérivé par `generate-registry.js` depuis `packages/react/src/index.ts` (noms que le consommateur importe de `@msyx-dev/react`) ; présent ssi `react: "ported"` (supprimé sinon, comme `module[]`). Alimente le signal S2 de la passe orphelins de `check-components.sh` (#938). `--check` échoue si une entrée `ported` n'en a pas.
  - `structural` : saisie manuelle, `true` sur une liste courte (aujourd'hui `version-notes` et `site-header`). Critère d'admission : le composant est un standard parc que tout consommateur doit monter (convention versioning-releases §8.4, header standard #716). `--check` exige `kind` ≠ `module` et au moins une classe simple dans `cssClasses`. Un orphelin structurel fait échouer `check-components.sh --orphans=`.
- [ ] `version` global du registry mis à jour

### Tests visuels (Visual Regression)
- [ ] Nouvelle baseline VR générée pour la page concernée
- [ ] Tests sur les 10 combos theme/mode (où applicable)

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

## Section 8.3 — Visual Regression : matrice réduite pour thèmes secondaires (#851)

Le job `visual` (Playwright, `workers: 1` — le parallélisme rend les captures
instables sous charge, choix délibéré) a dépassé son `timeout-minutes` sur
tous les runs à partir du 2026-08-27 : 4 thèmes × 2 modes × 2 viewports ×
~123 sections = 1968 captures, c'est trop pour un run linéaire. **Sharding et
`workers > 1` sont écartés** (ADR implicite #851) : ils traitent la durée,
pas le volume ni le coût de stockage des baselines.

### Règle : MSYX = référence, thèmes secondaires = sentinelles desktop

- **MSYX** conserve la **matrice complète** : 2 modes × 2 viewports (desktop +
  mobile) × **toutes** les sections de toutes les pages. C'est le thème de
  référence — aucune perte de couverture n'est acceptable dessus.
- **Tout thème secondaire** (ACSSI, Nhood, Auchan, Noël, et tout thème futur
  ajouté via `shared/scaffold-theme.sh`, cf. Section 2) : **desktop uniquement**
  (pas de projet `*-mobile` dans `playwright.config.ts` — `viewportsForTheme()`
  ne garde le mobile que pour `msyx`) et **sections sentinelles uniquement**
  (`SENTINEL_SECTIONS` dans `visual-tests/visual.spec.ts`).

### Capture dédiée du header (#977)

Les captures de sections masquent `.site-header` (#669) : le header a donc sa
propre capture, `header__site-header.png` (test `header`, fin de
`visual-tests/visual.spec.ts`), sur `/pages/navigation.html` — **périmètre
MSYX seul**, les 4 projets `msyx-{dark,light}-{desktop,mobile}` (mobile inclus :
le header y diffère réellement, compaction sous 640px). Les thèmes secondaires
ne sont **pas couverts** (`skip`) : un changement du header propre à un thème
secondaire (typo Montserrat d'ACSSI dans le wordmark, bouton flocon de Noël)
reste hors couverture visuelle, comme le veut la règle « MSYX = référence ».

- ✅ **Do** : tout nouvel élément **volatil** du header (valeur qui change d'un
  run à l'autre : numéro, date, compteur, état persisté) se neutralise dans
  `neutralizeVersionBadge` ou dans un helper voisin, **avant** la capture, en
  remplaçant le contenu par une constante, avec un garde-fou dur qui échoue si
  l'élément n'est plus trouvé exactement une fois.
- ❌ **Don't** : masquer avec `mask` de Playwright (ou `visibility: hidden`) un
  élément dont la largeur suit le contenu. La boîte du masque est la boîte
  réelle : une release (`2.99` → `2.100`) suffit à déplacer la mise en page et à
  dépasser `maxDiffPixels`. Neutraliser le texte garde la largeur constante.

### Critère de sentinelle (ce qui rentre dans `SENTINEL_SECTIONS`, et ce qui n'y rentre pas)

Une section est sentinelle si un token de thème peut s'y exprimer
**structurellement** : un token qui change une **taille**, une **bordure**
ou un **espacement**, et pas seulement une couleur. C'est le seul risque que
la VR couvre et que rien d'autre ne couvre.

**Ne sont PAS des critères de sélection** (déjà couverts ailleurs, ne pas les
invoquer pour ajouter une section) :
- le **contraste** → `axe-core` (CI a11y : `color-contrast` bloquant sur MSYX dark + light, rapport sur les autres thèmes) ;
- la **complétude des tokens** d'un thème → `shared/check-sync.sh` /
  scaffold + revue manuelle du JSON ;
- la **séparabilité des teintes catégorielles** → `bin/check-categorical-palette.js`.

### Liste actuelle (à ajuster sur pièce, pas figée)

| Page (`slug`) | Sections sentinelles | Pourquoi |
|---|---|---|
| `fondation` | `colors`, `palette-categorielle`, `theming` | expriment directement la palette du thème (swatches, 8 teintes `--cat-*`, switcher) |
| `composants` | `buttons`, `split-button`, `badges`, `chips`, `cards`, `card-media`, `segmented-control` | bordures/ombres/pill-shape pilotées par tokens (`--btn-shadow-alpha`, `--border`, radius) |
| `navigation` | `action-menu` | dropdown avec bordure token (`menu.css`) |
| `formulaires` | `inputs`, `controls`, `calendar` | `controls` a un override per-thème réel (`forms.css` : `.toggle-slider::before` différent sur ACSSI/Auchan/Noël) ; `calendar` = grille dense forte densité de bordures/espacements |
| `data` | `charts`, `pie-donut` | consomment directement `--chart-*`/`--cat-*` |
| `templates` | `pricing` | plan mis en avant = bordure/emphase token-dépendante |
| `feedback` | `alerts` | bordures/fond par statut (`--danger`, `--warning`…) |
| `overlays` | `modals` | bordure + ombre de surface flottante |
| `divers` | `diff-viewer` | lignes ±  avec indicateur de bordure gauche coloré |
| `user-feedback` | *(aucune)* | 2 sections seulement, déjà couvertes ailleurs (`inputs`, `modals`) |

### Ajouter un futur thème (checklist)

1. Suivre Section 2 (`scaffold-theme.sh` + `build-themes.js`) — inchangé.
2. L'ajouter à `THEMES` dans `playwright.config.ts` (`shared/nav.js` /
   `components.js` aussi, cf Section 2). **Ne rien faire d'autre pour la
   matrice VR** : `viewportsForTheme()` le traite automatiquement comme
   thème secondaire (desktop uniquement) et `visual.spec.ts` le filtre
   automatiquement sur `SENTINEL_SECTIONS` (aucune baseline `*-mobile`,
   aucune baseline hors sentinelles ne sera générée).
3. Si le thème introduit un token qui change une **taille/bordure/espacement**
   sur une section absente de `SENTINEL_SECTIONS` (par ex. un thème qui
   redéfinirait `--radius` ou une largeur de bordure — aucun thème actuel ne
   le fait, tous ne redéfinissent que des couleurs), **ajouter cette section
   à la liste avant de merger**. Ne pas ajouter par prudence des sections qui
   ne varient que par la couleur — c'est hors critère (cf ci-dessus).
4. Générer les baselines desktop du nouveau thème pour les sections listées
   via soft-harvest CI (jamais en local, cf pièges connus du repo).

### Tolérance de comparaison (#969)

Jusqu'à 2.142.0, `toHaveScreenshot` tolérait `threshold: 0.2` +
`maxDiffPixelRatio: 0.01`. La PR 962 (#944) a changé la couleur de tous les
boutons pleins sur les 10 combos thème/mode et le job `visual` est resté vert :
la VR ne voyait que les ruptures de mise en page, pas les couleurs.

**Réglage en vigueur** (`playwright.config.ts`, bloc `expect.toHaveScreenshot`) :

| Option | Valeur | Rôle |
|---|---|---|
| `threshold` | `0.05` | distance de couleur par pixel (pixelmatch, espace YIQ ; les pixels d'anticrénelage sont ignorés) |
| `maxDiffPixels` | `50` | plafond absolu de pixels différents |
| `maxDiffPixelRatio` | `0.01` | plafond relatif, conservé |

**Règle du minimum.** Quand `maxDiffPixels` et `maxDiffPixelRatio` sont tous
deux posés, Playwright retient le **plus petit** des deux plafonds. La plus
petite section capturée fait 135 750 px (1 % = 1 357 px) : `maxDiffPixels: 50`
gouverne donc toutes les sections actuelles, et le ratio est inerte tant qu'une
section ne descend pas sous 5 000 px.

**Mesures du groom (2026-10-01)**, section `composants-buttons`
msyx-dark-desktop = 1 852 320 px (budget 1 % = 18 523 px) :

| Cas | Seuil 0.2 | Seuil 0.1 | Seuil 0.05 |
|---|---|---|---|
| M1 : inverse exact de #944 | 4 180 px (< 18 523 : vert à tort) | 48 852 px | au moins 8 519 px sur les 12 combos |
| M5 : glissement de teinte ΔE≈6 (`--btn-danger-bg-start` `#ce1d28` → `#e0323c`) | 0 px | 0 px | 4 219 px |
| Bruit de re-rendu local (même code, deux rendus) | 0 px | 0 px | 0 px |

Au seuil 0.1, M5 passerait vert et l'inverse de #944 ne fait que 83 px sur
auchan-light (marge trop mince) : c'est la raison de `0.05` plutôt que `0.1`.
Le bruit de re-rendu d'un run CI à l'autre n'a pas été mesuré à `0.05` : seul
le bruit local (0 px) et l'écart local/CI (9 captures dans la tranche 1-50 px)
l'ont été, d'où le plafond de 50 px.

**Règle de re-baseline.** Tout changement **voulu** de couleur sur une section
capturée se re-baseline par **récolte CI** (jamais en local, cf. checklist
ci-dessus) **dans la même PR** que le changement : sans cela, `visual` est
rouge. La récolte couvre les **5** `THEMES` de `playwright.config.ts`
(msyx, acssi, nhood, auchan, noel), pas seulement les trois premiers. Aucune
conséquence pour les consumers : seules les baselines du dépôt DS sont
concernées.

**Repli préétabli.** Si le run de validation, relancé une fois sur le même SHA,
n'est pas vert deux fois au seuil `0.05` (bruit CI), le seuil passe à `0.1`
sans nouvelle spec. Conséquence assumée : M5 (glissement ΔE≈6) n'est alors plus
détecté (0 px), seules les dérives franches de couleur le sont. Le repli doit
être tracé dans la PR et écrit ici.

**Le critère de sentinelle ne change pas.** Resserrer la tolérance rend la VR
sensible à la couleur *dans les sections déjà capturées* ; cela n'élargit
pas `SENTINEL_SECTIONS`. Une section n'est toujours sentinelle que si un token
de thème peut s'y exprimer **structurellement** (taille, bordure, espacement) ;
la couleur seule n'est toujours pas un critère de sélection (cf. ci-dessus).

### Garde-fou en CI

`visual.spec.ts` vérifie à l'exécution que chaque id listé dans
`SENTINEL_SECTIONS` existe bien dans le DOM de la page (`toContain`) — si un
`<section id>` est renommé/retiré sans mettre à jour la liste, le test échoue
explicitement au lieu de silencieusement capturer 0 section.

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
| `shared/check-sync.sh` | Vérifie version + contenu (fichiers copiés à l'identique) sur consumer |
| `shared/check-components.sh` (+ passe orphelins opt-in `--orphans=`, #938) | Détecte composants custom hors DS sur consumer |
| `shared/check-diacritics.sh` | Vérifie accents français corrects |
| `shared/perf-budget.sh` | Mesure budget gzip |
| `bin/check-innerhtml.js` | Bloque tout `innerHTML =` concaténé à une variable sans dérogation justifiée (#758) |
| `~/.claude/skills/audit-ds-compliance/scripts/*` | Audit cross-cutting consumer |

### CI workflows (DS repo)
- Visual regression (Playwright — matrice réduite MSYX complet + sentinelles thèmes secondaires, cf Section 8.3 #851)
- Perf budget warn
- A11y axe-core (`color-contrast` bloquant sur MSYX dark + light, rapport sur les autres thèmes)
- Lighthouse CI warn
- Frontière page↔registre (#511) : `generate-registry.js --check` vérifie la réciprocité section↔entrée + l'exemption transverse/référence (contrôle informatif ; bascule bloquante abandonnée le 2026-10-02, rétro du milestone #50, #999 : aucun défaut réel attribué, 44 violations tolérées ; `--frontier-strict` = diagnostic local opt-in). Sidebar dead-link couvert séparément par `generate-nav-sections.js --check` (#528).

### Skills associés
- `/audit-ds-compliance` — audit complet d'un consumer
- `/code-review` — review code quality DS et consumer
- `/ux-review` — review UX/UI mobile-first

---

## Section 11 — Sécurité : innerHTML, attributs, URLs (décision #758)

**Constat** : `escapeHTML()` (échappement via `div.appendChild(createTextNode) → innerHTML`) n'échappe que `&`, `<`, `>` — **jamais les guillemets**. Il protège un contexte **texte** (entre deux balises) mais **ne protège JAMAIS un contexte attribut** : une valeur contenant `"` referme l'attribut en cours et permet d'en injecter un autre (`onerror=`, etc.), même « échappée ».

### Règle
**Construire les nœuds** (`createElement` + `setAttribute` + `textContent` + `appendChild`), jamais de concaténation de chaînes assignée à `innerHTML`, dès qu'une donnée non fiable (consumer : `data-*`, options JS, réponse réseau) atterrit dans un attribut. `setAttribute()` est sûr par nature vis-à-vis des guillemets : il ne réinterprète jamais la valeur comme du HTML.

❌ **Don't** :
```js
el.innerHTML = '<button aria-label="Supprimer ' + escapeHTML(v) + '">×</button>';
// v = 'x" onerror="alert(1)' → attribut refermé, nouvel attribut injecté
```

✅ **Do** :
```js
var btn = document.createElement('button');
btn.setAttribute('aria-label', 'Supprimer ' + v);
btn.textContent = '×';
el.appendChild(btn);
```

### URLs consumer (href / action / src)
`setAttribute()` protège de l'injection d'attribut mais **pas** d'un schéma exécutable (`javascript:`, `vbscript:`). Toute URL d'origine consumer posée en `href`/`action`/`src` doit passer par `safeUrl(url, fallback, allowedSchemes)` (`shared/components.js`) — whitelist `http`/`https`/`mailto` par défaut, `+'data'` pour un `<img src>`.

### Contrats d'API assumés (à ne pas confondre avec une faille)
Certaines API du DS acceptent **volontairement** du HTML brut ou du JS (ex. `bodyHTML`/`actions[].onClick` de `window.__openModal`, `window.__vlistRenderRow`) : contrat documenté en JSDoc au-dessus de la fonction + dans `shared/CONSUMER_GUIDE.md`, responsabilité d'échappement transférée au consumer. Ne pas les « corriger » silencieusement — les garder visibles comme contrat.

### Garde-fou
`bin/check-innerhtml.js` (CI bloquant) rejette tout `.innerHTML =` concaténé (`+`) à un identifiant ou en template literal `${}` sans dérogation `// ds-allow-innerhtml: <raison>`. Chaque dérogation doit expliquer **pourquoi** c'est sûr (ex. `// ds-allow-innerhtml: escapeHTML en contexte texte uniquement — aucun attribut interpolé`), jamais un simple « ok » — le relecteur suivant doit pouvoir vérifier la justification sans relire tout le bloc. Une dérogation posée sur du texte aujourd'hui devient un piège si quelqu'un y ajoute un attribut demain en réutilisant `escapeHTML` : c'est exactement l'incident #758.

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

## 12. Surfaces flottantes : empilement et conteneur (#932/#934)

Deux règles, pour deux mécanismes que l'on confond facilement — un menu ouvert
qu'on ne peut pas cliquer se diagnostique de deux façons opposées.

### 12.1 L'empilement — un menu passe TOUJOURS au-dessus de la surface qui l'ouvre

Les valeurs de `z-index` sont des tokens (`tokens.css`), jamais des nombres écrits
dans un composant :

| Token | Valeur | Pour |
|---|---|---|
| `--z-sticky` | 150 | en-têtes collés (`.site-header`, `.section-header--sticky`) |
| `--z-surface` | 200 | surfaces conteneurs (sidebar, overlay de drawer, panneau de notifs) |
| `--z-surface-panel` | 201 | le panneau lui-même, au-dessus de son propre overlay |
| `--z-nav` | 300 | `.bottom-nav` fixe |
| `--z-modal` | 1000 | surfaces modales **non natives** (`.cmd-overlay`) |
| `--z-lightbox` | 1500 | visionneuse plein écran |
| **`--z-floating`** | **2000** | **menus flottants** : dropdown, action-menu, contextuel, mention |
| `--z-toast` | 9000 | notifications système |
| `--z-skip-link` | 9999 | lien d'évitement (WCAG 2.4.1), jamais recouvert |

❌ **Don't** — choisir sa valeur isolément. C'est ainsi que `.dropdown-menu` (200)
s'est retrouvé sous `.drawer-panel--fullscreen` (201) : le menu était peint, mais
le clic atterrissait sur le champ du formulaire situé dessous.

✅ **Do** — `z-index: var(--z-floating)` pour toute surface ancrée à un déclencheur.

### 12.2 Le conteneur — aucun `z-index` ne peut rien contre le *top layer*

Un `<dialog>` ouvert par `showModal()` entre dans le **top layer** : il est peint
au-dessus de tout le document, et **tout ce qui est hors de son sous-arbre devient
inerte** (clic et focus bloqués), quelle que soit la valeur d'empilement.

Un panneau porté dans `document.body` est un **frère** du dialog : il tombe donc
dans la zone inerte. La seule réponse est le **conteneur du portail** :

```js
// vanilla : openFloatingPanel() ; React : Dropdown/ActionMenu
const host = trigger.closest("dialog[open]") ?? document.body;
```

Deux corollaires vérifiés à la mesure :

1. `dialog[open]` et non `dialog` — un dialog fermé n'inerte rien, et son contenu
   n'est pas rendu : y porter un menu le rendrait invisible.
2. Porté dans le dialog, le panneau **est** clippé par son `overflow` (le dialog lui
   sert de containing block). Il faut donc aussi le **cadrer** : basculer au-dessus
   du déclencheur quand il déborde du bord bas. Corriger l'inertie sans corriger le
   cadrage ne rend pas le composant utilisable.

