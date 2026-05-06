# Ticket 04 — Token rename

> **P1** · Effort S (1 jour) · Risque moyen — VR doit être en place avant

## CONTEXT

Tokens ambigus :
- `--border-color` (couleur) vs `--border-width` (longueur) → `--border-color`
- `--shadow` (filtre) vs `--shadow-sm` → laisser, c'est OK
- `--radius-card` (16) vs `--radius-md` (12) → confus, deprecate `--radius-card`
- `--deco-violet`, `--deco-cyan`, `--deco-pink` non sémantiques → `--deco-violet`, etc.

Sans VR (ticket 03), ne pas faire ce ticket.

## PROMPT

```
PRÉREQUIS : ticket 03 mergé et baseline VR à jour.

On exécute le ticket 04 — Token rename.

Plan en 5 lignes avant écriture.

Objectif :
1. Créer un script `shared/codemod-rename-tokens.sh` (sed-based, idempotent) qui applique :
   --border-color (couleur uniquement) → --border-color
   --deco-violet → --deco-violet
   --deco-cyan   → --deco-cyan
   --deco-pink   → --deco-pink
   --radius-card (sans suffixe) → --radius-card
2. Ajouter des aliases legacy dans tokens.css :
   --border-color: var(--border-color);  /* deprecated, remove in v3 */
   --deco-violet: var(--deco-violet);   /* deprecated */
   etc.
3. Lance le codemod sur tout le repo. Liste-moi les fichiers modifiés AVANT commit.
4. Lance `npm run test:visual` — DOIT passer (les aliases garantissent le rendu identique).
5. Update CONSUMER_GUIDE.md avec la liste des tokens dépréciés et la deadline (v3.0.0).
6. Bump @ds-version 2.33.0. RELEASES.md → Changed (avec note deprecation).

Garde-fous :
- Les aliases NE DOIVENT PAS casser les consumers existants.
- Le codemod doit être idempotent : 2e run = 0 changement.
- Si VR fail après le codemod, c'est un bug du codemod, pas un faux positif. Stop et appelle-moi.
```

## DEFINITION OF DONE

- [ ] Codemod committé et idempotent
- [ ] Aliases legacy en place dans tokens.css
- [ ] VR passe (96/96)
- [ ] CONSUMER_GUIDE.md liste les déprécations
- [ ] RELEASES.md v2.33.0 avec note `Changed` détaillée

## FICHIERS ATTENDUS

```
shared/codemod-rename-tokens.sh   [new]
shared/css/tokens.css             [edit — renames + aliases]
shared/css/components.css         [edit — usages]
shared/css/utilities.css          [edit — usages]
pages/*.html                      [edits via codemod]
shared/CONSUMER_GUIDE.md          [append section "Deprecations"]
RELEASES.md                       [append]
```

## POST-MERGE

- `shared/sync-all.sh` — push les nouveaux tokens aux consumers.
- Crée une issue "Remove deprecated token aliases" avec milestone v3.0.0.