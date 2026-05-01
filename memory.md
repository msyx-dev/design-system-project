# memory.md — design-system-project
# Niveau 3 — État session

## Contexte courant
- Sprint 16 terminé le 2026-05-01 — 5/5 issues, 12/12 SP, 100% velocity
- Version courante v2.28.0 (4 minor bumps Sprint 16 : v2.24.4 → v2.26.0 → v2.27.0 → v2.28.0)
- 87 composants sur 8 pages thématiques, 3 thèmes (MSYX, ACSSI, Nhood)
- Backlog AKSY #218 entièrement migré (5 issues : #153 #154 #155 #156 #157)
- Auth gate active, design-system.msyx.fr opérationnel

## Prochaine étape
- 5 actions retro Sprint 16 à implémenter (correctif CLAUDE.md §Process point 5, board-update.sh auto-add, etc.)
- Backlog vide — attendre nouvelles demandes consommateurs ou audits aksy/aksyva

## Décisions permanentes
- 2026-03-07 : templates de suivi projet = sections statiques mockées (pas de backend), CSS inline
- 2026-03-19 : migration oneshot → projet prod (design-system-project)
- 2026-03-20 : mise à niveau pipeline agentique (board, labels, backlog, docs, auth gate)
- 2026-03-20 : tokens reference = section dans fondation.html#tokens (pas de page séparée)
- 2026-05-01 : convention @ds-version = bump sur 5 fichiers (tokens.css, utilities.css, components.css, layout.css, nav.js) — confirmée Sprint 16, à corriger dans CLAUDE.md §Process point 5

## Historique sessions
- 2026-05-01 19:25 — Sprint 16 terminé : 5/5 issues mergées (#153 #154 #155 #156 #157), v2.28.0, 100% velocity, retro + release publiées
