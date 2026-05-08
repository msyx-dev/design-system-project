# Rétrospective Sprint 24 — design-system-project

**Période** : 2026-05-08 (1 jour, 4 PRs séquentielles + parallèles)
**Milestone** : [Sprint 24 #25](https://github.com/msyx-dev/design-system-project/milestone/25) — CLOSED
**Vélocité** : **9 / 9 SP livrés (100%)** — 24e sprint consécutif

## Issues livrées

| # | PR | Titre | SP | Lot | Durée PR (create→merge) |
|---|---|---|---|---|---|
| #209 | [#213](https://github.com/msyx-dev/design-system-project/pull/213) | Logo officiel MSYX mark-only vectorisé v2.43.0 | 3 | 1 (seul) | 3 min |
| #211 | [#214](https://github.com/msyx-dev/design-system-project/pull/214) | Refactor nav.js : extract VERSION + template literals v2.43.1 | 2 | 2 (seul) | 4 min |
| #210 | [#220](https://github.com/msyx-dev/design-system-project/pull/220) | Audit visuel Phase 1 — 40 findings, 4 sous-issues | 3 | 3 (parallèle) | 5 min |
| #212 | [#215](https://github.com/msyx-dev/design-system-project/pull/215) | Doc `page.route()` pattern dans SKILL.md (Quick) | 1 | 3 (parallèle) | 13 min* |

\* PR #215 attendait la fin de #220 avant que le hook anti-merge laisse passer son merge.

## Périmètre fonctionnel

- **Brand identity stabilisée** : remplacement du wordmark Monogram (paths-by-agent S23) par le mark vectorisé depuis le source officiel `msyx.fr/media/logo/logoMSYX.png` (potrace + svgo, 1.1 KB). Wordmark conservé en historique dans `assets/explorations/`.
- **Prévention structurelle #206** : `shared/nav.js` refactoré (10 zones) — extract `const VERSION` + template literals ES6. Ferme la classe d'incidents quote-oubliée-dans-une-longue-concat.
- **Audit visuel DS Phase 1** : 40 findings concrets sur 26 modules CSS, 4 sous-issues `#216-#219` créées pour Sprint 25+.
- **Doc agent-ready** : pattern `page.route()` documenté dans `SKILL.md` pour empêcher la récidive du flaky CI E2E observé S23 #204.

## Ce qui a marché

- **Pré-allocation versions** (convention 2026-05-01) appliquée pour S24 multi-bumps (#209 v2.43.0 + #211 v2.43.1) sur **le même fichier `shared/nav.js`** — séquençage Lot 1 → Lot 2 + `git pull --ff-only` parent entre lots. **0 conflit @ds-version.** 7e application consécutive (S17→S24), pattern stable.
- **Découpage #210 audit-only Phase 1** validé : la spec a explicitement scopé READ-ONLY (rejet automatique de toute PR touchant `shared/**`). Le subagent a respecté le contrat — diff strictement limité à `docs/audit-2026-05-08.md`.
- **Quick Flow #212** : skip groom+spec en amont, dev direct, livré en 29 tool_uses. Pattern efficace pour les Quick (1 SP).
- **Parallélisation Lot 3** réussie (#210 + #212) — fichiers disjoints, aucun conflit, gain de temps réel.
- **Pattern « arbitrage upfront »** appliqué dès `/backlog-add` : décisions logo (Option A mark-only + A2 vectorisation) figées avant le sprint, subagent #209 a livré sans interruption synchrone.
- **Issues prévention créées proactivement** : action `#211` (refactor nav.js) **née pendant `/backlog-add`** au moment du challenge analyst, pas en réactif post-incident. Empêche la récidive structurelle de #206 indépendamment du filet pipeline `claude-config#24`.

## Ce qui a coincé

### 1. Subagent #209 (Lot 1) n'a pas pushé sa branche

Le subagent a fait `/dev` + `/review` localement avec quality-gate PASS, **mais n'a pas exécuté `git push -u origin <branch>` ni `gh pr create`**. Diagnostic : commit local `ea35cac` complet et propre, mais branche jamais pushée sur GitHub. Le subagent a aussi laissé un `package-lock.json` modifié non commité (artefact `npm install`).

**Mitigation parent** (~3 min) : `git checkout -- package-lock.json` + `git push -u origin chore/#209-...` + `gh pr create` manuel. Pas de re-spawn nécessaire (le commit était propre).

**Hypothèse cause** : le subagent a probablement basé son output « PASS » sur une exécution locale du quality-gate sans réaliser que le pipeline officiel demandait le push avant. Le prompt §3c contient bien « gh pr create » mais le subagent l'a interprété comme optionnel après un quality-gate PASS local.

### 2. Subagent #211 (Lot 2) — Stream idle timeout API

Premier subagent #211 : **API Error: Stream idle timeout** après 27 tool_uses (~7 min). Travail partiel : 3 zones refactorées sur 10 dans `shared/nav.js`, aucun commit, aucun push.

**Mitigation** : worktree jeté (§3d-5b), successeur fresh spawné avec budget réduit (70 tool_uses). Successeur livré en 59 tool_uses, 6 min, propre. **Total Lot 2 : ~13 min** au lieu de ~6 min idéal — dérive 2x mais récupération propre.

**Hypothèse cause** : Stream timeout API côté Anthropic, pas un bug de logique. Aléatoire.

### 3. Hook bloque-merge faux positif (récidive S19 + S23)

Le subagent #211 timeout est resté listé dans `~/.claude/logs/agents-active.json` après son interruption API. Le hook `hook-block-merge-with-subagent.py` a bloqué `gh pr merge 214` au motif d'un subagent fantôme.

**Mitigation parent** (~30 sec) : `jq` filter manuel sur agents-active.json pour retirer l'entrée fantôme.

**3e occurrence consécutive** (S19, S23, S24). À traiter dans `claude-config` : cleanup automatique sur subagent timeout.

### 4. Champ board Size non détecté pour #212

Le `board-update.sh --auto-add` détecte `Size` via le pattern `**N SP**` (gras Markdown) dans le body. #212 inscrivait `**1 SP / Quick**` qui n'a pas matché → board affiche `size=null` pour #212. Total board affiché S24 = 8 SP au lieu de 9.

**Impact** : cosmétique, n'affecte pas le pipeline mais fausse le tableau de vélocité par board.

## Actions

### Done (capitalisé S24)

- ✅ **Action S23 #2 (page.route() doc dans SKILL.md)** → Done via #212, SP=1.
- ✅ **Issue prévention #211 née pendant `/backlog-add`** : la fragilité structurelle de `nav.js` est éliminée (extract VERSION + template literals). Filet `claude-config#24` reste actif en complément.

### Pending (à reporter S25 ou repo claude-config)

- ⏳ **S24 #A (NOUVELLE — récidive 3e occurrence)** : cleanup automatique d'`agents-active.json` quand un subagent timeout API. À créer comme issue dans `msyx-dev/claude-config`. Hook ou cron qui supprime les entrées sans signal de fin > 30 min. **Coût impact** : ~30 sec friction parent par occurrence, mais peut bloquer un merge en sprint critique.
- ⏳ **S24 #B (NOUVELLE)** : durcir le prompt §3c subagent pour forcer le push. Ajouter dans le prompt « **DERNIÈRE étape avant RESULT : `git push -u origin <branch>` + `gh pr create`. Si tu as un quality-gate PASS local mais pas de PR sur GitHub, tu N'AS PAS terminé.** » À mettre à jour dans `~/.claude/commands/sprint.md` ou `~/.claude/commands/dev.md` (claude-config).
- ⏳ **Action S22 #2 — Hisser convention « pré-allocation versions » au N1 cross-projet** : 7e application consécutive S17→S24, pattern stable. Reporté à nouveau (S22→S23→S24→S25). Modif `~/.claude/CLAUDE.md` (claude-config). À créer comme Quick.
- ⏳ **S24 #C (NOUVELLE)** : `board-update.sh --auto-add` doit aussi détecter le pattern `**N SP / Quick**` (avec slash) ou `**N SP** Quick`. Petit fix à creuser dans claude-config.
- ⏳ **Action S22 #3 — Bug `post-merge.sh` préfix repo** : non observé S23 ni S24 (8 post-merge.sh successifs OK). Probablement fix latent ou cas dépendant. À investiguer en lisant le script avant de re-créer une issue.

### Abandoned

- ❌ Aucune.

## Vérification action items précédents (S23)

- ✅ S23 #2 (page.route() doc SKILL.md) → Done S24 #212
- ⏳ S23 #1 (resolve-version-conflicts.sh) → reporté (claude-config — pas observé S24 grâce à pré-allocation + séquençage Lot 1/2)
- ⏳ S22 #2 (pré-allocation N1) → reporté à nouveau S25
- ⏳ S22 #3 (post-merge.sh préfix) → non observé S23+S24, à investiguer

## Vélocité

| Sprint | Planned | Delivered | Accuracy |
|---|---|---|---|
| S22 | 10 | 10 | 100% |
| S23 | 14 | 15 | 107% |
| **S24** | **9** | **9** | **100%** |

**Tendance 3 derniers sprints** : 100% / 107% / 100% — stable, conservateur post-incident #206 (S24 cible 9 SP sous médiane 10). Prochaine borne : S25 vise probablement 10-11 SP (remédiation findings #210 + intégration audit Phase 2).

## Leçons à retenir

1. **Pré-allocation versions = nécessaire ET suffisante quand séquencée par lots disjoints**. S24 prouve que 2 PRs sur le même fichier (`shared/nav.js`) peuvent merger sans conflit @ds-version si parent enchaîne Lot 1 → `git pull` → Lot 2.
2. **Issue prévention née en `/backlog-add` > issue prévention post-incident**. #211 (refactor nav.js) a été identifiée par l'analyst pendant le challenge backlog. Sans ce challenge, la dette structurelle de #206 aurait perduré (claude-config#24 protège contre la récidive immédiate, pas contre la cause structurelle).
3. **Sub-agent peut « finir » localement sans pousser** — le quality-gate PASS local n'est pas un proxy de « PR créée ». Le prompt doit être explicite : `git push` + `gh pr create` sont des étapes obligatoires séparées du quality-gate.
4. **Hook bloque-merge a un faux positif structurel sur timeout API** — récidive 3e fois. Mérite enfin une vraie issue claude-config.
