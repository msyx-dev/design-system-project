/**
 * graph-keyboard.spec.ts — Nav clavier roving tabindex + traversee spanning-tree (#671, I4-1)
 * Fonctionnel, PAS de screenshot VR (jumeau modal-focus.spec.ts). Cible pages/data.html
 * #graph, demo "arbre" (2e `.graph[data-graph]` — layout `tree`, PAS d'initialSelection
 * ni d'initialViewport, pour observer le roving DFS pur sans interference de la selection).
 *
 * Arbre : root -> [i1a, i3] ; i1a -> [i1b1] ; i1b1 -> [i1b2] ; i1b2 -> [i4] ; i3 -> [].
 * order (preordre DFS) = [root, i1a, i1b1, i1b2, i4, i3].
 */
import { test, expect } from "@playwright/test";

test.describe("Graph — nav clavier roving + traversee (#671, I4-1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/data.html");
    await expect(page).toHaveTitle(/^Data —/);
    await page.waitForLoadState("networkidle");
  });

  function container(page: import("@playwright/test").Page) {
    return page.locator("#graph .graph[data-graph]").nth(1); // demo "arbre"
  }

  async function activeNodeId(page: import("@playwright/test").Page) {
    return page.evaluate(
      () => document.activeElement?.getAttribute("data-node-id") ?? null,
    );
  }

  async function viewportTransform(
    page: import("@playwright/test").Page,
    idx: number,
  ) {
    return page.evaluate((i) => {
      const el = document.querySelectorAll("#graph .graph[data-graph]")[i];
      return (
        el?.querySelector(".graph-viewport")?.getAttribute("transform") ?? null
      );
    }, idx);
  }

  test("Tab entre au graphe -> le 1er noeud (order[0]='root') est l'unique tabindex=0", async ({
    page,
  }) => {
    const el = container(page);
    await expect(el.locator('[data-node-id="root"]')).toHaveAttribute(
      "role",
      "graphics-symbol",
    );
    await expect(el).toHaveAttribute("tabindex", "0"); // conteneur (#668, I2-2)

    await el.focus();
    await page.keyboard.press("Tab");
    expect(await activeNodeId(page)).toBe("root");

    const tabbable = await el.locator('.graph-node[tabindex="0"]').count();
    expect(tabbable).toBe(1); // un SEUL tabindex=0 a tout instant
  });

  test("fleches/Home/End traversent l'arbre couvrant conformement (APG tree)", async ({
    page,
  }) => {
    const el = container(page);
    await el.locator('[data-node-id="root"]').focus();
    expect(await activeNodeId(page)).toBe("root");

    // Down = 1er enfant
    await page.keyboard.press("ArrowDown");
    expect(await activeNodeId(page)).toBe("i1a");
    expect(await el.locator('.graph-node[tabindex="0"]').count()).toBe(1);

    // Down = enfant de i1a
    await page.keyboard.press("ArrowDown");
    expect(await activeNodeId(page)).toBe("i1b1");

    // Up = retour au parent
    await page.keyboard.press("ArrowUp");
    expect(await activeNodeId(page)).toBe("i1a");

    // Right = frere suivant (root -> [i1a, i3])
    await page.keyboard.press("ArrowRight");
    expect(await activeNodeId(page)).toBe("i3");

    // Left = frere precedent
    await page.keyboard.press("ArrowLeft");
    expect(await activeNodeId(page)).toBe("i1a");

    // Left sans frere precedent (i1a est le 1er) -> PAS de wrap, reste sur place
    await page.keyboard.press("ArrowLeft");
    expect(await activeNodeId(page)).toBe("i1a");

    // Home = order[0]
    await page.keyboard.press("End");
    expect(await activeNodeId(page)).toBe("i3"); // dernier de order = [root,i1a,i1b1,i1b2,i4,i3]
    await page.keyboard.press("Home");
    expect(await activeNodeId(page)).toBe("root");
  });

  test("Enter selectionne le noeud focuse", async ({ page }) => {
    const el = container(page);
    const i1a = el.locator('[data-node-id="i1a"]');
    await i1a.focus();
    await page.keyboard.press("Enter");
    await expect(i1a).toHaveClass(/graph-node--selected/);
  });

  test("fleches sur un noeud NE pannent PAS (viewport inchange) ; fleches sur le conteneur pannent (I2-2)", async ({
    page,
  }) => {
    const el = container(page);

    // 1) focus sur un NOEUD -> ArrowDown ne doit PAS modifier la transform du viewport
    await el.locator('[data-node-id="root"]').focus();
    const before = await viewportTransform(page, 1);
    await page.keyboard.press("ArrowDown"); // traverse vers i1a, ne pan pas
    const afterNodeArrow = await viewportTransform(page, 1);
    expect(afterNodeArrow).toBe(before);
    expect(await activeNodeId(page)).toBe("i1a"); // la traversee a bien eu lieu

    // 2) focus sur le CONTENEUR (hors noeud) -> ArrowDown pan (I2-2 preserve)
    await el.focus();
    const beforePan = await viewportTransform(page, 1);
    await page.keyboard.press("ArrowDown");
    const afterPan = await viewportTransform(page, 1);
    expect(afterPan).not.toBe(beforePan);
  });

  test("focus visible sur le noeud actif (outline focus-visible)", async ({
    page,
  }) => {
    const el = container(page);
    const root = el.locator('[data-node-id="root"]');
    await root.focus();
    const outline = await root.evaluate(
      (n) => getComputedStyle(n).outlineStyle,
    );
    expect(outline).not.toBe("none");
  });
});
