/**
 * modal-focus.spec.ts — Smoke test a11y : restauration du focus apres fermeture d'une modale
 * Pattern WAI APG Dialog Modal — WCAG 2.4.3 (Focus Order) + 2.4.7 (Focus Visible)
 * Ref : aksy UC-288, DS issue #174, v2.41.0
 *
 * Couverture : 1 voie de fermeture (Esc) x 1 modale statique (overlays.html#modals — déplacée depuis feedback.html en #514)
 * Pour une suite E2E complete (4 voies x N modales), voir issue de suivi.
 */
import { test, expect } from "@playwright/test";

// Smoke test : 1 modale statique + fermeture via Esc
// Cible : pages/overlays.html — section #modals — 1er bouton [data-modal-trigger]
test.describe("Modal focus restore (WAI APG) — ref aksy UC-288", () => {
  test("Esc ferme la modale et restaure le focus sur le declencheur", async ({
    page,
  }) => {
    // Depuis #286 (serveur statique = http-server), /pages/overlays.html est
    // servi directement à plat — plus de workaround page.route nécessaire.
    await page.goto("/pages/overlays.html");

    // Garde-fou anti-régression Bug 1 (#286)
    // Pattern de titre DS : "<Titre> — msyx.design".
    await expect(page).toHaveTitle(/^Overlays —/);

    // Attendre que la page soit prete (nav.js + components.js charges)
    await page.waitForLoadState("networkidle");

    // Cibler le 1er bouton [data-modal-trigger] de la section modals.
    // Scopé à #modals : depuis #645, le badge version du header porte aussi
    // data-modal-trigger et précède #modals dans le DOM — un .first() global
    // capturerait le badge du header, pas la modale testée ici.
    const trigger = page.locator("#modals [data-modal-trigger]").first();
    await expect(trigger).toBeVisible();

    // Donner le focus au trigger
    await trigger.focus();

    // Ouvrir la modale via click
    await trigger.click();

    // Attendre que le dialog soit visible (ouvert via showModal())
    const modalId = await trigger.getAttribute("data-modal-trigger");
    const dialog = page.locator(`dialog#${modalId}`);
    await expect(dialog).toBeVisible();

    // Fermer via Esc — l'evenement "close" doit restaurer le focus
    await page.keyboard.press("Escape");

    // Attendre que la modale soit fermee
    await expect(dialog).not.toBeVisible();

    // Verifier que le focus est bien revenu sur le trigger initial
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("data-modal-trigger") ?? null,
    );
    expect(focused).toBe(modalId);
  });
});
