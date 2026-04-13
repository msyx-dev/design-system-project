# Retro Sprint 14 — Bugs post-v2.23 + Header démo

**Date** : 2026-04-13
**Vélocité** : 14 / 14 SP (100%)
**Issues** : 5/5 livrées, 0 reportée
**Version** : v2.24.0

## Ce qui a marché

- **Quick Flow efficace** : 4 bugs (SP 2-3) traités en skip groom+spec, tous livrés sans friction
- **Parallélisation** : lots de 2 subagents en parallèle — #135+#134 puis #137+#138 — sans conflit de merge
- **Patterns IntersectionObserver** : #137 et #138 partageaient le même pattern de fix (fallback visibilité immédiate en SPA), appliqué proprement dans 2 fonctions distinctes
- **Full Flow pour #136** : groom → spec → dev → review enchaîné pour l'enhancement, spec produite inline sans blocage
- **post-merge.sh fonctionnel** : 3/5 issues fermées automatiquement par le script (amélioration vs sprints précédents)

## Ce qui a coincé

- **Commit #135 perdu** : le subagent #134 a créé sa branche depuis `22f2bfa` (avant le push direct de #135 sur main). Le squash-merge de la PR #139 a eu pour parent `22f2bfa`, effaçant le commit #135. Détecté et corrigé par cherry-pick, mais perte de temps (~5min)
- **Subagent #134 premier run échoué** : le subagent s'est terminé sans ligne RESULT et sans commit. La branche a été nettoyée et le dev relancé (retry réussi). Cause probable : le subagent s'est perdu dans l'analyse du diff nav.js qui contenait les changements de #135
- **Labels Status non mis à jour** : les issues gardent le label `Status:Ready` même après fermeture — les subagents n'appellent pas `gh issue edit --remove-label`
- **Milestone contenait des vieilles issues** : le milestone "Sprint 4" réutilisé contenait encore les issues #23-#26 de l'ancien sprint 4. Pas bloquant mais polluant

## Actions

- [ ] Convention pipeline : les subagents doivent faire `git pull --ff-only origin main` AVANT de créer leur branche, pour éviter la perte de commits parallèles
- [ ] Investiguer pourquoi le premier subagent #134 s'est terminé sans RESULT (timeout ? confusion contexte ?)
- [ ] Nettoyer le milestone Sprint 4 des vieilles issues #23-#26 (ou les dissocier)

## Action items sprint 13 — suivi

- [ ] Investiguer pourquoi `create-issue.sh` échoue silencieusement → non traité (pas impacté ce sprint)
- [x] DNS fallback → non reproductible ce sprint (API GitHub stable)
- [ ] Vérifier isolation worktree coder → partiellement résolu (subagents ont travaillé en worktree mais #135 a commité sur main directement)

## Métriques

| Issue | Type | SP | Statut |
|-------|------|----|--------|
| #135 NAV_SECTIONS sync | Bug | 2 | Done |
| #134 Carousel overflow | Bug | 2 | Done |
| #137 Risk Matrix SPA | Bug | 3 | Done |
| #138 Usage Meter SPA | Bug | 2 | Done |
| #136 Header démo | Enhancement | 5 | Done |
| **Total** | | **14** | **100%** |

## Tendance vélocité (3 derniers sprints)

| Sprint | Planifié | Livré | Accuracy |
|--------|----------|-------|----------|
| S12 | 23 SP | 23 SP | 100% |
| S13 | 10 SP | 10 SP | 100% |
| S14 | 14 SP | 14 SP | 100% |

Tendance : accuracy stable à 100%. Charge modérée (14 SP) après les gros sprints d'audit.
