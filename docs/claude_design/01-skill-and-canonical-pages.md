# Ticket 01 — SKILL.md + canonical-pages folder

> **P0** · Effort S · Risque nul · Sprint 18

## CONTEXT

Le DS n'a aucune ergonomie agent. Les agents (Claude Code, et toi en tant qu'utilisateur) doivent rétro-ingénier l'usage des composants depuis `pages/composants.html` qui est un *demo book*, pas un *usage book*. On comble ça en ajoutant :

1. Un `SKILL.md` à la racine — manifest user-invocable.
2. Un dossier `canonical-pages/` avec 6 pages complètes que les agents copient comme références.
3. Un `prompts.md` avec le phrasing maison.

## PROMPT

```
Lis CLAUDE.md, README.md, RELEASES.md, et shared/CONSUMER_GUIDE.md.

On exécute le ticket 01 — SKILL.md + canonical-pages.

Plan attendu en 5 lignes avant toute écriture, puis attente de ma validation.

Objectif :
- Créer SKILL.md à la racine (frontmatter YAML : name, description, user-invocable: true). Doit être court (<100 lignes), pointer vers les fichiers clés, et lister les règles de tokens / voix / mode glass-vs-solid. Inspire-toi de la voix de CLAUDE.md.
- Créer canonical-pages/ avec 6 pages HTML complètes, chacune ~200-400 lignes, utilisant exclusivement shared/styles.css : login, settings, dashboard-kanban, empty-state, error-404, billing. Chaque page doit avoir <html data-theme="msyx" data-mode="dark"> + l'anti-FOUC inline script standard du repo.
- Créer prompts.md à la racine avec 8-12 phrases-types réutilisables ("Use msyx tokens. No hardcoded hex. Glass cards on dark, solid cards on light." etc).
- Bump @ds-version vers 2.32.0. Update RELEASES.md (Added).
- Ne touche RIEN d'autre. Pas de modification de tokens.css, components.css, ni des pages existantes.

Garde-fous :
- Pas de hex hardcodé dans les canonical-pages, tokens uniquement.
- Toutes les pages doivent passer en light mode sans casser (data-mode="light").
- Voix française, sentence-case, full diacritics ("cohérente" pas "coherente").
```

## DEFINITION OF DONE

- [ ] `SKILL.md` à la racine, frontmatter valide, <100 lignes
- [ ] `canonical-pages/{login,settings,dashboard-kanban,empty-state,error-404,billing}.html` — 6 fichiers
- [ ] Chaque page rend correctement en dark ET light (test manuel sur navigateur)
- [ ] `prompts.md` à la racine, 8-12 phrases
- [ ] `@ds-version` = 2.32.0 dans `tokens.css` (commentaire) ET `package.json` si présent
- [ ] `RELEASES.md` mis à jour avec section v2.32.0 + `Added`
- [ ] `git diff --stat` ne montre QUE les fichiers ci-dessus

## FICHIERS ATTENDUS (whitelist)

```
SKILL.md                              [new]
prompts.md                            [new]
canonical-pages/login.html            [new]
canonical-pages/settings.html         [new]
canonical-pages/dashboard-kanban.html [new]
canonical-pages/empty-state.html      [new]
canonical-pages/error-404.html        [new]
canonical-pages/billing.html          [new]
shared/css/tokens.css                 [edit, header comment only]
RELEASES.md                           [edit, append section]
```

## POST-MERGE

- Run `shared/sync-all.sh` — les consumers récupèrent le bump version.
- Update `memory.md` avec une ligne "Sprint 18 — agent ergonomics".
