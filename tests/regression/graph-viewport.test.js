// Test unitaire — shared/graph/render/viewport.js (#667, I2-1 ; #668, I2-2)
// Fonctions pures DOM-free (clampZoom/userToWorld/worldToUser/zoomAt) : la classe
// Viewport (cablage DOM, getScreenCTM/wheel/pointer) N'EST PAS importee ici — jumeau
// de tests/regression/graph-layout.test.js. AUCUN stub `document` : si un document.*
// s'y glissait, ce fichier planterait (ReferenceError).
// #668 : fit()/zoomToNode()/select()/ResizeObserver/clavier touchent le DOM (SvgRenderer,
// getBoundingClientRect, CSS.escape, focus) -> NON testes ici. Seule la MATH pure derriere
// fit (identite) et zoomToNode (formule de cadrage) est verifiee, via worldToUser deja
// importee ci-dessus — cf. shared/graph/README.md "Non testé unitairement".
let FAILED = 0;

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FAIL: ${msg} — attendu ${JSON.stringify(expected)}, recu ${JSON.stringify(actual)}`);
    FAILED++;
  }
}

function assertTrue(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    FAILED++;
  }
}

function assertClose(actual, expected, msg, tol = 1e-6) {
  if (Math.abs(actual - expected) > tol) {
    console.error(`FAIL: ${msg} — attendu ~${expected}, recu ${actual}`);
    FAILED++;
  }
}

function assertPointClose(actual, expected, msg, tol = 1e-6) {
  assertClose(actual.x, expected.x, `${msg} (x)`, tol);
  assertClose(actual.y, expected.y, `${msg} (y)`, tol);
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { clampZoom, userToWorld, worldToUser, zoomAt } = await import('../../shared/graph/render/viewport.js');

  // ---- clampZoom ----
  {
    assertEqual(clampZoom(0.05, 0.2, 4), 0.2, '1. clampZoom : sous-borne clampee au min');
    assertEqual(clampZoom(10, 0.2, 4), 4, '2. clampZoom : sur-borne clampee au max');
    assertEqual(clampZoom(1.5, 0.2, 4), 1.5, '3. clampZoom : dedans -> inchange');
    assertEqual(clampZoom(0.2, 0.2, 4), 0.2, '4. clampZoom : borne min incluse');
    assertEqual(clampZoom(4, 0.2, 4), 4, '5. clampZoom : borne max incluse');
  }

  // ---- userToWorld / worldToUser sont inverses ----
  {
    const vp = { tx: 37, ty: -12, k: 1.8 };
    const p = { x: 123, y: 456 };
    const roundTrip = worldToUser(userToWorld(p, vp), vp);
    assertPointClose(roundTrip, p, '6. userToWorld(worldToUser) inverse (vp non triviale)');

    const p2 = { x: -50, y: 200 };
    const roundTrip2 = userToWorld(worldToUser(p2, vp), vp);
    assertPointClose(roundTrip2, p2, '7. worldToUser(userToWorld) inverse (vp non triviale)');

    // identite vp={tx:0,ty:0,k:1} -> user === world
    const idVp = { tx: 0, ty: 0, k: 1 };
    assertPointClose(userToWorld(p, idVp), p, '8. userToWorld : identite vp -> inchange');
    assertPointClose(worldToUser(p, idVp), p, '9. worldToUser : identite vp -> inchange');
  }

  // ---- zoomAt : ancrage du point ecran/utilisateur ----
  {
    const vp = { tx: 10, ty: -5, k: 1 };
    const ux = 200;
    const uy = 150;
    const worldUnderCursor = userToWorld({ x: ux, y: uy }, vp);

    const vp2 = zoomAt(vp, ux, uy, 2, 0.2, 4);
    assertEqual(vp2.k, 2, '10. zoomAt : facteur applique (k=1 -> k=2)');
    const worldUnderCursorAfter = userToWorld({ x: ux, y: uy }, vp2);
    assertPointClose(worldUnderCursorAfter, worldUnderCursor, '11. zoomAt : monde sous le curseur invariant apres zoom-in');

    const backToUser = worldToUser(worldUnderCursor, vp2);
    assertPointClose(backToUser, { x: ux, y: uy }, '12. zoomAt : point ecran reste fixe (worldToUser(userToWorld(p)) ~= p)');

    // zoom-out (facteur < 1) : meme garantie
    const vp3 = zoomAt(vp2, ux, uy, 0.5, 0.2, 4);
    assertClose(vp3.k, 1, '13. zoomAt : zoom-out revient a k=1');
    assertPointClose(worldToUser(worldUnderCursor, vp3), { x: ux, y: uy }, '14. zoomAt : ancrage stable apres aller-retour zoom-in/zoom-out');

    // ancrage sur point different de l'origine, vp non triviale au depart
    const vp4 = { tx: -30, ty: 80, k: 0.75 };
    const ux2 = -20;
    const uy2 = 300;
    const world2 = userToWorld({ x: ux2, y: uy2 }, vp4);
    const vp5 = zoomAt(vp4, ux2, uy2, 1.6, 0.2, 4);
    assertPointClose(worldToUser(world2, vp5), { x: ux2, y: uy2 }, '15. zoomAt : ancrage stable (vp de depart non triviale)');
  }

  // ---- zoomAt : clamp ----
  {
    const vp = { tx: 0, ty: 0, k: 1 };
    const huge = zoomAt(vp, 100, 100, 1000, 0.2, 4);
    assertEqual(huge.k, 4, '16. zoomAt : facteur enorme -> clamp au max');
    assertTrue(Number.isFinite(huge.tx) && Number.isFinite(huge.ty), '17. zoomAt : tx/ty finis apres clamp (facteur enorme)');

    const tiny = zoomAt(vp, 100, 100, 0.0001, 0.2, 4);
    assertEqual(tiny.k, 0.2, '18. zoomAt : facteur minuscule -> clamp au min');
    assertTrue(Number.isFinite(tiny.tx) && Number.isFinite(tiny.ty), '19. zoomAt : tx/ty finis apres clamp (facteur minuscule)');

    // le clamp au min reste coherent avec l'ancrage : le point reste fixe MEME clampe,
    // car min < vp.k * factor ne s'applique plus une fois clampe (comportement attendu,
    // documente : l'ancrage exact n'est garanti que dans les bornes, cf. spec #667).
    const clamped = zoomAt(vp, 100, 100, 0.2, 0.2, 4);
    assertEqual(clamped.k, 0.2, '20. zoomAt : facteur egal au min -> k clampe exactement au min');
  }

  // ---- #668 : fit() = identite (verification math pure) ----
  // fit() delegue a setViewport({tx:0,ty:0,k:1}) sans calcul de bbox — le viewBox pose
  // par paint()/_applyLayout() (#666) cadre deja le contenu. La garantie testable ici :
  // a la transform identite, worldToUser (et son inverse userToWorld) sont des no-op.
  {
    const identity = { tx: 0, ty: 0, k: 1 };
    const p = { x: 87, y: -43 };
    assertPointClose(worldToUser(p, identity), p, "21. fit() = identite : worldToUser(p, {0,0,1}) === p (aucun cadrage a calculer)");
    assertPointClose(userToWorld(p, identity), p, '22. fit() = identite : userToWorld(p, {0,0,1}) === p (reciproque)');
  }

  // ---- #668 : zoomToNode — formule de cadrage (verification math pure) ----
  // zoomToNode(id,k) calcule tx = mid.x - center.x*k (ty symetrique) pour que
  // worldToUser(center, vp) === mid, c-a-d le noeud cible se retrouve au centre du
  // <svg>. On verifie la formule directement (sans DOM : screenToUser/getBoundingClientRect
  // ne sont pas invoques ici, seul le calcul de vp l'est).
  {
    const center = { x: 120, y: 340 };
    const mid = { x: 400, y: 250 }; // centre du <svg> en espace-utilisateur (exemple)
    const k = 1.5;
    const vp = { tx: mid.x - center.x * k, ty: mid.y - center.y * k, k };
    assertPointClose(worldToUser(center, vp), mid, '23. zoomToNode : formule de cadrage — le noeud cible atterrit au centre du viewport');

    // meme garantie avec un facteur de zoom different et un centre negatif
    const center2 = { x: -80, y: 15 };
    const mid2 = { x: 250, y: 180 };
    const k2 = 0.8;
    const vp2 = { tx: mid2.x - center2.x * k2, ty: mid2.y - center2.y * k2, k: k2 };
    assertPointClose(worldToUser(center2, vp2), mid2, '24. zoomToNode : formule de cadrage — stable avec un centre negatif et k<1');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-viewport passes (clampZoom/userToWorld/worldToUser/zoomAt/fit/zoomToNode)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
