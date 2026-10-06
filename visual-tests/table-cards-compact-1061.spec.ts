/**
 * table-cards-compact-1061.spec.ts — carte de saisie compacte `.table-cards--compact` (#1061).
 *
 * En mode cartes, une cellule de champ empile son libellé (18,4 px + 4 px de marge) au-dessus
 * d'un champ de 44 px. Le modificateur opt-in `.table-cards--compact` met libellé et champ sur
 * UNE ligne (flex, alignement par ligne de base) : 2 × 22,4 px de gagnés par ligne à deux champs.
 * Les cellules de lecture, d'actions et la ligne vide ne changent pas ; un champ qui n'a plus
 * 7,5rem à côté de son libellé passe dessous (repli, sans media query) ; le mode tableau n'est pas
 * touché : le bloc précède les restaurations de 768 et 1024 px, c'est l'ORDRE qui les fait gagner.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un recouvrement, un repli à largeur de cellule donnée
 * et une boîte de tableau sont des faits de MISE EN PAGE, et le pointeur grossier est une media
 * query. jsdom ne calcule aucune géométrie et n'évalue aucune media query. La spec pose elle-même
 * la largeur et le pointeur (`hasTouch` + `isMobile` pour le pointeur grossier) et vérifie
 * `(pointer: coarse)` avant de mesurer : sans cela, un cas « grossier » passerait à vide.
 *
 * Fixture : visual-tests/fixtures/table-cards-compact-1061.html — trois paires « compacte / jumelle
 * sans --compact » aux lignes identiques : #t-c / #t-n (saisie, tableau dès 768 px), #t-lg-c /
 * #t-lg-n (la même avec --lg), #t-long-c / #t-long-n (libellés « Adresse électronique » et
 * « Correspondances »). Nom et E-mail en champs, Statut en lecture libellée, Exclusions en lecture
 * sans libellé, actions, une ligne en erreur de champ, une ligne d'ajout dans le <tfoot>.
 *
 * Cas (critères d'acceptation de la spec #1061) :
 *  CA1 — 375 px, pointeur fin ET grossier : chaque ligne à deux champs de la compacte est plus
 *        basse que sa jumelle d'au moins 40 px. Les gains mesurés sont écrits dans la sortie
 *        (lignes « MESURE CA1 ») : le parent les poste sur #1061.
 *  CA2 — 375 px, fin et grossier : par cellule de champ, libellé et champ se recouvrent
 *        verticalement, le libellé est contenu dans la hauteur du champ, `libellé.right <=
 *        champ.left`, `elementFromPoint` rend le champ puis le libellé en leurs centres ; une
 *        erreur affichée ne déplace pas le libellé (la même ligne, erreur retirée).
 *  CA3 — 375 px : `ariaSnapshot()` identique avec et sans la classe (basculée dans la page) ;
 *        chaque libellé reste visible (boîte non nulle, `display` ≠ none, texte = en-tête de sa
 *        colonne) et le nom accessible du champ commence par ce texte (WCAG 2.5.3).
 *  CA4 — pointeur grossier, 375 et 320 px : champs >= 44 px de haut et 16 px de police, boutons
 *        d'action >= 44 x 44 px, mêmes tailles que dans la jumelle.
 *  CA5 — 375 et 320 px, fin et grossier : cellules d'actions et de lecture (libellée ou non)
 *        identiques à celles de la jumelle (taille de la cellule, boîte de chaque descendant
 *        relative à la cellule, ± 0,5 px).
 *  CA6 — repli : à 320 px (largeur utile < 216 px) et, pour les libellés longs, à 375 px, un
 *        champ replié est sous son libellé et occupe toute la largeur utile ; aucune ligne
 *        compacte n'est plus haute que sa jumelle ; aucun mot de libellé n'est coupé ; ni le
 *        `.table-wrap` ni la page ne défilent horizontalement.
 *  CA7 — mode tableau (768 px pour md, 1024 et 1280 px pour md, --lg et libellés longs) : chaque
 *        boîte de la compacte égale celle de sa jumelle (± 0,5 px) ; plus, tablette : à 768 px
 *        la table --lg compacte reste en cartes compactes (colonne de libellés de 5,5rem).
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : ni le thème ni le mode ne changent une boîte.
 *
 * CA8 — preuves par mutation : voir le message du commit (« comportement neutralisé → N tests
 * rouges ») et la section ci-dessous.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/table-cards-compact-1061.html";
/** Tolérance de mesure en px (arrondi de sous-pixel de la mise en page). */
const TOL = 0.5;
/** Cible tactile minimale (WCAG 2.5.5, `--touch-target`). */
const TARGET = 44;
/** Police minimale d'un champ au pointeur grossier (Safari iOS zoome en dessous, #1051). */
const FONT_MIN = 16;
/** Gain de hauteur minimal d'une ligne à deux champs (mesuré : 2 × 22,4 = 44,8 px). */
const GAIN_MIN = 40;
/** Largeur utile sous laquelle le champ n'a plus 7,5rem à côté du libellé : 5,5rem + 0,5rem + 7,5rem. */
const FOLD_W = 216;

