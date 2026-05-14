/**
 * modal-focus.spec.ts — Smoke test a11y : restauration du focus apres fermeture d'une modale
 * Pattern WAI APG Dialog Modal — WCAG 2.4.3 (Focus Order) + 2.4.7 (Focus Visible)
 * Ref : aksy UC-288, DS issue #174, v2.41.0
 *
 * Couverture : 1 voie de fermeture (Esc) x 1 modale statique (feedback.html#modals)
 * Pour une suite E2E complete (4 voies x N modales), voir issue de suivi.
 */
import { test, expect } from "@playwright/test";

// Smoke test : 1 modale statique + fermeture via Esc
// Cible : pages/feedback.html — section #modals — 1er bouton [data-modal-trigger]
test.describe("Modal focus restore (WAI APG) — ref aksy UC-288", () => {
  test("Esc ferme la modale et restaure le focus sur le declencheur", async ({
    page,
  }) => {
    // Depuis #286 (flag -s retiré + serve.json), serve sert /pages/feedback.html
    // directement — plus de workaround page.route nécessaire.
    await page.goto("/pages/feedback.html");

    // Garde-fou anti-régression Bug 1 (#286)
    await expect(page).toHaveTitle(/^Feedback\b/);

    // Attendre que la page soit prete (nav.js + components.js charges)
    await page.waitForLoadState("networkidle");

    // Cibler le 1er bouton [data-modal-trigger] de la section modals
    const trigger = page.locator("[data-modal-trigger]").first();
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
