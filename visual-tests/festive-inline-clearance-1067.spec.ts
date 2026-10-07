/**
 * festive-inline-clearance-1067.spec.ts — Reserve laterale du sapin de Noel pour les
 * gabarits larges, a partir de 1440px (#1067).
 *
 * Defaut : sur une vue de donnees (`.page-content--wide` plafonne a 1440px, `.content-grid` a
 * 1200px), les CARTES passaient sur le sapin de Noel (fixe, hors flux, peint SOUS le contenu,
 * #1043) : 190,8px de recouvrement mesure a 1440px pour `.page-content--wide`, 70,8px pour
 * `.content-grid` (chez tirokado, l'ecran de suivi). Correctif : `--festive-inline-clearance`
 * (festive.css) = EMPREINTE du sapin depuis le bord droit de la fenetre (largeur +
 * decalage + `--space-md`), posee a partir de 1440px sur
 * `:root[data-theme="noel"]:has(.festive-character:not(.festive-character--left))` ; les deux
 * gabarits (layout.css) n'en reservent que la PART MANQUANTE par un `padding-inline-end`
 * (`100%` du bloc conteneur moins la marge libre de la boite centree).
 *
 * Pourquoi un vrai navigateur et pas jsdom : un recouvrement est un fait de MISE EN PAGE
 * (boites reelles, `position: fixed`, tokens resolus, pourcentage de padding). jsdom ne
 * calcule aucune geometrie et laisserait passer le defaut (regle N1).
 *
 * Cas (A7 : TOUTES les boites descendantes du gabarit, cartes comprises, et non les seules
 * feuilles ; ecart >= `--space-md`, pas un simple non-recouvrement) :
 *  - LAT1  recouvrement : `.page-content--wide` et `.content-grid` x {1440, 1600}, aucune
 *          boite descendante ne coupe la boite du sapin a AUCUNE position de defilement,
 *          ecart contenu -> sapin >= `--space-md` - 0,5 ; NON-VACUITE : le meme cas sorti a
 *          `0px` (ecart < `--space-md`, et des boites qui coupent quand il est negatif) ;
 *  - LAT2  inchange : les trois gabarits x {1024, 1280, 1920}, plus `.page-content` a 1440 et
 *          1600 : `padding-right` = `padding-left` ;
 *  - LAT3  perte bornee : empreinte = largeur du sapin + decalage + `--space-md`, et la
 *          largeur de contenu perdue ne depasse pas l'empreinte ;
 *  - LAT4  `--character-width: 100px` sur `:root` est suivi (144,8px, ecart 16px) ;
 *  - LAT5  hors Noel (msyx) : rien ne change, jeton absent de `:root` ;
 *  - LAT6  variante `.festive-character--left` : jeton absent, rien ne change ;
 *  - LAT7  sortie `--festive-inline-clearance: 0px` sur le gabarit : rien ne change ;
 *  - LAT8  seuil inclusif : 48px a 1439px, l'empreinte a 1440px.
 *
 * Garde-fous (sans eux un test passerait pour la mauvaise raison) : theme rendu = celui
 * demande, gabarit rendu = celui demande, sapin present et visible en Noel (masque ailleurs),
 * balayage a plus d'une position, cartes et boites mesurees, jeton ACTIF avant toute sortie.
 * Attente `attendreReserveLaterale` : le padding calcule rattrape la cascade plusieurs frames
 * apres le `load` (#1045), sans elle un cas rougirait de facon intermittente.
 *
 * Annotations `lateral-1067 <gabarit> <largeur>` ecrites AVANT les assertions, sans borne.
 * Joue dans UN seul projet (`msyx-dark-desktop`) : theme, mode et largeur sont poses par le
 * test lui-meme, la matrice des projets le rejouerait sans rien couvrir de plus.
 *
 * Preuve par mutation (consignee dans le commit et la PR) :
 *  M1 retirer le bloc `@media (min-width: 1440px)` de festive.css -> LAT1 (4 cas), LAT3,
 *     LAT4, LAT8 rouges ;
 *  M2 retirer `- max(0px, (100% - var(--content-max)) / 2)` de layout.css -> LAT2 rouge a
 *     1920 ;
 *  M3 abaisser le seuil a 1280px -> LAT2 rouge a 1280 ;
 *  M4 `210px` litteral a la place de `var(--festive-character-w)` -> LAT4 rouge ;
 *  M5 retirer `:not(.festive-character--left)` de la garde -> LAT6 rouge.
 */
