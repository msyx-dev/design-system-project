/**
 * button-contrast.spec.ts — Sonde de contraste du texte des boutons a fond
 * plein, par ECHANTILLONNAGE DES PIXELS RENDUS (#944).
 *
 * Pourquoi pas axe : sur un fond en degrade, `color-contrast` ne rend qu'un
 * `incomplete`. Pourquoi pas seulement les arrets du degrade : le survol ajoute
 * un reflet blanc (`::before`, `--overlay-white-15`) qui fait perdre 0,4 a 1,0
 * point, et seule la capture voit ce que l'utilisateur lit.
 *
 * Methode, par bouton (`data-probe` de la fixture), dans chaque etat (`rest`
 * puis `hover`) :
 *   1. lit `getComputedStyle(el).color` et asserte alpha = 1 (texte opaque) ;
 *   2. calcule la boite du texte (Range.selectNodeContents) dans le bouton ;
 *   3. passe le texte a `color: transparent`, capture le bouton, restaure ;
 *   4. decode la capture DANS LA PAGE (Image + canvas) — aucune dependance
 *      ajoutee ; seuls les couleurs distinctes sous la boite du texte et leur
 *      effectif reviennent cote Node ;
 *   5. `pixelMin` = contraste WCAG minimal entre la couleur du texte et chaque
 *      pixel echantillonne ;
 *   6. `stopMin` (etat `rest`, cas SOLID) = contraste minimal entre la couleur
 *      du texte et chaque arret `rgb()` opaque de `backgroundImage`.
 *
 * Decisions de mesure :
 * - La couleur de texte comparee est celle EFFECTIVEMENT PEINTE, lue sur une
 *   2e capture (texte visible) : moyenne des pixels a couverture pleine, ceux
 *   qui different le plus de la capture texte masque. Deux effets la
 *   modifient et la couleur calculee (`getComputedStyle().color`) les ignore :
 *     . le reflet `::before` du survol (`--overlay-white-15`) est peint
 *       AU-DESSUS du texte (element positionne) : un texte sombre est
 *       eclairci d'environ 5 % (mesure : #1a0f00 -> ~#261c11) ;
 *     . l'opacite de l'element (`.login-submit:hover { opacity: .85 }`) melange
 *       texte ET fond au banc.
 *   Repli (aucun pixel de texte identifiable) : couleur calculee recomposee
 *   avec l'opacite de l'element.
 * - Etats exclus : `disabled` (opacite .5) et `.btn-loading` — WCAG exempte
 *   les composants inactifs.
 *
 * Tranche T1 (#944) : ENFORCE = false -> la sonde MESURE et RAPPORTE ; les
 * assertions de validite de la sonde (texte opaque, >= 2 arrets, pixels
 * echantillonnes, garde-fou pixel >= arret) restent actives. T3 passe
 * ENFORCE a true, apres reglage des tokens a la mesure.
 *
 * Tranche T2 (#944) : un 2e test, Node pur (fs), verifie la COMPLETUDE des 8
 * tokens `--btn-{primary,danger,success,warning}-bg-{start,end}` : declares en
 * hex litteral dans les 4 couches (tokens.css `:root` + `[data-mode="light"]`,
 * `modes.dark`/`modes.light` des themes/*.json, blocs correspondants de
 * themes.css autogenere, miroir themes/msyx.json). Joue une seule fois
 * (projet `msyx-dark-desktop`), les autres projets le sautent.
 *
 * #968 : `.btn-outline-danger` (fond transparent, teinte `--danger` 8 % au survol)
 * passe de REPORT_ONLY a SOLID, sur ses 2 markups (seul : pages/overlays.html ;
 * combine a `.btn-secondary` : pages/composants.html). Son texte lit le token
 * dedie `--btn-outline-danger-fg` (jamais `--danger-light`, partage avec les
 * statuts) ; le test de completude le couvre dans les memes 4 couches.
 *
 * Tourne dans les 10 projets desktop de playwright.config.ts (theme/mode lus
 * dans le nom du projet, comme visual.spec.ts) ; skip sur les 2 *-mobile
 * (le contraste ne depend pas du viewport).
 */
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const FIXTURE = "/visual-tests/fixtures/button-contrast-944.html";
const CONTRAST_MIN = 4.5;
const ENFORCE = true; // T3 : bloquant (T1 : rapport). Ne JAMAIS baisser CONTRAST_MIN ni retirer un cas de SOLID pour passer.

