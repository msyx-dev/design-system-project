/**
 * card-static-hover.spec.ts — `.card-static` : aucun retour de survol (#1010)
 *
 * `.card` répond au survol par six effets (cards.css) : `translateY`, ombre, bordure,
 * barre dégradée `::before`, icône en `scale(1.1)`, et, pour `.card-muted`, un retour
 * d'opacité. Sur une carte qui CONTIENT un formulaire, ces effets disent « cliquable »
 * à tort : la carte « saute » quand le pointeur la traverse pour atteindre un champ.
 *
 * Ce défaut est un défaut de rendu : jsdom n'applique aucune cascade ni aucun `:hover`.
 * La preuve est donc une mesure `getComputedStyle` dans un vrai navigateur, repos puis
 * survol réel (`hover()`), sur six valeurs :
 *   transform, box-shadow, border-top-color, opacity, opacity de `::before`,
 *   transform de `.card-icon`.
 *
 * Les TÉMOINS (`.card`, `.card-flat`, `.card-muted` sans `.card-static`) vivent dans la même
 * page et le même run : ils DOIVENT varier. Sans eux, un test « rien ne bouge » passerait
 * aussi bien si le survol était cassé par ailleurs.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : le mode est posé par le test lui-même
 * (`localStorage` avant le chargement), les 10 projets de la matrice VR ne couvriraient rien
 * de plus. `prefers-reduced-motion` ramène les transitions à 0,01 ms (`_a11y.css`) : la mesure
 * ne dépend pas de la durée de transition.
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - bloc `.card-static` retiré                    → les 3 cas statiques sont rouges ;
 *   - bloc déplacé avant `.card-flat:hover`         → `#static-flat` est rouge ;
 *   - règle `.card-muted.card-static:hover` retirée → `#static-muted` est rouge.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/card-static-1010.html";

type Mesure = {
  transform: string;
  boxShadow: string;
  borderTopColor: string;
  opacity: string;
  beforeOpacity: string;
  iconTransform: string;
};

async function ouvrir(page: Page, mode: "dark" | "light") {
  await page.addInitScript(
    ({ m }: { m: string }) => {
      try {
        localStorage.setItem("msyx-theme", "msyx");
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { m: mode },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(FIXTURE);
  await page.waitForLoadState("networkidle");
  // Garde-fou : le mode demandé est bien celui rendu (attribut absent = dark).
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-mode") ?? "dark",
      ),
    )
    .toBe(mode);
}

async function mesurer(carte: Locator): Promise<Mesure> {
  return carte.evaluate((el) => {
    const cs = getComputedStyle(el);
    const icone = el.querySelector(".card-icon") as HTMLElement;
    return {
      transform: cs.transform,
      boxShadow: cs.boxShadow,
      borderTopColor: cs.borderTopColor,
      opacity: cs.opacity,
      beforeOpacity: getComputedStyle(el, "::before").opacity,
      iconTransform: getComputedStyle(icone).transform,
    };
  });
}

/** Attend la fin des transitions du sous-arbre, puis laisse un court délai de repos. */
async function attendreStable(page: Page, carte: Locator) {
  await carte.evaluate(async (el) => {
    await Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    );
  });
  await page.waitForTimeout(100);
}

/** Mesure au repos (pointeur hors de toutes les cartes), puis au survol réel. */
async function reposPuisSurvol(page: Page, carte: Locator) {
  await page.mouse.move(0, 0);
  await attendreStable(page, carte);
  const repos = await mesurer(carte);
  await carte.hover();
  await attendreStable(page, carte);
  const survol = await mesurer(carte);
  return { repos, survol };
}

for (const mode of ["dark", "light"] as const) {
  test.describe(`.card-static au survol — MSYX ${mode} (#1010)`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        "joué une seule fois : le mode est posé par le test",
      );
      await ouvrir(page, mode);
    });

    for (const id of ["static", "static-flat", "static-muted"]) {
      test(`#${id} : les 6 valeurs sont identiques au repos et au survol`, async ({
        page,
      }) => {
        const { repos, survol } = await reposPuisSurvol(
          page,
          page.locator(`#${id}`),
        );
        expect(survol).toEqual(repos);
      });
    }

    test("témoins : la mesure sait échouer (ils réagissent au survol)", async ({
      page,
    }) => {
      const nu = await reposPuisSurvol(page, page.locator("#temoin"));
      expect(nu.survol.transform).not.toBe("none");
      expect(nu.survol.boxShadow).not.toBe("none");

      const flat = await reposPuisSurvol(page, page.locator("#temoin-flat"));
      expect(flat.survol.transform).not.toBe("none");

      const muted = await reposPuisSurvol(page, page.locator("#temoin-muted"));
      expect(muted.repos.opacity).toBe("0.85");
      expect(muted.survol.opacity).toBe("1");
    });

    test("focus d'un champ de #static : aucune des 6 valeurs ne varie", async ({
      page,
    }) => {
      const carte = page.locator("#static");
      await page.mouse.move(0, 0);
      await attendreStable(page, carte);
      const repos = await mesurer(carte);
      await page.locator("#in-static").focus();
      await expect(page.locator("#in-static")).toBeFocused();
      await attendreStable(page, carte);
      expect(await mesurer(carte)).toEqual(repos);
    });
  });
}

