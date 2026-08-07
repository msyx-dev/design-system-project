// Tests -- initRating (#744, vague 12/N couverture tests vanilla)
//
// Expose via window.__initRating (shared/components.js:1649). Markup repris
// de pages/composants.html#rating (classes/attrs reels) : .rating[data-value]
// > .rating-star (interactif) ou .rating.rating--readonly > .rating-star
// (lecture seule, aucun listener attache).
//
// Navigation clavier (#836) : initRating() attache desormais un listener
// 'keydown' sur le widget (jamais en lecture seule) -- pattern WAI-ARIA APG
// Radio Group, meme structure de roving tabindex + "selection follows
// focus" qu'initSegmentedControls() (#613, decision ARIA deja actee pour ce
// pattern dans le DS). ←/→ et ↑/↓ deplacent la selection ET la valeur,
// Home/End aux extremites. Couvert plus bas.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

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

// ─── Navigation clavier (#836) — pattern WAI-ARIA APG Radio Group, meme
// structure ("selection follows focus", roving tabindex, wrap aux extremites
// des fleches, Home/End) qu'initSegmentedControls() (#613).
describe('initRating -- navigation clavier : pattern APG Radio Group (#836)', () => {
  it('roving tabindex initial : l etoile a tabindex=0 correspond a la valeur courante (data-value=3 -> 3e etoile)', () => {
    const { document } = setup(ratingHtml('rl', 3));
    const { stars } = widget(document, 'rl');
    stars.forEach((star, i) => {
      expect(star.getAttribute('tabindex')).toBe(i === 2 ? '0' : '-1');
    });
  });

  it('roving tabindex initial : data-value=0 -> la 1re etoile a tabindex=0 (repli)', () => {
    const { document } = setup(ratingHtml('rm', 0));
    const { stars } = widget(document, 'rm');
    stars.forEach((star, i) => {
      expect(star.getAttribute('tabindex')).toBe(i === 0 ? '0' : '-1');
    });
  });

  it('ArrowRight deplace LA SELECTION (et la valeur) vers l etoile suivante, le focus suit', () => {
    const { window, document } = setup(ratingHtml('rn', 2));
    const { root, stars } = widget(document, 'rn');
    stars[1].setAttribute('tabindex', '0');
    stars[1].focus();
    fireKeydown(window, stars[1], 'ArrowRight');
    expect(root.dataset.value).toBe('3');
    expect(window.document.activeElement).toBe(stars[2]);
    expect(stars[2].getAttribute('aria-checked')).toBe('true');
    expect(stars[2].getAttribute('tabindex')).toBe('0');
    expect(stars[1].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown se comporte comme ArrowRight (meme convention qu initSegmentedControls)', () => {
    const { window, document } = setup(ratingHtml('ro', 2));
    const { root, stars } = widget(document, 'ro');
    stars[1].setAttribute('tabindex', '0');
    stars[1].focus();
    fireKeydown(window, stars[1], 'ArrowDown');
    expect(root.dataset.value).toBe('3');
  });

  it('ArrowLeft deplace la selection vers l etoile precedente', () => {
    const { window, document } = setup(ratingHtml('rp', 3));
    const { root, stars } = widget(document, 'rp');
    stars[2].setAttribute('tabindex', '0');
    stars[2].focus();
    fireKeydown(window, stars[2], 'ArrowLeft');
    expect(root.dataset.value).toBe('2');
    expect(window.document.activeElement).toBe(stars[1]);
  });

  it('ArrowUp se comporte comme ArrowLeft', () => {
    const { window, document } = setup(ratingHtml('rq', 3));
    const { root, stars } = widget(document, 'rq');
    stars[2].setAttribute('tabindex', '0');
    stars[2].focus();
    fireKeydown(window, stars[2], 'ArrowUp');
    expect(root.dataset.value).toBe('2');
  });

  it('ArrowRight sur la derniere etoile boucle vers la 1re (wrap, meme convention que le segmented control)', () => {
    const { window, document } = setup(ratingHtml('rr', 5));
    const { root, stars } = widget(document, 'rr');
    stars[4].setAttribute('tabindex', '0');
    stars[4].focus();
    fireKeydown(window, stars[4], 'ArrowRight');
    expect(root.dataset.value).toBe('1');
    expect(window.document.activeElement).toBe(stars[0]);
  });

  it('ArrowLeft sur la 1re etoile boucle vers la derniere', () => {
    const { window, document } = setup(ratingHtml('rs', 1));
    const { root, stars } = widget(document, 'rs');
    stars[0].setAttribute('tabindex', '0');
    stars[0].focus();
    fireKeydown(window, stars[0], 'ArrowLeft');
    expect(root.dataset.value).toBe('5');
    expect(window.document.activeElement).toBe(stars[4]);
  });

  it('Home selectionne la 1re etoile', () => {
    const { window, document } = setup(ratingHtml('rt', 4));
    const { root, stars } = widget(document, 'rt');
    stars[3].setAttribute('tabindex', '0');
    stars[3].focus();
    fireKeydown(window, stars[3], 'Home');
    expect(root.dataset.value).toBe('1');
    expect(window.document.activeElement).toBe(stars[0]);
  });

  it('End selectionne la derniere etoile', () => {
    const { window, document } = setup(ratingHtml('ru', 1));
    const { root, stars } = widget(document, 'ru');
    stars[0].setAttribute('tabindex', '0');
    stars[0].focus();
    fireKeydown(window, stars[0], 'End');
    expect(root.dataset.value).toBe('5');
    expect(window.document.activeElement).toBe(stars[4]);
  });

  it('un deplacement clavier emet rating:change avec la nouvelle valeur', () => {
    const { window, document } = setup(ratingHtml('rv', 1));
    const { root, stars } = widget(document, 'rv');
    let detail = null;
    root.addEventListener('rating:change', e => { detail = e.detail; });
    stars[0].setAttribute('tabindex', '0');
    stars[0].focus();
    fireKeydown(window, stars[0], 'ArrowRight');
    expect(detail).toEqual({ value: 2 });
  });

  it("touche non geree ('a') n affecte ni la selection ni le focus", () => {
    const { window, document } = setup(ratingHtml('rw', 2));
    const { root, stars } = widget(document, 'rw');
    stars[1].setAttribute('tabindex', '0');
    stars[1].focus();
    fireKeydown(window, stars[1], 'a');
    expect(root.dataset.value).toBe('2');
    expect(window.document.activeElement).toBe(stars[1]);
  });
});

describe('initRating -- readonly : le clavier est totalement ignore (#836)', () => {
  it('aucun listener keydown n est attache sur un widget readonly (aucune erreur, valeur inchangee)', () => {
    const { window, document } = setup(ratingHtml('rx', 4, 'rating--readonly', true));
    const { root, stars } = widget(document, 'rx');
    expect(() => fireKeydown(window, stars[0], 'ArrowRight')).not.toThrow();
    expect(root.dataset.value).toBe('4');
  });
});
