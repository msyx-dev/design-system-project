/**
 * segmented-indicator-sync.spec.ts — l'indicateur du segmented suit l'item actif (#1021)
 *
 * `initSegmentedControls` (shared/components.js) pose `width` + `transform` de
 * `.segmented-indicator` à partir de la géométrie de l'item actif. Deux défauts, tous deux
 * des défauts de MISE EN PAGE (jsdom n'applique aucune mise en page : `offsetWidth` y vaut 0,
 * donc aucun test `tests/vanilla/*` ne peut les voir — il faut un vrai navigateur) :
 *
 *   1. mesure UNIQUE : la largeur d'un item dépend de la police web (font-display:swap) ; mesurée
 *      avant le swap, l'indicateur gardait la largeur de la police de repli (mesuré en CI sur
 *      `composants#segmented-control` : seul le bord droit de l'indicateur variait).
 *      Correctif : `ResizeObserver` sur les items.
 *   2. décalage de +3 px : `.segmented-indicator` est déjà posé à `left: 3px`, et `offsetLeft`
 *      de l'item (mesuré depuis le bord de padding de `.segmented`) compte déjà ces 3 px.
 *      Correctif : translater de `item.offsetLeft - indicator.offsetLeft`.
 *
 * Quatre cas, tous sur `/pages/composants.html` (section `#segmented-control`, 5 instances) :
 *   0. alignement initial des 5 instances (largeur ET position, ±1 px) — porte le défaut 2 ;
 *   1. libellé de l'item actif allongé après coup → la largeur de l'indicateur suit — défaut 1 ;
 *   2. taille de police des items augmentée (simule le swap de police) sur un item actif qui
 *      n'est PAS le premier → largeur ET position suivent — défaut 1 ;
 *   3. non-régression : un clic déplace toujours l'indicateur sur le nouvel item, et
 *      `segmented:change` est toujours émis avec `{ value, index }` ;
 *   4. (#1016) la TOUTE PREMIÈRE mesure se fait sans transition : dans la frame même de la
 *      mesure, l'indicateur coïncide déjà avec l'item actif (un groupe neuf, item actif non
 *      premier), puis la transition est restaurée pour les mesures suivantes.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : la géométrie ne dépend ni du thème ni du mode,
 * les 10 projets de la matrice VR ne couvriraient rien de plus. La garde de
 * `visual.spec.ts` (`freezeSegmentedIndicators`) contrôle, elle, le même invariant sur chaque
 * capture de la matrice.
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - bloc `ResizeObserver` retiré                      → cas 1 et 2 rouges ;
 *   - `translateX(item.offsetLeft)` (sans soustraction) → cas 0 et 3 rouges ;
 *   - #1016 : `indicator.style.transition = 'none'` retiré de `moveIndicator` → cas 4 rouge
 *     (l'indicateur glisse depuis 0) ; `transition = ''` (restauration) retiré → cas 4 rouge
 *     (durée de transition computée 0s).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const PAGE = "/pages/composants.html";
const TOLERANCE_PX = 1;

// Écart (px) entre l'indicateur et l'item actif du groupe nommé par son aria-label.
type Ecart = { dw: number; dx: number };

async function ouvrir(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.goto(PAGE, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.fonts && document.fonts.status === "loaded",
  );
  await page.locator("#segmented-control").scrollIntoViewIfNeeded();
}

async function ecart(page: Page, label: string): Promise<Ecart> {
  return page.evaluate((l) => {
    const seg = document.querySelector(`.segmented[aria-label="${l}"]`);
    if (!seg) throw new Error(`segmented "${l}" introuvable`);
    const ind = seg.querySelector(":scope > .segmented-indicator");
    const act = seg.querySelector(".segmented-item.active");
    if (!ind || !act)
      throw new Error(`"${l}" : indicateur ou item actif absent`);
    const ri = ind.getBoundingClientRect();
    const ra = act.getBoundingClientRect();
    return {
      dw: Math.abs(ri.width - ra.width),
      dx: Math.abs(ri.left - ra.left),
    };
  }, label);
}

// Attend (poll) que l'indicateur coïncide avec l'item actif — la resynchronisation passe par
// un callback ResizeObserver puis par la transition existante de 0,3 s.
async function attendreAligne(page: Page, label: string) {
  await expect
    .poll(
      async () => {
        const { dw, dx } = await ecart(page, label);
        return dw <= TOLERANCE_PX && dx <= TOLERANCE_PX;
      },
      {
        message: `"${label}" : l'indicateur doit coïncider avec l'item actif (±${TOLERANCE_PX} px)`,
        timeout: 3_000,
      },
    )
    .toBe(true);
}

test.describe("Segmented — l'indicateur suit l'item actif (#1021)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `géométrie indépendante du thème : un seul projet suffit (${PROJECT})`,
    );
  });

  test("cas 0 — alignement initial des 5 instances (largeur et position)", async ({
    page,
  }) => {
    await ouvrir(page);
    const labels = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(".segmented:has(> .segmented-indicator)"),
      ).map((s) => s.getAttribute("aria-label") ?? ""),
    );
    // Garde-fou : la page porte bien les 5 démos (sinon on ne contrôlerait rien).
    expect(labels.sort()).toEqual(
      ["Disposition", "Filtre", "Nature", "Periode", "Vue"].sort(),
    );
    for (const label of labels) {
      await attendreAligne(page, label);
    }
  });

  test("cas 1 — libellé de l'item actif allongé : la largeur de l'indicateur suit", async ({
    page,
  }) => {
    await ouvrir(page);
    await attendreAligne(page, "Vue");
    const avant = await page.evaluate(
      () =>
        document
          .querySelector('.segmented[aria-label="Vue"] > .segmented-indicator')!
          .getBoundingClientRect().width,
    );
    await page.evaluate(() => {
      const actif = document.querySelector(
        '.segmented[aria-label="Vue"] .segmented-item.active',
      )!;
      actif.textContent = "Semaine complète";
    });
    await attendreAligne(page, "Vue");
    const apres = await page.evaluate(
      () =>
        document
          .querySelector('.segmented[aria-label="Vue"] > .segmented-indicator')!
          .getBoundingClientRect().width,
    );
    // Témoin : l'indicateur a réellement grandi (le test ne passe pas « à vide »).
    expect(apres).toBeGreaterThan(avant + 20);
  });

  test("cas 2 — police des items agrandie (swap de police simulé) : largeur et position suivent", async ({
    page,
  }) => {
    await ouvrir(page);
    // Item actif = « Pauses » (3e) : agrandir la police des items qui le précèdent décale
    // aussi sa position, pas seulement sa largeur.
    await page
      .locator('.segmented[aria-label="Filtre"] .segmented-item', {
        hasText: "Pauses",
      })
      .click();
    await attendreAligne(page, "Filtre");
    const avant = await ecart(page, "Filtre");
    expect(avant.dw).toBeLessThanOrEqual(TOLERANCE_PX);
    const largeurAvant = await page.evaluate(
      () =>
        document
          .querySelector(
            '.segmented[aria-label="Filtre"] > .segmented-indicator',
          )!
          .getBoundingClientRect().width,
    );
    await page.evaluate(() => {
      document
        .querySelectorAll('.segmented[aria-label="Filtre"] .segmented-item')
        .forEach((i) => {
          // `.segmented-item` fixe son `font-size` en rem : poser la taille sur le conteneur
          // n'aurait aucun effet, c'est donc sur chaque item.
          (i as HTMLElement).style.fontSize = "1.5rem";
        });
    });
    await attendreAligne(page, "Filtre");
    const largeurApres = await page.evaluate(
      () =>
        document
          .querySelector(
            '.segmented[aria-label="Filtre"] > .segmented-indicator',
          )!
          .getBoundingClientRect().width,
    );
    // Témoin : la police plus grande a bien élargi l'item, donc l'indicateur.
    expect(largeurApres).toBeGreaterThan(largeurAvant + 10);
  });

  test("cas 3 — non-régression : un clic déplace l'indicateur et émet segmented:change", async ({
    page,
  }) => {
    await ouvrir(page);
    await attendreAligne(page, "Vue");
    await page.evaluate(() => {
      const w = window as unknown as { __segEvents: unknown[] };
      w.__segEvents = [];
      document
        .querySelector('.segmented[aria-label="Vue"]')!
        .addEventListener("segmented:change", (e) => {
          w.__segEvents.push((e as CustomEvent).detail);
        });
    });
    const gauche = () =>
      page.evaluate(
        () =>
          document
            .querySelector(
              '.segmented[aria-label="Vue"] > .segmented-indicator',
            )!
            .getBoundingClientRect().left,
      );
    const avant = await gauche();
    await page
      .locator('.segmented[aria-label="Vue"] .segmented-item', {
        hasText: "Mois",
      })
      .click();
    await attendreAligne(page, "Vue");
    expect(await gauche()).toBeGreaterThan(avant + 20);
    expect(
      await page.evaluate(
        () => (window as unknown as { __segEvents: unknown[] }).__segEvents,
      ),
    ).toEqual([{ value: "Mois", index: 1 }]);
  });

  test("cas 4 — 1re mesure sans transition : l'indicateur coïncide avec l'item dès la frame de mesure (#1016)", async ({
    page,
  }) => {
    await ouvrir(page);
    // Groupe NEUF (jamais lié ni mesuré) dont l'item actif est le 3e : la translation à parcourir
    // est > 0, une transition la rendrait visible. Construit nœud par nœud, comme un rendu serveur :
    // indicateur SANS attribut style.
    const res = await page.evaluate(
      () =>
        new Promise<{
          dw: number;
          dx: number;
          largeur: number;
          dureeApres: string;
          styleAvant: string | null;
        }>((resolve) => {
          const seg = document.createElement("div");
          seg.className = "segmented";
          seg.setAttribute("aria-label", "Sans transition (1016)");
          const ind = document.createElement("div");
          ind.className = "segmented-indicator";
          seg.appendChild(ind);
          ["Premier", "Deuxième", "Troisième actif"].forEach((txt, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "segmented-item" + (i === 2 ? " active" : "");
            b.textContent = txt;
            seg.appendChild(b);
          });
          document.querySelector("#segmented-control")!.appendChild(seg);
          const styleAvant = ind.getAttribute("style");
          (
            window as unknown as { __initSegmentedControls: () => void }
          ).__initSegmentedControls();
          // Enregistré APRÈS le requestAnimationFrame d'init : même frame, juste après la mesure.
          requestAnimationFrame(() => {
            const act = seg.querySelector(".segmented-item.active")!;
            const ri = ind.getBoundingClientRect();
            const ra = act.getBoundingClientRect();
            resolve({
              dw: Math.abs(ri.width - ra.width),
              dx: Math.abs(ri.left - ra.left),
              largeur: ra.width,
              dureeApres: getComputedStyle(ind).transitionDuration,
              styleAvant,
            });
          });
        }),
    );
    // Garde-fou : le groupe testé est bien un état d'avant mesure (sinon le test ne prouve rien).
    expect(res.styleAvant).toBeNull();
    // Témoin : l'item actif a une vraie largeur (le test ne passe pas « à vide »).
    expect(res.largeur).toBeGreaterThan(40);
    // La mesure est déjà posée dans la frame de mesure : aucune glissade depuis 0.
    expect(res.dw).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(res.dx).toBeLessThanOrEqual(TOLERANCE_PX);
    // La transition est restaurée : les mesures suivantes (clic, ResizeObserver) glissent.
    expect(res.dureeApres).toBe("0.3s, 0.3s");
  });
});
