# Rétrospective Sprint 29 — design-system-project

**Période** : 2026-05-09 (sprint matinée, ~30 min end-to-end avec rebase manuel)
**Milestone** : [Sprint 29 #30](https://github.com/msyx-dev/design-system-project/milestone/30) — CLOSED
**Vélocité** : **4 / 4 SP livrés (100%)** — 29e sprint consécutif

## Issues livrées

| # | PR | Titre | SP | Version | Durée |
|---|---|---|---|---|---|
| #233 | [#235](https://github.com/msyx-dev/design-system-project/pull/235) | Fix tokens.css ACSSI commentaire mal fermé L244-616 | 1 | v2.49.1 (`@ds-version` patch) | dev+review ~4min |
| #234 | [#236](https://github.com/msyx-dev/design-system-project/pull/236) | Refactor `.code-inline` vers tokens canoniques + démo | 3 | v2.50.0 (`@ds-version` minor) | dev+review ~5min + rebase ~3min |

## Périmètre fonctionnel

- **Fix tokens.css ACSSI (#233)** : suppression du bloc legacy commenté L244-616 dans `shared/css/tokens.css`. Le commentaire `/* ----- Themes externalises vers themes/*.json (v2.39.0) -----` ouvert L244 n'était jamais correctement fermé (les marqueurs `* /` avec espace L248-269 sont invalides pour le parser CSS), englobant 4 blocs `[data-theme]` (ACSSI dark+light, Nhood dark+light) et 373 lignes mortes. Code mort confirmé : les thèmes sont déjà servis par `themes/*.json` → `themes.css` autogénéré (Sprint 22 #190). **Aucun impact rendu** mais bombe à retardement pour tout consumer ACSSI qui aurait re-sync. Bloquait notamment le resync aksy v2.36 → v2.49 ([aksy#456](https://github.com/msyx-dev/aksy/issues/456)) — désormais débloqué. Smoke test post-fix : 52/52 commentaires `/*…*/` balanced. Bump v2.49.0 → v2.49.1.
- **Refactor `.code-inline` (#234)** : promotion de la DS-EXCEPTION aksy UC-373 (aksy#470). **Découverte clé** : `.code-inline` existait DÉJÀ dans `shared/css/components/interactive.css` ligne 11 avec ~30 usages réels (97 estimés post-grep) dans `pages/composants.html` + `pages/templates.html`. L'issue est donc devenue refactor + démo + documentation au lieu de création. Tokens canoniques substitués : `--font-mono`, `--surface-solid`, `--border-color` (au lieu de `--border` deprecated), `--radius-xs`, `font-size: 0.9em`. Démo dédiée ajoutée dans `pages/divers.html` section #code (`.demo-box` placée avant les `.code-block`). Entrée ajoutée à `shared/components-registry.json` + bump `version` 2.49.0 → 2.50.0. ARCHITECTURE.md + CLAUDE.md mis à jour. Bump `@ds-version` v2.49.0 → v2.50.0 sur 5 fichiers.

## Ce qui a marché

- **Detection auto + typage natif au scoping** : Mike a découvert le bug critique #233 + idée feature #234 dans la backlog. Le parent a typé les 2 issues via GraphQL natif (Bug/Feature `issueTypeId`) + créé Sprint 29 milestone + assigné board #7 + priorities P1/P2 en un seul lot — préparation propre en < 30 sec.
- **Spec /spec a découvert le faux problème de #234** : la spec a fait un `grep -r "code-inline" .` qui a révélé que la classe existait déjà dans `interactive.css` L11 (~30 usages). Sans ce check, le coder aurait créé un duplicat. L'issue a été reformulée en refactor — preuve que le pipeline groom+spec en amont mérite ses 5 minutes même pour les "petites" features.
- **Parallélisme dev+review fluide** : #233 et #234 spawnés simultanément (lot unique sans dépendance). RESULT propres : 38 + 51 tool_uses, sous le budget 90. Pas d'anomalie subagent contrairement à S25 (#217 + #218 timeout 100+).
- **Pré-allocation versions a fonctionné** : parent a injecté `v2.49.1` dans le prompt #233 et `v2.50.0` dans le prompt #234 — chaque subagent a bumpé à sa version exacte sans relire la version courante. 10e application consécutive du pattern (S17→S29).
- **Order-of-merge** : merge #235 (v2.49.1, fix critique) puis #236 (v2.50.0, feature) a permis de garder la version finale supérieure et l'historique RELEASES.md ordonné.

## Ce qui a coincé

- **Conflit git RELEASES.md + 5 fichiers @ds-version entre #235 et #236 (récidive S28)** : les 2 PRs touchent les mêmes 5 fichiers de version + RELEASES.md. Première PR mergée → seconde `CONFLICTING`. Résolution manuelle parent ~3 min :
  - 5 fichiers `@ds-version` : `git checkout --theirs` (garde v2.50.0 > v2.49.1, ordre version croissant)
  - RELEASES.md : merge manuel (Edit) — conserver les 2 entrées dans l'ordre v2.50.0 puis v2.49.1
  - Force-push avec `--force-with-lease` puis re-watch CI puis re-merge
- **Action item S28 #2 (helper resolve-version-conflicts.sh) toujours pas faite** : 2e occurrence consécutive du même conflit en 2 sprints. À sprinter dans S30 ou en Quick.
- **Worktrees orphelins persistent** : 32 worktrees lockés depuis les sprints précédents non nettoyés. `git worktree prune` n'enlève rien (locked). Dette filesystem.

## Métriques

- **Vélocité 29 sprints** : 100% sur 28/29 sprints (S23 = 107% bonus). Cumul livré = 275 SP.
- **PR cycles** : #235 dev+review+CI = ~4 min (fix trivial). #236 dev+review+CI = ~5 min + 3 min résolution conflit + CI re-run 3 min = 11 min total.
- **Friction technique** : ~3 min cumulés (résolution conflit). En baisse vs S28 (~15 min).
- **Tool_uses subagents** : 38 (#235) + 51 (#236) = 89 cumulé. Sous budget. 0 anomalie 100+.
- **Découverte spec** : #234 estimée 3 SP en grooming, livrée en 3 SP (refactor + démo + doc compense la non-création).

## Action items pour Sprint 30 / Klaude

1. **[DS S30 Quick]** Reprendre l'action S28 #2 — `chore: helper resolve-version-conflicts.sh` pour automatiser la résolution mécanique des conflits @ds-version (5 fichiers) + RELEASES.md (merge ordonné par numéro de version). 2e récidive en 2 sprints, ROI évident (3-5 min/sprint à PRs parallèles).
2. **[DS S30 cleanup]** Audit `git worktree list` + `prune --force` sur les 32 worktrees lockés orphelins (héritage S15-S25). Dette filesystem. Possibilité d'écrire un script `cleanup-stale-worktrees.sh` qui détecte les branches mergées + worktrees > 30j.
3. **[Klaude P1 — toujours pending]** Avancer [`claude-config#29`](https://github.com/msyx-dev/claude-config/issues/29) — hook anti-merge filtré par projet. Pas de friction observée S29 (aucun subagent autre projet actif), mais reste un risque récurrent.
4. **[Cross-projet débloqué]** [`aksy#456`](https://github.com/msyx-dev/aksy/issues/456) resync v2.36 → v2.50 désormais débloqué (bug #233 fermé). Notifier l'équipe aksy.
5. **[Deploy]** Lancer `/deploy` v2.50.0 sur design-system.msyx.fr (ajouts purs CSS + suppression code mort, 0 risque utilisateur).
6. **[Backlog idée Mike]** Ouvrir issue Feature P3 — proposer une variante alternative wordmark Monogram (M-montagne) comme variante optionnelle du logo officiel. Explorations conservées dans `assets/explorations/wordmark-monogram-{a,b}.svg`.

## Décisions / patterns à capitaliser

- **Pattern « spec /spec fait un grep avant de spec une création » validé** : avant de spec une nouvelle classe ou un nouveau composant, faire un `grep -r "<nom>" .` pour vérifier qu'elle n'existe pas déjà sous une autre forme. Aurait évité un duplicat sur #234 si le coder avait procédé naïvement. Pattern à hisser dans `/spec` skill (claude-config).
- **Pattern « pré-allocation versions » 10e application consécutive** : éprouvé. À considérer comme convention permanente du DS, plus une option.
- **Pattern « merge order = ordre patch puis minor »** : quand 2 PRs parallèles bumpent versions différentes (patch + minor), merger le patch d'abord pour préserver l'ordre RELEASES.md et garder la version finale supérieure. Convention validée S29.
- **Anti-pattern récidivant** : 2 PRs en // qui touchent RELEASES.md + fichiers @ds-version → conflit garanti. Sans helper auto, prévoir le rebase manuel dans le timing du sprint.
