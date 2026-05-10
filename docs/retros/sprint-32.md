# Retro Sprint 32 — design-system-project

**Date** : 2026-05-10
**Thème** : Brand identity + polish theming
**Vélocité** : 11/11 SP (100%) — **32e sprint consécutif à 100%**
**Versions livrées** : v2.54.11 → v2.55.0 → v2.56.0

---

## Issues livrées (3 PRs)

| # | Type | Titre | SP | Version | PR |
|---|------|-------|----|---------|----|
| #266 | Feature | Polish .btn-danger/.btn-success/.btn-warning theme-aware (Option C hybride) | 3 | v2.54.11 | [#270](https://github.com/msyx-dev/design-system-project/pull/270) |
| #265 | Feature | Switch toggle dark/light iOS-style (Lucide sprite, WCAG 2.5.5) | 3 | v2.55.0 | [#271](https://github.com/msyx-dev/design-system-project/pull/271) |
| #268 | Bug | Brand identity : wordmark `design-system` header + mark `DS` login + module brand.css | 5 | v2.56.0 | [#272](https://github.com/msyx-dev/design-system-project/pull/272) |

#247 (Logo MSYX vrai SVG) sorti S32 — hotfix PNG (v2.54.10) considéré acceptable durablement comme marque maison-mère discrète.

---

## Ce qui a marché ✅

