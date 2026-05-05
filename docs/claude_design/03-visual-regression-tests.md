# Ticket 03 — Visual Regression tests

> **P0** · Effort S · Risque nul (filet de sécurité) · Sprint 18

## CONTEXT

87 composants × 3 themes × 2 modes = 522 surfaces. Impossible à eyeballer à chaque PR. On installe Playwright + lost-pixel pour des snapshots automatiques. Indispensable AVANT le ticket 04 (token rename) et 07 (iconography) qui touchent à beaucoup de surfaces.

## PROMPT

```
On exécute le ticket 03 — Visual regression.

Plan en 5 lignes avant écriture.

Objectif :
- Installer @playwright/test et lost-pixel.
- Config : capture des 8 pages (index.html, site.html, pages/*.html) sur la matrice complète :
    themes = [msyx, acssi, nhood]
    modes  = [dark, light]
    breakpoints = [375, 1280]
  → 8 pages × 3 × 2 × 2 = 96 snapshots.
- Baseline : commit les snapshots initiaux dans visual-tests/baseline/.
- Script npm "test:visual" + step CI dans .github/workflows/.
- README : section "Visual regression" expliquant comment update une baseline.
- Bump @ds-version 2.32.0 (déjà fait par le ticket 01, sinon 2.33.0).

Garde-fous :
- Lance Playwright en headless avec --reporter=list.
- Le baseline doit être committé (gros mais nécessaire) — si > 50 MB, propose Git LFS.
- Le script doit servir les fichiers via un static server local (npx serve), pas file:// (les fonts ne se chargent pas en file://).
```

## DEFINITION OF DONE

- [ ] `npm run test:visual` passe localement
- [ ] CI Action exécute le test et upload les diffs en artefact en cas d'échec
- [ ] 96 baseline images committées (ou en LFS)
- [ ] README section ajoutée
- [ ] `RELEASES.md` mis à jour

## FICHIERS ATTENDUS

```
package.json                          [edit, scripts + devDeps]
playwright.config.ts                  [new]
visual-tests/spec.ts                  [new]
visual-tests/baseline/*.png           [new — 96 fichiers]
.github/workflows/visual.yml          [new]
.gitignore                            [edit, exclure visual-tests/diffs/]
README.md                             [append section]
RELEASES.md                           [append]
```

## POST-MERGE

- Casse volontairement un token (changer `--accent` à `#ff0000`), lance le test, vérifie qu'il fail. Revert.
