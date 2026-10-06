/**
 * list-item-link-1060.spec.ts — rangée cliquable par son lien titre (#1060)
 *
 * Défaut : dans une liste de navigation (`ul.list > li.list-item > a.list-item-title + .badge`),
 * seul le titre est cliquable : 23 px de haut pour une rangée de 52 px. `.list-item-link` étire
 * le lien sur toute sa rangée (`::after` en `inset: 0`, `position: relative` posée par `:has()`),
 * sans sortir le badge du lien, et remonte d'office tout autre contrôle natif de la rangée.
 *
 * Défaut de RECOUVREMENT et de MISE EN PAGE : jsdom n'applique aucune géométrie, la preuve se fait
 * dans un vrai navigateur (règle N1), par `document.elementFromPoint` sur une grille de points
 * (7 colonnes × 3 lignes dans la boîte de rembourrage de la rangée, en retrait de 2 px des bords
 * et hors séparateur de 1 px, boîtes des contrôles remontés exclues) — jamais par une lecture de
 * classe. Chaque balayage lit les boîtes ET touche les points dans la MÊME tâche JS
 * (`page.evaluate`) : aucune coordonnée ne peut être périmée entre la lecture et le test. Les
 * gestes (survol, clic, toucher) partent de coordonnées relues juste avant, jamais d'un
 * `locator.hover()`/`click()` : l'actionnabilité de Playwright REFUSE de viser le badge ou
 * l'avatar (« <a> intercepts pointer events »), ce qui prouve d'ailleurs que la zone les recouvre.
 *
 * Cas (critères d'acceptation de la spec #1060) :
 *   CA1  — r1, r2, r3 à 375, 768 et 1280 px, pointeur fin : 100 % des points de la grille donnent
 *          le lien de la rangée. Non-vacuité : la boîte du `<a>` fait moins de 60 % de la hauteur
 *          de la rangée ; le centre du `.badge` (r1) et celui de l'`.avatar-status` placé APRÈS le
 *          lien (r3) donnent le lien — points EXPLICITES, car la grille ne tombe sur aucun point de
 *          cet avatar : ce sont eux qui font rougir la mutation (b).
 *   CA2  — aucun recouvrement : la grille de la rangée i+1 ne donne que le lien de i+1 ; aucun point
 *          3 px autour de la liste (dessus, dessous, gauche, droite) ne donne un `.list-item-link` ;
 *          le centre de `#after-list` donne `#after-list`.
 *   CA3  — séparateurs : chaque rangée de `#rows-link` sauf la dernière a la même bordure basse
 *          calculée que `#rows-plain` (1px solid) ; la dernière vaut 0px.
 *   CA4  — Tab sur r1, r2, r3 : le lien n'a pas d'anneau, son `::after` porte `outline: 2px solid`,
 *          `outline-offset: -2px`, `position: absolute`, `inset: 0` ; la rangée est `relative`.
 *          Sous `forcedColors: 'active'`, le `::after` garde `solid` et `2px`.
 *   CA5  — survol du badge de r1 (hors de la boîte du lien) : le lien passe à `underline`, la
 *          rangée à un fond non transparent. Au repos : `none` (les 3 liens) et fond transparent.
 *   CA6  — nom accessible : `getByRole('link', { name, exact: true })` = 1 par rangée ; aucun badge
 *          dans un `<a>`.
 *   CA7  — 2e contrôle (c1 : bouton après le lien ; c2 : case à cocher AVANT le lien) : le centre de
 *          chaque contrôle donne le contrôle lui-même, un clic dessus laisse `location.hash`
 *          inchangé, un clic sur un point libre de la rangée donne `#c1` / `#c2`. À 1280 px au
 *          pointeur fin (souris) ET à 375 px au pointeur grossier (toucher).
 *   CA8  — 375 px, `hasTouch` + `isMobile` : `(pointer: coarse)` vrai (vérifié d'abord), chaque
 *          rangée-lien fait 44 px (`--touch-target`) de haut au moins, grille du CA1 identique.
 *   CA9  — sans lien, rien ne change : les rangées de `#rows-plain` restent `position: static`,
 *          leur titre n'a pas de `::after` (`content: none`), séparateurs inchangés. (La part VR du
 *          CA9 — captures identiques au pixel au-dessus de `#lists` — est jouée par la CI.)
 *   CA10 — vitrine : la 2e démo de `pages/data.html#lists` passe le balayage du CA1 à 1280 px sur
 *          ses 3 rangées (toutes, pas une seule : le smoke est peu coûteux) et son bouton d'actions
 *          reste atteignable. (Le job axe sur `data.html` est celui de `a11y.spec.ts`, joué par la CI.)
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : ni le thème ni le mode ne changent une boîte ou
 * un ordre d'empilement. Chaque cas pose son propre viewport ; le pointeur grossier passe par un
 * contexte `hasTouch` + `isMobile` à 375 px (`(pointer: coarse)` est vérifié avant toute mesure).
 *
 * Preuve par mutation (tranche t2, jouée le 2026-10-06, 3 des 6 de la spec — comportement
 * neutralisé → N tests rouges ; chaque mutation est restaurée avant commit) :
 * @@MUTATIONS@@
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/list-item-link-1060.html";
const PAGE_DATA = "/pages/data.html";
/** Largeurs du CA1, au pointeur fin. */
const LARGEURS = [375, 768, 1280] as const;
/** Hauteur de fenêtre : la fixture tient entière, `elementFromPoint` ne rend jamais null hors champ. */
const HAUTEUR = 1000;
/** Grille du CA1 : 7 colonnes × 3 lignes, en retrait de 2 px de la boîte de rembourrage. */
const GRILLE = { colonnes: 7, lignes: 3, retrait: 2 } as const;
/** Contrat de la spec : les contrôles natifs que le DS remonte d'office au-dessus de la zone. */
const CONTROLES =
  ":is(a[href], button, input, select, textarea, label, summary, [tabindex]):not(.list-item-link)";

