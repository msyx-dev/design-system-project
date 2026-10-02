# Rétrospective — milestone #50 « Fiabilisation consumers ③ »

> Entrée de vélocité numéro **50** = numéro du milestone (même convention que `sprint-m49-…`).

**Période** : 2026-10-01 → 2026-10-02 · **2 lots** (`integration/lot-1` → `main` = `7764526`, `integration/lot-2` → `main` = `463a671`)
**Release** : DS **2.143.0** + `@msyx-dev/react` **3.0.0-alpha.61** (PR 995)
**Contexte** : le lot 2 s'est déroulé de nuit, en autonomie (« backlog vide à mon réveil, applique tes préconisations par défaut »).

## Données

| Issue | Type | SP | PR | Cycles CI | Note |
|---|---|---|---|---|---|
| #968 `.btn-outline-danger` | Bug | 2 | 972 | 1 | Quick |
| #967 registre / check-components | Bug | 2 | 974 | 2 | |
| #970 `consumers.json` / `sync-all.sh` | Task | 3 | 975 | 2 | |
| #976 banc a11y fiable (T1) | Task | 3 | 984 | 2 | découpée de #969 puis éclatée (14 SP > 8) |
| #977 capture du header | Task | 2 | 985 | 2 | récolte VR |
| #969 tolérance VR | Bug | 3 | 979 | 4 | récolte de ~370 baselines + mutation M5 |
| #980 accent F1+F2 | Task | 5 | 986 | 3 | recollement + récolte |
| #981 statuts F3 | Task | 3 | 989 | 3 (communs) | **branche commune** avec #982 |
| #982 neutres, avatars, inactifs F4-F7 | Task | 5 | 989 | ↑ | 3 tranches, une seule récolte |
| #990 flocon visible hors Noël | Bug | 1 | 991 | 2 | **ajoutée en cours** (lue sur une capture du header) |
| #983 `color-contrast` bloquant MSYX | Task | 2 | 992 | 3 | mutation M-A en CI |
| #993 `height="auto"` du sapin | Bug | 1 | 994 | 1 | **ajoutée en cours** (smoke DOM du gate) |
| #973 | Bug | — | — | — | **doublon** de #993, ouvert la veille par une autre session |

**Vélocité** : **32 SP livrés / 32 SP au board** (13 issues, 0 échec). Au plan validé, il y avait 4 issues : #967, #968, #969 et #970. L'amont a ensuite découpé #969 (volet VR, 3 SP) et en a sorti #976 (14 SP), éclatée en T1 plus #980 à #983. #977 s'y est ajoutée. #990 et #993 ont été ajoutées en cours, sur des défauts trouvés en lisant les mesures.
**Mesure faussée puis corrigée** : `velocity-compute.sh` lit le board avec `--limit 500`, alors que le board en compte 506. Il rendait 15 SP, 7 issues et une fausse alerte « accuracy 47 % ». La valeur écrite vient d'une copie du script sans ce plafond (claude-config#538).

**Résultat mesuré** : `color-contrast` MSYX **83 / 123 → 0 / 0** (sombre / clair), banc de 100 runs sans erreur, aucune régression sur les 8 autres combinaisons. Le job a11y est **bloquant** pour MSYX.

**Quality-gate du lot 2** : un premier passage FAIL sur 13c (smoke DOM : erreur console préexistante, #993), un second PASS après le correctif. C'est le premier lot où le smoke DOM a réellement tourné sur l'image de l'arbre.

## ✅ Ce qui a marché
- **Branche commune pour #981 et #982** (tranches A, B, C) : une seule récolte VR et une seule PR, au lieu de trois cycles séquentiels d'environ 25 minutes. Les conflits de thèmes ont été résolus en gardant les deux côtés, puis `themes.css` régénéré.
- **Mesure parent par le banc a11y, avec preuves par mutation** pour chaque famille (F1 à F7, exemption `aria-disabled`, F7 `:has()`), et un tableau avant/après sur les 10 combinaisons tiré de l'artefact CI. C'est cette mesure qui a rendu #983 possible sans aucune exemption.
- **Lire les mesures plutôt que les verdicts** a fait sortir deux vrais défauts que la CI validait en vert : le flocon visible sur tous les thèmes (#990, vu sur une capture du header) et l'erreur console du sapin (#993, vue dans la sortie complète du smoke DOM).
- **Le gate a bloqué ce qu'il devait bloquer** : `main` n'a été basculé qu'après le correctif de #993.

## ❌ Ce qui a coincé
1. **Récolte d'une variante instable** : 4 captures Noël du formulaire ont été récoltées sur un état différent des lumières animées du sapin, ce qui a coûté un cycle CI de plus. Le sapin et la guirlande animés recouvrent des sections de la page en thème Noël, et rien ne les neutralise dans les captures.
2. **Smoke DOM sauté en silence depuis un worktree** : `validate-tree.sh` prend le nom du projet dans `basename` du répertoire, et rendait `smoke=NA` sur `wt-lot2`. L'erreur n'est apparue qu'en rejouant depuis un dossier nommé `design-system-project` (claude-config#537).
3. **#993 ouverte en doublon de #973**, sans recherche préalable dans les issues ouvertes.
4. **Recollements après squash** : chaque merge d'une branche que la branche commune contenait déjà a remis la PR en conflit. Résolution « ours », vérifiée par un arbre identique au SHA testé, mais c'est un aller-retour de plus.
5. **Vélocité sous-comptée par l'outil** (claude-config#538, voir plus haut).

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | `validate-tree.sh` résout le projet depuis le dépôt, pas depuis le nom du répertoire | claude-config#537 | **Écrite** (ticket) |
| A2 | `velocity-compute.sh` sans plafond silencieux (pagination, ou échec si le nombre lu atteint la limite) | claude-config#538 | **Écrite** (ticket) |
| A3 | Neutraliser les animations du décor festif (sapin, guirlande) dans les captures VR Noël | — | **Retenue** : proposée au bilan ; pas de ticket ouvert de nuit, consigne « backlog vide » |
| A4 | Avant d'ouvrir une issue en cours de sprint, chercher le symptôme dans les issues ouvertes (`gh issue list --search`) | — | **Écrite** (mémoire) |
| A5 | Contraste MSYX et tolérance VR | #969 #983 | **Mesurée** : job a11y bloquant sur MSYX (prouvé par mutation en CI) et VR à `maxDiffPixels: 50` (prouvé par mutation) |

## Vérification des actions de la rétro précédente (`sprint-m49-fiabilisation-consumers.md`)
- A1 gates runtime mesurés sur l'arbre (claude-config#536) : ✅ **Done**. `validate-tree.sh` construit l'image, le smoke DOM se fait par chemin, plus par URL ; ce gate a trouvé #993.
- A2 borne du réveil CI (claude-config#536) : ✅ **Done**. `ci-wait-budget.sh` donne 3 285 s, avec des tranches de 1 740 s réarmées.
- A3 tolérance VR et axe bloquant : ✅ **Done** (#969, #976, #980 à #983).
- A4 passe historique de `check-components.sh` : ✅ **Done** (#967).
- A5 contraste des boutons pleins : ✅ déjà mesurée. #968 y ajoute `.btn-outline-danger`.
- **Frontière strict** (violations nom/id en warn-only) : ⏳ **reportée une deuxième fois**. Selon la règle de `/retro`, une action répétée doit devenir une mesure ou être abandonnée explicitement : **à trancher par Mike**.
- **`version.json` racine figé à 2.57.1** : ⏳ inchangé, sans effet au runtime (l'image sert `/version` = SHA de l'arbre, prouvé par `validate-tree`).
