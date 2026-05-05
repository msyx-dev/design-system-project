# Ticket 05 — Motion reference page

> **P1** · Effort S (1 jour) · Risque nul

## CONTEXT

`--duration-fast/base/slow` et `--ease-standard/spring` existent dans les tokens mais ne sont documentés nulle part. On crée `pages/motion.html` avec : barres de durée, courbes d'easing en SVG, et 6 patterns canoniques animés.

## PROMPT

```
On exécute le ticket 05 — Motion page.

Plan en 5 lignes avant écriture.

Objectif :
- Créer pages/motion.html avec la structure standard du DS (sidebar + header + main avec sections id/scroll-spy comme pages/fondation.html).
- Sections :
  1. Durations — 3 barres animées en boucle (150ms / 200ms / 350ms), labelisées avec --duration-*
  2. Easings — 2 courbes SVG (cubic-bezier dessinés à partir des coords des tokens) + démo d'une boule animée le long
  3. Patterns canoniques — 6 démos en boucle : fade-in, slide-up, scale-in, stagger (3 enfants), skeleton-shimmer, success-bounce
- Chaque démo a un bouton "Replay" qui retire/réajoute la classe d'animation.
- Code snippet à côté de chaque pattern (utiliser <pre><code> avec Fira Code).
- Ajouter "Motion" dans la nav sidebar (sous "Fondation") + dans index.html cards.
- Bump @ds-version. RELEASES.md → Added.

Garde-fous :
- Tokens uniquement. Pas de durée hardcodée.
- prefers-reduced-motion : toutes les animations doivent respecter.
- Lance npm run test:visual après — il faudra peut-être ajouter motion.html au baseline avec --update.
```

## DEFINITION OF DONE

- [ ] `pages/motion.html` — fonctionnel en dark + light, msyx + acssi + nhood
- [ ] 6 patterns visibles, animations fluides, snippets lisibles
- [ ] `prefers-reduced-motion: reduce` désactive les boucles
- [ ] Lien dans sidebar ET dans index hub
- [ ] Baseline VR mis à jour (4 nouvelles captures pour motion.html)

## FICHIERS ATTENDUS

```
pages/motion.html              [new]
shared/components.js           [edit si nav globale est JS-rendered]
index.html                     [edit, ajout card Motion]
RELEASES.md                    [append]
visual-tests/baseline/         [+4 PNG pour motion.html]
shared/css/tokens.css          [header @ds-version]
```

## POST-MERGE

- Tweet/post interne avec le lien — la page sert aussi de showcase externe.