import { test, expect, type Page, type TestInfo } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-inline-clearance-1067.html";
const GABARIT = "#gabarit";
const TREE = ".festive-character";
// Tolerance de mesure (px) : celle de la spec.
const TOL = 0.5;

type Gabarit = "page-content--wide" | "content-grid" | "page-content";
type Viewport = { width: number; height: number };

const CLASSES: Record<Gabarit, string> = {
  "page-content--wide": "page-content page-content--wide",
  "content-grid": "content-grid",
  "page-content": "page-content",
};

const GABARITS_LARGES = ["page-content--wide", "content-grid"] as const;

async function ouvrir(
  page: Page,
  gabarit: Gabarit,
  theme: string,
  viewport: Viewport,
) {
  await page.addInitScript(
    ({ t }: { t: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", "dark");
      } catch {}
    },
    { t: theme },
  );
  await page.setViewportSize(viewport);
  // Pas d'animation : le balancement du sapin ne deplace pas sa boite pendant la mesure.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${FIXTURE}?gabarit=${gabarit}`);
  await page.waitForLoadState("networkidle");
  // Garde-fou : le theme demande est bien celui rendu (attribut absent = msyx).
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-theme") ?? "msyx",
      ),
    )
    .toBe(theme);
  // Garde-fou : le gabarit rendu est celui demande, et il est seul.
  await expect(page.locator(GABARIT)).toHaveCount(1);
  await expect(page.locator(GABARIT)).toHaveClass(CLASSES[gabarit]);
  await expect(page.locator(".site-header")).toBeVisible();
  // Garde-fou : sans sapin visible (Noel), aucune mesure n'a de sens ; ailleurs il est masque.
  if (theme === "noel") {
    await expect(page.locator(TREE)).toHaveCount(1);
    await expect(page.locator(TREE)).toBeVisible();
  } else {
    // nav.js pose le decor dans tous les themes ; hors Noel le sapin est masque, mais
    // `:has(.festive-character)` matche : seule la garde `[data-theme="noel"]` retient le jeton.
    await expect(page.locator(TREE)).toBeHidden();
  }
}

/**
 * Attend que le gabarit ait REELLEMENT recu la reserve que la cascade lui donne (#1045,
 * l. 5) : apres le `load`, le `padding` calcule du gabarit peut rester a sa valeur SANS
 * reserve pendant plusieurs frames alors que la variable est deja heritee.
 *
 * Condition attendue, independante de ce que le test verifie : `padding-right` ET
 * `padding-bottom` egalent ceux d'une sonde NEUVE de memes classes ET du meme style en ligne
 * (style calcule a neuf). Sonde en `position: absolute; visibility: hidden` et non en
 * `display: none` comme dans festive-clearance.spec.ts : le `padding-right` de ce gabarit
 * porte un POURCENTAGE (`100%`), que `getComputedStyle` ne resout en px que pour un element
 * qui a une boite (un `display: none` rendrait la formule `max(...)` telle quelle, jamais
 * egale au px du gabarit). Le bloc conteneur de la sonde (le viewport) a la largeur de celui
 * du gabarit (`body` sans marge), donc le meme `100%`.
 * Si la reserve n'est plus consommee (mutations M1 a M5), sonde et gabarit valent la meme
 * chose : l'attente passe tout de suite et ce sont les assertions qui rougissent.
 */
