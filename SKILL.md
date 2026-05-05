---
name: msyx-design-system
description: msyx Design System — usage rules, tokens, canonical pages, prompts. Invoke when working on a msyx project to enforce design conventions.
user-invocable: true
---

# msyx Design System — Guide agent

Source de vérité UI pour tous les projets msyx.fr.

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Conventions projet, stack, process ajout composant |
| `README.md` | Vue d'ensemble, installation |
| `RELEASES.md` | Historique des versions |
| `shared/CONSUMER_GUIDE.md` | Intégration dans un projet consommateur |
| `shared/components-registry.json` | Registre des 60 composants (classes CSS, init JS, exemple HTML) |
| `canonical-pages/` | 6 pages de référence à copier (login, settings, kanban, empty-state, 404, billing) |
| `prompts.md` | Phrases-types réutilisables pour agents |

## Règles tokens

- **Tokens-only** : jamais de `#hex`, `rgb()`, ou `rgba()` hardcodés. Toujours `var(--)`.
- Bleu accent → `var(--accent)` ; texte sur fond accent → `var(--text-on-accent)`.
- Cards/surfaces → `var(--bg-elevated)` ; bordures → `var(--border-color)`.
- Dégradés → `var(--gradient-1)` à `var(--gradient-4)` (bleu-violet, cyan-bleu, violet-rose, ambre-rouge).
- Exceptions autorisées : `transparent`, `currentColor`, `inherit`, `none`.

## Voix & copy

- Français, sentence-case, full-diacritics. « Cohérente », pas « coherente ».
- Pas d'emoji dans l'UI chrome. Emoji = contenu utilisateur uniquement.
- Labels d'actions : verbes à l'infinitif (« Enregistrer », « Annuler », « Supprimer »).

## Glass vs solid

- **Glass** pour le chrome (header, sidebar, modal, drawer). Cap : 2 couches de blur simultanées.
- **Solid** pour le contenu (cards, listes, tableaux).

## Thèmes et modes

3 thèmes (MSYX, ACSSI, Nhood) × 2 modes (dark, light). Toujours tester les 5 combinaisons valides.
Anti-FOUC obligatoire : script inline synchrone dans `<head>` avant `<link rel="stylesheet">`.

## Workflow — pattern d'absorption d'issue

Une issue B peut être absorbée dans une issue A si :
- Même fichier CSS cible ou même zone de cascade
- ACs proches et sprint commun
- Charge totale ≤ 8 SP après fusion

Procédure :
1. Justifier l'absorption dans le commentaire `/groom` de A
2. Inclure les ACs de B dans la spec de A
3. Mentionner `closes #A, closes #B` dans le titre de la PR

## Versioning — pré-allocation des versions

Pour les sprints multi-bumps (> 2 issues touchant `@ds-version`), le parent `/sprint` pré-alloue les versions et les injecte dans le prompt `/dev` de chaque issue.
Garantit zéro conflit git sur les bumps. Voir `CLAUDE.md` §Process point 5.

## Anti-patterns

- Pas de `#hex` hardcodé dans les pages ou composants
- Pas de `basic_auth` Caddy (utiliser `forward_auth` + cookie HMAC)
- Pas de modification de `CLAUDE.md` sans spec validée
- Pas de composant custom dans un projet consommateur sans avoir vérifié `components-registry.json` d'abord
