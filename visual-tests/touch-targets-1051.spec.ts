/**
 * touch-targets-1051.spec.ts — contrôles tactiles sous pointeur grossier (#1051)
 *
 * Sur téléphone, Safari iOS zoome la page dès qu'on touche un champ dont la police fait moins
 * de 16 px. Sous `@media (pointer: coarse)`, chaque champ du DS passe donc à 16 px au moins
 * (`--input-font-size-touch`), et les cibles tactiles à 44 px (`--touch-target`). Au pointeur
 * fin (souris), rien ne change.
 *
 * Défaut de MISE EN PAGE et de calcul de style : jsdom n'applique ni les media queries de
 * pointeur ni la géométrie, la preuve se fait dans un vrai navigateur (règle N1). Émulation
 * tactile = `hasTouch` + `isMobile` : Chromium passe alors `(pointer: coarse)` à vrai. Chaque
 * cas tactile le vérifie avant de mesurer (sinon le test passerait à vide au pointeur fin).
 *
 * Cas (critères d'acceptation de la spec #1051) :
 *   CA1 — à 375 px, sur `site.html` et chaque `pages/*.html`, aucun champ visible (`input`
 *         hors cases, radios, curseurs, fichiers, couleurs, boutons ; `select` ; `textarea` ;
 *         `[contenteditable="true"]`) n'a une police calculée inférieure à 16 px. Le test liste
 *         chaque fautif (`page / signature / taille`) et impose un plancher de champs mesurés
 *         pour ne jamais passer à vide.
 *   CA2 — à 375 px, sur les mêmes pages et la fixture, chaque `.btn-*` (7 variantes), `.btn-sm`,
 *         `.btn-xs`, `.btn-lg`, `.input`, `.dropdown-trigger`, `.checkbox` et `.radio` visible fait
 *         44 px de haut au moins ; chaque `.btn-sm`/`.btn-xs` 44 px de large au moins (la fixture
 *         porte des libellés courts : « OK », « + »). Plancher de contrôles mesurés.
 *   CA3 — `pages/data.html` `#table-cards` : les actions hors `.btn-icon` font 44×44 en mode
 *         tableau (1280 px, cellule en `table-cell` : garde) comme en mode cartes (375 px).
 *   CA4 — fixture : balayage `elementFromPoint` au pas de 0,5 px. Chaque `.chip-close` est
 *         atteint sur 44 px au moins le long de ses deux médianes (tolérance d'un pas), garde sa
 *         taille visuelle de 17,6 px, et aucun point d'une puce B n'est résolu vers la croix d'une
 *         puce A. Garde : chaque groupe de puces passe à la ligne (sinon pas de rangée voisine).
 *   CA6 — à 1280 px, au pointeur fin (contexte par défaut du projet), les dimensions mesurées
 *         sur `main` le 2026-10-05 n'ont pas bougé.
 *
 * Joué dans UN seul projet (`msyx-dark-mobile`) : ni le thème ni le mode ne changent une
 * police ou une boîte. Chaque cas pose son propre viewport.
 *
 * Preuve par mutation (tranche 1, jouée le 2026-10-05, consignée dans le commit puis dans la PR) :
 *   (a) `.input` retiré du bloc coarse de police de `forms.css` → CA1 rouge (54 champs, 21
 *       signatures à 14,4 px : `input.input`, `select.input`, `textarea.input`…) ;
 *   (b) règle `:where(…)` retirée → CA1 rouge (10 champs sans classe à 13,33 px, dans
 *       `.date-input-wrap` et `.number-input-wrap`) ;
 *   (i) `(pointer: coarse)` → `(min-width: 1px)` dans `forms.css` → CA6 rouge (`.input` à 16 px
 *       au bureau).
 *
 * Preuve par mutation (tranche 2, jouée le 2026-10-05) :
 *   (c) + min-height de `.input`/`.dropdown-trigger` : bloc coarse de `buttons.css` neutralisé ET
 *       règle `.input, .dropdown-trigger { min-height }` retirée de `forms.css` → CA2 rouge
 *       (127 fautifs : `.btn-sm` 29,38 px, `.btn-xs` 32 px de haut et 32,38 px de large,
 *       `.btn-primary` 41 px, `select.input` 43 px, `input.input` 34,78 px) ;
 *   (d) + (e) : bloc coarse de `tables.css` neutralisé ET `.chip-close::after` retiré → CA3 rouge
 *       (« Copier le lien » à 29,38 px de haut à 1280 px : la restauration 768 bat le bloc des
 *       boutons) et CA4 rouge (18 zones de 18×18,5 px) ;
 *   (f) `row-gap` de `.chip-group:has(.chip-close)` retiré → CA4 rouge (12 recouvrements entre
 *       rangées de `.chip-sm`, ex. « Alpha ← croix de Epsilon » ; zones amputées à 32,5 px).
 *       Puces par défaut : aucun point de leur boîte n'est capté par une voisine (7 px de débord
 *       contre 8 px de gap, comme la spec le calculait), mais leurs zones se chevauchent dans
 *       l'interstice (amputées à 40 px de haut) : le cas de zone rougit aussi pour elles.
 *
 * Hors portée, signalé à part (annotation du rapport) : les champs dont la police est écrite en
 * style inline. Au 2026-10-05, 4 démos natives de `composants.html` (« Reset natif » et
 * « Disabled global », 13,6 px). La CSS du DS ne peut pas les battre sans `!important`, que la
 * spec interdit : c'est la démo qu'il faut corriger, pas la règle.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-mobile";
const TARGET = 44;
const FONT_MIN = 16;
/** Plancher de champs mesurés sur l'ensemble des pages : le test ne doit jamais passer à vide. */
const FIELDS_FLOOR = 150;
/** Hauteur de `.input` au pointeur fin, relevée sur `main` (86b50e8) avant #1051. */
const INPUT_H = 43;
/** Fixture : puces fermables qui passent à la ligne, boutons `.btn-xs`/`.btn-sm` à libellé court. */
const FIXTURE = "/visual-tests/fixtures/touch-targets-1051.html";
/** CA2 — hauteur ≥ 44 px : les 7 variantes, les tailles, les champs et les cases. */
const SEL_HAUTEUR = [
  ".btn-primary",
  ".btn-secondary",
  ".btn-ghost",
  ".btn-danger",
  ".btn-success",
  ".btn-warning",
  ".btn-outline-danger",
  ".btn-sm",
  ".btn-xs",
  ".btn-lg",
  ".input",
  ".dropdown-trigger",
  ".checkbox",
  ".radio",
].join(", ");
/** CA2 — largeur ≥ 44 px : les tailles qui descendraient en dessous avec un libellé court. */
const SEL_LARGEUR = ".btn-sm, .btn-xs";
/** Plancher de contrôles mesurés en hauteur (CA2), toutes pages confondues. */
const CA2_FLOOR = 150;

