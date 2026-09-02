/**
 * floating-surface-stacking.spec.ts — Non-régression : un menu flottant reste
 * atteignable au-dessus de la surface qui l'a ouvert (#932, #934).
 *
 * Deux défauts remontés le même jour, qui se ressemblent — un menu ouvert
 * qu'on ne peut pas cliquer — mais dont les causes n'ont RIEN en commun. Le
 * demandeur avait pris soin de le préciser ; la mesure le confirme :
 *
 *   #932 — EMPILEMENT. `.dropdown-menu` (200) contre `.drawer-panel--fullscreen`
 *          (201) : deux enfants de <body>, chacun sa stacking context racine.
 *          Le hit-test résolvait sur un CHAMP DU FORMULAIRE situé dessous.
 *          Remède : une échelle d'empilement où un menu passe toujours
 *          au-dessus des surfaces conteneurs (`--z-floating`).
 *
 *   #934 — TOP LAYER. Un <dialog> ouvert par `showModal()` est peint au-dessus
 *          de tout le document et rend inerte tout ce qui est hors de son
 *          sous-arbre. Le hit-test résolvait sur le DIALOG lui-même. Aucun
 *          `z-index`, si grand soit-il, n'y change quoi que ce soit : le
 *          remède est le PORTAIL (le panneau devient descendant du dialog).
 *
 * Le test mesure l'ATTEIGNABILITÉ (`elementFromPoint` + clic réel), pas la
 * présence DOM : c'est exactement ce que l'utilisateur perdait.
 */
import { test, expect, Locator } from "@playwright/test";

const FIXTURE = "/visual-tests/fixtures/floating-surface-stacking-932-934.html";

/** Le point cible résout-il sur l'option elle-même (ou un descendant) ? */
async function isReachable(option: Locator): Promise<boolean> {
  return option.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return at ? el.contains(at) || at === el : false;
  });
}

test.describe("Surfaces flottantes empilées — non-régression #932/#934", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");
  });

  test("#932 — un menu ouvert dans un drawer fullscreen est cliquable", async ({
    page,
  }) => {
    const menu = page.locator("#menu-932");
    const option = page.locator("#opt-932");

    // Le menu doit passer AU-DESSUS du panneau (201), pas dessous.
    const [zMenu, zPanel] = await Promise.all([
      menu.evaluate((el) => Number(getComputedStyle(el).zIndex)),
      page.locator("#drawer-panel").evaluate((el) => Number(getComputedStyle(el).zIndex)),
    ]);
    expect(zMenu).toBeGreaterThan(zPanel);

    expect(await isReachable(option)).toBe(true);
    // Preuve décisive : Playwright refuse le clic si un autre élément
    // intercepte le point (même hit-test que `elementFromPoint`).
    await option.click({ timeout: 3000 });
  });

  test("#934 — un menu ouvert dans un <dialog> modal est cliquable", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      const dlg = document.getElementById("modal-934") as HTMLDialogElement;
      dlg.showModal();
      // Le panneau est `position: fixed` : l'ouvrir PENDANT l'animation du
      // dialog figerait des coordonnées déjà fausses à la fin. On attend la
      // surface stable — ce que fait un utilisateur.
      await Promise.all(dlg.getAnimations().map((a) => a.finished.catch(() => {})));
      (window as unknown as { __openFloatingPanel: (t: Element, p: Element) => void }).__openFloatingPanel(
        document.getElementById("dd-934")!,
        document.getElementById("menu-934")!,
      );
    });

    const menu = page.locator("#menu-934");
    // Le portail : le panneau est DESCENDANT du dialog, pas son frère.
    expect(
      await menu.evaluate((el) => el.closest("dialog") !== null),
    ).toBe(true);

    // Et il tient dans le cadre : le dialog a `overflow: auto` et sert de
    // containing block, donc un panneau qui déborde serait coupé — corriger
    // l'inertie sans corriger le cadrage ne rendrait pas le menu utilisable.
    const { menuBottom, dialogBottom } = await page.evaluate(() => ({
      menuBottom: document.getElementById("menu-934")!.getBoundingClientRect().bottom,
      dialogBottom: document.getElementById("modal-934")!.getBoundingClientRect().bottom,
    }));
    expect(menuBottom).toBeLessThanOrEqual(dialogBottom + 0.5);

    expect(await isReachable(page.locator("#opt-934"))).toBe(true);
    await page.locator("#opt-934").click({ timeout: 3000 });
  });
});
