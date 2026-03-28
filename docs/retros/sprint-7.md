# Retro Sprint 7 — 2026-03-28

## Chiffres
- **Velocite** : 30/30 SP (100%) — sprint le plus charge a ce jour (record)
- **Issues** : 12/12 livrees (12 Features)
- **PRs** : #63-#72 (10 PRs — certains commits directs sur main pour #53, #54)
- **Version** : v2.7.0
- **Composants** : 46 → 57 (+11)

## Ce qui a marche
- **Quick Flow massivement efficace** : 5 issues <= 2 SP (Divider, Rating, Bottom Nav, Number Input, FAB) livrees tres rapidement en skip groom+spec. Le seuil SP <= 2 est confirme comme bon calibrage.
- **Throughput record** : 12 composants en un sprint, 30 SP — la plus grosse charge a ce jour, sans degradation de qualite.
- **Pipeline rodee** : l'enchainement groom-inline → dev → push → PR → merge est fluide. Les composants 3 SP ont ete traites en semi-Quick (groom inline sans analyst formel) grace a la clarte des issues.
- **Theming zero-effort confirme** : 12 composants nouveaux, tous compatibles 3 themes x 2 modes sans aucun fix specifique.
- **Reprise session** : le crash auth mid-sprint (#50) a ete gere proprement — reprise exactement ou on s'etait arrete.

## Ce qui a coince
- **Coder commite sur main** : #53 Bottom Sheet et #54 Lightbox ont ete commites directement sur main par le coder au lieu de la branche feature. Cause : le coder en worktree isole a parfois resolve sur le repo principal sans creer de branche. Contourne manuellement.
- **GitHub API instable** : plusieurs erreurs "error connecting to api.github.com" pendant le sprint. Contourne avec des retries. N'a pas bloque le developpement mais a ralenti les operations board/PR.
- **post-merge.sh toujours casse** : 4e sprint consecutif. Le board est systematiquement mis a jour manuellement via GraphQL.

## Actions
- [ ] Corriger post-merge.sh (dette depuis sprint 4 — 4 sprints consecutifs)
- [ ] Convention branche dans N2 : `feat/NN-description` (sans #, cf sprint 6)
- [ ] Investiguer pourquoi le coder commite parfois sur main au lieu de la branche feature (isolation worktree?)

## Action items sprint 6 — suivi
- [ ] Convention nommage branche sans # → applique de facto (feat/NN-xxx) mais pas documente dans N2
- [ ] Corriger post-merge.sh → toujours ouvert
- [ ] Check compteur footer site.html → corrige manuellement a chaque sprint
- [ ] Lint JS minimal → non traite (pas necessaire, projets statiques)

## Tendance velocite (3 derniers sprints)
| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| S5 | 11 SP | 11 SP | 100% |
| S6 | 20 SP | 20 SP | 100% |
| S7 | 30 SP | 30 SP | 100% |

Tendance : charge en augmentation constante (11 → 20 → 30 SP), accuracy stable a 100%.
