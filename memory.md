# memory.md — design-system-project
# Niveau 3 — État session

## Contexte courant
- Sprint 17 déployé le 2026-05-01 — v2.31.0 en prod sur design-system.msyx.fr (Caddy file_server, mode static)
- 5/5 issues closed (4 PRs + #167 absorbed), 8/8 SP, 100% velocity (17e sprint consécutif)
- 87 composants + reset natif `<a>` + `:focus-visible` global sur 8 pages, 3 thèmes (MSYX, ACSSI, Nhood)
- Tous les findings a11y consumer aksy résolus (#262 #263 #264 #267 #268 #269 #271 #303)
- Auth gate active, registry.json à jour (deploy_tag deploy-20260501-225840)

## Prochaine étape
- Backlog vide — attendre nouvelles demandes consumers ou audits aksy/aksyva
- Actions retro pendantes (S16+S17) : board-update.sh auto-add (priorité haute), CLAUDE.md §Process point 5
- Action S17 nouvelle : documenter pattern "absorption" + convention "pré-allocation versions" dans CLAUDE.md

## Décisions permanentes
- 2026-03-07 : templates de suivi projet = sections statiques mockées (pas de backend), CSS inline
- 2026-03-19 : migration oneshot → projet prod (design-system-project)
- 2026-03-20 : mise à niveau pipeline agentique (board, labels, backlog, docs, auth gate)
- 2026-03-20 : tokens reference = section dans fondation.html#tokens (pas de page séparée)
- 2026-05-01 : convention @ds-version = bump sur 5 fichiers (tokens.css, utilities.css, components.css, layout.css, nav.js) — confirmée Sprint 16, à corriger dans CLAUDE.md §Process point 5
- 2026-05-01 : token `--text-on-accent` thème-aware (Sprint 17 #163) — figure dans tous les blocs `[data-theme]`. Convention sémantique : couleur de texte garantissant lisibilité sur fond `var(--accent)`. Ne pas confondre avec `--accent-light` (variante décorative).
- 2026-05-01 : reset natif global (Sprint 17 #166+#167) — DS impose désormais styles thème-aware sur `<a>` et `:focus-visible` sans classe. Conséquence : tout consumer hérite automatiquement, plus de duplication CSS côté projets. Cascade garantie sur 11 composants existants à focus custom (`.btn-*`, `.input`, `.accordion-header`, `.dropdown-option`, `.fab`, `.hub-card`, etc.).
- 2026-05-01 : pré-allocation des versions par le parent /sprint pour sprints multi-bumps (>2 issues touchant @ds-version) — parent injecte `ta version cible : v2.X.Y` dans chaque prompt /dev. Validé Sprint 17 (0 conflit git vs 2 attendus en S16). Convention obligatoire pour CLAUDE.md.
- 2026-05-01 : pattern "absorption d'issue" (Sprint 17 #167 absorbed par #166) — conditions : même fichier CSS, même cascade, ACs proches, sprint commun. Procédure : justifier dans /groom de l'issue absorbante, inclure ACs absorbed dans la spec, mentionner `closes #X, closes #Y` dans PR title pour fermeture auto.

## Historique sessions
- 2026-05-01 19:25 — Sprint 16 terminé : 5/5 issues mergées (#153 #154 #155 #156 #157), v2.28.0, 100% velocity, retro + release publiées
- 2026-05-01 22:55 — Sprint 17 terminé : 4 PRs (#168 #169 #170 #171) + #167 absorbed, 8/8 SP, v2.31.0, 100% velocity, fix a11y palette ACSSI dark+light + reset natif `<a>`/`:focus-visible`
- 2026-05-01 23:00 — Sprint 17 déployé : v2.31.0 en prod sur design-system.msyx.fr, registry.json maj (deploy_tag deploy-20260501-225840), gh release publiée, smoke test HTTP 200 sur site.html + tokens.css + components.css
