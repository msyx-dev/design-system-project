# Rétrospective Sprint 22 — design-system-project

**Date** : 2026-05-06
**Milestone GH** : Sprint 22 (#23)
**Versions livrées** : v2.38.0 (#191) + v2.39.0 (#190)
**Durée** : ~50 min (groom+spec → dev → CI → merge → bilan), 2 corrections diacritiques mid-CI

## Résumé exécutif

Sprint 22 = **theming infra** : extension VR matrice complète 18 → 108 baselines (#191) puis theme generator JSON → CSS avec byte-identité validée par le filet 108 baselines (#190). 2 PRs (#198, #199), **10/10 SP livrés, 100% velocity (22e sprint consécutif)**.

## Métriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | CI 1st-try | Statut |
|-------|------|----|----|---------------|-----------------|------------|--------|
| #191 VR extension matrice 18 → 108 baselines | Feature P2 | 4 | ❌ | Non | 3 (non bloquants, auto-approve) | ❌ lint diacritique fail puis PASS | Done v2.38.0 |
| #190 Theme generator JSON → CSS | Feature P2 | 6 | ❌ | Non (séquentiel post-#191) | 8 checks adversariaux verts | ❌ lint diacritique fail puis PASS | Done v2.39.0 |

**Total : 10 / 10 SP — 100% velocity (22e sprint consécutif)**

## Vélocité — tendance

| Sprint | Planifié | Livré | Accuracy |
|--------|----------|-------|----------|
| 20     | 7        | 7     | 100%     |
| 21     | 9        | 9     | 100%     |
| 22     | 10       | 10    | 100%     |

Médiane 5 derniers sprints (S18-S22) : **9 SP**. Sprint 22 légèrement au-dessus de la médiane (10 SP), 100% accuracy maintenue. 22 sprints consécutifs à 100%.

## Ce qui a bien marché

- **Pré-allocation versions explicite — 5e application consécutive** (S17 → S22) : #191 → v2.38.0, #190 → v2.39.0 injectées dans les prompts /dev. **Zéro conflit @ds-version** sur 5 fichiers × 2 PRs. Pattern figé, à hisser au N1 cross-projet (action en attente).
- **Sequencing #191 → #190 explicite et propagé** : la spec #190 mentionnait textuellement « rebase sur main post-#191 → bénéficie du filet 108 baselines pour valider la byte-identité ». Le readiness-check a propagé l'instruction au /sprint §3 (pas de parallélisation possible). Subagent #190 a démarré sur main post-#191 sans friction.
- **Décision « 96 vs 108 baselines » tranchée en /spec** : la spec #191 a explicitement choisi Option B (108) avec justification (motion.html ajoutée S20 amène 9 pages, pas 8). Le subagent /dev a appliqué la décision sans hésitation. **Pattern : trancher les divergences ticket/réalité dans /spec, pas dans /dev**.
- **Découpage 2 commits anticipé en spec /dev #190** : la spec figée préconisait un découpage explicite (commit 1 = scaffold + génération initiale, commit 2 = migration tokens.css + intégration + bump + docs). Action S21 #1 (« refactor large = découpage subagent ») mise en pratique préventivement dès la spec. **Le subagent #190 a tenu en 1 seul lot (94 tool_uses), grâce à cette anticipation**. Si dépassement budget → successeur idempotent prêt (pattern S21 validé). 
- **Byte-identité validée par filet 108 baselines** : le subagent #190 a confirmé md5sum reproductible sur 2 runs successifs de `build-themes.js`, et VR PASS 108/108 sans baseline update. La séparation msyx (root) / acssi+nhood (themes.css généré) donne une cascade propre.
- **Tri alphabétique strict des propriétés CSS** dans `build-themes.js` = byte-identité reproductible deterministe. Décision archi figée en spec.
- **§2a groom+spec parallèle (2 subagents)** : ~4 min chacun, specs claires (long contenu mais clair, ~20 KB chacune), 0 itération.

## Ce qui a coincé

- **CI lint diacritique a fail sur LES DEUX PRs** : `RELEASES.md` contenait des mots français sans accents — #198 « matrice complete » / « themes x », #199 « themes acssi/nhood » (pattern `\bthemes [a-z]` matché). Le subagent /dev a affirmé « diacritiques OK » dans la review mais le linter CI a flaggé en post-push. Le parent a dû corriger manuellement à chaque fois (1 commit de fix par PR, ~30 secondes chacun). **Le subagent /dev ne lance pas `bash shared/check-diacritics.sh` en quality gate avant `gh pr create`** — c'est un trou dans le quality gate.
- **2 cycles CI au lieu d'1 sur chaque PR** : conséquence directe du fail diacritique → +2 cycles CI (lint+visual relancés), soit ~6 min de friction CI cumulés. Pas dramatique, mais évitable.
- **Volume binaire significatif sur #191** : 90 nouvelles baselines PNG = ~5-8 MB. Commit direct (pas de git-lfs), cohérent avec l'approche existante (18 baselines déjà commitées en direct), mais le repo gagne ~6 MB d'un coup. À surveiller si la matrice étend encore (10 pages → 120 baselines).
- **CI VR plus longue** : 2m47s sur #198, **7m1s** sur #199 (post-merge donc 108 baselines à comparer). La hausse est attendue (6× plus de captures), mais les futurs PRs touchant les CSS subiront ce coût. Le timeout-minutes 30 (vs 15) absorbe largement, mais c'est notable pour la DX.

## Actions pour la suite

1. **Ajouter `check-diacritics.sh` au quality gate de /dev** [→ skill /dev ou pre-push hook]. Le linter CI flag systématiquement (fail rapide, 5s) mais c'est trop tard. Action concrète : modifier la skill `/dev` (ou ajouter un hook) pour exécuter `bash shared/check-diacritics.sh` avant `gh pr create`. Si fail → corriger, pas pousser. **Empêche la friction CI observée S22 sur les 2 PRs**. Estimation : 1 SP, peut être Quick si bien scopé. À créer comme issue Sprint 23 ou reportée S23+.

2. **Hisser convention « pré-allocation versions explicite » au N1 cross-projet** [→ `~/.claude/CLAUDE.md`]. 5e application consécutive (S17 → S22). Pattern stable. Texte proposé : « tout sprint avec ≥ 2 issues bumpant une version partagée → parent /sprint pré-alloue les versions et les injecte dans le prompt /dev de chaque subagent ». À acter dans `~/.claude/CLAUDE.md` règles absolues. **Action manuelle Mike** (modification N1).

3. **Bug post-merge.sh préfix repo (S20 → S21 → S22)** [→ reporté S23]. Non investigué S22 (sprint focalisé theming). Bug toujours présent (mitigé par invocation correcte avec REPO sans préfix owner). À créer comme issue dédiée S23 ou reporter S23+.

4. **Action items sprint 21 — suivi** :
   - [x] **Convention « refactor large = découpage subagent »** : appliquée préventivement en spec /dev #190 (découpage 2 commits documenté). Pas eu besoin de successeur car le subagent a tenu en 1 lot grâce à l'anticipation.
   - [x] **Précision AC numérique** : non re-déclenché S22 (pas d'AC numérique « ~N » dans #190/#191). Pending mais hors radar S22.
   - [ ] **Bug post-merge.sh préfix** : reporté S23 (action #3 ci-dessus).
   - [x] **Capitalisation pattern « successeur idempotent »** : pas eu besoin S22, mais le pattern reste prêt en filet de sécurité.

## Capitalisation cross-projet

- **Pattern « décision archi tranchée en /spec, pas en /dev »** : sur #191, le ticket parlait de 96 baselines mais la réalité du projet était 108 (motion.html ajoutée S20). La spec a tranché Option B (108) avec justification. Le subagent /dev a appliqué sans hésitation. **À acter au niveau planner** : toute spec qui découvre un écart entre le ticket d'origine et la réalité projet doit trancher explicitement et expliquer le choix.
- **Trou quality gate /dev sur diacritique** : observé sur 2 PRs consécutives. Le linter CI agit en post-push, c'est trop tard. **À fixer dans la skill /dev** (action #1 ci-dessus). Cross-projet : tout projet qui a un linter spécifique (diacritique, accessibilité, …) doit l'exécuter en quality gate /dev avant `gh pr create`.
- **Découpage commit 2-en-1 (scaffold + integration)** sur refactor moyen-large (6 SP) = pattern efficace. Pas besoin de 2 subagents successifs si le subagent unique a une feuille de route claire dans la spec. À considérer pour sprints similaires : la spec décrit le découpage commit, le subagent unique l'exécute.

## Bilan suivi S21

- 4 actions S21 → S22 :
  - 2/4 ✅ Done : convention découpage subagent appliquée (#190), pattern successeur idempotent prêt en filet
  - 2/4 ⏳ Pending : bug post-merge.sh (reporté S23), précision AC numérique (hors radar S22, pas re-déclenché)
  - 0/4 ❌ Abandoned

**Vélocité 22 sprints consécutifs à 100%. Sprint 22 livre l'infra theming (108 baselines + theme generator JSON), ouvre le chemin pour les consumers qui veulent dériver leurs propres thèmes. Pattern « décision archi tranchée en spec » s'établit. Trou quality gate diacritique = action prioritaire S23.**
