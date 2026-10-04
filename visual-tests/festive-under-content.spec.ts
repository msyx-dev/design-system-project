/**
 * festive-under-content.spec.ts — Le sapin de Noel est peint SOUS le contenu (#1043).
 *
 * Defaut : `.festive-character` (festive.css) est `position: fixed` en bas a droite, en
 * `z-index: var(--z-decor)` (1). Un element positionne a z-index positif est peint APRES tout
 * le contenu en flux non positionne : le sapin recouvrait les boutons et les textes de la
 * colonne de droite (cas tirokado : bouton « Afficher le lien », derniere colonne d'un
 * tableau) a toute position de defilement. La reserve de fin de page (#1005) ne degage que
 * le bas de la page defilee au maximum. Correctif (arbitrage B) : `--z-decor-behind` (-1),
 * le sapin passe sous tout le contenu, au-dessus du fond de page.
 *
 * Pourquoi un vrai navigateur et pas jsdom : l'ordre de peinture est un fait de RENDU (contextes
 * d'empilement, `position: fixed`, defilement). jsdom ne calcule ni boites ni empilement.
 * `document.elementsFromPoint` rend la pile de hit-testing, dans l'ordre inverse de peinture.
 *
 * Garde-fous (sans eux le test passerait pour la mauvaise raison) :
 *  - non-vacuite : des cibles chevauchent REELLEMENT le sapin (`chevauchees > 0`) ;
 *  - le sapin est rendu hit-testable le temps de la mesure (`pointer-events: auto !important`
 *    en style en ligne, restaure dans un `finally`), sinon il n'apparaitrait jamais dans la pile ;
 *  - on ne compare les rangs que si le sapin ET la cible sont dans la pile du point.
 *  - visibilite : le sapin reste VISIBLE la ou rien d'opaque n'est peint au-dessus (fond de
 *    page de la reserve #1005) ; un z-index qui le cacherait sous le fond de page rougit.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : theme, mode et largeur sont poses par le
 * test (`localStorage` avant le chargement, `setViewportSize`), sur le modele de
 * festive-clearance.spec.ts.
 *
 * Preuves par mutation (rouge attendu, puis restauration) :
 *  - M1 : `z-index: var(--z-decor)` remis sur `.festive-character` -> cas 1 et 2 rouges ;
 *  - M2 : `html { background: var(--primary) }` dans la fixture -> cas 3 rouge (contrat
 *    consommateur : le fond de <body> se peint alors sur sa boite, par-dessus le sapin).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-under-content-1043.html";
const TREE = ".festive-character";

const VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

/**
 * Seuil de visibilite du sapin (cas 3), en pixels qui changent quand on le masque.
 * Calibre au premier run (2026-10-05, Chromium, fixture a 1280x720, defilement maximal) :
 * SEUIL_MESURE px. SEUIL = 50 % de cette mesure. Sous M2 (fond pose sur <html>), le compte
 * tombe a SEUIL_M2 px.
 */
const SEUIL = 0;

async function openPage(
  page: Page,
  url: string,
  viewport: { width: number; height: number },
) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "noel");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.setViewportSize(viewport);
  // Pas d'animation : le balancement du sapin ne deplace pas sa boite pendant la mesure.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    )
    .toBe("noel");
  // Garde-fou : sans sapin visible, aucune mesure n'a de sens.
  await expect(page.locator(TREE)).toHaveCount(1);
  await expect(page.locator(TREE)).toBeVisible();
}

/**
 * Attend que le `padding-bottom` du gabarit ait rattrape la cascade (reserve #1005 posee via
 * `:root:has(.festive-character)`). Meme condition que `waitForSettledPadding` de
 * festive-clearance.spec.ts, ou la cause est mesuree (#1045, l. 5) : le padding calcule peut
 * rester sans reserve plusieurs frames apres le `load`.
 */