async function attendreReserveLaterale(page: Page, sel: string) {
  await expect
    .poll(() =>
      page.evaluate((s) => {
        const el = document.querySelector(s) as HTMLElement | null;
        if (!el || !el.parentElement) return "gabarit introuvable";
        const probe = document.createElement(el.tagName);
        probe.className = el.className;
        probe.style.cssText = el.style.cssText;
        probe.style.setProperty("position", "absolute");
        probe.style.setProperty("visibility", "hidden");
        probe.style.setProperty("top", "0");
        probe.style.setProperty("left", "0");
        el.parentElement.insertBefore(probe, el);
        const ps = getComputedStyle(probe);
        const expected = `${ps.paddingRight} / ${ps.paddingBottom}`;
        probe.remove();
        const cs = getComputedStyle(el);
        const actual = `${cs.paddingRight} / ${cs.paddingBottom}`;
        return actual === expected ? "ok" : `${actual} au lieu de ${expected}`;
      }, sel),
    )
    .toBe("ok");
}

interface Lecture {
  paddingGauche: number;
  paddingDroite: number;
  /** largeur de la boite de contenu : boite - paddings. */
  largeurContenu: number;
  /** --festive-inline-clearance lue par sonde (0 si non posee). */
  empreinte: number;
  /** valeur brute du jeton sur :root ('' si non pose). */
  jeton: string;
  /** --space-md resolu. */
  espaceMd: number;
  largeurClient: number;
  arbre: { left: number; right: number; width: number } | null;
}

