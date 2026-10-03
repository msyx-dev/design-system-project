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
 * #1016 — mode « liens » (`nav.segmented > a.segmented-item[href]`, section `#segmented-links`),
 * mêmes ressorts (mise en page, clavier, JS coupé) que jsdom ne voit pas :
 *   5. SANS JavaScript (`javaScriptEnabled: false`, ni `addInitScript` ni `waitForFunction`) : la page
 *      se charge, 3 landmarks `nav` aux noms distincts, le clic puis Tab + Entrée suivent le lien
 *      (URL `?filtre=actifs#segmented-links`), l'option désactivée (`<a aria-disabled>` sans href) est
 *      sautée par Tab ;
 *   6. AVEC JS : `nav` sans `role`, aucun `[role]`/`[aria-checked]`/`[tabindex]`, `.active` et
 *      `[aria-current="page"]` = le même élément, indicateur aligné sur le lien courant (3 groupes ;
 *      `freezeSegmentedIndicators` de `visual.spec.ts` couvre déjà ces groupes dans la VR mais n'est
 *      pas exporté, d'où `attendreAligne` / `ecart` ici) ;
 *   7. AVEC JS : clic, Tab (un arrêt par lien, pas de tabindex itinérant) et Entrée naviguent ;
 *   8. hauteur : groupe de liens « Filtrer par état » = groupe de boutons « Vue » ±1 px, à 1280 ET 375 ;
 *   9. rendu : `text-decoration-line: none` (repos et survol), couleurs d'un lien = celles d'un
 *      `button.segmented-item` (actif ET inactif), `:focus-visible` = contour plein de 2 px.
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
 *     (durée de transition computée 0s) ;
 *   - #1016, cas 0 : retirer la portée `#segmented-control` de l'énumération → rouge (8 labels, pas 5) ;
 *   - #1016, un lien « Actifs » remplacé par un `<button>` dans composants.html → cas 5 (clic, Tab +
 *     Entrée), cas 6 (balisage) et cas 7 rouges ;
 *   - #1016, branche liens de `initSegmentedControls` neutralisée (`if (false)`) → cas 6 (balisage :
 *     rôles `radio`), cas 7 Tab (tabindex -1), cas 7 Entrée (preventDefault : URL inchangée) et
 *     cas 9 focus rouges ;
 *   - #1016, `line-height: normal` retiré de `.segmented-item` → cas 8 rouge aux deux largeurs
 *     (écart 5,75 px : 45,75 px contre 40 px) ;
 *   - #1016, `text-decoration: none` retiré de `.segmented-item` → cas 9 rouge (soulignement, repos
 *     et survol) ;
 *   - #1016, `.segmented-item` ajouté à `a:is(...)` de `_base.css` (piège A9) → cas 9 rouge sur la
 *     couleur (rgb(241,245,249) au lieu de rgb(159,175,196)) ;
 *   - #1016, `outline: 1px solid` sur `.segmented-item:focus-visible` → cas 9 focus rouge (1px ≠ 2px).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const PAGE = "/pages/composants.html";
const TOLERANCE_PX = 1;

// Écart (px) entre l'indicateur et l'item actif du groupe nommé par son aria-label.
type Ecart = { dw: number; dx: number };

async function ouvrir(page: Page, section = "#segmented-control") {
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
  await page.locator(section).scrollIntoViewIfNeeded();
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
        document.querySelectorAll(
          "#segmented-control .segmented:has(> .segmented-indicator)",
        ),
      ).map((s) => s.getAttribute("aria-label") ?? ""),
    );
    // Garde-fou : la section porte bien les 5 démos (sinon on ne contrôlerait rien). Énumération
    // SCOPÉE à `#segmented-control` : les 3 `nav.segmented` de `#segmented-links` (#1016) portent
    // aussi un indicateur et feraient passer le décompte à 8 ; ils ont leurs propres cas (6 à 9).
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

