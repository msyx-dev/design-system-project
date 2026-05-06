# Rétrospective Sprint 23 — design-system-project

**Date** : 2026-05-07
**Milestone GH** : Sprint 23 (#24)
**Versions livrées** : v2.40.0 (#172) + v2.40.1 (#173) + v2.40.2 (#175) + v2.41.0 (#174) + v2.42.0 (#192) + commit hors-repo `f8d52d3` (#200)
**Durée** : ~110 min (groom+spec → 4 lots dev+review → CI → merges → bilan), 1 fix CI flaky modal-focus, 2 résolutions conflits @ds-version manuelles

## Résumé exécutif

Sprint 23 = **brand identity + cleanup a11y/DS-EXCEPTION** : wordmark SVG Monogram inspiré du logo historique MSYX (#192 brand motif 8 SP), 4 fixes a11y/DX cleanup (#172 #173 #174 #175), 1 amélioration quality gate cross-projet (#200 hors-repo). 6 PRs (#201 #202 #203 #204 #205 + commit `f8d52d3`), **15/14 SP livrés = 107% velocity** (1er sprint > 100% du projet, ajout #200 hors quota S22 reportée). 23e sprint consécutif réussi.

## Métriques

| Issue | Type | SP | Quick | Conflit merge | Findings review | CI 1st-try | Statut |
|-------|------|----|----|---------------|-----------------|------------|--------|
| #172 ACSSI text-muted dark WCAG AA | bug P1 | 1 | ✅ | Non | 0 | ✅ | Done v2.40.0 |
| #173 header-logo min-height tap target | bug P2 | 1 | ✅ | Oui (sur #172) résolu sed | 0 | ✅ | Done v2.40.1 |
| #175 disabled global rule | Feature P3 | 1 | ✅ | Non | 1 (mode-toggle-btn ajouté `:not()`) | ✅ | Done v2.40.2 |
| #200 quality gate diacritics gate | bug P2 | 1 | ✅ | N/A (hors-repo) | 0 | N/A (cmd `.md`) | Done (claude-config `f8d52d3`) |
| #174 modal focus restore WAI APG | Feature P2 | 3 | ❌ | Non | 1 (orphelin CSS) | ❌ visual fail (test sélecteur cassé par 301 redirect) puis PASS | Done v2.41.0 |
| #192 brand wordmark + signature + texture | Feature P1 | 8 | ❌ | Oui (sur #174) résolu sed+RELEASES.md | 1 (orphelin login-logo-name) + 1 documenté (font SVG via img) | ✅ | Done v2.42.0 |

**Total : 15 / 14 SP — 107% velocity (23e sprint consécutif réussi, 1er > 100%)**

## Vélocité — tendance

| Sprint | Planifié | Livré | Accuracy |
|--------|----------|-------|----------|
| 21     | 9        | 9     | 100%     |
| 22     | 10       | 10    | 100%     |
| 23     | 14       | 15    | 107%     |

Médiane 5 derniers sprints (S19-S23) : **11 SP**. Sprint 23 nettement au-dessus (15 SP). 1er sprint > 100% par ajout opportuniste d'1 Quick hors-quota (S22 action reportée #1 = check-diacritics). Pas de course à la vélocité — rattrapage de dette technique légitime.

## Ce qui a bien marché

- **Arbitrage upfront pour off-keyboard creative** (NOUVEAU pattern) : Mike a tranché les 3 décisions créatives de #192 (Wordmark Monogram / Signature underline / Politique VR auto-approve) en début de session via `AskUserQuestion` structurée (avec previews ASCII pour les options visuelles). Référence visuelle : logo historique MSYX chargé via Read tool image (`/tmp/sprint-23-context/reference-logo-msyx.png`). Résultat : autonomie totale sur 8 SP créatif, 0 interruption synchrone Mike pendant l'exécution. **À hisser comme convention pour tout sprint avec créatif**. Économise les rounds synchrones, livraison plus rapide.
- **Pré-allocation versions explicite — 6e application consécutive** (S17 → S23) : 5 versions cibles injectées dans les prompts /dev (v2.40.0, v2.40.1, v2.40.2, v2.41.0, v2.42.0). Zéro conflit *nouveau* dû à pré-allocation. Pattern stabilisé, prêt à hisser au N1 cross-projet.
- **VR PASS 108/108 sans baseline update sur signature spatiale** : la signature gradient underline 32×2px est sous tolérance Playwright (sub-pixel + faible contraste). 0 baseline mutée. Politique D Mike (auto-approve si cohérent) n'a même pas été déclenchée. Capitaliser : pour signatures spatiales discrètes (≤ 4px + zone < 100px²), pas de baseline update prévisible.
- **Spec #174 → décision technique forte** : « pas de fichier séparé `modal-focus.js` car `sync.sh` ne distribue que CSS, donc helper JS doit vivre dans `components.js` ». Le subagent /spec a tranché en amont, /dev a livré sans question. Pattern : les spécifications techniques contraintes par l'infra existante doivent être figées en /spec.
- **Quick Flow paralléle 2 subagents** : Lots 1 + 2 (#172 #173 #175 #200) ~3.5 min chacun. Specs minimales (Quick), execution rapide. Le pattern 2 lots × 2 parallèles tient la cadence.
- **Pattern « issue Quick hors-repo »** réappliqué propre (#200 4e occurrence après S18 #179) : board ne contient pas, close manuelle + comment GitHub avec ref commit `f8d52d3` claude-config. Pas de bump @ds-version DS, pas de PR sur le projet origine.
- **Réutilisation du pattern aksy** : #174 modal-focus a directement repris le helper aksy `web/assets/js/modal-focus.js` + le pattern de tests E2E (`uc-288-modal-focus-restore.spec.ts`). Cross-pollination DS ↔ projets consumers fonctionne.
- **post-merge.sh fonctionnel S23** : 6 post-merge.sh successifs sans bug NOT_FOUND (vs S20-S22 qui rapportaient le double-prefix). À investiguer S24 — fix latent ou cas dépendant ?

## Ce qui a coincé

- **2 conflits @ds-version sur PRs séquentielles** (PR #202 sur #201, PR #205 sur #204) : la pré-allocation évite les conflits *nouveaux* mais pas les conflits **mécaniques** quand les subagents démarrent simultanément depuis main pre-merge. Friction ~5 min/PR pour résolution manuelle parent (sed sur les 5 fichiers @ds-version + Edit sur RELEASES.md pour empiler les entrées). **Action S24 candidate** : helper `~/.claude/scripts/pipeline/resolve-version-conflicts.sh` automatisé.
- **Test E2E DS flaky par redirect 301 `serve` SPA mode** (#204 1er run CI fail) : `serve` v14 avec `-s` (SPA mode) redirect 301 sur `.html` (clean URL) → SPA fallback `index.html` (page de login auth gate) → sélecteur introuvable. Diagnostic + fix par successeur en 108 tool_uses : `page.route("**/pages/feedback.html", route => route.fulfill({ path: "pages/feedback.html" }))`. **Action** : documenter dans `SKILL.md` au prochain sprint.
- **§2a groom+spec parallèle a duré 4-5 min** chacun (long contenu, spec ~20 KB pour #192). Acceptable pour un sprint avec creative décidé upfront, mais devient un goulot si on multiplie les §2a parallèles. Modèle Opus utilisé pour /spec (ok).
- **Diacritique fix #200 hors-repo n'a pas été utilisé sur les PRs #201-#205** : le commit a été fait pendant le Lot 2 mais le quality gate critère 15 modifie `~/.claude/commands/quality-gate.md` qui n'est pas relu par les subagents en cours. Vrai effet attendu : à partir des prochains sprints. À valider sur S24.

## Actions

### Done (capitalisé)

- ✅ Action S22 #1 — `check-diacritics.sh` au quality gate /dev → **fait via #200** dans claude-config commit `f8d52d3`. Critère 15 BLOQUANT conditionnel (skip si script absent du repo).

### Pending (reportées S24)

- ⏳ **S24 #1 (NOUVELLE)** : helper `~/.claude/scripts/pipeline/resolve-version-conflicts.sh` pour automatiser la résolution mécanique des conflits @ds-version sur PRs séquentielles dans un même lot. Détecte les marqueurs `<<<<<<< HEAD` sur les 5 fichiers `@ds-version`, applique la version cible, valide RELEASES.md (concat ordonnée). À créer comme Quick.
- ⏳ **S24 #2 (NOUVELLE)** : documenter dans `SKILL.md` le pattern `page.route()` pour tests E2E DS qui visitent `/pages/*.html` (interception `serve` SPA mode redirect 301). À créer comme Quick.
- ⏳ Action S22 #2 — Hisser convention « pré-allocation versions » au N1 cross-projet (6e application consécutive S17→S23, pattern stable). Hors-repo (modif `~/.claude/CLAUDE.md`). À créer comme Quick S24.
- ⏳ Action S22 #3 — Bug post-merge.sh préfix repo. **Update S23** : non observé sur 6 post-merge.sh successifs S23. Soit fix latent, soit cas dépendant. À investiguer en lisant le script avant de re-créer une issue.

### Abandoned

- ❌ Aucune.

## Vérification action items précédents (S22)

- ✅ S22 #1 (check-diacritics gate) → Done via #200 S23
- ⏳ S22 #2 (pré-allocation N1) → reporté S24 (toujours pertinent, pattern confirmé S23)
- ⏳ S22 #3 (post-merge.sh préfix) → reporté S24 (à investiguer car non observé S23)

## Leçons à retenir

1. **Pour tout sprint avec creative off-keyboard** : un round AskUserQuestion en début de session avec décisions structurées et previews ASCII permet une autonomie totale d'exécution. Mike décide en lot, pas en streaming. **Validé S23 #192 (8 SP créatif livrés sans interruption synchrone)**.
2. **Pré-allocation versions = condition nécessaire mais pas suffisante** : évite les conflits sémantiques (versions identiques attribuées) mais pas les conflits mécaniques (PRs séquentielles touchent les mêmes lignes `@ds-version`). Helper d'automation à venir.
3. **Tests E2E DS doivent intercepter le redirect 301 `serve`** : `page.route()` côté Playwright avant que `serve -s` ne redirige `.html` en clean URL. Pattern à figer dans SKILL.md.
4. **Velocity > 100% est OK si rattrapage de dette technique** : ajouter du Quick à un sprint en cours (S22 action reportée #1 → S23 #200) est sain. Pas de pression à la vélocité — c'est juste de la dette qui s'éponge.
5. **VR signature spatiale ≤ 4px sub-pixel = pas de baseline update** : tolérance Playwright absorbe. Confirme l'intuition S21 (diffs sub-pixel sur titres absorbés).
