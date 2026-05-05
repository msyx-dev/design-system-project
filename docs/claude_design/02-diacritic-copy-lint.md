# Ticket 02 — Diacritic / copy lint

> **P3** · Effort XS (2h) · Risque nul · Cosmétique

## CONTEXT

La copy oscille entre "coherente" et "cohérente", "themes" et "thèmes", "deploye" et "déployé". Habitude ASCII legacy. À normaliser sur full diacritics + ajouter un linter pour ne plus régresser.

## PROMPT

```
On exécute le ticket 02 — Diacritic lint.

Plan en 5 lignes avant écriture.

Objectif :
1. Grep tout le repo pour les mots français écrits sans diacritiques où ils devraient en avoir : coherente, themes, deploye, livre, requete, parametre, donnee, identifie, charge, recupere, entree. Liste-moi les occurrences AVANT correction.
2. Corrige uniquement après ma validation de la liste.
3. Ajoute un script `shared/check-diacritics.sh` qui grep ces mêmes patterns et exit 1 si trouvé.
4. Ajoute un hook husky / lefthook pré-commit OU une étape GitHub Actions qui lance ce script.
5. Bump @ds-version 2.32.1 (patch). Update RELEASES.md (Fixed).

Garde-fous :
- Ne touche pas aux noms de variables JS/CSS, IDs HTML, classes, ou commentaires de code en anglais.
- UNIQUEMENT le contenu textuel utilisateur (entre tags HTML, dans data-*, dans strings de notification).
- Si un mot est ambigu, demande-moi.
```

## DEFINITION OF DONE

- [ ] Liste des occurrences fournie et validée avant édition
- [ ] Corrections appliquées uniquement sur le contenu user-facing
- [ ] `shared/check-diacritics.sh` créé et exécutable (`chmod +x`)
- [ ] CI ou pre-commit hook lance le script
- [ ] `RELEASES.md` v2.32.1 avec section `Fixed`
- [ ] `git grep -E 'coherente|themes [a-z]|deploye'` retourne 0

## FICHIERS ATTENDUS

```
shared/check-diacritics.sh       [new]
.github/workflows/lint.yml       [new ou edit]
pages/*.html                     [edits ciblés contenu uniquement]
index.html, site.html            [edits ciblés]
RELEASES.md                      [append]
shared/css/tokens.css            [header @ds-version uniquement]
```

## POST-MERGE

- Vérifier que le hook bloque effectivement un commit volontairement fautif en local.
