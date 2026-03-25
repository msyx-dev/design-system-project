# Retro Sprint 2 — Gestion de themes

## Donnees
- **Dates** : 2026-03-25 → 2026-03-26
- **Issues** : 3 features + 1 epic = 4 issues, toutes closed
- **SP planifies** : 11 (5+3+3)
- **SP livres** : 11
- **Velocite** : 100%
- **PRs** : #15, #16, #17 (toutes merged)
- **Bugs decouverts** : 0
- **Issues ajoutees en cours** : 0

## Ce qui a marche
- Pipeline groom→spec→dev→review fluide pour les 3 issues
- Infrastructure theming CSS bien decoupee : les issues #13 et #14 ont pu s'appuyer sur #12 sans friction
- Le mecanisme [data-theme] + variables CSS est simple et extensible
- Anti-FOUC via script inline = solution pragmatique et fiable
- Review a detecte 2 strokes hardcodes oublies dans data.html → corriges avant merge

## Ce qui a coince
- Le script post-merge.sh echoue sur le board update (issue deja closed par GitHub auto-close via "Closes #X") — workaround manuel a chaque fois
- Le board Design-System n'est pas dans pipeline.json → warnings a chaque create-issue

## Actions
- [ ] Ajouter le board Design-System dans pipeline.json pour supprimer les warnings
- [ ] Investiguer le timing post-merge.sh vs GitHub auto-close pour fiabiliser le script
- [ ] Creer une issue pour la dette des ~43 rgba hardcodes (opacite accent)
- [ ] Creer une issue pour les avatars hardcodes dans composants.html + templates.html

## Verification actions Sprint 1
- Sprint 1 n'avait pas de retro formalisee (premier sprint du projet)
