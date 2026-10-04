/**
 * scroll-padding-1039.spec.ts — Un élément ramené à l'écran par le haut n'est plus caché sous l'en-tête (#1039).
 *
 * Défaut : `.site-header` est fixe (haut de `--header-h`), mais `html` ne portait aucun
 * `scroll-padding-top`. Le navigateur ignore alors l'en-tête quand il fait défiler la page vers un
 * élément : `scrollIntoView({ block: "nearest" })`, focus qui remonte par Maj+Tab, ancre `#…`. Le
 * contrôle atterrit en haut de la fenêtre, DERRIÈRE l'en-tête (WCAG 2.2 — 2.4.11 « Focus Not
 * Obscured »). Mesuré chez tirokado : `elementFromPoint` au centre du bouton renvoyait l'en-tête.
 *
 * Correctif : `html:has(.site-header) { scroll-padding-top: calc(var(--header-h) + var(--space-md)) }`
 * (base.css). Le `scroll-margin-top` des sections de la vitrine, qui s'y serait additionné, est retiré.
 *
 * Pourquoi un vrai navigateur et pas jsdom : c'est un fait de MISE EN PAGE et de DÉFILEMENT (boîtes
 * réelles, empilement, position de défilement). jsdom n'applique ni l'un ni l'autre.
 *
 * Défilement doux : `html { scroll-behavior: smooth }` (base.css) rendrait la mesure dépendante du
 * temps. Chaque test injecte `html { scroll-behavior: auto !important }` : le défilement devient
 * instantané, `scroll-padding-top` (seul objet du test) reste intact.
 *
 * Garde-fous (sans eux le test passerait pour la mauvaise raison) :
 *  - l'en-tête est fixe et son bas vaut exactement `--header-h` à la largeur testée ;
 *  - la prémisse du défaut est vraie AVANT l'action : le contrôle est au-dessus de la fenêtre, ou
 *    dans la fenêtre mais derrière l'en-tête (`elementFromPoint` y renvoie l'en-tête) ;
 *  - pour Maj+Tab, le focus arrive bien sur le contrôle attendu.
 *
 * Joue dans `msyx-dark-desktop` (1280 × 800) et `msyx-dark-mobile` (375 × 667). Aucune capture :
 * cette spec ne touche à aucune baseline VR.
 *
 * Preuve par mutation (consignée dans la PR) : retirer la règle `html:has(.site-header)` de base.css
 * rend rouges (a) aux deux départs, (b) départ `sous-en-tete`, (c) et l'ancre de la vitrine, aux deux
 * largeurs (10 cas : l'élément reçu au centre du contrôle est l'en-tête). (b) départ `au-dessus` reste
 * vert sans la règle : Chromium CENTRE un élément focalisé entièrement hors de vue — c'est un cas de
 * non-régression, pas une preuve. Remettre le `scroll-margin-top` des sections de la vitrine rend
 * rouge le cas « pas le double » (144 px au lieu de 72).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJETS = ["msyx-dark-desktop", "msyx-dark-mobile"];
const FIXTURE = "/visual-tests/fixtures/scroll-padding-1039.html";
const VITRINE = "/pages/fondation.html";

type Mesure = {
  top: number;
  bottom: number;
  fenetreH: number;
  enTeteBas: number;
  /** L'élément trouvé au centre du contrôle est le contrôle lui-même ou un descendant. */
  atteignable: boolean;
  /** Description de l'élément trouvé au centre (diagnostic en cas d'échec). */
  recu: string;
};

test.beforeEach(async ({}, testInfo) => {
  test.skip(
    !PROJETS.includes(testInfo.project.name),
    "géométrie mesurée : 1 projet desktop + 1 mobile",
  );
});

async function ouvrir(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({
    content: "html { scroll-behavior: auto !important; }",
  });
  const largeur = page.viewportSize()!.width;
  expect([375, 1280], "largeur du projet").toContain(largeur);
  return largeur;
}

/** Position du contrôle, bas de l'en-tête, et élément réellement atteint au centre du contrôle. */
async function mesurer(page: Page, selecteur: string): Promise<Mesure> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const r = el.getBoundingClientRect();
    const entete = document.querySelector(".site-header");
    const recu = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return {
      top: r.top,
      bottom: r.bottom,
      fenetreH: window.innerHeight,
      enTeteBas: entete ? entete.getBoundingClientRect().bottom : 0,
      atteignable: !!recu && el.contains(recu),
      recu: recu ? `${recu.tagName.toLowerCase()}.${recu.className}` : "null",
    };
  }, selecteur);
}

