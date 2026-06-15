# Retro Sprint M#43 (tranche registre & doc) — design-system-project

**Date** : 2026-06-14
**Theme** : Cohérence taxonomie & navigation — axe registre & documentation (P0+P1)
**Versions livrees** : v2.73.0 → **v2.74.0** (release consolidée de sprint)
**Issues livrees** : 4/4 — #506, #507, #508, #511 (Epic #505)
**Velocite** : 9/9 SP (100%)
**Mode** : worktrees isolés, workers Sonnet, push-and-return ; parent orchestre groom+spec en amont puis watch CI + merge + post-merge

> 2e tranche du milestone M#43. La 1re tranche (#516/#523/#509) est dans `sprint-m43.md`. Lot churn-VR (#510/#512/#513/#514) reporté pour payer le churn visual-regression une seule fois (demande du challenge taxonomie).

---

## Issues livrees (5 PRs)

| # | Prio | Titre | PR |
|---|------|-------|-----|
| #506 | P0 | Registre — champ `module[]` (pont page↔module) auto-dérivé | [#546](https://github.com/msyx-dev/design-system-project/pull/546) |
| #507 | P0 | Doc — core preset 9 modules réels + gzip recalculés | [#545](https://github.com/msyx-dev/design-system-project/pull/545) |
| #508 | P1 | Registre — 10 entrées composants + compteurs 78→88 | [#547](https://github.com/msyx-dev/design-system-project/pull/547) |
| #511 | P1 | Règle frontière page↔registre + check CI bidirectionnel | [#548](https://github.com/msyx-dev/design-system-project/pull/548) |
| release | — | Bump synchrone 8 sources → v2.74.0 | [#549](https://github.com/msyx-dev/design-system-project/pull/549) |

---

## Ce qui a marché

- **Groom+spec en amont par le parent** : le contrat #506 (champ `module` = `string[]`, dérivé auto, jamais saisi à la main) a été figé AVANT le dev de #508, qui l'a consommé sans rework. 0 incohérence inter-issue.
- **Sérialisation assumée du couplage registre** : #506/#508/#511 partagent `generate-registry.js` et/ou `components-registry.json` → 3 lots séquentiels (#506→#508→#511), #507 indépendant en parallèle de #506. 0 conflit git.
- **Versioning Option B** (voir AI ci-dessous) : 0 conflit version malgré 4 PR touchant le même domaine.
- **Vérification systématique de l'état réel au HEAD** : a évité de re-corriger des points déjà résolus (#507).

## Apprentissages capitalisés

### AI-M43rd.1 — Versioning DS : release consolidée par le parent (Option B)
Deux garde-fous imposent une stratégie spécifique :
1. `shared/check-versions.sh` (CI) exige **8 sources de version strictement identiques** (4 CSS `@ds-version` + nav.js ×2 + registry + package.json). `version-release.sh` seul ne bumpe QUE package.json → **inadapté ici** (casserait check-versions).
2. `hook-changelog-on-merge.py` exige une entrée `CHANGELOG.md [Unreleased]` par PR (ou `[skip-changelog]`).

**Stratégie validée (0 conflit)** : les `/dev` ne touchent AUCUNE des 8 sources ni RELEASES.md (tout reste figé → check-versions vert trivialement, parallélisation possible). Le **parent fait UN commit de release** en fin de sprint (worktree dédié) : bump synchrone des 8 sources + datation CHANGELOG + bloc RELEASES + footer site.html. PR mergées en cours de sprint via entrée CHANGELOG par PR (#508/#511) ou `[skip-changelog]` quand la PR est déjà verte et que re-trigger `visual` (~15 min) serait gaspillé (#506/#507). → mémoire CC `feedback-ds-versioning-release-pattern`.

### AI-M43rd.2 — L'audit `docs/audit-2026-06-13.md` est partiellement obsolète depuis v2.73.0
#507 a révélé que `navigation.css` était déjà dans le core preset (ajouté #542) — la crainte de l'audit était caduque. **Toujours faire vérifier l'état réel au HEAD par le groom**, ne pas spécifier d'après l'audit seul. Injecté dans les prompts groom du sprint → a bien protégé #508 et #511.

### AI-M43rd.3 — `post-merge.sh` échoue le board update #7 à chaque merge
WARN systématique « board update echoue pour #N sur board design-system (#7) » alors que `board-update.sh <repo> <num> Done` en direct fonctionne. Contourné manuellement après chaque merge. **À hisser claude-config** (bug dans l'appel board interne de post-merge.sh).

### AI-M43rd.4 — CI sans path-filter → poll plutôt que `--watch`
Aucun workflow n'a de `paths:` → tout push relance la suite complète dont `visual` (Playwright, ~15 min, plus si runners saturés par 2 PR). `gh pr checks --watch` a timeout à 600s sans verdict → utiliser un poll en boucle (`gh pr checks` toutes les 20s, sortie dès `pending=0`).

## Vérification action items retro précédente (sprint-m43.md)

- **AI-M43.1 (CHANGELOG dual-file)** : ✅ appliqué. #508 et #511 ont leur entrée `[Unreleased]` dans la PR ; #506/#507 consolidés à la release. Pas de blocage hook surprise (les merges skip-changelog étaient assumés et justifiés).

## Dette / suivi

- **Frontière strict** : 49 violations name/id résiduelles (entrée registre vs `<section id>` divergents) — `--frontier-strict` reste opt-in. Candidat à une issue de résorption.
- **`pie-donut`** : section data sans entrée registre dédiée (hors scope #508) — chip de suivi créé.
- **Lot churn-VR M#43** : #510/#512/#513/#514 à faire groupés (1 churn VR + 1 release).
- **`version.json`** racine figé à 2.57.1 (hors 8 sources, mécanisme entrypoint préprod) — dette cosmétique non traitée.
