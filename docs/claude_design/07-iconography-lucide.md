# Ticket 07 — Iconography (Lucide sprite)

> **P0** · Effort M (1 sprint complet) · Risque ÉLEVÉ — refactor visuel large

## CONTEXT

Mix actuel : entités HTML (`&#9654;`), emoji (🧩 🚀), SVG inline. Pas de scale, pas de stroke, pas d'alignement optique. Solution : sprite Lucide self-hosté + convention `<svg><use href="#i-name"/></svg>`.

**NE PAS lancer ce ticket sans VR (03) en place** — il va toucher des dizaines de fichiers.

## PROMPT

```
PRÉREQUIS : tickets 03, 04 mergés. Baseline VR fraîche.

On exécute le ticket 07 — Iconography Lucide.

Plan détaillé en 10 lignes avant écriture. C'est le ticket le plus risqué — on prend le temps.

Objectif :
1. Télécharger lucide-static (npm) et générer un sprite SVG self-hosté avec ~50 glyphes : home, search, settings, bell, check, x, chevron-{up,down,left,right}, menu, plus, minus, edit, trash, copy, link, external-link, eye, eye-off, lock, unlock, user, users, mail, phone, calendar, clock, info, alert-triangle, alert-circle, check-circle, x-circle, loader, refresh-cw, download, upload, file, folder, image, code, terminal, github, slack, sun, moon, palette, layout, layers, package, zap, sparkles, rocket.
2. Output : shared/icons/sprite.svg (un seul fichier, <symbol id="i-bell" viewBox="0 0 24 24">...</symbol>).
3. Tokens dans tokens.css :
   --icon-size-sm: 16px;
   --icon-size-md: 20px;
   --icon-size-lg: 24px;
   --icon-stroke: 1.5;
4. Composant CSS : .icon { width: var(--icon-size-md); stroke: currentColor; stroke-width: var(--icon-stroke); fill: none; }
5. Convention : <svg class="icon"><use href="/shared/icons/sprite.svg#i-bell"/></svg>
6. Migrer toutes les entités HTML / emoji UI / SVG inline existants vers la convention. PAS les emoji des notifications utilisateur (chat, comments) — ceux-là restent.
7. Documenter dans pages/fondation.html → nouvelle section "Iconographie" : grille des 50 icônes + snippet d'usage + règles (emoji = UGC only).
8. Bump @ds-version 2.34.0. RELEASES.md → Added (sprite, tokens) + Changed (migration).

Garde-fous :
- Lis lucide-static AVANT de générer — chaque symbol doit avoir le viewBox 24x24, stroke 2 par défaut (CSS override à 1.5).
- Liste-moi les 50 icônes avec leur emplacement actuel (entité HTML / emoji) AVANT de migrer.
- Lance VR à chaque batch de 10 fichiers migrés. Si diff > pixel anti-aliasing → stop et explique.
- Optimise le sprite avec svgo après génération (--multipass --pretty).
```

## DEFINITION OF DONE

- [ ] `shared/icons/sprite.svg` ~30-50 KB après svgo
- [ ] 4 nouveaux tokens icon-* dans tokens.css
- [ ] Classe `.icon` dans components.css
- [ ] 100% des entités UI / emoji UI migrés (laisser emoji UGC)
- [ ] Section "Iconographie" dans fondation.html
- [ ] VR à jour avec les nouvelles captures
- [ ] RELEASES.md v2.34.0 détaillé

## FICHIERS ATTENDUS

```
shared/icons/sprite.svg                [new]
shared/icons/build-sprite.sh           [new — script lucide → sprite]
shared/css/tokens.css                  [edit, +4 tokens]
shared/css/components.css              [edit, .icon]
pages/*.html                           [edits — migration]
index.html, site.html                  [edits — migration]
shared/components.js                   [edit si JS génère des icônes]
visual-tests/baseline/                 [updates — refaire les 96]
RELEASES.md                            [append]
```

## POST-MERGE

- `shared/sync-all.sh` — les consumers (aksy, aksyva, acssistender) doivent récupérer le sprite.
- Annonce interne : "Sprint 19 — iconographie unifiée."
