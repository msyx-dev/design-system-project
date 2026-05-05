# Ticket 10 — Theme generator

> **P2** · Effort M (1 sprint) · Risque moyen

## CONTEXT

Ajouter un theme = toucher 5 fichiers. Centraliser : themes définis en JSON, compilés en CSS.

## PROMPT

```
On exécute le ticket 10 — Theme generator.

Plan en 8 lignes avant écriture.

Objectif :
1. Créer themes/{msyx,acssi,nhood}.json avec la structure :
   {
     "name": "msyx",
     "displayName": "MSYX",
     "modes": {
       "dark":  { "primary": "#0a0f1e", "accent": "#3b82f6", ... },
       "light": { "primary": "#ffffff", "accent": "#2563eb", ... }
     }
   }
2. Script shared/build-themes.js (Node, no deps) qui lit themes/*.json et génère shared/css/themes.css avec les blocs [data-theme="X"][data-mode="Y"] { ... }.
3. Script shared/scaffold-theme.sh nhood-secondary qui crée themes/nhood-secondary.json (copy de nhood.json) et le compile.
4. Update build.sh : appelle build-themes.js AVANT de bundler styles.css.
5. Migration : extraire les blocs theme actuels de tokens.css vers themes/*.json, vérifier que build-themes.js régénère exactement le même CSS.
6. VR : 0 diff attendu.
7. Bump 2.37.0. Changed (architecture themes).

Garde-fous :
- L'ouput généré DOIT être byte-identique à l'actuel (sauf ordre des propriétés alphabétique).
- Garder les blocs CSS commentés dans tokens.css en backup pendant 1 sprint.
- Ne pas committer themes.css comme généré tant que VR n'est pas vert.
```

## DEFINITION OF DONE

- [ ] 3 fichiers JSON dans `themes/`
- [ ] `shared/build-themes.js` fonctionnel
- [ ] `shared/scaffold-theme.sh` testé (créer un theme bidon, le supprimer)
- [ ] `themes.css` généré = blocs theme actuels
- [ ] VR passe 96/96
- [ ] CONSUMER_GUIDE.md section "Adding a theme"

## FICHIERS ATTENDUS

```
themes/msyx.json                [new]
themes/acssi.json               [new]
themes/nhood.json               [new]
shared/build-themes.js          [new]
shared/scaffold-theme.sh        [new]
shared/css/themes.css           [new — généré]
shared/css/tokens.css           [edit — retire les blocs theme]
shared/build.sh                 [edit]
shared/CONSUMER_GUIDE.md        [edit]
RELEASES.md                     [append]
```

## POST-MERGE

- Documenter dans memory.md le nouveau workflow theme.
