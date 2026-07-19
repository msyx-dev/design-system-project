# PERF-BUDGET.md — Design System msyx.design

> Version : v2.54.0 — Mise a jour : 2026-05-09

---

## Vue d'ensemble

Le design system maintient deux couches de perf budget complementaires :

| Outil | Perimetre | Frequence | Fichier de config |
|-------|-----------|-----------|-------------------|
| Bundle gzip (perf-budget.sh) | Poids CSS/JS de la lib | Chaque PR / push main | `shared/perf-budget.json` |
| Lighthouse CI (lhci) | Metriques web (LCP, TBT, CLS, score) | Chaque PR / push main | `lighthouserc.cjs` |

Les deux outils fonctionnent en **warn-only** : aucune PR n'est bloquee en cas de depassement (mode prevu post-S31). L'objectif actuel est de constituer une base de reference stable sur plusieurs sprints avant de basculer en block-mode.

---

## 1. Bundle gzip

### Perimetre

Les 5 fichiers CSS/JS consommes par les projets externes :

| Fichier | Baseline (gzip -9) | Seuil (+5%) | Role |
|---------|--------------------|-------------|------|
| `shared/css/tokens.css` | 5 136 B | 5 392 B | Variables CSS + themes |
| `shared/css/utilities.css` | 2 371 B | 2 489 B | Classes utilitaires |
| `shared/css/components.css` | 364 B | 382 B | Barrel complet (26 @import) |
| `shared/css/components-core.css` | 274 B | 287 B | Barrel essentiel (7 @import) |
| `shared/components.js` | 34 187 B | 35 896 B | JS interactif partage |
| `shared/dist/graph-lib.global.js` | 753 B | 1 200 B | Moteur graph (#657, I1a) — utils partages seuls (pointerDrag/svg), genere via esbuild |

Note : `components.css` est un barrel de @import — la taille des modules resolus est separee (voir section Tree-shaking dans `shared/CONSUMER_GUIDE.md`).

`shared/dist/graph-lib.global.js` est le premier artefact **genere par un build** (esbuild borne, cf. `shared/graph/build.sh`) du DS — jusqu'ici 100% statique. Budget separe de `components.js` : le futur moteur graph (I1b+) ne doit jamais alourdir le bundle core.

### Commandes

```bash
# Rapport complet (warn-only)
./shared/perf-budget.sh

# Sortie JSON pour automatisation
./shared/perf-budget.sh --json

# Mode block (exit 1 si depassement)
./shared/perf-budget.sh --check
```

### Mise a jour de la baseline

1. Mesurer les nouvelles tailles : `./shared/perf-budget.sh --json`
2. Calculer les seuils : `nouvelle_baseline * 1.05`
3. Editer `shared/perf-budget.json` — champs `baseline_bytes` et `threshold_bytes`
4. Commiter avec message : `perf: bump gzip baseline — v2.X.Y`

---

## 2. Lighthouse CI — multi-themes

### Perimetre

Page de reference : `pages/composants.html` (la plus lourde en composants JS).
Matrice : **3 themes × 2 modes = 6 runs** par cycle CI.

### Mecanisme query param → localStorage (anti-FOUC)

Lighthouse CI visite chaque URL avec un query param `?theme=X&mode=Y`. Un script inline dans `<head>` de `composants.html` intercepte ces params et les ecrit dans `localStorage` AVANT le script anti-FOUC qui applique le theme :

```html
<!-- 1. Ecrire les params en localStorage (avant render) -->
<script>(function(){
  var p = new URLSearchParams(location.search);
  var t = p.get('theme'); var m = p.get('mode');
  if (t) localStorage.setItem('msyx-theme', t);
  if (m) localStorage.setItem('msyx-mode', m);
}());</script>

<!-- 2. Appliquer le theme depuis localStorage (anti-FOUC standard) -->
<script>(function(){
  var t = localStorage.getItem('msyx-theme');
  if (t && t !== 'msyx') document.documentElement.setAttribute('data-theme', t);
  var m = localStorage.getItem('msyx-mode');
  if (m && m !== 'dark') document.documentElement.setAttribute('data-mode', m);
}());</script>
```

L'ordre d'execution est garanti : script 1 s'execute en premier, script 2 lit localStorage deja mis a jour.

### URLs testees

```
http://localhost:3001/pages/composants.html?theme=msyx&mode=dark
http://localhost:3001/pages/composants.html?theme=msyx&mode=light
http://localhost:3001/pages/composants.html?theme=acssi&mode=dark
http://localhost:3001/pages/composants.html?theme=acssi&mode=light
http://localhost:3001/pages/composants.html?theme=nhood&mode=dark
http://localhost:3001/pages/composants.html?theme=nhood&mode=light
```

Themes valides conformes a `THEME_CONFIG` dans `shared/components.js` : tous les 3 themes supportent `['dark', 'light']`.

### Seuils (warn-only)

| Metrique | Seuil | Valeur max CSS spec |
|----------|-------|---------------------|
| LCP (Largest Contentful Paint) | < 2 500 ms | Good < 2 500 ms |
| TBT (Total Blocking Time) | < 300 ms | Good < 200 ms |
| CLS (Cumulative Layout Shift) | < 0.1 | Good < 0.1 |
| Performance score | >= 0.85 | — |

### Baseline v2.54.0 — 2026-05-09

Mesure : local `npx serve -s . -l 3001`, Playwright Chromium 1217, preset desktop, 1 run/URL.

| Theme | Mode | LCP (ms) | TBT (ms) | CLS | Score |
|-------|------|----------|----------|-----|-------|
| msyx | dark | 291 | 0 | 0 | 1.0 |
| msyx | light | 290 | 49 | 0 | 1.0 |
| acssi | dark | 253 | 0 | 0 | 1.0 |
| acssi | light | 251 | 0 | 0 | 1.0 |
| nhood | dark | 292 | 0 | 0 | 1.0 |
| nhood | light | 265 | 0 | 0 | 1.0 |

Fichier source : `lhci-baseline.json`

Observations : toutes les combinaisons sont tres en dessous des seuils. LCP autour de 250-292 ms (seuil 2 500 ms). TBT quasi-nul. CLS nul. Score parfait sur les 6 runs.

### Mise a jour de la baseline

1. Lancer un serveur local :
   ```bash
   npx serve -s . -l 3001 &
   ```
2. Executer lhci :
   ```bash
   CHROMIUM_PATH=/home/deployer/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome npx lhci autorun
   ```
3. Extraire les metriques depuis `.lighthouseci/lhr-*.json` :
   ```bash
   for f in .lighthouseci/lhr-*.json; do
     python3 -c "
   import json; d=json.load(open('$f'))
   print(d['requestedUrl'],
     'LCP', round(d['audits']['largest-contentful-paint']['numericValue']),
     'TBT', round(d['audits']['total-blocking-time']['numericValue']),
     'CLS', d['audits']['cumulative-layout-shift']['numericValue'],
     'Score', d['categories']['performance']['score'])
   "
   done
   ```
4. Mettre a jour `lhci-baseline.json` avec les nouvelles valeurs et la date du jour.
5. Killer le serveur : `kill $(lsof -ti:3001)`

---

## 3. Workflows CI

### Fichiers

| Workflow | Fichier | Declencheur | Outil |
|----------|---------|-------------|-------|
| CI general | `.github/workflows/ci.yml` | push/PR → main | check-diacritics + perf-budget.sh |
| Lighthouse | `.github/workflows/perf.yml` | push/PR → main | lhci autorun (6 URLs) |
| A11y | `.github/workflows/a11y.yml` | push/PR → main | Playwright + axe-core (dry-run) |
| Visual | `.github/workflows/visual.yml` | push/PR → main | Playwright screenshots (108 baselines) |

### Interactions

```
push/PR
  ├── ci.yml          → lint HTML + perf-budget.sh (gzip warn-only) → GITHUB_STEP_SUMMARY
  ├── perf.yml        → serve + lhci (6 runs) → artifact .lighthouseci/ + rapport public
  ├── a11y.yml        → serve + Playwright axe-core → artifact docs/audit-a11y-*.md
  └── visual.yml      → Playwright screenshots → compare 108 baselines
```

Tous les workflows utilisent `continue-on-error: true` sur les etapes de mesure — ils passent toujours en vert meme si un seuil est depasse. Seul le workflow `visual.yml` peut bloquer sur regression visuelle detectee (diff non attendu).

### Artefacts produits

- `lighthouse-report/` : 6 rapports HTML Lighthouse (30 jours de retention)
- `audit-a11y-report/` : rapport markdown axe-core
- `.lighthouseci/` (local) : JSON bruts — source pour mise a jour baseline

---

## 4. Faux positifs et mode warn-only

### Pourquoi warn-only ?

Le DS est un site statique servi par Caddy sans backend. Les metriques Lighthouse sont tres bonnes (score 1.0 sur les 6 runs actuels) mais peuvent varier selon :

- La charge CPU du runner CI (GitHub Actions shared runners, variable)
- Les Google Fonts (chargement reseau depuis CDN — peut ajouter 50-200 ms de TBT)
- Le nombre de composants JS charges (page composants = la plus lourde)

Passer en block-mode avec un seuil TBT < 200 ms risque de bloquer des PRs valides a cause de variance CI. Le mode warn-only permet de collecter des donnees sur plusieurs sprints avant de fixer un seuil stable.

### Faux positifs observes

| Metrique | Source probable | Frequence |
|----------|----------------|-----------|
| TBT spike (50-100 ms) | Google Fonts render-blocking | Occasionnel |
| LCP +50 ms | Runner CI sous charge | Rare |
| CLS | Jamais observe — images pas de dimensions | — |

### Quand passer en block-mode ?

Criteres suggeres pour S31+ :

1. 5 sprints conseutifs sans depassement de seuil en CI
2. Revision des seuils a la baisse : LCP < 1 500 ms, TBT < 150 ms
3. Decision Mike + bilan retro sprint

Pour activer le block-mode, editer `lighthouserc.cjs` :
```js
// Remplacer 'warn' par 'error'
'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
'total-blocking-time': ['error', { maxNumericValue: 150 }],
```

Et dans `ci.yml`, retirer `continue-on-error: true` du step perf-budget.

---

## 5. Procedure update baseline — exemple concret

### Scenario : PR #999 ajoute le composant "Timeline interactive"

Le composant ajoute 2 KB de CSS et 3 KB de JS, ce qui fait depasser le seuil `components.js` de 500 B.

**Etape 1 — Verifier le depassement**

```bash
./shared/perf-budget.sh
# WARN  shared/components.js  34 700 B  > seuil 35 896 B  [OK]
# ... ou si la limite est atteinte :
# WARN  shared/components.js  36 500 B  > seuil 35 896 B  [OVER +604 B]
```

**Etape 2 — Evaluer si le depassement est acceptable**

Question : le composant ajoute-t-il une valeur suffisante pour justifier +604 B gzip ?
Si oui, mettre a jour la baseline. Si non, optimiser le CSS/JS avant de merger.

**Etape 3 — Regenerer la baseline gzip**

```bash
./shared/perf-budget.sh --json
# Nouvelle baseline : 36 500 B → seuil : 36 500 * 1.05 = 38 325 B
```

Editer `shared/perf-budget.json` :
```json
{
  "path": "shared/components.js",
  "threshold_bytes": 38325,
  "baseline_bytes": 36500,
  "note": "JS partage — ajout Timeline interactive (v2.55.0)"
}
```

**Etape 4 — Re-run Lighthouse si changement visuel important**

Si le composant ajoute un element LCP (image, texte large), relancer lhci et mettre a jour `lhci-baseline.json`.

**Etape 5 — Commiter**

```bash
git add shared/perf-budget.json lhci-baseline.json
git commit -m "perf: bump budgets — Timeline interactive (v2.55.0)"
```

---

## Reference rapide

```bash
# Gzip budget
./shared/perf-budget.sh

# Lighthouse 6 runs (serveur local requis)
npx serve -s . -l 3001 &
CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome npx lhci autorun
kill $(lsof -ti:3001)

# Voir les resultats bruts
ls .lighthouseci/lhr-*.json
```
