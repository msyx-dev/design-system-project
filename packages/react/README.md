# @msyx-dev/react

Composants React du Design System msyx.fr.

## Installation

```bash
pnpm add @msyx-dev/react
```

## Contrat CSS — import obligatoire

Les composants React s'appuient sur les classes CSS du Design System. Le CSS n'est **pas** bundlé dans ce package. Le consumer doit importer le CSS séparément :

```ts
// Dans votre _app.tsx, layout.tsx ou point d'entrée global
import "@msyx-dev/design-system/dist/style.css";
// ou, si vous utilisez directement le fichier CSS du repo DS :
import "/path/to/design-system/shared/styles.css";
```

Sans cet import, les composants s'affichent sans style.

## Usage

```tsx
import { Button } from "@msyx-dev/react";

// Variantes
<Button variant="primary">Confirmer</Button>
<Button variant="secondary">Annuler</Button>
<Button variant="ghost">En savoir plus</Button>
<Button variant="danger">Supprimer</Button>

// Tailles
<Button size="sm">Petit</Button>
<Button size="md">Moyen (défaut)</Button>
<Button size="lg">Grand</Button>

// États
<Button loading>Chargement...</Button>
<Button disabled>Désactivé</Button>

// Icônes
<Button leftIcon={<Icon />}>Avec icône gauche</Button>
<Button rightIcon={<Icon />}>Avec icône droite</Button>

// Pleine largeur
<Button fullWidth>Pleine largeur</Button>

// Ref
const ref = useRef<HTMLButtonElement>(null);
<Button ref={ref}>Avec ref</Button>
```

## Props

| Prop        | Type                                          | Défaut      | Description                                |
|-------------|-----------------------------------------------|-------------|--------------------------------------------|
| `variant`   | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"primary"` | Variante visuelle                          |
| `size`      | `"sm" \| "md" \| "lg"`                        | `"md"`      | Taille du bouton                           |
| `loading`   | `boolean`                                     | `false`     | Affiche un spinner, désactive le bouton    |
| `disabled`  | `boolean`                                     | `false`     | Désactive le bouton                        |
| `leftIcon`  | `ReactNode`                                   | —           | Icône affichée à gauche du texte           |
| `rightIcon` | `ReactNode`                                   | —           | Icône affichée à droite du texte           |
| `fullWidth` | `boolean`                                     | `false`     | Étend le bouton à 100% de la largeur       |

Le composant accepte également tous les attributs natifs `<button>` via `ButtonHTMLAttributes<HTMLButtonElement>`.
