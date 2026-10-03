/**
 * segmented-prehydration-contrast.spec.ts — l'item actif d'un segmented est lisible AVANT la
 * première mesure de l'indicateur (#1016)
 *
 * Le défaut : `.segmented-indicator` est rendu dès le serveur (`<SegmentedControl>`) ou présent
 * dans le HTML statique, mais il n'a AUCUNE largeur tant que `initSegmentedControls` / le
 * `useLayoutEffect` ne l'a pas mesuré. Le repli `.segmented:not(:has(> .segmented-indicator))`
 * (#982) ne s'applique pas — le `span` est là — donc le texte de l'item actif
 * (`--text-on-accent`) se lisait sur la piste (`--surface-light`) : 1,13 à 2,21:1 dans 8 combos
 * sur 10 (mesure Chromium, groom #1016). Le correctif est une règle CSS dont le marqueur est
 * l'absence de largeur INLINE sur l'indicateur (`navigation.css`).
 *
 * Méthode — celle de `button-contrast.spec.ts` (#944), par échantillonnage des pixels rendus :
 * un attribut de couleur calculé ne dit pas ce que l'utilisateur lit. Pour chaque cas
 * (`data-probe` de la fixture) et chaque état :
 *   - `pre`  : l'état de la fixture, indicateur SANS `style` (= rendu serveur) ;
 *   - `mes`  : le même groupe après mesure (largeur + translateX posés comme le font
 *              `initSegmentedControls` et `<SegmentedControl>`) = l'état que voit l'utilisateur
 *              une fois hydraté, qui sert de RÉFÉRENCE.
 *   1. couleur du texte de l'item actif, boîte du texte (Range) ;
 *   2. capture de l'item texte VISIBLE (couleur réellement peinte), puis texte MASQUÉ (fond) ;
 *   3. décodage DANS la page (Image + canvas), aucune dépendance ajoutée ;
 *   4. `pixelMin` = contraste WCAG minimal entre le texte peint et chaque pixel du fond.
 *
 * Assertions :
 *   - garde-fou de fixture : l'indicateur n'a pas d'attribut `style` en `pre` et il est masqué ;
 *   - hors `--subtle` : `pre` ≥ 4,5:1 (BLOQUANT) ;
 *   - tous les cas : `pre` égal à `mes` (±0,05) — la règle d'avant mesure reproduit exactement
 *     l'état mesuré, elle ne l'améliore ni ne le dégrade ;
 *   - `--subtle` : la valeur mesurée est RAPPORTÉE (l'item actif subtil est sous 4,5:1 dans
 *     certains combos dans l'état mesuré aussi : défaut préexistant, traité par la tranche T1b).
 *
 * Joué dans les 10 projets desktop de playwright.config.ts (thème/mode lus dans le nom du
 * projet) ; sauté sur les 2 `*-mobile` (le contraste ne dépend pas du viewport).
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - règle `.segmented:has(> .segmented-indicator:not([style*="width"])) > .segmented-item.active`
 *     retirée de navigation.css → `pre` ≈ 1,1 à 2,2:1 hors --subtle dans 8 combos : rouge.
 */
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const FIXTURE = "/visual-tests/fixtures/segmented-prehydration-1016.html";
const CONTRAST_MIN = 4.5;
const EQUAL_TOLERANCE = 0.05;

// data-probe de la fixture — l'ordre est celui du rapport.
const PROBES = [
  "button-default",
  "button-sm",
  "button-lg",
  "button-subtle",
  "link-default",
  "link-subtle",
] as const;
type Probe = (typeof PROBES)[number];
const SUBTLE: readonly Probe[] = ["button-subtle", "link-subtle"];

type Theme = "msyx" | "acssi" | "nhood" | "auchan" | "noel";
type Mode = "dark" | "light";
type Rgb = [number, number, number];
type State = "pre" | "mes";

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

type Measure = {
  computed: Rgb;
  shown: Rgb;
  textAlpha: number;
  pixels: number;
  pixelMin: number;
  indicatorHasStyle: boolean;
  indicatorVisibility: string;
};

