/**
 * status-tint-contrast.spec.ts — le texte des badges, alertes et chips sémantiques est lisible
 * sur sa TEINTE de statut, dans les 10 combos (#1050)
 *
 * Le défaut : ces composants posent leur texte (`--status-{success,warn,error,info}-fg`,
 * `--badge-primary-fg`, `--neutral-text-on-raised`) sur une teinte translucide
 * `color-mix(in srgb, X N%, transparent)` — 8 % (`.alert-*`), 10 % (`.badge-*`, `.alert--kpi`),
 * 12 % (`.chip-{success,warning,danger}`) — elle-même posée sur le fond du parent. Mesuré au groom
 * #1050 : 3,46 à 4,56:1 en ACSSI, Nhood, Auchan et Noël clairs, 3,53 en ACSSI sombre sur
 * `--surface-solid`, 4,24 pour `.badge-primary` en MSYX clair. Le correctif règle à la mesure les
 * valeurs des tokens (themes/*.json, tokens.css) et donne à `.badge-primary` un token dédié.
 *
 * Méthode — composition calculée (arbitrage 6 de la spec #1050) : les fonds sont des aplats sans
 * dégradé, donc la couleur que lit l'utilisateur se calcule exactement à partir des couleurs
 * résolues par Chromium (`getComputedStyle`) :
 *   1. couleur du texte (`color`, alpha = 1 asserté) ;
 *   2. `backgroundColor` de chaque ancêtre, du nœud jusqu'au premier fond opaque, composés en
 *      sRGB (alpha « over ») — la teinte du composant est l'un de ces calques ;
 *   3. ratio WCAG 2.x entre le texte et ce fond composé.
 * Gardes de validité (sinon la composition calculée ment) : aucun `background-image` sous le
 * premier fond opaque, aucune `opacity` < 1 dans toute la chaîne, un fond opaque atteint.
 *
 * Tests :
 *   1. fixture `status-tint-contrast-1050.html` — chaque variante sur les 4 fonds parents de
 *      référence (`page`, `surface`, `surface-solid`, `primary-light`, ceux de #981) ; chaque
 *      `data-probe` ≥ 4,5:1 (BLOQUANT) ; l'ensemble des `data-probe` = PROBES ;
 *   2. showcase — `pages/composants.html#badges` et `pages/feedback.html#alerts` : tout élément
 *      visible porteur de texte direct dans un `.badge-*` / `.alert-*` sémantique ≥ 4,5:1 ;
 *   3. complétude (Node `fs`, joué une fois, dans `msyx-dark-desktop`) : `--badge-primary-fg`,
 *      `--tag-fg`, `--chip-accent-fg` (t2) et `--accent-tint-fg` (t3) sont
 *      déclarés en hex littéral à 6 chiffres dans `tokens.css` (`:root` + `[data-mode="light"]`)
 *      et dans `modes.dark` + `modes.light` de CHAQUE `themes/*.json`.
 *
 * Joué dans les 10 projets desktop de playwright.config.ts (thème/mode lus dans le nom du
 * projet) ; sauté sur les `*-mobile` (le contraste ne dépend pas du viewport).
 *
 * Ne JAMAIS baisser CONTRAST_MIN ni retirer une sonde pour passer : on règle le token (cible 4,6).
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - M1 : ACSSI clair `--status-success-fg` remis à #15803d → test 1 rouge sur acssi-light ;
 *   - M2 : `.badge-primary` remis sur `var(--accent-light)` → rouge sur msyx-light, auchan-light ;
 *   - M3 : `--badge-primary-fg` retiré de themes/noel.json `modes.light` → test 3 rouge.
 *   t2 (texte accent sur teinte accent : `.tag`, `.chip-accent`, `.chip-filter.active`) :
 *   - M4 : `.tag` remis sur `var(--accent-light)` → 5 sondes rouges : msyx-light `tag|primary-light`
 *     (4,33), auchan-light `tag|*` (4 fonds, 3,83 à 4,35) ;
 *   - M5 : Auchan clair `--accent-text-strong` remis à #e0001a → 4 sondes rouges : auchan-light
 *     `chip-filter-active|*` (2,83 à 3,17) ;
 *   - M6 : `--chip-accent-fg` retiré de themes/acssi.json `modes.dark` → test 3 rouge, qui nomme
 *     « themes/acssi.json modes.dark : --chip-accent-fg absent ».
 *   t3 (8 autres règles texte accent sur teinte accent, token `--accent-tint-fg` réglé à 14 %) :
 *   - M7 : `.version-notes .timeline-content h4 .badge` remis sur `var(--accent-light)` → 8 sondes
 *     rouges : msyx-light `version-notes-badge|*` (4,05 à 4,40), auchan-light (3,45 à 3,90) ;
 *   - M8 : `.breadcrumbs a:hover` remis sur `var(--accent-light)` → 4 sondes rouges (preuve que le
 *     SURVOL est bien mesuré) : msyx-light `breadcrumbs-link-hover|primary-light` (4,42), auchan-light
 *     `|primary-light` (3,96), `|page` (4,34), `|surface` (4,49) ;
 *   - M9 : `--accent-tint-fg` retiré de themes/auchan.json `modes.light` → test 3 rouge, qui nomme
 *     « themes/auchan.json modes.light : --accent-tint-fg absent ».
 */
