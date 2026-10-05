# Rétrospective — milestone #54 « Fiabilisation consumers ⑦ » (2026-10-05)

> Nommage : `sprint-m54-…`, même convention que m50 à m53 (numéro de milestone, pas d'itération).

## Périmètre et chiffres
- **Demande** : 3 Bugs ouverts par la session tirokado à partir de son audit UX : #1050 (contraste des badges et alertes en mode clair), #1051 (champs à 16 px et cibles à 44 px sous pointeur grossier) et #1052 (`TableCards` qui bascule en tableau à 768 px). Plan en un lot validé par Mike (« go plan, option A, enchaîne »). Option A : subagents sur Opus, le quota hebdomadaire Sonnet étant épuisé.
- **Livré** : 3/3 issues, plus #1053, le ticket de traçabilité unique. Il compte 11 points : 10 défauts corrigés et 1 limite assumée sur décision de Mike (point 8, en-tête Noël à 7 contrôles à 320 px, option A).
- **Vélocité** : **20 SP de travail réellement livré / 8 au plan validé / 13 après l'amont**. L'amont a re-chiffré #1050 de 2 à 3, #1051 de 3 à 5 et #1052 de 3 à 5. Le reste vient de la consigne « on corrige à la volée » :
  - #1050 a absorbé `.tag`, `.chip-accent`, `--accent-text-strong` dans 4 combos et 8 autres règles sous AA ;
  - #1051 a absorbé les cibles exclues par sa spec, le débordement de l'en-tête entre 641 et 768 px et la pagination ;
  - #1053 a porté deux PR d'outillage.
  - `velocity-compute.sh` (champ Size) : **16/16, précision 100**. Tendance : 15 (#51), 24 (#52), 16 (#53), 16 (#54).
- **request_changes** : 0 (`retro-collect.sh`). **Quality-gate** : PASS du premier coup sur les deux lots (lot 1 : 23 critères mesurés, 6 sans objet).
- **Lots** : lot 1 = PR #1054, #1055, #1057 et #1056, basculées sur `main` en `a865507`. Lot 2 = PR #1058, qui stabilise un test instable introduit par le lot 1 (`fd03e8d`). Dans les deux cas, l'arbre du lot est identique au hash près à la tête de sa dernière PR : la vérification de lot était acquise par la CI.
- **Release** : DS 2.146.0 et `@msyx-dev/react` 3.0.0-alpha.65 (prop `breakpoint` de `TableCards`), par l'outil (PR #1059).
- **Tranches de développement** : 18 tranches pour 4 issues, avec les tool_uses suivants :

  | Issue | Tranches | tool_uses |
  |---|---|---|
  | #1050 | 4 | 41, 45, 48, 43 |
  | #1051 | 7 | 46, 43, 47, 51, 51, 38, 43 |
  | #1052 | 4 | 46, 36, 31, 37 |
  | #1053 | 3 | 49, 45, 38 |

  **7 sur 18 dépassent le seuil de 45 (39 %) : ALERTE**, pour le deuxième sprint de suite (40 % au #53), voir A2. L'amont a coûté 45, 48 et 48 tool_uses.

## ✅ Ce qui a marché
- **Des « Noms figés » qui tracent les frontières entre issues, fichier par fichier** : #1051 et #1052 se partageaient `tables.css`, #1050 et #1051 se partageaient `badges.css` et `forms.css`. Chaque spec a écrit qui possède quoi (seuil de bascule à #1052, bloc `pointer: coarse` à #1051, couleurs à #1050). Les recollements n'ont touché que des fichiers partagés par construction (`CHANGELOG`, `testMatch`, bac `next`, `nav.js` régénéré), sans un seul conflit de CSS.
- **Mandat de subagent généré dans un fichier** : le §3c intégral, plus l'annonce de tranche, plus l'addendum DS (pas d'`npm ci`, `PW_PORT` distinct par agent, contrôles rapides, vitest absent en local). Sur 18 tranches, il n'y a eu aucun RESULT non conforme, aucune relance de forme et aucun faux rouge de port.
- **Récolte VR avant recollement quand les captures ne se recoupent pas** : #1055 ne faisait bouger que des thèmes secondaires, #1054 que `data.html` en MSYX. La récolte a été faite tout de suite et a épargné un cycle de CI. Chaque artefact a été qualifié à l'œil avant récolte (46, 26 et 8 captures, toutes expliquées).
- **Simulation de l'arbre final avant le merge** (lot + #1057 + #1056) : #1057 rendait bloquant un contrôle du registre, et la simulation a vérifié qu'il passait sur l'arbre combiné, sans attendre de le découvrir en CI.
- **Des causes mesurées, pas supposées** :
  - le registre n'était pas idempotent parce que `base.css` et `components/_base.css` partagent le nom de groupe « base » et que `readdirSync` dépend du checkout ;
  - une classe citée dans un commentaire CSS passait la validation des fantômes ;
  - CA9 mesurait avant le rendu JS de la pagination.
- **Défaut trouvé en regardant la baseline** : la capture `feedback-pagination` en mobile montrait depuis des mois « Prev » et « Next » écrasés et une flèche hors de sa carte. La VR validait le défaut.
- **Reprise après la limite d'usage sans perte** : la session a été coupée entre la PR du lot 2 et sa CI. L'état de reprise tenu à jour dans #1053 a suffi à repartir en un tour (`/reprise`).

## ❌ Ce qui a coincé
- **Le périmètre a plus que doublé** (8 → 20 SP), dont 7 tranches pour #1051 au lieu des 3 prévues. C'est voulu (consigne de Mike), mais le plan validé ne disait presque rien de la durée réelle.
- **39 % des tranches au-delà de 45 tool_uses**, pour le deuxième sprint de suite. Ce sont des tranches lourdes en mesures navigateur (en-tête à 5 largeurs × 2 pointeurs × 2 thèmes, balayages `elementFromPoint`). Aucune n'a été coupée : sur Opus, les 7 dépassements (46 à 51) ont tous rendu un RESULT conforme.
- **Un test instable introduit puis livré** : le cas CA9 de `touch-targets-1051.spec.ts` a été joué une seule fois en local. La CI l'a marqué « flaky » au même arbre que `main`, après la bascule. Il a fallu le lot 2 (une PR, un cycle de CI d'environ 45 minutes).
- **Faux `CI_NO_CHECKS` sur la PR de release** : GitHub a enregistré les runs **105 s** après la création de la PR, contre 3 à 7 s mesurés d'habitude. Le réveil a conclu « aucun check » 5 s avant leur apparition. Il a été réarmé à la main, sans dégât.
- **Le parent est entré une fois dans un worktree par un `cd` de premier niveau** : le harnais a déplacé le répertoire de session. Je l'ai vu et corrigé avant tout spawn (règle déjà en mémoire, `feedback-cd-worktree-bloque-spawn-parent`).
- **Alerte « spec-gate NEVER-RUN » sur le ticket de traçabilité**, qui par construction n'a pas de spec au marqueur : #1045 au #53, #1053 au #54.

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | Réveil CI : `CI_NO_CHECKS` ne conclut pas avant que la PR ait au moins N minutes (mesuré : 105 s sur une PR de release fraîche), ou consulte `gh run list --branch` avant de conclure. GO de Mike le 2026-10-05 | [claude-config#591](https://github.com/msyx-dev/claude-config/issues/591) | **Écrite** (ticket ; mémoire `reference-ci-no-checks-pr-fraiche` en attendant) |
| A2 | Seuil de 45 tool_uses en ALERTE deux sprints de suite (40 %, puis 39 %), sans aucune coupure observée sur Opus. **Décision de Mike (2026-10-05, option a)** : on garde l'alerte et on découpe plus fin. Une tranche de mesures navigateur sur plusieurs largeurs, pointeurs ou thèmes (en-tête, balayages `elementFromPoint`) fait **1 SP au plus**. Raison : Sonnet revient le 6 octobre à 20 h, et c'est sur lui que la coupure vers 50 tool_uses est mesurée | — | **Écrite** (mémoire `reference-ds-addendum-mandat-dev`, section Découpage). À mesurer au prochain sprint : part des tranches au-delà de 45 |
| A3 | Toute nouvelle spec Playwright est jouée `--repeat-each=10` dans la tranche qui l'écrit, avant le push. CA9 aurait été attrapé : le rouge était déterministe dès que le rendu JS prenait du retard | — | **Écrite** (addendum DS, mémoire `reference-ds-addendum-mandat-dev`) |
| A4 | Ticket de traçabilité et spec-gate : exempter par un label dédié `tracabilite`, sur le modèle de l'exemption `Quick` de `spec-gate-bypass-check.sh`. Écarté : poster une fausse spec pour faire taire le détecteur. Récidive 2/2, GO de Mike le 2026-10-05 | [claude-config#592](https://github.com/msyx-dev/claude-config/issues/592) | **Écrite** (ticket) |
| A5 | Addendum DS du mandat de dev : sauvegardé tel quel en mémoire pour le prochain sprint. Au #53, il n'était écrit nulle part, et j'ai dû le réécrire ce sprint | — | **Écrite** (mémoire) |

## Vérification des actions de la rétro précédente (`sprint-m53-fiabilisation-consumers.md`)
- A1 recollement d'un bloc AUTO-GENERATED : ✅ **appliquée**. Trois recollements de `shared/nav.js` (marqueurs résolus, bloc régénéré par `generate-version-notes.js`), aucune modification perdue. Le résolveur dédié reste « à la récidive » (décision de Mike) : aucune récidive.
- A2 3 mutations max par tranche et addendum sans `npm ci` : ✅ **appliquée**. Toutes les tranches ont tenu le plafond (les mutations en trop ont été reportées nommément à la tranche suivante, voir #1052), et l'addendum a été fourni aux 18 tranches. Les tranches dépassent pourtant encore 45 tool_uses (voir A2 ci-dessus).
- A3 plancher de `ci-wait-budget.sh` : ✅ **mesurée**. Borne lue à 3 600 s à chaque armement ; aucun faux `CI_TIMEOUT` sur 10 attentes, dont des VR de 33 à 37 minutes (réarmements `CI_REARM` normaux).
- A4 `PW_PORT` distinct par agent : ✅ **appliquée**. Ports 4251 à 4256 attribués dans les mandats, aucun faux rouge de port.
- A5 réserve par `:root:has()` : ⏳ **en veille**. Aucun signalement de consommateur.

## Après la rétro : déploiement et décisions (2026-10-05)
- **Déploiement préprod réussi, mais outil muet** : la préprod sert 2.146.0, `733d057` (`docker exec` + `/version`), et `validate-preprod.sh design-system` est entièrement vert. En revanche, `coolify-deploy.sh --wait` n'a rien imprimé pendant 25 minutes alors que le déploiement était FINISHED en 2 minutes ; il a été coupé par le `timeout` de l'appelant. Ticket : [claude-config#593](https://github.com/msyx-dev/claude-config/issues/593).
- **Ménage des worktrees (§4g)** : `recover.sh --prune-worktrees` a dépassé deux fois son délai (3 à 4 min par worktree) avant de traiter 10 worktrees. Il en a gardé 8 par prudence (milestone #50 : branches « jamais poussées sous ce nom » ou encore présentes sur `origin`). Pour chacun, le parent a vérifié par le contenu (lignes ajoutées contre `main`) que tout était livré ou réécrit depuis. Les worktrees ont été retirés, **branches conservées**. Il ne reste aucun worktree.
- **Décisions de Mike (« go préco sur les cinq »)** : tickets claude-config#591 (A1), #592 (A4) et #593 (déploiement muet) ; A2 option (a) ; ménage des worktrees du #50.

## Côté consommateur
- **tirokado** doit, pour profiter du sprint, resynchroniser tout le CSS du DS (`sync.sh`) avec la prérelease `@msyx-dev/react` 3.0.0-alpha.65, et poser `breakpoint="lg"` (`.table-cards--lg`) sur ses tableaux de suivi et de participants. Sans cet opt-in, ces tableaux ne changent pas.
