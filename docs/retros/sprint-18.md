# Retro Sprint 18 — Agent-ready + filets de sécurité

**Date** : 2026-05-06
**Velocite** : 9 / 9 SP (100%)
**Issues** : 4/4 livrees (3 PRs sur design-system-project + 1 commit hors-repo dans ~/.claude/)
**Version** : v2.31.0 → v2.32.2 (+1 minor + 2 patches sur 3 PRs DS + 1 livrable infra hors-repo)

## Ce qui a marche

- **Groom+spec en amont par lots paralleles** : Lot 1 (#176 + #177 paralleles, 2 worktrees) puis Lot 2 (#178 seul, #179 Quick skip). Specs figees en ~12 min total. Aucun rework spec inter-issues. Les 3 specs ont ete validees au readiness-check sans correction.
- **Pre-allocation versions** confirmee comme convention obligatoire : 3 issues bumpaient @ds-version (v2.32.0 / v2.32.1 / v2.32.2), 0 conflit git sur les 5 fichiers DS. Convention S17 → S18 sans deviation.
- **Issue hors-repo (#179)** : workflow non-standard documente directement dans le body de l'issue (6 points de divergence). Le subagent a respecte la consigne, fait commit + push dans `~/.claude/` (commit a74a282) et ferme l'issue board=Done sans creer de PR sur design-system-project. Pattern reutilisable pour toute issue "infra hors-projet" tracee sur le board fonctionnel mais livree ailleurs.
- **Reprise idempotente apres rate limit** : le subagent /dev #176 a hit le rate limit Anthropic apres 9.9 min (66 tool_uses), juste apres `gh pr create` (PR #181 deja pushee, CI verte) mais avant `/review`. Pattern §3d-5 du /sprint applique : parent a inspecte l'etat (PR ouverte + branche existante + worktree dispo), spawne un subagent successeur **/review-only** avec contexte complet → review livree (verdict APPROVE, 2 corrections mineures appliquees + push). 0 perte de travail.
- **Wake-up programme post-rate-limit** : Mike a demande un cron one-shot a 01:15 (post-reset quota) avec prompt complet de reprise sprint. Tire a 01:15:00 exactement, reprise transparente. Pattern utile pour sprints longs declencheant un rate limit.
- **CI visual + lint en chaine** : la PR #182 (#177 VR Playwright) a installe Node + Playwright + 16 baselines + workflow `.github/workflows/visual.yml`. La PR suivante #183 (#178 lint) a beneficie immediatement du nouveau filet — visual PASS en 1m05s, lint PASS en 4s. Le pipeline CI s'auto-renforce sprint apres sprint.
- **Push-and-return strict** : tous les subagents ont retourne leur ligne RESULT (avec ou sans corrections appliquees), aucun timeout streaming.
- **Test manuel cross-projet pour #179** : le subagent a teste le `--auto-add` sur 2 projets (issue #180 jetable sur design-system → board #7 ; issue #454 sur aksy → board #12). 0 regression sur les modes existants verifiee via `--help`.

## Ce qui a coince

- **Rate limit Anthropic en plein /review #176** : le subagent /dev #176 a tourne 9.9 min puis "You've hit your limit · resets 1:10am (Europe/Berlin)". Pas un bug, c'est une limite de quota utilisateur. Cout : ~3 min pour parent (inspect etat + spawn successeur dedie /review-only). **Mitigation deja en place** : pattern §3d-5 + cron wake-up. **Pas d'action immediate** mais a integrer comme cas standard dans CLAUDE.md /sprint §3d (« Si subagent termine sans RESULT et la PR est ouverte avec CI verte, spawner un /review-only »).
- **Hook `hook-block-merge-with-subagent.py` cote subagent #178** : le subagent /dev #178 a tente `gh pr merge 183` apres /review (probablement variation de prompt /dev qui n'a pas correctement isole le `NE PAS merger`) → hook a bloque (exit 2). Le subagent a remonte le blocage proprement dans son RESULT. Cout : 0 (parent a juste merge derriere). Pas d'action, le hook fait son job.
- **Variance haute #177** : 12.4 min (746 s) pour 4 SP. Install Node + Playwright + first serve local + 16 captures + corriger viewport `Desktop Chrome` (1280×720) qui override le global (1280×800) → recapture des 16 baselines. C'etait l'inconnue principale du sprint, prevue dans le ticket source. Pas d'action — variance acceptable pour un sprint d'install.
- **Issue test jetable #180** : creee pendant le test manuel `--auto-add` du subagent #179 (objectif : verifier le board #7), non fermee automatiquement par le script (le test plan disait `gh issue close <num>`). Le subagent l'a bien fermee mais l'issue traine sur le repo (closed). **Action mineure** : preferer un nettoyage post-test ou un suffixe `[test-jetable]` dans le titre pour filtrer plus tard.

## Actions

- [ ] **Documenter pattern "rate-limit recovery" dans CLAUDE.md /sprint §3d-5** : nouvelle sous-section "Quand le subagent termine sans RESULT mais la PR est ouverte". Procedure : (1) verifier PR ouverte + CI verte ; (2) si oui, spawner subagent successeur **/review-only** avec contexte explicite (PR num, branche, spec URL, "le precedent a hit rate limit") ; (3) au retour STATUS=pushed → parent reprend merge + post-merge.
- [ ] **Cron wake-up systematique pour sprints >5 SP** : si le sprint depasse 5 SP cumules, le parent /sprint propose automatiquement de planifier un cron wake-up sur le reset quota (01:15 Europe/Berlin) avec prompt de reprise. A integrer comme proposition utilisateur dans /sprint §1 ("Plan").
- [ ] **Convention de nommage pour issues test jetables** : prefixe `[test-jetable]` ou suffixe `(throwaway)` dans le titre. board-update.sh ou hook PreToolUse peut filtrer pour eviter qu'elles polluent les listings de retro / board. Detail mineur, rendu visible apres #179.
- [ ] **Audit complementaire post-Sprint 17 (heritage)** : paires light ACSSI non couvertes (`--text-dim` sur `--surface-solid` marine). Toujours pendant. A verifier en consumer aksy lors de la prochaine review a11y. **Reportee S19 ou S20**.
- [ ] **Extension VR baselines 16 → 96** : prevue Sprint 22 (theme generator depend du filet complet). Ne pas anticiper, le ticket source #177 le confirme. **Pas d'action S19**.

## Action items sprint 17 — suivi

- [x] **Renforcer auto-add board dans `board-update.sh`** : DONE via #179 (mode `--auto-add <issue-url>` + lookup dynamique IDs board + mapping Priority + parsing Size depuis body).
- [x] **Documenter pattern "absorption" dans CLAUDE.md projet** : DONE via #176 (`SKILL.md` section workflow contient le pattern).
- [x] **Convention "pre-allocation versions" dans CLAUDE.md (§Process point 5)** : DONE via #176 (CLAUDE.md §Process point 5 corrige avec liste 5 fichiers + pre-allocation explicite).
- [x] **Corriger CLAUDE.md §Process point 5** [HERITAGE S16] : DONE via #176.
- [ ] **Audit complementaire paires light** : reportee S19/S20.

**Bilan suivi S17** : 4/5 actions DONE ce sprint (80%). Le seul item pendant est lie a un consumer externe (aksy), pas un blocage DS.

## Metriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | Statut |
|-------|------|----|----|---------------|-----------------|--------|
| #176 SKILL.md + canonical-pages + prompts.md | Feature DX | 3 | ❌ | Non | 2 corrections mineures (gradient tokens + ARCHITECTURE.md ajout RELEASES) | Done v2.32.0 |
| #177 VR Playwright minimal | Feature DX | 4 | ❌ | Non | 1 finding bloquant fixe (viewport Desktop Chrome override) + recapture 16 PNG | Done v2.32.1 |
| #178 Diacritic/copy lint + CI | Task DX | 1 | ❌ | Non | 3 findings non-bloquants documentes | Done v2.32.2 |
| #179 board-update --auto-add | Task DX (hors-repo) | 1 | ✅ | N-A (pas de PR DS) | 0 (commit hors-repo) | Done dans `~/.claude/` |

**Total : 9 / 9 SP — 100% velocity (18e sprint consecutif)**

## Velocite — tendance 18 sprints

| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| 16     | 12       | 12    | 100%     |
| 17     | 8        | 8     | 100%     |
| 18     | 9        | 9     | 100%     |

Mediane 5 derniers sprints (S14-S18) : **8 SP**. Le sprint S18 est dans la mediane. Vélocité saine, sans surchauffe (S07 a 30 SP reste l'outlier maximum, S15 a 3 SP l'outlier minimum).

## Capitalisation cross-projet

- **Pattern "issue hors-repo" valide** : tracage sur board fonctionnel, livraison dans repo infra (`~/.claude/`), commit hors-repo, ACs adaptes (pas de bump version DS, pas de PR sur le projet origine), label Quick + body explicite. **A documenter dans MEMORY.md global** (ou `~/.claude/CLAUDE.md` si applicable).
- **Pattern "rate-limit recovery"** : reprise idempotente §3d-5 + cron wake-up. **A documenter dans le SKILL /sprint** (deja partiellement present, a renforcer §3d-5).