/** Défile (instantanément) pour que le haut du contrôle soit à `haut` px du haut de la fenêtre. */
async function placer(page: Page, selecteur: string, haut: number) {
  await page.evaluate(
    ([sel, h]) => {
      const r = (
        document.querySelector(sel as string) as HTMLElement
      ).getBoundingClientRect();
      window.scrollBy(0, r.top - (h as number));
    },
    [selecteur, haut],
  );
}

function attendreVisibleSousEnTete(m: Mesure, quoi: string) {
  expect(m.atteignable, `${quoi} : élément reçu au centre = ${m.recu}`).toBe(
    true,
  );
  expect(
    m.top,
    `${quoi} : haut du contrôle sous le bas de l'en-tête`,
  ).toBeGreaterThanOrEqual(m.enTeteBas);
  expect(
    m.bottom,
    `${quoi} : contrôle entièrement dans la fenêtre`,
  ).toBeLessThanOrEqual(m.fenetreH);
}

/**
 * Deux positions de départ du contrôle :
 *  - `au-dessus` : entièrement au-dessus de la fenêtre (il faut remonter pour le voir) ;
 *  - `sous-en-tete` : dans la fenêtre, mais derrière l'en-tête — le navigateur le croit visible.
 */
const DEPARTS = [
  { nom: "au-dessus", haut: -200 },
  { nom: "sous-en-tete", haut: 8 },
] as const;

async function verifierPremisse(
  page: Page,
  selecteur: string,
  depart: (typeof DEPARTS)[number],
) {
  const avant = await mesurer(page, selecteur);
  if (depart.nom === "au-dessus") {
    expect(
      avant.bottom,
      "prémisse : contrôle au-dessus de la fenêtre",
    ).toBeLessThanOrEqual(0);
  } else {
    expect(
      avant.top,
      "prémisse : contrôle dans la fenêtre",
    ).toBeGreaterThanOrEqual(0);
    expect(
      avant.atteignable,
      `prémisse : contrôle derrière l'en-tête (reçu = ${avant.recu})`,
    ).toBe(false);
  }
}