interface Rangee {
  id: string;
  titre: string;
  /** Sélecteur de la rangée. */
  rangee: string;
  /** Points EXPLICITES (centre) qui doivent donner le lien : [nom, sélecteur dans la rangée]. */
  explicites: ReadonlyArray<readonly [string, string]>;
}

const RANGEES: readonly Rangee[] = [
  {
    id: "r1",
    titre: "Sprint 13",
    rangee: "#rows-link > li:nth-child(1)",
    explicites: [["badge", ".badge"]],
  },
  {
    id: "r2",
    titre: "Mickael",
    rangee: "#rows-link > li:nth-child(2)",
    explicites: [
      ["badge", ".badge"],
      ["avatar-status (avant le lien)", ".avatar-status"],
    ],
  },
  {
    id: "r3",
    titre: "Caddy",
    rangee: "#rows-link > li:nth-child(3)",
    explicites: [["avatar-status (après le lien)", ".avatar-status"]],
  },
];

const C1 = "#rows-control > li:nth-child(1)";
const C2 = "#rows-control > li:nth-child(2)";

interface Balayage {
  /** Points de la grille touchés (hors boîtes des contrôles remontés). */
  mesures: number;
  /** Points de la grille dont `closest('a')` n'est pas le lien de la rangée : « x,y → vu ». */
  rates: string[];
  /** Liens distincts rencontrés sur la grille (href, ou « (aucun) »). */
  liens: string[];
  /** Points explicites : le centre de l'élément donne-t-il le lien ? Est-il hors de la boîte du lien ? */
  explicites: Array<{
    nom: string;
    ok: boolean;
    vu: string;
    horsLien: boolean;
  }>;
  /** Contrôles : le centre donne-t-il le contrôle lui-même (ou un de ses descendants) ? */
  controles: Array<{ nom: string; ok: boolean; vu: string }>;
  /** Hauteur de la boîte du lien / hauteur de la rangée (non-vacuité : < 0,6). */
  ratio: number;
  hauteurRangee: number;
}

/**
 * Balaie la grille d'une rangée par `elementFromPoint`. Tout se lit et se touche dans la même
 * tâche JS : pas de coordonnée périmée. `defiler` centre d'abord la rangée dans la fenêtre
 * (page longue : `data.html`), en `behavior: 'instant'` pour ne pas laisser un défilement lissé
 * décaler la rangée entre la lecture et le test.
 */