// Cas bloquants (fond plein) — data-probe de la fixture :
const SOLID = [
  "btn-primary",
  "btn-danger",
  "btn-success",
  "btn-warning",
  "btn-primary-btn-danger",
  "login-submit",
  "login-compact",
  "login-authentik",
  // #968 : `.btn-outline-danger` (fond transparent, teinte au survol) — les 2 markups que le DS livre :
  // `.btn-outline-danger.btn-sm` (pages/overlays.html, popover de confirmation) et
  // `.btn-secondary.btn-outline-danger` (pages/composants.html#buttons).
  "btn-outline-danger",
  "btn-secondary-btn-outline-danger",
];
// Cas en rapport seul (fond translucide ou transparent) :
// - `btn-outline-danger-bare` : la classe NUE (aucun markup du DS ne l'emet) — `.btn-outline-danger` ne pose
//   ni padding ni display, le texte touche donc la bordure et la boite du texte arrondie a l'entier avale la
//   colonne de pixels de la bordure (teinte --danger 30/50 %) : la mesure y lit le contraste de la bordure,
//   pas celui du fond. Mesure et rapport conserves, non bloquants (cf. docs/DS-PRINCIPLES.md §3.3).
const REPORT_ONLY = ["btn-secondary", "btn-ghost", "btn-outline-danger-bare"];

// Tokens de fond dedies (#944 T2) — NOMS FIGES par la spec. Hex litteral dans les
// 4 couches de cascade, jamais derives (--gradient-*, --danger*, ... sont partages hors boutons).
// + `--btn-outline-danger-fg` (#968) : texte de `.btn-outline-danger`, meme forme (hex litteral,
// 10 combos) car `--danger-light` est partage avec les statuts et ne peut pas etre regle pour un bouton.
const BTN_BG_TOKENS = [
  "--btn-primary-bg-start",
  "--btn-primary-bg-end",
  "--btn-danger-bg-start",
  "--btn-danger-bg-end",
  "--btn-success-bg-start",
  "--btn-success-bg-end",
  "--btn-warning-bg-start",
  "--btn-warning-bg-end",
  "--btn-outline-danger-fg",
] as const;

type Theme = "msyx" | "acssi" | "nhood" | "auchan" | "noel";
type Mode = "dark" | "light";
type Rgb = [number, number, number];
type State = "rest" | "hover";

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
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** `rgb(…)`, `rgba(…)` et `color(srgb …)` -> [r, g, b, alpha]. */
const parseColor = (css: string): [number, number, number, number] | null => {
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

/** Arrets `rgb()` de `backgroundImage` ; `opaque` exclut les arrets alpha < 1. */
const parseStops = (bgImage: string): { rgb: Rgb; alpha: number }[] => {
  const out: { rgb: Rgb; alpha: number }[] = [];
  for (const m of bgImage.matchAll(/rgba?\([^)]+\)/g)) {
    const c = parseColor(m[0]);
    if (c) out.push({ rgb: [c[0], c[1], c[2]], alpha: c[3] });
  }
  return out;
};

type Measure = {
  text: Rgb;
  composed: Rgb;
  shown: Rgb;
  textAlpha: number;
  opacity: number;
  bench: Rgb;
  stops: string[];
  stopMin: number | null;
  stopCount: number;
  bgImage: string;
  pixels: number;
  pixelMin: number;
};

