# Rétrospective Sprint 25 — design-system-project

**Période** : 2026-05-08 (1 jour, 4 PRs séquentielles obligatoires)
**Milestone** : [Sprint 25 #26](https://github.com/msyx-dev/design-system-project/milestone/26) — CLOSED
**Vélocité** : **12 / 12 SP livrés (100%)** — 25e sprint consécutif

## Issues livrées

| # | PR | Titre | SP | Version | Durée PR (create→merge) |
|---|---|---|---|---|---|
| #217 | [#221](https://github.com/msyx-dev/design-system-project/pull/221) | Pictos/images — chevron theme-aware + sprite cleanup + context-menu Lucide | 3 | v2.44.0 | 4 min |
| #218 | [#222](https://github.com/msyx-dev/design-system-project/pull/222) | Flicker boutons — transitions ciblées + will-change cards | 4 | v2.45.0 | ~3h* |
| #216 | [#223](https://github.com/msyx-dev/design-system-project/pull/223) | Margins/padding — tokenisation --space-\* (2 nouveaux tokens) | 3 | v2.46.0 | 4 min |
| #219 | [#224](https://github.com/msyx-dev/design-system-project/pull/224) | Restructure composants × pages — 7 sections déplacées | 2 | v2.47.0 | 4 min |

\* PR #222 bloquée par hook anti-merge à cause d'un coder actif sur **un autre projet** (aksyva-project) — voir « Ce qui a coincé § 2 ».

## Périmètre fonctionnel

- **Audit Phase 1 remédié** : 4 sous-issues de #210 livrées, fermant les findings P-01 à P-09, F-01 à F-09, M-01 à M-12, R-01 à R-07.
- **Chevron theme-aware** : variable CSS `--chevron-select` data:uri par theme/mode (6 déclinaisons miroir de `--text-dim`). Plus de couleur hardcodée `#94a3b8`. Le sélecteur natif s'adapte enfin à ACSSI dark et au mode light.
- **Sprite Lucide cleanup** : `<svg>` interne supprimé des `<symbol>`, paths directs. +2 glyphes (`scissors`, `square-check`). Build reproductible via `build-sprite.sh`.
- **Transitions ciblées** : 30 occurrences de `transition: all` éliminées sur 13 modules CSS — propriétés explicites (`transform`, `box-shadow`, `border-color`, `background-color`, `opacity`). `will-change: transform` strict sur `.card`/`.hub-card` (les seuls combinant `backdrop-filter` + `transform:hover`).
- **Tokens space tokenisation** : 2 nouveaux tokens `--space-2: 0.75rem` et `--space-5: 1.25rem` ajoutés à l'échelle modulaire. 12 sélecteurs M-01 à M-12 retokenisés. Élimination des hardcodés 0.7rem / 0.9rem / 1.2rem.
- **Restructure composants × pages** : 7 sections déplacées pour cohérence sémantique — pagination, tooltip, comments → `feedback.html` ; action-menu → `navigation.html` ; pricing → `templates.html` ; theme-switcher → `fondation.html` ; CSS login-form de `templates.css` → `forms.css`. `components-registry.json` aligné avec 4 entrées ajoutées (action-menu, pricing, comments, theme-switcher).

## Ce qui a marché

- **Arbitrage upfront round** (pattern S23) : 3 décisions structurantes R-03/R-04/R-07 sur #219 validées par Mike via `AskUserQuestion` en début de session. Le subagent /dev a livré la matrice complète sans interruption synchrone. Validé pour les sprints à choix sémantiques.
- **Pré-allocation versions** (8e application consécutive S17→S25) : 4 versions injectées dans les prompts /dev (v2.44.0, v2.45.0, v2.46.0, v2.47.0). **0 conflit `@ds-version`** sur 4 PRs séquentielles modifiant les mêmes 5 fichiers. Pattern stable.
- **Groom+spec en amont parent (§2a)** : 2 lots parallèles (#217+#218 puis #216+#219) avec injection des contrats Lot A → Lot B. Spec #216 mentionne explicitement `--chevron-select` (figé par #217) et le pattern transition canonique (figé par #218). Aucun conflit inter-spec, aucune divergence.
- **Séquençage forms.css** : épicentre conflit anticipé en `/backlog-add` → 4 PRs séquentielles, jamais en parallèle, `git pull --ff-only` parent entre lots. **0 merge conflict** sur 4 PRs touchant le même fichier.
- **Quality gate** : 4/4 PASS (120 E2E Playwright + lint + diacritics + nav-js-syntax + smoke DOM) sur les 4 PRs.
- **Subagents #216 et #219 disciplinés** : RESULT propre retourné en 62 et 89 tool_uses respectivement. Pattern push-and-return fonctionne quand le budget tool_uses tient.
- **CLAUDE.md (N2) auto-synchronisé** : descriptions des 5 pages mises à jour par le subagent /dev de #219 (linter externe a validé la cohérence). Capitalisation cumulée propre.

## Ce qui a coincé

### 1. Subagents #217 + #218 ont timeout à 100+ tool_uses sans ligne RESULT (RÉCIDIVE 2x)

Pattern observé sur les 2 premières issues du sprint :
- **#217** : subagent fini à 112 tool_uses, output coupé après le verdict du quality gate, AUCUNE ligne RESULT. Branche locale `feat/#217-sprite-chevron-themes` avec commit propre `06abb27`, jamais pushée. Aucune PR.
- **#218** : subagent fini à 138 tool_uses, output coupé après le verdict du quality gate, AUCUNE ligne RESULT. Branche locale `feat/218-flicker-transitions-ciblees` avec 2 commits propres, jamais pushée. Aucune PR. **De plus, RELEASES.md n'avait pas été mis à jour pour v2.45.0** — omission du subagent.

**Mitigation parent** (§3d-5b reprise idempotente) : le parent a découvert les worktrees + branches locales propres, ajouté l'entrée RELEASES.md manquante (#218), pushé manuellement les branches, et créé les PRs (#221 et #222). **~10 min de friction parent par issue.**

**Hypothèse cause** : les subagents Sonnet sur des refactors CSS multi-fichiers (sprite SVG complet pour #217, 30 occurrences `transition: all` sur 13 modules pour #218) consomment massivement le budget tool_uses sur les Read/Edit, et n'ont plus la marge pour exécuter /review + retourner la ligne RESULT. Le timeout du stream les coupe.

**Capitalisation appliquée mid-sprint** : à partir du subagent #216, le prompt mentionne explicitement les budgets « 70/90/100 tool_uses » et l'anomalie #217+#218 récente. Résultat : #216 et #219 ont retourné RESULT propre. **Le warning explicite dans le prompt fonctionne.**

### 2. Hook anti-merge bloque pour subagent actif sur AUTRE projet (faux positif inter-projet)

PR #222 est CLEAN + MERGEABLE + CI verte 5 min après push. Mais :
- `gh pr merge` bloqué par `hook-block-merge-with-subagent.py` parce qu'un **coder actif sur aksyva-project** (autre projet, autre session, PID 430617) tournait en parallèle.
- Le hook ne discrimine pas par projet — il refuse tout merge dès qu'un subagent (coder, reviewer, tester, devops-deployer) tourne quelque part dans le système.
- **Attente cumulée : ~3h** (plusieurs cycles de coder + devops-deployer aksyva successifs) avant que tous les subagents aksyva soient libérés.

Le sprint design-system étant strictement séquentiel (#216/#219 dépendent de #218 mergée), tout le sprint a été bloqué pendant cette attente. Mike a été sollicité via `AskUserQuestion` pour décider de la suite — il a recommandé d'attendre. Polling via Monitor toutes les 30s sur l'état de la PR + l'état des subagents (deux conditions de sortie).

**Action item structurelle** : ouvrir une issue `claude-config` pour filtrer le hook par projet (ne bloquer que si subagent actif sur LE MÊME projet). Le hook actuel (`scripts/hook-block-merge-with-subagent.py`) lit `agents-active.json` mais ignore le champ `project`. Modification simple : `cwd` du `gh pr merge` → repo → projet, comparer au `project` de chaque subagent actif.

### 3. CI lint check-diacritics fail sur RELEASES.md (#218)

Le commit `RELEASES.md` du subagent #218 (et l'entrée que le parent a dû ajouter pour récupérer #218) contenait `regression` et `themes x` sans accents. `shared/check-diacritics.sh` matche `\bregression\b` et `\bthemes [a-z]\b` → exit 1 → CI fail.

**Mitigation parent** : édition rapide RELEASES.md (`régression`, `thèmes`, `×` au lieu de `x`), `./shared/check-diacritics.sh` local OK, push fix. ~3 min.

**Capitalisation appliquée mid-sprint** : le prompt /dev des subagents #216 et #219 mentionne désormais explicitement les patterns de diacritiques bloquants et l'instruction de lancer `./shared/check-diacritics.sh` AVANT push. Aucune récidive sur #216 et #219.

## Métriques

- **Vélocité** : 12 / 12 SP (100%) — 25e sprint consécutif à 100%+
- **PRs ouvertes** : 4 (toutes mergées)
- **Conflits @ds-version** : 0 (pré-allocation 8e application stable)
- **Conflits forms.css** : 0 (séquençage strict)
- **Régression visuelle (VR Playwright)** : 0 / 480 baselines (4 PRs × 120 E2E)
- **Quality gate fails (avant fix)** : 1 (#218 lint diacritics)
- **Subagents qui ont timeout sans RESULT** : 2 / 4 (50%) — récupérés via reprise idempotente §3d-5b
- **Friction parent cumulée pour récupération subagent** : ~20 min (2 reprises idempotentes)
- **Friction parent cumulée pour hook anti-merge faux positif** : ~3h (attente cycles aksyva)

## Action items

| ID | Action | Priorité | Owner |
|---|---|---|---|
| AI-25.1 | Ouvrir issue `claude-config` : hook `hook-block-merge-with-subagent.py` filtre par projet | P1 | Klaude repo |
| AI-25.2 | Hisser pattern « budget tool_uses + warning anomalie récente » dans le prompt /dev N1 (template Sprint 17+) | P2 | Klaude repo |
| AI-25.3 | Hisser pattern « lancer `./shared/check-diacritics.sh` avant push » dans /dev quand RELEASES.md est touché | P2 | Klaude repo |
| AI-25.4 | Notifier aksy pour retirer overrides locaux des 4 DS-EXCEPTIONs débloquées S23 (#265, #278, #301, modal-focus UC-288) — toujours en attente | P3 | design-system |

## Capitalisation

- **Pattern reprise idempotente §3d-5b** validé une 2e fois : un subagent qui timeout sans RESULT mais laisse une branche locale propre + worktree avec `git status` clean est récupérable par le parent en ~10 min (push + create PR). C'est plus rapide que de spawner un successeur fresh. Procédure : check `git ls-remote` (branche pushée ?), check `gh pr list` (PR existe ?), check worktree `git status` (commit local propre ?). Si commit local OK → parent push + create PR. Si commit absent → spawner successeur.
- **Pattern « warning explicite anomalie récente dans le prompt »** : mentionner dans le prompt /dev les anomalies des subagents précédents du même sprint (avec budget tool_uses précis) **prévient la récidive**. Validé sur #216 et #219 (zéro timeout après warning).
- **Pré-allocation versions stable** : 8e application consécutive sans conflit. Convention figée. Toujours appliquée pour sprints multi-bumps (>2 issues touchant @ds-version).
- **Arbitrage upfront round** : pattern stable depuis S23, 3e application S25 (R-03/R-04/R-07 logo S24, signature S23). Économise les rounds Mike mid-sprint.
- **Hook anti-merge inter-projet** : faux positif identifié, capitalisation Klaude. Sprint design-system bloqué 3h par un coder aksyva. Le sprint reste livrable mais le pattern coûte cher en attente. Action item AI-25.1.

## Vérification action items précédents (S24)

| ID | Action S24 | Statut S25 |
|---|---|---|
| AI-24.1 | claude-config#24 (smoke DOM + node -c quality-gate) | ✅ CLOSED S24, actif sur les 4 PRs S25 |
| AI-24.2 | Notifier aksy pour DS-EXCEPTIONs débloquées | ⚠️ Toujours en attente (reporté AI-25.4) |
| AI-24.3 | Hisser pré-allocation versions en N1 dans claude-config | ⚠️ Toujours en attente (à traiter dans repo Klaude) |
| AI-24.4 | Cleanup agents-active.json (entrées orphelines) | ⚠️ Toujours en attente (à traiter dans repo Klaude) |

## Prochaine étape

- **Audit Phase 2** ? Le doc `docs/audit-2026-05-08.md` Phase 1 est désormais entièrement remédié (40 findings → 4 sous-issues fermées). Audit Phase 2 (autres findings hors-scope Phase 1) à composer si besoin.
- **Deploy v2.47.0** : cumul S25 = v2.43.1 prod → v2.47.0 main. Commande : `/deploy` (avec audit secu auto).
- **Sprint 26** à composer : pas de candidats prioritaires identifiés à date. Si déploiement v2.47.0 OK → focus sur consumers (aksyva, acssi-core) pour valider l'absence de régression sur les 4 bumps mineurs.