async function balayer(
  page: Page,
  rangee: string,
  opts: {
    explicites?: ReadonlyArray<readonly [string, string]>;
    controles?: readonly string[];
    defiler?: boolean;
  } = {},
): Promise<Balayage> {
  return page.evaluate(
    ({
      rangee,
      explicites,
      controles,
      defiler,
      grille,
      selecteurControles,
    }) => {
      const row = document.querySelector<HTMLElement>(rangee);
      if (!row) throw new Error(`rangée introuvable : ${rangee}`);
      const lien = row.querySelector<HTMLElement>("a.list-item-link");
      if (!lien) throw new Error(`lien introuvable dans : ${rangee}`);
      if (defiler) row.scrollIntoView({ block: "center", behavior: "instant" });

      const nom = (el: Element | null): string => {
        if (!el) return "(rien : hors fenêtre ?)";
        const cls = (el.getAttribute("class") ?? "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .join(".");
        return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}`;
      };
      const dans = (b: DOMRect, x: number, y: number) =>
        x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

      const r = row.getBoundingClientRect();
      const sep = parseFloat(getComputedStyle(row).borderBottomWidth) || 0;
      const exclus = Array.from(row.querySelectorAll(selecteurControles)).map(
        (c) => c.getBoundingClientRect(),
      );
      const x0 = r.left + grille.retrait;
      const x1 = r.right - grille.retrait;
      const y0 = r.top + grille.retrait;
      const y1 = r.bottom - sep - grille.retrait;

      let mesures = 0;
      const rates: string[] = [];
      const liens = new Set<string>();
      for (let i = 0; i < grille.colonnes; i++) {
        for (let j = 0; j < grille.lignes; j++) {
          const x = x0 + ((x1 - x0) * i) / (grille.colonnes - 1);
          const y = y0 + ((y1 - y0) * j) / (grille.lignes - 1);
          if (exclus.some((b) => dans(b, x, y))) continue;
          mesures++;
          const el = document.elementFromPoint(x, y);
          const a = el ? el.closest("a") : null;
          liens.add(a ? (a.getAttribute("href") ?? "(sans href)") : "(aucun)");
          if (a !== lien)
            rates.push(`${x.toFixed(1)},${y.toFixed(1)} → ${nom(el)}`);
        }
      }

      const lb = lien.getBoundingClientRect();
      const centre = (el: Element) => {
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      };
      const exp = explicites.map(([n, sel]) => {
        const el = row.querySelector(sel);
        if (!el) throw new Error(`point explicite introuvable : ${sel}`);
        const { x, y } = centre(el);
        const vu = document.elementFromPoint(x, y);
        return {
          nom: n,
          ok: !!vu && vu.closest("a") === lien,
          vu: nom(vu),
          horsLien: !dans(lb, x, y),
        };
      });
      const ctl = controles.map((sel) => {
        const el = row.querySelector(sel);
        if (!el) throw new Error(`contrôle introuvable : ${sel}`);
        const { x, y } = centre(el);
        const vu = document.elementFromPoint(x, y);
        return {
          nom: sel,
          ok: !!vu && (vu === el || el.contains(vu)),
          vu: nom(vu),
        };
      });

      return {
        mesures,
        rates,
        liens: Array.from(liens),
        explicites: exp,
        controles: ctl,
        ratio: lb.height / r.height,
        hauteurRangee: r.height,
      };
    },
    {
      rangee,
      explicites: opts.explicites ?? [],
      controles: opts.controles ?? [],
      defiler: opts.defiler ?? false,
      grille: GRILLE,
      selecteurControles: CONTROLES,
    },
  );
}

/** Ouvre une page dans un viewport de `largeur` px (omise : le viewport du contexte, tactile). */
async function ouvrir(page: Page, largeur?: number, url = FIXTURE) {
  if (largeur !== undefined)
    await page.setViewportSize({ width: largeur, height: HAUTEUR });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

/** Pointeurs du contexte. */
async function pointeur(page: Page) {
  return page.evaluate(() => ({
    coarse: matchMedia("(pointer: coarse)").matches,
    fine: matchMedia("(pointer: fine)").matches,
  }));
}

/** Centre de la boîte d'un élément, lu à l'instant. */
async function centre(page: Page, selecteur: string) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) throw new Error(`introuvable : ${s}`);
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, selecteur);
}

const hash = (page: Page) => page.evaluate(() => location.hash);

type Geste = "souris" | "toucher";

/** Clic (souris) ou tape (toucher) sur des coordonnées de la fenêtre. */
async function agir(page: Page, geste: Geste, x: number, y: number) {
  if (geste === "toucher") await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Lecture du survol : soulignement du lien et fond de la rangée. */
async function lireSurvol(page: Page, rangee: string) {
  return page.evaluate((sel) => {
    const row = document.querySelector(sel)!;
    const lien = row.querySelector("a.list-item-link")!;
    return {
      deco: getComputedStyle(lien).textDecorationLine,
      fond: getComputedStyle(row).backgroundColor,
    };
  }, rangee);
}

/** Bordure basse calculée de chaque rangée d'une liste. */
async function separateurs(page: Page, liste: string) {
  return page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(`${sel} > .list-item`)).map(
      (li) => {
        const cs = getComputedStyle(li);
        return {
          largeur: cs.borderBottomWidth,
          style: cs.borderBottomStyle,
          couleur: cs.borderBottomColor,
        };
      },
    );
  }, liste);
}

/** État de focus du lien actif : lien, `::after`, rangée. */
async function etatFocus(page: Page) {
  return page.evaluate(() => {
    const lien = document.activeElement as HTMLElement | null;
    if (!lien || !lien.matches("a.list-item-link")) return null;
    const rangee = lien.closest(".list-item")!;
    const apres = getComputedStyle(lien, "::after");
    return {
      cible: lien.getAttribute("href"),
      focusVisible: lien.matches(":focus-visible"),
      lienOutline: getComputedStyle(lien).outlineStyle,
      apres: {
        outlineStyle: apres.outlineStyle,
        outlineWidth: apres.outlineWidth,
        outlineOffset: apres.outlineOffset,
        position: apres.position,
        top: apres.top,
        right: apres.right,
        bottom: apres.bottom,
        left: apres.left,
      },
      rangeePosition: getComputedStyle(rangee).position,
    };
  });
}

/** Point « libre » d'une rangée : à 10 px du bord droit, à mi-hauteur, hors de tout contrôle et du lien. */
async function pointLibre(page: Page, rangee: string) {
  return page.evaluate(
    ({ sel, selecteurControles }) => {
      const row = document.querySelector(sel)!;
      const r = row.getBoundingClientRect();
      const sep = parseFloat(getComputedStyle(row).borderBottomWidth) || 0;
      const x = r.right - 10;
      const y = (r.top + r.bottom - sep) / 2;
      const dans = (b: DOMRect) =>
        x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
      const horsControles = !Array.from(
        row.querySelectorAll(selecteurControles),
      ).some((c) => dans(c.getBoundingClientRect()));
      const horsLien = !dans(
        row.querySelector("a.list-item-link")!.getBoundingClientRect(),
      );
      return { x, y, libre: horsControles && horsLien };
    },
    { sel: rangee, selecteurControles: CONTROLES },
  );
}

/**
 * CA7, commun aux deux pointeurs : le centre de chaque contrôle donne le contrôle, un geste dessus
 * laisse `location.hash` inchangé (et atteint bien le contrôle : non-vacuité), un geste sur un
 * point libre de la rangée ouvre le lien. Ordre : les deux contrôles d'abord, les deux liens après,
 * pour que le hash reste vide tant qu'on ne vise que des contrôles.
 */
async function sondeSecondControle(page: Page, geste: Geste) {
  const c1 = await balayer(page, C1, { controles: ["#ctl-after"] });
  const c2 = await balayer(page, C2, { controles: ["#ctl-before"] });
  for (const [id, b] of [
    ["c1", c1],
    ["c2", c2],
  ] as const) {
    expect
      .soft(b.mesures, `${id} : points de la grille mesurés`)
      .toBeGreaterThanOrEqual(14);
    expect
      .soft(b.rates, `${id} : points hors contrôle qui ne donnent pas le lien`)
      .toEqual([]);
    for (const c of b.controles)
      expect.soft(c.ok, `${id} : centre de ${c.nom} → ${c.vu}`).toBe(true);
  }

  await page.evaluate(() => {
    const w = window as unknown as { __clics: number };
    w.__clics = 0;
    document.getElementById("ctl-after")!.addEventListener("click", () => {
      w.__clics++;
    });
  });
  expect(await hash(page), "hash de départ").toBe("");

  const bouton = await centre(page, "#ctl-after");
  await agir(page, geste, bouton.x, bouton.y);
  expect(
    await page.evaluate(
      () => (window as unknown as { __clics: number }).__clics,
    ),
    "le geste atteint le bouton",
  ).toBe(1);
  expect(await hash(page), "geste sur le bouton : hash inchangé").toBe("");

  const [caseAvant, coche0] = [
    await centre(page, "#ctl-before"),
    await page.locator("#ctl-before").isChecked(),
  ];
  await agir(page, geste, caseAvant.x, caseAvant.y);
  expect(
    await page.locator("#ctl-before").isChecked(),
    "le geste atteint la case (état basculé)",
  ).toBe(!coche0);
  expect(await hash(page), "geste sur la case : hash inchangé").toBe("");

  for (const [rangee, cible] of [
    [C1, "#c1"],
    [C2, "#c2"],
  ] as const) {
    const libre = await pointLibre(page, rangee);
    expect(
      libre.libre,
      `${cible} : le point visé est hors de tout contrôle et hors du lien (non-vacuité)`,
    ).toBe(true);
    await agir(page, geste, libre.x, libre.y);
    await expect
      .poll(() => hash(page), {
        message: `geste sur un point libre de ${rangee}`,
      })
      .toBe(cible);
  }
}

/* ------------------------------------------------------------------ pointeur fin */

test.describe("Rangée-lien — pointeur fin (#1060)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `joué une seule fois, dans ${PROJECT}`,
    );
  });

  for (const largeur of LARGEURS) {
    test(`CA1 — ${largeur} px : chaque point de la rangée donne son lien`, async ({
      page,
    }) => {
      await ouvrir(page, largeur);
      expect((await pointeur(page)).coarse, "pointeur fin (non-vacuité)").toBe(
        false,
      );
      for (const r of RANGEES) {
        const b = await balayer(page, r.rangee, { explicites: r.explicites });
        expect
          .soft(b.mesures, `${r.id} : points mesurés`)
          .toBe(GRILLE.colonnes * GRILLE.lignes);
        expect
          .soft(b.rates, `${r.id} : points qui ne donnent pas son lien`)
          .toEqual([]);
        expect
          .soft(
            b.ratio,
            `${r.id} : boîte du <a> / rangée (${b.hauteurRangee.toFixed(1)} px) — non-vacuité`,
          )
          .toBeLessThan(0.6);
        for (const e of b.explicites) {
          expect
            .soft(
              e.horsLien,
              `${r.id} : centre de ${e.nom} hors de la boîte du lien (non-vacuité)`,
            )
            .toBe(true);
          expect
            .soft(e.ok, `${r.id} : centre de ${e.nom} → ${e.vu}`)
            .toBe(true);
        }
      }
    });

    test(`CA2 — ${largeur} px : la zone ne déborde sur aucun voisin`, async ({
      page,
    }) => {
      await ouvrir(page, largeur);
      // La rangée i+1 ne donne que le lien de i+1, jamais celui de i.
      for (let i = 1; i < RANGEES.length; i++) {
        const b = await balayer(page, RANGEES[i].rangee);
        expect
          .soft(b.liens, `${RANGEES[i].id} : liens rencontrés sur sa grille`)
          .toEqual([`#${RANGEES[i].id}`]);
      }
      // Autour de la liste : aucun `.list-item-link` à 3 px de ses bords ; le bouton voisin reste atteignable.
      const autour = await page.evaluate(() => {
        const liste = document.getElementById("rows-link")!;
        const r = liste.getBoundingClientRect();
        const milieu = (r.top + r.bottom) / 2;
        const sondes: Array<[string, number, number]> = [
          ["3 px au-dessus", r.left + r.width / 2, r.top - 3],
          ["3 px en dessous", r.left + r.width / 2, r.bottom + 3],
          ["3 px à gauche", r.left - 3, milieu],
          ["3 px à droite", r.right + 3, milieu],
        ];
        const apres = document.getElementById("after-list")!;
        const b = apres.getBoundingClientRect();
        const vu = document.elementFromPoint(
          b.left + b.width / 2,
          b.top + b.height / 2,
        );
        return {
          dehors: sondes.map(([nom, x, y]) => {
            const el = document.elementFromPoint(x, y);
            return {
              nom,
              ok: !el || !el.closest("a.list-item-link"),
              vu: el ? el.tagName.toLowerCase() : "(rien)",
            };
          }),
          apres: {
            ok: !!vu && (vu === apres || apres.contains(vu)),
            vu: vu ? vu.tagName.toLowerCase() : "(rien)",
          },
        };
      });
      for (const s of autour.dehors)
        expect.soft(s.ok, `${s.nom} de #rows-link → ${s.vu}`).toBe(true);
      expect
        .soft(autour.apres.ok, `centre de #after-list → ${autour.apres.vu}`)
        .toBe(true);
    });
  }

  test("CA3 — séparateurs conservés dans ul > li, comme sans lien", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    const lien = await separateurs(page, "#rows-link");
    const nu = await separateurs(page, "#rows-plain");
    expect(lien, "rangées de #rows-link").toHaveLength(3);
    expect(nu, "rangées de #rows-plain").toHaveLength(2);
    const ref = nu[0];
    expect(ref.largeur, "séparateur de référence (#rows-plain)").toBe("1px");
    expect(ref.style).toBe("solid");
    lien
      .slice(0, -1)
      .forEach((s, i) =>
        expect.soft(s, `séparateur de la rangée r${i + 1}`).toEqual(ref),
      );
    expect
      .soft(lien[lien.length - 1].largeur, "dernière rangée de #rows-link")
      .toBe("0px");
    expect
      .soft(nu[nu.length - 1].largeur, "dernière rangée de #rows-plain")
      .toBe("0px");
  });

  test("CA4 — anneau de focus sur toute la rangée, atteint par Tab", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    for (const r of RANGEES) {
      await page.keyboard.press("Tab");
      const e = await etatFocus(page);
      expect(e, `${r.id} : le lien a le focus après Tab`).not.toBeNull();
      expect.soft(e!.cible, "lien focalisé").toBe(`#${r.id}`);
      expect
        .soft(e!.focusVisible, `${r.id} : :focus-visible (non-vacuité)`)
        .toBe(true);
      expect
        .soft(e!.lienOutline, `${r.id} : le lien lui-même n'a pas d'anneau`)
        .toBe("none");
      expect.soft(e!.apres, `${r.id} : ::after du lien`).toEqual({
        outlineStyle: "solid",
        outlineWidth: "2px",
        outlineOffset: "-2px",
        position: "absolute",
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      });
      expect
        .soft(e!.rangeePosition, `${r.id} : position de la rangée`)
        .toBe("relative");
    }
  });

  test("CA4 — forced-colors : le ::after garde son contour solide de 2 px", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
      "forced-colors inactif au départ",
    ).toBe(false);
    await page.emulateMedia({ forcedColors: "active" });
    expect(
      await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
      "forced-colors actif (non-vacuité)",
    ).toBe(true);
    const e = await etatFocus(page);
    expect(e, "le lien garde le focus").not.toBeNull();
    expect.soft(e!.focusVisible, ":focus-visible").toBe(true);
    expect
      .soft(e!.apres.outlineStyle, "outline-style du ::after")
      .toBe("solid");
    expect.soft(e!.apres.outlineWidth, "outline-width du ::after").toBe("2px");
  });

  test("CA5 — survol : le lien se souligne et la rangée prend un fond, au repos non", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    await page.mouse.move(1, 1);
    for (const r of RANGEES) {
      const repos = await lireSurvol(page, r.rangee);
      expect
        .soft(repos.deco, `${r.id} au repos : text-decoration-line`)
        .toBe("none");
      expect
        .soft(repos.fond, `${r.id} au repos : fond de rangée`)
        .toBe("rgba(0, 0, 0, 0)");
    }
    // Coordonnées relues juste avant le geste (jamais gardées d'avant un changement de contexte).
    const badge = await centre(page, `${RANGEES[0].rangee} .badge`);
    const horsLien = await page.evaluate(
      ({ rangee, x, y }) => {
        const b = document
          .querySelector(`${rangee} a.list-item-link`)!
          .getBoundingClientRect();
        const el = document.elementFromPoint(x, y);
        return {
          horsBoite: !(
            x >= b.left &&
            x <= b.right &&
            y >= b.top &&
            y <= b.bottom
          ),
          donneLeLien: !!el && el.closest("a")?.getAttribute("href") === "#r1",
        };
      },
      { rangee: RANGEES[0].rangee, ...badge },
    );
    expect(
      horsLien.horsBoite,
      "le badge est hors de la boîte du lien (non-vacuité)",
    ).toBe(true);
    expect(horsLien.donneLeLien, "le centre du badge donne le lien de r1").toBe(
      true,
    );
    await page.mouse.move(badge.x, badge.y);
    await expect
      .poll(async () => (await lireSurvol(page, RANGEES[0].rangee)).deco, {
        message: "r1 survolée par son badge : text-decoration-line du lien",
      })
      .toBe("underline");
    await expect
      .poll(async () => (await lireSurvol(page, RANGEES[0].rangee)).fond, {
        message: "r1 survolée par son badge : fond de la rangée",
      })
      .not.toBe("rgba(0, 0, 0, 0)");
  });

  test("CA6 — nom accessible : le lien porte son seul texte, le badge reste hors du lien", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    for (const r of RANGEES) {
      await expect(
        page.getByRole("link", { name: r.titre, exact: true }),
        `lien « ${r.titre} »`,
      ).toHaveCount(1);
    }
    const badges = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#rows-link .badge")).map(
        (b) => b.closest("a") === null,
      ),
    );
    expect(badges.length, "badges mesurés (non-vacuité)").toBe(2);
    expect(badges.every(Boolean), "aucun badge dans un <a>").toBe(true);
  });

  test("CA7 — 2e contrôle d'une rangée-lien, 1280 px, souris", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    expect((await pointeur(page)).coarse, "pointeur fin (non-vacuité)").toBe(
      false,
    );
    await sondeSecondControle(page, "souris");
  });

  test("CA9 — sans lien, rien ne change : position statique, pas de ::after, séparateurs inchangés", async ({
    page,
  }) => {
    await ouvrir(page, 1280);
    const lignes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#rows-plain > .list-item")).map(
        (li) => {
          const titre = li.querySelector(".list-item-title")!;
          return {
            position: getComputedStyle(li).position,
            zIndex: getComputedStyle(li).zIndex,
            apresTitre: getComputedStyle(titre, "::after").content,
            liens: li.querySelectorAll("a").length,
          };
        },
      ),
    );
    expect(lignes, "rangées de #rows-plain (non-vacuité)").toHaveLength(2);
    lignes.forEach((l, i) =>
      expect
        .soft(l, `rangée ${i + 1} de #rows-plain`)
        .toEqual({
          position: "static",
          zIndex: "auto",
          apresTitre: "none",
          liens: 0,
        }),
    );
    const nu = await separateurs(page, "#rows-plain");
    expect.soft(nu[0].largeur, "séparateur de la 1re rangée").toBe("1px");
    expect.soft(nu[1].largeur, "dernière rangée").toBe("0px");
  });
});

