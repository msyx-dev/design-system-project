/**
 * notif-panel-viewport-1028.spec.ts — Le panneau de notifications du header reste dans la fenetre (#1028).
 *
 * Defaut : `.header-notif-panel` (layout.css) etait `position: absolute` ancre sur le bord droit de la
 * zone de la cloche (`.header-user-zone`), avec `width: calc(100vw - 2rem)` sous 480 px. Des qu'un
 * controle se trouve A DROITE de la cloche (bascule de mode, bouton flocon, retour, avatar), ce bord
 * droit recule et le panneau, presque aussi large que la fenetre, debordait a gauche d'autant : bord
 * gauche a -74 px a 375 px chez tirokado (`NotificationBell` de `@msyx-dev/react`).
 *
 * Correctif : dans `.site-header`, jusqu'a 640 px le panneau s'ancre sur la FENETRE (`position: fixed`,
 * marge `--space-md` ; pleine largeur sous 480 px, 300 px au-dela) ; au-dessus de 640 px il reste sous
 * la cloche, aligne a droite de sa zone, 300 px.
 *
 * Pourquoi un vrai navigateur et pas jsdom : c'est un fait de MISE EN PAGE (boites reelles, ancrage
 * `position`). jsdom n'applique aucune mise en page — il laisserait passer le defaut. Ici on ouvre le
 * panneau d'un clic et on lit `getBoundingClientRect()`.
 *
 * Trois topologies de header (cf. la fixture) : `vanilla` (header de `nav.js`, une seule zone),
 * `react` (markup de `<SiteHeader>` : la cloche a SA zone, une seconde zone porte flocon + retour +
 * avatar) et `react-mode-a-droite` (pire cas : la bascule de mode passe aussi apres la cloche).
 *
 * Garde-fous (sans eux le test passerait pour la mauvaise raison) :
 *  - le panneau est reellement ouvert (`.open`, opacite 1, boite non vide, transition terminee) ;
 *  - la premisse du defaut est vraie : des controles visibles sont a DROITE de la cloche.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : la largeur est posee par le test lui-meme, la
 * matrice des projets VR ne couvrirait rien de plus. Le panneau est FERME dans toutes les captures
 * VR de `visual.spec.ts` : cette spec ne touche a aucune baseline.
 *
 * Preuve par mutation (consignee dans la PR) : remettre l'ancienne regle (`.header-notif-panel`
 * `position: absolute; right: -1rem; width: calc(100vw - 2rem)` en base, sans la regle
 * `.site-header .header-notif-panel`) rend rouges les cas `react` / `react-mode-a-droite` a 320, 375
 * et 480 px (bord gauche negatif).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/notif-panel-1028.html";
const VITRINE = "/pages/navigation.html";

const TOPOLOGIES = ["vanilla", "react", "react-mode-a-droite"] as const;

/**
 * 320/375/480 = pleine largeur (panneau sur la fenetre) ; 481/640 = 300 px sur la marge droite de la
 * fenetre (le pire cas debordait de 33 px a 481 quand le seuil etait a 480) ; 641/768 = juste de
 * l'autre cote du seuil de compaction du header : le panneau est de nouveau ancre sur la zone.
 */
const LARGEURS_ETROITES = [320, 375, 480, 481, 640, 641, 768] as const;
const LARGEUR_BUREAU = 1280;

/** Controles du header susceptibles de se trouver a droite de la cloche. */
const CONTROLES =
  ".header-notification, .user-menu-trigger, .header-avatar-trigger, .mode-switch";

type Mesure = {
  fenetre: number;
  panneau: { left: number; right: number; top: number; width: number };
  zone: { right: number };
  cloche: { right: number; bottom: number };
  /** Nombre de controles visibles dont le bord gauche est a droite de la cloche. */
  controlesADroite: number;
  position: string;
  ouvert: boolean;
  opacite: string;
  transform: string;
};