// ---------------------------------------------------------------------------------------------
// #1016 — mode « liens » : `nav.segmented > a.segmented-item[href]` (section `#segmented-links`)
// ---------------------------------------------------------------------------------------------
const FILTRE = "Filtrer par état"; // défaut, 3 liens (Tous / Actifs / Archives)
const PERIODE = "Afficher la période"; // `--subtle`, 3 liens (7j / 30j / 90j)
const EXPORTS = "Filtrer les exports"; // Tous / Récents / Archivés (désactivé : sans href)
const GROUPES_LIENS = [FILTRE, PERIODE, EXPORTS];

// Par rôle ARIA (nom accessible du landmark + du lien) : sert aux cas sans JS, où elle contrôle
// aussi que les 3 `nav` ont des noms distincts et que l'option désactivée n'est pas un lien.
const lien = (page: Page, groupe: string, nom: string) =>
  page
    .getByRole("navigation", { name: groupe, exact: true })
    .getByRole("link", { name: nom, exact: true });

// Par CSS : indépendante du rôle. Les cas avec JS l'utilisent pour que le motif d'un échec soit le
// COMPORTEMENT (lien non suivi, arrêt de tabulation perdu), pas « le rôle `link` a disparu » —
// la branche radiogroup remplace le rôle des items par `radio`, ce qui rendrait `lien()` introuvable.
const lienCss = (page: Page, groupe: string, nom: string) =>
  page
    .locator(`.segmented[aria-label="${groupe}"] a.segmented-item`)
    .filter({ hasText: nom });

test.describe("Segmented liens — sans JavaScript (#1016)", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `géométrie indépendante du thème : un seul projet suffit (${PROJECT})`,
    );
  });

  // Ni `addInitScript` ni `waitForFunction` ici : ils exigent du JavaScript. La page se charge
  // sur l'événement `load`, les assertions passent par les locators (CDP), pas par la page.
  test("cas 5 — la page se charge JS coupé : 3 liens nommés, aucun script n'a tourné", async ({
    page,
  }) => {
    await page.goto(PAGE);
    // Témoin de chargement : la section est là, avec ses 3 landmarks aux noms distincts.
    await expect(page.locator("#segmented-links h2")).toHaveText(
      "Segmented Control — liens",
    );
    for (const g of GROUPES_LIENS) {
      await expect(
        page.getByRole("navigation", { name: g, exact: true }),
      ).toHaveCount(1);
    }
    // Témoin « JS coupé » : `initSegmentedControls` n'a posé ni largeur ni transform sur
    // l'indicateur (sans cette garde, un test vert prouverait « avec JS », pas « sans »).
    for (const g of GROUPES_LIENS) {
      await expect(
        page
          .locator(`.segmented[aria-label="${g}"] > .segmented-indicator`)
          .first(),
      ).not.toHaveAttribute("style", /./);
    }
    // Le lien courant est lisible avant toute hydratation : l'aplat de l'indicateur est reporté
    // sur l'item actif (marqueur « pas de largeur inline »), texte sur fond plein.
    await expect(lien(page, FILTRE, "Tous")).not.toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    // L'option désactivée (`<a aria-disabled>` sans href) n'est pas exposée comme un lien.
    await expect(lien(page, EXPORTS, "Archivés")).toHaveCount(0);
  });

  test("cas 5 — un clic sur « Actifs » navigue (URL ?filtre=actifs), sans JavaScript", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await lien(page, FILTRE, "Actifs").click();
    await expect(page).toHaveURL(/\?filtre=actifs#segmented-links$/);
  });

  test("cas 5 — Tab depuis « Tous » atteint « Actifs », Entrée navigue ; l'option désactivée est sautée", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await lien(page, FILTRE, "Tous").focus();
    await page.keyboard.press("Tab");
    await expect(lien(page, FILTRE, "Actifs")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\?filtre=actifs#segmented-links$/);

    // Option désactivée : de « Récents », Tab ne s'arrête pas sur « Archivés » (aucun href).
    await lien(page, EXPORTS, "Récents").focus();
    await page.keyboard.press("Tab");
    await expect(
      page.locator(
        '.segmented[aria-label="Filtrer les exports"] a[aria-disabled]',
      ),
    ).not.toBeFocused();
  });
});

