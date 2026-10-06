# Rétrospective — milestone #55 « Fiabilisation consumers ⑧ » (2026-10-06)

> Nommage : `sprint-m55-…`, même convention que m50 à m54 (numéro de milestone, pas d'itération).

## Périmètre et chiffres
- **Demande** : 2 Features ouvertes le 2026-10-05 au soir par la session tirokado, et demandées pour son sprint 13 :
  - #1060, rangée de liste cliquable par son lien, qui bloque tirokado#180 ;
  - #1061, carte de saisie compacte en mode cartes, qui bloque tirokado#191.

  Plan validé par Mike en option B : l'amont (groom et spec) a été fait le 2026-10-06 après-midi, le dev après la remise à zéro du quota hebdomadaire, mesurée à 0 % à 18:03Z.
- **Livré** : 2/2 issues, sans issue ajoutée en cours de route. Le ticket de traçabilité unique est #1064 (label `tracabilite`) : il compte 6 points, dont 2 fragilités d'outillage non corrigées.
- **Vélocité** : **8 SP livrés / non chiffrés au plan validé / 8 après l'amont**. Les deux issues ont été ouvertes sans SP ; l'amont a chiffré #1060 à 3 SP et #1061 à 5 SP.
  - `velocity-compute.sh` (champ Size) : **8/8, précision 100**.
  - Tendance : 24 (#52), 16 (#53), 16 (#54), 8 (#55).
- **request_changes** : **non mesurable**. `retro-collect.sh` ne trouve aucune PR liée : les PR de lot citent « Refs #N », la fermeture venant après la bascule, si bien que GitHub ne les rattache pas à l'issue. La revue est faite par chaque tranche sur son propre diff.
- **Quality-gate** : PASS du premier coup, avec 22 critères mesurés, 0 rouge et 7 sans objet. Le verdict est écrit au SHA du lot `c3487af`.
- **Lot** : un seul, `integration/lot-1` = PR #1062 (#1061) puis PR #1063 (#1060), basculé sur `main` en `c3487af` par `bascule-lot.sh`. L'arbre du lot (`58d25fa`) est identique à la tête de #1063 (`9912b40`) : la vérification de lot était acquise par la CI.
- **Tranches de développement** : 7 tranches pour 2 issues, toutes sur Sonnet.

  | Issue | Tranches | tool_uses |
  |---|---|---|
  | #1060 | code+tests, e2e, docs+pr | 45, 32, 37 |
  | #1061 | code+tests, e2e, React, docs+pr | 51, 38, 41, 44 |

  **1 tranche sur 7 dépasse le seuil de 45 (14 %), donc pas d'alerte.** C'était 40 % au #53 et 39 % au #54. Les deux tranches de mesures navigateur, plafonnées à 1 SP par la décision A2 de Mike, ont fini à 32 et 38.
- **Durée** : environ 2 h 35 entre le lancement du dev (vers 18:20Z) et la bascule du lot (20:56Z). Environ 1 h 45 a été passée à attendre la CI : chaque PR a eu deux cycles de VR d'environ 32 minutes.

## ✅ Ce qui a marché
- **Le découpage A2 tient.** Une seule tranche a dépassé 45 tool_uses. Les deux tranches de mesures (fixture, spec, mutations) ont fini à 32 et 38. Aucune tranche n'a été coupée sur Sonnet. Les 7 RESULT ont été conformes du premier coup : aucune relance de forme, aucun faux rouge de port (4251 et 4252 pour les agents, 4254 pour le parent).
- **Recollement anticipé et une seule récolte VR, sur l'arbre final.** Les deux PR faisaient bouger les mêmes captures de `data.html` (11 sections × 4 projets MSYX), qui n'étaient donc pas disjointes.
  - Dès que les deux PR ont été ouvertes, le parent a fusionné la branche de #1062 dans celle de #1063 : la CI de #1063 a tourné d'emblée sur l'arbre final du lot.
  - Après la fusion de #1062, le recollement de la base n'a changé que les baselines, puisque l'union des deux PR était déjà là. La récolte finale (44 captures) est passée du premier coup.
  - Gain : un cycle de VR, soit 35 à 45 minutes.
- **Le parent a converti en preuves les risques nommés par les tranches, pour peu de chose** : une passe Playwright d'environ 25 s chacune.
  - Pour #1061, T2 doutait que le CA7 compare vraiment les boîtes, puisque ses mutations rougissaient sur la prémisse. Avec `height: 4rem`, le CA7 rougit à 768 px, et le témoin repasse au vert.
  - Pour #1060, aucune mutation jouée n'éprouvait la partie « voisins » du CA2. La mutation (a) rend 12 rouges sur 16, et le témoin passe 16/16.
- **Les tranches ont trouvé ce que la spec ou la tranche précédente avait laissé.**
  - T3 de #1061 a vu que le commentaire proposé par la spec au-dessus de `tableClasses` aurait aveuglé l'étape 4 du scanner React. Elle l'a prouvé par insertion, puis l'a reformulé.
  - T4 a rattrapé une espace perdue par T1 dans une note.
  - t3 de #1060 a corrigé les accents recopiés d'une démo.
- **La cascade lue avant la mesure.** La sonde de t1 n'avait pas confirmé le survol (CA5). Le parent a tranché par la spécificité : (0,2,0) contre (0,1,1). La tranche t2 l'a ensuite mesuré vert avec des coordonnées fraîches. Aucun correctif CSS inutile.
- **Une récolte qualifiée à l'œil** : la démo compacte et la 2e démo de `#lists` ont été regardées sur les captures de la CI avant la récolte. Les hauteurs (2 608 → 3 286 px, 584 → 911 px) sont expliquées, la cascade ne bouge que d'un pixel.

## ❌ Ce qui a coincé
- **#1061 T1 à 51 tool_uses, seule tranche au-delà du seuil.** En plus de son livrable (CSS, démo, registre), elle a écrit un script de mesure et des captures à 5 largeurs. C'est l'annonce du parent qui l'y invitait : « un coup d'œil au rendu à 375 px est bienvenu ». Dans une tranche `code+tests`, un « bienvenu » ajoute une mesure.
- **Le générateur du registre range une classe nouvelle sous le premier fichier qui la cite.** `.list-item-link`, citée par `a:is(…)` dans `_base.css` avant d'être définie dans `lists.css`, est partie sous l'entrée `base`. Elle a été déplacée à la main sous `lists`, comme `.list-item-title`, et l'idempotence a été mesurée par le parent. L'outil n'est pas corrigé : toute classe ajoutée à `a:is()` récidivera.
- **La spec de #1061 portait un piège pour le scanner React.** Ce scanner lit du texte, commentaires compris. Écrite sans le savoir, la spec l'aurait cassé.
- **Le parent est entré deux fois dans un worktree par un `cd` de premier niveau**, après une première fois au #54. Deux mémoires couvrent pourtant ce cas (`feedback-cd-worktree-bloque-spawn-parent`, `feedback-cwd-reset-piege-worktree`). À chaque fois, j'ai corrigé avant tout spawn d'agent, mais la règle reste seulement écrite et elle récidive.
- **`request_changes` est non mesurable** : la convention « Refs #N » des PR de lot rend les PR invisibles à `retro-collect.sh`.
- **`gh issue create --milestone` refuse un milestone fermé.** Or `post-merge.sh` ferme le milestone avec sa dernière issue. Le ticket de traçabilité a dû être rattaché après coup par l'API.

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | Une annonce de tranche `code+tests` ne propose aucune mesure « bienvenue » hors livrable : les mesures navigateur vont dans la tranche `e2e`, plafonnée à 1 SP | — | **Écrite** (mémoire `reference-ds-addendum-mandat-dev`) |
| A2 | Quand deux PR d'un même lot font bouger les mêmes captures, recoller la seconde sur la première dès leur ouverture et ne récolter qu'une fois, sur l'arbre final. Avant le merge, recoller la base : seules les baselines changent, et la récolte finale les écrase | — | **Écrite** (mémoire `reference-vr-soft-harvest-recipe`) |
| A3 | `cd` de premier niveau du parent dans un worktree : 3 occurrences sur deux sprints malgré deux mémoires. Il faut une **mesure** : un hook PreToolUse (Bash) qui refuse à la session parente un `cd` de premier niveau vers `.claude/worktrees/` et rappelle la forme en sous-shell | à ouvrir sur claude-config si Mike le valide | **Retenue → à mesurer** |
| A4 | Deux fragilités de l'outillage du registre, consignées dans #1064 : `generate-registry.js` attribue une classe au premier fichier qui la cite ; l'étape 4 de `extract-react-classes.js` lit du texte, commentaires compris. À corriger à la récidive, ou sur décision | #1064 | **Écrite** |
| A5 | Ticket de traçabilité : le créer **avant** la dernière clôture d'issue, puisque `post-merge.sh` ferme le milestone avec elle | — | **Écrite** (cette rétro) |

## Vérification des actions de la rétro précédente (`sprint-m54-fiabilisation-consumers.md`)
- **A1, faux `CI_NO_CHECKS`** (claude-config#591, livré le 2026-10-06) : ✅ **mesurée**. Le bloc de réveil relu dans `regles.md` §3d-2b compte la grâce depuis `createdAt`. Aucune conclusion prématurée sur les 6 attentes du lot, dont 2 PR créées juste avant l'armement. Il reste à voir la PR de release, fraîche par construction.
- **A2, tranches de mesures à 1 SP au plus** : ✅ **appliquée, mesure favorable**. 1 tranche sur 7 au-delà de 45 (14 %), contre 40 % et 39 %.
- **A3, `--repeat-each=10`** : ✅ **appliquée**. 160/160 pour `list-item-link-1060` et 120/120 pour `table-cards-compact-1061` en tranche. La CI n'a relevé aucune instabilité (VR : 1 026 passés).
- **A4, label `tracabilite`** (claude-config#592, livré le 2026-10-06) : ✅ **appliquée**. #1064 porte le label. Sa ligne `EXEMPT` au journal du spec-gate est encore à constater.
- **A5, addendum en mémoire** : ✅ **appliquée**. Il a été repris pour les Features (`feat(#N)`, `### Ajouté`, `--repeat-each=10`, `timeout 60` sur `gh`). 7 tranches, aucun RESULT non conforme.

## Côté consommateur
- **tirokado** doit resynchroniser le CSS du DS (`shared/sync.sh`) avec la 2.147.0 et passer à `@msyx-dev/react` 3.0.0-alpha.66. Ensuite :
  - **tirokado#180** : `ul.list > li.list-item > a.list-item-title.list-item-link`, suivi du badge. La rangée entière devient la cible, sans composant React à importer (`<Link className="list-item-title list-item-link">`). Un seul lien par rangée, et aucun ancêtre positionné entre le lien et la rangée.
  - **tirokado#191** : `<TableCards editable breakpoint="lg" compact>`. Une cellule de lecture garde son libellé au-dessus de sa valeur, ou passe en `hideLabel` si sa valeur se lit seule. Un libellé de plusieurs mots plus large que 5,5rem passe sur deux lignes : régler `--table-cards-label-w` pour l'éviter.
