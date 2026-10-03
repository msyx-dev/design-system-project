/**
 * segmented-touch-target.spec.ts — cible tactile des items du segmented (#1016, T1b)
 *
 * Chaque `.segmented-item` (bouton ET lien, toutes tailles) offre une zone cliquable de
 * 44 px de haut au moins sur mobile (WCAG 2.5.5, DS-PRINCIPLES §3). Avant : item par défaut
 * 40 px, `--lg` 37,2 px, `--sm` 24,6 px (mesure Chromium à 375 px).
 *
 * Deux mécanismes (`navigation.css`) : `::after` étend la zone de 3 px en haut et en bas (le
 * padding de la piste, maximum possible sans la faire défiler) et `min-height` ramène l'item à
 * 44 px moins ces 6 px. Un défaut de MISE EN PAGE et de RECOUVREMENT : jsdom ne calcule aucune
 * géométrie, il faut un vrai navigateur. Deux mesures complémentaires :
 *   - `getBoundingClientRect()` de l'item (ce que le layout alloue) ;
 *   - balayage `elementFromPoint` sur la médiane verticale de l'item, au pas de 0,25 px aligné
 *     sur son bord haut : la hauteur de la zone qui ATTEIGNT réellement l'item (c'est elle qui
 *     compte, pas la boîte) ; le pseudo-élément n'a pas de rect, seul le test de frappe le voit.
 *
 * Cas :
 *   1. 375 px : chaque item des 6 groupes de la fixture (bouton défaut/sm/lg/subtle, lien
 *      défaut/subtle) a une zone de frappe >= 44 px ; la piste ne défile pas verticalement
 *      (`scrollHeight <= clientHeight` : l'extension ne déborde pas du padding box) ;
 *   2. 1280 px : la taille compacte revient (item par défaut inchangé à 40 px, `--sm` < 30 px) —
 *      la réduction est bien en `min-width`, rien ne bouge sur desktop.
 *
 * Joué dans UN seul projet (`msyx-dark-mobile`, viewport 375) : la géométrie ne dépend ni du
 * thème ni du mode. Le cas 2 pose son propre viewport.
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - règle `.segmented-item::after` retirée de navigation.css → cas 1 rouge (zone = hauteur de
 *     l'item : 40, 24,6, 37,2 px) ;
 *   - règle `.segmented-item { min-height: calc(var(--segmented-target) - 6px) }` retirée → cas 1
 *     rouge sur `--sm` et `--lg` (zone 30,6 / 43,2 px) ;
 *   - `min-height: 0` du `@media (min-width: 768px)` retiré → cas 2 rouge (`--sm` reste à 38 px).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-mobile";
const FIXTURE = "/visual-tests/fixtures/segmented-prehydration-1016.html";
const TARGET = 44;
const STEP = 0.25;

async function ouvrir(page: Page, width: number) {
  await page.setViewportSize({ width, height: 667 });
  await page.goto(FIXTURE);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

type Item = { probe: string; idx: number; rectH: number; hitH: number };

/** Hauteur de la zone qui atteint l'item (balayage elementFromPoint), et hauteur de sa boîte. */
async function mesurer(page: Page): Promise<{
  items: Item[];
  scrollers: { probe: string; scrollH: number; clientH: number }[];
}> {
  return page.evaluate((step) => {
    const items: Item[] = [];
    const scrollers: { probe: string; scrollH: number; clientH: number }[] = [];
    for (const seg of document.querySelectorAll<HTMLElement>("[data-probe]")) {
      const probe = seg.dataset.probe!;
      scrollers.push({
        probe,
        scrollH: seg.scrollHeight,
        clientH: seg.clientHeight,
      });
      seg
        .querySelectorAll<HTMLElement>(".segmented-item")
        .forEach((it, idx) => {
          it.scrollIntoView({ block: "center" });
          const r = it.getBoundingClientRect();
          const x = r.left + r.width / 2;
          let hits = 0;
          for (let y = r.top - 10; y < r.bottom + 10; y += step) {
            const el = document.elementFromPoint(x, y);
            if (el && el.closest(".segmented-item") === it) hits++;
          }
          items.push({ probe, idx, rectH: r.height, hitH: hits * step });
        });
    }
    return { items, scrollers };
  }, STEP);
}

test.describe("Segmented — cible tactile >= 44 px (#1016 T1b)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  test("1. 375 px : chaque item (bouton et lien, toutes tailles) offre >= 44 px de zone de frappe", async ({
    page,
  }) => {
    await ouvrir(page, 375);
    const { items, scrollers } = await mesurer(page);
    // Garde-fou : on mesure bien les 6 groupes de la fixture (3 items chacun).
    expect(new Set(items.map((i) => i.probe)).size, "6 groupes mesurés").toBe(
      6,
    );
    expect(items.length, "18 items mesurés").toBe(18);
    console.log(
      "[segmented-touch-target 375px]\n" +
        items
          .map(
            (i) =>
              `${i.probe.padEnd(15)} #${i.idx} boîte=${i.rectH.toFixed(2)} frappe=${i.hitH.toFixed(2)}`,
          )
          .join("\n"),
    );
    for (const i of items) {
      expect
        .soft(
          i.hitH,
          `${i.probe} #${i.idx}: zone de frappe ${i.hitH}px < ${TARGET}px (boîte ${i.rectH.toFixed(2)}px)`,
        )
        .toBeGreaterThanOrEqual(TARGET);
    }
    for (const s of scrollers) {
      expect
        .soft(
          s.scrollH,
          `${s.probe}: la piste défile verticalement (scrollHeight ${s.scrollH} > clientHeight ${s.clientH}) : l'extension déborde du padding box`,
        )
        .toBeLessThanOrEqual(s.clientH);
    }
  });

  test("2. 1280 px : la taille compacte revient, rien ne bouge sur desktop", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    const { items } = await mesurer(page);
    const h = (probe: string) =>
      items.find((i) => i.probe === probe && i.idx === 0)!.rectH;
    expect(h("button-default"), "défaut inchangé").toBeCloseTo(40, 0);
    expect(h("button-sm"), "--sm compact").toBeLessThan(30);
    expect(h("button-lg"), "--lg inchangé").toBeCloseTo(37.2, 0);
  });
});
