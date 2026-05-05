# Ticket 08 — Split components.css

> **P1** · Effort M (1 sprint) · Risque ÉLEVÉ — refactor structurel

## CONTEXT

`shared/css/components.css` = 171 KB monolithique. Les consumers paient le tout. Solution : split par composant + barrel + tree-shake guide.

**Lancer après tickets 03 (VR) et 07 (iconography) pour minimiser les conflits.**

## PROMPT

```
PRÉREQUIS : tickets 03, 07 mergés.

On exécute le ticket 08 — Split components.css.

Plan en 10 lignes avant écriture. On utilise un git mv + extract pour garder l'historique.

Objectif :
1. Lis l'intégralité de shared/css/components.css. Identifie les sections logiques (probablement délimitées par /* === Section === */). Liste-moi le découpage proposé AVANT toute édition.
2. Cible : ~20 fichiers dans shared/css/components/ : buttons.css, cards.css, badges.css, alerts.css, forms.css, navigation.css, tables.css, modals.css, toasts.css, avatars.css, tags.css, tabs.css, stepper.css, pagination.css, breadcrumb.css, calendar.css, kanban.css, etc.
3. components.css devient un barrel : @import url("./components/buttons.css"); etc.
4. Créer aussi components-core.css = barrel minimal (buttons + cards + forms + alerts + badges) ~30 KB pour les consumers légers.
5. Update CONSUMER_GUIDE.md avec section "Tree-shaking" : exemple de copie sélective via sync-all.sh.
6. shared/sync-all.sh : ajouter flag optionnel --components=buttons,cards qui copie uniquement les fichiers demandés.
7. VR : 0 diff attendu (le barrel fait que le rendu est identique).
8. Bump @ds-version 2.35.0. RELEASES.md → Changed (architecture).

Garde-fous :
- ZÉRO modification de CSS pendant le split. Que des coupes/colles.
- VR DOIT passer 96/96 sans update.
- Si diff visuel : c'est qu'un selector a perdu sa cascade. Stop.
- Préserve l'ordre de cascade : l'ordre des @import dans le barrel = l'ordre des sections dans l'original.
```

## DEFINITION OF DONE

- [ ] ~20 fichiers dans `shared/css/components/`
- [ ] `components.css` = barrel pur, <1 KB
- [ ] `components-core.css` ~30 KB
- [ ] VR passe 96/96 sans baseline update
- [ ] `sync-all.sh --components=` fonctionnel
- [ ] CONSUMER_GUIDE.md à jour
- [ ] RELEASES.md v2.35.0

## FICHIERS ATTENDUS

```
shared/css/components/*.css     [new — ~20 fichiers]
shared/css/components.css       [edit, devient barrel]
shared/css/components-core.css  [new]
shared/sync-all.sh              [edit, ajout flag]
shared/CONSUMER_GUIDE.md        [edit]
RELEASES.md                     [append]
```

## POST-MERGE

- Mesurer la taille du bundle aksy AVANT et APRÈS migration vers components-core.
- Issue "Migrate aksyva to components-core" si gain >50 KB.