async function attendreReserve(page: Page, root: string) {
  await expect
    .poll(() =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el || !el.parentElement) return "gabarit introuvable";
        const probe = document.createElement(el.tagName);
        probe.className = el.className;
        probe.style.display = "none";
        el.parentElement.insertBefore(probe, el);
        const expected = getComputedStyle(probe).paddingBottom;
        probe.remove();
        const actual = getComputedStyle(el).paddingBottom;
        return actual === expected ? "ok" : `${actual} au lieu de ${expected}`;
      }, root),
    )
    .toBe("ok");
}

interface Peinture {
  audessus: string[];
  chevauchees: number;
  positions: number;
}

/**
 * Balaie toute la course de defilement et, pour chaque cible (controle ou element portant un
 * noeud texte direct non vide) qui chevauche le sapin, interroge `elementsFromPoint` sur une
 * grille 3x3 de l'intersection. Le sapin est « au-dessus » si son rang dans la pile precede
 * celui de la cible.
 */
const mesurerPeintureDuSapin = (
  page: Page,
  rootSel: string,
): Promise<Peinture> =>
  page.evaluate(
    async ({ rootSel, treeSel }) => {
      const root = document.querySelector(rootSel);
      const tree = document.querySelector(treeSel) as HTMLElement | null;
      if (!root) throw new Error(`racine introuvable : ${rootSel}`);
      if (!tree) throw new Error("sapin introuvable");

      const CONTROLES =
        "button, a[href], input, select, textarea, [role=switch]";
      const cibles = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
        (el) =>
          el.matches(CONTROLES) ||
          Array.from(el.childNodes).some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      );

      const raf2 = () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      const decrire = (el: HTMLElement) =>
        `${el.tagName.toLowerCase()}${
          typeof el.className === "string" && el.className
            ? "." + el.className.trim().split(/\s+/).join(".")
            : ""
        } « ${(el.textContent ?? "").trim().slice(0, 30)} »`;

      const audessus = new Set<string>();
      const chevauchees = new Set<number>();
      let positions = 0;

      const avant = tree.style.getPropertyValue("pointer-events");
      const avantPrio = tree.style.getPropertyPriority("pointer-events");
      tree.style.setProperty("pointer-events", "auto", "important");
      try {
        const hauteurSapin = tree.getBoundingClientRect().height;
        const pas = Math.max(40, Math.floor(hauteurSapin / 2));
        for (let y = 0; ; y += pas) {
          const max =
            document.documentElement.scrollHeight - window.innerHeight;
          const top = Math.min(y, max);
          window.scrollTo({ top, behavior: "instant" });
          await raf2();
          positions += 1;

          const t = tree.getBoundingClientRect();
          const zone = {
            left: Math.max(0, t.left),
            top: Math.max(0, t.top),
            right: Math.min(window.innerWidth, t.right),
            bottom: Math.min(window.innerHeight, t.bottom),
          };
          cibles.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const left = Math.max(zone.left, r.left);
            const right = Math.min(zone.right, r.right);
            const haut = Math.max(zone.top, r.top);
            const bas = Math.min(zone.bottom, r.bottom);
            if (right - left < 1 || bas - haut < 1) return;
            chevauchees.add(i);
            for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
              for (const fy of [1 / 6, 1 / 2, 5 / 6]) {
                const pile = document.elementsFromPoint(
                  left + (right - left) * fx,
                  haut + (bas - haut) * fy,
                );
                const rangSapin = pile.findIndex((n) => tree.contains(n));
                const rangCible = pile.findIndex((n) => el.contains(n));
                if (rangSapin < 0 || rangCible < 0) continue;
                if (rangSapin < rangCible) audessus.add(decrire(el));
              }
            }
          });
          if (top >= max) break;
        }
      } finally {
        if (avant) tree.style.setProperty("pointer-events", avant, avantPrio);
        else tree.style.removeProperty("pointer-events");
      }
      return {
        audessus: Array.from(audessus),
        chevauchees: chevauchees.size,
        positions,
      };
    },
    { rootSel, treeSel: TREE },
  );

