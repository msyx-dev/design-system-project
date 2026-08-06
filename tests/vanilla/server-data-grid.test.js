// Tests -- initServerDataGrid (#744, vague 11/N couverture tests vanilla)
//
// Expose directement via window.__initServerDataGrid (shared/components.js:1366).
// Markup repris de pages/data.html#server-data-grid (classes/attrs reels) :
// .data-grid[data-server][data-page-size] dans .data-grid-wrap, avec footer
// .data-grid-server-info + nav.data-grid-pagination + .data-grid-live.
//
// "Server-driven" ici == mock local : fetchPage() ne fait AUCUN appel
// reseau, elle tranche un tableau interne fige (MOCK_SERVER_ROWS, 26 lignes,
// shared/components.js juste au-dessus d'initServerDataGrid) apres un
// setTimeout(600ms) fixe qui simule la latence. On teste donc le CONTRAT
// (etat de chargement, pagination, evenements, annonces a11y) sans jamais
// toucher a un vrai reseau -- rien a mocker cote fetch, juste le temps.
//
// Fake timers vitest (vi.useFakeTimers appele AVANT loadComponentsWindow,
// meme motif verifie que chips.test.js pour dom.window.setTimeout) pilotent
// ce setTimeout(600) de facon deterministe.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function gridHtml(pageSize) {
  return `
    <div class="data-grid-wrap" id="server-grid-wrap">
      <table class="data-grid" data-server data-page-size="${pageSize}" id="server-grid-demo">
        <thead>
          <tr>
            <th>Composant</th>
            <th>Categorie</th>
            <th>Statut</th>
            <th>Sprint</th>
            <th>SP</th>
          </tr>
        </thead>
        <tbody class="data-grid-body"></tbody>
      </table>
      <div class="data-grid-footer">
        <span class="pagination-info data-grid-server-info"></span>
        <nav class="pagination data-grid-pagination" role="navigation" aria-label="Pagination"></nav>
      </div>
      <span class="sr-only data-grid-live" aria-live="polite" aria-atomic="true"></span>
    </div>
  `;
}

function setup(pageSize = 8) {
  const dom = loadComponentsWindow(gridHtml(pageSize));
  const { window } = dom;
  const { document } = window;
  window.__initServerDataGrid();
  const wrap = document.getElementById('server-grid-wrap');
  const grid = document.getElementById('server-grid-demo');
  const tbody = grid.querySelector('.data-grid-body');
  const infoEl = wrap.querySelector('.data-grid-server-info');
  const pagerEl = wrap.querySelector('.data-grid-pagination');
  const liveEl = wrap.querySelector('.data-grid-live');
  return { window, document, wrap, grid, tbody, infoEl, pagerEl, liveEl };
}

function dataRows(tbody) {
  // Exclut les lignes squelette (aria-hidden pendant le chargement).
  return Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.hasAttribute('aria-hidden'));
}

function pagerLabels(pagerEl) {
  // .page-btn (numeros + precedent/suivant) ET .page-ellipsis ("…") --
  // les 2 seuls types d'enfants directs du <nav>, dans l'ordre du DOM.
  return Array.from(pagerEl.children).map(el => el.textContent);
}

describe('initServerDataGrid -- etat de chargement', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('pose aria-busy="true" et affiche un squelette de pageSize lignes des le montage, avant la reponse', () => {
    const { wrap, tbody } = setup(8);
    expect(wrap.getAttribute('aria-busy')).toBe('true');
    const skeletons = tbody.querySelectorAll('.skeleton-table-row');
    expect(skeletons.length).toBe(8);
    expect(dataRows(tbody).length).toBe(0);
  });

  it('apres la reponse (600ms), aria-busy repasse a "false" et les vraies lignes remplacent le squelette', () => {
    const { window, wrap, tbody } = setup(8);
    vi.advanceTimersByTime(600);
    expect(wrap.getAttribute('aria-busy')).toBe('false');
    expect(tbody.querySelectorAll('.skeleton-table-row').length).toBe(0);
    expect(dataRows(tbody).length).toBe(8);
  });

  it('avant 600ms ecoules, la reponse n a PAS encore ete appliquee (le mock est bien asynchrone)', () => {
    const { window, tbody } = setup(8);
    vi.advanceTimersByTime(599);
    expect(dataRows(tbody).length).toBe(0);
  });
});

describe('initServerDataGrid -- rendu des donnees', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('rend pageSize lignes sur une page pleine, avec le contenu attendu (1ere ligne = Button)', () => {
    const { tbody } = setup(8);
    vi.advanceTimersByTime(600);
    const rows = dataRows(tbody);
    expect(rows.length).toBe(8);
    expect(rows[0].children[0].textContent).toBe('Button');
  });

  it('la derniere page ne rend que le reliquat (26 lignes / pageSize=8 -> derniere page = 2 lignes)', () => {
    const { window, tbody, pagerEl } = setup(8);
    vi.advanceTimersByTime(600); // page 1 prete, pager rendu
    fireClick(window, pagerEl.querySelector('.page-btn[data-page="4"]'));
    vi.advanceTimersByTime(600);
    expect(dataRows(tbody).length).toBe(2); // 26 - 3*8 = 2
  });

  it('le compteur "A–B sur N" reflete la page courante', () => {
    const { infoEl } = setup(8);
    vi.advanceTimersByTime(600);
    expect(infoEl.textContent).toBe('1–8 sur 26');
  });

  it('la zone live annonce "Page X sur Y — resultats A a B sur N." apres la reponse', () => {
    const { liveEl } = setup(8);
    vi.advanceTimersByTime(600);
    expect(liveEl.textContent).toBe('Page 1 sur 4 — résultats 1 à 8 sur 26.');
  });
});