type Pointeur = "fin" | "grossier";
type Paire = { nom: string; c: string; n: string; wrap: string };
const MD: Paire = { nom: "md", c: "t-c", n: "t-n", wrap: "wrap-c" };
const LG: Paire = { nom: "--lg", c: "t-lg-c", n: "t-lg-n", wrap: "wrap-lg-c" };
const LONG: Paire = {
  nom: "libellés longs",
  c: "t-long-c",
  n: "t-long-n",
  wrap: "wrap-long-c",
};

type Rect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  w: number;
  h: number;
};
type Champ = {
  nom: string | null;
  libelle: string;
  entete: string;
  label: Rect;
  input: Rect;
  group: Rect;
  utile: number;
  labelDisplay: string;
  hitInput: boolean;
  hitLabel: boolean;
  coupes: string[];
};
type Boite = {
  tag: string;
  display: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

async function ouvrir(page: Page, largeur: number) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // `load` suffit : la fixture n'a ni script ni requête après le chargement, et les polices sont
  // locales. Un `networkidle` a pendu 30 s sur 1 ouverture sur 24 (cause non établie) : retiré.
  await page.goto(FIXTURE);
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

async function verifierPointeur(page: Page, pointeur: Pointeur) {
  const m = await page.evaluate(() => ({
    coarse: matchMedia("(pointer: coarse)").matches,
    fine: matchMedia("(pointer: fine)").matches,
  }));
  if (pointeur === "grossier") {
    expect(
      m.coarse,
      "l'émulation tactile n'est pas active ((pointer: coarse) faux) : la mesure se ferait au pointeur fin",
    ).toBe(true);
  } else {
    expect(
      m.coarse,
      "(pointer: coarse) actif : ce cas doit se jouer au pointeur fin",
    ).toBe(false);
    expect(m.fine, "(pointer: fine) inactif").toBe(true);
  }
}

/** Hauteur de chaque ligne de données (tbody puis tfoot) d'un tableau. */
async function hauteursLignes(page: Page, id: string) {
  return page.evaluate(
    (tid) =>
      [...document.querySelectorAll(`#${tid} tbody tr, #${tid} tfoot tr`)].map(
        (tr) => tr.getBoundingClientRect().height,
      ),
    id,
  );
}

/** Géométrie de chaque cellule de CHAMP (libellé immédiatement suivi d'un `.input-group`). */
async function champs(page: Page, id: string): Promise<Champ[]> {
  return page.evaluate((tid) => {
    const rect = (el: Element) => {
      const b = el.getBoundingClientRect();
      return {
        top: b.top,
        bottom: b.bottom,
        left: b.left,
        right: b.right,
        w: b.width,
        h: b.height,
      };
    };
    const table = document.getElementById(tid) as HTMLElement;
    const entetes = [...table.querySelectorAll("thead th")].map((th) =>
      (th.textContent ?? "").trim(),
    );
    const out: unknown[] = [];
    for (const td of table.querySelectorAll<HTMLElement>("td")) {
      const label = td.querySelector<HTMLElement>(
        ":scope > .table-cards-label",
      );
      const group = td.querySelector<HTMLElement>(
        ":scope > .table-cards-label + .input-group",
      );
      if (!label || !group) continue;
      const input = group.querySelector<HTMLElement>(".input") as HTMLElement;
      input.scrollIntoView({ block: "center", behavior: "instant" });
      const rl = rect(label);
      const ri = rect(input);
      const cs = getComputedStyle(td);
      // Mots du libellé répartis sur deux lignes : un Range par mot, deux `top` distincts = coupé.
      const coupes: string[] = [];
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const texte = n.nodeValue ?? "";
        for (const m of texte.matchAll(/\S+/g)) {
          const debut = m.index ?? 0;
          const r = document.createRange();
          r.setStart(n, debut);
          r.setEnd(n, debut + m[0].length);
          const tops = new Set(
            [...r.getClientRects()].map((q) => Math.round(q.top)),
          );
          if (tops.size > 1) coupes.push(m[0]);
        }
      }
      out.push({
        nom: input.getAttribute("aria-label"),
        libelle: (label.textContent ?? "").trim(),
        entete: entetes[td.cellIndex] ?? "",
        label: rl,
        input: ri,
        group: rect(group),
        utile:
          td.clientWidth -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight),
        labelDisplay: getComputedStyle(label).display,
        hitInput:
          document.elementFromPoint(ri.left + ri.w / 2, ri.top + ri.h / 2) ===
          input,
        hitLabel:
          document.elementFromPoint(rl.left + rl.w / 2, rl.top + rl.h / 2) ===
          label,
        coupes,
      });
    }
    return out;
  }, id) as Promise<Champ[]>;
}

