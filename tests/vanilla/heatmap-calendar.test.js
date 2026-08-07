// Tests -- initHeatmapCalendar (#744, vague 17/N couverture tests vanilla)
//
// Expose directement via window.__initHeatmapCalendar (shared/components.js).
// Markup repris de pages/data.html#heatmap-calendar : .heatmap-cal (vide, se
// remplit lui-meme) porteur soit d'enfants inline [data-date][data-value]
// (retires apres collecte), soit d'un attribut data-cells="[{date,value}]"
// JSON. Le composant construit sa propre grille (.heatmap-grid > .heatmap-cell)
// + legende + tooltip, cable hover/focus + navigation clavier par fleches.
//
// Defaut trouve + corrige a la volee (#744 vague 17) : MONTH_LABELS
// contenait des entites HTML brutes ("F&eacute;vrier") -- voir commentaire
// au-dessus de la declaration dans shared/components.js pour le detail des
// deux chemins de consommation casses (aria-label via setAttribute, tooltip
// via escapeAttr+innerHTML qui double-echappe le '&'). Corrige en UTF-8 direct.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireKeydown } from './helpers/load-components.js';

function inlineCellsHtml(entries) {
  const items = entries.map((e) => `<div data-date="${e.date}" data-value="${e.value}"></div>`).join('');
  return `<div class="heatmap-cal">${items}</div>`;
}

function setup(bodyHtml) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  window.__initHeatmapCalendar();
  return { window, document };
}

describe('initHeatmapCalendar -- a11y : libelles de mois accentues (defaut corrige #744 vague 17)', () => {
  it("l'aria-label d'une cellule en fevrier affiche le vrai caractere accentue, jamais une entite HTML brute", () => {
    const { document } = setup(inlineCellsHtml([{ date: '2026-02-05', value: 3 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-02-05"]');
    expect(cell.getAttribute('aria-label')).toBe('5 Février 2026 : 3');
    expect(cell.getAttribute('aria-label')).not.toContain('&eacute;');
  });

  it("le tooltip (survol) affiche aussi le caractere accentue reel, pas de sequence '&eacute;' litterale", () => {
    const { window, document } = setup(inlineCellsHtml([{ date: '2026-08-15', value: 5 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-08-15"]');
    cell.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    const title = document.querySelector('.heatmap-tooltip-title');
    expect(title.textContent).toBe('15 Août 2026');
    expect(title.textContent).not.toContain('&ucirc;');
  });

  it("decembre : aria-label correctement accentue", () => {
    const { document } = setup(inlineCellsHtml([{ date: '2026-12-01', value: 1 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-12-01"]');
    expect(cell.getAttribute('aria-label')).toBe('1 Décembre 2026 : 1');
  });
});

describe('initHeatmapCalendar -- grille et niveaux', () => {
  it('une cellule par jour entre firstDate et lastDate (inclus), alignee sur le lundi de la semaine', () => {
    // 2026-08-03 (lundi) -> 2026-08-05 : 3 jours de donnees, grille commence
    // deja sur le lundi -> pas de jour "avant" a masquer.
    const { document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 1 },
      { date: '2026-08-04', value: 2 },
      { date: '2026-08-05', value: 3 },
    ]));
    const valid = document.querySelectorAll('.heatmap-cell[data-date]:not([aria-hidden])');
    expect(valid.length).toBe(3);
  });

  it('data-level derive par paliers de 25% du max (0/1/2/3/4)', () => {
    const { document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 0 },
      { date: '2026-08-04', value: 25 },
      { date: '2026-08-05', value: 50 },
      { date: '2026-08-06', value: 75 },
      { date: '2026-08-07', value: 100 },
    ]));
    const get = (d) => document.querySelector(`.heatmap-cell[data-date="${d}"]`).getAttribute('data-level');
    expect(get('2026-08-03')).toBe('0');
    expect(get('2026-08-04')).toBe('1');
    expect(get('2026-08-05')).toBe('2');
    expect(get('2026-08-06')).toBe('3');
    expect(get('2026-08-07')).toBe('4');
  });

  it('les cellules hors [firstDate, lastDate] (padding de grille) portent aria-hidden + tabindex=-1, pas de role', () => {
    // 2026-08-05 est un mercredi -> gridStart recule au lundi 2026-08-03 :
    // lundi/mardi sont du padding, sans donnee.
    const { document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 10 }]));
    const padded = document.querySelector('.heatmap-cell[data-date="2026-08-03"]');
    expect(padded.getAttribute('aria-hidden')).toBe('true');
    expect(padded.tabIndex).toBe(-1);
    expect(padded.hasAttribute('role')).toBe(false);
  });

  it('chaque cellule valide porte role="img"', () => {
    const { document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 10 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-08-05"]');
    expect(cell.getAttribute('role')).toBe('img');
  });

  it('roving tabindex : la derniere cellule valide (lastDate) recoit tabindex=0, les autres -1', () => {
    const { document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 1 },
      { date: '2026-08-04', value: 2 },
      { date: '2026-08-05', value: 3 },
    ]));
    expect(document.querySelector('.heatmap-cell[data-date="2026-08-05"]').tabIndex).toBe(0);
    expect(document.querySelector('.heatmap-cell[data-date="2026-08-03"]').tabIndex).toBe(-1);
    expect(document.querySelector('.heatmap-cell[data-date="2026-08-04"]').tabIndex).toBe(-1);
  });

  it('.heatmap-grid porte role="group" + aria-label', () => {
    const { document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 1 }]));
    const grid = document.querySelector('.heatmap-grid');
    expect(grid.getAttribute('role')).toBe('group');
    expect(grid.getAttribute('aria-label')).toBe('Calendrier heatmap');
  });

  it('evenement heatmap:ready emis avec count et max corrects', () => {
    const dom = loadComponentsWindow(inlineCellsHtml([
      { date: '2026-08-03', value: 5 },
      { date: '2026-08-04', value: 40 },
    ]));
    let detail = null;
    dom.window.document.querySelector('.heatmap-cal').addEventListener('heatmap:ready', (e) => { detail = e.detail; });
    dom.window.__initHeatmapCalendar();
    expect(detail).toEqual({ count: 2, max: 40 });
  });

  it('data-cells (JSON) utilise comme source quand aucun enfant inline [data-date][data-value] present', () => {
    const dom = loadComponentsWindow('<div class="heatmap-cal" data-cells=\'[{"date":"2026-08-05","value":7}]\'></div>');
    dom.window.__initHeatmapCalendar();
    const cell = dom.window.document.querySelector('.heatmap-cell[data-date="2026-08-05"]');
    expect(cell.dataset.value).toBe('7');
  });

  it('data-cells invalide (JSON casse) : aucun crash, grille vide (aucun .heatmap-cell)', () => {
    const dom = loadComponentsWindow('<div class="heatmap-cal" data-cells="{pas du json"></div>');
    expect(() => dom.window.__initHeatmapCalendar()).not.toThrow();
    expect(dom.window.document.querySelectorAll('.heatmap-cell').length).toBe(0);
  });
});