/* ------------------------------------------------------------------ pointeur grossier */

test.describe("Rangée-lien — pointeur grossier, 375 px (#1060)", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 812 },
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `joué une seule fois, dans ${PROJECT}`,
    );
  });

  test("CA7 — 2e contrôle d'une rangée-lien, 375 px, toucher", async ({
    page,
  }) => {
    await ouvrir(page);
    expect(
      (await pointeur(page)).coarse,
      "(pointer: coarse) vrai : l'émulation tactile est active",
    ).toBe(true);
    await sondeSecondControle(page, "toucher");
  });

  test("CA8 — pointeur grossier : chaque rangée-lien fait 44 px au moins et la grille du CA1 tient", async ({
    page,
  }) => {
    await ouvrir(page);
    expect(
      (await pointeur(page)).coarse,
      "(pointer: coarse) vrai : l'émulation tactile est active",
    ).toBe(true);
    const cible = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--touch-target",
        ),
      ),
    );
    expect(cible, "--touch-target lu (non-vacuité)").toBe(44);
    for (const r of RANGEES) {
      const b = await balayer(page, r.rangee, { explicites: r.explicites });
      expect
        .soft(b.hauteurRangee, `${r.id} : hauteur de la rangée`)
        .toBeGreaterThanOrEqual(cible);
      expect
        .soft(b.mesures, `${r.id} : points mesurés`)
        .toBe(GRILLE.colonnes * GRILLE.lignes);
      expect
        .soft(b.rates, `${r.id} : points qui ne donnent pas son lien`)
        .toEqual([]);
      expect
        .soft(b.ratio, `${r.id} : boîte du <a> / rangée — non-vacuité`)
        .toBeLessThan(0.6);
      for (const e of b.explicites) {
        expect
          .soft(
            e.horsLien,
            `${r.id} : centre de ${e.nom} hors de la boîte du lien`,
          )
          .toBe(true);
        expect.soft(e.ok, `${r.id} : centre de ${e.nom} → ${e.vu}`).toBe(true);
      }
    }
    for (const rangee of [C1, C2]) {
      const hauteur = await page.evaluate(
        (s) => document.querySelector(s)!.getBoundingClientRect().height,
        rangee,
      );
      expect
        .soft(hauteur, `${rangee} : hauteur de la rangée`)
        .toBeGreaterThanOrEqual(cible);
    }
  });
});

