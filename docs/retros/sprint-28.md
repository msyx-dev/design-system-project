# Rétrospective Sprint 28 — design-system-project

**Période** : 2026-05-08 (sprint après-midi/soir, ~2h end-to-end avec friction)
**Milestone** : [Sprint 28 #29](https://github.com/msyx-dev/design-system-project/milestone/29) — CLOSED
**Vélocité** : **3 / 3 SP livrés (100%)** — 28e sprint consécutif

## Issues livrées

| # | PR | Titre | SP | Version | Durée |
|---|---|---|---|---|---|
| #229 | [#231](https://github.com/msyx-dev/design-system-project/pull/231) | Fix `components-registry.json` reset-natif cssClasses null | 1 | v2.48.1 (registry only, no `@ds-version` bump) | dev+review ~5min |
| #230 | [#232](https://github.com/msyx-dev/design-system-project/pull/232) | Promotions DS — .card-link + .badge-nav + .toast-message | 2 | v2.49.0 (`@ds-version` bump) | dev+review ~7min |

## Périmètre fonctionnel

- **Fix registre (#229)** : entrée `reset-natif` dans `shared/components-registry.json` avait `cssClasses: null`, causant un `TypeError` Python dans `shared/check-components.sh`. Fix triple :
  1. `cssClasses: null` → `cssClasses: []` (sémantique correcte : composant agissant sur sélecteurs natifs sans classe explicite)
  2. `check-components.sh` durcissement defensive : `c.get('cssClasses') or []` + `isinstance(...,list)` check (anti-régression future)
  3. Bump `version` registry 2.48.0 → 2.48.1 (changement interne, **pas** de bump `@ds-version`)
- **Promotions DS (#230)** : 3 classes consumer migrées vers le DS (closing dette S27 #227) :
  - `.card-link` → `shared/css/components/cards.css` + démo `pages/composants.html` section cards (wrapper a11y, focus-visible géré, hover sur card enfant)
  - `.badge-nav` → `shared/css/components/badges.css` + démo `pages/composants.html` section badges (variante compacte sidebar/nav, margin-left auto)
  - `.toast-message` → `shared/css/components/alerts.css` + 4 exemples toast `pages/feedback.html` migrés vers `<span class="toast-message">` (wrapper flex-grow texte)
- **Bump `@ds-version` v2.48.0 → v2.49.0** sur 5 fichiers (`tokens.css`, `utilities.css`, `components.css`, `layout.css`, `nav.js`) + bump registry `version`.
- **Rejet documenté** : `.input-filter-project` (aksyva) — `max-width: 220px;` seul, project-specific. Décision tranchée en preparation S28, mémorisée dans `memory.md`.

## Ce qui a marché

- **Pré-audit parent intégré au scoping** : avant de créer les issues S28, le parent a fait un mini-audit des 4 classes candidates en lisant le code consumer. Verdict immédiat (3 promote, 1 reject) → issue #230 créée avec scope précis et décisions tranchées dans la spec. Le subagent /dev a livré sans aller-retour. Économie : pas de groom long et de risque de spec floue.
- **Parallélisme dev+review** : #229 et #230 spawnés en // (fichiers indépendants : registre vs CSS modules). Les 2 ont retourné `STATUS=pushed` proprement.
- **Specs précises avec décisions tranchées** : pour #230, la spec a tranché `badge-nav` → `badges.css` (pas `navigation.css`), structure HTML, hors-scope explicite (pas de site.html, pas de nav.css). Le subagent /dev a livré 14 fichiers dans une seule passe.
- **Quality gate (review) a attrapé un bug latent** : sur PR #232, le reviewer a détecté `i-inbox` absent du sprite SVG → aurait rendu une icône vide dans la démo `.badge-nav`. Corrigé en commit de fix avant approbation. Le filet review fonctionne.

## Ce qui a coincé

- **Hook anti-merge faux positif inter-projet (récidive)** : le hook `hook-block-merge-with-subagent.py` a bloqué les 2 merges parce qu'un `devops-deployer` tournait sur **aksyva-project** (autre projet, hors scope DS). Faux positif documenté → résolution attendue via [`claude-config#29`](https://github.com/msyx-dev/claude-config/issues/29) (P1, en backlog Klaude). **Mitigation** : attente naturelle de la fin du devops-deployer aksyva, puis le hook a laissé passer (PID 678365 mort, filtre orphelins activé).
- **Conflit RELEASES.md + components-registry.json entre #231 et #232** : les 2 PRs touchent ces fichiers. #231 mergé en premier → #232 `CONFLICTING`. Résolution manuelle parent (~5 min) :
  - RELEASES.md : conserver les 2 entrées (v2.49.0 puis v2.48.1) en concat ordonnée
  - components-registry.json : conserver `version: 2.49.0` (la plus récente, qui contient les 3 ajouts + fix `reset-natif` cssClasses=[] de #231 mergé via auto-merge)
  - Friction : ~10 min cumulés entre 2 attentes hook + résolution conflit
- **Worktree subagent locked après retour** : la branche `feat/#230-...` était lockée par le worktree subagent retourné. Workaround : aller faire la résolution conflit DANS le worktree subagent (qui existait encore sur le filesystem) puis push depuis là. Ça marche mais c'est hacky — preferer un pattern plus clean en S29.

## Métriques

- **Vélocité 28 sprints** : 100% sur 27/28 sprints (S23 = 107% bonus). Cumul livré = 271 SP.
- **PR cycles** : #231 dev+review+CI = ~5 min (fix trivial). #232 dev+review+CI = ~7 min + 5 min résolution conflit + CI re-run 4 min = 16 min total.
- **Friction technique** : ~15 min cumulés (hook bloquant + résolution conflit). Acceptable mais documente une dette pipeline.

## Action items pour Sprint 29 / Klaude

1. **[Klaude P1]** Avancer [`claude-config#29`](https://github.com/msyx-dev/claude-config/issues/29) — hook anti-merge filtré par projet. Faux positif récurrent qui bloque tous les sprints à PRs parallèles. Récidive S25, S28.
2. **[DS S29 ou plus]** Ouvrir une Quick `chore: helper resolve-version-conflicts.sh` (action item S23 retro) — automatiser la résolution mécanique des conflits @ds-version + RELEASES.md sur PRs séquentielles. Friction observée S28 = 5 min/conflit.
3. **[Cross-projet]** Ouvrir 3 issues consumer sync+cleanup (1 par consumer : aksyva, acssi-core, aksy) pour resync vers v2.49.0 + retrait des overrides désormais redondants. Hors DS.
4. **[Deploy]** Lancer `/deploy` v2.49.0 sur design-system.msyx.fr quand prêt (ajouts purs CSS, 0 risque utilisateur).

## Décisions / patterns à capitaliser

- **Pattern « pré-audit parent + scope précis » validé** : pour les sprints ouverts (sans backlog GitHub), le parent fait un mini-audit avant de créer les issues, ce qui permet de trancher les décisions et d'éviter le groom long. Réutilisable.
- **Pattern « rejet documenté en memory.md »** : quand on évalue des candidats à promotion et qu'on en rejette un, mémoriser la décision avec la raison pour éviter de repasser dessus dans 6 mois. S28 rejet `.input-filter-project` documenté.
- **Anti-pattern récurrent** : 2 PRs en // qui touchent RELEASES.md génèrent toujours conflit. Soit séquencer, soit avoir un helper. À adresser en S29.