describe('initHeatmapCalendar -- tooltip hover/focus', () => {
  it('mouseenter affiche le tooltip (classe visible) avec titre + valeur', () => {
    const { window, document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 12 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-08-05"]');
    cell.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    const tooltip = document.querySelector('.heatmap-tooltip');
    expect(tooltip.classList.contains('visible')).toBe(true);
    expect(tooltip.querySelector('.heatmap-tooltip-value').textContent).toBe('12');
  });

  it('mouseleave masque le tooltip', () => {
    const { window, document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 12 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-08-05"]');
    cell.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    cell.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
    expect(document.querySelector('.heatmap-tooltip').classList.contains('visible')).toBe(false);
  });

  it('focus affiche le tooltip (parite clavier), blur le masque', () => {
    const { window, document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 9 }]));
    const cell = document.querySelector('.heatmap-cell[data-date="2026-08-05"]');
    cell.dispatchEvent(new window.FocusEvent('focus', { bubbles: true }));
    expect(document.querySelector('.heatmap-tooltip').classList.contains('visible')).toBe(true);
    cell.dispatchEvent(new window.FocusEvent('blur', { bubbles: true }));
    expect(document.querySelector('.heatmap-tooltip').classList.contains('visible')).toBe(false);
  });
});

describe('initHeatmapCalendar -- navigation clavier (roving tabindex, fleches)', () => {
  it('ArrowRight deplace le focus + tabindex vers le jour suivant', () => {
    const { window, document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 1 },
      { date: '2026-08-04', value: 2 },
    ]));
    const grid = document.querySelector('.heatmap-grid');
    const day3 = document.querySelector('.heatmap-cell[data-date="2026-08-03"]');
    const day4 = document.querySelector('.heatmap-cell[data-date="2026-08-04"]');
    day3.tabIndex = 0;
    day4.tabIndex = -1;
    fireKeydown(window, grid, 'ArrowRight');
    expect(day3.tabIndex).toBe(-1);
    expect(day4.tabIndex).toBe(0);
    expect(document.activeElement).toBe(day4);
  });

  it('ArrowLeft au-dela de firstDate (hors grille valide) est un no-op sans crash', () => {
    const { window, document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 1 },
      { date: '2026-08-04', value: 2 },
    ]));
    const grid = document.querySelector('.heatmap-grid');
    const day3 = document.querySelector('.heatmap-cell[data-date="2026-08-03"]');
    day3.tabIndex = 0;
    expect(() => fireKeydown(window, grid, 'ArrowLeft')).not.toThrow();
    expect(day3.tabIndex).toBe(0); // rien n'a bouge, la cible n'existe pas
  });

  it('Home ramene au firstDate, End au lastDate', () => {
    const { window, document } = setup(inlineCellsHtml([
      { date: '2026-08-03', value: 1 },
      { date: '2026-08-04', value: 2 },
      { date: '2026-08-05', value: 3 },
    ]));
    const grid = document.querySelector('.heatmap-grid');
    const day4 = document.querySelector('.heatmap-cell[data-date="2026-08-04"]');
    day4.tabIndex = 0;
    fireKeydown(window, grid, 'Home');
    expect(document.querySelector('.heatmap-cell[data-date="2026-08-03"]').tabIndex).toBe(0);
    fireKeydown(window, grid, 'End');
    expect(document.querySelector('.heatmap-cell[data-date="2026-08-05"]').tabIndex).toBe(0);
  });
});

describe('initHeatmapCalendar -- idempotence', () => {
  it("un second appel n'est pas re-traite (data-bound pose, selecteur :not([data-bound]))", () => {
    const { window, document } = setup(inlineCellsHtml([{ date: '2026-08-05', value: 1 }]));
    window.__initHeatmapCalendar();
    expect(document.querySelectorAll('.heatmap-cal-scroll').length).toBe(1);
  });
});
