# Rétrospective — milestone #53 « Fiabilisation consumers ⑥ » (2026-10-05)

> Nommage : `sprint-m53-…`, même convention que m50 à m52 (numéro de milestone, pas d'itération).

## Périmètre et chiffres
- **Demande** : 3 Bugs ouverts le 2026-10-04 par la session tirokado, à partir des captures de Mike : #1042 (guirlande sur le titre), #1043 (sapin sur la colonne de droite, arbitrage B de Mike déjà rendu) et #1044 (boutons empilés dans `TableCards`). Plan en un lot, validé par Mike (« go préco, enchaîne »), déroulé de nuit en autonomie.
- **Livré** : 3/3 issues, **16 SP** : #1042 (5), #1043 (6), #1044 (5). #1045 est le ticket de traçabilité unique : 7 lignes, dont 6 défauts corrigés et 1 observation.
- **Vélocité** : **16 SP livrés / 8 au plan validé / 11 après l'amont**. L'amont a re-chiffré #1042 de 3 à 5 et #1044 de 2 à 3. Les 5 SP restants viennent de corrections ajoutées par le parent sous forme d'amendements, en application de la consigne « on corrige à la volée » : l'échelle d'empilement et les z-index écrits en dur (#1043 +3), la parité de hauteur des boutons (#1044 +2). `velocity-compute.sh` : 16/16, précision 100. Tendance : 32 (#50), 15 (#51), 24 (#52), 16 (#53).
- **request_changes** : 0 (`retro-collect.sh`). **Quality-gate** du lot : PASS du premier coup, rejoué par le parent sur l'arbre fusionné.
- **Release** : DS 2.145.5, avec la prérelease React de `FestiveDecor`, par l'outil (PR #1049). Un seul déploiement préprod.
- **Tranches de développement** : 10 tranches pour 3 issues (#1042 : 3, #1044 : 3, #1043 : 4), avec 30, 42, 42 · 30, 49, 37 · 44, 49, 48 et 51 tool_uses. **4 sur 10 dépassent le seuil de 45 (40 %) : ALERTE**, voir A2.

## ✅ Ce qui a marché
- **Amont parallèle, puis amendements du parent** : les trois specs ont été postées en 20 minutes environ. Deux défauts trouvés par les specs ont été vérifiés dans le code par le parent avant d'être rattachés aux tickets voisins : l'échelle z-index déclarée deux fois dans le même `:root`, et un bouton bordé 2 px plus haut qu'un bouton plein. Le cas « Enregistrer » + « Retirer » de tirokado n'aurait pas été corrigé sans le second.
- **#1043 t1 lancé sur la base du lot avant le merge de #1042**, avec un cherry-pick identique du port Playwright. Le recollement par le parent a été propre et a fait gagner environ une heure.
- **La mesure a trouvé la cause réelle d'un test instable** (`festive-clearance.spec.ts`, 1 rouge sur 84 sous charge, à l'identique sur la base) : la réserve posée par `:root:has()` manque à la mise en page pendant 38 à plus de 850 ms. Le test attend maintenant la valeur calculée : 126 runs, 0 rouge.
- **Qualification de chaque artefact VR avant la récolte**, par comptage par projet et par section, plus une planche avant/après : 203, 102 et 44 captures, toutes expliquées (thème Noël, cascade sous le pixel de la page `fondation`, sentinelles des thèmes secondaires). Les variantes instables ont été mesurées au pixel avant de choisir une tentative.
- **Arbre du lot identique au hash près** à la tête de la dernière PR : la vérification de lot était acquise, la CI de la PR ayant joué sur l'arbre recollé.
- **Release 100 % outillée**, pour la 3e fois de suite.

## ❌ Ce qui a coincé
- **Mon erreur de recollement** : sur `shared/nav.js`, seul le bloc généré `VERSION_NOTES` était en conflit, et j'ai pris le fichier entier côté lot (`git checkout --theirs`). Les modifications de #1042 dans ce fichier ont disparu. La CI l'a attrapé (`tests/vanilla/festive.test.js`), corrigé en `79836ca`. Au second recollement, j'ai résolu le bloc puis régénéré.
- **VR de #1046 hors délai** : environ 200 captures en écart avec `retries: 2` dépassent les 47 minutes de l'étape. L'artefact partiel était bien là (upload sur annulation, A1 du #52). La passe à `retries: 0` a coûté 2 cycles CI de plus.
- **Le réveil CI a expiré à tort** (`CI_TIMEOUT`) : la borne de `ci-wait-budget.sh` (2669 s) est plus courte que le job `visual` du DS dans le pire cas (47 minutes d'étape, plus l'installation).
- **40 % des tranches au-delà de 45 tool_uses** : ce sont des tranches lourdes en mesures Playwright (4 largeurs × défilement × 3 à 7 mutations). Le classifieur du mode auto a en plus refusé `npm ci` et le lien symbolique `node_modules` dans les worktrees : chaque agent a dû découvrir le contournement (dépendances du dépôt principal, en lecture seule).
- **Le port Playwright était fixé en dur** : 12 faux rouges, et des mesures faites sur le CSS muté d'un voisin, avant la correction `PW_PORT` (#1045, ligne 3).

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | Recollement : un fichier dont seul un bloc AUTO-GENERATED est en conflit ne se résout jamais par un côté entier. On résout les marqueurs, puis on régénère (`node bin/generate-version-notes.js`). Décision de Mike (2026-10-05, « go préco ») : le résolveur dédié ne s'écrit **qu'à la récidive** | — | **Écrite** (cette rétro + mémoire `feedback-recollement-bloc-genere`) ; outillage à la 2e occurrence |
| A2 | Tranches Playwright : ne pas mettre plus de 3 mutations par tranche `e2e`, et fournir dans l'addendum la forme qui marche sans `npm ci` (dépendances du dépôt principal, `PW_PORT` distinct par agent) | — | **Écrite** (addendum DS du parent) |
| A3 | `ci-wait-budget.sh` : plancher par dépôt au moins égal au `timeout-minutes` du job le plus long (55 min pour `visual` du DS). GO de Mike le 2026-10-05 | claude-config#566 | **Mesurée** : plancher structurel lu dans les workflows (DS 3600 s), test hermétique et mutation M2 |
| A4 | `PW_PORT` : chaque agent qui joue Playwright reçoit un port distinct dans son mandat | — | **Mesurée** pour le défaut (port configurable, `EADDRINUSE` visible) ; **Écrite** pour l'attribution des ports |
| A5 | Réserve via `:root:has()` en retard sous charge (#1045, ligne 7) : décider si le décor pose une classe sur `<html>` plutôt que de compter sur `:has()`. Décision de Mike (2026-10-05, « go préco ») : **attendre une observation hors machine de test** avant de changer le mécanisme | — | **Écrite** ; en veille, à rouvrir sur un signalement consommateur |

## Vérification des actions de la rétro précédente (`sprint-m52-fiabilisation-consumers.md`)
- A1 artefact VR sur annulation / passe `retries: 0` : ✅ **Done**. `visual.yml` uploade sur `failure() || cancelled()` depuis 2.145.1. La passe `retries: 0` a resservi sur #1046.
- A2 témoin VR « au-dessus du changement » : ✅ **appliquée**. La cascade de la page `fondation` a été annoncée, puis qualifiée section par section.
- A3 aucun ticket en cours de sprint : ✅ **appliquée**. Un seul ticket de traçabilité, avec 7 lignes et 0 ticket ouvert à côté.
- A4 réveil CI à l'échéance du démarrage réel : ✅ **appliquée**. Borne relue à chaque push, mais elle est trop courte pour la VR du DS, d'où A3 ci-dessus.
- A5 release outillée : ✅ **Done**. Prouvée en 2.145.2 et 2.145.3, appliquée en 2.145.4 et 2.145.5.
