# Roadmap S18 → S23 — Digestion du plan claude-design

> Construite à partir de [`IMPROVEMENT_PLAN.md`](./IMPROVEMENT_PLAN.md) et des 12 tickets `01-*.md` à `12-*.md`, ré-arbitrée selon la vélocité historique mesurée du projet.

## Vélocité historique (source : `docs/retros/velocity.json`)

| Métrique | Valeur |
|---|---|
| Sprints clos | 17 |
| Min | 3 SP (S15) |
| Max | 30 SP (S7) |
| Médiane globale | 11 SP |
| **Médiane 5 derniers (S13→S17)** | **10 SP** |
| **Moyenne 5 derniers** | **9.4 SP** |
| Accuracy | 100% sur les 17 sprints |

→ **Cible Sprint 18+ = 9-11 SP**, marge incluse pour absorber la variance.

## Plan original (claude-design) vs plan retenu

| Aspect | Plan original | Plan retenu | Pourquoi |
|---|---|---|---|
| Nombre de sprints | 4 (S18-S21) | **6 (S18-S23)** | vélocité réelle ~10 SP, pas 8 |
| Ticket 03 (VR) | 96 baselines en S18 | 16 baselines en S18 + extension 96 en S22 | l'install Playwright est l'inconnue → mode minimal d'abord |
| Ticket 07 (iconography) | « 1 sprint » | 1 sprint (avec ticket 06 absorbé) | gros lift, on cap |
| Ticket 12 (noise texture) | Sprint dédié | Absorbé par ticket 11 (S23) | déjà mentionné dans le ticket 12 lui-même |
| Action retro S16+S17 | Absente | Issue dédiée S18 | priorité haute marquée dans memory.md |

## Décomposition sprint-par-sprint

### Sprint 18 — Agent-ready + filets (cible 9 SP)

