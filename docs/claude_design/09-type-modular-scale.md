# Ticket 09 — Type modular scale

> **P2** · Effort S (1 jour) · Risque moyen

## CONTEXT

8 sizes existent mais pas de rythme documenté. Adopter une échelle modulaire (1.25 ratio) + règles de pairing.

## PROMPT

```
PRÉREQUIS : ticket 03 (VR) mergé.

On exécute le ticket 09 — Type modular scale.

Plan en 5 lignes avant écriture.

Objectif :
1. Définir l'échelle 1.25 dans tokens.css :
   --type-12: 0.75rem; --type-14: 0.875rem; --type-16: 1rem; --type-20: 1.25rem; --type-25: 1.5625rem; --type-31: 1.953rem; --type-39: 2.441rem; --type-49: 3.052rem;
2. Tokens line-height : --lh-tight (1.1), --lh-snug (1.3), --lh-base (1.5), --lh-relaxed (1.7).
3. Réviser typo-display/h1/h2/h3/h4 et text-xs/sm/base/lg/xl pour utiliser ces nouveaux tokens. Calculer les diffs visuels minimaux.
4. Documenter dans pages/fondation.html section Typographie : règles de pairing ("h2 + body-lg + lh-base", "h4 + small + lh-base").
5. VR : il y aura des diffs (1-2 px sur certains titres). Update baseline avec mon accord.
6. Bump 2.36.0. Changed.

Garde-fous :
- Si un titre passe de 1.5rem à 1.5625rem, c'est OK. Si un titre passe de 1.5rem à 2rem, c'est un bug — vérifier.
- Ne change pas Space Grotesk / Inter / Fira Code. UNIQUEMENT les sizes/lh.
```

## DEFINITION OF DONE

- [ ] 8 tokens type-* + 4 tokens lh-* dans tokens.css
- [ ] Tous les `--typo-*` et `--text-*` existants pointent vers la nouvelle échelle (ou aliases)
- [ ] Section "Pairing" dans fondation.html
- [ ] Baseline VR mis à jour avec mon approbation explicite
- [ ] RELEASES.md v2.36.0

## FICHIERS ATTENDUS

```
shared/css/tokens.css       [edit]
pages/fondation.html        [edit]
SKILL.md                    [edit, ajout règles pairing]
visual-tests/baseline/      [update partiel]
RELEASES.md                 [append]
```

## POST-MERGE

- Audit visuel manuel sur les 8 pages pour s'assurer qu'aucun titre ne casse en mobile.
