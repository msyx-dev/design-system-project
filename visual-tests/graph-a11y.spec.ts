/**
 * graph-a11y.spec.ts — live-region SR (debounce + touche `i`) + forced-colors (#672, I4-2)
 * Fonctionnel, PAS de screenshot VR (jumeau graph-keyboard.spec.ts, #671). Cible
 * pages/data.html #graph, demo "arbre" (2e `.graph[data-graph]` — layout `tree`, meme
 * fixture que #671 : root -> [i1a, i3] ; i1a -> [i1b1] ; i1b1 -> [i1b2] ; i1b2 -> [i4]).
 *
 * Live-region : _announce() (svg-renderer.js) n'est hookee QUE dans _focusNode() (nav
 * clavier noeud-a-noeud, #671) et select() branche noeud (clic/Enter) — un focus DOM
 * "brut" (locator.focus() ou Tab natif sur le tabindex=0 courant) ne passe PAS par ces
 * methodes. Les tests naviguent donc via de VRAIES fleches clavier (ArrowDown/etc.),
 * comme un utilisateur clavier reel.
 */
import { test, expect } from "@playwright/test";

function container(page: import("@playwright/test").Page) {
  return page.locator("#graph .graph[data-graph]").nth(1); // demo "arbre"
}

function selectionDemo(page: import("@playwright/test").Page) {
  return page.locator("#graph .graph[data-graph]").nth(2); // demo "viewport + selection"
}

function liveRegion(el: import("@playwright/test").Locator) {
  return el.locator(".graph-live");
}

test.describe("Graph — live-region SR debounce + touche i (#672, I4-2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/data.html");
    await expect(page).toHaveTitle(/^Data —/);
    await page.waitForLoadState("networkidle");
    // Horloge figee APRES le chargement complet (page/graphe/JS init deja stables) —
    // `pauseAt()` (contrairement a `install()` seul, qui continue de ticker en temps
    // reel une fois installe) gele Date/setTimeout/rAF au temps courant : AUCUN timer
    // ne peut se declencher sans un `fastForward()` explicite, quelle que soit la
    // charge machine. Élimine la race constatee en CI (12 projets en parallèle) où
    // `expect().toHaveText()` (auto-retry sur polling réel) échantillonnait parfois
    // l'état après que le vrai debounce de 300ms se soit déjà déclenché.
    await page.clock.pauseAt(new Date());
  });

  test(".graph-live existe, masquee visuellement, aria-live=polite/aria-atomic=true", async ({
    page,
  }) => {
    const el = container(page);
    const live = liveRegion(el);
    await expect(live).toHaveAttribute("aria-live", "polite");
    await expect(live).toHaveAttribute("aria-atomic", "true");
    // sr-only : hors du flux visuel (clip 0) mais toujours dans le DOM/accessibility tree
    const box = await live.boundingBox();
    expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
  });

  test("deplacement clavier (fleche) -> label IMMEDIAT, puis connexions apres avance horloge de 300ms", async ({
    page,
  }) => {
    const el = container(page);
    const live = liveRegion(el);

    await el.locator('[data-node-id="root"]').focus();
    await page.keyboard.press("ArrowDown"); // root -> i1a, via _focusNode()

    // Immediat : SEULEMENT le label — horloge figee, le debounce 300ms NE PEUT PAS
    // s'etre declenche (deterministe, aucune dependance au temps reel/a la charge CI).
    await expect(live).toHaveText("I1a #657");

    // Avance l'horloge de 300ms exactement (deterministe) -> le debounce se declenche :
    // label + connexions (out avant in -> i1b1, root).
    await page.clock.fastForward(300);
    await expect(live).toHaveText(
      "I1a #657. Connecté à 2 : I1b-1 #665, Epic #656",
    );
  });

  test("touche `i` déclenche l'annonce des connexions immédiatement (sans attendre le debounce)", async ({
    page,
  }) => {
    const el = container(page);
    const live = liveRegion(el);

    await el.locator('[data-node-id="root"]').focus();
    await page.keyboard.press("ArrowDown"); // root -> i1a
    await expect(live).toHaveText("I1a #657"); // label seul, horloge figee -> debounce jamais ecoule

    await page.keyboard.press("i"); // court-circuite le debounce SANS avancer l'horloge
    await expect(live).toHaveText(
      "I1a #657. Connecté à 2 : I1b-1 #665, Epic #656",
    );
  });

  test("traversee rapide (fleches en rafale) n'empile PAS les annonces — seul l'etat final s'annonce", async ({
    page,
  }) => {
    const el = container(page);
    const live = liveRegion(el);

    await el.locator('[data-node-id="root"]').focus();
    // Rafale SANS avancer l'horloge entre les appuis : root -> i1a -> i1b1
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Immediat (horloge figee, aucun timer n'a pu se declencher) : le label du DERNIER
    // noeud uniquement, aucune concatenation avec l'annonce precedente (i1a).
    await expect(live).toHaveText("I1b-1 #665");

    // Avance l'horloge : connexions du DERNIER noeud (i1b1) uniquement — le timer de
    // l'annonce i1a a ete annule/reprogramme, pas de double-annonce empilee.
    await page.clock.fastForward(300);
    await expect(live).toHaveText(
      "I1b-1 #665. Connecté à 2 : I1b-2 #666, I1a #657",
    );
    const settled = await live.textContent();
    expect(settled).not.toContain("Epic #656"); // connexions de root (1er noeud), jamais annoncees
  });

  test("Enter (select()) sur un noeud focuse annonce aussi le label (branche noeud de select())", async ({
    page,
  }) => {
    const el = container(page);
    const live = liveRegion(el);

    await el.locator('[data-node-id="i3"]').focus();
    await page.keyboard.press("Enter"); // select('i3') -> branche noeud -> _announce('i3')
    // Assertion immediate (horloge figee, avant le debounce) : seul le label immediat
    // nous interesse ici, la mecanique connexions/debounce est deja couverte ci-dessus.
    await expect(live).toHaveText("I3 layouts");
  });
});

