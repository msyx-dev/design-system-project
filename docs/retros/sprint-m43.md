# Retro Sprint M#43 — design-system-project

**Date** : 2026-06-13
**Theme** : Taxonomie & navigation — qualite registre + gouvernance React + sidebar dynamique
**Versions livrees** : v2.67.1 → v2.68.0 → **v2.69.0**
**Issues livrees** : 3/3 (lots P0+P1+P1, worktrees isoles, ordre sequentiel impose par Mike)
**Mode** : worktrees isoles, préprod-only (promotion prod en attente feu vert Mike)

---

## Issues livrees (3 PRs)

| # | Type | Titre | Version | PR |
|---|------|-------|---------|-----|
| #516 | Bug P0 | Registre — 9 classes fantomes + validateur CI | v2.67.1 | [#524](https://github.com/msyx-dev/design-system-project/pull/524) |
| #523 | Task P1 | Gouvernance parite React — champ react + CI + DS-PRINCIPLES §8.1 | v2.68.0 | [#525](https://github.com/msyx-dev/design-system-project/pull/525) |
| #509 | Bug P1 | Sidebar nav.js dynamique — 6 liens morts + 38 orphelines | v2.69.0 | [#526](https://github.com/msyx-dev/design-system-project/pull/526) |

---

## Apprentissages capitalises (M#43)

### AI-M43.1 — CHANGELOG dual-file : alimenter les DEUX fichiers par PR

Ce repo maintient deux fichiers de changelog distincts avec des roles differents :
- **CHANGELOG.md** : convention « CHANGELOG par PR » — section `[Unreleased]` alimentee a chaque PR mergee, sections datees apres la release.
- **RELEASES.md** : archive narrative detaillee par version, destinee aux consumers et operateurs.

**Probleme observe** : au lot 1 (#516 PR #524), seul RELEASES.md a ete mis a jour. CHANGELOG.md n'a eu son entree `[Unreleased]` qu'a posteriori, ce qui a failli bloquer le hook `hook-changelog-on-merge.py` lors de la PR de cloture. Rattrape mais friction inutile.

**Regle** : toute PR fonctionnelle (feature, fix, chore avec impact utilisateur) doit alimenter **les deux fichiers** dans le meme commit. L'ordre canonique est : RELEASES.md (section de la version cible) + CHANGELOG.md (entrée `[Unreleased]`). Le hook `hook-changelog-on-merge.py` bloque si CHANGELOG.md n'a pas ete touche.

### AI-M43.2 — coolify-deploy.sh en attach-mode : verifier le uuid d'app cible

Lors du redeploy préprod post-lot-2 (#525), `coolify-deploy.sh design-system --wait` s'est accroche a un deploiement global en cours d'une **autre** app (`cap-transfo`) dont le statut `FAILED` a ete reporte comme etant celui de design-system. Verdict : fausse alarme, design-system etait en realite `RUNNING`.

**Regle** : le verdict fiable d'un deploiement vient de l'API Coolify ciblee par **uuid d'app** (pas par nom), croisee avec le sha sur `/version.json` de l'app. Ne jamais conclure a un echec uniquement sur la base du statut poll generique sans verifier l'uuid. Bug tooling a remonter dans claude-config (#??? a ouvrir).

### AI-M43.3 — Audit sous-comptage : toujours verifier le terrain avant de figer un chiffre

L'audit adversarial du 2026-06-13 avait annonce **32 sections orphelines** dans la sidebar. Le terrain lors de l'implementation (#509) en a revele **38** : 6 oubliees sur `getting-started.html` et 2 sur `motion.html` n'avaient pas ete incluses dans le perimetre de l'audit.

**Regle** : tout chiffre d'audit (nombre de violations, d'orphelins, de classes fantomes) doit etre re-verifie par un agent terrain (coder/tester) avant d'etre fige dans une spec ou une PR. L'audit fournit une estimation ; le terrain fournit la mesure exacte. Delta typique : 5-20% de sous-comptage si l'audit ne couvre pas 100% des pages.

---

## Ce qui a marche

1. **Ordre sequentiel impose + worktrees isoles** : 3 lots en isolation totale, 0 conflit git entre agents. La pré-allocation versions (v2.67.1 → v2.68.0 → v2.69.0) injectee dans chaque prompt /dev a tenu sans intervention parent.
2. **Validateur CI generate-registry.js --check** : le step lint bloquant introduit en #516 a ete prouve utile immediatement — #523 l'a etendu sans conflit ni regression. Chaine CI robuste desormais (phantoms + parite React).
3. **Sidebar refactor mecanique** : remplacement du tableau statique NAV_SECTIONS (~80 ancres codees en dur) par un manifeste NAV_PAGES + scan DOM runtime. Zero coordination manuelle : toute nouvelle `<section id>` dans les pages HTML apparait automatiquement dans la sidebar. Investissement ponctuel, dividende permanent.

## Ce qui a coince

1. **CHANGELOG.md omis au lot 1** (voir AI-M43.1 ci-dessus) — rattrapé en PR de cloture, mais friction evitable.
2. **coolify-deploy.sh cross-app false alarm** (voir AI-M43.2 ci-dessus) — perte de ~15 min de diagnostic.
3. **Comptage audit sous-estime de 6** (voir AI-M43.3 ci-dessus) — scope corrige en PR sans impact livraison, mais spec inexacte.

---

## Actions sprint suivant (M#44+)

- **AI-M43.1** (claude-config) : renforcer le prompt /dev pour imposer la mise a jour CHANGELOG.md + RELEASES.md dans le meme commit de la PR fonctionnelle — actuellement optionnel, doit etre obligatoire avec check-list explicite.
- **AI-M43.2** (claude-config) : corriger `coolify-deploy.sh` pour cibler le uuid d'app specifique en attach-mode, ne pas se rattacher a un deploiement global.
- **AI-M43.3** (process) : ajouter une etape « verification terrain » dans le template de spec des issues audit : compter les occurrences reelles (grep/DOM) avant de figer le chiffre dans la spec.
- **Backlog M#43 restant** : 9 issues ouvertes (#505 Epic, #506/#507/#508/#510/#511/#512/#513/#514/#515) — a prioriser dans M#44 apres consolidation doublons.