describe('initServerDataGrid -- pagination (clic)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('cliquer sur "Page suivante" charge la page 2 (repasse en squelette, puis rend les bonnes lignes)', () => {
    const { window, tbody, infoEl, pagerEl } = setup(8);
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]'));
    expect(tbody.querySelectorAll('.skeleton-table-row').length).toBe(8); // squelette immediat
    vi.advanceTimersByTime(600);
    expect(infoEl.textContent).toBe('9–16 sur 26');
  });

  it('le bouton "Page precedente" est disabled sur la 1ere page, actif ensuite', () => {
    // renderPager() reconstruit le <nav> via innerHTML a chaque page -- le
    // bouton "precedent" de la page 1 est un noeud DOM different de celui de
    // la page 2. On requete donc a nouveau APRES le re-render, pas une
    // reference capturee avant (qui resterait figee sur son etat d'origine).
    const { window, pagerEl } = setup(8);
    vi.advanceTimersByTime(600);
    expect(pagerEl.querySelector('.page-btn[aria-label="Page précédente"]').disabled).toBe(true);
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]'));
    vi.advanceTimersByTime(600);
    expect(pagerEl.querySelector('.page-btn[aria-label="Page précédente"]').disabled).toBe(false);
  });

  it('le bouton "Page suivante" est disabled sur la derniere page', () => {
    const { window, pagerEl } = setup(8);
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[data-page="4"]'));
    vi.advanceTimersByTime(600);
    expect(pagerEl.querySelector('.page-btn[aria-label="Page suivante"]').disabled).toBe(true);
  });

  it('la page active porte aria-current="page" et est elle-meme disabled (pas re-cliquable)', () => {
    const { pagerEl } = setup(8);
    vi.advanceTimersByTime(600);
    const active = pagerEl.querySelector('.page-btn.active');
    expect(active.getAttribute('data-page')).toBe('1');
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.disabled).toBe(true);
  });

  it('emet dg:page-change (detail page/pageSize/total) a chaque changement de page, y compris le montage initial', () => {
    const { window, grid, pagerEl } = setup(8);
    const events = [];
    grid.addEventListener('dg:page-change', e => events.push(e.detail));
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]'));
    vi.advanceTimersByTime(600);
    expect(events.length).toBe(1); // le montage initial a eu lieu AVANT l'ajout du listener -> seul le clic est capture
    expect(events[0]).toEqual({ page: 2, pageSize: 8, total: 26 });
  });

  it('un clic sur une page pendant le chargement (state.loading) est ignore -- pas de double requete concurrente', () => {
    const { window, infoEl, pagerEl } = setup(8);
    vi.advanceTimersByTime(600); // page 1 prete
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]')); // -> page 2, loading=true
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]')); // ignore : loading
    vi.advanceTimersByTime(600);
    expect(infoEl.textContent).toBe('9–16 sur 26'); // page 2 seulement, pas page 3
  });
});

describe('initServerDataGrid -- pagination (ellipsis, plus de 7 pages)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('totalPages > 7 et page courante en tete -> [1,2,3,4,5,...,total]', () => {
    const { pagerEl } = setup(3); // ceil(26/3) = 9 pages
    vi.advanceTimersByTime(600);
    const labels = pagerLabels(pagerEl);
    expect(labels).toEqual(['‹', '1', '2', '3', '4', '5', '…', '9', '›']);
  });

  it('page courante en fin -> [1,...,n-4,n-3,n-2,n-1,n]', () => {
    const { window, pagerEl } = setup(3);
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[data-page="9"]'));
    vi.advanceTimersByTime(600);
    const labels = pagerLabels(pagerEl);
    expect(labels).toEqual(['‹', '1', '…', '5', '6', '7', '8', '9', '›']);
  });

  it('page courante au milieu -> [1,...,p-1,p,p+1,...,n]', () => {
    const { window, pagerEl } = setup(3);
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[data-page="5"]'));
    vi.advanceTimersByTime(600);
    const labels = pagerLabels(pagerEl);
    expect(labels).toEqual(['‹', '1', '…', '4', '5', '6', '…', '9', '›']);
  });
});

describe('initServerDataGrid -- divers', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('reappeler initServerDataGrid() est idempotent (dataset.bound, ne relance pas le montage ni ne double le listener du pager)', () => {
    const { window, infoEl, pagerEl } = setup(8);
    vi.advanceTimersByTime(600);
    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]'));
    vi.advanceTimersByTime(600);
    expect(infoEl.textContent).toBe('9–16 sur 26'); // page 2

    window.__initServerDataGrid(); // 2e appel -- ne doit pas relancer goToPage(1)
    expect(infoEl.textContent).toBe('9–16 sur 26'); // toujours page 2, pas reinitialise

    fireClick(window, pagerEl.querySelector('.page-btn[aria-label="Page suivante"]'));
    vi.advanceTimersByTime(600);
    // Si le listener du pager etait pose 2 fois, 1 clic ferait avancer de 2 pages -> page 4.
    expect(infoEl.textContent).toBe('17–24 sur 26'); // page 3, pas page 4
  });
});
