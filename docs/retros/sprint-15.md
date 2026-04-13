# Retro Sprint 15 — Micro-ajouts AKSYVA + fix sync.sh

**Date** : 2026-04-13
**Velocite** : 3 / 3 SP (100%)
**Issues** : 2/2 livrees, 0 reportee
**Version** : v2.24.4

## Ce qui a marche

- **Parallelisation 2/2** : les 2 issues sans dependance ont ete traitees en parallele, merge sans conflit
- **Quick Flow #149** : 4 micro-ajouts CSS triviaux (1 SP), groom→spec→dev→review enchaine sans friction, PR #150 mergee au premier passage
- **Quick Flow #146** : fix sync.sh avec approche marqueurs `@strip:showcase-start/end` + awk — solution robuste qui remplace 3 sed fragiles, PR #151 mergee au premier passage
- **Sprint leger bien calibre** : 3 SP planifies, 3 SP livres, scope realiste pour des corrections ponctuelles
- **Version bump concurrent gere** : #149 (v2.24.3) merge avant #146 qui a bump correctement en v2.24.4

## Ce qui a coince

- **Subagent #146 premier run timeout** : le premier subagent (full flow groom→spec→dev→review) a timeout apres ~4min30 sans produire de RESULT. La branche creee etait vide (0 commits ahead of main). Relance en Quick Flow reussie
- **Cause probable timeout** : le full flow (groom + spec + dev + review) pour un bug simple de 2 SP est surdimensionne. Le label Quick etait deja present mais le parent n'a pas verifie les labels avant le premier lancement

## Actions

- [ ] Parent sprint : toujours verifier les labels (Quick) et SP AVANT de decider du flow — le premier lancement de #146 aurait du etre Quick Flow directement
- [ ] Investiguer la stabilite des subagents longs (>4min) — le stream idle timeout semble recurrent sur les pipelines a 4 etapes

## Action items sprint 14 — suivi

- [ ] Convention `git pull --ff-only` avant creation branche → applique (le parent fait pull entre chaque lot)
- [ ] Investiguer subagent sans RESULT → reproduit dans ce sprint (#146 timeout), cause identifiee (stream idle timeout sur pipeline long)
- [ ] Nettoyer milestone Sprint 4 des vieilles issues → non traite (hors scope)

## Metriques

| Issue | Type | SP | Statut |
|-------|------|----|--------|
| #149 micro-ajouts AKSYVA | Feature | 1 | Done |
| #146 fix sync.sh --no-showcase | Bug | 2 | Done |
| **Total** | | **3** | **100%** |

## Tendance velocite (3 derniers sprints)

| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| S13 | 10 SP | 10 SP | 100% |
| S14 | 14 SP | 14 SP | 100% |
| S15 | 3 SP | 3 SP | 100% |

Tendance : accuracy stable a 100%. Sprint tres leger (3 SP) — corrections ponctuelles issues d'audits consommateurs.
