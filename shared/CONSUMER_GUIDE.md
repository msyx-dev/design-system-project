# Guide d'integration — Design System msyx.design

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