/** Pose sur l'indicateur la largeur et le translateX qu'écrivent le vanilla et le React. */
async function mesurer(page: Page, probe: Probe) {
  await page.evaluate((p) => {
    const seg = document.querySelector<HTMLElement>(`[data-probe="${p}"]`)!;
    const ind = seg.querySelector<HTMLElement>(
      ":scope > .segmented-indicator",
    )!;
    const item = seg.querySelector<HTMLElement>(".segmented-item.active")!;
    ind.style.width = `${item.offsetWidth}px`;
    ind.style.transform = `translateX(${item.offsetLeft - ind.offsetLeft}px)`;
  }, probe);
}

/** Retire le style inline de l'indicateur : retour à l'état « rendu serveur ». */
async function demesurer(page: Page, probe: Probe) {
  await page.evaluate((p) => {
    const ind = document.querySelector<HTMLElement>(
      `[data-probe="${p}"] > .segmented-indicator`,
    )!;
    ind.removeAttribute("style");
  }, probe);
}

/** Une mesure de l'item actif du groupe `probe`, dans son état courant. */
async function measureActive(page: Page, probe: Probe): Promise<Measure> {
  const sel = `[data-probe="${probe}"] .segmented-item.active`;

  const info = await page.evaluate(
    ({ s, p }) => {
      const el = document.querySelector<HTMLElement>(s)!;
      const ind = document.querySelector<HTMLElement>(
        `[data-probe="${p}"] > .segmented-indicator`,
      )!;
      const r = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      return {
        color: getComputedStyle(el).color,
        indicatorHasStyle: ind.hasAttribute("style"),
        indicatorVisibility: getComputedStyle(ind).visibility,
        box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        text: { left: t.left, top: t.top, right: t.right, bottom: t.bottom },
      };
    },
    { s: sel, p: probe },
  );

  const parsed = parseColor(info.color);
  if (!parsed) throw new Error(`${probe}: couleur illisible (${info.color})`);
  const computed: Rgb = [parsed[0], parsed[1], parsed[2]];

  // Captures de l'item actif (alignées sur la grille de pixels) : texte VISIBLE (couleur peinte),
  // puis texte MASQUÉ (fond sous le texte).
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
        glyph: core ? sum.map((v) => v / core) : null,
      };
    },
    {
      hidden: png.toString("base64"),
      visible: pngVisible.toString("base64"),
      reg: region,
    },
  );

  // Texte effectivement peint ; repli sur la couleur calculée si aucun pixel de texte identifiable.
  const shown: Rgb =
    decoded.glyph && decoded.maxDelta >= 40 ? (decoded.glyph as Rgb) : computed;

  let pixels = 0;
  let pixelMin = Infinity;
  for (const [k, n] of decoded.colors) {
    pixels += n;
    const px: Rgb = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
    pixelMin = Math.min(pixelMin, contrast(shown, px));
  }

  return {
    computed,
    shown,
    textAlpha: parsed[3],
    pixels,
    pixelMin,
    indicatorHasStyle: info.indicatorHasStyle,
    indicatorVisibility: info.indicatorVisibility,
  };
}

const fmt = (n: number): string =>
  !Number.isFinite(n) ? "  n/a" : n.toFixed(2).padStart(5);

