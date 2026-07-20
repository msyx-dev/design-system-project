/**
 * graph-edit.spec.ts — Mode edition create/delete + contrat de focus (#673, I5-1)
 *                       + edition inline du label + ports/handles 44px (#674, I5-2)
 * Fonctionnel, PAS de screenshot VR (jumeau graph-keyboard.spec.ts/graph-a11y.spec.ts).
 * Cible pages/data.html #graph :
 *   - demo "mode edition" (7e `.graph[data-graph]`, index 6, `mode:'edit'`,
 *     `selectionDetail:false` — evite qu'un clic de selection ouvre le modal de detail I2-2
 *     pendant le flux d'edition) : root `e-root` -> [`e-a`, `e-b`].
 *   - demo "organigramme" (1re `.graph[data-graph]`, index 0, mode `view` par defaut) pour
 *     verifier l'absence de regression (aucune toolbar, aucune creation).
 *
 * #674 — pattern de simulation deja utilise dans ce fichier (dblclick fond) etendu au
 * drag de port : le pan (#667) pose `setPointerCapture()` sur `svgEl` a CHAQUE pointerdown,
 * ce qui avale `page.mouse.*` synthetique -> on `dispatchEvent` des `PointerEvent` bruts
 * directement sur l'element cible (port/svg), avec un `pointerId` COHERENT entre
 * pointerdown/pointermove/pointerup (cf. `shared/graph/lib/pointer-drag.js` : le drag ne
 * suit qu'UN SEUL `pointerId` a la fois, peu importe qu'il soit "reellement" actif au sens
 * de la Pointer Events spec — `setPointerCapture()` est deja best-effort/try-catch cote lib).
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

  // ---- #674, I5-2 — édition inline du label ----

  /** double-clic direct sur un nœud connu (contourne le pointer-capture du pan, cf. en-tête). */
  async function dblclickNode(
    page: import("@playwright/test").Page,
    nodeId: string,
  ) {
    return page.evaluate((id) => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[6] as HTMLElement;
      const svgEl = host.querySelector(".graph-canvas") as SVGSVGElement;
      const nodeG = host.querySelector(
        `[data-node-id="${id}"]`,
      ) as SVGGElement | null;
      if (!nodeG) return false;
      // #674 — data.html est une longue page : sans scroll explicite, la section graphe
      // vit hors du viewport initial -> elementFromPoint (_hitTest) renvoie `null` pour un
      // point hors-écran -> fallback `e.target` (=svgEl, jamais `.graph-node`) -> le
      // double-clic tombe (a tort) dans la branche FOND au lieu de NŒUD (cf. .coder-notes.md).
      nodeG.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "center",
        inline: "center",
      });
      const r = nodeG.getBoundingClientRect();
      svgEl.dispatchEvent(
        new MouseEvent("dblclick", {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      return true;
    }, nodeId);
  }

  test('double-clic sur un nœud (mode edit) ouvre l\'édition inline : input pré-rempli + focus + role="application"', async ({
    page,
  }) => {
    const el = editContainer(page);
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );

    expect(await dblclickNode(page, "e-a")).toBe(true);

    const input = el.locator(".graph-inline-edit");
    await expect(input).toHaveCount(1);
    await expect(input).toHaveValue("Branche A");

    const activeIsInput = await page.evaluate(
      () =>
        document.activeElement?.classList.contains("graph-inline-edit") ??
        false,
    );
    expect(activeIsInput).toBe(true);

    // Arbitrage A (#662) : role="application" LOCAL, uniquement pendant l'édition inline.
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "application",
    );
  });

  test("Enter valide l'édition inline : label modifié (updateNode) + focus re-posé sur le nœud + role restauré", async ({
    page,
  }) => {
    const el = editContainer(page);
    expect(await dblclickNode(page, "e-a")).toBe(true);

    const input = el.locator(".graph-inline-edit");
    await input.fill("Branche A modifiée");
    await input.press("Enter");

    await expect(el.locator(".graph-inline-edit")).toHaveCount(0);
    await expect(
      el.locator('[data-node-id="e-a"] .graph-node-label'),
    ).toHaveText("Branche A modifiée");
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );
    expect(await activeNodeId(page)).toBe("e-a");
  });

  test("Échap annule l'édition inline : label inchangé + focus re-posé sur le nœud + role restauré", async ({
    page,
  }) => {
    const el = editContainer(page);
    expect(await dblclickNode(page, "e-b")).toBe(true);

    const input = el.locator(".graph-inline-edit");
    await input.fill("Ceci ne doit jamais être enregistré");
    await input.press("Escape");

    await expect(el.locator(".graph-inline-edit")).toHaveCount(0);
    await expect(
      el.locator('[data-node-id="e-b"] .graph-node-label'),
    ).toHaveText("Branche B"); // inchangé
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );
    expect(await activeNodeId(page)).toBe("e-b");
  });

  test("blur (clic ailleurs) valide l'édition inline comme Enter", async ({
    page,
  }) => {
    const el = editContainer(page);
    expect(await dblclickNode(page, "e-a")).toBe(true);
    await el.locator(".graph-inline-edit").fill("Via blur");
    await el.locator('.graph-toolbar button[aria-label="Relier"]').focus(); // deplace le focus -> blur sur l'input
    await expect(el.locator(".graph-inline-edit")).toHaveCount(0);
    await expect(
      el.locator('[data-node-id="e-a"] .graph-node-label'),
    ).toHaveText("Via blur");
  });

  // ---- #674, I5-2 — ports/handles de connexion (drag-to-connect) ----

  test("le port de connexion d'un nœud a une hit-area ≥44px au survol", async ({
    page,
  }) => {
    const el = editContainer(page);
    await el.locator('[data-node-id="e-root"]').hover();
    const port = el.locator('[data-node-id="e-root"] .graph-port');
    await expect(port).toHaveCount(1);
    const box = await port.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  /** drag port(sourceId) -> point ecran (endX,endY), pointerId synthetique dedie (cf. en-tête). */
  async function dragPort(
    page: import("@playwright/test").Page,
    sourceId: string,
    endX: number,
    endY: number,
  ) {
    return page.evaluate(
      ({ sourceId, endX, endY }) => {
        const host = document.querySelectorAll(
          "#graph .graph[data-graph]",
        )[6] as HTMLElement;
        const portEl = host.querySelector(
          `[data-node-id="${sourceId}"] .graph-port`,
        ) as SVGCircleElement | null;
        if (!portEl) return false;
        const r = portEl.getBoundingClientRect();
        const startX = r.left + r.width / 2;
        const startY = r.top + r.height / 2;
        const pointerId = 9001;
        const base = {
          pointerId,
          bubbles: true,
          cancelable: true,
          view: window,
        };
        portEl.dispatchEvent(
          new PointerEvent("pointerdown", {
            ...base,
            clientX: startX,
            clientY: startY,
          }),
        );
        portEl.dispatchEvent(
          new PointerEvent("pointermove", {
            ...base,
            clientX: endX,
            clientY: endY,
          }),
        );
        portEl.dispatchEvent(
          new PointerEvent("pointerup", {
            ...base,
            clientX: endX,
            clientY: endY,
          }),
        );
        return true;
      },
      { sourceId, endX, endY },
    );
  }

  test("drag depuis un port vers un nœud cible crée une arête (edgeCount +1)", async ({
    page,
  }) => {
    const el = editContainer(page);
    const beforeEdges = await el.locator(".graph-edge").count();

    // e-a et e-b ne sont pas encore reliés entre eux (seulement via e-root, cf. mode "Relier"
    // ci-dessus) -> +1 arête attendue.
    const targetBox = await el.locator('[data-node-id="e-b"]').boundingBox();
    expect(targetBox).not.toBeNull();
    if (!targetBox) return;
    const ok = await dragPort(
      page,
      "e-a",
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    );
    expect(ok).toBe(true);

    await expect(el.locator(".graph-edge")).toHaveCount(beforeEdges + 1);
    // le fantôme de drag ne doit jamais persister après le drop
    await expect(el.locator(".graph-port-link")).toHaveCount(0);
  });

  test("drop hors nœud pendant un drag de port n'ajoute aucune arête (fantôme retiré)", async ({
    page,
  }) => {
    const el = editContainer(page);
    const beforeEdges = await el.locator(".graph-edge").count();

    const ok = await dragPort(page, "e-a", 6000, 6000); // tres loin, hors de tout noeud
    expect(ok).toBe(true);

    await expect(el.locator(".graph-edge")).toHaveCount(beforeEdges);
    await expect(el.locator(".graph-port-link")).toHaveCount(0);
  });

  // ---- Non-régression I5-1 (#674 ne doit rien casser) ----

  test("non-régression : double-clic sur le FOND crée toujours un nœud (le double-clic nœud, lui, ouvre l'édition inline)", async ({
    page,
  }) => {
    const el = editContainer(page);
    const beforeNodes = await el.locator(".graph-node").count();

    const created = await page.evaluate(() => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[6] as HTMLElement;
      const svgEl = host.querySelector(".graph-canvas") as SVGSVGElement;
      const r = svgEl.getBoundingClientRect();
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
            svgEl.dispatchEvent(
              new MouseEvent("dblclick", {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true,
                view: window,
              }),
            );
            return true;
          }
        }
      return false;
    });
    expect(created).toBe(true);
    await expect(el.locator(".graph-node")).toHaveCount(beforeNodes + 1);
    await expect(el.locator(".graph-inline-edit")).toHaveCount(0); // aucune edition inline declenchee
  });

  test('mode "view" : aucun port de connexion, aucune édition inline même en double-cliquant un nœud', async ({
    page,
  }) => {
    const el = viewContainer(page);
    await expect(el.locator(".graph-port")).toHaveCount(0);

    const dispatched = await page.evaluate(() => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[0] as HTMLElement;
      const svgEl = host.querySelector(".graph-canvas") as SVGSVGElement;
      const nodeG = host.querySelector(".graph-node") as SVGGElement | null;
      if (!nodeG) return false;
      const r = nodeG.getBoundingClientRect();
      svgEl.dispatchEvent(
        new MouseEvent("dblclick", {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      return true;
    });
    expect(dispatched).toBe(true);
    await expect(el.locator(".graph-inline-edit")).toHaveCount(0);
    await expect(el.locator(".graph-canvas")).toHaveAttribute(
      "role",
      "graphics-document",
    );
  });

  test("repaint pendant un drag de port (Suppr sur autre sélection) annule le drag — pas de fantôme bloqué (#674 review)", async ({
    page,
  }) => {
    const el = editContainer(page);
    await el.locator('[data-node-id="e-b"]').click(); // sélection tierce
    await expect(el.locator('[data-node-id="e-b"]')).toHaveClass(
      /graph-node--selected/,
    );
    const beforeNodes = await el.locator(".graph-node").count();
    // démarre un drag de port depuis e-root SANS pointerup (drag EN VOL)
    const started = await page.evaluate(() => {
      const host = document.querySelectorAll(
        "#graph .graph[data-graph]",
      )[6] as HTMLElement;
      const port = host.querySelector(
        '[data-node-id="e-root"] .graph-port',
      ) as SVGCircleElement | null;
      if (!port) return false;
      const r = port.getBoundingClientRect();
      const base = {
        pointerId: 9100,
        bubbles: true,
        cancelable: true,
        view: window,
      };
      port.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
        }),
      );
      port.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          clientX: r.left + 180,
          clientY: r.top + 180,
        }),
      );
      return true;
    });
    expect(started).toBe(true);
    await expect(el.locator(".graph-port-link")).toHaveCount(1); // fantôme en vol
    // repaint concurrent : Suppr supprime la sélection tierce (e-b)
    await page.keyboard.press("Delete");
    await expect(el.locator(".graph-node")).toHaveCount(beforeNodes - 1);
    await expect(el.locator('[data-node-id="e-b"]')).toHaveCount(0);
    // le fix (#674 review) annule le drag avant le wipe -> fantôme retiré, pas de fuite
    await expect(el.locator(".graph-port-link")).toHaveCount(0);
  });
});
