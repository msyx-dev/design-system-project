# Rétrospective — milestone #56 « Fiabilisation consumers ⑨ » (2026-10-07)

> Nommage : `sprint-m56-…`, même convention que m50 à m55. Milestone déroulé depuis la session **Tirokado**, sur consigne de Mike (« gère tout depuis cette session »), la session Design System étant hors ligne.

## Périmètre et chiffres
- **Demande** : retours de Mike sur la préprod tirokado v0.15.0 (2026-10-07). Le sapin festif était trop grand sur téléphone, et le contenu large passait dessus sur grand écran. Option A validée, avec Q2 (réserve latérale à partir de 1440 px seulement) et Q3 (sapin ≈ 75 px sous 768 px).
  - #1066, sapin plus petit sous 768 px, avec une source unique `--festive-character-w` (2 SP, Quick, PR #1068).
  - #1067, réserve latérale `--festive-inline-clearance` pour `.page-content--wide` et `.content-grid` à partir de 1440 px (5 SP, 3 tranches, PR #1069).
- **Livré** : 2/2. **Vélocité 7 SP livrés / 7 au plan / 7 après l'amont** (`velocity-compute.sh` : 7/7, précision 100). Tendance : 16 (#53), 16 (#54), 8 (#55), 7 (#56).
- **Lots** : lot 1 (#1066) puis lot 2 (#1067), ce dernier parti de la tête du lot 1 avant sa clôture. Chaque arbre de lot était identique à la tête de sa PR, donc la vérification était acquise par la CI. Quality-gate PASS aux deux bascules (`b702bfa`, `e34fb61`), avec `validate-tree.sh` (runtime et smoke DOM PASS). Aucun churn de VR.
- **Release** : 2.148.0 par l'outil (PR #1070, `e48dc10`, `vtag=no`, aucune prérelease React). La préprod sert la 2.148.0 et `validate-preprod.sh` est vert.
- **Mesures clés** :
  - **#1066** : à 375 px, le sapin passe de 130 × 202,6 à 75 × 120 px, et la réserve basse de 219 à 136,5 px. Rien ne change à partir de 768 px.
  - **#1067** : à 1440 px, le recouvrement de `.page-content--wide` passe de 190,8 à 0 px, et celui de `.content-grid` de 70,8 à 0. L'écart entre le contenu et le sapin vaut 16,0 px à 1440 et à 1600. Rien ne change à 1024, 1280, 1439 et 1920. Mutations M1 à M5 rouges ; 260/260 en `--repeat-each=10`.
- **Tranches de dev** (Sonnet) : #1066 en 1 tranche (28 tool_uses) ; #1067 en 3 tranches (43, 26, 40). **0 sur 4 au-delà de 45.**

## ✅ Ce qui a marché
- **L'amont à contrats figés.** Le groom et la spec de #1066 ont figé `--festive-character-w`, et #1067 l'a lu sans repli. Aucune reprise de spec n'a été nécessaire.
- **Une PR verte du premier coup à chaque fois**, VR comprise.

## ⚠️ Ce qui a coincé
- **Session ancrée sur un autre dépôt.** L'isolation `worktree` du harnais crée un worktree du dépôt de la session (tirokado). Les subagents DS ont donc dû créer leur propre worktree sous `.claude/worktrees/agent-ds-*` et travailler par chemins absolus. Ça a marché sur 4 tranches sur 4, mais c'est un écart au mandat standard. La clôture de #1066 par `post-merge.sh` a été bloquée un temps par le garde « subagent vivant » (worktree du lot 2 actif).
- **Board non passé à Done** par `post-merge.sh` pour #1066 et #1067 (issues bien fermées). Je l'ai réaligné à la main avant la vélocité. Cela s'ajoute aux fragilités d'outillage de #1064.

## Actions
1. Proposition pour claude-config : un mode « dépôt distant » pour `/sprint` (worktree géré par le pipeline pour un dépôt autre que celui de la session), au lieu du bloc d'override écrit à la main. Non appliquée sans Mike.
2. Vérifier pourquoi `post-merge.sh` n'a pas posé Done sur le board du DS (à la récidive).
