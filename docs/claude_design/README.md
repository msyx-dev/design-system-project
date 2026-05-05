# Claude Code — Backlog d'exécution

Ce dossier contient les tickets prêts à donner un-par-un à Claude Code sur ton VPS, dérivés de `../audit/IMPROVEMENT_PLAN.md`.

## Comment l'utiliser

1. **Pose ce dossier à la racine de `design-system-project`** (clone Git, pas seulement le repo de ce projet Claude).
2. **Pose aussi `SKILL.md`** à la racine — il sera lu automatiquement par Claude Code via `CLAUDE.md`.
3. **Travaille un ticket à la fois.** Ne lance jamais 2 tickets en parallèle dans la même session — la cohérence des bumps de version + sync consumers ne le supporte pas.
4. **Pour chaque ticket** : ouvre Claude Code dans le repo, puis :

   ```bash
   cat claude-code-tickets/01-skill-and-canonical-pages.md | claude
   ```

   ou copie-colle le bloc **PROMPT** du ticket dans la session.

## Ordre recommandé (du moins risqué au plus risqué)

| Ordre | Fichier | Effort | Risque |
|---|---|---|---|
| 1 | `01-skill-and-canonical-pages.md` | S | Aucun (création pure) |
| 2 | `02-diacritic-copy-lint.md` | XS | Cosmétique |
| 3 | `03-visual-regression-tests.md` | S | Aucun (ajoute un filet) |
| 4 | `04-token-rename.md` | S | Moyen — codemod, mais VR le couvre |
| 5 | `05-motion-page.md` | S | Aucun (page nouvelle) |
| 6 | `06-backdrop-filter-fallback.md` | XS | Aucun |
| 7 | `07-iconography-lucide.md` | M | Élevé — gros refactor visuel |
| 8 | `08-split-components-css.md` | M | Élevé — refactor structurel |
| 9 | `09-type-modular-scale.md` | S | Moyen |
| 10 | `10-theme-generator.md` | M | Moyen |
| 11 | `11-brand-motif-wordmark.md` | M | Off-keyboard partiellement |
| 12 | `12-noise-texture-token.md` | XS | Aucun |

## Convention de chaque ticket

Chaque `.md` contient :

- **CONTEXT** — résumé de l'item
- **PROMPT** — le bloc à passer à Claude Code (copie-colle direct)
- **DEFINITION OF DONE** — checklist de validation
- **FICHIERS ATTENDUS** — liste blanche : Claude Code ne doit toucher que ceux-là
- **POST-MERGE** — actions à faire après le PR (sync consumers, etc.)

## Garde-fous globaux

Quel que soit le ticket, **tous les prompts incluent** :

- "Propose le plan en 5 lignes avant d'écrire un seul fichier. Attends ma validation."
- "Ne touche que les fichiers listés dans FICHIERS ATTENDUS."
- "Bump `@ds-version` selon la convention de `CLAUDE.md`."
- "Mets à jour `RELEASES.md` (Added / Changed / Fixed)."
- "Pas de hex hardcodé. Tokens uniquement."
- "Si tu touches à `shared/css/tokens.css`, lance `shared/check-sync.sh` après et signale-moi les consumers en drift."
