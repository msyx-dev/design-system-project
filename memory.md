# memory.md — design-system-project
# Niveau 3 — État session

## Contexte courant
- Sprint 17 terminé le 2026-05-01 — 5/5 issues closed (4 PRs effectives + #167 absorbed), 8/8 SP, 100% velocity
- Version courante v2.31.0 (4 bumps Sprint 17 : v2.28.0 → v2.29.0 → v2.30.0 → v2.30.1 → v2.31.0)
- 87 composants + 1 nouveau bloc reset natif `<a>` + `:focus-visible` global sur 8 pages thématiques, 3 thèmes (MSYX, ACSSI, Nhood)
- Tous les findings a11y consumer aksy (#262 #263 #264 #267 #268 #269 #271 #303) résolus côté DS
- Auth gate active, design-system.msyx.fr opérationnel

## Prochaine étape
- Déploiement v2.31.0 sur design-system.msyx.fr (Caddy file_server, pas de build)
- Actions retro Sprint 16 toujours pendantes (correctif CLAUDE.md §Process point 5, board-update.sh auto-add)
- Action retro Sprint 17 récurrente : board-update.sh ne crée pas l'item s'il manque — fallback `gh project item-add` requis (rencontré sur #165 et #167)
- Backlog vide — attendre nouvelles demandes consommateurs ou audits aksy/aksyva

## Décisions permanentes
- 2026-03-07 : templates de suivi projet = sections statiques mockées (pas de backend), CSS inline
- 2026-03-19 : migration oneshot → projet prod (design-system-project)
- 2026-03-20 : mise à niveau pipeline agentique (board, labels, backlog, docs, auth gate)
- 2026-03-20 : tokens reference = section dans fondation.html#tokens (pas de page séparée)
- 2026-05-01 : convention @ds-version = bump sur 5 fichiers (tokens.css, utilities.css, components.css, layout.css, nav.js) — confirmée Sprint 16, à corriger dans CLAUDE.md §Process point 5
- 2026-05-01 : token `--text-on-accent` thème-aware (Sprint 17 #163) — figure dans tous les blocs `[data-theme]`. Convention sémantique : couleur de texte garantissant lisibilité sur fond `var(--accent)`. Ne pas confondre avec `--accent-light` (variante décorative).
- 2026-05-01 : reset natif global (Sprint 17 #166+#167) — DS impose désormais styles thème-aware sur `<a>` et `:focus-visible` sans classe. Conséquence : tout consumer hérite automatiquement, plus de duplication CSS côté projets. Cascade garantie sur 11 composants existants à focus custom (`.btn-*`, `.input`, `.accordion-header`, `.dropdown-option`, `.fab`, `.hub-card`, etc.).

## Historique sessions
- 2026-05-01 19:25 — Sprint 16 terminé : 5/5 issues mergées (#153 #154 #155 #156 #157), v2.28.0, 100% velocity, retro + release publiées
- 2026-05-01 22:55 — Sprint 17 terminé : 4 PRs (#168 #169 #170 #171) + #167 absorbed, 8/8 SP, v2.31.0, 100% velocity, fix a11y palette ACSSI dark+light + reset natif `<a>`/`:focus-visible`
