# msyx Design System — Improvement Plan

> **TL;DR.** You have a remarkably mature DS for a solo/small-team operation: 87 components, 3 themes × 2 modes, automated sync, an auth gate, a registry, 17 sprints at 100% velocity. The **engineering hygiene is excellent**. The opportunities sit in **brand definition, AI/agent legibility, iconography, and component composition**, not in plumbing.
>
> Below: a structured audit (Strengths → Risks → Concrete fixes), then a prioritised plan with effort estimates.

---

## ✅ What's working — keep doing this

| Area | Why it's strong |
|---|---|
| **Token architecture (4-layer cascade)** | `:root → [data-theme] → [data-mode] → [data-theme][data-mode]` is textbook and lets ACSSI/Nhood ship cleanly. Don't change it. |
| **`@ds-version` discipline** | Pre-allocating versions for multi-bump sprints (decision 2026-05-01) is *exactly* what mature teams do. Ship the convention into `CLAUDE.md` formally. |
| **Self-hosted fonts** | woff2, latin + latin-ext, `font-display: swap`. No CDN runtime tax. |
| **Anti-FOUC inline script** | Synchronous head script setting `data-theme` + `data-mode` before paint — correct pattern. |
| **Consumer guide + sync scripts** | `sync-all.sh`, `check-sync.sh`, `consumers.json`, `check-components.sh` — most teams never get here. |
| **A11y recalibration on light themes** | The `--text-muted` recalibration to `2c4358` (5.45:1 on white) shows you're auditing contrast properly. Excellent. |
| **Status token triplets** (`--status-error-fg/bg/border`) | The right way to scale alert/input/button error states across themes. Generalize this pattern. |

---

## ⚠️ Risks & gaps — what to challenge

### 1. Brand identity is **palette-deep, not motif-deep**
**Symptom.** Strip the colors and the system reads as "generic dark dashboard with glassmorphism." MSYX has no recognizable wordmark beyond a gradient square that says "DS"; no signature illustration; no spatial motif (rhythm, asymmetry, custom radius progression).

**Fix.**
- Commission or self-design a **wordmark SVG** (`assets/logo-msyx.svg`). Required for marketing surfaces and OG images.
- Define one **spatial signature** — e.g. "every section starts with an `overline` chip + 2 px gradient underline" or "all cards have a 1 px gradient border on the top edge only". Pick one. Document it.
- The **noise overlay** at 0.015 is great — promote it from "implementation detail" to documented motif. Name it `--texture-grain` and call it out in `fondation.html`.

### 2. Iconography is **the biggest debt**
**Symptom.** Mix of HTML entities (`&#9654;`), emoji (🧩 🚀), and hand-rolled SVG. No size scale, no stroke-weight contract, inconsistent optical alignment. Tooling like AKSY will have to keep inventing icons.

**Fix.**
- **Adopt Lucide** (MIT, 1.5 px stroke, 1400+ glyphs, matches geometric Space Grotesk feel). Ship as a self-hosted sprite at `shared/icons/sprite.svg` + an `<svg><use href="#icon-name"/></svg>` convention.
- Define `--icon-size-sm/md/lg` (16/20/24 px) and `--icon-stroke` (1.5 by default).
- Strip emoji from notification cards — replace with semantic icons (`bell`, `check`, `rocket`).
- Reserve emoji for **user-generated content only** (chat, comments). Never UI chrome.

### 3. Component CSS is **monolithic** (`components.css` = 171 KB)
**Symptom.** Single 171 KB file means consumers pay for the whole DS even if they need 3 components. AKSY's bundle is bigger than it should be.

**Fix.**
- Split `components.css` into **per-component files** (`components/buttons.css`, `components/cards.css`, …) and aggregate via `@import` in `components.css`.
- Add an **opt-in barrel** (`components-core.css` = buttons + cards + forms + alerts only, ~30 KB). Most consumers stop there.
- Ship a **tree-shake guide** in `CONSUMER_GUIDE.md`: copy individual files via `sync-all.sh --components buttons,cards,alerts`.

### 4. **AI/agent ergonomics** are missing
**Symptom.** You're using Claude Code; this project is a perfect agent target. But there's no `SKILL.md`, no machine-readable component manifest with usage examples, no "ten canonical pages" reference set for agents to imitate.

**Fix.**
- Ship a **`SKILL.md` at repo root** (this project includes one — copy it). User-invocable.
- Enrich `components-registry.json` with `examples: [{ html, screenshot }]` per component. Agents copy from examples; they'll never compose from prose.
- Add a **`canonical-pages/` folder**: 5-7 fully-built pages (login, settings, kanban dashboard, empty-state, error 404, billing) that agents can mimic. Currently agents must reverse-engineer from `pages/composants.html` which is a *demo book*, not a *usage book*.
- Pin a **`prompts.md`** with phrasing the team uses ("Use msyx tokens. No hardcoded hex. Glass cards on dark, solid cards on light.").

### 5. Type system has **8 sizes but no rhythm rules**
**Symptom.** You have `text-xs/sm/base/lg/xl` and `typo-display/h1/h2/h3/h4` but no documented vertical rhythm or pairing rules. New components invent their own line-heights.

**Fix.**
- Adopt a **modular scale** (1.25 ratio: 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49 px). Round to your existing values where possible.
- Document `--lh-tight/snug/base/relaxed` *and* a pairing rule: "h2 pairs with body-lg + lh-base; h4 pairs with small + lh-base".
- Bake into `colors_and_type.css` (this project provides one — see `--type-h1`, `--type-body` etc.).