/**
 * Pixels du sapin reellement visibles au defilement maximal (reserve #1005 : zone libre sous
 * lui) : deux captures de sa boite, sapin visible puis `visibility: hidden`, decodees dans la
 * page ; on compte les pixels dont l'ecart RVB (max des trois canaux) depasse 30.
 * Capture par `page.screenshot({ clip })` et non `locator.screenshot()` : ce dernier attend
 * un element visible, donc ne capture pas le sapin masque.
 */
/**
 * Attend qu'une frame contenant le dernier changement de style ait ete produite (double
 * requestAnimationFrame). Mesure (2026-10-05) : sans elle, la capture prise juste apres
 * `visibility: hidden` montrait encore le sapin dans 4 runs sur 46 (compte = 0 ou 84 au lieu
 * de ~19 900) : la capture rendait la frame d'avant le changement.
 */
const frameRendue = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );

async function pixelsVisiblesDuSapin(page: Page): Promise<number> {
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await frameRendue(page);
  const box = await page.locator(TREE).boundingBox();
  if (!box) throw new Error("boite du sapin introuvable");
  const clip = {
    x: Math.max(0, Math.floor(box.x)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.floor(box.width),
    height: Math.floor(box.height),
  };
  const visible = await page.screenshot({ clip });
  await page.evaluate(
    (sel) =>
      (document.querySelector(sel) as HTMLElement).style.setProperty(
        "visibility",
        "hidden",
      ),
    TREE,
  );
  let masque: Buffer;
  try {
    await frameRendue(page);
    masque = await page.screenshot({ clip });
  } finally {
    await page.evaluate(
      (sel) =>
        (document.querySelector(sel) as HTMLElement).style.removeProperty(
          "visibility",
        ),
      TREE,
    );
  }
  return page.evaluate(
    async ({ a, b }) => {
      const decode = async (b64: string) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bmp = await createImageBitmap(
          new Blob([bin], { type: "image/png" }),
        );
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      };
      const [pa, pb] = await Promise.all([decode(a), decode(b)]);
      let n = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.max(
          Math.abs(pa[i] - pb[i]),
          Math.abs(pa[i + 1] - pb[i + 1]),
          Math.abs(pa[i + 2] - pb[i + 2]),
        );
        if (d > 30) n += 1;
      }
      return n;
    },
    { a: visible.toString("base64"), b: masque.toString("base64") },
  );
}

test.describe("Sapin de Noel — peint sous le contenu (#1043)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `theme, mode et largeur sont poses par le test : un seul projet (${PROJECT})`,
    );
  });

  for (const vp of VIEWPORTS) {
    test(`fixture @${vp.width}x${vp.height} : aucun controle ni texte peint sous le sapin, a toute position de defilement`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openPage(page, FIXTURE, vp);
      const m = await mesurerPeintureDuSapin(page, "#gabarit");
      expect(m.positions, "positions de defilement mesurees").toBeGreaterThan(
        1,
      );
      expect(
        m.chevauchees,
        "cibles qui chevauchent le sapin (non-vacuite)",
      ).toBeGreaterThan(0);
      expect(m.audessus, "cibles peintes SOUS le sapin").toEqual([]);
    });
  }

  test("page reelle /pages/composants.html @1280x720 : aucun controle ni texte de .main peint sous le sapin", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openPage(page, "/pages/composants.html", {
      width: 1280,
      height: 720,
    });
    const m = await mesurerPeintureDuSapin(page, ".main");
    expect(
      m.chevauchees,
      "cibles qui chevauchent le sapin (non-vacuite)",
    ).toBeGreaterThan(0);
    expect(m.audessus, "cibles peintes SOUS le sapin").toEqual([]);
  });

  test("fixture @1280x720 : le sapin reste visible la ou aucun contenu ne le couvre", async ({
    page,
  }) => {
    await openPage(page, FIXTURE, { width: 1280, height: 720 });
    await attendreReserve(page, "#gabarit");
    const n = await pixelsVisiblesDuSapin(page);
    console.log(`CALIBRAGE pixelsVisiblesDuSapin = ${n}`);
    expect(
      n,
      `pixels visibles du sapin (seuil ${SEUIL})`,
    ).toBeGreaterThanOrEqual(SEUIL);
  });
});