| Issue | Ticket | SP | Priorité |
|---|---|---|---|
| [#176](https://github.com/msyx-dev/design-system-project/issues/176) SKILL.md + canonical-pages + prompts.md | 01 | 3 | P0 |
| [#177](https://github.com/msyx-dev/design-system-project/issues/177) Visual regression Playwright minimal | 03 réduit | 4 | P0 |
| [#178](https://github.com/msyx-dev/design-system-project/issues/178) Diacritic / copy lint | 02 | 1 | P3 |
| [#179](https://github.com/msyx-dev/design-system-project/issues/179) board-update.sh auto-add | retro | 1 | P1 |

**Pré-allocation versions** (convention décision 2026-05-01) :
- #176 → v2.32.0 (Added)
- #177 → v2.32.1 (Added)
- #178 → v2.32.2 (Fixed)
- #179 → pas de bump (outillage `~/.claude/`)

**⛓️ Ordre de merge contraint** : 176 → 177 → 178. Si on saute une version, `RELEASES.md` devient incohérent avec l'historique git. Worktrees parallèles autorisés ; seul le merge est ordonné. Voir commentaire détaillé sur chaque issue.

**⚠️ #179 hors-repo** : livrable dans `~/.claude/scripts/pipeline/board-update.sh` (repo git autonome), pas dans design-system-project. Label `Quick` posé → skip /groom et /spec. Diff git du repo DS = vide. Quality gate adapté : test manuel sur 2 projets différents. Détails dans le body de l'issue.

### Sprint 19 — Iconographie (cible 11 SP — ticket à risque) — issues créées 2026-05-06

| Issue | Ticket | SP | Priorité |
|---|---|---|---|
| [#184](https://github.com/msyx-dev/design-system-project/issues/184) Iconographie Lucide sprite + tokens + .icon + migration UI | 07 | 10 | P0 |
| [#185](https://github.com/msyx-dev/design-system-project/issues/185) backdrop-filter fallback (absorbé) | 06 | 1 | P2 |

**Pourquoi cap à 11** : risque le plus haut de la roadmap (refactor visuel, 50 glyphes, migration de 18 occurrences emoji UI). Nécessite VR (#177 du S18) en place.

### Sprint 20 — Cleanup tokens + motion (cible 7 SP — buffer prudent) — issues créées 2026-05-06

| Issue | Ticket | SP |
|---|---|---|
| [#186](https://github.com/msyx-dev/design-system-project/issues/186) Token rename (`--border` → `--border-color`, etc.) + codemod + aliases legacy | 04 | 3 |
| [#187](https://github.com/msyx-dev/design-system-project/issues/187) Motion reference page | 05 | 4 |

**Pourquoi 7 SP** : sprint qui suit un gros lift (S19), on respire.

### Sprint 21 — Refactor structurel + typo (cible 9 SP) — issues créées 2026-05-06

| Issue | Ticket | SP |
|---|---|---|
| [#188](https://github.com/msyx-dev/design-system-project/issues/188) Split `components.css` en per-component + barrel + tree-shake guide | 08 | 6 |
| [#189](https://github.com/msyx-dev/design-system-project/issues/189) Type modular scale + pairing rules | 09 | 3 |

### Sprint 22 — Theme system + extension VR (cible 10 SP) — issues créées 2026-05-06

| Issue | Ticket | SP |
|---|---|---|
| [#190](https://github.com/msyx-dev/design-system-project/issues/190) Theme generator (JSON → CSS) | 10 | 6 |
| [#191](https://github.com/msyx-dev/design-system-project/issues/191) Extension VR matrice complète (16 → 96 baselines, 3 thèmes × 2 modes × 2 breakpoints) | dérivé 03 | 4 |

**Pourquoi ce pairing** : le theme generator BESOIN du filet VR complet pour valider la byte-identité des CSS générés.

### Sprint 23 — Brand motif (cible 8 SP — partiellement off-keyboard) — issue créée 2026-05-06

| Issue | Ticket | SP |
|---|---|---|
| [#192](https://github.com/msyx-dev/design-system-project/issues/192) Wordmark + signature spatiale + `--texture-grain` (12 absorbé) | 11 + 12 | 8 |

**Pourquoi partiellement off-keyboard** : nécessite arbitrage Mike sur 4 explorations SVG. Sprint à planifier quand la dispo synchrone est OK.

## Total

- **6 sprints** = ~52 SP
- À 10 SP/sprint, ~5-6 semaines de travail effectif
- À l'issue du S23 : DS pleinement agent-ready, iconographie unifiée, tokens propres, refactor structurel fait, brand identifié.

## Notes d'arbitrage

1. **Milestones GitHub créés (2026-05-06)** : Sprint 18 (#19, closed), Sprint 19 (#20), Sprint 20 (#21), Sprint 21 (#22), Sprint 22 (#23), Sprint 23 (#24). Permet `/sprint <N>` direct depuis session neuve via lecture milestone (vs ancienne convention label-only). Labels `Sprint:N` conservés en complément (filtrage transverse, board #7 sans milestone).
2. **Status board #7** : pas de colonne « Backlog » disponible, on utilise « Todo » pour les issues planifiées non démarrées.
3. **Toutes les issues S19→S23 créées** (2026-05-06) : 9 issues #184-#192 sur le board #7, avec milestones gh + labels Sprint:N + Priority + Size auto-detectés via `board-update.sh --auto-add`. Permet `/sprint <N>` direct depuis session neuve sans étape de création préalable.
   - S19 (11 SP) : #184 + #185
   - S20 (7 SP) : #186 + #187
   - S21 (9 SP) : #188 + #189
   - S22 (10 SP) : #190 + #191
   - S23 (8 SP) : #192
   - **Total roadmap : 45 SP / 6 sprints** (S18 livré + S19-S23 backloggés)
4. **Le contenu des issues S20+ peut être affiné en début de sprint** via `/groom` : le body actuel pointe vers le ticket source `docs/claude_design/0X-*.md` qui contient le plan détaillé, mais la spec /spec finalisera le périmètre exact selon le contexte du moment.
5. **Convention pré-allocation versions** : pour chaque sprint multi-bumps (>2 issues touchant `@ds-version`), le parent /sprint doit injecter `ta version cible : v2.X.Y` dans chaque prompt /dev. Décision 2026-05-01 — formalisée dans `CLAUDE.md` §Process point 5 via #176 mergé Sprint 18.