test.describe("Segmented — item actif lisible avant la première mesure (#1016)", () => {
  test("contraste de l'item actif, indicateur sans largeur, vs état mesuré", async ({
    page,
  }, testInfo) => {
    // 6 cas x 2 états x (2 captures + décodage) : le défaut de 30 s est trop juste.
    test.setTimeout(120_000);
    const projectName = testInfo.project.name;
    test.skip(
      projectName.endsWith("-mobile"),
      "le contraste ne dépend pas du viewport : desktop seulement",
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
    // La boîte du texte dépend de la police : on attend qu'elle soit chargée.
    await page.evaluate(() => document.fonts.ready);
    // Pas de transition en cours au moment de la capture.
    await page.addStyleTag({
      content:
        "*,*::before,*::after{transition:none!important;animation:none!important}",
    });

    // Garde-fou : la sonde mesure bien le combo du projet (pas le msyx-dark par défaut).
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

    const probes = await page.$$eval("[data-probe]", (els) =>
      els.map((e) => e.getAttribute("data-probe")!),
    );
    expect(
      [...probes].sort(),
      `${projectName}: data-probe de la fixture = PROBES du spec`,
    ).toEqual([...PROBES].sort());

    type Row = { probe: Probe; subtle: boolean; pre: Measure; mes: Measure };
    const rows: Row[] = [];
    for (const probe of PROBES) {
      const pre = await measureActive(page, probe);
      await mesurer(page, probe);
      const mes = await measureActive(page, probe);
      await demesurer(page, probe);
      rows.push({ probe, subtle: SUBTLE.includes(probe), pre, mes });
    }

    // --- Rapport : projet x cas x pre / mesuré ---
    const lines = rows.map((r) => {
      const flag = r.pre.pixelMin < CONTRAST_MIN ? "<" : " ";
      return (
        `${projectName.padEnd(20)} ${r.probe.padEnd(15)} ` +
        `pre=${fmt(r.pre.pixelMin)}${flag} mesure=${fmt(r.mes.pixelMin)}${r.mes.pixelMin < CONTRAST_MIN ? "<" : " "} ` +
        `${r.subtle ? "rapport (T1b)" : "BLOQUANT    "} texte=${hex(r.pre.shown)}`
      );
    });
    console.log(
      `\n[segmented-prehydration #1016] ${projectName} (seuil ${CONTRAST_MIN}:1)\n` +
        lines.join("\n"),
    );
    await testInfo.attach("segmented-prehydration.json", {
      contentType: "application/json",
      body: JSON.stringify(
        {
          project: projectName,
          theme,
          mode,
          contrastMin: CONTRAST_MIN,
          rows: rows.map((r) => ({
            probe: r.probe,
            subtle: r.subtle,
            text: hex(r.pre.shown),
            pre: round2(r.pre.pixelMin),
            mesure: round2(r.mes.pixelMin),
            pixels: { pre: r.pre.pixels, mesure: r.mes.pixels },
          })),
        },
        null,
        2,
      ),
    });

    // --- Validité de la sonde ---
    for (const r of rows) {
      for (const state of ["pre", "mes"] as State[]) {
        const m = r[state];
        expect
          .soft(
            m.textAlpha,
            `${projectName} ${r.probe} ${state}: le texte doit être opaque (alpha = 1)`,
          )
          .toBe(1);
        expect
          .soft(
            m.pixels,
            `${projectName} ${r.probe} ${state}: aucun pixel échantillonné sous le texte`,
          )
          .toBeGreaterThan(0);
        // Rien ne recouvre le texte : la couleur PEINTE doit égaler la couleur calculée,
        // sinon l'estimation de la couleur peinte est faussée.
        const drift = Math.max(
          ...[0, 1, 2].map((i) => Math.abs(m.shown[i] - m.computed[i])),
        );
        expect
          .soft(
            drift,
            `${projectName} ${r.probe} ${state}: couleur peinte ${hex(m.shown)} != couleur calculée ${hex(m.computed)} (mesure du texte faussée)`,
          )
          .toBeLessThanOrEqual(4);
      }
      // Garde-fou de fixture : « pre » est bien un état d'avant mesure (le marqueur de la règle CSS).
      expect
        .soft(
          r.pre.indicatorHasStyle,
          `${projectName} ${r.probe}: l'indicateur de la fixture ne doit porter aucun attribut style (état d'avant mesure)`,
        )
        .toBe(false);
      expect
        .soft(
          r.pre.indicatorVisibility,
          `${projectName} ${r.probe}: l'indicateur sans largeur doit être masqué (il ne recouvre pas l'aplat de l'item)`,
        )
        .toBe("hidden");
      // La règle d'avant mesure REPRODUIT l'état mesuré : ni mieux, ni pire.
      expect
        .soft(
          Math.abs(r.pre.pixelMin - r.mes.pixelMin),
          `${projectName} ${r.probe}: avant mesure ${fmt(r.pre.pixelMin).trim()}:1 != mesuré ${fmt(r.mes.pixelMin).trim()}:1 (±${EQUAL_TOLERANCE})`,
        )
        .toBeLessThanOrEqual(EQUAL_TOLERANCE);
    }

    // --- Bloquant : hors --subtle, l'item actif est lisible avant la première mesure ---
    for (const r of rows.filter((x) => !x.subtle)) {
      expect
        .soft(
          r.pre.pixelMin >= CONTRAST_MIN,
          `${projectName} ${r.probe} avant mesure = ${r.pre.pixelMin.toFixed(2)}:1 < ${CONTRAST_MIN}`,
        )
        .toBe(true);
    }
  });
});