/** Une lecture, UNE evaluation : paddings du gabarit, jeton, sapin, tokens resolus. */
const lire = (page: Page, sel = GABARIT): Promise<Lecture> =>
  page.evaluate(
    ({ s, treeSel }) => {
      const el = document.querySelector(s) as HTMLElement | null;
      if (!el) throw new Error(`gabarit introuvable : ${s}`);
      const sonde = (decl: string) => {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;visibility:hidden;${decl}`;
        document.body.appendChild(d);
        const px = parseFloat(getComputedStyle(d).paddingRight);
        d.remove();
        return px;
      };
      const cs = getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft);
      const pr = parseFloat(cs.paddingRight);
      const tree = document.querySelector(treeSel) as HTMLElement | null;
      const t = tree ? tree.getBoundingClientRect() : null;
      return {
        paddingGauche: pl,
        paddingDroite: pr,
        largeurContenu: el.getBoundingClientRect().width - pl - pr,
        empreinte: sonde("padding-right:var(--festive-inline-clearance)"),
        jeton: getComputedStyle(document.documentElement)
          .getPropertyValue("--festive-inline-clearance")
          .trim(),
        espaceMd: sonde("padding-right:var(--space-md)"),
        largeurClient: document.documentElement.clientWidth,
        arbre: t ? { left: t.left, right: t.right, width: t.width } : null,
      };
    },
    { s: sel, treeSel: TREE },
  );

/** Sortie documentee (A10) : `--festive-inline-clearance: 0px` en ligne sur le gabarit. */
const sortir = (page: Page, sel = GABARIT) =>
  page.evaluate((s) => {
    (document.querySelector(s) as HTMLElement).style.setProperty(
      "--festive-inline-clearance",
      "0px",
    );
  }, sel);

interface Balayage {
  positions: number;
  /** boites descendantes mesurees (visibles, non rognees a zero). */
  boites: number;
  cartes: number;
  /** description des boites qui coupent la boite du sapin, a une position quelconque. */
  coupures: string[];
  /** bord gauche du sapin - bord droit max des boites du gabarit, au defilement 0. */
  ecart: number;
}

/**
 * Balaie toute la course de defilement (pas = la moitie de la hauteur du sapin, comme
 * festive-under-content) et, a chaque position, cherche toute boite DESCENDANTE du gabarit
 * (cartes, tableau, lignes, boutons : pas seulement les feuilles) qui coupe la boite du sapin.
 * Une boite compte si elle est VISIBLE : aire > 0 apres rognage par les ancetres dont
 * `overflow` n'est pas `visible` et par la fenetre. Mesure d'abord l'ecart au defilement 0.
 */
const balayer = (page: Page, sel = GABARIT): Promise<Balayage> =>
  page.evaluate(
    async ({ s, treeSel }) => {
      const root = document.querySelector(s) as HTMLElement | null;
      const tree = document.querySelector(treeSel) as HTMLElement | null;
      if (!root) throw new Error(`gabarit introuvable : ${s}`);
      if (!tree) throw new Error("sapin introuvable");

      type Rect = { left: number; top: number; right: number; bottom: number };
      const boitesRognees = (avecFenetre: boolean) => {
        const out: { el: HTMLElement; r: Rect }[] = [];
        for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const b = el.getBoundingClientRect();
          let r: Rect = {
            left: b.left,
            top: b.top,
            right: b.right,
            bottom: b.bottom,
          };
          for (
            let a = el.parentElement;
            a && a !== document.documentElement;
            a = a.parentElement
          ) {
            const as = getComputedStyle(a);
            if (as.overflowX === "visible" && as.overflowY === "visible")
              continue;
            const ab = a.getBoundingClientRect();
            if (as.overflowX !== "visible") {
              r = {
                ...r,
                left: Math.max(r.left, ab.left),
                right: Math.min(r.right, ab.right),
              };
            }
            if (as.overflowY !== "visible") {
              r = {
                ...r,
                top: Math.max(r.top, ab.top),
                bottom: Math.min(r.bottom, ab.bottom),
              };
            }
          }
          if (avecFenetre) {
            r = {
              left: Math.max(r.left, 0),
              top: Math.max(r.top, 0),
              right: Math.min(r.right, window.innerWidth),
              bottom: Math.min(r.bottom, window.innerHeight),
            };
          }
          if (r.right - r.left > 0.01 && r.bottom - r.top > 0.01)
            out.push({ el, r });
        }
        return out;
      };
      const raf2 = () =>
        new Promise<void>((res) =>
          requestAnimationFrame(() => requestAnimationFrame(() => res())),
        );
      const decrire = (el: HTMLElement) =>
        `${el.tagName.toLowerCase()}${
          typeof el.className === "string" && el.className
            ? "." + el.className.trim().split(/\s+/).join(".")
            : ""
        } « ${(el.textContent ?? "").trim().slice(0, 30)} »`;

      // Ecart au defilement 0 : bord droit max des boites du gabarit (rognees par leurs
      // ancetres overflow, pas par la fenetre : une ligne sous la ligne de flottaison compte).
      window.scrollTo({ top: 0, behavior: "instant" });
      await raf2();
      const droitMax = Math.max(...boitesRognees(false).map((b) => b.r.right));
      const ecart = tree.getBoundingClientRect().left - droitMax;

      const coupures = new Set<string>();
      let positions = 0;
      let boites = 0;
      const hauteurSapin = tree.getBoundingClientRect().height;
      const pas = Math.max(40, Math.floor(hauteurSapin / 2));
      for (let y = 0; ; y += pas) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const top = Math.min(y, max);
        window.scrollTo({ top, behavior: "instant" });
        await raf2();
        positions += 1;
        const t = tree.getBoundingClientRect();
        const mesurees = boitesRognees(true);
        boites = Math.max(boites, mesurees.length);
        for (const { el, r } of mesurees) {
          const w = Math.min(r.right, t.right) - Math.max(r.left, t.left);
          const h = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
          if (w > 0.01 && h > 0.01)
            coupures.add(`${decrire(el)} @scroll=${top}`);
        }
        if (top >= max) break;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      return {
        positions,
        boites,
        cartes: root.querySelectorAll(".card").length,
        coupures: Array.from(coupures),
        ecart,
      };
    },
    { s: sel, treeSel: TREE },
  );

const noter = (
  testInfo: TestInfo,
  gabarit: string,
  largeur: number,
  valeurs: Record<string, number | string>,
) =>
  testInfo.annotations.push({
    type: `lateral-1067 ${gabarit} ${largeur}`,
    description: Object.entries(valeurs)
      .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(1) : v}`)
      .join(" "),
  });

/** Empreinte attendue, calculee sur la GEOMETRIE rendue du sapin, jamais sur la formule. */
const empreinteAttendue = (l: Lecture) => {
  if (!l.arbre)
    throw new Error("sapin absent : empreinte attendue incalculable");
  return l.arbre.width + (l.largeurClient - l.arbre.right) + l.espaceMd;
};

