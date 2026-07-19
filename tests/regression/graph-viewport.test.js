// Test unitaire — shared/graph/render/viewport.js (#667, I2-1)
// Fonctions pures DOM-free (clampZoom/userToWorld/worldToUser/zoomAt) : la classe
// Viewport (cablage DOM, getScreenCTM/wheel/pointer) N'EST PAS importee ici — jumeau
// de tests/regression/graph-layout.test.js. AUCUN stub `document` : si un document.*
// s'y glissait, ce fichier planterait (ReferenceError).
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

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-viewport passes (clampZoom/userToWorld/worldToUser/zoomAt)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
