# Rétrospective Sprint 20 — design-system-project

**Date** : 2026-05-06
**Milestone GH** : Sprint 20 (#21)
**Versions livrées** : v2.34.0 (#186) + v2.35.0 (#187)
**Durée** : ~1.5 h (groom+spec → dev → CI → merge → bilan)

## Résumé exécutif

Sprint 20 = **DX cleanup** : refactor tokens ambigus (#186) + nouvelle page motion reference (#187). 2 PRs (#194, #195), 7/7 SP livrés, 100% velocity (20e sprint consécutif).

## Métriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | Statut |
|-------|------|----|----|---------------|-----------------|--------|
| #186 Token rename — codemod idempotent + aliases legacy | Task P2 | 3 | ❌ | Non | 0 | Done v2.34.0 |
| #187 Motion reference page — durations, easings, 6 patterns | Feature P2 | 4 | ❌ | Non | 0 | Done v2.35.0 |

**Total : 7 / 7 SP — 100% velocity (20e sprint consécutif)**

## Vélocité — tendance

| Sprint | Planifié | Livré | Accuracy |
|--------|----------|-------|----------|
| 18     | 9        | 9     | 100%     |
| 19     | 11       | 11    | 100%     |
| 20     | 7        | 7     | 100%     |

Médiane 5 derniers sprints (S16-S20) : **9 SP**. Sprint 20 sous médiane (sprint compact volontairement après gros lift S19), 100% accuracy maintenue.

## Ce qui a bien marché

- **Pré-allocation versions explicite injectée par /sprint** : #186 → v2.34.0, #187 → v2.35.0 dans le prompt /dev de chaque subagent. **Zéro conflit @ds-version** sur 5 fichiers × 2 PRs. Convention S17 reconfirmée S20.
- **Ordre séquentiel sur dépendance fichier** : décision parent au plan §2 de ne pas paralléliser malgré l'absence de dépendance fonctionnelle, parce que les 2 PRs touchaient `tokens.css` (renames vs nouvelles vars motion). Spec #187 mentionnait explicitement le rebase post-#186 → exécution sans surprise.
- **Codemod #186 idempotent — validation parfaite** : sed -E avec word-boundaries, 5 renames, aliases legacy bidirectionnels. Run 1× = N modifications, run 2× = 0 modification. Pattern reproductible pour futurs renames.
- **VR : 0 baseline update sur #186 (aliases legacy garantissent rendu identique)** + 2 nouvelles baselines sur #187 (motion-dark + motion-light). 18 baselines totales (vs 16 avant). CI verte du premier coup sur les 2 PRs.
- **§2a groom+spec en amont — 2 subagents en parallèle** : runtime ~5 min chacun, specs claires, 0 itération. Règle anti spec-on-main respectée (§2.bis check pass).
- **Pattern parent finalisation mécanique (S19 → S20)** : 2e application réussie. Subagent #187 finit sur quality gate report sans push ni ligne RESULT → parent push direct depuis le worktree + `gh pr create` (~2 min friction).

## Ce qui a coincé

- **Subagent #187 sans ligne RESULT obligatoire** : terminé sur un quality gate report formaté en table mais aucun `RESULT: STATUS=...` final, et **branche jamais pushée**. Le travail était complet (15 fichiers, 511 insertions, working tree clean dans le worktree). Le format de réponse obligatoire dans le prompt /sprint §3c n'est pas systématiquement respecté par les subagents Sonnet sur tâches longues (130 tool_uses).
- **post-merge.sh — double préfix repo** : `~/.claude/scripts/pipeline/post-merge.sh "msyx-dev/design-system-project" 186` a généré la requête GraphQL `repos/msyx-dev/msyx-dev/design-system-project` (NOT_FOUND). Issue auto-closed via "closes #186" dans le squash-merge → pas bloquant, mais `board-update.sh` interne au script échoue → board reste en Specced. Mitigation : invocation manuelle `board-update.sh "design-system-project"` (sans préfix owner). Bug silencieux probablement présent depuis plusieurs sprints.
- **check-docs.sh `--fail-on-warn` strict sur ARCHITECTURE.md** : ligne légitime « Extension future : Sprint 22 → 96 baselines » a déclenché un WARN (mot-clé "future"). Reformulation forcée en « Roadmap : Sprint 22 ciblera... ». Pattern de fragilité : la heuristique de détection « stale text » trigge sur toute mention prospective, y compris une roadmap explicite.

## Actions pour la suite

1. **Investiguer le bug post-merge.sh préfix repo** [→ créer Task Bug Sprint 21]. Symptôme observable depuis ≥ 2 sprints. Le script reçoit un argument `OWNER/REPO` mais le combine avec un autre `msyx-dev/` quelque part en interne, donnant `msyx-dev/msyx-dev/REPO`. Mitigation manuelle = invoquer `board-update.sh "REPO_NAME"` sans préfix. Investigation : `grep -n "msyx-dev" ~/.claude/scripts/pipeline/post-merge.sh` + tracer le chemin de `$REPO`. Estimation 1 SP.

2. **Renforcer la règle « ligne RESULT obligatoire » côté prompt /sprint §3c** [→ /sprint workflow]. Ajouter une instruction terminale plus explicite dans le prompt subagent : après `/review`, **dernier acte = afficher la ligne RESULT, même si tout est PASS et même si le quality gate produit déjà un rapport**. La ligne quality gate ne remplace pas RESULT. Reformulation à acter dans `~/.claude/skills/sprint.md` ou équivalent.

3. **Adoucir la heuristique check-docs.sh sur ARCHITECTURE.md** [→ optionnel, faible priorité]. Soit whitelist de phrases prospectives légitimes (« Roadmap », « Sprint NN ciblera »), soit retirer "future" du pattern bloquant en `--fail-on-warn`. À considérer si le warn refait surface en Sprint 21+. Pas urgent — reformulation ad-hoc OK pour l'instant.

4. **Action items sprint 19 — suivi** :
   - [ ] **Cron wake-up systématique pour sprints > 5 SP** : non appliqué S20 (sprint 7 SP, ~1.5h continue, pas de rate-limit). Toujours pending comme convention prophylactique. Sera réévalué sur sprint > 10 SP.
   - [x] **Pattern « parent finalisation mécanique après échec subagent »** : 2e application S20 (subagent #187 sans ligne RESULT, parent finalise push+PR). À acter formellement comme variante autorisée du §3d-5 dans le workflow /sprint.
   - [ ] **Cleanup `agents-active.json` post-timeout** : 0 récidive S20 (les 2 subagents §2a + 2 subagents §3 ont tous fini proprement, hook merge-block n'a pas bloqué). En pause, à réactiver si récidive.
   - [ ] **Migration UI iconography complète (suite #184)** : non créée comme issue. Mike doit arbitrer si la complétude AC stricte est souhaitée. Sinon les 16 cas typographiques documentés dans ARCHITECTURE.md restent acceptables.
   - [ ] **Extension VR baselines 18 → 108** : prévue Sprint 22 (#191), planifiée. Compteur mis à jour S20 (16 → 18 avec motion).

5. **Documenter v2.35.0 + v2.34.0 dans RELEASES.md + gh release** [→ §4e du sprint en cours]. 2 versions livrées dans le même sprint = 2 entrées RELEASES.md, 1 ou 2 gh release tags (à arbitrer : tag final v2.35.0 OK ou tag intermédiaire v2.34.0 ?).

## Capitalisation cross-projet

- **Pattern « parent finalisation après absence ligne RESULT »** : étendre le §3d-5 du /sprint pour couvrir le cas distinct du timeout pur. Symptômes : subagent termine son work mais sort sans le format RESULT obligatoire. Détection : parser la dernière ligne de la réponse subagent, si pas de `RESULT: STATUS=` → checker GitHub (PR ouverte ?) + worktree (commit local clean ?), si commit clean non pushé → parent push direct. Validé S19 (timeout) + S20 (no-RESULT).
- **Convention « pré-allocation versions explicite » sur sprint multi-bumps** : reconfirmée S17 + S20. Pour tout sprint avec ≥ 2 issues qui bumpent `@ds-version`, le parent injecte la version cible dans le prompt /dev de chaque subagent. À mentionner dans CLAUDE.md projet design-system (déjà présent §Process ajout composant point 5).

## Bilan suivi S19

- 5 actions S19 → S20 :
  - 1/5 ✅ Done : pattern parent finalisation mécanique réappliqué (S20 #187)
  - 4/5 ⏳ Pending (convention prophylactique, audit consumer cross-project, VR S22 planifiée, migration UI complète arbitrage Mike)
  - 0/5 ❌ Abandoned

**Velocity 20 sprints consécutifs à 100% — milestone (jeu de mots) remarquable. Vélocité saine, sprint compact volontairement (7 SP) après gros lift S19 (11 SP), pas de surchauffe.**