test.describe("Graph — forced-colors active, Windows High Contrast Mode (#672, I4-2)", () => {
  // `test.use({ forcedColors: "active" })` (option de contexte) ne se propage PAS de
  // maniere fiable jusqu'au moteur de rendu dans cet environnement (verifie : le media
  // query ne matche jamais malgre l'option correctement merge dans les fixtures) ->
  // `page.emulateMedia({ forcedColors: "active" })` APRES navigation est la methode
  // qui fonctionne de maniere reproductible (CDP Emulation.setEmulatedMedia direct).
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/data.html");
    await expect(page).toHaveTitle(/^Data —/);
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ forcedColors: "active" });
  });

  test("le media (forced-colors: active) est bien detecte par la page", async ({
    page,
  }) => {
    const matches = await page.evaluate(
      () => window.matchMedia("(forced-colors: active)").matches,
    );
    expect(matches).toBe(true);
  });

  test("noeuds/aretes distingues par FORME/BORDURE (fill Canvas + bordure CanvasText, pas seulement teinte)", async ({
    page,
  }) => {
    const el = selectionDemo(page);
    const nodeBg = el.locator('[data-node-id="root"] .graph-node-bg');
    const edge = el.locator(".graph-edge").first();

    const node = await nodeBg.evaluate((n) => {
      const cs = getComputedStyle(n as Element);
      return { fill: cs.fill, stroke: cs.stroke, strokeWidth: cs.strokeWidth };
    });
    const edgeStroke = await edge.evaluate(
      (n) => getComputedStyle(n as Element).stroke,
    );

    // Le noeud a un fill defini (pas transparent) distinct de la couleur de trait des
    // aretes -> case remplie + bordure vs simple trait = distinction structurelle.
    expect(node.fill).not.toBe("none");
    expect(node.fill).not.toBe("");
    expect(node.fill).not.toBe(edgeStroke);
    // La bordure du noeud (CanvasText) reprend la meme couleur systeme que les aretes
    // (coherence du systeme de bordures), et le fill du noeud (Canvas) en est distinct.
    expect(node.stroke).toBe(edgeStroke);
  });

  test("selection distinguable via outline systeme (Highlight), distinct du noeud non selectionne", async ({
    page,
  }) => {
    const el = selectionDemo(page); // initialSelection: 'i1b2' (silent, pose au chargement)
    const selectedBg = el.locator('[data-node-id="i1b2"] .graph-node-bg');
    const plainBg = el.locator('[data-node-id="root"] .graph-node-bg');

    const sel = await selectedBg.evaluate((n) => {
      const cs = getComputedStyle(n as Element);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        stroke: cs.stroke,
      };
    });
    const plain = await plainBg.evaluate(
      (n) => getComputedStyle(n as Element).stroke,
    );

    expect(sel.outlineStyle).toBe("solid");
    expect(sel.outlineWidth).toBe("3px");
    // La bordure du noeud selectionne (Highlight) differe de celle d'un noeud normal
    // (CanvasText) -> distinguable sans dependre de --accent (ignore en forced-colors).
    expect(sel.stroke).not.toBe(plain);
  });
});