import { test, expect } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const FIXTURE = "/visual-tests/fixtures/status-tint-contrast-1050.html";
const CONTRAST_MIN = 4.5;
const ENFORCE = true;

// Fonds parents de référence (#981) — ids figés, repris par toute sonde de teinte future.
const PARENTS = ["page", "surface", "surface-solid", "primary-light"] as const;
// Variantes et slots posés par la fixture : `<variante>[>slot]`.
const VARIANTS = [
  ...["primary", "success", "warning", "danger", "info", "neutral"].map(
    (v) => `badge-${v}`,
  ),
  ...["success", "warning", "danger"].map((v) => `chip-${v}`),
  // t2 : texte ACCENT sur teinte accent — `.tag` (8 %, `--tag-fg`), `.chip-accent` (12 %,
  // `--chip-accent-fg`), `.chip-filter.active` (25 %, `--accent-text-strong` : pire teinte des
  // usages de ce token, `grep -rn -- '--accent-text-strong' shared`).
  "tag",
  "chip-accent",
  "chip-filter-active",
  // t3 : les 8 autres règles « texte accent sur teinte accent » (6 à 14 %) lisent
  // `--accent-tint-fg`, réglé à la pire teinte de ses usages (14 %, badge des notes de version).
  "dropdown-option-selected", // .dropdown-option.selected (8 %)
  "dropdown-tag", // .dropdown-tag (8 %)
  "tree-leaf-selected", // .tree-item.selected.tree-leaf (12 %)
  "activity-filter-chip-active", // .activity-filter-chip.active (10 %)
  "activity-tag", // .activity-tag (10 %)
  "breadcrumbs-link-hover", // .breadcrumbs a:hover (6 %) — `data-hover` : survolé avant la mesure
  "backlog-filter-active", // .backlog-filters .btn-filter.active (10 %)
  "version-notes-badge", // .version-notes .timeline-content h4 .badge (14 %)
  ...["info", "success", "warning", "danger", "neutral"].flatMap((v) => [
    `alert-${v}`,
    `alert-${v}>title`,
    `alert-${v}>desc`,
  ]),
  ...["info", "success", "warning", "danger", "neutral"].flatMap((v) => [
    `kpi-${v}>title`,
    `kpi-${v}>value`,
  ]),
];
const PROBES: readonly string[] = PARENTS.flatMap((p) =>
  VARIANTS.map((v) => `${v}|${p}`),
);

type Theme = "msyx" | "acssi" | "nhood" | "auchan" | "noel";
type Mode = "dark" | "light";
type Rgb = [number, number, number];

const parseProjectName = (name: string): { theme: Theme; mode: Mode } => {
  const parts = name.split("-");
  return { theme: parts[0] as Theme, mode: parts[1] as Mode };
};

