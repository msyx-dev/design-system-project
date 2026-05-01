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

## Comment synchroniser

### Sync manuelle (un seul projet)

```bash
# Copier les fichiers DS dans votre projet
./sync.sh /chemin/vers/projet/styles/

# Verifier si votre copie est a jour (4 fichiers verifies)
./check-sync.sh /chemin/vers/projet/styles/
```

Le script `sync.sh` copie les 4 fichiers avec le prefixe `ds-` :
- `ds-tokens.css`
- `ds-utilities.css`
- `ds-layout.css`
- `ds-components.css`

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
