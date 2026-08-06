// Tests -- initDataGrids (#744, vague 9/N infra tests vanilla)
//
// Expose directement via window.__initDataGrids (shared/components.js:1123).
// Markup repris de pages/data.html#data-grid (classes/attrs reels). Les
// LIGNES ne viennent PAS du markup : le composant les genere depuis un
// tableau interne hardcode `DATA_GRID_ROWS` (12 entrees, cf.
// shared/components.js juste au-dessus d'initDataGrids) -- le fixture n'a
// donc besoin que du squelette (thead trie/filtre + tbody vide).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function gridHtml() {
  return `
    <div class="demo-box">
      <div class="data-grid-wrap">
        <table class="data-grid" id="data-grid-main">
          <thead>
            <tr class="data-grid-header-row">
              <th><input type="checkbox" class="data-grid-select-all" aria-label="Tout selectionner"></th>
              <th class="data-grid-sortable" data-col="0">Composant <span class="data-grid-sort-icon">&#8597;</span></th>
              <th class="data-grid-sortable" data-col="1">Categorie <span class="data-grid-sort-icon">&#8597;</span></th>
              <th class="data-grid-sortable" data-col="2">Statut <span class="data-grid-sort-icon">&#8597;</span></th>
              <th class="data-grid-sortable" data-col="3">Sprint <span class="data-grid-sort-icon">&#8597;</span></th>
              <th class="data-grid-sortable" data-col="4">SP <span class="data-grid-sort-icon">&#8597;</span></th>
              <th class="data-grid-sortable" data-col="5">JS <span class="data-grid-sort-icon">&#8597;</span></th>
            </tr>
            <tr class="data-grid-filter-row">
              <th></th>
              <th><input class="data-grid-filter" data-col="0" type="text" aria-label="Filtrer par composant"></th>
              <th><input class="data-grid-filter" data-col="1" type="text" aria-label="Filtrer par categorie"></th>
              <th><input class="data-grid-filter" data-col="2" type="text" aria-label="Filtrer par statut"></th>
              <th><input class="data-grid-filter" data-col="3" type="text" aria-label="Filtrer par sprint"></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody class="data-grid-body"></tbody>
        </table>
      </div>
      <div class="data-grid-footer">
        <span class="data-grid-count"></span>
        <span class="data-grid-selection"></span>
      </div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(gridHtml());
  const { window } = dom;
  const { document } = window;
  window.__initDataGrids();
  const grid = document.getElementById('data-grid-main');
  const tbody = grid.querySelector('.data-grid-body');
  const headers = grid.querySelectorAll('.data-grid-sortable');
  const countEl = document.querySelector('.data-grid-count');
  const selEl = document.querySelector('.data-grid-selection');
  const selectAll = grid.querySelector('.data-grid-select-all');
  return { window, document, grid, tbody, headers, countEl, selEl, selectAll };
}

function rowsText(tbody) {
  return Array.from(tbody.querySelectorAll('tr')).map(tr => tr.children[1].textContent.trim());
}

describe('initDataGrids -- rendu initial', () => {
  it('rend les 12 lignes internes (DATA_GRID_ROWS), non lues depuis le markup', () => {
    const { tbody } = setup();
    expect(tbody.querySelectorAll('tr').length).toBe(12);
  });

  it('pose role=columnheader et aria-sort="none" sur chaque en-tete triable des le chargement', () => {
    const { headers } = setup();
    headers.forEach(h => {
      expect(h.getAttribute('role')).toBe('columnheader');
      expect(h.getAttribute('aria-sort')).toBe('none');
    });
  });

  it('le compteur reflete "N / total lignes" des le premier rendu', () => {
    const { countEl } = setup();
    expect(countEl.textContent).toBe('12 / 12 lignes');
  });
});

describe('initDataGrids -- tri (aria-sort)', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  it('un clic bascule aria-sort none -> ascending avec une valeur ARIA VALIDE (pas "asc")', () => {
    const { window, headers } = ctx;
    fireClick(window, headers[0]); // colonne "Composant"
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
    // Valeurs enum valides WAI-ARIA pour aria-sort : ascending|descending|none|other.
    expect(headers[0].getAttribute('aria-sort')).not.toBe('asc');
  });

  it('un 2e clic bascule ascending -> descending (valeur ARIA valide, pas "desc")', () => {
    const { window, headers } = ctx;
    fireClick(window, headers[0]);
    fireClick(window, headers[0]);
    expect(headers[0].getAttribute('aria-sort')).toBe('descending');
    expect(headers[0].getAttribute('aria-sort')).not.toBe('desc');
  });

  it('un 3e clic revient a none', () => {
    const { window, headers } = ctx;
    fireClick(window, headers[0]);
    fireClick(window, headers[0]);
    fireClick(window, headers[0]);
    expect(headers[0].getAttribute('aria-sort')).toBe('none');
  });

  it('trier ascending trie reellement les lignes (pas juste un attribut cosmetique)', () => {
    const { window, tbody, headers } = ctx;
    fireClick(window, headers[0]); // Composant ascending
    const names = rowsText(tbody);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'fr'));
    expect(names).toEqual(sorted);
  });

  it('trier descending inverse reellement l ordre', () => {
    const { window, tbody, headers } = ctx;
    fireClick(window, headers[0]);
    fireClick(window, headers[0]); // descending
    const names = rowsText(tbody);
    const sortedDesc = [...names].sort((a, b) => b.localeCompare(a, 'fr'));
    expect(names).toEqual(sortedDesc);
  });

  it('revenir a none restaure l ordre original (celui de DATA_GRID_ROWS)', () => {
    const { window, tbody, headers } = ctx;
    const original = rowsText(tbody);
    fireClick(window, headers[0]);
    fireClick(window, headers[0]);
    fireClick(window, headers[0]); // none
    expect(rowsText(tbody)).toEqual(original);
  });

  it('trier une colonne reinitialise aria-sort des AUTRES colonnes a none (un seul tri actif)', () => {
    const { window, headers } = ctx;
    fireClick(window, headers[0]);
    fireClick(window, headers[1]);
    expect(headers[0].getAttribute('aria-sort')).toBe('none');
    expect(headers[1].getAttribute('aria-sort')).toBe('ascending');
  });

  it('l icone de tri suit ascending (fleche haut) / descending (fleche bas) / none (fleche double)', () => {
    const { window, headers } = ctx;
    const icon = headers[0].querySelector('.data-grid-sort-icon');
    fireClick(window, headers[0]);
    expect(icon.textContent).toBe('↑');
    fireClick(window, headers[0]);
    expect(icon.textContent).toBe('↓');
    fireClick(window, headers[0]);
    expect(icon.textContent).toBe('↕');
  });
});

describe('initDataGrids -- filtre', () => {
  function fireInput(win, el, value) {
    el.value = value;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  }

  it('filtrer par categorie (colonne 1) ne garde que les lignes correspondantes, insensible a la casse', () => {
    const { window, grid, tbody } = setup();
    const input = grid.querySelector('.data-grid-filter[data-col="1"]');
    fireInput(window, input, 'FEEDBACK');
    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(2); // Modal + Toast (categorie "Feedback")
    rowsText(tbody).forEach(n => expect(['Modal', 'Toast']).toContain(n));
  });

  it('vider le filtre restaure les 12 lignes', () => {
    const { window, grid, tbody } = setup();
    const input = grid.querySelector('.data-grid-filter[data-col="1"]');
    fireInput(window, input, 'Feedback');
    fireInput(window, input, '');
    expect(tbody.querySelectorAll('tr').length).toBe(12);
  });

  it('le compteur de lignes suit le resultat filtre (N / 12, pas 12 / 12)', () => {
    const { window, grid, countEl } = setup();
    const input = grid.querySelector('.data-grid-filter[data-col="1"]');
    fireInput(window, input, 'Feedback');
    expect(countEl.textContent).toBe('2 / 12 lignes');
  });
});

describe('initDataGrids -- selection', () => {
  it('cocher une checkbox de ligne ajoute .selected et met a jour le footer', () => {
    const { window, tbody, selEl } = setup();
    const cb = tbody.querySelector('tr input[type="checkbox"]');
    cb.checked = true;
    cb.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(cb.closest('tr').classList.contains('selected')).toBe(true);
    expect(selEl.textContent).toBe('1 selectionnee');
    expect(selEl.style.display).toBe('');
  });

  it('aucune ligne selectionnee : la zone de selection est masquee et vide', () => {
    const { selEl } = setup();
    expect(selEl.style.display).toBe('none');
    expect(selEl.textContent).toBe('');
  });

  it('select-all coche toutes les lignes et les marque .selected', () => {
    const { window, tbody, selectAll } = setup();
    selectAll.checked = true;
    selectAll.dispatchEvent(new window.Event('change', { bubbles: true }));
    const cbs = tbody.querySelectorAll('input[type="checkbox"]');
    cbs.forEach(cb => expect(cb.checked).toBe(true));
    expect(tbody.querySelectorAll('tr.selected').length).toBe(12);
  });

  it('select-all passe en indeterminate quand seules certaines lignes sont cochees', () => {
    const { window, tbody, selectAll } = setup();
    const first = tbody.querySelector('tr input[type="checkbox"]');
    first.checked = true;
    first.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
  });

  it('decocher toutes les lignes une a une sort de l etat indeterminate', () => {
    const { window, tbody, selectAll } = setup();
    const cbs = Array.from(tbody.querySelectorAll('tr input[type="checkbox"]'));
    cbs.forEach(cb => {
      cb.checked = true;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    cbs.forEach(cb => {
      cb.checked = false;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(false);
  });
});

describe('initDataGrids -- opt-out data-bound (demos statiques)', () => {
  // Protege le mecanisme dont depend pages/data.html pour ses demos
  // decoratives (ex. "Colonne actions sticky end", "Etat initial trie") :
  // un `.data-grid` deja marque data-bound="1" ne doit JAMAIS etre reinitialise
  // par initDataGrids(), donc son contenu statique reste intact. Bug reel
  // trouve #744 vague 9 : la demo "sticky end" de pages/data.html n'avait PAS
  // cet attribut -> ses 5 lignes curatees etaient remplacees par les 12
  // lignes internes de DATA_GRID_ROWS des le chargement de la page (verifie
  // en chargeant le vrai pages/data.html + shared/components.js dans jsdom).
  // Corrige par l'ajout de data-bound="1" sur ce <table> (pages/data.html).
  it('un data-grid deja data-bound="1" garde son contenu statique intact', () => {
    const html = `
      <table class="data-grid" data-bound="1">
        <thead><tr><th>Nom</th><th>Valeur</th></tr></thead>
        <tbody class="data-grid-body">
          <tr><td>Statique A</td><td>1</td></tr>
          <tr><td>Statique B</td><td>2</td></tr>
        </tbody>
      </table>
      ${gridHtml()}
    `;
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    const { document } = window;
    window.__initDataGrids();
    const staticGrid = document.querySelector('.data-grid[data-bound="1"]:not(#data-grid-main)');
    const rows = staticGrid.querySelectorAll('.data-grid-body tr');
    expect(rows.length).toBe(2);
    expect(rows[0].children[0].textContent).toBe('Statique A');
    // Le grid dynamique voisin, lui, est bien pris en charge (12 lignes).
    const dynamicGrid = document.getElementById('data-grid-main');
    expect(dynamicGrid.querySelectorAll('.data-grid-body tr').length).toBe(12);
  });
});

describe('initDataGrids -- divers', () => {
  it('reappeler initDataGrids() est idempotent (dataset.bound, pas de double listener de tri)', () => {
    const { window, headers } = setup();
    window.__initDataGrids(); // 2e appel -- doit no-op sur ce grid deja bound
    fireClick(window, headers[0]);
    // Si le listener etait pose 2 fois, 1 clic ferait 2 cycles -> "descending" au lieu de "ascending".
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
  });
});