/** Une mesure : etat courant du bouton (deja survole ou non par l'appelant). */
async function measureButton(page: Page, probe: string): Promise<Measure> {
  const sel = `[data-probe="${probe}"]`;

  // 1-2. Couleur du texte, opacite effective, boite du bouton et du texte.
  const info = await page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s)!;
    const bench = document.getElementById("bench")!;
    let opacity = 1;
    for (
      let n: HTMLElement | null = el;
      n && n !== document.body;
      n = n.parentElement
    ) {
      opacity *= parseFloat(getComputedStyle(n).opacity);
    }
    const r = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    return {
      color: getComputedStyle(el).color,
      bgImage: getComputedStyle(el).backgroundImage,
      benchBg: getComputedStyle(bench).backgroundColor,
      opacity,
      box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      text: { left: t.left, top: t.top, right: t.right, bottom: t.bottom },
    };
  }, sel);

  const parsed = parseColor(info.color);
  const benchParsed = parseColor(info.benchBg);
  if (!parsed || !benchParsed) {
    throw new Error(
      `${probe}: couleur illisible (${info.color} / ${info.benchBg})`,
    );
  }
  const textRgb: Rgb = [parsed[0], parsed[1], parsed[2]];
  const benchRgb: Rgb = [benchParsed[0], benchParsed[1], benchParsed[2]];

  // Couleur de texte telle qu'affichee, recomposee (repli) si l'element est translucide.
  const a = info.opacity;
  const composedText: Rgb = [0, 1, 2].map(
    (i) => a * textRgb[i] + (1 - a) * benchRgb[i],
  ) as Rgb;

  // 3. Captures du bouton (alignees sur la grille de pixels) : texte VISIBLE
  //    (pour lire la couleur reellement peinte du texte), puis texte MASQUE
  //    (pour lire le fond sous le texte).
  const x = Math.floor(info.box.left);
  const y = Math.floor(info.box.top);
  const w = Math.ceil(info.box.right) - x;
  const h = Math.ceil(info.box.bottom) - y;
  const clip = { x, y, width: w, height: h };
  const pngVisible = await page.screenshot({ clip });
  await page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s)!;
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
  }, sel);
  let png: Buffer;
  try {
    png = await page.screenshot({ clip });
  } finally {
    await page.evaluate((s) => {
      const el = document.querySelector<HTMLElement>(s)!;
      el.style.removeProperty("color");
      el.style.removeProperty("-webkit-text-fill-color");
    }, sel);
  }

  // 4. Decodage dans la page : couleurs distinctes du fond sous la boite du
  //    texte (capture masquee) + couleur peinte du texte = moyenne des pixels
  //    a couverture pleine (ceux qui different le plus entre les 2 captures).
  //    Le reflet `::before` du survol est peint AU-DESSUS du texte, et
  //    l'opacite d'un bouton (`.login-submit:hover`) melange le texte au banc :
  //    seule cette mesure les voit, la couleur nominale les ignore.
  const region = {
    x0: Math.max(0, Math.floor(info.text.left) - x),
    y0: Math.max(0, Math.floor(info.text.top) - y),
    x1: Math.min(w, Math.ceil(info.text.right) - x),
    y1: Math.min(h, Math.ceil(info.text.bottom) - y),
  };
  const decoded = await page.evaluate(
    async ({ hidden, visible, reg }) => {
      const read = async (b64: string) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const x1 = Math.min(reg.x1, cv.width);
        const y1 = Math.min(reg.y1, cv.height);
        return ctx.getImageData(reg.x0, reg.y0, x1 - reg.x0, y1 - reg.y0).data;
      };
      const hid = await read(hidden);
      const vis = await read(visible);
      const seen = new Map<number, number>();
      let maxDelta = 0;
      for (let i = 0; i < hid.length; i += 4) {
        const k = (hid[i] << 16) | (hid[i + 1] << 8) | hid[i + 2];
        seen.set(k, (seen.get(k) ?? 0) + 1);
        const d =
          Math.abs(vis[i] - hid[i]) +
          Math.abs(vis[i + 1] - hid[i + 1]) +
          Math.abs(vis[i + 2] - hid[i + 2]);
        if (d > maxDelta) maxDelta = d;
      }
      const sum = [0, 0, 0];
      let core = 0;
      for (let i = 0; i < hid.length; i += 4) {
        const d =
          Math.abs(vis[i] - hid[i]) +
          Math.abs(vis[i + 1] - hid[i + 1]) +
          Math.abs(vis[i + 2] - hid[i + 2]);
        if (maxDelta > 0 && d >= maxDelta * 0.98) {
          sum[0] += vis[i];
          sum[1] += vis[i + 1];
          sum[2] += vis[i + 2];
          core++;
        }
      }
      return {
        colors: [...seen.entries()],
        maxDelta,
        core,
        glyph: core ? sum.map((v) => v / core) : null,
      };
    },
    {
      hidden: png.toString("base64"),
      visible: pngVisible.toString("base64"),
      reg: region,
    },
  );
  const colors = decoded.colors;
  // Texte effectivement peint ; repli sur la couleur recomposee si aucun pixel
  // de texte n'est identifiable (ecart trop faible entre les 2 captures).
  const shownText: Rgb =
    decoded.glyph && decoded.maxDelta >= 40
      ? (decoded.glyph as Rgb)
      : composedText;

  // 5. pixelMin.
  let pixels = 0;
  let pixelMin = Infinity;
  for (const [k, n] of colors) {
    pixels += n;
    const px: Rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
    pixelMin = Math.min(pixelMin, contrast(shownText, px));
  }

  // 6. stopMin (arrets opaques du degrade calcule ; couleur nominale, donc
  //    deterministe et independante de l'anticrenelage).
  const stops = parseStops(info.bgImage).filter((s) => s.alpha === 1);
  const stopMin = stops.length
    ? Math.min(...stops.map((s) => contrast(composedText, s.rgb)))
    : null;

  return {
    text: textRgb,
    composed: composedText,
    shown: shownText,
    textAlpha: parsed[3],
    opacity: a,
    bench: benchRgb,
    stops: stops.map((s) => hex(s.rgb)),
    stopMin,
    stopCount: stops.length,
    bgImage: info.bgImage,
    pixels,
    pixelMin,
  };
}

