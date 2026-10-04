/**
 * button-height-parity.spec.ts — Deux contrôles `.btn-*` voisins de même taille ont la
 * même hauteur, quels que soient leur élément et leur variante (#1044, tranche t2).
 *
 * Défaut mesuré avant correction (fixture `button-height-parity.html`, Chromium) :
 * - `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-warning` et
 *   `.btn-outline-danger` portent une bordure de 1px, `.btn-primary` et `.btn-ghost`
 *   non, à `padding` égal : le bouton bordé est 2px plus haut que son voisin
 *   (« Enregistrer » à côté de « Retirer », cas réel du consommateur tirokado) ;
 * - `buttons.css` ne fixait aucun `line-height` : un `<a class="btn-*">` héritait de
 *   celui du corps (1.6), un `<button>` restait en `normal` (UA) — le lien était plus
 *   haut que le bouton de même variante.
 *
 * Contrat : dans chaque rangée de la fixture (une par taille : normale, `--sm`, `--lg`,
 * `--xs`), max(hauteur) − min(hauteur) ≤ TOL, sur les 14 contrôles (7 variantes × `<a>`
 * et `<button>`). `.btn-icon` garde son minimum de 44px (cible tactile).
 *
 * Mesure de mise en page : Chromium seulement, jamais jsdom (règle N1). Jouée une seule
 * fois (projet `msyx-dark-desktop`) : les épaisseurs de bordure et le `line-height` ne
 * dépendent ni du thème ni du mode (aucune surcharge de bordure ou de `line-height` des
 * `.btn-*` dans `themes.css`).
 *
 * Mutations qui doivent faire passer ce spec au rouge (preuve consignée dans la PR) :
 * - P1 : retirer `line-height: normal` de la base des boutons → les 4 tailles rougissent
 *   (le `<a>` dépasse le `<button>` de même variante) ;
 * - P2 : retirer la bordure transparente des variantes sans bordure → les 4 tailles
 *   rougissent (écart de 2px entre familles de bordure).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/button-height-parity.html";
const TOL = 0.5;
const SIZES = ["base", "sm", "lg", "xs"] as const;
const PER_ROW = 14; // 7 variantes × (<a>, <button>)

type Box = { label: string; h: number; border: string; lineHeight: string };

test.describe("Parité de hauteur des boutons .btn-* (#1044)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  async function open(page: Page) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  }

  async function measure(page: Page, size: string): Promise<Box[]> {
    return page.$$eval(`.parity-row[data-size="${size}"] > *`, (els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return {
          label: `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/).join(".")}`,
          h: el.getBoundingClientRect().height,
          border: `${cs.borderTopWidth}/${cs.borderBottomWidth}`,
          lineHeight: cs.lineHeight,
        };
      }),
    );
  }

  for (const size of SIZES) {
    test(`taille ${size} : <a> et <button>, bordés ou non, ont la même hauteur`, async ({
      page,
    }) => {
      await open(page);
      const boxes = await measure(page, size);
      expect(boxes, "rangée incomplète : la fixture a dérivé").toHaveLength(
        PER_ROW,
      );
      const heights = boxes.map((b) => b.h);
      const spread = Math.max(...heights) - Math.min(...heights);
      const report = boxes
        .map(
          (b) =>
            `${b.label} h=${b.h.toFixed(2)} bordure=${b.border} lh=${b.lineHeight}`,
        )
        .join("\n");
      expect(
        spread,
        `écart de hauteur ${spread.toFixed(2)}px en taille ${size} :\n${report}`,
      ).toBeLessThanOrEqual(TOL);
    });
  }

  test(".btn-icon garde sa cible tactile de 44px, en <button> comme en <a>", async ({
    page,
  }) => {
    await open(page);
    const boxes = await measure(page, "icon");
    expect(boxes).toHaveLength(2);
    for (const b of boxes) {
      expect(b.h, `${b.label} h=${b.h}`).toBeGreaterThanOrEqual(44 - TOL);
    }
    expect(
      Math.abs(boxes[0].h - boxes[1].h),
      JSON.stringify(boxes),
    ).toBeLessThanOrEqual(TOL);
  });
});
