/**
 * graph-edit.spec.ts — Mode edition create/delete + contrat de focus (#673, I5-1)
 * Fonctionnel, PAS de screenshot VR (jumeau graph-keyboard.spec.ts/graph-a11y.spec.ts).
 * Cible pages/data.html #graph :
 *   - demo "mode edition" (7e `.graph[data-graph]`, index 6, `mode:'edit'`,
 *     `selectionDetail:false` — evite qu'un clic de selection ouvre le modal de detail I2-2
 *     pendant le flux d'edition) : root `e-root` -> [`e-a`, `e-b`].
 *   - demo "organigramme" (1re `.graph[data-graph]`, index 0, mode `view` par defaut) pour
 *     verifier l'absence de regression (aucune toolbar, aucune creation).
 */
import { test, expect } from "@playwright/test";

test.describe("Graph — mode edition create/delete + contrat de focus (#673, I5-1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/data.html");
    await expect(page).toHaveTitle(/^Data —/);
    await page.waitForLoadState("networkidle");
  });

  function editContainer(page: import("@playwright/test").Page) {
    return page.locator("#graph .graph[data-graph]").nth(6); // demo "mode edition"
  }

  function viewContainer(page: import("@playwright/test").Page) {
    return page.locator("#graph .graph[data-graph]").nth(0); // demo "organigramme" (mode view)
  }

  async function activeNodeId(page: import("@playwright/test").Page) {
    return page.evaluate(
      () => document.activeElement?.getAttribute("data-node-id") ?? null,
    );
  }

  test('mode "view" (par defaut) : aucune toolbar, aucune creation au double-clic, aucun changement de role', async ({
    page,
  }) => {
    const el = viewContainer(page);
    await expect(el.locator(".graph-toolbar")).toHaveCount(0);
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );

    const before = await el.locator(".graph-node").count();
    const box = await el.locator(".graph-canvas").boundingBox();
    if (box) await page.mouse.dblclick(box.x + 8, box.y + 8);
    await expect(el.locator(".graph-node")).toHaveCount(before); // pas de creation en mode view
  });

  test('mode "edit" : la toolbar expose 3 boutons (Ajouter/Relier/Supprimer, >=44px) et le role SVG reste "graphics-document"', async ({
    page,
  }) => {
    const el = editContainer(page);
    const toolbar = el.locator(".graph-toolbar");
    await expect(toolbar).toHaveCount(1);
    await expect(toolbar).toHaveAttribute("role", "toolbar");

    const addBtn = toolbar.locator('button[aria-label="Ajouter un nœud"]');
    const connectBtn = toolbar.locator('button[aria-label="Relier"]');
    const deleteBtn = toolbar.locator('button[aria-label="Supprimer"]');
    await expect(addBtn).toHaveCount(1);
    await expect(connectBtn).toHaveCount(1);
    await expect(deleteBtn).toHaveCount(1);

    const box = await addBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Arbitrage A opt1 (#662) : role="graphics-document" conserve en mode edit — PAS "application"
    // (reserve a I5-2, input inline actif uniquement). La nav SR/clavier I4 doit rester intacte.
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );
  });

  test("double-clic sur le fond du canevas cree un nœud (nodeCount +1) et lui donne le focus", async ({
    page,
  }) => {
    const el = editContainer(page);
    const before = await el.locator(".graph-node").count();
    const knownIds = ["e-root", "e-a", "e-b"];

    // Double-clic sur le FOND du canevas. On dispatch un vrai MouseEvent('dblclick')
    // DIRECTEMENT sur le <svg> (le listener d'édition y est attaché) : `page.mouse.dblclick`
    // synthétique est avalé par le pointer-capture du pan viewport (#667), et le fond d'un
    // <svg> ne répond pas à `elementFromPoint` — on calcule donc un point de fond via les
    // bounding boxes des nœuds (hors nœud ET hors .graph-toolbar overlay top-start).
    const created = await page.evaluate(() => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[6] as HTMLElement;
      const svg = host.querySelector(".graph-canvas") as SVGSVGElement;
      const r = svg.getBoundingClientRect();
      const nodes = [...host.querySelectorAll(".graph-node")].map((n) =>
        n.getBoundingClientRect(),
      );
      const tb = host.querySelector(".graph-toolbar")?.getBoundingClientRect();
      const clear = (x: number, y: number) =>
        !nodes.some(
          (b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom,
        ) &&
        !(tb && x >= tb.left && x <= tb.right && y >= tb.top && y <= tb.bottom);
      for (let fy = 0.9; fy >= 0.1; fy -= 0.05)
        for (let fx = 0.15; fx <= 0.85; fx += 0.05) {
          const x = r.left + r.width * fx,
            y = r.top + r.height * fy;
          if (clear(x, y)) {
            svg.dispatchEvent(
              new MouseEvent("dblclick", {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true,
                view: window,
              }),
            );
            return { x, y };
          }
        }
      return null;
    });
    expect(created).not.toBeNull();

    await expect(el.locator(".graph-node")).toHaveCount(before + 1);
    const id = await activeNodeId(page);
    expect(id).not.toBeNull();
    expect(knownIds).not.toContain(id);
  });

  test('bouton toolbar "Ajouter un nœud" cree un nœud au centre du viewport et lui donne le focus', async ({
    page,
  }) => {
    const el = editContainer(page);
    const before = await el.locator(".graph-node").count();
    const knownIds = ["e-root", "e-a", "e-b"];

    await el
      .locator('.graph-toolbar button[aria-label="Ajouter un nœud"]')
      .click();

    await expect(el.locator(".graph-node")).toHaveCount(before + 1);
    const id = await activeNodeId(page);
    expect(id).not.toBeNull();
    expect(knownIds).not.toContain(id);
  });

  test("Suppr (clavier) supprime le nœud sélectionné et déplace le focus vers son voisin", async ({
    page,
  }) => {
    const el = editContainer(page);
    const before = await el.locator(".graph-node").count();

    // e-a n'a qu'un seul voisin : e-root (edge e-t1) -> contrat E, 1er voisin.
    await el.locator('[data-node-id="e-a"]').click();
    await expect(el.locator('[data-node-id="e-a"]')).toHaveClass(
      /graph-node--selected/,
    );

    await page.keyboard.press("Delete");

    await expect(el.locator(".graph-node")).toHaveCount(before - 1);
    await expect(el.locator('[data-node-id="e-a"]')).toHaveCount(0);
    expect(await activeNodeId(page)).toBe("e-root");
  });

  test('bouton toolbar "Supprimer" agit sur la sélection courante (clic noeud puis bouton)', async ({
    page,
  }) => {
    const el = editContainer(page);
    const before = await el.locator(".graph-node").count();

    await el.locator('[data-node-id="e-b"]').click();
    await expect(el.locator('[data-node-id="e-b"]')).toHaveClass(
      /graph-node--selected/,
    );

    await el.locator('.graph-toolbar button[aria-label="Supprimer"]').click();

    await expect(el.locator(".graph-node")).toHaveCount(before - 1);
    await expect(el.locator('[data-node-id="e-b"]')).toHaveCount(0);
    // e-b n'a qu'un seul voisin : e-root -> contrat E, focus voisin.
    expect(await activeNodeId(page)).toBe("e-root");
  });

  test('mode "Relier" (clic source puis clic cible) crée une arête', async ({
    page,
  }) => {
    const el = editContainer(page);
    const beforeEdges = await el.locator(".graph-edge").count();
    const relierBtn = el.locator('.graph-toolbar button[aria-label="Relier"]');

    await expect(relierBtn).toHaveAttribute("aria-pressed", "false");
    await relierBtn.click();
    await expect(relierBtn).toHaveAttribute("aria-pressed", "true");

    // e-a et e-b ne sont pas encore relies entre eux (seulement via e-root) -> +1 arete attendue.
    await el.locator('[data-node-id="e-a"]').click();
    await expect(el.locator('[data-node-id="e-a"]')).toHaveClass(
      /graph-node--connect-source/,
    );

    await el.locator('[data-node-id="e-b"]').click();
    await expect(el.locator(".graph-edge")).toHaveCount(beforeEdges + 1);
    // la source temporaire est nettoyee apres la creation de l'arete
    await expect(el.locator('[data-node-id="e-a"]')).not.toHaveClass(
      /graph-node--connect-source/,
    );
  });

  test("supprimer une arête garde le focus dans le graphe (nœud roving), pas sur <body> (#673 review)", async ({
    page,
  }) => {
    const el = editContainer(page);
    await el.locator('[data-node-id="e-root"]').focus(); // focus DOM initial (roving order[0])
    const beforeEdges = await el.locator(".graph-edge").count();
    // Sélectionne l'arête e-t1 par un clic au milieu de son tracé (getPointAtLength).
    const clicked = await page.evaluate(() => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[6] as HTMLElement;
      const path = host.querySelector(
        '[data-edge-id="e-t1"]',
      ) as SVGPathElement | null;
      if (!path) return false;
      const mid = path.getPointAtLength(path.getTotalLength() / 2);
      const m = path.getScreenCTM();
      if (!m) return false;
      const x = mid.x * m.a + mid.y * m.c + m.e;
      const y = mid.x * m.b + mid.y * m.d + m.f;
      path.dispatchEvent(
        new MouseEvent("click", {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      return true;
    });
    expect(clicked).toBe(true);
    await expect(el.locator('[data-edge-id="e-t1"]')).toHaveClass(
      /graph-edge--selected/,
    );
    await page.keyboard.press("Delete");
    await expect(el.locator(".graph-edge")).toHaveCount(beforeEdges - 1);
    // Contrat #673 : le focus reste sur un nœud du graphe, jamais sur <body>.
    const active = await page.evaluate(
      () => document.activeElement?.getAttribute("data-node-id") ?? null,
    );
    expect(active).not.toBeNull();
  });

  test('Échap annule le mode "Relier" en cours — pas d\'arête inattendue (#673 review)', async ({
    page,
  }) => {
    const el = editContainer(page);
    const beforeEdges = await el.locator(".graph-edge").count();
    const relierBtn = el.locator('.graph-toolbar button[aria-label="Relier"]');
    await relierBtn.click();
    await expect(relierBtn).toHaveAttribute("aria-pressed", "true");
    await el.locator('[data-node-id="e-a"]').click(); // source choisie
    await expect(el.locator('[data-node-id="e-a"]')).toHaveClass(
      /graph-node--connect-source/,
    );
    await page.keyboard.press("Escape"); // sortie clavier du mode « Relier »
    await expect(relierBtn).toHaveAttribute("aria-pressed", "false");
    await expect(el.locator('[data-node-id="e-a"]')).not.toHaveClass(
      /graph-node--connect-source/,
    );
    // un clic ultérieur ne crée PAS d'arête (mode sorti, source périmée nettoyée)
    await el.locator('[data-node-id="e-b"]').click();
    await expect(el.locator(".graph-edge")).toHaveCount(beforeEdges);
  });
});
