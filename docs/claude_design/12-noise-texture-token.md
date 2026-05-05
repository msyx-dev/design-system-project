# Ticket 12 — Noise texture token

> **P3** · Effort XS (1h) · Risque nul

## CONTEXT

Le noise overlay 1.5% sur body::after est un super motif mais traité comme implementation detail. Le promouvoir en token documenté.

**Si le ticket 11 (brand motif) est déjà mergé, ce ticket est partiellement absorbé.** Vérifier d'abord.

## PROMPT

```
On exécute le ticket 12 — Noise texture token.

Plan en 3 lignes.

Objectif :
1. Vérifier que ticket 11 n'a pas déjà ajouté --texture-grain. Sinon :
2. Ajouter dans tokens.css :
   --texture-grain: url("data:image/svg+xml;utf8,<svg xmlns='...' filter='url(%23n)' opacity='0.5'/>...");
   --texture-grain-opacity: 0.015;
3. Documenter dans pages/fondation.html sub-section "Texture".
4. Aucun changement visuel.
5. Bump patch.

Garde-fous :
- VR doit passer sans diff.
```

## DEFINITION OF DONE

- [ ] Token ajouté ou confirmé absorbé
- [ ] Doc fondation
- [ ] VR vert

## FICHIERS ATTENDUS

```
shared/css/tokens.css     [edit]
pages/fondation.html      [edit]
RELEASES.md               [append]
```

## POST-MERGE

Aucune.
