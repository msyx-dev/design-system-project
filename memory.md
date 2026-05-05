# memory.md — design-system-project
# Niveau 3 — État session

## Contexte courant
- Sprint 17 déployé le 2026-05-01 — v2.31.0 en prod sur design-system.msyx.fr (Caddy file_server, mode static)
- 5/5 issues closed (4 PRs + #167 absorbed), 8/8 SP, 100% velocity (17e sprint consécutif)
- 87 composants + reset natif `<a>` + `:focus-visible` global sur 8 pages, 3 thèmes (MSYX, ACSSI, Nhood)
- Tous les findings a11y consumer aksy résolus (#262 #263 #264 #267 #268 #269 #271 #303)
- Auth gate active, registry.json à jour (deploy_tag deploy-20260501-225840)

## Prochaine étape
- **Sprint 18 backlog créé (2026-05-05)** — 4 issues sur board #7, cible 9 SP :
  - #176 SKILL.md + canonical-pages + prompts.md (3 SP, P1, v2.32.0) — absorbe doc retro pré-allocation/absorption + CLAUDE.md §Process point 5
  - #177 Visual regression Playwright minimal — msyx × dark+light × 8 pages = 16 baselines (4 SP, P1, v2.32.1)
  - #178 Diacritic / copy lint + CI hook (1 SP, P3, v2.32.2)
  - #179 board-update.sh auto-add (1 SP, P2, outillage `~/.claude/`)
- Roadmap S18→S23 documentée dans `docs/claude_design/ROADMAP.md` — 12 tickets claude-design redécoupés en 6 sprints (vs 4 dans plan original) selon vélocité réelle 9.4 SP/sprint
- Dépendances : #177 (VR) bloque les sprints 19-22 (iconographie, token rename, split components.css, type scale, theme generator)

## ⛓️ Sprint 18 — ordre de merge contraint
Pré-allocation versions (convention 2026-05-01) impose l'ordre de merge :
1. **#176 → v2.32.0** (Added : SKILL.md + canonical-pages + prompts.md)
2. **#177 → v2.32.1** (Added : VR Playwright minimal)
3. **#178 → v2.32.2** (Fixed : diacritic lint)
4. **#179** : pas de bump @ds-version (livrable hors repo design-system-project, dans `~/.claude/scripts/pipeline/board-update.sh`)

Worktrees parallèles autorisés. Seul le **merge** est ordonné. Si une issue est bloquée, les suivantes attendent ou requalifier les versions et l'annoncer ici.

## ⚠️ #179 — workflow non-standard
- Livrable dans repo `~/.claude/` (autonome), PAS dans design-system-project
- Diff git du repo DS = vide ; commit dans `~/.claude/`
- Label `Quick` ajouté → skip /groom et /spec
- Pas de bump @ds-version, pas de PR sur msyx-dev/design-system-project
- Quality gate adapté : test manuel sur 2 projets différents

## Décisions sprint 18 (2026-05-05)
- Plan claude-design analysé et challengé sur la base de la vélocité historique (médiane 5 derniers sprints = 10 SP, pas 8)
- Ticket 03 (VR) réduit en S18 : 16 baselines au lieu de 96 — extension matrice complète renvoyée au S22 quand le theme generator nécessitera le filet complet
- Ticket 12 (noise texture) absorbé dans ticket 11 (S23) — déjà mentionné par le ticket source
- Tickets 06 (backdrop fallback) absorbé dans S19 (iconography) car même fichier CSS impacté

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
- 2026-05-05 — Plan claude-design (`docs/claude_design/`, 12 tickets + IMPROVEMENT_PLAN) analysé et redécoupé. Backlog Sprint 18 créé : 4 issues #176-#179 sur board #7, label `Sprint:18`, Status=Todo, Priority/Size configurés. Roadmap S18→S23 dans `docs/claude_design/ROADMAP.md`.
