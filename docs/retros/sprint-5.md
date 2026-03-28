# Retro Sprint 5 — 2026-03-28

## Chiffres
- **Velocite** : 11/11 SP (100%) — ajuste de 15 SP initial apres groom
- **Issues** : 4/4 livrees (1 Task, 3 Features)
- **PRs** : #35, #36, #37, #38 — toutes mergees
- **Version** : v2.5.0

## Ce qui a marche
- **Variable --accent-rgb** : l'approche "une seule variable RGB par theme" a ete validee par l'analyst comme superieure au plan initial (13 variables d'opacite). Execution propre, zero rgba hardcode restant.
- **Quick flow pour #32** (2 SP) : efficace, pas de groom/spec superflu pour un composant simple.
- **`<dialog>` natif** pour les modals : focus trap gratuit, zero bug clavier, code JS reduit. Decision validee.
- **Groom ajuste les estimations** : 15 SP → 11 SP, estimations plus realistes grace au challenge analyst.
- **Variables RGB semantiques** (bonus #32) : le coder a cree --success-rgb etc. et migre les alertes — amelioration coherente non demandee mais bienvenue.

## Ce qui a coince
- **Script create-issue.sh** : passe le numero de milestone mais `gh issue create` attend le nom. Contourne en creant les issues manuellement. A corriger.
- **Script post-merge.sh** : echoue systematiquement sur le board update (issue deja closed par GitHub avant le script). Le board est mis a jour manuellement via GraphQL. Bug connu depuis sprint 4.
- **Compteur site.html** : derive entre hero (38), meta (40) et footer (40) detectee sur la branche #31. Corrigee manuellement. Cause : les coders incrementent des valeurs differentes.

## Actions
- [ ] Corriger create-issue.sh : passer le nom du milestone au lieu du numero
- [ ] Corriger post-merge.sh : gerer le cas "issue already closed"
- [ ] Ajouter un check automatique d'harmonisation des compteurs site.html (hero = meta = footer)
- [ ] Verifier les action items sprint 4 : dette post-merge.sh toujours ouverte

## Action items sprint 4 — suivi
- [x] Board design-system manquant dans pipeline.json → corrige ce sprint
- [ ] post-merge.sh gere mal les issues auto-closed → toujours ouvert