const PAGES = [
  "/site.html",
  ...fs
    .readdirSync(path.resolve(__dirname, "..", "pages"))
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => `/pages/${f}`),
];

async function ouvrir(page: Page, url: string, width: number, theme = "msyx") {
  await page.setViewportSize({ width, height: 667 });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("msyx-theme", t);
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  }, theme);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

async function pointeur(page: Page) {
  return page.evaluate(() => ({
    coarse: matchMedia("(pointer: coarse)").matches,
    fine: matchMedia("(pointer: fine)").matches,
  }));
}

type Champ = { sig: string; size: number; inline: boolean };

/** Police calculée de chaque champ visible de la page. */
async function champs(page: Page): Promise<Champ[]> {
  return page.evaluate(() => {
    const EXCLUS = new Set([
      "checkbox",
      "radio",
      "range",
      "file",
      "color",
      "hidden",
      "submit",
      "button",
      "reset",
      "image",
    ]);
    const out: { sig: string; size: number; inline: boolean }[] = [];
    const els = document.querySelectorAll<HTMLElement>(
      'input, select, textarea, [contenteditable="true"]',
    );
    for (const el of els) {
      if (el instanceof HTMLInputElement && EXCLUS.has(el.type)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (!el.checkVisibility({ checkOpacity: true, visibilityProperty: true }))
        continue;
      const type = el instanceof HTMLInputElement ? `[${el.type}]` : "";
      const cls = [...el.classList].map((c) => `.${c}`).join("");
      const parent = el.parentElement?.classList[0];
      out.push({
        sig: `${el.tagName.toLowerCase()}${type}${cls}${cls ? "" : parent ? ` (dans .${parent})` : ""}`,
        size: parseFloat(getComputedStyle(el).fontSize),
        // Police posée par l'attribut `style` : hors de portée d'une feuille de style sans
        // !important (que la spec interdit). Signalé à part, jamais compté comme conforme.
        inline: el.style.fontSize !== "",
      });
    }
    return out;
  });
}

/** Contrôles de l'en-tête qui doivent offrir 44×44 sous pointeur grossier (vanilla + React). */
const CIBLES_ENTETE = [
  ".header-burger",
  ".mode-switch",
  ".header-notification",
  ".header-avatar-trigger",
  ".user-menu-trigger",
];
/** Tout ce qui occupe la rangée de l'en-tête : sert au contrôle des chevauchements. */
const BOITES_ENTETE = [
  ...CIBLES_ENTETE,
  ".header-logo",
  ".version-badge",
  ".theme-switcher-select",
];

type Boite = {
  sel: string;
  nom: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
type EnTete = {
  coarse: boolean;
  innerWidth: number;
  padEnd: number;
  scrollWidth: number;
  clientWidth: number;
  hauteur: number;
  boites: Boite[];
  /** Points des médianes d'une cible résolus vers AUTRE CHOSE qu'elle (`elementFromPoint`). */
  captes: string[];
};

/** Mesure l'en-tête : boîtes visibles, débordement, et balayage des médianes de chaque cible. */
async function enTete(page: Page): Promise<EnTete> {
  return page.evaluate(
    ([cibles, toutes]) => {
      const header = document.querySelector<HTMLElement>(".site-header")!;
      const boites: Boite[] = [];
      const captes: string[] = [];
      for (const el of header.querySelectorAll<HTMLElement>(
        toutes.join(", "),
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || !el.checkVisibility()) continue;
        const sel = toutes.find((s) => el.matches(s))!;
        const nom = `${sel}${el.id ? `#${el.id}` : ""}`;
        boites.push({ sel, nom, x: r.left, y: r.top, w: r.width, h: r.height });
        if (!cibles.includes(sel)) continue;
        // Médianes, au pas de 1 px, 0,5 px en retrait du bord (la cible ronde de l'avatar est
        // rognée par son border-radius dans les coins : les médianes, elles, sont pleines).
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const points: [number, number][] = [];
        for (let x = r.left + 0.5; x <= r.right - 0.5; x += 1)
          points.push([x, cy]);
        for (let y = r.top + 0.5; y <= r.bottom - 0.5; y += 1)
          points.push([cx, y]);
        for (const [x, y] of points) {
          const hit = document.elementFromPoint(x, y);
          if (hit?.closest(sel) !== el) {
            const autre = hit
              ? `${hit.tagName.toLowerCase()}.${[...hit.classList].join(".")}`
              : "rien";
            captes.push(`${nom} (${x.toFixed(1)}, ${y.toFixed(1)}) → ${autre}`);
          }
        }
      }
      const cs = getComputedStyle(header);
      return {
        coarse: matchMedia("(pointer: coarse)").matches,
        innerWidth,
        padEnd: parseFloat(cs.paddingInlineEnd),
        scrollWidth: header.scrollWidth,
        clientWidth: header.clientWidth,
        hauteur: header.getBoundingClientRect().height,
        boites,
        captes,
      };
    },
    [CIBLES_ENTETE, BOITES_ENTETE] as const,
  );
}

/** Paires de boîtes qui se chevauchent (tolérance de 0,01 px pour l'arrondi sous-pixel). */
function chevauchements(boites: Boite[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < boites.length; i++)
    for (let j = i + 1; j < boites.length; j++) {
      const a = boites[i];
      const b = boites[j];
      const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (dx > 0.01 && dy > 0.01)
        out.push(`${a.nom} ∩ ${b.nom} (${dx.toFixed(1)}×${dy.toFixed(1)})`);
    }
  return out;
}

/** Contrôles communs à CA5 : contexte tactile, 44×44, aucun débordement ni chevauchement. */
function verifierEnTete(m: EnTete, cas: string, cibles = CIBLES_ENTETE) {
  expect(m.coarse, `${cas} : émulation tactile active`).toBe(true);
  const petites = m.boites
    .filter((b) => cibles.includes(b.sel))
    .filter((b) => b.w < TARGET - 0.01 || b.h < TARGET - 0.01)
    .map((b) => `${b.nom} ${b.w.toFixed(1)}×${b.h.toFixed(1)}`);
  expect
    .soft(petites, `${cas} : chaque contrôle fait 44×44 au moins`)
    .toEqual([]);
  expect
    .soft(m.scrollWidth, `${cas} : .site-header ne déborde pas`)
    .toBeLessThanOrEqual(m.clientWidth);
  const droite = Math.max(...m.boites.map((b) => b.x + b.w));
  expect
    .soft(droite, `${cas} : dernier contrôle dans la marge droite`)
    .toBeLessThanOrEqual(m.innerWidth - m.padEnd + 0.01);
  expect
    .soft(
      chevauchements(m.boites),
      `${cas} : aucune paire de boîtes ne se chevauche`,
    )
    .toEqual([]);
  expect
    .soft(m.captes, `${cas} : aucune voisine ne capte le toucher d'une cible`)
    .toEqual([]);
  expect.soft(m.hauteur, `${cas} : l'en-tête garde 56 px`).toBe(56);
}

test.describe("Pointeur grossier — champs à 16 px, cibles à 44 px (#1051)", () => {
  test.use({ hasTouch: true, isMobile: true });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de style et de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  test("CA1. 375 px : aucun champ visible n'a une police < 16 px", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const fautifs: string[] = [];
    const horsPortee: string[] = [];
    let mesures = 0;
    for (const url of PAGES) {
      await ouvrir(page, url, 375);
      expect(
        (await pointeur(page)).coarse,
        `${url} : l'émulation tactile n'est pas active (pointer: coarse faux)`,
      ).toBe(true);
      const liste = await champs(page);
      for (const c of liste) {
        const ligne = `${url} / ${c.sig} / ${c.size}px`;
        if (c.inline) {
          if (c.size < FONT_MIN - 0.01) horsPortee.push(ligne);
          continue;
        }
        mesures++;
        if (c.size < FONT_MIN - 0.01) fautifs.push(ligne);
      }
    }
    console.log(
      `[touch-targets-1051 CA1] ${mesures} champs mesurés sur ${PAGES.length} pages, ${fautifs.length} fautifs`,
    );
    // Démos de la vitrine dont la police est écrite en style inline : la CSS du DS ne peut pas
    // les corriger. Listées dans le rapport pour rester visibles, jamais ajoutées aux conformes.
    if (horsPortee.length)
      test.info().annotations.push({
        type: "hors portée de la CSS DS (font-size inline)",
        description: horsPortee.join("\n"),
      });
    console.log(
      `[touch-targets-1051 CA1] ${horsPortee.length} champs à police inline (hors portée) :\n${horsPortee.join("\n")}`,
    );
    expect(
      mesures,
      `plancher : ${FIELDS_FLOOR} champs mesurés au moins (sinon le test passe à vide)`,
    ).toBeGreaterThanOrEqual(FIELDS_FLOOR);
    expect(
      [...new Set(fautifs)],
      `champs sous ${FONT_MIN}px (zoom iOS au focus)`,
    ).toEqual([]);
  });

  test("CA2. 375 px : boutons, champs et cases font 44 px de haut, .btn-sm/.btn-xs 44 px de large", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const fautifs: string[] = [];
    let hauteurs = 0;
    let largeurs = 0;
    for (const url of [...PAGES, FIXTURE]) {
      await ouvrir(page, url, 375);
      expect(
        (await pointeur(page)).coarse,
        `${url} : l'émulation tactile n'est pas active (pointer: coarse faux)`,
      ).toBe(true);
      const boites = await page.evaluate(
        ({ haut, large }) => {
          const visibles = (sel: string) =>
            [...document.querySelectorAll<HTMLElement>(sel)]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return (
                  r.width > 0 &&
                  r.height > 0 &&
                  el.checkVisibility({
                    checkOpacity: true,
                    visibilityProperty: true,
                  })
                );
              })
              .map((el) => ({
                sig: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
                w: el.getBoundingClientRect().width,
                h: el.getBoundingClientRect().height,
              }));
          return { haut: visibles(haut), large: visibles(large) };
        },
        { haut: SEL_HAUTEUR, large: SEL_LARGEUR },
      );
      hauteurs += boites.haut.length;
      largeurs += boites.large.length;
      for (const b of boites.haut)
        if (b.h < TARGET - 0.01)
          fautifs.push(`${url} / ${b.sig} / hauteur ${b.h.toFixed(2)}px`);
      for (const b of boites.large)
        if (b.w < TARGET - 0.01)
          fautifs.push(`${url} / ${b.sig} / largeur ${b.w.toFixed(2)}px`);
    }
    console.log(
      `[touch-targets-1051 CA2] ${hauteurs} hauteurs et ${largeurs} largeurs mesurées, ${fautifs.length} fautifs`,
    );
    expect(
      hauteurs,
      `plancher : ${CA2_FLOOR} contrôles mesurés au moins (sinon le test passe à vide)`,
    ).toBeGreaterThanOrEqual(CA2_FLOOR);
    expect(
      largeurs,
      "plancher : les 7 boutons courts de la fixture au moins",
    ).toBeGreaterThanOrEqual(7);
    expect([...new Set(fautifs)], `cibles sous ${TARGET}px`).toEqual([]);
  });

  test("CA3. Tableau en cartes : actions à 44×44 en mode tableau (1280 px) comme en cartes (375 px)", async ({
    page,
  }) => {
    for (const [width, mode] of [
      [1280, "table-cell"],
      [375, "flex"],
    ] as const) {
      await ouvrir(page, "/pages/data.html", width);
      expect((await pointeur(page)).coarse, "pointer: coarse actif").toBe(true);
      const mesure = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            '#table-cards .table-cards-actions :is(button, a, [role="button"]):not(.btn-icon)',
          ),
        ].map((el) => ({
          label: el.getAttribute("aria-label") ?? el.textContent?.trim(),
          cell: getComputedStyle(el.closest(".table-cards-actions")!).display,
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
        })),
      );
      expect(
        mesure.length,
        `${width}px : au moins 3 actions mesurées`,
      ).toBeGreaterThanOrEqual(3);
      for (const m of mesure) {
        // Garde : sans elle, le cas « mode tableau » passerait en mode cartes (44 px depuis #1008).
        expect(m.cell, `${width}px : cellule d'actions en ${mode}`).toBe(mode);
        expect(
          m.h,
          `${width}px / ${m.label} : ${m.h}px de haut`,
        ).toBeGreaterThanOrEqual(TARGET - 0.01);
        expect(
          m.w,
          `${width}px / ${m.label} : ${m.w}px de large`,
        ).toBeGreaterThanOrEqual(TARGET - 0.01);
      }
    }
  });

  test("CA4. Croix des puces : zone de 44 px, aucun recouvrement entre puces", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await ouvrir(page, FIXTURE, 375);
    expect((await pointeur(page)).coarse, "pointer: coarse actif").toBe(true);
    const r = await page.evaluate((target) => {
      const PAS = 0.5;
      const nom = (chip: Element) => chip.textContent!.replace("×", "").trim();
      const croixEn = (x: number, y: number) =>
        document.elementFromPoint(x, y)?.closest(".chip-close") ?? null;
      const zones: string[] = [];
      const boites: string[] = [];
      const recouvrements = new Set<string>();
      const rangees: Record<string, number> = {};
      for (const groupe of document.querySelectorAll(".chip-group")) {
        rangees[groupe.id] = new Set(
          [...groupe.querySelectorAll(".chip")].map((c) =>
            Math.round(c.getBoundingClientRect().top),
          ),
        ).size;
      }
      for (const close of document.querySelectorAll<HTMLElement>(
        ".chip-close",
      )) {
        const chip = close.closest(".chip")!;
        const b = close.getBoundingClientRect();
        // Taille VISUELLE inchangée : la zone vient du ::after, pas d'une boîte agrandie.
        if (Math.abs(b.width - 17.6) > 1 || Math.abs(b.height - 17.6) > 1)
          boites.push(`${nom(chip)} : ${b.width}×${b.height}`);
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        // Étendue contiguë autour du centre, sur les deux médianes de la croix, au pas de 0,5 px.
        const etendue = (dx: number, dy: number) => {
          let n = 0;
          while (
            n < 200 &&
            croixEn(cx + dx * (n + 1) * PAS, cy + dy * (n + 1) * PAS) === close
          )
            n++;
          return n * PAS;
        };
        const largeur = etendue(-1, 0) + etendue(1, 0) + PAS;
        const hauteur = etendue(0, -1) + etendue(0, 1) + PAS;
        if (largeur < target - PAS || hauteur < target - PAS)
          zones.push(`${nom(chip)} : zone ${largeur}×${hauteur}`);
      }
      // Aucun point d'une puce B (croix comprise) ne doit être résolu vers la croix d'une puce A.
      for (const chip of document.querySelectorAll<HTMLElement>(".chip")) {
        const c = chip.getBoundingClientRect();
        for (let y = c.top + PAS / 2; y < c.bottom; y += PAS)
          for (let x = c.left + PAS / 2; x < c.right; x += PAS) {
            const croix = croixEn(x, y);
            if (croix && !chip.contains(croix))
              recouvrements.add(
                `${nom(chip)} ← croix de ${nom(croix.closest(".chip")!)}`,
              );
          }
      }
      return {
        zones,
        boites,
        recouvrements: [...recouvrements],
        rangees,
        n: document.querySelectorAll(".chip-close").length,
      };
    }, TARGET);
    console.log(
      `[touch-targets-1051 CA4] ${r.n} croix, rangées ${JSON.stringify(r.rangees)}`,
    );
    expect(r.n, "18 croix dans la fixture").toBe(18);
    // Garde : sans passage à la ligne, le recouvrement entre rangées ne serait jamais éprouvé.
    expect(
      r.rangees["chips-defaut"],
      "puces par défaut sur 2 rangées au moins",
    ).toBeGreaterThanOrEqual(2);
    expect(
      r.rangees["chips-sm"],
      "puces .chip-sm sur 2 rangées au moins",
    ).toBeGreaterThanOrEqual(2);
    expect
      .soft(r.boites, ".chip-close garde sa taille visuelle de 17,6×17,6 (±1)")
      .toEqual([]);
    expect
      .soft(r.zones, `zone de chaque croix ≥ ${TARGET}px (pas de 0,5 px)`)
      .toEqual([]);
    expect(
      r.recouvrements,
      "aucune croix ne capte le toucher d'une autre puce",
    ).toEqual([]);
  });

  test("CA5. En-tête : contrôles à 44×44 sans débordement (Noël 375/360 px, MSYX 320 px)", async ({
    page,
  }) => {
    // Noël = 7 éléments (burger, logo, mode, flocon, cloche, feedback, avatar). À 320 px, ils ne
    // tiennent pas (7 × 44 + 40 > 304) : limite déclarée par la spec, garantie portée par MSYX.
    const CAS = [
      { theme: "noel", width: 375, notifs: 3 },
      { theme: "noel", width: 360, notifs: 3 },
      { theme: "msyx", width: 320, notifs: 2 },
    ];
    for (const c of CAS) {
      await ouvrir(page, "/pages/navigation.html", c.width, c.theme);
      const m = await enTete(page);
      const cas = `${c.theme} ${c.width} px`;
      // Gardes : le bon nombre de contrôles est rendu (sinon le cas passerait à vide).
      const n = (sel: string) => m.boites.filter((b) => b.sel === sel).length;
      expect(
        [
          n(".header-burger"),
          n(".mode-switch"),
          n(".header-notification"),
          n(".header-avatar-trigger"),
        ],
        `${cas} : burger, mode, ${c.notifs} boutons ronds, avatar`,
      ).toEqual([1, 1, c.notifs, 1]);
      verifierEnTete(m, cas);
    }
  });

  test("CA5. En-tête React : .user-menu-trigger monté dans .site-header fait 44×44 (Noël 375 px)", async ({
    page,
  }) => {
    // `<SiteHeader>` émet les mêmes classes que nav.js ; seule l'identité diffère : `<UserMenu>`
    // (avatar 32 px + chevron) à la place de `.header-avatar-trigger`. On la monte à sa place,
    // avec le balisage de UserMenu.tsx, nœud par nœud.
    await ouvrir(page, "/pages/navigation.html", 375, "noel");
    await page.evaluate(() => {
      const avatar = document.querySelector(
        ".site-header .header-avatar-trigger",
      )!;
      const menu = document.createElement("div");
      menu.className = "user-menu";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "user-menu-trigger";
      btn.setAttribute("aria-label", "Menu utilisateur — Preview");
      const rond = document.createElement("span");
      rond.className = "user-menu-avatar";
      rond.textContent = "P";
      const caret = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      caret.setAttribute("class", "user-menu-caret");
      caret.setAttribute("viewBox", "0 0 16 16");
      btn.append(rond, caret);
      menu.append(btn);
      avatar.replaceWith(menu);
    });
    const m = await enTete(page);
    expect(
      m.boites.filter((b) => b.sel === ".user-menu-trigger").length,
      ".user-menu-trigger monté",
    ).toBe(1);
    verifierEnTete(m, "React noel 375 px");
  });

  test("CA5. Tablette tactile (768/769/1024 px) : sélecteur de thème et badge sans débordement", async ({
    page,
  }) => {
    // Risque nommé en t1 : sous pointeur grossier, `.site-header .theme-switcher-select` passe à
    // 16 px ; au-delà de 640 px il est affiché. Mesure t3 (2026-10-05, Noël) : il ne s'élargit que
    // de 4,8 px (90 → 94,8, `min-width` domine), mais les cibles à 44 px débordaient l'en-tête de
    // 52 px à 768 px, burger écrasé à 19 px : la compaction tactile tient donc jusqu'à 768 px.
    // 768 = dernier palier avec burger (le plus serré) ; 769 = espacement rendu, sans burger.
    // Hors garantie : 641-716 px en Noël, déjà débordant au pointeur fin (burger à 19 px).
    for (const width of [768, 769, 1024]) {
      await ouvrir(page, "/pages/navigation.html", width, "noel");
      const m = await enTete(page);
      const cas = `noel ${width} px`;
      expect(
        m.boites.some((b) => b.sel === ".theme-switcher-select"),
        `${cas} : sélecteur de thème affiché`,
      ).toBe(true);
      expect(
        m.boites.some((b) => b.sel === ".version-badge"),
        `${cas} : badge de version affiché`,
      ).toBe(true);
      verifierEnTete(m, cas, [
        ...CIBLES_ENTETE,
        ".theme-switcher-select",
        ".version-badge",
      ]);
    }
  });
});

