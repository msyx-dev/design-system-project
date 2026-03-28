# Retro Sprint 6 — 2026-03-28

## Chiffres
- **Velocite** : 20/20 SP (100%) — sprint le plus charge a ce jour
- **Issues** : 6/6 livrees (6 Features)
- **PRs** : #57 (Breadcrumbs), #58 (Copy Button), #59 (Chip), #60 (Search Input), #61 (Data Grid), #62 (Carousel)
- **Version** : v2.6.0
- **Composants** : 40 → 46

## Ce qui a marche
- **Quick Flow efficace** : #40 Breadcrumbs (2 SP) et #44 Copy Button (2 SP) livres en skip groom+spec, sans regression. Le seuil SP <= 2 est bien calibre.
- **Pipeline sequentiel fluide** : les 6 issues se sont enchainees sans friction (groom → spec → dev → review → merge), aucune question bloquante, aucun request_changes.
- **Specs de qualite** : les specs du planner ont guide le coder sans ambiguite. Zero divergence spec/implementation sur les 4 issues standard.
- **Data Grid (5 SP)** : le composant le plus complexe (tri + filtre + selection + sticky) livre sans accroc. Le tester a ecrit 47 tests unitaires pour valider.
- **Carousel (5 SP)** : touch swipe, auto-play, MutationObserver cleanup SPA — patterns techniques avances bien executes.
- **Theming zero-effort** : les 6 composants fonctionnent sur 3 themes x 2 modes grace aux variables CSS. Aucun fix theming necessaire.

## Ce qui a coince
- **post-merge.sh toujours casse** : echoue systematiquement (issue already closed par GitHub). Board mis a jour manuellement via GraphQL a chaque merge. Meme probleme que sprint 4 et 5.
- **Branche `#` dans les noms** : le `#` dans `feat/#40-breadcrumbs` cause des problemes d'encodage URL sur GitHub (`%2340`). Contourne en utilisant `feat/40-breadcrumbs` (sans #). Convention a formaliser.
- **Coder commite parfois sur main** : pour #44 et #43, le coder a commite sur la branche locale main au lieu du worktree. Detecte et corrige manuellement. Le pattern worktree n'est pas toujours respecte quand le coder est lance sans isolation explicite.
- **Compteur footer site.html** : toujours desynchronise (affichait "40 composants" au lieu de 45/46). Meme derive que sprint 5.

## Actions
- [ ] Formaliser la convention de nommage de branche dans N2 : `feat/NN-description` (sans `#`) pour eviter les problemes d'encodage GitHub
- [ ] Corriger post-merge.sh : gerer le cas "issue already closed" (dette depuis sprint 4)
- [ ] Ajouter un check automatique du compteur footer site.html dans check-docs.sh (hero = footer)
- [ ] Considerer un lint JS minimal (node -c) dans le quality-gate pour les projets statiques

## Action items sprint 5 — suivi
- [ ] Corriger create-issue.sh : passer le nom du milestone → non traite ce sprint (pas necessaire)
- [ ] Corriger post-merge.sh : gerer issue already closed → toujours ouvert (3e sprint consecutif)
- [ ] Check harmonisation compteurs site.html → toujours ouvert (corrige manuellement a chaque fois)
- [ ] Verifier les action items sprint 4 → post-merge.sh toujours le meme

## Tendance velocite (3 derniers sprints)
| Sprint | Planifie | Livre | Accuracy |
|--------|----------|-------|----------|
| S4 | 11 SP | 11 SP | 100% |
| S5 | 11 SP | 11 SP | 100% |
| S6 | 20 SP | 20 SP | 100% |

Tendance stable a 100%. Le sprint 6 a double la charge (20 SP vs ~11 SP) sans degradation.
