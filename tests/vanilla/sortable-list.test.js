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
// Navigation clavier (#836) : initSortableLists() attache desormais un
// listener 'keydown' sur la liste -- pattern WAI-ARIA APG "Listbox with
// rearrangeable options", meme structure de roving tabindex qu'initTreeView
// (#824) / initJsonViewer (#446). ↑/↓ deplacent le FOCUS (parcours),
// Home/End aux extremites, Ctrl+↑/↓ deplace l'OPTION elle-meme (combinaison
// DISTINCTE du simple parcours). aria-grabbed (deprecie ARIA 1.1) reste posE
// SUR LES CHEMINS DnD/pointer PRE-EXISTANTS ci-dessus, non touches (4
// assertions les pinnent deja, cf. describe "drag & drop souris" / "pointer
// events" plus haut -- les retirer aurait fait regresser cette suite sans la
// modifier, contradictoire avec la consigne de non-regression) ; LE CHEMIN
// CLAVIER, lui, n'utilise JAMAIS aria-grabbed -- il annonce exclusivement via
// une region live dediee (.sortable-live, meme pattern que .graph-live #672),
// couverte plus bas.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireDrag, fireKeydown } from './helpers/load-components.js';

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

// ─── Navigation clavier (#836) — pattern APG "Listbox with rearrangeable
// options". Roving tabindex sur les .sortable-item : ↑/↓ deplacent le FOCUS
// (parcours, meme structure qu'initTreeView #824), Home/End aux extremites.
// Ctrl+↑/↓ deplace l'OPTION elle-meme -- combinaison DISTINCTE du simple
// parcours (verifie explicitement plus bas : une fleche seule ne bouge rien).
describe('initSortableLists -- navigation clavier : parcours du focus (#836)', () => {
  it('roving tabindex initial : le 1er item a tabindex=0, tous les autres -1', () => {
    const { list } = setup();
    const all = items(list);
    expect(all[0].getAttribute('tabindex')).toBe('0');
    all.slice(1).forEach(li => expect(li.getAttribute('tabindex')).toBe('-1'));
  });

  it('ArrowDown deplace le FOCUS vers l item suivant sans changer l ordre', () => {
    const { window, list } = setup();
    const all = items(list);
    all[0].setAttribute('tabindex', '0');
    all[0].focus();
    fireKeydown(window, all[0], 'ArrowDown');
    expect(window.document.activeElement).toBe(all[1]);
    expect(all[1].getAttribute('tabindex')).toBe('0');
    expect(all[0].getAttribute('tabindex')).toBe('-1');
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']); // ordre inchange
  });

  it('ArrowUp deplace le focus vers l item precedent', () => {
    const { window, list } = setup();
    const all = items(list);
    all[2].setAttribute('tabindex', '0');
    all[2].focus();
    fireKeydown(window, all[2], 'ArrowUp');
    expect(window.document.activeElement).toBe(all[1]);
    expect(all[1].getAttribute('tabindex')).toBe('0');
    expect(all[2].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown sur le dernier item est un no-op (pas d erreur, focus inchange)', () => {
    const { window, list } = setup();
    const all = items(list);
    const last = all[all.length - 1];
    last.setAttribute('tabindex', '0');
    last.focus();
    fireKeydown(window, last, 'ArrowDown');
    expect(window.document.activeElement).toBe(last);
    expect(last.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp sur le premier item est un no-op', () => {
    const { window, list } = setup();
    const all = items(list);
    all[0].setAttribute('tabindex', '0');
    all[0].focus();
    fireKeydown(window, all[0], 'ArrowUp');
    expect(window.document.activeElement).toBe(all[0]);
  });

  it('Home deplace le focus au 1er item', () => {
    const { window, list } = setup();
    const all = items(list);
    all[2].setAttribute('tabindex', '0');
    all[2].focus();
    fireKeydown(window, all[2], 'Home');
    expect(window.document.activeElement).toBe(all[0]);
    expect(all[0].getAttribute('tabindex')).toBe('0');
  });

  it('End deplace le focus au dernier item', () => {
    const { window, list } = setup();
    const all = items(list);
    all[0].setAttribute('tabindex', '0');
    all[0].focus();
    fireKeydown(window, all[0], 'End');
    const last = items(list)[items(list).length - 1];
    expect(window.document.activeElement).toBe(last);
    expect(last.getAttribute('tabindex')).toBe('0');
  });

  it("touche non geree ('a') n affecte ni le focus ni l ordre", () => {
    const { window, list } = setup();
    const all = items(list);
    all[0].setAttribute('tabindex', '0');
    all[0].focus();
    fireKeydown(window, all[0], 'a');
    expect(window.document.activeElement).toBe(all[0]);
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('initSortableLists -- navigation clavier : Ctrl+fleche deplace l option (#836)', () => {
  it('Ctrl+ArrowDown deplace l item vers le bas (echange avec le suivant), garde le focus dessus', () => {
    const { window, list } = setup();
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown', { ctrlKey: true });
    expect(labels(list)).toEqual(['B', 'A', 'C', 'D']);
    expect(window.document.activeElement).toBe(a);
    expect(a.getAttribute('tabindex')).toBe('0');
  });

  it('Ctrl+ArrowUp deplace l item vers le haut (echange avec le precedent)', () => {
    const { window, list } = setup();
    const all = items(list);
    const c = all[2]; // "C"
    c.setAttribute('tabindex', '0');
    c.focus();
    fireKeydown(window, c, 'ArrowUp', { ctrlKey: true });
    expect(labels(list)).toEqual(['A', 'C', 'B', 'D']);
    expect(window.document.activeElement).toBe(c);
  });

  it('Ctrl+ArrowDown sur le dernier item est un no-op (deja en bout de liste)', () => {
    const { window, list } = setup();
    const all = items(list);
    const last = all[all.length - 1];
    last.setAttribute('tabindex', '0');
    last.focus();
    fireKeydown(window, last, 'ArrowDown', { ctrlKey: true });
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('Ctrl+ArrowUp sur le premier item est un no-op', () => {
    const { window, list } = setup();
    const all = items(list);
    all[0].setAttribute('tabindex', '0');
    all[0].focus();
    fireKeydown(window, all[0], 'ArrowUp', { ctrlKey: true });
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('un deplacement Ctrl+fleche renumerote une liste numerotee (meme logique que le DnD)', () => {
    const { window, list } = setup({ numbered: true });
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown', { ctrlKey: true });
    expect(labels(list)).toEqual(['B', 'A', 'C', 'D']);
    expect(nums(list)).toEqual(['1', '2', '3', '4']);
  });

  it('simple ArrowDown (sans Ctrl) ne deplace PAS l option -- combinaison distincte du parcours', () => {
    const { window, list } = setup();
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown'); // sans ctrlKey
    expect(labels(list)).toEqual(['A', 'B', 'C', 'D']); // ordre inchange, seul le focus bouge
  });
});

// ─── Region live (#836) — remplace aria-grabbed comme canal d'annonce
// FIABLE sur le chemin clavier (aria-grabbed est deprecie ARIA 1.1, cf. l'en
// -tete de ce fichier : conserve tel quel sur les chemins DnD/pointer
// existants pour la non-regression, mais jamais pose par le clavier).
describe('initSortableLists -- region live (#836)', () => {
  it('une region .sortable-live sr-only aria-live=polite est creee juste apres la liste', () => {
    const { list } = setup();
    const live = list.nextElementSibling;
    expect(live.classList.contains('sortable-live')).toBe(true);
    expect(live.classList.contains('sr-only')).toBe(true);
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toBe(''); // rien annonce avant un deplacement clavier
  });

  it('Ctrl+ArrowDown annonce le libelle + la nouvelle position sur la region live', () => {
    const { window, list } = setup();
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown', { ctrlKey: true });
    const live = list.nextElementSibling;
    expect(live.textContent).toBe('A déplacé en position 2 sur 4');
  });

  it('un simple parcours (ArrowDown sans Ctrl) n annonce RIEN sur la region live', () => {
    const { window, list } = setup();
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown');
    const live = list.nextElementSibling;
    expect(live.textContent).toBe('');
  });

  it('un deplacement clavier NE POSE PAS aria-grabbed (reserve au DnD/pointer, remplace par la region live ici)', () => {
    const { window, list } = setup();
    const [a] = items(list);
    a.setAttribute('tabindex', '0');
    a.focus();
    fireKeydown(window, a, 'ArrowDown', { ctrlKey: true });
    expect(a.getAttribute('aria-grabbed')).toBe('false');
  });
});