// --- WCAG 2.x ---
const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const hex = ([r, g, b]: Rgb): string =>
  "#" +
  [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

type Cell = {
  probe: string;
  fg: [number, number, number, number] | null;
  fgCss: string;
  bg: Rgb | null;
  invalid: string[];
};

/**
 * Mesure DANS la page : couleur du texte + fond composé de chaque nœud ciblé.
 * `mode = "fixture"` : les `[data-probe]` ; `mode = "showcase"` : les nœuds texte des
 * `.badge-*` / `.alert-*` sémantiques sous `root`.
 */
async function measure(
  page: Page,
  mode: "fixture" | "showcase",
  root: string,
  only = "[data-probe]",
): Promise<Cell[]> {
  return page.evaluate(
    ({ mode, root, only }) => {
      const parse = (css: string): [number, number, number, number] | null => {
        const legacy = css.match(/^rgba?\(([^)]+)\)$/);
        if (legacy) {
          const p = legacy[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(Number);
          return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
        }
        const srgb = css.match(/^color\(srgb ([^)]+)\)$/);
        if (srgb) {
          const p = srgb[1]
            .split(/[\s/]+/)
            .filter(Boolean)
            .map(Number);
          return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1];
        }
        return null;
      };
      const desc = (n: Element): string =>
        n.tagName.toLowerCase() +
        (n.id ? `#${n.id}` : "") +
        (n.classList.length ? "." + [...n.classList].join(".") : "");

      const cell = (el: Element, probe: string) => {
        const invalid: string[] = [];
        const fgCss = getComputedStyle(el).color;
        const fg = parse(fgCss);
        if (!fg) invalid.push(`couleur de texte illisible (${fgCss})`);
        const layers: [number, number, number, number][] = [];
        let base: [number, number, number, number] | null = null;
        for (let n: Element | null = el; n; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (parseFloat(s.opacity) < 1)
            invalid.push(`opacity ${s.opacity} sur ${desc(n)}`);
          if (base) continue; // au-delà du fond opaque : seule l'opacité compte
          if (s.backgroundImage !== "none")
            invalid.push(`background-image sur ${desc(n)}`);
          const bg = parse(s.backgroundColor);
          if (!bg) {
            invalid.push(
              `fond illisible sur ${desc(n)} (${s.backgroundColor})`,
            );
            continue;
          }
          if (bg[3] >= 1) base = bg;
          else if (bg[3] > 0) layers.push(bg);
        }
        let bg: [number, number, number] | null = null;
        if (!base) invalid.push("aucun fond opaque dans la chaîne d'ancêtres");
        else {
          let c: [number, number, number] = [base[0], base[1], base[2]];
          // du calque le plus externe au plus interne (layers est rempli de l'intérieur vers l'extérieur)
          for (let i = layers.length - 1; i >= 0; i--) {
            const [r, g, b, a] = layers[i];
            c = [
              r * a + c[0] * (1 - a),
              g * a + c[1] * (1 - a),
              b * a + c[2] * (1 - a),
            ];
          }
          bg = c;
        }
        return { probe, fg, fgCss, bg, invalid };
      };

      if (mode === "fixture") {
        return [...document.querySelectorAll(only)].map((el) =>
          cell(el, el.getAttribute("data-probe")!),
        );
      }

      // showcase : conteneurs sémantiques, puis leurs nœuds porteurs de texte direct visibles
      const VARIANT =
        /^(badge|alert)-(primary|success|warning|danger|info|neutral)$/;
      const out: ReturnType<typeof cell>[] = [];
      const scope = document.querySelector(root);
      if (!scope) return out;
      const containers = [...scope.querySelectorAll("[class]")].filter((c) =>
        [...c.classList].some((k) => VARIANT.test(k)),
      );
      for (const c of containers) {
        const variant = [...c.classList].find((k) => VARIANT.test(k))!;
        for (const el of [c, ...c.querySelectorAll("*")]) {
          // nœud rattaché à SON conteneur sémantique le plus proche (pas un badge imbriqué)
          // containers est en ordre document : le dernier qui contient `el` est le plus proche.
          const owner = [...containers].reverse().find((k) => k.contains(el));
          if (owner !== c) continue;
          if (el.closest('[aria-hidden="true"]')) continue;
          const direct = [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          );
          if (!direct) continue;
          const s = getComputedStyle(el);
          if (s.visibility !== "visible" || el.getClientRects().length === 0)
            continue;
          const text = (el.textContent ?? "").trim().slice(0, 24);
          out.push(cell(el, `${variant} ${desc(el)} « ${text} »`));
        }
      }
      return out;
    },
    { mode, root, only },
  );
}

