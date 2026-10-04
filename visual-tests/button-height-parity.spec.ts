/**
 * button-height-parity.spec.ts — Deux contrôles `.btn-*` voisins de même taille ont la
 * même hauteur, quels que soient leur élément et leur variante (#1044, tranche t2).
 *
 * Trois défauts mesurés avant correction (fixture `button-height-parity.html`, Chromium,
 * hauteurs en px pour la taille normale / `--sm` / `--lg`) :
 * - bordure : `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-warning` et
 *   `.btn-outline-danger` portent 1px de bordure, `.btn-primary` et `.btn-ghost` aucune,
 *   à `padding` égal : le bordé était 2px plus haut (43 contre 41 ; 31,38 contre 29,38 ;
 *   54 contre 52) — « Enregistrer » à côté de « Retirer », cas du consommateur tirokado ;
 * - `line-height` : `buttons.css` n'en fixait aucun ; un `<a class="btn-*">` héritait de
 *   celui du corps (1.6), un `<button>` restait en `normal` (UA) : le lien était 6px plus
 *   haut (47,05 contre 41 ; 34,84 contre 29,38 ; 57,59 contre 52) ;
 * - ordre : `.btn-sm`, `.btn-lg` et `.btn-xs` étaient déclarées AVANT la coque
 *   `.btn-danger, .btn-success, .btn-warning` (même spécificité) : un `.btn-danger.btn-sm`
 *   gardait la taille normale (43 contre 31,38).
 *
 * Correctif (`buttons.css`) : `line-height: normal` sur les variantes ; une variante bordée
 * retranche sa bordure de son `padding` vertical (taille normale, `--sm`, `--lg`) ; les
 * tailles sont déclarées après toutes les variantes. `--xs` : `min-height: 32px` domine le
 * contenu des deux familles, aucune compensation.
 *
 * Contrat : dans chaque rangée de la fixture (une par taille : normale, `--sm`, `--lg`,
 * `--xs`), max(hauteur) − min(hauteur) ≤ TOL, sur les 14 contrôles (7 variantes × `<a>`
 * et `<button>`). `.btn-icon` garde son minimum de 44px (cible tactile).
 *
 * Mesure de mise en page : Chromium seulement, jamais jsdom (règle N1). Jouée une seule
 * fois (projet `msyx-dark-desktop`) : ni `themes.css` ni `tokens.css` ne surchargent la
 * bordure, le `padding` ou le `line-height` d'un `.btn-*`.
 *
 * Preuve par mutation (jouée sur le code réel, puis restaurée) :
 * - P1 : retirer `line-height: normal` → 3 rouges (normale, `--sm`, `--lg`) ;
 * - P2 : retirer la compensation de bordure → 3 rouges (écart de 2,00px) ;
 * - P3 : remettre les tailles avant la coque → 3 rouges (`--sm`, `--lg`, `--xs`).
 * Chaque taille rougit sous au moins une mutation ; `--xs` n'est gardée que par P3, la
 * `min-height` y masquant P1 et P2.
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