/** Cellules qui ne sont PAS des cellules de champ : taille, et boîte de chaque descendant relative à la cellule. */
async function cellulesHorsChamp(page: Page, id: string) {
  return page.evaluate((tid) => {
    const table = document.getElementById(tid) as HTMLElement;
    const out: { rang: string; w: number; h: number; enfants: number[][] }[] =
      [];
    [...table.querySelectorAll("tbody tr, tfoot tr")].forEach((tr, ri) => {
      [...tr.children].forEach((td, ci) => {
        if (td.querySelector(":scope > .table-cards-label + .input-group"))
          return;
        const o = td.getBoundingClientRect();
        const enfants = [...td.querySelectorAll("*")].map((el) => {
          // `display: none` (les <form hidden> de la cellule d'actions) n'a pas de boîte : ses
          // coordonnées nulles dépendraient de la position du tableau dans la page.
          if (getComputedStyle(el).display === "none") return [0, 0, 0, 0];
          const b = el.getBoundingClientRect();
          return [b.left - o.left, b.top - o.top, b.width, b.height];
        });
        out.push({
          rang: `ligne ${ri}, cellule ${ci}`,
          w: o.width,
          h: o.height,
          enfants,
        });
      });
    });
    return out;
  }, id);
}

/** Boîte de chaque élément structurant, relative à l'origine du tableau (table-mode : jumeaux comparables). */
async function boites(page: Page, id: string): Promise<Boite[]> {
  return page.evaluate((tid) => {
    const table = document.getElementById(tid) as HTMLElement;
    const o = table.getBoundingClientRect();
    const els = [
      table,
      ...table.querySelectorAll(
        "thead, tbody, tfoot, tr, th, td, .input-group, .input, .input-error-msg, .chip-group, .chip, button, .table-cards-label",
      ),
    ];
    return els.map((el) => {
      const b = el.getBoundingClientRect();
      const display = getComputedStyle(el).display;
      const tag = el.tagName.toLowerCase();
      // `display: none` n'a pas de boîte : coordonnées neutralisées (elles dépendraient de la page).
      if (display === "none") return { tag, display, x: 0, y: 0, w: 0, h: 0 };
      return {
        tag,
        display,
        x: b.left - o.left,
        y: b.top - o.top,
        w: b.width,
        h: b.height,
      };
    });
  }, id);
}

async function controles(page: Page, id: string) {
  return page.evaluate((tid) => {
    const t = document.getElementById(tid) as HTMLElement;
    return {
      champs: [...t.querySelectorAll<HTMLElement>(".input")].map((el) => ({
        h: el.getBoundingClientRect().height,
        police: parseFloat(getComputedStyle(el).fontSize),
      })),
      boutons: [
        ...t.querySelectorAll<HTMLElement>("td.table-cards-actions button"),
      ].map((el) => {
        const b = el.getBoundingClientRect();
        return { w: b.width, h: b.height };
      }),
    };
  }, id);
}

async function defilement(page: Page, wrapId: string) {
  return page.evaluate((id) => {
    const w = document.getElementById(id) as HTMLElement;
    return {
      wrap: { scroll: w.scrollWidth, client: w.clientWidth },
      page: document.documentElement.scrollWidth,
    };
  }, wrapId);
}

