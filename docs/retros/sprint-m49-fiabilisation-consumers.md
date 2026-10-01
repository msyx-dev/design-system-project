# Rétrospective — milestone #49 « Fiabilisation consumers ② »

> Nom de fichier non ambigu : la numérotation des sprints de `velocity.json` (… 32, 35, 36) n'a pas
> suivi les milestones #41 à #48. L'entrée de vélocité porte le numéro **49** = numéro du milestone.

**Période** : 2026-09-30 → 2026-10-01 · **Lot unique** (`integration/lot-1`) · `main` = `f2e46da`
**Release** : DS **2.142.0** + `@msyx-dev/react` **3.0.0-alpha.60** (PR de release consolidée)

## Données

| Issue | Type | SP plan | SP après amont | Tranches | Cycles CI de la PR | request_changes |
|---|---|---|---|---|---|---|
| #944 contraste boutons | Bug | 5 | 5 | 3 + option B | 2 | 0 |
| #954 logos distribués | Task | 2 | **5** | 4 | 2 | 0 |
| #938 orphelins check-components | Bug | 3 | **5** | 3 | 2 (1 conflit registre) | 0 |
| #952 Textarea | Feature | 3 | **4** | 2 | 4 (conflit registre + 2 récoltes VR) | 0 |
| #936 ActionMenu | Bug | 2 | 2 | Quick | 2 (récolte VR) | 0 |
| #937 Breadcrumb | Bug | 1 | 1 | Quick | 1 | 0 |
| #958 `/health` `/version` | Bug | — (ajoutée) | 1 | Quick | 2 (réveil expiré) | 0 |

**Vélocité** : 23 SP livrés / 16 SP au plan validé / 22 SP après l'amont (+1 ajouté en cours, #958).
L'écart plan → amont est un **résultat de l'amont** : #954 a absorbé la re-vectorisation du logo
(découverte : le SVG n'avait pas la découpe du « M »), #938 les signaux React sans lesquels la passe
était fausse chez les 4 consommateurs réels, #952 le compteur vanilla inexistant.
**Tendance** : non affichée — `velocity.json` s'arrêtait au sprint 36 (milestones #41-#48 non
enregistrés) et était dans un format que `velocity-compute.sh` ne lisait plus (clé `sprint` au lieu
de `number`, tableau nu) ; forme convertie à l'identique des valeurs, aucun recalcul.

**Quality-gate de clôture** : FAIL sur 13c, 21, 22 uniquement — tous mesurent l'environnement
déployé, pas l'arbre (préprod encore sur `c6e4e1b`, smoke DOM configuré sur une URL qui n'existe
pas). Bascule sur `main` décidée par Mike (option A), preuve runtime renvoyée au déploiement.

## ✅ Ce qui a marché

- **Quick en parallèle de l'amont** (demande de Mike) : #937 et #936 étaient en PR avant que la
  première spec soit rendue ; zéro collision avec les specs.
- **Mesurer avant de relayer** : trois affirmations de subagents vérifiées par le parent avant
  d'agir, toutes justes et décisives — le logo MSYX faux (rendu comparé au PNG), les 11 faux
  WARNING de `check-components.sh` (sync réel + passe), et le timeout `npm pack` environnemental
  (rejoué seul, charge machine 9-13).
- **Rendu réel avant chaque décision visuelle** : planches logo et boutons avant/après en
  Chromium ont permis à Mike de trancher en un mot ; l'option B (Auchan) n'aurait pas existé sans
  la planche — la VR, elle, était verte.
- **Vérification de l'arbre exact** : PR brouillon 966 vers `main` pour faire tourner TOUTE la CI
  (visual + a11y compris) sur le SHA qui allait atteindre `main`, plus l'image Docker bâtie et
  démarrée (`/health` JSON prouvé au niveau image). Mesure impossible autrement en local (local ≠ CI).
- **Recollement par régénération** : 2 conflits du registre résolus sans édition à la main
  (version du lot + clés saisies, puis `generate-registry.js`), tests du registre verts du premier coup.

## ❌ Ce qui a coincé

1. **Les gates mesurent la préprod au mauvais moment** : readiness §2h-ter puis quality-gate 21/22
   jouent `validate-preprod.sh` sur la préprod déployée, que la doctrine ne redéploie qu'au bilan →
   NOT READY puis FAIL **par construction** sur un sprint qui corrige justement la préprod (#958).
2. **Réveil CI trop court** : borne 900 s contre 21-26 min de `visual` → 6 expirations, chacune
   réarmée après mesure manuelle (jamais un vrai rouge).
3. **Cycles CI multipliés par les fichiers partagés** : `components-registry.json` touché par 4 PR
   → 2 recollements, et une nouvelle section de showcase coûte 2 runs (décalage des sections
   suivantes + baselines de la section elle-même). #952 : 4 cycles de ~25 min.
4. **Les tests visuels n'ont pas vu le changement de couleur de tous les boutons** (#944) — le
   signal n'est venu que de la planche faite à la main.
5. **`main` bougé par un tiers pendant le lot** (Kchigoki, #965, docs) → fast-forward impossible ;
   résolu par rebase du lot au-dessus de `main` (sans conflit) et re-mesure de l'arbre.

## 🔧 Actions (5 max)

| # | Action | Ticket | État |
|---|---|---|---|
| A1 | Gates runtime (validate-preprod, smoke DOM) mesurés après le déploiement du bilan ; à la clôture de lot, mesurer l'image bâtie | claude-config#536 | **Écrite** (ticket) |
| A2 | Borne du réveil CI adaptée à la durée réelle du dépôt | claude-config#536 | **Écrite** (ticket) |
| A3 | Tolérance VR resserrée + axe `color-contrast` bloquant sur MSYX | DS#969 | **Écrite** (ticket) |
| A4 | Passe historique de `check-components.sh` qui échoue sur tout consommateur synchronisé | DS#967 | **Écrite** (ticket) |
| A5 | Contraste des boutons à fond plein | — | **Mesurée** : sonde pixels bloquante en CI (`visual-tests/button-contrast.spec.ts`, `ENFORCE = true`), preuve par mutation |

Dette suivie hors actions : DS#968 (`.btn-outline-danger`), DS#970 (`consumers.json`, `sync-all.sh`).

## Vérification des actions de la rétro précédente (`sprint-m43-registre-doc.md`)

- **Frontière strict** (49 violations nom/id, `--frontier-strict` opt-in) : ⏳ toujours ouvert — 44
  violations warn-only relevées ce sprint par les subagents, aucune issue. À ticketer ou abandonner
  explicitement au prochain groom.
- **`version.json` racine figé à 2.57.1** : ⏳ inchangé dans le dépôt ; sans effet au runtime
  (l'image Docker de ce sprint sert `/version` = 2.141.1, régénéré par `entrypoint.sh`).
- **Lot churn-VR M#43** : ✅ soldé (milestone #43 fermé).