test.describe("Segmented liens — avec JavaScript (#1016)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `géométrie indépendante du thème : un seul projet suffit (${PROJECT})`,
    );
  });

  // Attend l'hydratation (largeur inline posée par `initSegmentedControls`) des 3 groupes :
  // sans elle les assertions suivantes porteraient sur le HTML statique, pas sur la branche JS.
  async function ouvrirLiens(page: Page) {
    await ouvrir(page, "#segmented-links");
    for (const g of GROUPES_LIENS) {
      await expect(
        page
          .locator(`.segmented[aria-label="${g}"] > .segmented-indicator`)
          .first(),
      ).toHaveAttribute("style", /width/);
    }
  }

  test("cas 6 — balisage : nav sans role, aucun radio, aucun tabindex, .active = aria-current", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    for (const g of GROUPES_LIENS) {
      const etat = await page.evaluate((l) => {
        const nav = document.querySelector(`.segmented[aria-label="${l}"]`)!;
        const actifs = Array.from(
          nav.querySelectorAll(".segmented-item.active"),
        );
        const courants = Array.from(
          nav.querySelectorAll('[aria-current="page"]'),
        );
        return {
          tag: nav.tagName,
          roleNav: nav.getAttribute("role"),
          roles: nav.querySelectorAll("[role]").length,
          radios: nav.querySelectorAll('[role="radio"]').length,
          checked: nav.querySelectorAll("[aria-checked]").length,
          tabindex: nav.querySelectorAll("[tabindex]").length,
          items: nav.querySelectorAll("a.segmented-item").length,
          indicateurCache:
            nav
              .querySelector(":scope > .segmented-indicator")!
              .getAttribute("aria-hidden") === "true",
          actifs: actifs.length,
          courants: courants.length,
          memeElement: actifs[0] !== undefined && actifs[0] === courants[0],
        };
      }, g);
      expect(etat, g).toEqual({
        tag: "NAV",
        roleNav: null,
        roles: 0,
        radios: 0,
        checked: 0,
        tabindex: 0,
        items: 3,
        indicateurCache: true,
        actifs: 1,
        courants: 1,
        memeElement: true,
      });
    }
  });

  test("cas 6 — l'indicateur coïncide avec le lien courant dans les 3 groupes", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    // `freezeSegmentedIndicators` (visual.spec.ts) contrôle déjà ces 3 groupes à chaque capture de
    // la matrice VR, mais n'est pas exporté : on réutilise ici `attendreAligne` / `ecart`.
    for (const g of GROUPES_LIENS) {
      await attendreAligne(page, g);
    }
  });

  test("cas 7 — un clic sur un lien navigue (rien n'est intercepté)", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    await lienCss(page, FILTRE, "Actifs").click();
    await expect(page).toHaveURL(/\?filtre=actifs#segmented-links$/);
  });

  test("cas 7 — Tab atteint chaque lien (pas de tabindex itinérant)", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    await lienCss(page, FILTRE, "Tous").focus();
    await page.keyboard.press("Tab");
    // Un radiogroup n'offrirait qu'UN arrêt de tabulation : « Actifs » aurait `tabindex="-1"`.
    await expect(lienCss(page, FILTRE, "Actifs")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(lienCss(page, FILTRE, "Archives")).toBeFocused();
  });

  test("cas 7 — Entrée sur un lien focalisé le suit (aucun preventDefault)", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    // Focus posé directement : ce cas ne dépend pas du cas Tab ci-dessus, il isole l'écouteur de
    // clavier. La branche bouton ferait `preventDefault()` sur Entrée : le lien ne serait pas suivi.
    await lienCss(page, FILTRE, "Actifs").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\?filtre=actifs#segmented-links$/);
  });

  for (const largeur of [1280, 375]) {
    test(`cas 8 — hauteur d'un groupe de liens = groupe de boutons « Vue » ±1 px à ${largeur} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largeur, height: 800 });
      await ouvrirLiens(page);
      const h = await page.evaluate(() => {
        const mesure = (sel: string) => {
          const seg = document.querySelector(sel)!;
          return {
            piste: seg.getBoundingClientRect().height,
            item: seg.querySelector(".segmented-item")!.getBoundingClientRect()
              .height,
          };
        };
        return {
          liens: mesure('.segmented[aria-label="Filtrer par état"]'),
          boutons: mesure('.segmented[aria-label="Vue"]'),
        };
      });
      // Témoin : on mesure bien des boîtes non vides (un `display:none` donnerait 0 = 0).
      expect(h.boutons.item).toBeGreaterThan(30);
      // Un <a> hérite `line-height: 1.6` du body (45,75 px) quand un <button> a `normal` (40 px).
      expect(Math.abs(h.liens.item - h.boutons.item)).toBeLessThanOrEqual(
        TOLERANCE_PX,
      );
      expect(Math.abs(h.liens.piste - h.boutons.piste)).toBeLessThanOrEqual(
        TOLERANCE_PX,
      );
    });
  }

  test("cas 9 — rendu : pas de soulignement, couleurs identiques à celles d'un bouton", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    const rendu = await page.evaluate(() => {
      const css = (sel: string) =>
        getComputedStyle(document.querySelector(sel)!);
      const liens = Array.from(
        document.querySelectorAll<HTMLElement>(
          "#segmented-links a.segmented-item",
        ),
      ).map((a) => getComputedStyle(a).textDecorationLine);
      return {
        liens,
        // `a:is(...)` de _base.css (color: inherit) battrait `.segmented-item` s'il l'incluait (A9).
        inactifLien: css(
          '.segmented[aria-label="Filtrer par état"] a.segmented-item:not(.active)',
        ).color,
        inactifBouton: css(
          '.segmented[aria-label="Vue"] button.segmented-item:not(.active)',
        ).color,
        actifLien: css('.segmented[aria-label="Filtrer par état"] a.active')
          .color,
        actifBouton: css('.segmented[aria-label="Vue"] button.active').color,
      };
    });
    expect(rendu.liens).toHaveLength(9); // 3 groupes x 3 liens, y compris l'option désactivée (sans href)
    for (const t of rendu.liens) expect(t).toBe("none");
    // Témoin : inactif ≠ actif (le test ne compare pas deux valeurs identiques par construction).
    expect(rendu.inactifBouton).not.toBe(rendu.actifBouton);
    expect(rendu.inactifLien).toBe(rendu.inactifBouton);
    expect(rendu.actifLien).toBe(rendu.actifBouton);
  });

  test("cas 9 — rendu : pas de soulignement au survol d'un lien", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    await lienCss(page, FILTRE, "Actifs").hover();
    await expect(lienCss(page, FILTRE, "Actifs")).toHaveCSS(
      "text-decoration-line",
      "none",
    );
  });

  test("cas 9 — rendu : :focus-visible = contour plein de 2 px après une navigation clavier", async ({
    page,
  }) => {
    await ouvrirLiens(page);
    await lienCss(page, FILTRE, "Tous").focus();
    await page.keyboard.press("Tab");
    const actifs = lienCss(page, FILTRE, "Actifs");
    await expect(actifs).toBeFocused();
    // Témoin : le focus est bien « visible » (navigation clavier), sinon l'outline mesuré serait nul.
    expect(await actifs.evaluate((el) => el.matches(":focus-visible"))).toBe(
      true,
    );
    await expect(actifs).toHaveCSS("outline-style", "solid");
    await expect(actifs).toHaveCSS("outline-width", "2px");
    await expect(actifs).toHaveCSS("outline-offset", "2px");
  });
});
