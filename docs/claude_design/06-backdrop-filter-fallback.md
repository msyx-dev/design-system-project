# Ticket 06 — backdrop-filter perf guard

> **P2** · Effort XS (2h) · Risque nul

## CONTEXT

Glassmorphism stacké (sidebar + modal + toast) = jank sur Android low-end. Ajouter un fallback `@supports not` + documenter la règle "glass = chrome, solid = content".

## PROMPT

```
On exécute le ticket 06 — backdrop-filter fallback.

Plan en 3 lignes avant écriture.

Objectif :
1. Dans shared/css/components.css, partout où `.card`, `.modal`, `.sidebar`, `.header` utilisent backdrop-filter, ajouter un wrapper :
   @supports not (backdrop-filter: blur(20px)) {
     .glass-card, .modal, .sidebar, .header { background: var(--surface-solid); opacity: 0.95; }
   }
2. Documenter dans pages/fondation.html : nouvelle sub-section "Performance" → règle "glass for chrome, solid for content".
3. Update SKILL.md (ticket 01) avec la même règle.
4. Bump patch.

Garde-fous :
- Pas de changement visuel pour les navigateurs supportant backdrop-filter (>97% du marché).
- Test manuel sur Firefox avec layout.css.backdrop-filter.enabled = false (about:config).
```

## DEFINITION OF DONE

- [ ] `@supports not` blocs en place
- [ ] Doc fondation.html mise à jour
- [ ] SKILL.md mis à jour
- [ ] VR passe sans diff

## FICHIERS ATTENDUS

```
shared/css/components.css      [edit]
pages/fondation.html           [edit, ajout section]
SKILL.md                       [edit]
RELEASES.md                    [append]
```

## POST-MERGE

Aucune action particulière.
