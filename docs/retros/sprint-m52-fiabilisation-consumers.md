# Rétrospective — milestone #52 « Fiabilisation consumers ⑤ » (2026-10-03)

> Nommage : `sprint-m52-…`, même convention que m50/m51 (numéro de milestone, pas d'itération).

## Périmètre et chiffres
- **Demande** : 4 tickets ouverts du DS (#1016, #1020, #1021, #1022), relayés par la session Claude-config ; plan en 2 lots validé par Mike (« ok préco », relayé). #1016 est l'amont de tirokado#105.
- **Livré** : 5/5 issues, **24 SP** — #1021 (3), #1022 (4), #1020 (3), #1016 (8), #1023 (6). Milestone fermé.
- **Vélocité** : **24 livrés / 0 au plan validé** (4 issues non chiffrées) **/ 16 après l'amont** (3+4+3+6). Les 8 SP d'écart sont **une décision en cours de sprint**, pas une dérive : consigne de Mike « corrige les bugs à la volée et regroupe tout dans un seul ticket » → #1016 +2 (contraste `--subtle`, cible 44 px) et #1023 (6, ticket de traçabilité unique). `velocity-compute.sh` : 24/24, accuracy 100. Tendance : 32/32 (#50), 15/15 (#51), 24/24 (#52).
- **request_changes** : 0 (`retro-collect.sh`). **Quality-gate** : 0 FAIL, PASS du premier coup sur les deux lots (le CHANGELOG `[Unreleased]` posé dans la dernière PR de chaque lot a supprimé le FAIL critère 25 du #51).
- **Release** : DS 2.145.0 + `@msyx-dev/react` 3.0.0-alpha.63 (PR #1032), un seul déploiement préprod.
- **Défauts trouvés et corrigés dans le sprint** (tracés dans #1023) : indicateur du segmented décalé de +3 px (partout, depuis toujours), contraste `--subtle` < 4,5:1 sur 4 combos, cible tactile < 44 px, champ de recherche de `.filter-bar` à 240 px de haut sur mobile, `.progress-tracker--sm` plus grand sur mobile que sur desktop, 23 classes fantômes, 27 `max-width` hors §4 + garde CI.

## ✅ Ce qui a marché
- **Contradiction inter-specs attrapée avant le dev** : la spec de #1016 a mesuré le décalage de 3 px qui aurait fait échouer le garde-fou de #1021 sur toutes les captures ; vérifié par le parent dans le code, rattaché à #1021 par amendement → 0 rework.
- **Preuve d'équivalence par sonde de styles calculés** (#1023) : ~70 propriétés + rectangle, 11 pages + fragments, 15-19 largeurs autour des seuils, base contre branche, bruit établi par auto-comparaison. Elle a trouvé un vrai écart à la 1re passe (`.filter-bar .input` à 174 px au lieu de 487 à 601 px). Résultat confirmé par la VR : 28 réécritures, 0 capture modifiée.
- **Regarder chaque récolte** : 6 planches avant/après/diff ; elles ont permis de distinguer à coup sûr un vrai changement (blocs de code, filter-bar, nouvelle section) d'une cascade inférieure au pixel.
- **Tranches annoncées dès le spawn + successeurs à liste nominative** : #1016 en 5 agents, #1023 en 4, aucun travail perdu ; chaque successeur reprenait sur une liste mesurée (dont le piège « cas 0 compte 5 indicateurs sur toute la page »).
- **Arbre fusionné identique au hash près** à la tête de la dernière PR, sur les deux lots → vérification du lot acquise sans rejeu.
- **Une capture rendue déterministe se prouve** : après #1021, les 3 tentatives CI de `composants-segmented-control` sont identiques à l'octet sur les 12 projets.

## ❌ Ce qui a coincé
- **Trois tickets ouverts en une heure** (#1023 suite mobile-first, #1024, #1025) sur la foi des « tickets de suite » proposés par les subagents de spec. Mike : « arrête de recréer plein de tickets ! Corrige les bugs à la volée et regroupe tout dans un seul juste pour traçabilité ». Corrigé dans l'heure (#1024/#1025 fermées, #1023 = traçabilité unique).
- **Le job `visual` est annulé à 55 min quand ~270 captures divergent** (chaque test en écart rejoué 2 fois) — et une annulation n'uploade **aucun artefact** (`if: failure()`). Contourné par une passe de récolte `retries: 0` temporaire, rétablie dans le commit de récolte : 2 cycles CI de plus pour #1020.
- **Les « témoins à 0 diff » des specs étaient faux** : toute section placée SOUS une section dont la hauteur change bouge d'une fraction de pixel (anticrénelage), donc diffère. 414 captures au lieu des ~260 annoncées pour #1020 ; tout a été vérifié à l'œil, mais la spec annonçait l'inverse.
- **Récoltes qui se recouvrent entre PR d'un même lot** : #1020 et #1016 changent toutes deux la page composants → la récolte de #1020 a dû être refaite sur l'arbre final (après #1030 et #1031), d'où un ordre de merge imposé.
- **Deux réveils CI expirés sans verdict** alors que la CI était verte : échéance calculée au push (la CI démarre plus tard quand 3 PR tournent) et un `sleep 60` ajouté par moi en tête de bloc qui poussait la tranche au-delà de 30 min. Aucun merge à tort (pipeline-merge relit les conclusions), mais du temps perdu.
- **Release DS hors `version-release.sh` pour la 3e fois** (claude-config#543, ouverte).

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | `visual.yml` : uploader l'artefact aussi sur annulation (`if: failure() \|\| cancelled()`), ou prévoir une passe de récolte `retries: 0` déclarée — sans quoi une grosse récolte coûte 2 cycles | à proposer à Mike (pas de ticket ouvert d'office) | **Écrite** (cette rétro + recette soft-harvest) |
| A2 | Specs VR : un « témoin à 0 diff » ne se choisit que sur une autre page ou AU-DESSUS du changement ; sous un changement de hauteur, annoncer la cascade | — | **Écrite** (recette soft-harvest) |
| A3 | Pendant un sprint, aucun ticket par défaut trouvé : correction dans le sprint, un seul ticket de traçabilité | — | **Écrite** (`feedback-fix-inline-dont-ticket`, durcie) |
| A4 | Réveil CI : échéance calculée au démarrage réel du run, pas au push ; aucun `sleep` ajouté en tête du bloc | — | **Écrite** (cette rétro) |
| A5 | Release DS consolidée (10 sources + React) — répétée 3 sprints : à **mesurer** via claude-config#543 ou à déclarer comme exception DS dans `/sprint` | claude-config#543 | **Écrite** — à trancher, ne plus réécrire |

## Vérification des actions de la rétro précédente (`sprint-m51-fiabilisation-consumers.md`)
- A1 réveil CI « PR en conflit » (claude-config#542) : ⏳ **Pending** — non rencontré ce sprint (les recollements ont été faits avant l'attente, conformément à la règle écrite).
- A2 release DS via `version-release.sh` (claude-config#543) : ⏳ **Pending** — reportée en A5, 3e occurrence.
- A3 CHANGELOG dans la dernière PR du lot : ✅ **appliquée 2/2** — quality-gate PASS du premier coup sur les deux lots.
- A4 regarder chaque nouvelle section en capture avant récolte : ✅ **appliquée** — 6 planches, dont celles qui ont qualifié la cascade.
- A5 tickets #1020/#1021/#1022 : ✅ **Done** — livrés dans ce milestone.
