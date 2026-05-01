# Retro Sprint 16 — Composants data-grid + utilities (backlog AKSY #218)

**Date** : 2026-05-01
**Velocite** : 12 / 12 SP (100%)
**Issues** : 5/5 livrees, 0 reportee
**Version** : v2.24.4 → v2.28.0 (+4 minor bumps)

## Ce qui a marche

- **Groom+spec en amont par lots** : pattern AKSY confirme. 3 lots paralleles (2+2+1) groomes/specces en ~12 min total, contrats figes par lot, zero rework spec inter-issues
- **Decouverte par /groom** : 3/5 issues redefinies au grooming :
  - #155 `.text-truncate` → alias de `.truncate` existant + max-width (1 SP)
  - #153 `.sort-icon` → composant DEJA en place (`.data-grid-sortable` + `.data-grid-sort-icon`), spec = doc/demo only (2 SP, 0 CSS fonctionnel)
  - #156 `.btn-*--danger` → 2 variantes deja existantes (`.btn-outline-danger`, `.btn-danger`), seule `.btn-icon--danger` manquait (3 SP au lieu de 5)
- **Phase dev en lots de 2** : Lot A (#155+#153) et Lot B (#156+#154) en parallele, fichiers CSS disjoints (utilities.css vs components.css/sections), conflits triviaux sur version uniquement
- **Subagent rebase post-conflit** : pattern push-and-return + parent qui spawne un rebase isole (worktree) marche bien. 2 fois utilise (PR #159 et #160), ~75-110s par rebase, zero perte de travail
- **Push-and-return strict** : aucun timeout streaming sur les 5 subagents dev+review (max 76s par subagent), tous ont fourni leur ligne RESULT

## Ce qui a coince

- **5 PR bumpent @ds-version aux memes lignes** : conflits git previsibles a chaque merge sequentiel (sauf le 1er). 4 conflits attendus, 2 vraiment apparus (RELEASES.md sur PR #159, RELEASES.md sur PR #160). Cout : ~3 min par rebase. Pas bloquant mais friction recurrente sur les sprints multi-bumps
- **Convention @ds-version pas alignee dans Process ajout composant** : `CLAUDE.md` §Process point 5 dit "tokens.css ET utilities.css" (2 fichiers), mais la convention reelle (decouverte aksy#106 et appliquee depuis) est **5 fichiers** : tokens.css, utilities.css, components.css, layout.css, nav.js. /dev #155 a ete corrige par /review (finding bloquant), les /dev suivants ont applique la regle correcte mais via injection dans le prompt parent — pas via N2
- **Issue #154 absente du project board** : au moment du /groom, l'issue n'etait pas dans le board #7. Ajoutee manuellement par le parent apres detection. Pas bloquant mais le helper `board-update.sh` devrait pouvoir auto-ajouter
- **Compteur composants ARCHITECTURE.md drift** : aucun /dev n'a mis a jour `**86 composants**` → 87. Le compteur de `site.html` etait correctement bump par /dev #154 (filter-bar) mais pas la mention dans `ARCHITECTURE.md`. Detecte par check-docs.sh post-merge, corrige manuellement par le parent

## Actions

- [ ] **Corriger CLAUDE.md du projet (§Process point 5)** : remplacer "tokens.css ET utilities.css" par la liste complete des 5 fichiers (tokens.css, utilities.css, components.css, layout.css, nav.js). Ajouter mention "convention etablie aksy#106"
- [ ] **Pre-allouer les versions dans la spec parent pour sprints multi-bumps** : quand >2 issues bumpent la meme version, le parent /sprint doit injecter dans chaque prompt /dev "ta version cible est 2.X.Y" pour eviter les conflits identiques sur les 5 fichiers CSS
- [ ] **Auto-ajout au project board** : modifier `~/.claude/scripts/pipeline/board-update.sh` pour qu'il auto-ajoute l'issue au board si absente (detecte aujourd'hui par "Issue #XX non trouvee dans le project board")
- [ ] **Checklist /dev — compteur ARCHITECTURE.md** : ajouter dans le prompt /dev pour le projet design-system "si tu ajoutes un composant nouveau, bump le compteur dans `site.html` ET `docs/ARCHITECTURE.md` (ligne 7 `**N composants**`)". Aujourd'hui un seul est bump
- [ ] **Pattern groom-first** generalise : pour les issues "extracted from aksy/extracted from {repo}", /groom doit toujours grep le DS pour verifier si le composant/utility existe deja avant d'estimer (3/5 issues redefinies ici grace a ce reflexe)

## Action items sprint 15 — suivi

- [x] Parent sprint : verifier labels Quick AVANT lancement — applique ce sprint, /spec a propose label Quick a #155 et #153 en se basant sur SP=1/2
- [ ] Investiguer stabilite subagents longs (>4min) — pas reproduit ce sprint (max 76s par subagent dev+review grace a push-and-return). A reporter / fermer car le pattern push-and-return semble avoir resolu le probleme

## Metriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | Statut |
|-------|------|----|----|---------------|-----------------|--------|
| #155 `.text-truncate` | Feature | 1 | ✅ | Non (1er merge) | 1 bloquant (oubli 2 CSS dans bump) | Done |
| #153 `.sort-icon` doc | Feature | 2 | ✅ | Oui (RELEASES.md) | 1 critique (init reset aria-sort) | Done |
| #156 `.btn-icon--danger` | Feature | 3 | ❌ | Non (1er Lot B) | 3 findings (tous PASS) | Done |
| #154 `.filter-bar` | Feature | 3 | ❌ | Oui (RELEASES.md) | 3 findings (INFO/MINEUR) | Done |
| #157 sticky col actions | Feature | 3 | ❌ | Non (seul Lot C) | (review OK) | Done |
| **Total** | | **12** | 2/5 | 2/5 | 8 findings | **100%** |

## Tendance velocite (3 derniers sprints)

| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| S14 | 14 SP | 14 SP | 100% |
| S15 | 3 SP | 3 SP | 100% |
| S16 | 12 SP | 12 SP | 100% |

Tendance : accuracy stable a 100% sur 16 sprints consecutifs. Sprint 16 = retour a un volume normal (12 SP) apres le mini-sprint S15 (3 SP). Le pattern "groom redefinit le scope" fait baisser les SP reels (initialement 5 issues x ~3 SP = 15 SP estimes a la louche, leges 12 SP grace au grooming qui a clarifie 3 issues comme partiellement existantes).
