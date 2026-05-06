# memory.md — design-system-project
# Niveau 3 — État session

## Contexte courant
- Sprint 18 terminé le 2026-05-06 — v2.32.2 sur main (déploiement à venir)
- 4/4 issues closed (3 PRs DS #181 #182 #183 + commit hors-repo dans `~/.claude/`), 9/9 SP, 100% velocity (18e sprint consécutif)
- 87 composants + reset natif + **agent-ready** : SKILL.md user-invocable, 6 canonical-pages (login/settings/dashboard-kanban/empty-state/error-404/billing), prompts.md, components-registry.json enrichi (champ `example`)
- **Visual regression Playwright** en CI : 16 baselines msyx dark+light × 8 pages × 1280, workflow `.github/workflows/visual.yml` actif sur PR
- **Diacritic lint** en CI : `shared/check-diacritics.sh` POSIX, 11 patterns, fixture test, étendu dans `.github/workflows/ci.yml` job lint
- **Pipeline board** : `~/.claude/scripts/pipeline/board-update.sh --auto-add <issue-url>` opérationnel, lookup dynamique IDs via GraphQL, mapping Priority + parsing Size depuis body
- Auth gate active, registry.json à jour (deploy_tag deploy-20260501-225840 — sera mis à jour au prochain /deploy)

## Prochaine étape
- **Déploiement v2.32.2 effectué le 2026-05-06 07:19** : prod sur design-system.msyx.fr (deploy_tag `deploy-20260506-071914`), registry.json maj (commit `10c5cfc`), gh release publiée, smoke test HTTP 200 sur site.html / SKILL.md / canonical-pages/login.html (302 → /login attendu via auth gate)
- **Backlog complet S19-S23 créé (2026-05-06)** — 9 issues #184-#192 sur board #7, milestones gh #20-#24 :
  - **S19 (11 SP)** : #184 Iconographie Lucide (10 SP, P1) + #185 backdrop-filter fallback (1 SP, P3, absorbé)
  - **S20 (7 SP)** : #186 Token rename (3 SP, P2) + #187 Motion ref page (4 SP, P2)
  - **S21 (9 SP)** : #188 Split components.css (6 SP, P1) + #189 Type modular scale (3 SP, P2)
  - **S22 (10 SP)** : #190 Theme generator (6 SP, P2) + #191 Extension VR matrice complète 96 baselines (4 SP, P2)
  - **S23 (8 SP, partiellement off-keyboard)** : #192 Brand motif wordmark + signature + texture-grain (8 SP, P1, absorbe ticket 12)
  - **Total backloggé : 45 SP / 5 sprints futurs** — board Status=Todo via `board-update.sh --auto-add` (livrable Sprint 18 #179, fonctionne en live)
  - Permet `/sprint <N>` direct depuis session neuve : milestone gh + issues + Priority + Size déjà configurés.
- Dépendances levées : #177 (VR) MERGED → débloque sprints 19-22 (iconographie, token rename, split components.css, type scale, theme generator) qui ont besoin du filet visual regression

## Décisions sprint 18 (2026-05-06)
- Plan claude-design analysé et challengé sur la base de la vélocité historique (médiane 5 derniers sprints = 8-10 SP)
- Ticket 03 (VR) réduit en S18 : 16 baselines au lieu de 96 — extension matrice complète renvoyée au S22 quand le theme generator nécessitera le filet complet
- Ticket 12 (noise texture) absorbé dans ticket 11 (S23) — déjà mentionné par le ticket source
- Tickets 06 (backdrop fallback) absorbé dans S19 (iconography) car même fichier CSS impacté
- **Pattern "rate-limit recovery"** validé Sprint 18 : reprise idempotente §3d-5 + cron wake-up post-reset quota (01:15 Europe/Berlin). Pendant /review #176, subagent a hit rate limit après `gh pr create` → parent a spawné un subagent successeur /review-only avec contexte (PR num, branche, spec URL) → review livrée + corrections pushées. 0 perte de travail.
- **Pattern "issue hors-repo"** validé Sprint 18 (#179) : tracage sur board fonctionnel, livraison dans repo infra (`~/.claude/`), commit hors-repo, ACs adaptés (pas de bump version DS, pas de PR sur le projet origine), label Quick + body explicite documentant les 6 points de divergence.

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
- 2026-05-06 01:30 — Sprint 18 terminé : 3 PRs DS (#181 #182 #183) + 1 commit hors-repo (`~/.claude/` a74a282), 9/9 SP, v2.32.2, 100% velocity, agent ergonomics (SKILL.md + canonical-pages + prompts.md) + visual regression Playwright + diacritic lint + board-update auto-add. Rate limit Anthropic hit pendant /review #176, mitigation par subagent successeur + cron wake-up à 01:15.
- 2026-05-06 07:19 — Sprint 18 déployé : v2.32.2 en prod sur design-system.msyx.fr (deploy_tag `deploy-20260506-071914`, previous `deploy-20260501-225840`), registry.json maj (commit `10c5cfc`), gh release v2.32.2 publiée, smoke tests HTTP OK.
- 2026-05-06 — Préparation Sprint 19+ : milestones gh créés S19-S23 (#20-#24), issues Sprint 19 créées (#184 iconography 10 SP P1, #185 backdrop fallback 1 SP P3 absorbé), board=Todo, total 11 SP cible roadmap. Convention milestone gh systematique pour faciliter `/sprint <N>` depuis session neuve.