/** Thème/mode du projet posés AVANT le chargement (script anti-FOUC de la page). */
async function open(page: Page, url: string, theme: Theme, mode: Mode) {
  await page.addInitScript(
    ({ t, m }: { t: string; m: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { t: theme, m: mode },
  );
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({
    content:
      "*,*::before,*::after{transition:none!important;animation:none!important}",
  });
}

async function assertCombo(
  page: Page,
  projectName: string,
  theme: Theme,
  mode: Mode,
) {
  const applied = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    mode: document.documentElement.getAttribute("data-mode"),
  }));
  expect(applied.theme ?? "msyx", `${projectName}: data-theme appliqué`).toBe(
    theme,
  );
  expect(applied.mode ?? "dark", `${projectName}: data-mode appliqué`).toBe(
    mode,
  );
}

/** Validité + seuil, cellule par cellule ; une cellule fautive est nommée. */
async function report(
  cells: Cell[],
  projectName: string,
  label: string,
  testInfo: TestInfo,
) {
  const rows = cells.map((c) => {
    const fg: Rgb | null = c.fg ? [c.fg[0], c.fg[1], c.fg[2]] : null;
    const ratio = fg && c.bg ? contrast(fg, c.bg) : NaN;
    return { ...c, ratio };
  });
  console.log(
    `\n[status-tint #1050] ${projectName} ${label} (seuil ${CONTRAST_MIN}:1)\n` +
      rows
        .map(
          (r) =>
            `${projectName.padEnd(20)} ${r.probe.padEnd(34)} ` +
            `${Number.isFinite(r.ratio) ? r.ratio.toFixed(2).padStart(5) : "  n/a"}` +
            `${r.ratio < CONTRAST_MIN ? "<" : " "} texte=${r.fg ? hex([r.fg[0], r.fg[1], r.fg[2]]) : "?"} fond=${r.bg ? hex(r.bg) : "?"}`,
        )
        .join("\n"),
  );
  await testInfo.attach(`status-tint-${label}.json`, {
    contentType: "application/json",
    body: JSON.stringify(
      rows.map((r) => ({
        probe: r.probe,
        text: r.fg ? hex([r.fg[0], r.fg[1], r.fg[2]]) : null,
        bg: r.bg ? hex(r.bg) : null,
        ratio: Math.round(r.ratio * 100) / 100,
        invalid: r.invalid,
      })),
      null,
      2,
    ),
  });

  for (const r of rows) {
    expect
      .soft(r.invalid, `${projectName} ${r.probe}: sonde invalide`)
      .toEqual([]);
    expect
      .soft(
        r.fg?.[3],
        `${projectName} ${r.probe}: le texte doit être opaque (alpha = 1, ${r.fgCss})`,
      )
      .toBe(1);
    if (ENFORCE) {
      expect
        .soft(
          r.ratio >= CONTRAST_MIN,
          `${projectName} ${r.probe} = ${Number.isFinite(r.ratio) ? r.ratio.toFixed(2) : "n/a"}:1 < ${CONTRAST_MIN}`,
        )
        .toBe(true);
    }
  }
}

