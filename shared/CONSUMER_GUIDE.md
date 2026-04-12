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

```bash
# Copier les fichiers DS dans votre projet
./sync.sh /chemin/vers/projet/styles/

# Verifier si votre copie est a jour
./check-sync.sh /chemin/vers/projet/styles/ds-tokens.css
```

Le script `sync.sh` copie les 4 fichiers avec le prefixe `ds-` :
- `ds-tokens.css`
- `ds-utilities.css`
- `ds-layout.css`
- `ds-components.css`

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
