# Retro Sprint 13 — ACSSI Light Mode

**Date** : 2026-03-31
**Vélocité** : 10 / 10 SP (100%)
**Issues** : 3/3 livrées, 0 reportée

## Ce qui a marché

- **Pattern clair** : le thème Nhood light existant a servi de template direct pour ACSSI light — pas d'exploration nécessaire
- **Décision design rapide** : Option B (bleu marine comme accent) validée par l'utilisateur sans blocage
- **Audit CSS ciblé** : le coder a identifié 6 corrections précises (couleurs hardcodées) sans sur-ingénierie
- **Pipeline fluide** : groom → spec → dev → merge enchaîné sans blocage sur les 3 issues

## Ce qui a coincé

- **GitHub API instable** : DNS du VPS ne résolvait pas api.github.com — contournement via /etc/hosts. Perte de ~10min
- **Coder commit sur main** : le coder #113 a commité directement sur main au lieu de créer une branche (worktree nettoyé automatiquement). Pas grave mais workflow PR moins propre
- **create-issue.sh silently fails** : le helper script échoue sans message d'erreur. Fallback sur `gh issue create` direct
- **Board update post-merge** : le squash merge ferme l'issue avant que post-merge.sh ne puisse update le board. Fix manuel nécessaire

## Actions

- [ ] Investiguer pourquoi `create-issue.sh` échoue silencieusement (lib.sh ?)
- [ ] Configurer DNS fallback permanent sur le VPS (ex: `/etc/systemd/resolved.conf` avec Google DNS 8.8.8.8)
- [ ] Vérifier si le coder respecte bien l'isolation worktree quand `isolation: worktree` est spécifié

## Métriques

| Issue | Type | SP | Statut |
|-------|------|----|--------|
| #113 | Feature | 3 | Done |
| #114 | Task | 5 | Done |
| #115 | Task | 2 | Done |
| **Total** | | **10** | **100%** |