test.describe("Texte sur fond de statut teinté — 10 combos (#1050)", () => {
  test("fixture : badges, alertes, KPI et chips sur les 4 fonds de référence", async ({
    page,
  }, testInfo) => {
    const projectName = testInfo.project.name;
    test.skip(
      projectName.endsWith("-mobile"),
      "le contraste ne dépend pas du viewport : desktop seulement",
    );
    const { theme, mode } = parseProjectName(projectName);
    await open(page, FIXTURE, theme, mode);
    await assertCombo(page, projectName, theme, mode);

    const cells = await measure(page, "fixture", "#bench");
    // t3 — état de SURVOL (`.breadcrumbs a:hover`) : chaque `[data-hover]` est survolé puis
    // re-mesuré seul. Garde : le fond composé doit changer au survol, sinon la mesure porterait
    // sur l'état de repos (texte atténué sans teinte) et passerait pour la mauvaise raison.
    const hovered = await page
      .locator("[data-hover]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-probe")!));
    for (const probe of hovered) {
      const sel = `[data-probe="${probe}"]`;
      const i = cells.findIndex((c) => c.probe === probe);
      const rest = cells[i];
      await page.locator(sel).hover();
      const [hot] = await measure(page, "fixture", "#bench", sel);
      if (rest?.bg && hot.bg && hex(rest.bg) === hex(hot.bg))
        hot.invalid.push(`survol non appliqué (fond ${hex(hot.bg)} inchangé)`);
      cells[i] = hot;
    }
    await page.mouse.move(0, 0);
    expect(
      cells.map((c) => c.probe).sort(),
      `${projectName}: data-probe de la fixture = PROBES du spec`,
    ).toEqual([...PROBES].sort());
    await report(cells, projectName, "fixture", testInfo);
  });

  for (const { url, root } of [
    { url: "/pages/composants.html", root: "#badges" },
    { url: "/pages/feedback.html", root: "#alerts" },
  ]) {
    test(`showcase : ${url}${root}`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;
      test.skip(
        projectName.endsWith("-mobile"),
        "le contraste ne dépend pas du viewport : desktop seulement",
      );
      const { theme, mode } = parseProjectName(projectName);
      await open(page, url, theme, mode);
      await assertCombo(page, projectName, theme, mode);

      const cells = await measure(page, "showcase", root);
      expect(
        cells.length,
        `${projectName} ${url}${root}: aucun texte de badge/alerte trouvé`,
      ).toBeGreaterThan(0);
      await report(cells, projectName, `showcase${root}`, testInfo);
    });
  }

  test("complétude : tokens dédiés déclarés en hex littéral dans les 4 couches", async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "msyx-dark-desktop",
      "contrôle de sources : joué une seule fois",
    );
    const repo = path.resolve(__dirname, "..");
    // t1 : --badge-primary-fg ; t2 : --tag-fg, --chip-accent-fg (texte accent sur teinte accent) ;
    // t3 : --accent-tint-fg (les 8 autres règles texte accent sur teinte accent, réglé à 14 %).
    const TOKENS = [
      "--badge-primary-fg",
      "--tag-fg",
      "--chip-accent-fg",
      "--accent-tint-fg",
    ];
    const HEX6 = /^#[0-9a-fA-F]{6}$/;
    const missing: string[] = [];

    const css = fs
      .readFileSync(path.join(repo, "shared", "css", "tokens.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const selector of [":root", '[data-mode="light"]']) {
      const bodies = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => m[1].trim() === selector)
        .map((m) => m[2])
        .join("\n");
      for (const TOKEN of TOKENS) {
        const decl = bodies.match(new RegExp(`${TOKEN}\\s*:\\s*([^;]+);`));
        if (!decl || !HEX6.test(decl[1].trim()))
          missing.push(
            `shared/css/tokens.css ${selector} : ${TOKEN} ${decl ? `= ${decl[1].trim()} (pas un hex à 6 chiffres)` : "absent"}`,
          );
      }
    }

    const themesDir = path.join(repo, "themes");
    const files = fs
      .readdirSync(themesDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    expect(
      files.length,
      "themes/*.json : au moins les 5 thèmes du DS",
    ).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const json = JSON.parse(fs.readFileSync(path.join(themesDir, f), "utf8"));
      for (const m of ["dark", "light"]) {
        for (const TOKEN of TOKENS) {
          const v = json?.modes?.[m]?.[TOKEN];
          if (typeof v !== "string" || !HEX6.test(v))
            missing.push(
              `themes/${f} modes.${m} : ${TOKEN} ${v === undefined ? "absent" : `= ${v} (pas un hex à 6 chiffres)`}`,
            );
        }
      }
    }
    expect(
      missing,
      `token dédié manquant ou non littéral :\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
