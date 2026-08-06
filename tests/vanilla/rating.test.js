// Tests -- initRating (#744, vague 12/N couverture tests vanilla)
//
// Expose via window.__initRating (shared/components.js:1649). Markup repris
// de pages/composants.html#rating (classes/attrs reels) : .rating[data-value]
// > .rating-star (interactif) ou .rating.rating--readonly > .rating-star
// (lecture seule, aucun listener attache).
//
// Comportement clavier NON teste ici (#744 vague 12) : grep "ArrowLeft\|
// ArrowRight" autour de initRating() -- aucun keydown listener n'est attache
// aux .rating-star. role="radio"/aria-checked sont poses (a11y statique
// correcte pour un lecteur d'ecran au survol/clic souris), mais AUCUNE
// navigation clavier par fleches n'existe : ne pas inventer ce test.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function ratingHtml(id, value, extraClass = '', readonly = false) {
  const stars = Array.from({ length: 5 })
    .map(
      () =>
        `<span class="rating-star"${readonly ? '' : ' tabindex="0"'}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"></svg></span>`
    )
    .join('');
  return `
    <div class="rating ${extraClass}" data-value="${value}" id="${id}">
      ${stars}
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initRating();
  return { window, document };
}

function widget(document, id) {
  const root = document.getElementById(id);
  return { root, stars: Array.from(root.querySelectorAll('.rating-star')) };
}

describe('initRating -- etat initial', () => {
  it('data-value="0" : aucune etoile active, toutes aria-checked=false', () => {
    const { document } = setup(ratingHtml('ra', 0));
    const { root, stars } = widget(document, 'ra');
    expect(root.getAttribute('role')).toBe('radiogroup');
    stars.forEach(star => {
      expect(star.classList.contains('active')).toBe(false);
      expect(star.getAttribute('role')).toBe('radio');
      expect(star.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('data-value="3" : les 3 premieres etoiles actives, la 3e seule aria-checked=true', () => {
    const { document } = setup(ratingHtml('rb', 3));
    const { stars } = widget(document, 'rb');
    stars.forEach((star, i) => {
      const n = i + 1;
      expect(star.classList.contains('active')).toBe(n <= 3);
      expect(star.getAttribute('aria-checked')).toBe(n === 3 ? 'true' : 'false');
    });
  });

  it('chaque etoile recoit un aria-label "Note N sur 5"', () => {
    const { document } = setup(ratingHtml('rc', 0));
    const { stars } = widget(document, 'rc');
    stars.forEach((star, i) => {
      expect(star.getAttribute('aria-label')).toBe('Note ' + (i + 1) + ' sur 5');
    });
  });
});

describe('initRating -- clic (selection)', () => {
  it('cliquer sur la 4e etoile active les 4 premieres, synchronise aria-checked, et emet rating:change', () => {
    const { window, document } = setup(ratingHtml('rd', 0));
    const { root, stars } = widget(document, 'rd');

    let detail = null;
    root.addEventListener('rating:change', e => {
      detail = e.detail;
    });

    fireClick(window, stars[3]);

    stars.forEach((star, i) => {
      const n = i + 1;
      expect(star.classList.contains('active')).toBe(n <= 4);
      expect(star.getAttribute('aria-checked')).toBe(n === 4 ? 'true' : 'false');
    });
    expect(root.dataset.value).toBe('4');
    expect(detail).toEqual({ value: 4 });
  });

  it('re-cliquer sur une valeur inferieure diminue la note (pas de cumul)', () => {
    const { window, document } = setup(ratingHtml('re', 0));
    const { stars } = widget(document, 're');
    fireClick(window, stars[4]);
    fireClick(window, stars[1]);
    stars.forEach((star, i) => {
      expect(star.classList.contains('active')).toBe(i < 2);
    });
  });
});

describe('initRating -- survol (hover)', () => {
  it('mouseover previsualise en classe .hover sans toucher .active ni currentValue', () => {
    const { window, document } = setup(ratingHtml('rf', 2));
    const { root, stars } = widget(document, 'rf');

    stars[3].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));

    stars.forEach((star, i) => {
      const n = i + 1;
      expect(star.classList.contains('hover')).toBe(n <= 4);
      // La valeur active reelle (2) est neutralisee pendant le survol --
      // updateStars(hoverIdx) ne peuple QUE .hover, jamais .active, tant
      // qu'un survol est en cours.
      expect(star.classList.contains('active')).toBe(false);
    });
    expect(root.dataset.value).toBe('2');
  });

  it('mouseout restaure l affichage sur la valeur active reelle (2), efface le hover', () => {
    const { window, document } = setup(ratingHtml('rg', 2));
    const { stars } = widget(document, 'rg');

    stars[3].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    stars[3].dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }));

    stars.forEach((star, i) => {
      const n = i + 1;
      expect(star.classList.contains('hover')).toBe(false);
      expect(star.classList.contains('active')).toBe(n <= 2);
    });
  });
});

describe('initRating -- readonly (rating--readonly)', () => {
  it('aucun role/aria-checked/tabindex ajoute, et un clic ne change rien (pas de listener)', () => {
    const { window, document } = setup(ratingHtml('rh', 4, 'rating--readonly', true));
    const { root, stars } = widget(document, 'rh');

    expect(root.getAttribute('role')).not.toBe('radiogroup');
    stars.forEach(star => {
      expect(star.getAttribute('role')).not.toBe('radio');
      expect(star.hasAttribute('aria-checked')).toBe(false);
    });

    fireClick(window, stars[0]);
    // Etat inchange : la 1re etoile n'a pas ete "selectionnee" (pas de
    // listener de clic sur un widget readonly).
    expect(root.dataset.value).toBe('4');
  });
});

describe('initRating -- isolation multi-widget et idempotence', () => {
  it('deux widgets sur la meme page sont independants', () => {
    const { window, document } = setup(ratingHtml('ri', 1) + ratingHtml('rj', 0));
    const { stars: starsI } = widget(document, 'ri');
    const { stars: starsJ } = widget(document, 'rj');

    fireClick(window, starsI[4]);

    expect(starsI[4].classList.contains('active')).toBe(true);
    starsJ.forEach(star => expect(star.classList.contains('active')).toBe(false));
  });

  it("reappeler initRating() est idempotent (pas de double-bind, une note reste une note)", () => {
    const { window, document } = setup(ratingHtml('rk', 0));
    window.__initRating(); // 2e appel -- doit no-op (dataset.bound)
    const { root, stars } = widget(document, 'rk');

    let changeCount = 0;
    root.addEventListener('rating:change', () => {
      changeCount++;
    });

    fireClick(window, stars[2]);

    // Si le listener 'click' etait double-attache, l'evenement rating:change
    // serait emis 2x pour un seul clic utilisateur.
    expect(changeCount).toBe(1);
    expect(root.dataset.value).toBe('3');
  });
});