1. **Arbitrage upfront Mike pour issue brand** (3e application S23 #192 pattern) : pour #268 (sujet créatif/visuel), 1 round AskUserQuestion structurée avec previews ASCII a permis de figer 4 décisions visuelles (sketches header + login, choix module CSS, comportement mobile) sans interruption pendant /dev. Économise un round synchrone. Le subagent /dev a livré conforme sans re-arbitrer.
2. **Clarification user mid-sprint intégrée à chaud** : Mike a précisé la portée de #268 ("MSYX discret OK, mais initiales login + nom complet header") après création initiale → reformulation du périmètre en commentaire GitHub, mise à jour spec, #247 sorti du milestone. 0 friction parent, traçabilité GitHub conservée.
3. **Pré-allocation versions 13e application consécutive S17→S32** : 3 versions séquentielles v2.54.11 / v2.55.0 / v2.56.0 pré-allouées par parent dans les prompts /dev. 0 conflit git sur bumps malgré 3 PRs en // touchant les mêmes 5 fichiers @ds-version + package.json. Pattern toujours efficace.
4. **Anomaly warning explicite injecté dans lot 2** : suite à 2/2 anomalies push/RESULT sur lot 1, le prompt /dev du lot 2 a été enrichi avec un warning explicite des anomalies récentes + vérification `git log origin/<branche>..HEAD` avant sortie. Résultat : #268 (le plus complexe, 120 tool_uses) a respecté push-and-return + RESULT propre. Pattern capit S25 #217+#218 → S31 → S32 → confirmé.

## Ce qui a coincé 🟧

1. **Récidive « subagent oublie git push »** : 2/2 subagents lot 1 (#266 + #265) ont fini code + quality gate PASS mais sont sortis sans `git push` ni `gh pr create`. Mitigation parent : ~5 min/PR pour push + create PR manuel. **3e récidive** (S24 #209 + S25 #218 + S32 #266/#265). Le fix S24 (capit. claude-config#32A "push obligatoire avant RESULT=pushed") doit être plus visible dans le prompt /dev — peut-être hisser en bloc séparé plutôt qu'en bullet point dans la liste de règles.
2. **Rebase chain S31 `--theirs` aveugle écrase modifs cross-PR** : sur S32, 3 PRs touchent `shared/nav.js` (#265 mode-switch, #266 bump version, #268 brand wordmark). Le pattern S31 `--theirs` sur les 7 fichiers a écrasé les changements de #265 (mode-switch perdu) et de #268 (brand wordmark perdu) lors des rebases successifs. Idem pour `shared/css/layout.css` (styles `.mode-switch` perdus) et `shared/components-registry.json` (classes mode-switch supprimées du theme-switcher + entrées brand-* perdues). Mitigation parent : ~15 min merge intelligent fichier par fichier (Edit + checkout selectif depuis main + ré-application des changements). **Le pattern rebase chain S31 doit être durci pour distinguer fichiers de version pure (bump seul → `--theirs` OK) des fichiers logique cross-PR (modifs croisées → merge manuel ou cherry-pick par hunk)**.
3. **Subagent /dev #268 a généré 595 lignes de diff sur `components-registry.json`** au lieu des ~30 lignes attendues. Cause probable : reformatage JSON (indentation, encoding strings). Acceptable (contenu sémantique correct) mais bruyant côté review. Capit possible : ajouter règle dans prompt /dev "préserver le formatage JSON existant du registry, ne modifier que les entrées concernées".
4. **Visual VR a FAIL en CI** (attendu — wordmark + DS + mode-switch mutent 108 baselines). Régénération locale via `pnpm install` + `npm run test:visual:update` (~30 min × 1 worker). Coût acceptable mais pourrait être atomisé via workflow GitHub Action `--update-snapshots` dispatchable. **Action S33** : envisager workflow_dispatch `update-baselines.yml` pour automatiser ce flow récurrent.

## Action items pour Sprint 33

- **AI-32.1** (claude-config) : durcir la rebase chain S31 — la sortie du subagent /dev doit déclarer quels fichiers sont "version pure" vs "logique cross-PR". Le parent applique `--theirs` seulement sur les premiers, `git mergetool` ou cherry-pick sur les seconds.
- **AI-32.2** (claude-config) : hisser le « push obligatoire avant RESULT=pushed » en BLOC dédié dans le prompt /dev (pas un bullet dans la liste de règles). Peut-être ajouter un step explicite : "Avant RESULT, exécuter : `git log origin/<branche>..HEAD --oneline` qui doit être vide".
- **AI-32.3** (claude-config) : ajouter au prompt /dev une règle "préserver le formatage JSON existant (indentation, ordre des clés) lors de modifs sur `components-registry.json` / fichiers de config".
- **AI-32.4** (design-system) : workflow `update-baselines.yml` dispatchable pour automatiser la régénération VR post-sprint.
- **Backlog claude-config** : #29-#32 + AI-31.2 « skip visual VR sur rebase version-bump pure » à traiter avant S33.
- **Notifier consumers** : aksyva#117, acssi-core#523, aksy#456 → resync vers v2.56.0 (mode switch + brand wordmark + tokens fg/shadow).

## Capit / décisions permanentes (à ajouter memory.md N3)

- 2026-05-10 : **Pattern rebase chain S31 limite identifiée** : `--theirs` aveugle sur 7 fichiers fonctionne pour sprints "bump-only" (S31 9 PRs bugfix mineurs) mais écrase les modifs sur fichiers logique cross-PR. Sur S32 (3 PRs touchant tous nav.js + layout.css + registry dans des zones différentes), le `--theirs` a perdu les modifs intermédiaires. Mitigation actuelle : merge manuel parent. Capit à hisser dans claude-config (AI-32.1).
- 2026-05-10 : **Pattern arbitrage upfront étendu aux issues brand textuelles** (pas seulement vectorielles) : pour #268 (wordmark + mark + section docs), Mike a tranché 4 décisions visuelles en 1 round AskUserQuestion avec previews ASCII. Le subagent /dev a livré conforme sans re-arbitrer. 3e application après S23 #192 (wordmark) et S31 #247 (logo SVG).

---

## Bilan

Sprint 32 = 32e sprint consécutif à 100% velocity. 3 versions livrées, brand identity DS restaurée (wordmark + mark DS), boutons sémantiques mieux intégrés aux 3 thèmes, mode-switch UX modernisé. Backlog épuré post-S31 (3 issues post-revue Mike + 1 follow-up brand). Friction parent ~20 min cumulés (5+15) pour 3 PRs — acceptable mais améliorable via AI-32.1 + AI-32.2.