/** Position du libellé de la ligne en erreur (E-mail de « Dominique Lefèvre »), relative à sa cellule. */
async function positionErreur(page: Page, id: string) {
  return page.evaluate((tid) => {
    const input = document.getElementById(`${tid}-r2-email`) as HTMLElement;
    const td = input.closest("td") as HTMLElement;
    const label = td.querySelector(".table-cards-label") as HTMLElement;
    const t = td.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    return {
      cellH: t.height,
      labelTop: l.top - t.top,
      labelLeft: l.left - t.left,
      inputTop: i.top - t.top,
      erreurAffichee: !!td.querySelector(".input-error-msg:not([hidden])"),
    };
  }, id);
}

async function retirerErreur(page: Page, id: string) {
  await page.evaluate((tid) => {
    const input = document.getElementById(`${tid}-r2-email`) as HTMLElement;
    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    (document.getElementById(`${tid}-r2-email-error`) as HTMLElement).hidden =
      true;
  }, id);
}

const proche = (a: number, b: number) => Math.abs(a - b);

for (const pointeur of ["fin", "grossier"] as const) {
  test.describe(`carte compacte, pointeur ${pointeur} (#1061)`, () => {
    test.use(pointeur === "grossier" ? { hasTouch: true, isMobile: true } : {});

    test.beforeEach(({}, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        `mesure de mise en page, jouée une seule fois (${PROJECT})`,
      );
    });

    test("CA1. 375 px : la ligne compacte est plus basse que sa jumelle d'au moins 40 px", async ({
      page,
    }) => {
      await ouvrir(page, 375);
      await verifierPointeur(page, pointeur);
      const lignes = [
        "ligne type (2 champs, lecture libellée, lecture sans libellé, actions)",
        "ligne en erreur de champ",
        "ligne d'ajout du <tfoot>",
      ];
      for (const paire of [MD, LG]) {
        const c = await hauteursLignes(page, paire.c);
        const n = await hauteursLignes(page, paire.n);
        expect(c.length, `${paire.c} : 2 lignes + la ligne d'ajout`).toBe(3);
        expect(n.length, `${paire.n} : 2 lignes + la ligne d'ajout`).toBe(3);
        c.forEach((h, i) => {
          const gain = n[i] - h;
          console.log(
            `MESURE CA1 · pointeur ${pointeur} · 375 px · ${paire.nom} · ${lignes[i]} : jumelle ${n[i].toFixed(2)} px, compacte ${h.toFixed(2)} px, gain ${gain.toFixed(2)} px`,
          );
          expect(
            gain,
            `${paire.c} · ${lignes[i]} : gain de hauteur`,
          ).toBeGreaterThanOrEqual(GAIN_MIN);
        });
      }
    });

    test("CA2. 375 px : libellé et champ sur une même ligne, sans chevauchement, erreur sans effet", async ({
      page,
    }) => {
      await ouvrir(page, 375);
      await verifierPointeur(page, pointeur);
      let mesures = 0;
      for (const paire of [MD, LG]) {
        const liste = await champs(page, paire.c);
        expect(liste.length, `${paire.c} : 3 lignes x 2 champs`).toBe(6);
        for (const g of liste) {
          const qui = `${paire.c} · ${g.nom}`;
          mesures++;
          expect(
            g.utile,
            `${qui} : prémisse de la fixture, largeur utile de la cellule à 375 px`,
          ).toBeGreaterThanOrEqual(FOLD_W);
          expect(
            g.label.top < g.input.bottom && g.label.bottom > g.input.top,
            `${qui} : le libellé et le champ se recouvrent verticalement`,
          ).toBe(true);
          expect(
            g.label.top,
            `${qui} : libellé contenu dans la hauteur du champ (haut)`,
          ).toBeGreaterThanOrEqual(g.input.top - TOL);
          expect(
            g.label.bottom,
            `${qui} : libellé contenu dans la hauteur du champ (bas)`,
          ).toBeLessThanOrEqual(g.input.bottom + TOL);
          expect(
            g.label.right,
            `${qui} : libellé à gauche du champ`,
          ).toBeLessThanOrEqual(g.input.left + 0.01);
          expect(
            g.hitInput,
            `${qui} : elementFromPoint au centre du champ rend le champ`,
          ).toBe(true);
          expect(
            g.hitLabel,
            `${qui} : elementFromPoint au centre du libellé rend le libellé`,
          ).toBe(true);
        }
        // Une erreur affichée sous le champ ne déplace pas le libellé (même ligne, erreur retirée).
        const avec = await positionErreur(page, paire.c);
        expect(
          avec.erreurAffichee,
          `${paire.c} : le message d'erreur est affiché`,
        ).toBe(true);
        await retirerErreur(page, paire.c);
        const sans = await positionErreur(page, paire.c);
        expect(sans.erreurAffichee, `${paire.c} : erreur retirée`).toBe(false);
        expect(
          avec.cellH - sans.cellH,
          `${paire.c} : le message d'erreur rend la cellule plus haute (sinon le cas ne prouve rien)`,
        ).toBeGreaterThanOrEqual(10);
        expect(
          proche(avec.labelTop, sans.labelTop),
          `${paire.c} : libellé, décalage vertical`,
        ).toBeLessThanOrEqual(TOL);
        expect(
          proche(avec.labelLeft, sans.labelLeft),
          `${paire.c} : libellé, décalage horizontal`,
        ).toBeLessThanOrEqual(TOL);
        expect(
          proche(avec.inputTop, sans.inputTop),
          `${paire.c} : champ, décalage vertical`,
        ).toBeLessThanOrEqual(TOL);
      }
      expect(mesures, "12 cellules de champ mesurées").toBe(12);
    });

    test("CA5. 375 et 320 px : actions et cellules de lecture identiques à celles de la jumelle", async ({
      page,
    }) => {
      for (const largeur of [375, 320]) {
        await ouvrir(page, largeur);
        await verifierPointeur(page, pointeur);
        for (const paire of [MD, LG, LONG]) {
          const c = await cellulesHorsChamp(page, paire.c);
          const n = await cellulesHorsChamp(page, paire.n);
          // Saisie : Statut, Exclusions, Actions x 3 lignes ; libellés longs : Actions x 3 lignes.
          expect(c.length, `${paire.c} : cellules hors champ`).toBe(
            paire === LONG ? 3 : 9,
          );
          expect(
            c.length,
            `${paire.c} / ${paire.n} : même nombre de cellules`,
          ).toBe(n.length);
          c.forEach((cell, i) => {
            const qui = `${largeur} px · ${paire.c} · ${cell.rang}`;
            expect(
              proche(cell.w, n[i].w),
              `${qui} : largeur de la cellule`,
            ).toBeLessThanOrEqual(TOL);
            expect(
              proche(cell.h, n[i].h),
              `${qui} : hauteur de la cellule`,
            ).toBeLessThanOrEqual(TOL);
            expect(cell.enfants.length, `${qui} : mêmes descendants`).toBe(
              n[i].enfants.length,
            );
            cell.enfants.forEach((b, j) => {
              b.forEach((v, k) => {
                expect(
                  proche(v, n[i].enfants[j][k]),
                  `${qui} · descendant ${j} · ${["x", "y", "largeur", "hauteur"][k]}`,
                ).toBeLessThanOrEqual(TOL);
              });
            });
          });
        }
      }
    });

    test("CA6. repli : sous 216 px de largeur utile le champ passe sous son libellé, sans surhauteur ni mot coupé", async ({
      page,
    }) => {
      const cas: [number, Paire[]][] = [
        [320, [MD, LG, LONG]],
        [375, [LONG]],
      ];
      for (const [largeur, paires] of cas) {
        await ouvrir(page, largeur);
        await verifierPointeur(page, pointeur);
        for (const paire of paires) {
          const liste = await champs(page, paire.c);
          expect(liste.length, `${paire.c} : 3 lignes x 2 champs`).toBe(6);
          let replies = 0;
          for (const g of liste) {
            const qui = `${largeur} px · ${paire.c} · ${g.nom}`;
            const replie = g.input.top >= g.label.bottom - TOL;
            if (largeur === 320) {
              expect(
                g.utile,
                `${qui} : prémisse de la fixture, largeur utile à 320 px`,
              ).toBeLessThan(FOLD_W);
            }
            if (g.utile < FOLD_W) {
              expect(
                replie,
                `${qui} : largeur utile ${g.utile.toFixed(1)} px < 216 px, le champ doit être sous son libellé`,
              ).toBe(true);
            }
            if (replie) {
              replies++;
              expect(
                proche(g.input.w, g.utile),
                `${qui} : le champ replié occupe toute la largeur utile (${g.input.w.toFixed(1)} px sur ${g.utile.toFixed(1)} px)`,
              ).toBeLessThanOrEqual(TOL);
              expect(
                proche(g.group.w, g.utile),
                `${qui} : le groupe de champ replié occupe toute la largeur utile`,
              ).toBeLessThanOrEqual(TOL);
            }
            expect(g.coupes, `${qui} : aucun mot de libellé coupé`).toEqual([]);
          }
          console.log(
            `MESURE CA6 · pointeur ${pointeur} · ${largeur} px · ${paire.c} : largeur utile ${liste[0].utile.toFixed(1)} px, ${replies}/${liste.length} champs repliés`,
          );
          expect(
            replies,
            `${largeur} px · ${paire.c} : au moins un champ replié (sinon le cas ne prouve rien)`,
          ).toBeGreaterThan(0);
          const hc = await hauteursLignes(page, paire.c);
          const hn = await hauteursLignes(page, paire.n);
          hc.forEach((h, i) => {
            expect(
              h,
              `${largeur} px · ${paire.c} · ligne ${i} : pas plus haute que sa jumelle (${hn[i].toFixed(2)} px)`,
            ).toBeLessThanOrEqual(hn[i] + TOL);
          });
          const s = await defilement(page, paire.wrap);
          expect(
            s.wrap.scroll,
            `${largeur} px · ${paire.wrap} ne défile pas`,
          ).toBeLessThanOrEqual(s.wrap.client);
          expect(
            s.page,
            `${largeur} px : la page ne déborde pas`,
          ).toBeLessThanOrEqual(largeur);
        }
      }
    });

    if (pointeur === "grossier") {
      test("CA4. 375 et 320 px : champs >= 44 px de haut et 16 px de police, boutons d'action >= 44 x 44 px", async ({
        page,
      }) => {
        for (const largeur of [375, 320]) {
          await ouvrir(page, largeur);
          await verifierPointeur(page, pointeur);
          for (const paire of [MD, LG, LONG]) {
            const c = await controles(page, paire.c);
            const n = await controles(page, paire.n);
            expect(c.champs.length, `${paire.c} : champs`).toBe(6);
            expect(c.boutons.length, `${paire.c} : boutons d'action`).toBe(5);
            c.champs.forEach((ch, i) => {
              const qui = `${largeur} px · ${paire.c} · champ ${i}`;
              expect(ch.h, `${qui} : hauteur`).toBeGreaterThanOrEqual(
                TARGET - 0.01,
              );
              expect(ch.police, `${qui} : police`).toBeGreaterThanOrEqual(
                FONT_MIN - 0.01,
              );
              expect(
                proche(ch.h, n.champs[i].h),
                `${qui} : même hauteur que la jumelle`,
              ).toBeLessThanOrEqual(TOL);
            });
            c.boutons.forEach((b, i) => {
              const qui = `${largeur} px · ${paire.c} · bouton ${i}`;
              expect(b.w, `${qui} : largeur`).toBeGreaterThanOrEqual(
                TARGET - 0.01,
              );
              expect(b.h, `${qui} : hauteur`).toBeGreaterThanOrEqual(
                TARGET - 0.01,
              );
              expect(
                proche(b.w, n.boutons[i].w),
                `${qui} : même largeur que la jumelle`,
              ).toBeLessThanOrEqual(TOL);
              expect(
                proche(b.h, n.boutons[i].h),
                `${qui} : même hauteur que la jumelle`,
              ).toBeLessThanOrEqual(TOL);
            });
          }
        }
      });
    }

    if (pointeur === "fin") {
      test("CA3. l'arbre d'accessibilité ne change pas avec .table-cards--compact, les libellés restent visibles", async ({
        page,
      }) => {
        await ouvrir(page, 375);
        await verifierPointeur(page, pointeur);
        for (const paire of [MD, LG, LONG]) {
          const table = page.locator(`#${paire.c}`);
          const avec = await table.ariaSnapshot();
          await page.evaluate(
            (id) =>
              document
                .getElementById(id)
                ?.classList.remove("table-cards--compact"),
            paire.c,
          );
          const sans = await table.ariaSnapshot();
          await page.evaluate(
            (id) =>
              document
                .getElementById(id)
                ?.classList.add("table-cards--compact"),
            paire.c,
          );
          expect(avec, `${paire.c} : l'arbre contient ses champs`).toContain(
            "textbox",
          );
          expect(avec, `${paire.c} : l'arbre contient ses en-têtes`).toContain(
            "columnheader",
          );
          expect(
            avec,
            `${paire.c} : ariaSnapshot identique avec et sans la classe`,
          ).toBe(sans);
          const liste = await champs(page, paire.c);
          expect(liste.length, `${paire.c} : 6 cellules de champ`).toBe(6);
          for (const g of liste) {
            const qui = `${paire.c} · ${g.nom}`;
            expect(g.label.w, `${qui} : libellé, largeur`).toBeGreaterThan(0);
            expect(g.label.h, `${qui} : libellé, hauteur`).toBeGreaterThan(0);
            expect(g.labelDisplay, `${qui} : libellé affiché`).not.toBe("none");
            expect(
              g.libelle,
              `${qui} : le libellé est l'en-tête de sa colonne`,
            ).toBe(g.entete);
            expect(
              g.nom?.startsWith(g.libelle),
              `${qui} : le nom accessible commence par le texte visible du libellé « ${g.libelle} » (WCAG 2.5.3)`,
            ).toBe(true);
            expect(
              avec,
              `${qui} : le nom accessible figure dans l'arbre`,
            ).toContain(`textbox "${g.nom}"`);
          }
        }
      });

      test("CA7. mode tableau : chaque boîte de la compacte égale celle de sa jumelle", async ({
        page,
      }) => {
        const cas: [number, Paire][] = [
          [768, MD],
          [768, LONG],
          [1024, MD],
          [1024, LG],
          [1024, LONG],
          [1280, MD],
          [1280, LG],
          [1280, LONG],
        ];
        let courante = 0;
        for (const [largeur, paire] of cas) {
          if (largeur !== courante) {
            await ouvrir(page, largeur);
            await verifierPointeur(page, pointeur);
            courante = largeur;
          }
          const c = await boites(page, paire.c);
          const n = await boites(page, paire.n);
          const qui = `${largeur} px · ${paire.c}`;
          expect(c.length, `${qui} : assez de boîtes mesurées`).toBeGreaterThan(
            40,
          );
          expect(
            c.length,
            `${qui} : même nombre de boîtes que la jumelle`,
          ).toBe(n.length);
          const cellules = c.filter((b) => b.tag === "td");
          expect(
            cellules.every((b) => b.display === "table-cell"),
            `${qui} : toutes les cellules sont en table-cell (mode tableau, sinon le cas ne prouve rien)`,
          ).toBe(true);
          c.forEach((b, i) => {
            const j = n[i];
            const moi = `${qui} · ${b.tag} n°${i}`;
            expect(b.tag, `${moi} : même élément`).toBe(j.tag);
            expect(b.display, `${moi} : même display`).toBe(j.display);
            expect(proche(b.x, j.x), `${moi} : x`).toBeLessThanOrEqual(TOL);
            expect(proche(b.y, j.y), `${moi} : y`).toBeLessThanOrEqual(TOL);
            expect(proche(b.w, j.w), `${moi} : largeur`).toBeLessThanOrEqual(
              TOL,
            );
            expect(proche(b.h, j.h), `${moi} : hauteur`).toBeLessThanOrEqual(
              TOL,
            );
          });
        }
      });

      test("CA7 (tablette). 768 px : la table --lg compacte reste en cartes compactes, colonne de libellés de 5,5rem", async ({
        page,
      }) => {
        await ouvrir(page, 768);
        await verifierPointeur(page, pointeur);
        const liste = await champs(page, LG.c);
        expect(liste.length, `${LG.c} : 6 cellules de champ`).toBe(6);
        for (const g of liste) {
          const qui = `768 px · ${LG.c} · ${g.nom}`;
          expect(
            g.label.right,
            `${qui} : libellé à gauche du champ`,
          ).toBeLessThanOrEqual(g.input.left + 0.01);
          expect(
            g.label.top < g.input.bottom && g.label.bottom > g.input.top,
            `${qui} : libellé et champ sur une même ligne`,
          ).toBe(true);
          expect(
            proche(g.label.w, 88),
            `${qui} : colonne des libellés de 5,5rem = 88 px (mesuré ${g.label.w.toFixed(2)} px)`,
          ).toBeLessThanOrEqual(1.5);
          expect(
            g.input.w,
            `${qui} : champ large (plus que le libellé)`,
          ).toBeGreaterThan(300);
        }
      });
    }
  });
}