test.describe("Sapin de Noel — reserve laterale des gabarits larges (#1067)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `theme, mode et largeur sont poses par le test : un seul projet (${PROJECT})`,
    );
  });

  // LAT1 — recouvrement, 4 cas, avec preuve de non-vacuite.
  for (const gabarit of GABARITS_LARGES) {
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
    ]) {
      test(`LAT1 ${gabarit} @${vp.width}x${vp.height} : aucune boite du gabarit ne coupe le sapin, ecart >= --space-md`, async ({
        page,
      }, testInfo) => {
        await ouvrir(page, gabarit, "noel", vp);
        await attendreReserveLaterale(page, GABARIT);
        const l = await lire(page);
        const b = await balayer(page);

        // Meme cas SORTI a 0px : la mesure doit voir l'ancien defaut.
        await sortir(page);
        await attendreReserveLaterale(page, GABARIT);
        const sans = await balayer(page);

        noter(testInfo, gabarit, vp.width, {
          "padding-fin": l.paddingDroite,
          ecart: b.ecart,
          empreinte: l.empreinte,
          positions: b.positions,
          boites: b.boites,
          "ecart-sorti-0px": sans.ecart,
          "coupures-sorti-0px": sans.coupures.length,
        });

        // Garde-fous : le balayage et la mesure ne sont pas vacants.
        expect(l.arbre, "sapin mesure").not.toBeNull();
        expect(b.positions, "positions de defilement").toBeGreaterThan(1);
        expect(b.cartes, "cartes dans le gabarit").toBeGreaterThan(0);
        expect(b.boites, "boites descendantes mesurees").toBeGreaterThan(20);
        expect(l.empreinte, "jeton actif a cette largeur").toBeGreaterThan(0);

        // Le critere.
        expect(b.coupures, "boites qui coupent le sapin").toEqual([]);
        expect(b.ecart, "ecart contenu -> sapin").toBeGreaterThanOrEqual(
          l.espaceMd - TOL,
        );

        // Non-vacuite : sans la reserve, l'ecart tombe sous --space-md, et quand il est
        // negatif le balayage VOIT des boites couper le sapin.
        expect(sans.ecart, "ecart une fois sorti a 0px").toBeLessThan(
          l.espaceMd,
        );
        if (sans.ecart < 0) {
          expect(
            sans.coupures.length,
            "le balayage voit le recouvrement d'origine",
          ).toBeGreaterThan(0);
        }
      });
    }
  }

  // LAT2 — inchange : le padding de fin reste egal au padding de debut.
  const LAT2: { gabarit: Gabarit; vp: Viewport }[] = [
    ...(
      ["page-content--wide", "content-grid", "page-content"] as const
    ).flatMap((gabarit) =>
      [
        { width: 1024, height: 768 },
        { width: 1280, height: 800 },
        { width: 1920, height: 1080 },
      ].map((vp) => ({ gabarit, vp })),
    ),
    { gabarit: "page-content", vp: { width: 1440, height: 900 } },
    { gabarit: "page-content", vp: { width: 1600, height: 900 } },
  ];
  for (const { gabarit, vp } of LAT2) {
    test(`LAT2 ${gabarit} @${vp.width}x${vp.height} : padding de fin inchange`, async ({
      page,
    }, testInfo) => {
      await ouvrir(page, gabarit, "noel", vp);
      await attendreReserveLaterale(page, GABARIT);
      const l = await lire(page);
      noter(testInfo, gabarit, vp.width, {
        "padding-debut": l.paddingGauche,
        "padding-fin": l.paddingDroite,
        empreinte: l.empreinte,
      });
      expect(l.arbre, "sapin mesure").not.toBeNull();
      expect(l.paddingGauche, "padding de debut").toBeGreaterThan(0);
      expect(l.paddingDroite, "padding de fin = padding de debut").toBeCloseTo(
        l.paddingGauche,
        1,
      );
    });
  }

  // LAT3 — perte bornee : l'empreinte egale la geometrie du sapin, la perte ne la depasse pas.
  for (const gabarit of GABARITS_LARGES) {
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
    ]) {
      test(`LAT3 ${gabarit} @${vp.width}x${vp.height} : empreinte = largeur + decalage + --space-md, perte <= empreinte`, async ({
        page,
      }, testInfo) => {
        await ouvrir(page, gabarit, "noel", vp);
        await attendreReserveLaterale(page, GABARIT);
        const avec = await lire(page);
        await sortir(page);
        await attendreReserveLaterale(page, GABARIT);
        const sorti = await lire(page);
        const perte = sorti.largeurContenu - avec.largeurContenu;
        const attendue = empreinteAttendue(avec);
        noter(testInfo, gabarit, vp.width, {
          empreinte: avec.empreinte,
          "empreinte-attendue": attendue,
          perte,
        });
        expect(avec.empreinte, "jeton actif").toBeGreaterThan(0);
        expect(Math.abs(avec.empreinte - attendue)).toBeLessThanOrEqual(TOL);
        expect(perte, "largeur de contenu perdue").toBeGreaterThanOrEqual(0);
        expect(perte, "perte <= empreinte").toBeLessThanOrEqual(
          avec.empreinte + TOL,
        );
      });
    }
  }

  // LAT4 — la surcharge `--character-width` sur :root est suivie.
  test("LAT4 --character-width: 100px sur :root @1440x900 : la reserve suit le sapin", async ({
    page,
  }, testInfo) => {
    for (const gabarit of GABARITS_LARGES) {
      await ouvrir(page, gabarit, "noel", { width: 1440, height: 900 });
      await page.evaluate(() =>
        document.documentElement.style.setProperty(
          "--character-width",
          "100px",
        ),
      );
      await attendreReserveLaterale(page, GABARIT);
      const l = await lire(page);
      const b = await balayer(page);
      const attendue = empreinteAttendue(l);
      noter(testInfo, gabarit, 1440, {
        "largeur-sapin": l.arbre?.width ?? -1,
        "padding-fin": l.paddingDroite,
        "empreinte-attendue": attendue,
        ecart: b.ecart,
      });
      expect(l.arbre?.width, `${gabarit} : sapin de 100px`).toBeCloseTo(100, 0);
      if (gabarit === "page-content--wide") {
        expect(
          Math.abs(l.paddingDroite - attendue),
          `${gabarit} : padding de fin`,
        ).toBeLessThanOrEqual(TOL);
        expect(
          Math.abs(b.ecart - l.espaceMd),
          `${gabarit} : ecart`,
        ).toBeLessThanOrEqual(TOL);
      } else {
        // content-grid : sa marge libre suffit (39,2px d'ecart), il reste a sa gouttiere.
        expect(l.paddingDroite, `${gabarit} : padding de fin`).toBeCloseTo(
          l.paddingGauche,
          1,
        );
        expect(b.ecart, `${gabarit} : ecart`).toBeGreaterThanOrEqual(
          l.espaceMd - TOL,
        );
      }
    }
  });

  // LAT5 — hors Noel (msyx) : aucune reserve, jeton non pose.
  for (const gabarit of GABARITS_LARGES) {
    test(`LAT5 ${gabarit} @1440x900 hors Noel : aucune reserve`, async ({
      page,
    }, testInfo) => {
      await ouvrir(page, gabarit, "msyx", { width: 1440, height: 900 });
      await attendreReserveLaterale(page, GABARIT);
      const l = await lire(page);
      noter(testInfo, gabarit, 1440, {
        "padding-debut": l.paddingGauche,
        "padding-fin": l.paddingDroite,
        jeton: l.jeton || "(vide)",
      });
      expect(l.jeton, "jeton sur :root").toBe("");
      expect(l.paddingGauche, "padding de debut").toBeGreaterThan(0);
      expect(l.paddingDroite, "padding de fin = padding de debut").toBeCloseTo(
        l.paddingGauche,
        1,
      );
    });
  }

  // LAT6 — la variante gauche du sapin ne declenche pas de reserve a droite.
  test("LAT6 .festive-character--left @1440x900 : jeton absent, padding de fin inchange", async ({
    page,
  }, testInfo) => {
    await ouvrir(page, "page-content--wide", "noel", {
      width: 1440,
      height: 900,
    });
    await attendreReserveLaterale(page, GABARIT);
    const avant = await lire(page);
    await page.evaluate(
      (treeSel) =>
        document
          .querySelector(treeSel)!
          .classList.add("festive-character--left"),
      TREE,
    );
    await attendreReserveLaterale(page, GABARIT);
    const apres = await lire(page);
    noter(testInfo, "page-content--wide", 1440, {
      "padding-fin-avant": avant.paddingDroite,
      "padding-fin-apres": apres.paddingDroite,
      "jeton-apres": apres.jeton || "(vide)",
    });
    // Garde-fou : AVANT la classe, la reserve est active (sinon la sortie ne prouve rien).
    expect(avant.jeton, "jeton avant").not.toBe("");
    expect(avant.paddingDroite, "reserve active avant").toBeGreaterThan(
      avant.paddingGauche + TOL,
    );
    expect(apres.jeton, "jeton avec la variante gauche").toBe("");
    expect(
      apres.paddingDroite,
      "padding de fin = padding de debut",
    ).toBeCloseTo(apres.paddingGauche, 1);
  });

  // LAT7 — la sortie documentee ramene le rendu d'avant.
  for (const gabarit of GABARITS_LARGES) {
    test(`LAT7 ${gabarit} @1440x900 : --festive-inline-clearance: 0px sur le gabarit`, async ({
      page,
    }, testInfo) => {
      await ouvrir(page, gabarit, "noel", { width: 1440, height: 900 });
      await attendreReserveLaterale(page, GABARIT);
      const avant = await lire(page);
      await sortir(page);
      await attendreReserveLaterale(page, GABARIT);
      const apres = await lire(page);
      noter(testInfo, gabarit, 1440, {
        "padding-fin-avant": avant.paddingDroite,
        "padding-fin-apres": apres.paddingDroite,
        "padding-debut": apres.paddingGauche,
      });
      // Garde-fou : le jeton de :root est ACTIF, la sortie sort donc de quelque chose.
      expect(avant.jeton, "jeton de :root").not.toBe("");
      expect(avant.empreinte, "jeton actif").toBeGreaterThan(0);
      expect(apres.paddingDroite, "padding de fin apres sortie").toBeCloseTo(
        apres.paddingGauche,
        1,
      );
    });
  }

  // LAT8 — seuil inclusif a 1440px.
  test("LAT8 seuil : 1439px sans reserve, 1440px avec", async ({
    page,
  }, testInfo) => {
    await ouvrir(page, "page-content--wide", "noel", {
      width: 1439,
      height: 900,
    });
    await attendreReserveLaterale(page, GABARIT);
    const sous = await lire(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(
        async () => {
          const l = await lire(page);
          return Math.abs(l.paddingDroite - empreinteAttendue(l));
        },
        { message: "padding de fin a 1440px = empreinte attendue" },
      )
      .toBeLessThanOrEqual(TOL);
    await attendreReserveLaterale(page, GABARIT);
    const sur = await lire(page);

    noter(testInfo, "page-content--wide", 1439, {
      "padding-debut": sous.paddingGauche,
      "padding-fin": sous.paddingDroite,
      jeton: sous.jeton || "(vide)",
    });
    noter(testInfo, "page-content--wide", 1440, {
      "padding-fin": sur.paddingDroite,
      empreinte: sur.empreinte,
      "empreinte-attendue": empreinteAttendue(sur),
    });
    expect(sous.jeton, "jeton a 1439px").toBe("");
    expect(sous.paddingDroite, "padding de fin a 1439px").toBeCloseTo(
      sous.paddingGauche,
      1,
    );
    expect(sur.empreinte, "jeton actif a 1440px").toBeGreaterThan(0);
    expect(sur.paddingDroite, "padding de fin a 1440px").toBeGreaterThan(
      sur.paddingGauche + TOL,
    );
  });
});