async function ouvrir(page: Page, url: string, largeur: number) {
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.addInitScript(() => {
    try {
      // Noel : le bouton flocon du header n'est visible que sous ce theme (#990).
      localStorage.setItem("msyx-theme", "noel");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Ouvre le panneau d'un clic sur la cloche, attend la fin de la transition, puis mesure. */
async function ouvrirEtMesurer(page: Page): Promise<Mesure> {
  const cloche = page
    .locator(".site-header .header-notification[aria-label='Notifications']")
    .first();
  await expect(cloche).toBeVisible();
  await cloche.click();

  const panneau = page.locator(".site-header .header-notif-panel");
  await expect(panneau).toHaveClass(/\bopen\b/);
  await expect(panneau).toHaveCSS("opacity", "1");
  // `.open` -> `transform: none` : la boite ne bouge plus (un `scale(0.97)` fausserait la largeur).
  await expect
    .poll(() => panneau.evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);

  return panneau.evaluate((el, selecteur) => {
    const p = el.getBoundingClientRect();
    const zone = (
      el.closest(".header-user-zone") as HTMLElement
    ).getBoundingClientRect();
    const bouton = el.parentElement!.querySelector(
      ".header-notification",
    ) as HTMLElement;
    const c = bouton.getBoundingClientRect();
    const controlesADroite = Array.from(
      el.closest(".site-header")!.querySelectorAll<HTMLElement>(selecteur),
    ).filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left >= c.right - 0.5;
    }).length;
    const cs = getComputedStyle(el);
    return {
      fenetre: window.innerWidth,
      panneau: { left: p.left, right: p.right, top: p.top, width: p.width },
      zone: { right: zone.right },
      cloche: { right: c.right, bottom: c.bottom },
      controlesADroite,
      position: cs.position,
      ouvert: el.classList.contains("open"),
      opacite: cs.opacity,
      transform: cs.transform,
    };
  }, CONTROLES);
}

test.describe("Panneau de notifications du header — dans la fenetre a toute largeur (#1028)", () => {
  for (const topologie of TOPOLOGIES) {
    for (const largeur of LARGEURS_ETROITES) {
      test(`${topologie} @${largeur}px : panneau ouvert dans la fenetre`, async ({
        page,
      }, testInfo) => {
        test.skip(
          testInfo.project.name !== PROJECT,
          `la largeur est posee par le test : un seul projet (${PROJECT})`,
        );
        await ouvrir(page, `${FIXTURE}?topologie=${topologie}`, largeur);
        const m = await ouvrirEtMesurer(page);

        // Garde-fous : panneau ouvert, boite non vide, et la premisse du defaut est reelle.
        expect(m.ouvert).toBe(true);
        expect(m.panneau.width).toBeGreaterThan(0);
        expect(m.fenetre).toBe(largeur);
        expect(
          m.controlesADroite,
          "des controles doivent se trouver a droite de la cloche (premisse du defaut)",
        ).toBeGreaterThanOrEqual(topologie === "vanilla" ? 2 : 3);

        // Attendu : le panneau tient dans la fenetre.
        expect(m.panneau.left, "bord gauche du panneau").toBeGreaterThanOrEqual(
          0,
        );
        expect(m.panneau.right, "bord droit du panneau").toBeLessThanOrEqual(
          m.fenetre,
        );
      });
    }

    test(`${topologie} @${LARGEUR_BUREAU}px : sous la cloche, aligne a droite, 300 px`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        `la largeur est posee par le test : un seul projet (${PROJECT})`,
      );
      await ouvrir(page, `${FIXTURE}?topologie=${topologie}`, LARGEUR_BUREAU);
      const m = await ouvrirEtMesurer(page);

      expect(m.ouvert).toBe(true);
      expect(m.controlesADroite).toBeGreaterThanOrEqual(
        topologie === "vanilla" ? 2 : 3,
      );

      // Non-regression bureau : ancre sur la zone de la cloche, comme avant.
      expect(m.position).toBe("absolute");
      expect(m.panneau.width).toBeCloseTo(300, 0);
      expect(Math.abs(m.panneau.right - m.zone.right)).toBeLessThanOrEqual(1);
      expect(m.panneau.top, "sous la cloche").toBeGreaterThanOrEqual(
        m.cloche.bottom,
      );
      expect(m.panneau.left).toBeGreaterThanOrEqual(0);
      expect(m.panneau.right).toBeLessThanOrEqual(m.fenetre);
    });
  }

  // Meme mesure sur la vitrine du DS (header reel de `nav.js`, MSYX_HEADER de la page).
  for (const largeur of [320, 375, LARGEUR_BUREAU] as const) {
    test(`vitrine ${VITRINE} @${largeur}px : panneau du header dans la fenetre`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        `la largeur est posee par le test : un seul projet (${PROJECT})`,
      );
      await ouvrir(page, VITRINE, largeur);
      const m = await ouvrirEtMesurer(page);

      expect(m.ouvert).toBe(true);
      expect(m.panneau.width).toBeGreaterThan(0);
      expect(m.panneau.left).toBeGreaterThanOrEqual(0);
      expect(m.panneau.right).toBeLessThanOrEqual(m.fenetre);
    });
  }
});
