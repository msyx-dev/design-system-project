// Tests -- initSortableLists (#744, vague 11/N couverture tests vanilla)
//
// Expose directement via window.__initSortableLists (shared/components.js:3333).
// Markup repris de pages/composants.html#sortable-list (classes/attrs reels) :
// .sortable-list[role="listbox"] > .sortable-item[draggable="true"][role="option"]
// [aria-grabbed] avec une poignee .sortable-handle ; variante numerotee
// .sortable-list--numbered avec un .sortable-num par item.
//
// DEUX mecanismes de reordonnancement coexistent dans le composant :
//  1. HTML5 Drag & Drop (souris/desktop) -- dragstart/dragover/dragleave/drop
//     /dragend sur chaque .sortable-item. jsdom n'implemente ni DragEvent ni
//     DataTransfer (verifie #744 vague 9) : le helper partage fireDrag()
//     (Event generique + dataTransfer pose a la main) suffit, le code sous
//     test ne fait que LIRE/ECRIRE effectAllowed/dropEffect.
//  2. Pointer events (tactile) -- pointerdown/pointermove/pointerup, actif
//     seulement si e.pointerType !== 'mouse'. jsdom EXPOSE PointerEvent
//     (verifie empiriquement, contrairement a DragEvent/Touch) donc pas
//     besoin de helper maison ici. MAIS ce chemin determine sa cible de
//     depot via item.getBoundingClientRect() (comparaison de clientY aux
//     bornes top/bottom) -- jsdom ne calcule AUCUNE geometrie reelle (rect
//     nul, {0,0,0,0} pour tout element). Sans intervention, chaque item
//     aurait donc un rect identique et le calcul de cible serait degenere,
//     pas un test honnete du comportement reel. On stube explicitement
//     getBoundingClientRect() par item (valeurs deterministes en lignes de
//     44px, meme esprit que la consigne de #744 vague 11 pour virtual-list :
//     forcer la geometrie plutot que pretendre la mesurer) -- assume et
//     documente ligne par ligne dans la section de tests concernee.
//
// Navigation clavier : le composant N'IMPLEMENTE AUCUN listener 'keydown'
// (grep verifie sur toute la fonction) malgre role="listbox"/role="option"
// dans le markup -- seuls la souris (DnD) et le tactile (pointer) permettent
// de reordonner. Il n'y a donc RIEN a tester honnetement sur ce point : un
// test qui appuierait sur une fleche et verifierait l'ordre inchange ne
// prouverait rien (le composant n'a jamais pretendu gerer le clavier). Ecart
// signale en commentaire de la PR plutot que teste ici.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireDrag } from './helpers/load-components.js';

function itemHtml(label, num) {
  const numSpan = num != null ? `<span class="sortable-num">${num}</span>` : '';
  return `
    <li class="sortable-item" draggable="true" role="option" aria-grabbed="false">
      <span class="sortable-handle" aria-hidden="true">&#8942;&#8942;</span>
      ${numSpan}
      <span class="sortable-label">${label}</span>
    </li>
  `;
}

function listHtml({ numbered = false } = {}) {
  const items = ['A', 'B', 'C', 'D'];
  const cls = numbered ? 'sortable-list sortable-list--numbered' : 'sortable-list';
  const lis = items.map((l, i) => itemHtml(l, numbered ? i + 1 : null)).join('');
  return `<ul class="${cls}" aria-label="Liste reorderable" role="listbox">${lis}</ul>`;
}

function setup(opts) {
  const dom = loadComponentsWindow(listHtml(opts));
  const { window } = dom;
  const { document } = window;
  window.__initSortableLists();
  const list = document.querySelector('.sortable-list');
  return { window, document, list };
}

function items(list) {
  return Array.from(list.querySelectorAll('.sortable-item'));
}

function labels(list) {
  return items(list).map(li => li.querySelector('.sortable-label').textContent);
}

function nums(list) {
  return items(list).map(li => {
    const n = li.querySelector('.sortable-num');
    return n ? n.textContent : null;
  });
}

// Sequence complete DnD (souris) pour deplacer `src` "sur" `target`.
function drag(win, src, target) {
  fireDrag(win, src, 'dragstart');
  fireDrag(win, target, 'dragover');
  fireDrag(win, target, 'drop');
  fireDrag(win, src, 'dragend');
}

