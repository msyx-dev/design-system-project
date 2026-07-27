// Tests -- initCalendar (#744, amorce infra tests vanilla)
//
// Composant choisi : machine range 2-clics + roving tabindex + classes d etat
// combinees (.range-start + .selected simultanement, cf. cadrage #744).
// Markup repris de pages/formulaires.html#calendrier (structure .cal-wrap
// reelle). Reference figee sur 2020-06 (juin 2020, 1er = lundi -> zero
// decalage 'other-month' en tete de grille) pour eviter toute dependance a
// la date reelle d'execution (le composant applique `.today` sur `new
// Date()` -- un mois recent aurait rendu le test non-deterministe).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, fireClick } from './helpers/load-components.js';

function singleWrapHtml() {
  return `
    <div class="cal-wrap" data-calendar="single" data-cal-ref="2020-06" data-target="#single-out">
      <div class="cal-header">
        <button type="button" class="cal-prev" aria-label="Mois precedent">&lt;</button>
        <h4></h4>
        <button type="button" class="cal-next" aria-label="Mois suivant">&gt;</button>
      </div>
      <div class="cal-grid" role="grid"></div>
    </div>
    <input id="single-out" type="text" />
  `;
}

function rangeWrapHtml() {
  return `
    <div class="cal-wrap" data-calendar="range" data-cal-ref="2020-06">
      <div class="cal-header">
        <button type="button" class="cal-prev" aria-label="Mois precedent">&lt;</button>
        <h4></h4>
        <button type="button" class="cal-next" aria-label="Mois suivant">&gt;</button>
      </div>
      <div class="cal-grid" role="grid"></div>
      <div class="date-range-display" data-cal-range-display><span data-range-start>&#8212;</span> &#8594; <span data-range-end>&#8212;</span></div>
    </div>
  `;
}

function daysCells(document) {
  return document.querySelector('.cal-grid');
}

describe('initCalendar -- mode single', () => {
  let window, document, grid, wrap;

  beforeEach(() => {
    const dom = loadComponentsWindow(singleWrapHtml());
    window = dom.window;
    document = window.document;
    window.__initCalendar();
    wrap = document.querySelector('.cal-wrap');
    grid = daysCells(document);
  });

  it('rend le mois de reference (data-cal-ref) dans le h4', () => {
    expect(wrap.querySelector('.cal-header h4').textContent).toBe('Juin 2020');
  });

  it('un clic sur un jour ajoute .selected + aria-selected et remplit le champ cible', () => {
    const day15 = grid.querySelector('[data-date="2020-06-15"]');
    expect(day15.classList.contains('selected')).toBe(false);

    fireClick(window, day15);

    const day15After = grid.querySelector('[data-date="2020-06-15"]');
    expect(day15After.classList.contains('selected')).toBe(true);
    expect(day15After.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('single-out').value).toBe('15/06/2020');
  });

  it('emet calendar:change avec le detail.date au clic', () => {
    const day15 = grid.querySelector('[data-date="2020-06-15"]');
    let received = null;
    wrap.addEventListener('calendar:change', (e) => { received = e.detail; });

    fireClick(window, day15);

    expect(received).not.toBeNull();
    expect(received.date.getDate()).toBe(15);
  });

  it('selectionner un nouveau jour retire .selected de l ancien (presence ET absence)', () => {
    fireClick(window, grid.querySelector('[data-date="2020-06-15"]'));
    fireClick(window, grid.querySelector('[data-date="2020-06-20"]'));

    const day15 = grid.querySelector('[data-date="2020-06-15"]');
    const day20 = grid.querySelector('[data-date="2020-06-20"]');
    expect(day15.classList.contains('selected')).toBe(false);
    expect(day20.classList.contains('selected')).toBe(true);
  });

  it('roving tabindex : ArrowRight deplace le tabindex=0 (absence sur l ancien, presence sur le nouveau)', () => {
    const day1 = grid.querySelector('[data-date="2020-06-01"]');
    expect(day1.getAttribute('tabindex')).toBe('0');

    fireKeydown(window, day1, 'ArrowRight');

    const day1After = grid.querySelector('[data-date="2020-06-01"]');
    const day2After = grid.querySelector('[data-date="2020-06-02"]');
    expect(day1After.getAttribute('tabindex')).toBe('-1');
    expect(day2After.getAttribute('tabindex')).toBe('0');
  });

  it('le bouton mois suivant change le h4 et re-rend la grille sur le nouveau mois', () => {
    wrap.querySelector('.cal-next').click();
    expect(wrap.querySelector('.cal-header h4').textContent).toBe('Juillet 2020');
    expect(daysCells(document).querySelector('[data-date="2020-07-01"]')).not.toBeNull();
  });
});

