/**
 * demo-note.spec.ts — `.demo-note` : lire la note d'usage sous une démo (#1020)
 *
 * `.demo-note` / `.demo-note-last` n'ont jamais eu de CSS (123 emplois sur 7 pages de la
 * vitrine) : la note héritait du texte principal en 16 px et de `margin: 0`, collée au bloc
 * qui la précède. #1007 et #1008 contournaient le défaut note par note avec les utilitaires
 * `text-muted text-sm mt-md|mt-sm`. Les deux règles de `layout.css` (bloc showcase) donnent à
 * la note : `color: var(--text-muted)`, `font-size: var(--type-14)`, `margin-top: var(--space-md)`,
 * puis `var(--space-sm)` quand une autre note la précède immédiatement.
 *
 * Défaut de RENDU : jsdom n'applique aucune cascade. La preuve est une mesure
 * `getComputedStyle` dans un vrai navigateur, sur les vraies pages de la vitrine, en MSYX
 * sombre ET clair. Les valeurs attendues sont RÉSOLUES par le navigateur à partir des tokens
 * (un élément sonde posé dans la page), jamais recopiées en dur : la sonde suit les tokens.
 *
 * Garde-fou contre un test creux : si un token n'existait pas, la sonde et la note
 * retomberaient toutes deux sur la valeur héritée et l'égalité passerait pour rien. On
 * vérifie donc aussi que la valeur attendue DIFFÈRE de celle du corps de page (couleur et
 * taille) et que `--space-md` ≠ `--space-sm` ≠ 0.
 *
 * Témoins : `data#table-cards` et `data#table-cards-editable` portaient déjà ces styles par
 * utilitaires ; ils n'en ont plus (classList réduite à `demo-note`) et doivent mesurer pareil.
 * Une note `<div class="demo-note">` (formulaires#form-validation) donne sa couleur et sa
 * taille à ses `<p>`.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : le test pose lui-même le mode.
 *
 * Preuve par mutation (consignée dans la PR) : les 2 règles de layout.css retirées → toutes les
 * assertions de couleur, de taille et de marge sont rouges ; restaurées → vertes.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";

type Attendu = {
  color: string;
  fontSize: string;
  md: string;
  sm: string;
  bodyColor: string;
  bodyFontSize: string;
};

async function ouvrir(page: Page, slug: string, mode: "dark" | "light") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(
    ({ m }: { m: string }) => {
      try {
        localStorage.setItem("msyx-theme", "msyx");
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { m: mode },
  );
  await page.goto(`/pages/${slug}.html`, { waitUntil: "networkidle" });
  // Garde-fou : le mode demandé est bien celui rendu (attribut absent = dark).
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-mode") ?? "dark",
      ),
    )
    .toBe(mode);
}

/** Valeurs attendues, résolues par le navigateur depuis les tokens via un élément sonde. */
async function attendu(page: Page): Promise<Attendu> {
  return page.evaluate(() => {
    const sonde = document.createElement("p");
    sonde.style.cssText =
      "position:absolute;visibility:hidden;color:var(--text-muted);font-size:var(--type-14);margin-top:var(--space-md);margin-bottom:var(--space-sm)";
    document.querySelector(".main")!.appendChild(sonde);
    const cs = getComputedStyle(sonde);
    const out = {
      color: cs.color,
      fontSize: cs.fontSize,
      md: cs.marginTop,
      sm: cs.marginBottom,
      bodyColor: getComputedStyle(document.body).color,
      bodyFontSize: getComputedStyle(document.body).fontSize,
    };
    sonde.remove();
    return out;
  });
}

type Mesure = {
  classes: string;
  color: string;
  fontSize: string;
  marginTop: string;
};

async function notes(page: Page, section: string): Promise<Mesure[]> {
  return page.evaluate((id) => {
    const nodes = document.querySelectorAll<HTMLElement>(
      `#${id} .demo-note, #${id} .demo-note-last`,
    );
    return [...nodes].map((el) => {
      const cs = getComputedStyle(el);
      return {
        classes: el.className,
        color: cs.color,
        fontSize: cs.fontSize,
        marginTop: cs.marginTop,
      };
    });
  }, section);
}

function verifierGardeFou(a: Attendu) {
  expect(a.color, "--text-muted résolu ≠ couleur du corps").not.toBe(
    a.bodyColor,
  );
  expect(a.fontSize, "--type-14 résolu ≠ taille du corps").not.toBe(
    a.bodyFontSize,
  );
  expect(a.md).not.toBe("0px");
  expect(a.sm).not.toBe("0px");
  expect(a.md, "--space-md ≠ --space-sm").not.toBe(a.sm);
}

for (const mode of ["dark", "light"] as const) {
  test.describe(`.demo-note — MSYX ${mode} (#1020)`, () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        "joué une seule fois : le mode est posé par le test",
      );
    });

    test("overlays#fab : 1re note à --space-md, suivantes à --space-sm, texte secondaire 14 px", async ({
      page,
    }) => {
      await ouvrir(page, "overlays", mode);
      const att = await attendu(page);
      verifierGardeFou(att);

      const mesures = await notes(page, "fab");
      // Garde-fou de recensement : 3 `.demo-note` puis 1 `.demo-note-last` (overlays.html).
      expect(mesures).toHaveLength(4);
      expect(mesures.map((m) => m.classes)).toEqual([
        "demo-note",
        "demo-note",
        "demo-note",
        "demo-note-last",
      ]);

      mesures.forEach((m, i) => {
        expect.soft(m.color, `note ${i + 1} : couleur`).toBe(att.color);
        expect.soft(m.fontSize, `note ${i + 1} : taille`).toBe(att.fontSize);
        expect.soft(m.marginTop, `note ${i + 1} : marge haute`).toBe(
          i === 0 ? att.md : att.sm,
        );
      });
    });

    for (const section of ["table-cards", "table-cards-editable"]) {
      test(`témoin data#${section} : 3 notes sans utilitaire, même mesure qu'avec les utilitaires`, async ({
        page,
      }) => {
        await ouvrir(page, "data", mode);
        const att = await attendu(page);
        verifierGardeFou(att);

        const mesures = await notes(page, section);
        expect(mesures.map((m) => m.classes)).toEqual([
          "demo-note",
          "demo-note",
          "demo-note-last",
        ]);
        mesures.forEach((m, i) => {
          expect.soft(m.color, `note ${i + 1} : couleur`).toBe(att.color);
          expect.soft(m.fontSize, `note ${i + 1} : taille`).toBe(att.fontSize);
          expect.soft(m.marginTop, `note ${i + 1} : marge haute`).toBe(
            i === 0 ? att.md : att.sm,
          );
        });
      });
    }

    test("formulaires#form-validation : un <div class=demo-note> donne sa couleur et sa taille à ses <p>", async ({
      page,
    }) => {
      await ouvrir(page, "formulaires", mode);
      const att = await attendu(page);
      verifierGardeFou(att);

      const enfants = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "#form-validation div.demo-note > p",
          ),
        ].map((el) => ({
          color: getComputedStyle(el).color,
          fontSize: getComputedStyle(el).fontSize,
        })),
      );
      expect(enfants.length).toBeGreaterThan(0);
      for (const e of enfants) {
        expect(e.color).toBe(att.color);
        expect(e.fontSize).toBe(att.fontSize);
      }
    });
  });
}