### 6. **Naming inconsistencies** (low-effort, high-payoff)
- French copy oscillates between "coherente" and "cohérente". **Standardize on full diacritics.** A grep + lint rule catches it.
- `--radius` (no suffix) vs `--radius-md` (12 px) is confusing — `--radius` is 16, `--radius-md` is 12. **Rename `--radius` → `--radius-lg-default` or just deprecate it** and force everyone to pick a step.
- `--border` (a colour) vs `--border-width` (a length) — the colour token should be `--border-color`. Same problem with `--shadow`.
- `--violet`, `--cyan`, `--pink` are *named* but not in the semantic system. Either promote them to `--accent-2/3/4` (semantic) or move them to a "decorative" namespace (`--deco-violet`).

### 7. **Glassmorphism + `backdrop-filter` perf**
**Symptom.** Multiple stacked blur layers (sidebar + modal + toast) on a low-end Android = jank.

**Fix.**
- Cap concurrent blur layers to 2.
- Add a media query `@supports not (backdrop-filter: blur(20px))` fallback to solid `--surface-solid` with 0.95 opacity.
- Document the rule: "Glass for chrome (header/sidebar/modal). Solid for content (cards, lists, tables)."

### 8. **No motion/animation system documentation page**
You have `--duration-*` and `--ease-*` tokens but no demo page. Animation is invisible without a reference. **Add `pages/motion.html`** with: durations laid out as colored bars, easing curves drawn as SVG, and 6 canonical patterns (fade-in, slide-up, scale-in, stagger, skeleton-shimmer, success-bounce).

### 9. **Theming UX**: a 3rd theme is a **second-class citizen**
ACSSI dark+light works. Nhood works. But the "Add a theme" docs say "1 bloc CSS + 1 entrée THEME_CONFIG + 1 option select" — that's **5 files to touch**. Centralize.

**Fix.**
- Ship a **theme generator script** (`shared/scaffold-theme.sh nhood-secondary`) that creates the CSS block, registers the theme in `THEME_CONFIG`, and updates the select.
- Or: define themes as JSON (`themes/nhood.json`) and compile to CSS at build time. Single source of truth, automatable.

### 10. **No visual regression tests**
**Symptom.** 17 sprints in, 87 components, 3 themes × 2 modes = 522 surface states. You can't be eyeballing all of these on every PR.

**Fix.**
- Set up **Playwright + percy/argos/lost-pixel** snapshots of `pages/*.html` on every commit, per theme/mode combination.
- 30 minutes of setup. Pays back in the first week.

---

## 📋 Prioritised plan

| Priority | Item | Effort | Payoff |
|---|---|---|---|
| **P0** | Iconography system (Lucide sprite + tokens) | M (1 sprint) | Ends biggest UX inconsistency |
| **P0** | `SKILL.md` + canonical-pages folder for agents | S (½ sprint) | Unlocks Claude Code velocity 3-5× |
| **P0** | Visual regression tests (Playwright + lost-pixel) | S (½ sprint) | Prevents theme drift forever |
| **P1** | Split `components.css` into per-component files | M (1 sprint) | Better consumer bundle, easier code review |
| **P1** | Token naming cleanup (`--border` → `--border-color`, etc.) | S (1 day) | Prevents future debt; do it before more consumers ship |
| **P1** | Motion reference page (`pages/motion.html`) | S (1 day) | Fills the only fully-undocumented foundation |
| **P1** | Brand motif decision — wordmark + spatial signature | M (1 sprint, partly off-keyboard) | Unlocks marketing surfaces, OG images |
| **P2** | Theme generator script / JSON-compiled themes | M (1 sprint) | Lowers cost of next theme to <30 min |
| **P2** | Type modular scale + pairing rules | S (1 day) | Stops new components inventing sizes |
| **P2** | `backdrop-filter` perf guard + fallback | XS (2 h) | Cheap robustness win |
| **P3** | Diacritic / copy lint | XS (2 h) | Cosmetic; do it on a slow afternoon |
| **P3** | Promote noise texture to documented motif (`--texture-grain`) | XS (1 h) | Costs nothing; reinforces brand |

**Suggested sprint plan**

- **Sprint 18 — "Agent-ready"** : `SKILL.md`, canonical-pages folder, registry examples, Playwright tests. (P0 ×2 + P1 ×1)
- **Sprint 19 — "Iconography"** : Lucide sprite, `<Icon>` convention, strip emoji, document. (P0 ×1)
- **Sprint 20 — "Refactor & motion"** : split `components.css`, motion page, token rename. (P1 ×3)
- **Sprint 21 — "Brand & theme"** : wordmark, spatial signature, theme generator. (P1 ×1 + P2 ×1)

That's **4 sprints** to a system that is simultaneously: more consistent, more scalable, more agent-friendly, and visually more "msyx" rather than "generic dark dashboard."

---

## 🎯 What you can approve right now

If you want to act on this in the next 30 minutes, pick from this menu and I'll execute:

1. **Generate the Lucide sprite + `<Icon>` convention** (drop-in for `shared/icons/`, with a 50-glyph starter set covering everything in the live site).
2. **Write the `SKILL.md` + 5 canonical pages** for Claude Code agent consumption, formatted to drop into your repo.
3. **Refactor token names** with a codemod script (sed-based, safe, idempotent) covering `--border` → `--border-color`, etc., across CSS + HTML + JS.
4. **Set up the Playwright visual regression rig** as a single PR (config + 8 page captures × 5 theme/mode combos).
5. **Draft a wordmark in 4 directions** (geometric / monogram / wordmark / lockup) for you to pick from.

Tell me which numbers — I'll do all of them in parallel if you like.