describe('initCalendar -- mode range (machine 2-clics)', () => {
  let window, document, grid, wrap;

  beforeEach(() => {
    const dom = loadComponentsWindow(rangeWrapHtml());
    window = dom.window;
    document = window.document;
    window.__initCalendar();
    wrap = document.querySelector('.cal-wrap');
    grid = daysCells(document);
  });

  it('1er clic pose .range-start ET .selected simultanement (pas seulement l un ou l autre)', () => {
    fireClick(window, grid.querySelector('[data-date="2020-06-10"]'));
    const day10 = grid.querySelector('[data-date="2020-06-10"]');
    expect(day10.classList.contains('range-start')).toBe(true);
    expect(day10.classList.contains('selected')).toBe(true);
    expect(day10.classList.contains('range-end')).toBe(false);
  });

  it('2e clic pose .range-end + .selected sur la borne finale et .range (sans .selected) sur les jours intermediaires', () => {
    fireClick(window, grid.querySelector('[data-date="2020-06-10"]'));
    fireClick(window, grid.querySelector('[data-date="2020-06-20"]'));

    const day10 = grid.querySelector('[data-date="2020-06-10"]');
    const day15 = grid.querySelector('[data-date="2020-06-15"]');
    const day20 = grid.querySelector('[data-date="2020-06-20"]');

    expect(day10.classList.contains('range-start')).toBe(true);
    expect(day10.classList.contains('selected')).toBe(true);

    expect(day15.classList.contains('range')).toBe(true);
    expect(day15.classList.contains('selected')).toBe(false);
    expect(day15.classList.contains('range-start')).toBe(false);
    expect(day15.classList.contains('range-end')).toBe(false);

    expect(day20.classList.contains('range-end')).toBe(true);
    expect(day20.classList.contains('selected')).toBe(true);

    expect(document.querySelector('[data-range-start]').textContent).toContain('10 juin');
    expect(document.querySelector('[data-range-end]').textContent).toContain('20 juin 2020');
  });

  it('un 3e clic avant le range-start courant reinitialise la selection (l ancien range est bien efface)', () => {
    fireClick(window, grid.querySelector('[data-date="2020-06-10"]'));
    fireClick(window, grid.querySelector('[data-date="2020-06-20"]'));
    fireClick(window, grid.querySelector('[data-date="2020-06-05"]'));

    const day5 = grid.querySelector('[data-date="2020-06-05"]');
    const day10 = grid.querySelector('[data-date="2020-06-10"]');
    const day20 = grid.querySelector('[data-date="2020-06-20"]');

    expect(day5.classList.contains('range-start')).toBe(true);
    expect(day5.classList.contains('selected')).toBe(true);
    // L ancien etat doit avoir disparu -- pas juste un nouvel etat ajoute par-dessus.
    expect(day10.classList.contains('range-start')).toBe(false);
    expect(day10.classList.contains('selected')).toBe(false);
    expect(day20.classList.contains('range-end')).toBe(false);
    expect(day20.classList.contains('selected')).toBe(false);
  });
});