/**
 * Carte titrée en `<section>` : aucune règle de VITRINE ne la touche (#1010)
 *
 * `layout.css` donnait `padding` + `border-bottom` + `scroll-margin-top` à TOUTE
 * `.main section`, donc aussi à `<section class="card card-static" aria-labelledby>` : sa
 * marge intérieure était plus grande que celle de sa voisine en `<div>`, et le filet bas
 * disparaissait (`:last-of-type`). Les règles ne visent plus que les sections de PAGE :
 * enfant direct de `.main`, ou du conteneur `.lazy-loaded` que le LazyLoader du hub
 * (`site.html`) injecte sous `.main` — 127 sections s'y trouvent, restreindre à
 * `.main > section` seul les aurait privées de leur mise en page.
 *
 * Mesure `getComputedStyle` en vrai navigateur (jsdom n'applique aucune cascade).
 * Preuve par mutation (consignée dans la PR) :
 *   - `.main > section` remis en `.main section`         → le test des deux cartes est rouge ;
 *   - `.main > :where(.lazy-loaded) > section` retiré    → le test du hub est rouge.
 */
async function ouvrirPage(page: Page, url: string) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Valeur calculée de `--space-3xl`, lue via un élément sonde (aucun nombre en dur). */
async function paddingDePage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const sonde = document.createElement("div");
    sonde.style.paddingTop = "var(--space-3xl)";
    document.body.appendChild(sonde);
    const v = getComputedStyle(sonde).paddingTop;
    sonde.remove();
    return v;
  });
}

test.describe("carte titrée en <section> : pas d'héritage de la vitrine (#1010)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      "joué une seule fois : mesure de cascade, indépendante de la matrice VR",
    );
  });

  test("la carte <section> et la carte <div> ont le même padding et le même filet bas", async ({
    page,
  }) => {
    await ouvrirPage(page, "/pages/composants.html");
    const mesure = (sel: string) =>
      page.locator(sel).evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          padding: [
            cs.paddingTop,
            cs.paddingRight,
            cs.paddingBottom,
            cs.paddingLeft,
          ],
          borderBottom: [
            cs.borderBottomWidth,
            cs.borderBottomStyle,
            cs.borderBottomColor,
          ],
        };
      });
    const region = await mesure("#card-static section.card-static");
    const bloc = await mesure("#card-static div.card-static");
    expect(region.padding).toEqual(bloc.padding);
    expect(region.borderBottom).toEqual(bloc.borderBottom);
    // Garde-fou : le filet bas existe bien (la vitrine le supprimait via :last-of-type).
    expect(region.borderBottom[1]).not.toBe("none");
  });

  test("les sections de page de composants.html gardent le padding de vitrine", async ({
    page,
  }) => {
    await ouvrirPage(page, "/pages/composants.html");
    const attendu = await paddingDePage(page);
    const lus = await page
      .locator(".main > section[id]")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).paddingTop));
    expect(lus.length).toBeGreaterThan(10);
    expect(new Set(lus)).toEqual(new Set([attendu]));
  });

  test("hub : les sections injectées par le LazyLoader gardent le padding de vitrine", async ({
    page,
  }) => {
    await ouvrirPage(page, "/site.html");
    await page.click("#load-all-sections");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".lazy-section[data-page]").length === 0 &&
        document.querySelectorAll(".lazy-loaded").length > 0,
    );
    const attendu = await paddingDePage(page);
    const lus = await page
      .locator(".main > .lazy-loaded > section[id]")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).paddingTop));
    expect(lus.length).toBeGreaterThan(100);
    expect(new Set(lus)).toEqual(new Set([attendu]));
  });
});