test.describe("#1039 — scroll-padding-top sous l'en-tête fixe", () => {
  test("garde-fou : l'en-tête est fixe et son bas vaut --header-h", async ({
    page,
  }) => {
    await ouvrir(page, FIXTURE);
    const m = await page.evaluate(() => {
      const entete = document.querySelector(".site-header") as HTMLElement;
      const sonde = document.createElement("div");
      sonde.style.height = "var(--header-h)";
      document.body.appendChild(sonde);
      const headerH = sonde.getBoundingClientRect().height;
      sonde.remove();
      window.scrollTo(0, 1500);
      const r = entete.getBoundingClientRect();
      return {
        position: getComputedStyle(entete).position,
        top: r.top,
        bottom: r.bottom,
        headerH,
      };
    });
    expect(m.position).toBe("fixed");
    expect(m.top).toBe(0);
    expect(m.bottom).toBe(m.headerH);
  });

  for (const depart of DEPARTS) {
    test(`(a) scrollIntoView({ block: "nearest" }) — départ ${depart.nom}`, async ({
      page,
    }) => {
      await ouvrir(page, FIXTURE);
      await placer(page, "#ctrl-haut", depart.haut);
      await verifierPremisse(page, "#ctrl-haut", depart);

      await page.evaluate(() =>
        document
          .querySelector("#ctrl-haut")!
          .scrollIntoView({ block: "nearest" }),
      );
      attendreVisibleSousEnTete(await mesurer(page, "#ctrl-haut"), "(a)");
    });

    test(`(b) focus qui remonte par Maj+Tab — départ ${depart.nom}`, async ({
      page,
    }) => {
      await ouvrir(page, FIXTURE);
      // L'utilisateur est sur le contrôle du bas ; la page a défilé (molette) et le contrôle du haut
      // est hors de vue ou derrière l'en-tête. Il remonte d'un cran au clavier.
      await page.evaluate(() =>
        (document.querySelector("#ctrl-bas") as HTMLElement).focus({
          preventScroll: true,
        }),
      );
      await placer(page, "#ctrl-haut", depart.haut);
      await verifierPremisse(page, "#ctrl-haut", depart);

      await page.keyboard.press("Shift+Tab");
      expect(
        await page.evaluate(() => document.activeElement?.id),
        "focus arrivé sur le contrôle du haut",
      ).toBe("ctrl-haut");
      attendreVisibleSousEnTete(await mesurer(page, "#ctrl-haut"), "(b)");
    });
  }

  test("(c) une ancre #cible atterrit sous l'en-tête", async ({ page }) => {
    await ouvrir(page, FIXTURE);
    await page.locator("#lien-cible").scrollIntoViewIfNeeded();
    expect(
      (await mesurer(page, "#cible")).bottom,
      "prémisse : cible au-dessus de la fenêtre",
    ).toBeLessThanOrEqual(0);

    await page.locator("#lien-cible").click();
    await expect(page).toHaveURL(/#cible$/);
    attendreVisibleSousEnTete(await mesurer(page, "#cible"), "(c)");
  });

  test("sans en-tête fixe : aucun décalage (règle ciblée html:has(.site-header))", async ({
    page,
  }) => {
    await ouvrir(page, `${FIXTURE}?entete=absent`);
    expect(await page.locator(".site-header").count()).toBe(0);
    await page.locator("#lien-cible").scrollIntoViewIfNeeded();
    await page.locator("#lien-cible").click();
    await expect(page).toHaveURL(/#cible$/);
    const m = await mesurer(page, "#cible");
    expect(
      Math.abs(m.top),
      "la cible s'aligne sur le haut de la fenêtre",
    ).toBeLessThan(1);
  });

  test("vitrine : une section ancrée est à --header-h + --space-md, pas le double", async ({
    page,
  }) => {
    await ouvrir(page, VITRINE);
    const m = await page.evaluate(() => {
      const sonde = document.createElement("div");
      sonde.style.height = "calc(var(--header-h) + var(--space-md))";
      document.body.appendChild(sonde);
      const attendu = sonde.getBoundingClientRect().height;
      sonde.remove();
      const sections = document.querySelectorAll(".main > section[id]");
      const section = sections[sections.length - 1] as HTMLElement;
      section.scrollIntoView({ block: "start" });
      return {
        top: section.getBoundingClientRect().top,
        attendu,
        scrollY: window.scrollY,
      };
    });
    expect(m.scrollY, "la page a défilé").toBeGreaterThan(0);
    expect(
      Math.abs(m.top - m.attendu),
      `haut de section ${m.top} px, attendu ${m.attendu} px`,
    ).toBeLessThan(1);
  });

  test("vitrine : ramener un lien de sidebar (scroll-spy) ne fait pas défiler la page", async ({
    page,
  }) => {
    const largeur = await ouvrir(page, VITRINE);
    test.skip(largeur < 1024, "sidebar hors écran sous 1024 px");
    const m = await page.evaluate(() => {
      window.scrollTo(0, 2000);
      const avant = window.scrollY;
      const lien = document.querySelector(".sidebar-link") as HTMLElement;
      lien.scrollIntoView({ block: "nearest" });
      return {
        avant,
        apres: window.scrollY,
        lienTop: lien.getBoundingClientRect().top,
      };
    });
    expect(m.avant).toBeGreaterThan(0);
    expect(
      m.apres,
      `scrollY ${m.avant} → ${m.apres} (lien à ${m.lienTop} px)`,
    ).toBe(m.avant);
  });
});

/**
 * Défaut voisin, corrigé dans la même PR : le bloc `prefers-reduced-motion: reduce` de `_a11y.css`
 * coupait `animation` et `transition`, pas le `scroll-behavior: smooth` de `html` (base.css).
 * Ces cas n'injectent AUCUN style : ils lisent la valeur calculée produite par le CSS du DS seul.
 * Mutation (consignée dans la PR) : règle `html { scroll-behavior: auto !important }` retirée de
 * `_a11y.css` → le cas « reduce » rougit (valeur `smooth`), le témoin reste vert.
 */
test.describe("#1039 — défilement doux coupé sous prefers-reduced-motion", () => {
  async function scrollBehavior(
    page: Page,
    reducedMotion: "reduce" | "no-preference",
  ) {
    await page.emulateMedia({ reducedMotion });
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");
    return page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
  }

  test("reduce : html { scroll-behavior } vaut auto", async ({ page }) => {
    expect(await scrollBehavior(page, "reduce")).toBe("auto");
  });

  test("témoin no-preference : html { scroll-behavior } vaut smooth", async ({
    page,
  }) => {
    expect(await scrollBehavior(page, "no-preference")).toBe("smooth");
  });
});

/**
 * Même défaut, côté JavaScript : `scrollIntoView({ behavior: "smooth" })` passe OUTRE le CSS
 * `scroll-behavior` et reste animé quelle que soit la préférence. Les 8 défilements de la
 * navigation de la vitrine (`shared/nav.js`) passent désormais par `scrollBehavior()`, qui rend
 * `auto` sous `prefers-reduced-motion: reduce`.
 *
 * Chemin exercé : clic sur le dernier lien de la barre latérale qui vise la page courante
 * (`bindSidebarClicks`, branche « même page »), sur une vraie page de la vitrine. Le clic passe
 * par `HTMLElement.click()` : en mobile la barre latérale est hors écran, le gestionnaire est le
 * même. Deux preuves indépendantes :
 *  - l'option `behavior` réellement reçue par `scrollIntoView` (instrumenté par `addInitScript`) ;
 *  - la position : lue juste après le clic, `scrollY` vaut déjà sa valeur stable (aucune animation).
 * Le témoin `no-preference` montre que la mesure discrimine : `smooth`, et la position lue juste
 * après le clic n'est pas encore la position finale.
 *
 * Mutation (consignée dans la PR) : remettre `behavior: 'smooth'` en dur dans l'appel de la
 * branche « même page » de `bindSidebarClicks` → le cas « reduce » rougit, le témoin reste vert.
 */
test.describe("#1039 — défilements JS de la vitrine sous prefers-reduced-motion", () => {
  const PAGE_NAV = "/pages/composants.html";

  type Defilement = {
    cible: string;
    avant: number;
    immediat: number;
    stable: number;
    appels: { id: string; behavior: string | null }[];
  };

  async function cliquerLienLointain(
    page: Page,
    reducedMotion: "reduce" | "no-preference",
  ): Promise<Defilement> {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const w = window as unknown as {
        __defilements: { id: string; behavior: string | null }[];
      };
      w.__defilements = [];
      const origine = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (
        this: Element,
        arg?: boolean | ScrollIntoViewOptions,
      ) {
        w.__defilements.push({
          id: this.id,
          behavior:
            typeof arg === "object" && arg && arg.behavior
              ? arg.behavior
              : null,
        });
        return origine.call(this, arg as ScrollIntoViewOptions);
      };
    });
    await page.goto(PAGE_NAV);
    await page.waitForLoadState("networkidle");

    const lien = page
      .locator('.sidebar-link[data-href*="composants.html#"]')
      .last();
    await expect(lien, "barre latérale construite").toBeAttached();
    const cible = (await lien.getAttribute("data-href"))!.split("#")[1];
    expect(cible, "cible du lien").toBeTruthy();

    const clic = await page.evaluate((id) => {
      const a = Array.from(
        document.querySelectorAll<HTMLElement>(".sidebar-link[data-href]"),
      ).find((l) => (l.dataset.href || "").endsWith("#" + id))!;
      const avant = window.scrollY;
      a.click();
      return { avant, immediat: window.scrollY };
    }, cible);

    // Position stable : 4 lectures égales à 100 ms d'intervalle (au plus 5 s).
    const stable = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let derniere = window.scrollY;
          let egales = 0;
          const debut = performance.now();
          const tic = () => {
            const y = window.scrollY;
            egales = y === derniere ? egales + 1 : 0;
            derniere = y;
            if (egales >= 4 || performance.now() - debut > 5000) resolve(y);
            else setTimeout(tic, 100);
          };
          setTimeout(tic, 100);
        }),
    );

    const appels = await page.evaluate(
      (id) =>
        (
          window as unknown as {
            __defilements: { id: string; behavior: string | null }[];
          }
        ).__defilements.filter((c) => c.id === id),
      cible,
    );
    return { cible, ...clic, stable, appels };
  }

  test("reduce : le clic de navigation défile sans animation", async ({
    page,
  }) => {
    const d = await cliquerLienLointain(page, "reduce");
    expect(d.avant, "départ en haut de page").toBe(0);
    expect(d.stable, `la page a défilé vers #${d.cible}`).toBeGreaterThan(0);
    expect(d.appels, "un seul scrollIntoView vers la cible").toHaveLength(1);
    expect(d.appels[0].behavior, "option behavior reçue").toBe("auto");
    expect(
      d.immediat,
      `position lue juste après le clic (${d.immediat}) = position stable (${d.stable})`,
    ).toBe(d.stable);
  });

  test("témoin no-preference : le clic de navigation reste animé", async ({
    page,
  }) => {
    const d = await cliquerLienLointain(page, "no-preference");
    expect(d.avant, "départ en haut de page").toBe(0);
    expect(d.stable, `la page a défilé vers #${d.cible}`).toBeGreaterThan(0);
    expect(d.appels, "un seul scrollIntoView vers la cible").toHaveLength(1);
    expect(d.appels[0].behavior, "option behavior reçue").toBe("smooth");
    expect(
      d.immediat,
      `position lue juste après le clic (${d.immediat}) < position stable (${d.stable})`,
    ).toBeLessThan(d.stable);
  });
});
