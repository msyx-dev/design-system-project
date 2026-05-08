# Rétrospective Sprint 26 — design-system-project

**Période** : 2026-05-08 (mini-sprint, 1 issue, ~1h)
**Milestone** : [Sprint 26 #27](https://github.com/msyx-dev/design-system-project/milestone/27) — CLOSED
**Vélocité** : **2 / 2 SP livrés (100%)** — 26e sprint consécutif

## Issue livrée

| # | PR | Titre | SP | Version | Durée PR (create→merge) |
|---|---|---|---|---|---|
| #225 | [#226](https://github.com/msyx-dev/design-system-project/pull/226) | Tokenisation icon/avatar sizes (reliquat audit P-04 à P-08) | 2 | v2.48.0 | 4 min |

## Périmètre fonctionnel

- **Audit Phase 1 entièrement clôturé** : 5 derniers findings P-04 à P-08 (tailles d'icônes/avatars hardcodées) tokenisés. Le doc `docs/audit-2026-05-08.md` est désormais 100% remédié (40/40 findings fermés via 5 sous-issues #216-#219 + #225).
- **8 nouveaux tokens** dans `shared/css/tokens.css` :
  - **Avatars** : `--avatar-size-xs/sm/md/lg/xl` (5 tokens, échelle dédiée 24/40/56/80/112px)
  - **Card icons** : `--card-icon-size`, `--card-icon-size-mobile`, `--card-icon-radius` (3 tokens dédiés, valeurs design spécifiques préservées)
- **3 décisions tokens tranchées** dans la spec :
  1. **Avatars** : tokens dédiés `--avatar-size-*` (vs réutilisation `--space-*`) — les valeurs avatars suivent une logique métier propre, pas l'échelle d'espacement.
  2. **Icons sidebar/copy-btn** : alignement sur `--icon-size-sm` existant (depuis v2.33.0) avec drift ≤2px assumé (18→16, 15→16) — évite la prolifération de tokens à pixel près.
  3. **Card-icon** : tokens dédiés `--card-icon-*` (vs `--space-*` + `--radius-*`) — triplet 52/52/14 trop spécifique pour s'aligner sur les échelles génériques.
- **11 sélecteurs migrés** : 5 avatars + 1 sidebar + 2 copy-btn + 3 card-icon (dont 1 bonus `.hub-card-icon` détecté en groom).
- Documentation `pages/fondation.html#tokens` enrichie de 2 sous-sections (Avatars, Card icons).

## Ce qui a marché

- **Spec qui tranche** : 3 décisions tokens explicitement tranchées avec justification (pas de « à voir », pas de TODO). Le subagent /dev a livré sans question. Décisions reflétées dans le code et la doc.
- **Bonus détecté en groom** : `.hub-card-icon` partage le triplet 52/52/14 de `.card-icon` — non listé dans l'audit Phase 1 mais ajouté à la migration pour cohérence. Le pattern « groom élargit la portée vers la cohérence systémique » a marché.
- **Capitalisation S25 appliquée** : prompt /dev mentionne explicitement les budgets tool_uses et l'instruction `./shared/check-diacritics.sh` avant push. Subagent /dev a retourné RESULT en 57 tool_uses (zéro friction). Pattern « warning explicite anomalie récente » confirmé efficace pour la 3e application consécutive (#216, #219, #225).
- **Pré-allocation versions stable** : 9e application (v2.48.0 injectée upfront, 5 fichiers @ds-version + registry version, 0 conflit).
- **Mini-sprint pertinent** : 1 issue / 2 SP / ~1h end-to-end (groom+spec+dev+review+merge+bilan). Format adapté pour clôturer un audit / un reliquat sans surcharger la planif.

## Ce qui a coincé

Rien à signaler ce sprint. Workflow nominal de bout en bout.

Notamment : **aucun timeout subagent, aucun hook anti-merge, aucun fail CI**. Le sprint S26 est l'opposé miroir de S25 sur ces 3 axes — le contexte « 1 seul subagent à la fois, pas de parallélisme aksyva » a éliminé le faux positif inter-projet, et le scope plus restreint du subagent /dev (#225 = 11 sélecteurs vs #218 = 30 occurrences sur 13 modules) tient largement dans le budget tool_uses.

## Métriques

- **Vélocité** : 2 / 2 SP (100%) — 26e sprint consécutif à 100%+
- **PRs ouvertes** : 1 (mergée)
- **Conflits @ds-version** : 0 (pré-allocation 9e application)
- **Régression visuelle (VR Playwright)** : 0 / 120 baselines
- **Quality gate fails** : 0
- **Subagents qui ont timeout sans RESULT** : 0 / 1 (0%)
- **Friction parent cumulée** : ~0 min
- **Issues parent fermées** : 1 (le doc `audit-2026-05-08.md` reste mais 40/40 findings remédiés)

## Capitalisation

- **Pattern « mini-sprint clôture audit »** validé : quand un audit de référence (#210) a un reliquat de findings hors-scope du sprint principal, ouvrir 1 issue groupée (par catégorie sémantique) et la livrer en mini-sprint dédié. Permet de fermer proprement le doc d'audit sans diluer la planif d'un sprint plus stratégique.
- **Décisions « drift assumé »** : pour des tokens fins (1-2px d'écart), aligner sur l'échelle existante plutôt que créer un token spécifique évite la prolifération. Documentation explicite du drift dans la spec (« 18→16, 15→16 ») + accord groom = pas de surprise au /dev. Pattern réutilisable pour tout futur reliquat de tokenisation.
- **Bonus détecté en groom** (`.hub-card-icon`) : preuve que groom approfondi détecte des findings d'audit incomplets. À garder en tête pour les futurs audits — un audit n'est jamais 100% exhaustif, le groom doit chercher les cousins sémantiques du finding original.

## Vérification action items précédents (S25)

| ID | Action S25 | Statut S26 |
|---|---|---|
| AI-25.1 | Hook anti-merge inter-projet | ✅ ouverte → [`claude-config#29`](https://github.com/msyx-dev/claude-config/issues/29) (2 SP, P1) |
| AI-25.2 | Hisser pattern « budget tool_uses » dans prompt /dev N1 | ⚠️ Toujours en attente (à traiter dans repo Klaude) |
| AI-25.3 | Hisser pattern « check-diacritics.sh avant push » dans prompt /dev N1 | ⚠️ Toujours en attente (à traiter dans repo Klaude) |
| AI-25.4 | Notifier aksy DS-EXCEPTIONs débloquées S23 | ⚠️ Toujours en attente |

## Prochaine étape

- **Audit Phase 1 entièrement clôturé** — le doc `docs/audit-2026-05-08.md` peut être archivé ou marqué « COMPLETED » en tête.
- **`/deploy`** — main = v2.48.0 (cumul S25 + S26), prod = v2.43.1. Cumul de 5 bumps mineurs à déployer (v2.43.1 → v2.44.0 → v2.45.0 → v2.46.0 → v2.47.0 → v2.48.0). Audit secu auto avant deploy.
- **Sprint 27** : pas de candidats prioritaires identifiés à date. Si `/deploy v2.48.0` OK → focus consumers (aksyva, acssi-core) pour valider absence de régression sur 5 bumps mineurs cumulés.
- **Audit Phase 2 ?** À composer si besoin (perf, a11y, browser compat, consumers DS).
