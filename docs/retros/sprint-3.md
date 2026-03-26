# Retro Sprint 3 — Theme Nhood + Infrastructure dark/light

## Donnees
- **Dates** : 2026-03-26
- **Issues** : 2 features + 1 epic = 3 issues, toutes closed
- **SP planifies** : 8 (5+3)
- **SP livres** : 8
- **Velocite** : 100%
- **PRs** : #21, #22 (toutes merged)
- **Bugs decouverts** : 0
- **Issues ajoutees en cours** : 0

## Velocite cumulee
- Sprint 1 : 11/11 SP (100%)
- Sprint 2 : 11/11 SP (100%)
- Sprint 3 : 8/8 SP (100%)
- Total : 30/30 SP

## Ce qui a marche
- Architecture 2 axes (data-theme + data-mode) validee en amont par review UI senior — zero iteration
- Le layer light generique est reutilisable : Nhood light n'a eu qu'a ecrire des overrides specifiques
- Le pattern THEME_CONFIG rend l'ajout de themes trivial (1 ligne JS + 1 bloc CSS)
- La separation palette/mode evite l'explosion combinatoire des themes

## Ce qui a coince
- post-merge.sh echoue toujours (issue deja closed par GitHub) — meme probleme que sprint 2
- Le site nhood.fr a ses CSS dans des bundles inaccessibles — extraction palette via logo PNG

## Actions
- [ ] Corriger post-merge.sh pour gerer le cas "issue deja closed"
- [ ] Ajouter board design-system dans pipeline.json
- [ ] Dette : tokeniser les ~43 rgba accent hardcodes

## Verification actions Sprint 2
- [ ] Ajouter board Design-System dans pipeline.json — PAS FAIT
- [ ] Investiguer post-merge.sh timing — PAS FAIT
- [ ] Issue pour dette rgba hardcodes — PAS FAIT (toujours dans le backlog informel)