/* ------------------------------------------------------------------ vitrine */

test.describe("Rangée-lien — vitrine data.html#lists (#1060)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `joué une seule fois, dans ${PROJECT}`,
    );
  });

  test("CA10 — la 2e démo de #lists passe le balayage du CA1 à 1280 px", async ({
    page,
  }) => {
    await ouvrir(page, 1280, PAGE_DATA);
    const demo = "#lists .demo-box:has(.list-item-link)";
    await expect(
      page.locator(demo),
      "2e démo de #lists (celle qui porte un .list-item-link)",
    ).toHaveCount(1);
    await expect(
      page.locator(`${demo} .list-item-link`),
      "rangées-lien de la démo",
    ).toHaveCount(3);
    for (let n = 1; n <= 3; n++) {
      const rangee = `${demo} li.list-item:nth-child(${n})`;
      const b = await balayer(page, rangee, {
        defiler: true,
        controles: n === 3 ? [".btn-icon"] : [],
      });
      expect
        .soft(b.mesures, `démo, rangée ${n} : points mesurés`)
        .toBeGreaterThanOrEqual(14);
      expect
        .soft(b.rates, `démo, rangée ${n} : points qui ne donnent pas son lien`)
        .toEqual([]);
      expect
        .soft(
          b.ratio,
          `démo, rangée ${n} : boîte du <a> / rangée — non-vacuité`,
        )
        .toBeLessThan(0.6);
      for (const c of b.controles)
        expect
          .soft(c.ok, `démo, rangée ${n} : centre de ${c.nom} → ${c.vu}`)
          .toBe(true);
    }
    // La 1re rangée de la démo porte un badge : son centre donne le lien (le motif de tirokado#180).
    const badge = await balayer(page, `${demo} li.list-item:nth-child(1)`, {
      defiler: true,
      explicites: [["badge", ".badge"]],
    });
    expect
      .soft(
        badge.explicites[0].ok,
        `démo, rangée 1 : centre du badge → ${badge.explicites[0].vu}`,
      )
      .toBe(true);
  });
});
