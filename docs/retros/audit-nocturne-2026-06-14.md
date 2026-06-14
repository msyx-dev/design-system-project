# Retro — Passe audit nocturne 2026-06-13→14

**Contexte** : passe autonome (Mike absent) suite signalement sidebar incohérente, LoginScreen débordant, charts/data fragmenté. 4 fixes mergés, v2.69.1 → v2.71.1.

---

## Ce qui a bien marché

- **4 fixes livrés en séquence sans intervention** — audit → triage → fix → merge → vérif cumulative, tout en autonome.
- **Root cause partagée identifiée** : `1fr` → `minmax(0,1fr)` a résorbé l'overflow de 4 pages d'un coup (#529). Chercher la cause commune avant de fixer chaque occurrence indépendamment.
- **Manifeste build sidebar** (#528) : le générateur statique `bin/generate-nav-sections.js` produit un manifeste inliné dans `nav.js` — immunisé auth-gate, cache et CSP. Architecture robuste par construction.
- **`freezeJsAnimations` VR** : compteurs animés figés avant screenshot — recette fiable, baselines stables, anti-flaky résolu une fois pour toutes.

---

## Apprentissages

### A1 — Vérifier le RENDU réel, pas la source

Le #509 (sidebar runtime-fetch) passait CI + lecture source mais cassait au rendu sur préprod auth-gated : le `fetch()` runtime recevait un 302 Authentik → 0 sections parsées. Un check sidebar par rendu (Playwright sur URL préprod) était absent du pipeline.

**Règle** : tout composant qui charge du contenu dynamiquement doit avoir un test de rendu sur l'env auth-gated, pas seulement un lint statique.

### A2 — Générateurs de build : parsing statique, jamais de navigateur en CI lint

Le 1er jet de `bin/generate-nav-sections.js` (#528) lançait Chromium pour parser le DOM → CI hang 20 min sur GitHub Actions (pas de display). Fix : parsing statique HTML (`fs.readFileSync` + regex/cheerio) — déterministe, rapide, zéro dépendance browser.

**Règle** : tout script CI de génération/validation doit être statique. Si le DOM rendu est nécessaire, séparer en deux étapes (génération locale → commit artefact → CI valide l'artefact).

### A3 — VR baselines : update en local, vérifier en CI

Recette validée : générer les baselines en local (sur la même machine avec display), pousser, laisser CI vérifier. Attention aux composants JS non figés (compteurs animés, transitions) → `freezeJsAnimations()` injecté avant screenshot. Sans ce fige, les screenshots varient à chaque run (nombre affiché différent) → faux échec VR.

**Règle** : ajouter `freezeJsAnimations` dans les fixtures Playwright pour tout composant avec JS temporel.

### A4 — Fix de grille global (`1fr` → `minmax(0,1fr)`)

La propriété `1fr` dans `grid-template-columns` admet `auto` comme plancher implicite, ce qui force la colonne à la largeur max-content de son contenu. Résultat : overflow +399px à 1280px. `minmax(0,1fr)` impose un plancher de 0 et confine proprement.

**Règle** : toute grille DS doit utiliser `minmax(0,1fr)` (jamais `1fr` seul) dans les déclarations `grid-template-columns`. Documenter dans `DS-PRINCIPLES.md` lors du prochain sprint polish.

---

## Issues non traitées (scope réduit volontaire)

- **#531 me.json** : non-bug préprod (endpoint optionnel), non prioritaire. Peut être traité hors passe.
- **M#40 composants manquants** (#395, 21 issues) : hors périmètre de cette passe de qualité. Priorité donnée à la robustesse des bugs signalés. À reprendre en M#40 selon séquençage backlog.

---

**Auteur** : agent autonome nocturne (Claude Sonnet) — 2026-06-14