const fmt = (n: number | null): string =>
  n === null || !Number.isFinite(n) ? "  n/a" : n.toFixed(2).padStart(5);

test.describe("Contraste du texte des boutons — sonde pixel (#944)", () => {
  test("texte des boutons sur leur fond rendu, repos et survol", async ({
    page,
  }, testInfo) => {
    // 11 boutons x 2 etats x (capture + decodage) : ~25 s par projet, le defaut de 30 s est trop juste.
    test.setTimeout(120_000);
    const projectName = testInfo.project.name;
    test.skip(
      projectName.endsWith("-mobile"),
      "le contraste ne depend pas du viewport : desktop seulement",
    );
    const { theme, mode } = parseProjectName(projectName);

    await page.addInitScript(
      ({ t, m }: { t: string; m: string }) => {
        try {
          localStorage.setItem("msyx-theme", t);
          localStorage.setItem("msyx-mode", m);
        } catch {}
      },
      { t: theme, m: mode },
    );
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");
    // La boite du texte depend de la police : on attend qu'elle soit chargee.
    await page.evaluate(() => document.fonts.ready);
    // Pas de transition en cours au moment de la capture.
    await page.addStyleTag({
      content:
        "*,*::before,*::after{transition:none!important;animation:none!important}",
    });

    // Garde-fou : la sonde mesure bien le combo du projet (pas du msyx-dark par defaut).
    const applied = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      mode: document.documentElement.getAttribute("data-mode"),
    }));
    expect(applied.theme ?? "msyx", `${projectName}: data-theme applique`).toBe(
      theme,
    );
    expect(applied.mode ?? "dark", `${projectName}: data-mode applique`).toBe(
      mode,
    );

    const probes = await page.$$eval("[data-probe]", (els) =>
      els.map((e) => e.getAttribute("data-probe")!),
    );
    expect(
      [...probes].sort(),
      `${projectName}: data-probe de la fixture = SOLID + REPORT_ONLY`,
    ).toEqual([...SOLID, ...REPORT_ONLY].sort());

    type Row = {
      probe: string;
      solid: boolean;
      rest: Measure;
      hover: Measure;
    };
    const rows: Row[] = [];

    for (const probe of [...SOLID, ...REPORT_ONLY]) {
      const loc = page.locator(`[data-probe="${probe}"]`);
      const measures = {} as Record<State, Measure>;
      for (const state of ["rest", "hover"] as State[]) {
        if (state === "hover") await loc.hover();
        else await page.mouse.move(0, 0);
        measures[state] = await measureButton(page, probe);
      }
      await page.mouse.move(0, 0);
      rows.push({
        probe,
        solid: SOLID.includes(probe),
        rest: measures.rest,
        hover: measures.hover,
      });
    }

    // --- Rapport : tableau projet x cas x stop / rest / hover ---
    const lines = rows.map((r) => {
      const flag = (n: number | null) =>
        n !== null && Number.isFinite(n) && n < CONTRAST_MIN ? "<" : " ";
      const worst = Math.min(
        r.rest.stopMin ?? Infinity,
        r.rest.pixelMin,
        r.hover.pixelMin,
      );
      return (
        `${projectName.padEnd(20)} ${r.probe.padEnd(24)} ` +
        `stop=${fmt(r.rest.stopMin)}${flag(r.rest.stopMin)} ` +
        `rest=${fmt(r.rest.pixelMin)}${flag(r.rest.pixelMin)} ` +
        `hover=${fmt(r.hover.pixelMin)}${flag(r.hover.pixelMin)} ` +
        `${r.solid ? "SOLID " : "rapport"} ` +
        `${r.solid && worst < CONTRAST_MIN ? "KO" : "  "} ` +
        `texte=${hex(r.rest.text)}${hex(r.hover.shown) !== hex(r.rest.text) ? `(survol ${hex(r.hover.shown)})` : ""} arrets=${r.rest.stops.join(">") || "-"}`
      );
    });
    console.log(
      `\n[button-contrast #944] ${projectName} (seuil ${CONTRAST_MIN}:1, ENFORCE=${ENFORCE})\n` +
        lines.join("\n"),
    );
    await testInfo.attach("button-contrast.json", {
      contentType: "application/json",
      body: JSON.stringify(
        {
          project: projectName,
          theme,
          mode,
          contrastMin: CONTRAST_MIN,
          enforce: ENFORCE,
          rows: rows.map((r) => ({
            probe: r.probe,
            solid: r.solid,
            text: hex(r.rest.text),
            hoverText: hex(r.hover.shown),
            stops: r.rest.stops,
            backgroundImage: r.rest.bgImage,
            stopMin: r.rest.stopMin === null ? null : round2(r.rest.stopMin),
            rest: round2(r.rest.pixelMin),
            hover: round2(r.hover.pixelMin),
            hoverOpacity: round2(r.hover.opacity),
            pixels: { rest: r.rest.pixels, hover: r.hover.pixels },
          })),
        },
        null,
        2,
      ),
    });

    // --- Assertions toujours actives : validite de la sonde ---
    for (const r of rows) {
      for (const state of ["rest", "hover"] as State[]) {
        const m = r[state];
        expect
          .soft(
            m.textAlpha,
            `${projectName} ${r.probe} ${state}: le texte doit etre opaque (alpha = 1)`,
          )
          .toBe(1);
        expect
          .soft(
            m.pixels,
            `${projectName} ${r.probe} ${state}: aucun pixel echantillonne sous le texte`,
          )
          .toBeGreaterThan(0);
      }
      // Coherence de la mesure du texte : au repos rien ne recouvre le texte
      // (pas de reflet, opacite 1), donc la couleur PEINTE doit egaler la
      // couleur calculee — sinon l'estimation de la couleur peinte est faussee.
      const drift = Math.max(
        ...[0, 1, 2].map((i) => Math.abs(r.rest.shown[i] - r.rest.composed[i])),
      );
      expect
        .soft(
          drift,
          `${projectName} ${r.probe} rest: couleur peinte ${hex(r.rest.shown)} != couleur calculee ${hex(r.rest.composed)} (mesure du texte faussee)`,
        )
        .toBeLessThanOrEqual(4);
      if (!r.solid) continue;
      expect
        .soft(
          r.rest.stopCount,
          `${projectName} ${r.probe}: backgroundImage doit porter >= 2 arrets opaques (obtenu ${r.rest.stopCount} : "${r.rest.bgImage}")`,
        )
        .toBeGreaterThanOrEqual(2);
      if (r.rest.stopMin !== null && r.rest.stopCount >= 2) {
        // Garde-fou : sous le texte, jamais pire que le pire arret du degrade.
        expect
          .soft(
            r.rest.pixelMin,
            `${projectName} ${r.probe}: pixel rendu (${fmt(r.rest.pixelMin).trim()}:1) pire que le pire arret (${fmt(r.rest.stopMin).trim()}:1) — sonde incoherente`,
          )
          .toBeGreaterThanOrEqual(r.rest.stopMin - 0.05);
      }
    }

    // --- Assertion conditionnee par ENFORCE (T3) : chaque cellule fautive nommee ---
    if (ENFORCE) {
      for (const r of rows.filter((x) => x.solid)) {
        const cells: [string, number | null][] = [
          ["stop", r.rest.stopMin],
          ["rest", r.rest.pixelMin],
          ["hover", r.hover.pixelMin],
        ];
        for (const [state, ratio] of cells) {
          if (ratio === null) continue;
          expect
            .soft(
              ratio >= CONTRAST_MIN,
              `${projectName} ${r.probe} ${state} = ${ratio.toFixed(2)}:1 < ${CONTRAST_MIN}`,
            )
            .toBe(true);
        }
      }
    }
  });

  // --- T2 : completude des tokens dedies (Node pur, une seule fois) ---
  test("completude : 9 tokens --btn-*-bg-* + --btn-outline-danger-fg declares en hex dans les 4 couches (#944 T2, #968)", async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "msyx-dark-desktop",
      "test Node pur (fs) : independant du theme, joue une seule fois",
    );
    const errors: string[] = [];
    const read = (rel: string): string =>
      fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");

    /** `--nom: valeur;` -> { "--nom": "valeur" } (commentaires retires). */
    const decls = (body: string): Record<string, string> => {
      const out: Record<string, string> = {};
      const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        out[m[1]] = m[2].trim();
      }
      return out;
    };
    /** Corps du bloc CSS de premier niveau dont le selecteur est exactement `selector`. */
    const cssBlock = (css: string, selector: string): string | null => {
      const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = css.match(new RegExp(`^${esc}\\s*\\{([\\s\\S]*?)^\\}`, "m"));
      return m ? m[1] : null;
    };
    const pick = (b: string | null): Record<string, string> | null =>
      b === null ? null : decls(b);
    const HEX = /^#[0-9a-f]{6}$/i;
    /** Les 9 noms figes doivent etre declares en hex litteral dans `found`. */
    const check = (where: string, found: Record<string, string> | null) => {
      if (found === null) {
        errors.push(`${where}: bloc introuvable`);
        return;
      }
      for (const token of BTN_BG_TOKENS) {
        const v = found[token];
        if (v === undefined) errors.push(`${where}: ${token} absent`);
        else if (!HEX.test(v))
          errors.push(
            `${where}: ${token} = "${v}" n'est pas un hex litteral (jamais var() ni color-mix())`,
          );
      }
    };
    /** Deux copies d'un meme token doivent porter la meme valeur. */
    const same = (
      where: string,
      a: Record<string, string> | null | undefined,
      b: Record<string, string> | null | undefined,
      against: string,
    ) => {
      for (const token of BTN_BG_TOKENS) {
        const x = a?.[token];
        const y = b?.[token];
        if (
          x !== undefined &&
          y !== undefined &&
          x.toLowerCase() !== y.toLowerCase()
        )
          errors.push(`${where}: ${token} = ${x} != ${y} (${against})`);
      }
    };

    // Couches 1 et 3 — MSYX : tokens.css (build-themes.js ignore msyx.json).
    const tokens = read("shared/css/tokens.css");
    const msyx: Record<Mode, Record<string, string> | null> = {
      dark: pick(cssBlock(tokens, ":root")),
      light: pick(cssBlock(tokens, '[data-mode="light"]')),
    };
    check("shared/css/tokens.css :root (MSYX dark)", msyx.dark);
    check('shared/css/tokens.css [data-mode="light"] (MSYX light)', msyx.light);

    // Miroir themes/msyx.json : memes valeurs que tokens.css (sinon scaffold-theme.sh propage du faux).
    const mirror = JSON.parse(read("themes/msyx.json")).modes as Record<
      Mode,
      Record<string, string>
    >;
    for (const mode of ["dark", "light"] as Mode[]) {
      check(`themes/msyx.json modes.${mode}`, mirror[mode] ?? null);
      same(
        `themes/msyx.json modes.${mode}`,
        mirror[mode],
        msyx[mode],
        "shared/css/tokens.css",
      );
    }

    // Couches 2 et 4 — autres themes : JSON (source) ET themes.css (autogenere, doit suivre).
    const themesCss = read("shared/css/themes.css");
    for (const theme of ["acssi", "nhood", "auchan", "noel"]) {
      const json = JSON.parse(read(`themes/${theme}.json`)).modes as Record<
        Mode,
        Record<string, string>
      >;
      for (const mode of ["dark", "light"] as Mode[]) {
        check(`themes/${theme}.json modes.${mode}`, json[mode] ?? null);
        const selector =
          mode === "dark"
            ? `[data-theme="${theme}"]`
            : `[data-theme="${theme}"][data-mode="light"]`;
        const built = pick(cssBlock(themesCss, selector));
        check(
          `shared/css/themes.css ${selector} (node shared/build-themes.js relance ?)`,
          built,
        );
        same(
          `shared/css/themes.css ${selector}`,
          built,
          json[mode],
          `themes/${theme}.json`,
        );
      }
    }

    expect(
      errors,
      `tokens de fond de bouton incomplets :\n${errors.join("\n")}`,
    ).toEqual([]);
  });
});
