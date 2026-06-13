# @msyx-dev/react

Composants React du Design System msyx.fr.

## Installation

Le package est publié sur **GitHub Packages** (registry privé de l'org `msyx-dev`), pas sur le registre npm public. Le consumer doit configurer un `.npmrc` pointant `@msyx-dev` vers GitHub Packages :

```ini
# .npmrc (racine du consumer)
@msyx-dev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Le `GITHUB_TOKEN` doit avoir le scope `read:packages` et appartenir à un utilisateur membre de l'org `msyx-dev`. Ensuite :

```bash
pnpm add @msyx-dev/react
# ou
npm install @msyx-dev/react
```

## Contrat CSS — import obligatoire

Les composants React s'appuient sur les classes CSS du Design System. **Le CSS n'est pas bundlé dans ce package** et n'est **pas** distribué via npm. Le CSS provient de la **distribution DS CSS** (repo `design-system`, servi par `design-system.msyx.fr`).

Récupère le CSS dans ton projet via le script de sync du repo DS :

```bash
# Depuis le repo design-system
./shared/sync.sh /chemin/vers/ton-projet
# variantes : --no-showcase, --components=core|<liste>
```

Puis importe le fichier agrégateur copié dans ton projet :

```ts
// Dans votre _app.tsx, layout.tsx ou point d'entrée global
import "@/styles/design-system/styles.css";
// (chemin selon l'emplacement où sync.sh a déposé les fichiers)
```

Sans ce CSS, les composants s'affichent sans style. Ne PAS tenter d'importer un fichier CSS depuis le package npm (aucun n'y est publié).

## Composants & props

### `Button`

Bouton DS. Émet les classes `btn-{variant}`, `btn-{size}` (sauf `md`), `btn-loading`, et `btn-icon-left` / `btn-icon-right` pour les slots d'icône. Accepte tous les attributs natifs `<button>` (`ButtonHTMLAttributes<HTMLButtonElement>`) et un `ref` (forwardRef).

| Prop        | Type                                                          | Défaut      | Description                                          |
|-------------|--------------------------------------------------------------|-------------|------------------------------------------------------|
| `variant`   | `"primary" \| "secondary" \| "ghost" \| "danger" \| "warning"` | `"primary"` | Variante visuelle                                    |
| `size`      | `"sm" \| "md" \| "lg"`                                       | `"md"`      | Taille du bouton                                     |
| `loading`   | `boolean`                                                     | `false`     | Affiche un spinner, désactive le bouton, `aria-busy` |
| `disabled`  | `boolean`                                                     | `false`     | Désactive le bouton                                  |
| `leftIcon`  | `ReactNode`                                                   | —           | Icône affichée à gauche du texte                     |
| `rightIcon` | `ReactNode`                                                   | —           | Icône affichée à droite du texte                     |
| `fullWidth` | `boolean`                                                     | `false`     | Étend le bouton à 100% de la largeur                 |

Types exportés : `ButtonProps`, `ButtonVariant`, `ButtonSize`.

```tsx
import { Button } from "@msyx-dev/react";

<Button variant="primary">Confirmer</Button>
<Button variant="warning">Attention</Button>
<Button variant="danger">Supprimer</Button>
<Button size="lg" fullWidth>Pleine largeur</Button>
<Button loading>Chargement…</Button>
<Button leftIcon={<Icon />} rightIcon={<Icon />}>Avec icônes</Button>
```

### `UserMenu`

Menu utilisateur du header (avatar + dropdown). Gère click-outside, Escape, navigation clavier (flèches / Home / End / Tab) selon WAI-ARIA. Le logout est un `<form method="POST">` vers `logoutUrl`. Peut être contrôlé ou non.

| Prop               | Type                        | Défaut      | Description                                                                 |
|--------------------|-----------------------------|-------------|----------------------------------------------------------------------------|
| `displayName`      | `string`                    | requis      | Nom affiché ; sert aussi à générer les initiales si pas d'`avatarUrl`       |
| `email`            | `string`                    | requis      | Email affiché dans l'en-tête du dropdown                                    |
| `avatarUrl`        | `string`                    | —           | URL de l'avatar ; à défaut, initiales générées depuis `displayName`        |
| `authentikUserUrl` | `string`                    | requis      | Lien « Mon compte » (ouvre un nouvel onglet)                               |
| `logoutUrl`        | `string`                    | requis      | Action du formulaire de déconnexion (POST)                                 |
| `open`             | `boolean`                   | —           | Mode contrôlé : état ouvert/fermé piloté par le parent                      |
| `onOpenChange`     | `(open: boolean) => void`   | —           | Callback de changement d'état                                              |
| `roleBadge`        | `ReactNode`                 | —           | Badge de rôle dans l'en-tête (ex. `<Badge>Admin</Badge>`)                  |
| `extraItems`       | `ReactNode`                 | —           | Items custom (ex. toggle de thème). Un clic NE ferme PAS le menu auto.     |

Types exportés : `UserMenuProps`.

```tsx
import { UserMenu } from "@msyx-dev/react";

<UserMenu
  displayName="Mike Doe"
  email="mike@msyx.fr"
  authentikUserUrl="https://auth.msyx.fr/if/user/"
  logoutUrl="/logout"
  roleBadge={<span className="badge">Admin</span>}
/>
```

### `LoginScreen`

Écran de connexion Authentik (3 variantes + slots providers + form de secours optionnel).

| Prop               | Type                                                              | Défaut            | Description                                                        |
|--------------------|------------------------------------------------------------------|-------------------|-------------------------------------------------------------------|
| `variant`          | `"internal-only" \| "public-multi-providers" \| "internal-with-fallback"` | `"internal-only"` | Disposition des sections (Authentik / providers / form)           |
| `appName`          | `string`                                                          | `"msyx"`          | Nom de l'app dans le titre « Connexion … »                        |
| `subtitle`         | `string`                                                          | —                 | Sous-titre sous le heading                                        |
| `logo`             | `ReactNode`                                                       | `"ms"`            | Contenu du bloc logo (passer `null` pour vide)                    |
| `onAuthentikClick` | `() => void`                                                      | —                 | Handler du bouton « Se connecter avec Authentik »                 |
| `providers`        | `LoginScreenProvider[]`                                           | —                 | Boutons providers tiers (google / apple / microsoft / github)     |
| `showFallbackForm` | `boolean`                                                         | `false`           | Affiche le formulaire identifiant/mot de passe de secours         |
| `onFallbackSubmit` | `(values: { login: string; password: string }) => void`          | —                 | Handler de soumission du form de secours                          |

`LoginScreenProvider` : `{ id: "google" | "apple" | "microsoft" | "github"; label?: string; onClick: () => void }`.

Types exportés : `LoginScreenProps`, `LoginScreenVariant`, `LoginScreenProvider`.

```tsx
import { LoginScreen } from "@msyx-dev/react";

<LoginScreen
  variant="public-multi-providers"
  appName="aksyva"
  onAuthentikClick={() => signIn("authentik")}
  providers={[
    { id: "google", onClick: () => signIn("google") },
    { id: "github", onClick: () => signIn("github") },
  ]}
/>
```

### `ThemeToggle`

Bascule dark/light du DS. Composant **sans état interne** : le parent gère `mode` et `onToggle`. Émet `role="switch"` + `aria-checked`. La position du thumb est pilotée par CSS via `[data-mode="light"]` sur `<html>` — le consumer reste responsable de setter `data-mode`. Accepte les attributs natifs `<button>` (sauf `role`).

| Prop       | Type                  | Défaut | Description                                            |
|------------|-----------------------|--------|-------------------------------------------------------|
| `mode`     | `"dark" \| "light"`   | requis | Mode courant (pilote thumb + `aria-checked`)          |
| `onToggle` | `() => void`          | requis | Callback au clic                                      |
| `label`    | `string`              | auto   | Override du label accessible (auto-généré sinon)      |

Types exportés : `ThemeToggleProps`.

```tsx
import { ThemeToggle } from "@msyx-dev/react";

<ThemeToggle mode={mode} onToggle={() => setMode(m => m === "dark" ? "light" : "dark")} />
```

### `PageHeader`

En-tête de page DS (`.section-header`) avec overline, titre, lead, breadcrumb et slot d'actions.

| Prop         | Type                       | Défaut   | Description                                       |
|--------------|----------------------------|----------|---------------------------------------------------|
| `title`      | `string`                   | requis   | Titre principal                                  |
| `overline`   | `string`                   | —        | Label overline au-dessus du titre                |
| `lead`       | `string`                   | —        | Texte descriptif sous le titre                   |
| `actions`    | `ReactNode`                | —        | Slot boutons d'actions à droite                  |
| `breadcrumb` | `ReactNode`                | —        | Slot breadcrumb au-dessus                        |
| `as`         | `"h1" \| "h2" \| "h3"`     | `"h1"`   | Niveau de heading du titre                       |
| `className`  | `string`                   | —        | Classe CSS additionnelle sur la racine           |

Types exportés : `PageHeaderProps`, `PageHeaderHeadingLevel`.

```tsx
import { PageHeader, Button } from "@msyx-dev/react";

<PageHeader
  overline="Administration"
  title="Utilisateurs"
  lead="Gérez les comptes et leurs rôles."
  actions={<Button>Nouvel utilisateur</Button>}
/>
```

## Historique des releases

Voir [`RELEASES.md`](./RELEASES.md).
