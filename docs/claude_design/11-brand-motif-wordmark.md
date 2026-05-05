# Ticket 11 — Brand motif + wordmark

> **P1** · Effort M · Partiellement off-keyboard

## CONTEXT

Le DS est palette-deep mais pas motif-deep. Sans les couleurs, c'est "generic dark dashboard". Il faut un wordmark SVG, une signature spatiale, et formaliser le noise overlay.

Ce ticket est partiellement créatif — Claude Code propose, tu décides.

## PROMPT

```
On exécute le ticket 11 — Brand motif.

Plan en 10 lignes avant écriture. Ce ticket est créatif — propose 4 directions AVANT d'écrire du code.

Objectif :
1. Wordmark : génère 4 directions SVG (geometric / monogram / wordmark / lockup). Chaque direction = un fichier dans assets/explorations/. Format : 200×60 viewBox, monochrome currentColor, 1 path optimisé.
2. Une fois ma direction choisie, finalise assets/logo-msyx.svg + variantes : logo-msyx-mark.svg (juste la mark), logo-msyx-light.svg, logo-msyx-dark.svg.
3. Signature spatiale : choisis UNE des 3 options et propose-moi le rationale :
   a) Tous les section-headers ont une 2px gradient underline (--gradient-1) sous l'overline.
   b) Toutes les cards ont un 1px gradient border sur le edge top uniquement.
   c) Tous les boutons primary ont un 1px inner-glow gradient (box-shadow inset).
4. Implémente la signature retenue dans components.css.
5. Promote --noise-texture en --texture-grain dans tokens.css avec sa data: URL inline. Documente dans fondation.html.
6. Replace les usages de logo-DS-CSS par <img src="/assets/logo-msyx.svg"> partout.
7. Bump 2.38.0. RELEASES.md → Added (wordmark, motif).

Garde-fous :
- Le wordmark doit fonctionner sur fond sombre ET clair. Test en context.
- Pas plus de 1 path complexe par variante (pour SEO/perf).
- La signature spatiale ne doit pas casser VR — préviens-moi des diffs attendus.
```

## DEFINITION OF DONE

- [ ] 4 explorations dans `assets/explorations/`
- [ ] Wordmark final + 3 variantes dans `assets/`
- [ ] Signature spatiale documentée et implémentée
- [ ] `--texture-grain` token + section fondation.html
- [ ] Usages CSS-only du logo remplacés
- [ ] RELEASES.md v2.38.0

## FICHIERS ATTENDUS

```
assets/explorations/wordmark-{geometric,monogram,wordmark,lockup}.svg [new]
assets/logo-msyx.svg              [new]
assets/logo-msyx-mark.svg         [new]
assets/logo-msyx-light.svg        [new]
assets/logo-msyx-dark.svg         [new]
shared/css/tokens.css             [edit, +texture-grain]
shared/css/components.css         [edit, signature spatiale]
pages/fondation.html              [edit, sections logo + texture + spatial]
index.html, site.html             [edit, replace logo CSS-only]
visual-tests/baseline/            [update]
RELEASES.md                       [append]
```

## POST-MERGE

- Génère un OG image (1200×630) avec le wordmark — utile pour le partage social.
- Update GitHub repo README + favicon.
