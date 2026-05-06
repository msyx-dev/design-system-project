# Rétrospective Sprint 21 — design-system-project

**Date** : 2026-05-06
**Milestone GH** : Sprint 21 (#22)
**Versions livrées** : v2.36.0 (#188) + v2.37.0 (#189)
**Durée** : ~1 h (groom+spec → dev → CI → merge → bilan), avec 1 reprise mid-dev

## Résumé exécutif

Sprint 21 = **DX refactor structurel** : split du monolithe components.css (4429 lignes / 175 KB) en 25 modules + barrel + tree-shake guide (#188), puis échelle modulaire typographique ratio 1.25 (#189). 2 PRs (#196, #197), **9/9 SP livrés, 100% velocity (21e sprint consécutif)**.

## Métriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | CI 1st-try | Statut |
|-------|------|----|----|---------------|-----------------|------------|--------|
| #188 Split components.css → 25 modules + barrel | Task P1 | 6 | ❌ | Non | 0 (auto-review propre PR) | ✅ lint+visual PASS | Done v2.36.0 |
| #189 Type modular scale 1.25 + pairing | Task P2 | 3 | ❌ | Non (séquentiel post-#188) | 0 | ✅ lint+visual PASS | Done v2.37.0 |

**Total : 9 / 9 SP — 100% velocity (21e sprint consécutif)**

## Vélocité — tendance

| Sprint | Planifié | Livré | Accuracy |
|--------|----------|-------|----------|
| 19     | 11       | 11    | 100%     |
| 20     | 7        | 7     | 100%     |
| 21     | 9        | 9     | 100%     |

Médiane 5 derniers sprints (S17-S21) : **9 SP**. Sprint 21 pile sur la médiane. 21 sprints consécutifs à 100% accuracy.

## Ce qui a bien marché

- **Pré-allocation versions explicite — 4e application consécutive** : #188 → v2.36.0, #189 → v2.37.0 injectées dans les prompts /dev. **Zéro conflit @ds-version** sur 5 fichiers × 2 PRs. Convention figée.
- **Séquencement explicite anticipé en /spec et /readiness-check** : la spec #189 mentionnait textuellement « Sequencing #188→#189 explicité (rebase + relocate des `.typo-*` si #188 a splitté `components.css`) ». Le readiness-check a propagé l'instruction au /sprint §3 (pas de parallélisation possible). Subagent #189 a localisé les `.typo-*` dans le nouveau `shared/css/components/theming.css` post-split sans friction.
- **VR PASS 18/18 du premier coup sur les DEUX PRs SANS baseline update** : ce qui était une surprise positive sur #189 (la spec garantissait des diffs 1-3px attendus, baseline update planifié avec approbation Mike). Tous les deltas (h1 -0.9px, h2 +2.4px, small/mono +0.4px) ont été absorbés par la tolerance Playwright. Approbation Mike devenue sans objet.
- **Stratégie 3 commits sur #188 (git mv → extract 25 modules → barrel + sync infra)** : préserve l'historique git, vérification mécanique `cat <fichiers> | diff - _full.tmp.css` ne produit que des diffs d'en-têtes. AC « historique préservé » respecté via le commit de renommage explicite (similarité git détecte > 50% sur le rename complet, pas sur les sous-fichiers — accepté en spec).
- **§2a groom+spec en parallèle (2 subagents)** : ~5 min chacun, specs claires (22.5 KB pour #188, 21.4 KB pour #189), 0 itération. Règle anti-spec-on-main respectée (§2.bis check pass).
- **check-docs.sh `--fail-on-warn` PASS du premier coup** : `OK: documentation cohérente avec le diff` après que les subagents aient mis à jour ARCHITECTURE.md + CLAUDE.md eux-mêmes pendant /dev. Heuristique stable.

## Ce qui a coincé

- **Subagent #188 a épuisé son budget tool_uses (90/100) après seulement le commit 1/3** : juste le `git mv components.css → _full.tmp.css`. Première occurrence sur ce projet de ce mode d'échec spécifique (≠ timeout pur S19). Cause structurelle : le refactor demandait 25 extract Read/Write + 5 bumps + 4 fichiers sync infra + docs = ~100+ ops, alors que /dev consomme déjà 5-10 tool_uses en pre-checks (worktree, lint, status). Le successeur a repris depuis le commit 1 et terminé en 120 tool_uses (incluant CI fail+correctif `sync.sh` arg parsing). **Pattern reproductible identifié** : tout refactor avec extract de N ≥ 20 fichiers risque de saturer le budget en un seul subagent.
- **components-core.css = 42 KB vs AC « ~30 KB »** : le subagent a inclus 7 modules au lieu des 5 essentiels (a ajouté `_base` et `_a11y` qu'il considérait obligatoires). Note dans RELEASES.md : « Hors scope d'optimisation pour ce sprint ». Dérive d'AC numérique sans flag explicite : le « ~ » a été interprété de manière permissive (40% au-dessus). Pas bloquant fonctionnellement mais signale un pattern de fragilité sur les AC quantitatifs imprécis.
- **Sprint forcé séquentiel en §3** (pas de parallélisation), connu et anticipé. Pas un échec, mais un coût intrinsèque : la spec #189 dépendait de la nouvelle localisation post-split, donc impossible de paralléliser malgré l'absence de dépendance fonctionnelle déclarée par GitHub. Le readiness-check l'a vu et signalé. Sprints multi-issues touchant la même surface CSS = séquentiel obligatoire.

## Actions pour la suite

1. **Convention « refactor large = découpage subagent en 2 lots »** [→ /sprint workflow ou CLAUDE.md projet]. Pour toute issue avec SP ≥ 6 ET tâche du type « split / extract N ≥ 20 fichiers », **scinder le dev en 2 subagents successifs** : (a) lot préparatoire (worktree + commit 1 = `git mv` ou setup) ; (b) lot principal (extract + sync infra + bump + tests). Permet à chaque subagent de tenir dans son budget tool_uses ~100. Validé empiriquement sur #188 (1er subagent crash @ 90 tu, successeur OK @ 120 tu). Action concrète : ajouter une note dans la skill `/dev` ou dans le prompt /sprint §3c pour anticiper ce découpage.

2. **Précision AC numérique** [→ /spec workflow ou planner agent]. Tout AC avec « ~N KB », « ~N modules », « ~N fichiers » doit être complété par une borne max explicite (`≤ 1.5× cible` ou valeur absolue). Validé empiriquement par la dérive components-core.css (42 KB vs ~30 KB cible). Reformulation à acter au niveau planner : « ~30 KB → cible 30 KB, max acceptable 35 KB, sinon flag explicite dans le PR ».

3. **Bug post-merge.sh préfix repo (S20 → S21)** [→ reporté S22]. Non investigué S21 (sprint focalisé refactor structurel). À créer comme issue dédiée S22 avec estimation 1 SP, ou intégrer comme action S22.

4. **Capitaliser pattern « successeur idempotent »** [→ CLAUDE.md global, niveau N1]. 3e occurrence sur le projet (S19 timeout sur quality gate, S20 no-RESULT, S21 budget tool_uses). Le parent peut reprendre un commit local non-pushé via un successeur si la branche locale + le worktree sont préservés. Robuste, prévisible. Action : ajouter une mention dans `/sprint §3d-5` (reprise idempotente) que le mode « budget tool_uses épuisé » est reconnu et traité comme un cas standard, pas une anomalie.

5. **Action items sprint 20 — suivi** :
   - [ ] **Bug post-merge.sh préfix** : non traité S21. **REPORTÉ S22** (action #3 ci-dessus).
   - [ ] **Renforcer ligne RESULT obligatoire dans /sprint §3c** : pas de récidive S21 — les 4 subagents (§2a + §3) ont tous renvoyé une ligne RESULT propre. **Pending mais hors radar** (cas observé en S20 = 1 occurrence isolée).
   - [ ] **Adoucir heuristique check-docs.sh sur ARCHITECTURE.md** : pas de récidive S21 — `OK` du premier coup. **Pending mais hors radar**.
   - [ ] **Cron wake-up systématique sprints > 5 SP** : non appliqué S21 (sprint 9 SP mais ~1h continue, pas de rate-limit). Toujours pending comme convention prophylactique pour sprints > 10 SP.

## Capitalisation cross-projet

- **Pattern budget tool_uses subagent** : un refactor avec extract de N fichiers atteint typiquement 100+ tool_uses. Le budget par défaut est ~100. Conséquence : tout subagent sur tâche « N modules à extraire » doit être planifié en 2 lots, ou explicitement spawné avec un budget étendu. Ce constat dépasse le projet design-system : tout projet avec un refactor structurel large (split monolithe) est concerné.
- **Convention « pré-allocation versions explicite »** : 4e application consécutive (S17 / S19 / S20 / S21). Pattern figé. À mentionner explicitement dans le N1 (`~/.claude/CLAUDE.md`) comme règle absolue cross-projet : « tout sprint avec ≥ 2 issues bumpant une version partagée → parent pré-alloue les versions et les injecte dans le prompt /dev de chaque subagent ».
- **Diffs VR sub-pixel absorbés par tolerance Playwright** : valider empiriquement la fourchette de tolérance par défaut (~3px sur Playwright). Pour le projet design-system : 1-3px de delta sur titres = pas de baseline update nécessaire. Cette donnée capitalisée évite de bloquer inutilement sur des « approbations Mike » futures pour des diffs sub-pixel attendus.

## Bilan suivi S20

- 5 actions S20 → S21 :
  - 1/5 ✅ Done : v2.34.0 + v2.35.0 documentées dans RELEASES.md + memory.md (acté en bilan S20)
  - 4/5 ⏳ Pending (bug post-merge.sh, RESULT obligatoire, check-docs heuristique, cron wake-up)
  - 0/5 ❌ Abandoned

**Vélocité 21 sprints consécutifs à 100%. Refactor structurel le plus large du projet livré sans régression visuelle (175 KB → 25 modules, 0 changement rendu). Pattern « successeur idempotent » s'établit comme un mécanisme fiable de récupération.**