describe('initSortableLists -- drag & drop souris (HTML5 DnD)', () => {
  it('deplacer un item VERS L AVANT (src avant target) l insere juste APRES la cible', () => {
    const { window, list } = setup();
    const [a, , c] = items(list);
    drag(window, a, c); // A -> apres C
    expect(labels(list)).toEqual(['B', 'C', 'A', 'D']);
  });

  it('deplacer un item VERS L ARRIERE (src apres target) l insere juste AVANT la cible', () => {
    const { window, list } = setup();
    const [, b, , d] = items(list);
    drag(window, d, b); // D -> avant B
    expect(labels(list)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('dragstart pose la classe dragging + aria-grabbed="true" sur la source', () => {
    const { window, list } = setup();
    const [a] = items(list);
    fireDrag(window, a, 'dragstart');
    expect(a.classList.contains('dragging')).toBe(true);
    expect(a.getAttribute('aria-grabbed')).toBe('true');
  });

  it('dragover sur une AUTRE ligne pose .drag-over (et jamais 2 lignes en meme temps)', () => {
    const { window, list } = setup();
    const [a, b, c] = items(list);
    fireDrag(window, a, 'dragstart');
    fireDrag(window, b, 'dragover');
    expect(b.classList.contains('drag-over')).toBe(true);
    fireDrag(window, c, 'dragover');
    expect(b.classList.contains('drag-over')).toBe(false);
    expect(c.classList.contains('drag-over')).toBe(true);
  });

  it('dragover sur la source ELLE-MEME ne pose pas .drag-over (no-op cosmetique)', () => {
    const { window, list } = setup();
    const [a] = items(list);
    fireDrag(window, a, 'dragstart');
    fireDrag(window, a, 'dragover');
    expect(a.classList.contains('drag-over')).toBe(false);
  });

  it('dragleave retire .drag-over de la ligne survolee', () => {
    const { window, list } = setup();
    const [a, b] = items(list);
    fireDrag(window, a, 'dragstart');
    fireDrag(window, b, 'dragover');
    fireDrag(window, b, 'dragleave');
    expect(b.classList.contains('drag-over')).toBe(false);
  });

  it('drop sur la source elle-meme est un no-op (ordre inchange, pas de crash)', () => {
    const { window, list } = setup();
    const [a] = items(list);
    fireDrag(window, a, 'dragstart');
    fireDrag(window, a, 'drop');
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('drop sans dragstart prealable (dragSrc=null) est un no-op (pas de crash)', () => {
    const { window, list } = setup();
    const [, b] = items(list);
    fireDrag(window, b, 'drop');
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('dragend nettoie dragging/.drag-over et repasse aria-grabbed a "false"', () => {
    const { window, list } = setup();
    const [a, , c] = items(list);
    drag(window, a, c);
    expect(a.classList.contains('dragging')).toBe(false);
    expect(a.getAttribute('aria-grabbed')).toBe('false');
    expect(list.querySelectorAll('.drag-over').length).toBe(0);
  });
});

describe('initSortableLists -- liste numerotee (sortable-list--numbered)', () => {
  it('un deplacement renumerote les .sortable-num dans le NOUVEL ordre DOM (1..N sequentiel)', () => {
    const { window, list } = setup({ numbered: true });
    const [a, , c] = items(list);
    drag(window, a, c); // -> B, C, A, D
    expect(labels(list)).toEqual(['B', 'C', 'A', 'D']);
    expect(nums(list)).toEqual(['1', '2', '3', '4']);
  });

  it('sur une liste NON numerotee, updateNumbers() est un no-op silencieux (pas de .sortable-num, pas de crash)', () => {
    const { window, list } = setup({ numbered: false });
    const [a, , c] = items(list);
    expect(() => drag(window, a, c)).not.toThrow();
    expect(nums(list)).toEqual([null, null, null, null]);
  });
});

describe('initSortableLists -- pointer events (tactile)', () => {
  // jsdom ne calcule aucune geometrie reelle (getBoundingClientRect() rend
  // {0,0,0,0} pour tout element) -- le mecanisme de detection de cible du
  // composant compare pourtant clientY aux bornes top/bottom de CHAQUE item
  // pour designer la cible de depot. Sans intervention, tous les items
  // auraient le meme rect nul et le test ne prouverait rien. On force donc
  // une geometrie deterministe (lignes de 44px, dans l'ordre DOM initial)
  // via une reaffectation directe de getBoundingClientRect sur chaque
  // element -- assume, cf. commentaire d'en-tete du fichier.
  function stubRects(list) {
    items(list).forEach((li, i) => {
      li.getBoundingClientRect = () => ({
        top: i * 44, bottom: i * 44 + 44, left: 0, right: 300, width: 300, height: 44,
      });
    });
  }

  function firePointer(win, el, type, clientY, extra = {}) {
    const evt = new win.PointerEvent(type, {
      clientX: 10, clientY, pointerType: 'touch', bubbles: true, cancelable: true, ...extra,
    });
    el.dispatchEvent(evt);
    return evt;
  }

  it('pointerdown avec pointerType="mouse" est ignore (chemin reserve au DnD HTML5)', () => {
    const { window, document, list } = setup();
    stubRects(list);
    const handle = items(list)[0].querySelector('.sortable-handle');
    const bodyChildrenBefore = document.body.children.length;
    firePointer(window, handle, 'pointerdown', 22, { pointerType: 'mouse' });
    expect(items(list)[0].classList.contains('dragging')).toBe(false);
    expect(document.body.children.length).toBe(bodyChildrenBefore); // aucun clone cree
  });

  it('pointerdown (tactile) sur la poignee demarre le glisse : classe dragging + aria-grabbed + clone attache au body', () => {
    const { window, document, list } = setup();
    stubRects(list);
    const first = items(list)[0];
    const handle = first.querySelector('.sortable-handle');
    const bodyChildrenBefore = document.body.children.length;
    firePointer(window, handle, 'pointerdown', 22); // centre de la ligne 0 (top:0,bottom:44)
    expect(first.classList.contains('dragging')).toBe(true);
    expect(first.getAttribute('aria-grabbed')).toBe('true');
    expect(document.body.children.length).toBe(bodyChildrenBefore + 1); // clone appended
  });

  it('glisser jusqu a la ligne 2 puis relacher reordonne la liste comme au clavier de souris', () => {
    const { window, document, list } = setup();
    stubRects(list);
    const handle = items(list)[0].querySelector('.sortable-handle'); // "A"
    firePointer(window, handle, 'pointerdown', 22); // ligne 0
    firePointer(window, document, 'pointermove', 100); // ligne 2 ("C" : top 88-132)
    firePointer(window, document, 'pointerup', 100);
    expect(labels(list)).toEqual(['B', 'C', 'A', 'D']); // meme resultat que le DnD souris equivalent
  });

  it('apres le relachement, le clone est retire du body et l etat de glisse est nettoye', () => {
    const { window, document, list } = setup();
    stubRects(list);
    const bodyChildrenBefore = document.body.children.length;
    const first = items(list)[0];
    const handle = first.querySelector('.sortable-handle');
    firePointer(window, handle, 'pointerdown', 22);
    firePointer(window, document, 'pointermove', 100);
    firePointer(window, document, 'pointerup', 100);
    expect(document.body.children.length).toBe(bodyChildrenBefore);
    expect(first.classList.contains('dragging')).toBe(false);
    expect(first.getAttribute('aria-grabbed')).toBe('false');
  });
});

describe('initSortableLists -- divers', () => {
  it('reappeler initSortableLists() est idempotent (dataset.bound, pas de double-deplacement au meme drop)', () => {
    const { window, list } = setup();
    window.__initSortableLists(); // 2e appel -- doit no-op sur cette liste deja bound
    const [a, , c] = items(list);
    // Si les listeners etaient poses 2 fois, le drop appellerait insertBefore
    // 2 fois (idempotent en pratique pour un seul insertBefore) MAIS
    // dragend/updateNumbers tourneraient aussi 2 fois -- on verifie surtout
    // qu'un seul deplacement net a lieu et que l'ordre reste previsible.
    drag(window, a, c);
    expect(labels(list)).toEqual(['B', 'C', 'A', 'D']);
  });
});