test.describe("Pointeur fin — rien ne change au bureau (#1051)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de style et de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  /** Boîte et police du premier élément visible qui correspond au sélecteur. */
  async function premier(page: Page, selecteur: string) {
    return page.evaluate((sel) => {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && el.checkVisibility())
          return {
            w: r.width,
            h: r.height,
            font: parseFloat(getComputedStyle(el).fontSize),
          };
      }
      return null;
    }, selecteur);
  }

  test("CA6. 1280 px au pointeur fin : boutons, champs, puces et en-tête inchangés", async ({
    page,
  }) => {
    await ouvrir(page, "/pages/composants.html", 1280);
    const p = await pointeur(page);
    expect(p, "contexte de bureau : pointer fine, pas coarse").toEqual({
      coarse: false,
      fine: true,
    });

    const btnSm = await premier(page, ".btn-sm");
    expect(btnSm, ".btn-sm présent").not.toBeNull();
    expect(
      Math.abs(btnSm!.h - 29.4),
      `.btn-sm : 29,4 px de haut (±1), mesuré ${btnSm!.h}`,
    ).toBeLessThanOrEqual(1);

    const chip = await premier(page, ".chip-close");
    expect(chip, ".chip-close présent").not.toBeNull();
    expect(
      Math.abs(chip!.w - 17.6),
      `.chip-close : 17,6 px de large (±1), mesuré ${chip!.w}`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(chip!.h - 17.6),
      `.chip-close : 17,6 px de haut (±1), mesuré ${chip!.h}`,
    ).toBeLessThanOrEqual(1);

    const notif = await premier(page, ".site-header .header-notification");
    expect(notif, ".header-notification présent").not.toBeNull();
    expect([notif!.w, notif!.h], ".header-notification : 34×34").toEqual([
      34, 34,
    ]);

    const mode = await premier(page, ".site-header .mode-switch");
    expect(mode, ".site-header .mode-switch présent").not.toBeNull();
    expect([mode!.w, mode!.h], ".site-header .mode-switch : 60×36").toEqual([
      60, 36,
    ]);

    await ouvrir(page, "/pages/formulaires.html", 1280);
    const input = await premier(page, 'input[type="text"].input');
    expect(input, 'input[type="text"].input présent').not.toBeNull();
    expect(
      Math.abs(input!.font - 14.4),
      `.input : police 14,4 px (±0,1), mesuré ${input!.font}`,
    ).toBeLessThanOrEqual(0.1);
    expect(
      Math.abs(input!.h - INPUT_H),
      `.input : ${INPUT_H} px de haut (±1), mesuré ${input!.h}`,
    ).toBeLessThanOrEqual(1);
  });
});
