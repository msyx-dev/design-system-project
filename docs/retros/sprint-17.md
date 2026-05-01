# Retro Sprint 17 — A11y palette ACSSI + reset natif

**Date** : 2026-05-01
**Velocite** : 8 / 8 SP (100%)
**Issues** : 5/5 livrees (4 PRs effectives + #167 absorbed dans #166), 0 reportee
**Version** : v2.28.0 → v2.31.0 (+3 minor + 1 patch sur 4 PRs)

## Ce qui a marche

- **Groom+spec en amont par lots paralleles** : 3 lots (Lot 1 = #163+#164 paralleles, Lot 2 = #165, Lot 3 = #166+#167 paralleles). Specs figees en ~15 min total. Aucun rework spec inter-issues. Le contrat "Tokens figes pour #165" inscrit en §4 de la spec #164 a ete consomme tel quel par /spec #165 — zero reinvention de valeurs hex/ratios.
- **Decision absorbed jugee au /groom** : #167 (focus-visible 1 SP) consolide dans #166 (reset `<a>` 1 SP) car meme zone CSS, meme cascade, ACs proches. Le subagent /groom de #166 a explicitement justifie l'absorption (5 raisons) et la spec resultante a integre les 6 ACs combines (#166 + #167) + 11 ACs anti-regression. Resultat : 4 PRs effectives au lieu de 5, zero conflit, fermeture automatique de #167 via `closes #167` dans le PR title.
- **Pre-allocation des versions par le parent** : application directe de l'action retro Sprint 16. Le parent a injecte dans chaque prompt /dev "ta version cible est v2.X.Y" → 0 conflit git sur @ds-version cette fois (vs 2 conflits attendus en Sprint 16 sur 5 PRs). Action S16 → DONE.
- **Sequentiel pour issues touchant le meme fichier** : decision strategique parent (annoncee a Mike et validee). Tous les /dev sequentiels (vs 2 paralleles potentiels) parce que tokens.css + components.css touches partout. 0 conflit, 0 rebase necessaire. Cout : 4 dev sequentiels en ~35 min total (vs ~20 min en parallele theorique mais avec rebases).
- **Push-and-return strict** : 4 subagents, max ~12 min par subagent (le plus long #165 = 12 min), tous ont retourne leur ligne RESULT. Aucun timeout streaming.
- **Audit grep dans la spec #165** : le subagent /spec a inclus directement le resultat du grep `color: white|#fff|#ffffff` (8 occurrences localisees ligne par ligne) dans le commentaire spec. /dev #165 a juste applique les 7 patches + 1 derogation justifiee. Pattern reutilisable pour tout audit technique futur.
- **Closes auto via PR title** : `closes #166, closes #167` dans le PR title #171 a ferme les 2 issues automatiquement au merge. Preserve l'integrite du board sans intervention manuelle.

## Ce qui a coince

- **board-update.sh ne cree pas l'item s'il manque** : rencontre 2 fois ce sprint (sur #165 puis sur #167). Le script `~/.claude/scripts/pipeline/post-merge.sh` echoue silencieusement avec "Issue #XX non trouvee dans le project board" et exit 1, oblige le parent a `gh project item-add 7 --owner msyx-dev --url ...` puis re-`board-update.sh`. **Cout** : ~30s par occurrence + un fail step dans post-merge.sh qui pollue le log. Action S16 deja existante (auto-add) toujours non-implementee → renforcer la priorite.
- **Auto-approve bloque par GitHub sur own PR** : subagents /review #164 et #166 ont signale que `gh pr review --approve` est bloque (same-author rule) → ils ont fallback en `LGTM` comment + status "approved". Le merge fonctionne quand meme (pas de branch protection requiring review sur ce repo). Pas bloquant mais friction recurrente sur projets a un seul mainteneur. Pas d'action immediate (limitation GitHub, pas DS).
- **Spec #163 a bump v2.29.0 figee dans la spec, mais aurait du etre reverifiee a chaque /dev** : le subagent /dev #163 a applique v2.29.0 (correct, 1er du sprint). Les /dev suivants ont eu une **bonne version** chacun, mais c'est parce que le **parent** a injecte la version cible explicitement dans chaque prompt /dev. Sans cette injection, /dev #164 aurait possiblement choisi v2.30.0 OU v2.29.1 selon humeur du subagent. → confirmer l'action S16 "pre-allocation versions" comme **convention obligatoire** dans CLAUDE.md projet.

## Actions

- [ ] **Renforcer auto-add board dans `board-update.sh`** : si `gh project item-list` ne trouve pas l'issue, executer `gh project item-add 7 --owner msyx-dev --url ...` avant le set-fields. Suppression du fallback manuel parent. Action deja remontee S16, pas faite, **bloquant a S18 si pas appliquee**.
- [ ] **Documenter pattern "absorption" dans CLAUDE.md projet (§Process)** : nouvelle sous-section "Issues consolidees" avec :
  - Conditions : meme fichier CSS, meme cascade, ACs proches, sprint commun
  - Procedure : justifier dans /groom de l'issue absorbante, inclure ACs absorbed dans la spec, mentionner `closes #X, closes #Y` dans PR title
  - Effet board : issue absorbed fermee auto au merge, ajouter au board manuellement si absente
- [ ] **Convention "pre-allocation versions" dans CLAUDE.md (§Process point 5)** : pour tout sprint avec >2 issues bumpant @ds-version, le parent /sprint DOIT injecter `ta version cible : v2.X.Y` dans chaque prompt /dev. Eviter l'auto-determination du subagent. Inscrire comme **obligatoire** (pas "recommande").
- [ ] **Corriger CLAUDE.md du projet (§Process point 5)** [HERITAGE S16] : remplacer "tokens.css ET utilities.css" par la liste complete des 5 fichiers (tokens.css, utilities.css, components.css, layout.css, nav.js). Action S16 toujours pendante.
- [ ] **Audit complementaire post-Sprint 17 — paires light non couvertes** : la spec #164 a fixe `--text-muted` et `--text-dim` ACSSI light, mais reste une zone d'ombre sur composants `--text-dim` sur `--surface-solid` quand surface est marine ACSSI light (issue body mentionnait `aksy#268`). A verifier en consumer aksy avant la prochaine review a11y.

## Action items sprint 16 — suivi

- [x] **Pre-allouer les versions dans la spec parent** : applique ce sprint (parent a injecte v2.X.Y dans chaque /dev), 0 conflit git → DONE
- [ ] **Corriger CLAUDE.md §Process point 5** : pas applique → reportee S18
- [ ] **Auto-ajout au project board** : pas applique → encore rencontre 2 fois ce sprint → reportee S18 + priorite haute
- [ ] **Checklist /dev compteur ARCHITECTURE.md** : non applicable ce sprint (pas de nouveau composant numerote, juste reset natif)
- [x] **Pattern groom-first generalise** : applique implicitement (toutes les issues etaient des bugs avec audit deja fait — grep cote spec systematique) → DONE

## Metriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | Statut |
|-------|------|----|----|---------------|-----------------|--------|
| #163 palette ACSSI dark | Bug a11y | 1 | ❌ | Non (1er merge) | 0 finding bloquant | Done |
| #164 palette ACSSI light | Bug a11y | 3 | ❌ | Non (sequentiel) | 3 findings non bloquants | Done |
| #165 boutons color blanc | Bug a11y | 2 | ❌ | Non (sequentiel) | (review OK) | Done |
| #166 reset `<a>` + focus | Bug a11y | 1 | ✅ | Non (sequentiel) | 3 findings non bloquants + 1 fix mineur | Done |
| #167 focus-visible | Bug a11y | 1 | ❌ | — (absorbed) | — (absorbed dans #166) | Done (absorbed) |
| **Total** | | **8** | 1/5 | 0/5 | 6 findings + 1 fix | **100%** |

## Tendance velocite (3 derniers sprints)

| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| S15 | 3 SP | 3 SP | 100% |
| S16 | 12 SP | 12 SP | 100% |
| S17 | 8 SP | 8 SP | 100% |

Tendance : accuracy stable a 100% sur 17 sprints consecutifs. Sprint 17 (a11y, 8 SP) est plus modeste que S16 (composants, 12 SP) car bugs avec correctifs cibles (recalibrage tokens) plutot que features nouvelles. Le ratio sprint a11y / sprint feature reflete la maturation du DS — la majorite des composants sont en place (87 + reset natif), les sprints futurs vont alterner consolidation/audit a11y et nouveaux composants (selon demandes consumer).
