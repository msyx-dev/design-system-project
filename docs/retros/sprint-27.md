# Rétrospective Sprint 27 — design-system-project

**Période** : 2026-05-08 (sprint coordination cross-projet, ~30 min)
**Milestone** : [Sprint 27 #28](https://github.com/msyx-dev/design-system-project/milestone/28) — CLOSED
**Vélocité** : **4 / 4 SP livrés (100%)** — 27e sprint consécutif

## Issues livrées

| # | Mode | Titre | SP | Verdict |
|---|---|---|---|---|
| #227 | no-PR (audit + rapport) | Vérif consumers post-deploy v2.48.0 | 3 | PASS-AVEC-DETTE — 0 régression DS |
| #228 | no-PR (commentaires GitHub) | Notify aksy DS-EXCEPTIONs S23 | 1 | 4 commentaires postés sur aksy#265, #278, #301, #254/UC-288 |

## Périmètre fonctionnel

- **Sprint sans code DS** : 100% coordination cross-projet, 0 ligne de code touchée dans le DS, 0 PR, 0 bump version. Pattern « no-PR expected » documenté en amont (commentaire stratégie sur #227) puis validé en exécution.
- **Audit consumers** (#227) : `check-sync.sh --check-overrides` + `check-components.sh` exécutés sur `aksyva-project` et `acssi-core-project`. Bonus check sur `aksy` local. Aucune des 5 surfaces de risque (v2.44 chevron, v2.45 transitions, v2.46 space tokens, v2.47 forms restructure, v2.48 avatar/card-icon tokens) n'a généré de régression active.
- **Findings drift sync** :
  - `aksyva-project` sync **v2.24.1** (drift -24 minor par rapport à prod v2.48.0) — 2 classes hors DS (`.card-link`, `.input-filter-project`)
  - `acssi-core-project` sync **v2.14.3** (drift -34 minor) — 2 classes hors DS (`.badge-nav`, `.toast-message`)
  - `aksy` sync **v2.36.0** (drift -12 minor, bonus) — 3 overrides DS-EXCEPTIONs S23 + 1 helper JS local
  - **Aucune suite VR configurée** chez les 3 consumers (point d'attention : pas de filet visuel post-resync)
- **Notifications aksy** (#228) : 4 commentaires structurés postés sur les issues fermées aksy#265 (a11y `--text-muted`), #278 (tap targets nav), #301 (dark mode disabled), #254 (UC-288 modal focus restore). Chaque commentaire référence : PR DS de déblocage, version de mise à dispo, fichiers/lignes d'override à retirer, prérequis « resync d'abord ». Trace permanente même sur issues CLOSED.

## Ce qui a marché

- **Stratégie « no-PR expected » documentée upfront** : commentaire de pré-sprint sur #227 a explicité le mode coordination, l'ordre séquentiel (#227 → #228), les garde-fous, et les spécificités subagent. Le `/sprint 27` a déroulé sans surprise.
- **Séquentiel pertinent** : findings #227 (drift aksy v2.36.0) ont enrichi #228 d'une mention critique « resync avant retrait override » — la notification gagne en précision opérationnelle. Si parallélisé, la note aurait manqué.
- **Subagents en mode read-only audit** : les 2 subagents ont respecté le contrat « 0 fichier modifié dans DS ou consumers, 0 issue/PR ouverte ». `git status` clean dans les deux worktrees au retour. Pattern validé : un sprint coordination peut être 100% subagents avec 0 risque pour le code.
- **27e sprint consécutif à 100%** : la mécanique pipeline tient sur des sprints très différents (mini-sprint S26 1 issue, sprint dense S25 12 SP, sprint coordination S27 4 SP no-PR). Aucun timeout subagent, aucun rollback nécessaire.

## Ce qui a coincé

- **Bug DS interne révélé** : `shared/check-components.sh` crash sur les 2 consumers à cause de l'entrée `reset-natif` dans `shared/components-registry.json` qui a `cssClasses: null`. Le subagent #227 a contourné via un script Python adhoc — l'audit s'est terminé proprement, mais le bug pollue le tooling. **Action** : ouvrir issue P3 dans le DS pour fixer le registre.
- **Drift sync consumers énorme** : aksyva -24 minor, acssi-core -34 minor, aksy -12 minor. Les consumers ne sont jamais resyncés depuis longtemps. **Action** : ouvrir 1 issue de resync+cleanup côté chaque consumer (3 issues).
- **Aucune VR consumer** : si le DS pousse une régression CSS, les consumers ne la détecteraient qu'en exécution. La VR DS protège le DS lui-même mais pas la chaîne de propagation. **Action capitalisable** : recommander aux consumers d'adopter une VR Playwright minimale (1-3 pages canoniques × 1-2 thèmes), à éventuellement promouvoir via un template DS.

## Métriques

- **Vélocité historique 27 sprints** : moyenne ~10 SP / sprint, médiane 10 SP. S27 = 4 SP (sous médiane, attendu pour un sprint coordination).
- **Cumul livré** : 268 SP sur 27 sprints (255 + 13 sprints récents).
- **Sprints à 100% accuracy** : 26/27 (le seul à 107% = Sprint 23 avec 1 SP bonus absorbé).

## Action items pour Sprint 28

1. **[Bug DS interne]** Ouvrir issue P3 « `components-registry.json` : entrée `reset-natif` avec `cssClasses: null` cause crash check-components.sh ». ~1 SP.
2. **[Cross-projet]** Ouvrir 3 issues consumer sync+cleanup (1 par consumer : aksyva, acssi-core, aksy). Hors DS, à porter sur chaque repo respectif.
3. **[Promotion DS éventuelle]** Évaluer si `.card-link`, `.badge-nav`, `.toast-message`, `.input-filter-project` méritent une promotion dans le DS (composants candidats). À groomer en S28 si décision OUI.
4. **[Capitalisation backlog]** 4 issues claude-config en backlog (~7 SP cumulé) — à sprinter depuis le repo claude-config au prochain passage.

## Décisions / patterns à capitaliser

- **Pattern « sprint no-PR » validé** : pour tout sprint où le scope est purement coordination (audit cross-projet, notifications, doc), le mode `STATUS=pushed PR_NUM=none` avec rapport en commentaire GitHub fonctionne. Le `/sprint` accepte ce mode si le subagent suit le contrat read-only + reporting.
- **Pattern « stratégie pré-sprint en commentaire »** : composer le sprint en amont via un commentaire détaillé sur l'issue P1 (ordre, mode, garde-fous, spécificités subagent) permet au `/sprint` de dérouler sans clarification. Réutilisable pour tout sprint atypique.
- **Anti-pattern détecté côté consumers** : laisser un consumer driftérer de 24-34 minor sans process de resync planifié = dette qui s'accumule silencieusement. À adresser via cadence de resync explicite dans la doc consumer.
