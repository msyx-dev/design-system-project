# Rétrospective — Milestone #51 « Fiabilisation consumers ④ » (2026-10-03)

> Nom de fichier préfixé `m51` : le numéro est celui du milestone GitHub, pas d'une itération « sprint 51 ».

Sprint lancé sur consigne de Mike (« enchaîne tous les tickets », plan validé à l'arrêt supervisé 1), déroulé de nuit, demandé par tirokado (refonte UX de l'écran organisateur).

## Données

| Issue | Type | SP plan | SP après amont | Livré | Tranches / successeurs | request_changes |
|---|---|---|---|---|---|---|
| #1007 tableau « lignes → cartes » (CSS + React) | Feature | 5 | 5 | ✅ PR #1015 | 2 tranches (1 successeur) | 0 |
| #1008 tableau de saisie | Feature | 5 | 5 | ✅ PR #1017 | 2 tranches (1 successeur) | 0 |
| #1009 wordmark mobile sans pictogramme | Bug (Quick) | 1 | 1 | ✅ PR #1013 | 1 | 0 |
| #1010 carte statique + carte titrée | Feature | 3 | 3 | ✅ PR #1014 | 1 + 1 successeur (défauts vus à l'œil) | 0 |
| #1011 décor festif sans rail | Bug (Quick) | 1 | 1 | ✅ PR #1012 | 1 | 0 |

- **Vélocité : 15 SP livrés / 15 SP au plan validé / 15 SP après l'amont** (aucun re-chiffrage). Tendance : M49 23/23, M50 32/32, M51 15/15 (`velocity.json`).
- **Quality-gate du lot : 1 FAIL puis PASS** — critère 25 (CHANGELOG non touché par le diff du lot, les PR étant mergées en `--skip-changelog`), corrigé par la PR #1018.
- **CI** : 14 passages `visual` (~25-35 min chacun) pour 5 PR + 1 PR CHANGELOG + 1 PR de release ; 4 récoltes de baselines (fondation pour #1005 la veille, composants ×2, data ×2).
- **Release** : DS 2.144.0 + `@msyx-dev/react` 3.0.0-alpha.62 (PR #1019), un seul déploiement préprod.

## ✅ Ce qui a marché
- **Amont parallèle + noms figés** : les specs de #1007 et #1010 en parallèle, puis #1008 bâtie sur les « Noms figés » de #1007 → **0 rework inter-issue**, 0 request_changes. La spec de #1008 a même trouvé un défaut de la spec #1007 (bouton 31 px), corrigé dans le prompt de dev de #1007 avant qu'il ne soit codé.
- **Quick Flow cadré par le parent** pour les deux bugs (#1009, #1011) : « mesure d'abord, ferme si la prémisse est fausse » — les deux prémisses étaient vraies, et #1011 a révélé une cause plus large (vitrine décalée aussi à ≤ 768 px).
- **Preuve par mutation systématique** : 5 specs navigateur, toutes prouvées ; M4 de #1008 restait verte → **fixture renforcée, pas la mutation** (le test ne prouvait rien avant).
- **Ports Playwright dédiés par agent** (config locale non commitée) : 4 agents en parallèle sans collision de `webServer`.
- **#1008 lancé dans le lot 1** dès que son bloqueur était mergé dans la branche d'intégration : une bascule de lot évitée (~1 h).
- **Arbre fusionné identique au hash près** à la tête de la dernière PR → vérification du lot acquise sans rejeu.

## ❌ Ce qui a coincé
- **La CI valide ce que personne n'a regardé** : la section `#card-static` (#1010) passait la CI avec une carte `<section>` mal espacée (règle de vitrine `.main section`) et du code aplati — trouvés **à l'œil** sur les captures, corrigés par un successeur. Le correctif naïf `.main > section` aurait cassé 127 sections du hub (LazyLoader) : l'agent l'a mesuré et protégé.
- **Une PR en conflit n'a AUCUN check** : #1017 a rendu `CI_NO_CHECKS` (~30 s) — GitHub ne lance pas `pull_request` sur une PR en conflit. Il faut recoller AVANT d'attendre.
- **Fusion propre mais fausse** : deux PR portant `EXPECTED_TOTAL` (generate-nav-sections) à la même valeur fusionnent sans conflit, avec un total faux (133 au lieu de 134, puis 134 au lieu de 135). Recalculé à chaque recollement (le `--check` du lint l'aurait attrapé, au prix d'un cycle CI).
- **Conventions qui se contredisent** : la convention de lot DS (`--skip-changelog`, release consolidée) fait échouer le critère 25 du quality-gate ; `/sprint` §4e impose `version-release.sh`, qui ne bumpe que `package.json` alors que `check-versions.sh` en exige 10. Coût : une PR CHANGELOG et un cycle CI de plus ; release faite selon le précédent #995.
- **Coupures de subagent** : 3 tranches rendues en `partial` à ~45-52 tool_uses (prévu, découpage annoncé), dont une avec mutations et docs non faites → successeur.
- **Instabilité VR préexistante** : `composants-segmented-control` change d'une tentative à l'autre sur les thèmes secondaires (#1021).

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | Le réveil CI distingue « PR en conflit » de « aucun workflow » (lire `mergeable` quand `gh pr checks` est vide) | à ouvrir sur claude-config (proposé à Mike) | **Retenue** → écrite en mémoire DS |
| A2 | `/sprint` §4e : release du DS (10 sources + React) — soit `version-release.sh` apprend les sources multiples, soit l'exception DS est déclarée dans les règles | à ouvrir sur claude-config (proposé à Mike) | **Écrite** (mémoire `feedback_ds_versioning_release_pattern`) — répétée depuis plusieurs sprints : à mesurer ou abandonner |
| A3 | Entrées CHANGELOG `[Unreleased]` posées dans la DERNIÈRE PR du lot (au recollement), pas dans une PR à part : critère 25 satisfait sans cycle CI de plus | — | **Écrite** (cette rétro + mémoire) |
| A4 | Regarder chaque nouvelle section en capture CI avant de récolter ses baselines | — | **Écrite** (`feedback-verify-real-render-visual`) — appliquée 5/5 ce sprint, a trouvé 2 défauts |
| A5 | Défauts trouvés en route ticketés : vitrine (#1020), capture instable (#1021), résidus mobile-first (#1022) | #1020 #1021 #1022 | **Écrite** (tickets) |

## Vérification des actions de la rétro précédente (`sprint-m50-fiabilisation-consumers.md`)
- A1 `validate-tree.sh` résout le projet depuis le dépôt (claude-config#537) : ✅ **Done** — joué depuis un worktree nommé `lot1`, projet bien résolu (`design-system-project`), smoke DOM PASS.
- A2 `velocity-compute.sh` sans plafond (claude-config#538) : ✅ **Done** (issue fermée) — 15/15 calculé par le script, cohérent avec le board.
- A3 décor festif figé en VR (#998) : ✅ **Mesurée**, sans régression ce sprint.
- A4 chercher avant d'ouvrir une issue : ✅ appliquée (recherche faite avant #1020-#1022, aucun doublon).
- A5 contraste MSYX bloquant : ✅ **Mesurée** — le job a11y a validé le texte d'erreur sur fond teinté de #1008.
