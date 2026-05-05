# Phrases-types msyx Design System — Agents

Réutilisables tel quel dans les prompts ou les spécifications.

## Tokens

- « Use msyx tokens. No hardcoded hex, rgb, or rgba. »
- « For text on accent backgrounds, use `var(--text-on-accent)` — never `color: white`. »

## Cards & surfaces

- « Glass cards on dark, solid cards on light. Cap concurrent blur layers to 2. »
- « Cards de contenu = `.card`. Cards interactives = `.card-flat` ou `.card-icon`. »

## Thèmes & modes

- « Toujours tester les 5 combinaisons : MSYX dark/light, ACSSI dark/light, Nhood dark/light. »
- « Anti-FOUC : script inline `<head>` synchrone obligatoire avant `<link rel="stylesheet">`. »

## Voix

- « Voix française, sentence-case, full-diacritics. « Cohérente », pas « coherente ». »
- « Pas d'emoji dans l'UI chrome. Emoji = contenu utilisateur uniquement. »

## Composants

- « Avant de créer un composant custom, vérifier `shared/components-registry.json`. »
- « Mobile-first : tester 320px, 768px, 1280px. »

## Versioning & workflow

- « Bump `@ds-version` sur 5 fichiers : `tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`. »
- « Pour absorber une issue B dans une issue A : même fichier CSS, même cascade, ACs proches, sprint commun. Mentionner `closes #A, closes #B` dans le titre de la PR. »
