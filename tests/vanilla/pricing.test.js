// Tests -- initPricing (#744, vague 18/18 -- DERNIERE vague couverture tests vanilla)
//
// Expose directement via window.__initPricing (shared/components.js).
// Markup repris de la demo reelle (pages/templates.html#pricing) :
// .pricing-section > .pricing-toggle (2x .pricing-toggle-label[data-label]
// + .pricing-toggle-switch[role=switch]) + .pricing-grid > .pricing-card
// (dont un .pricing-card--recommended, purement CSS -- pas pilote par
// initPricing()) > .pricing-price-amount[data-price-monthly][data-price-
// yearly].
//
// updatePrices() est scopee a sw.closest('.pricing-section') (repli sur
// `document` si absent) -- verifie ci-dessous par un test d'isolation avec
// DEUX .pricing-section independantes sur la meme page.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function pricingHtml({ sectionExtra = '' } = {}) {
  return `
    <section class="pricing-section"${sectionExtra}>
      <div class="pricing-toggle">
        <span class="pricing-toggle-label active" data-label="monthly">Mensuel</span>
        <button class="pricing-toggle-switch" aria-label="Basculer facturation annuelle" role="switch" aria-checked="false"></button>
        <span class="pricing-toggle-label" data-label="yearly">Annuel</span>
      </div>
      <div class="pricing-grid">
        <div class="pricing-card">
          <span class="pricing-price-amount" data-price-monthly="0" data-price-yearly="0">0</span>
        </div>
        <div class="pricing-card pricing-card--recommended">
          <span class="pricing-price-amount" data-price-monthly="19" data-price-yearly="15">19</span>
        </div>
        <div class="pricing-card">
          <span class="pricing-price-amount" data-price-monthly="79" data-price-yearly="63">79</span>
        </div>
      </div>
    </section>
  `;
}

function setup(html = pricingHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    sw: document.querySelector('.pricing-toggle-switch'),
    labelMonthly: document.querySelector('[data-label="monthly"]'),
    labelYearly: document.querySelector('[data-label="yearly"]'),
    amounts: Array.from(document.querySelectorAll('.pricing-price-amount')),
  };
}

describe('initPricing -- etat initial', () => {
  it('role=switch et aria-checked="false" (mensuel par defaut)', () => {
    const { window, sw } = setup();
    window.__initPricing();
    expect(sw.getAttribute('role')).toBe('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.getAttribute('tabindex')).toBe('0');
  });

  it('le libelle "Mensuel" reste actif, "Annuel" ne l\'est pas', () => {
    const { window, labelMonthly, labelYearly } = setup();
    window.__initPricing();
    expect(labelMonthly.classList.contains('active')).toBe(true);
    expect(labelYearly.classList.contains('active')).toBe(false);
  });
});

describe('initPricing -- toggle au clic', () => {
  it('un clic bascule vers annuel : aria-checked=true, classe yearly, prix mis a jour', () => {
    const { window, sw, amounts } = setup();
    window.__initPricing();
    fireClick(window, sw);
    expect(sw.classList.contains('yearly')).toBe(true);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(amounts.map((a) => a.textContent)).toEqual(['0', '15', '63']);
  });

  it('un second clic revient au mensuel : prix et libelles restaures', () => {
    const { window, sw, amounts, labelMonthly, labelYearly } = setup();
    window.__initPricing();
    fireClick(window, sw);
    fireClick(window, sw);
    expect(sw.classList.contains('yearly')).toBe(false);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(amounts.map((a) => a.textContent)).toEqual(['0', '19', '79']);
    expect(labelMonthly.classList.contains('active')).toBe(true);
    expect(labelYearly.classList.contains('active')).toBe(false);
  });

  it('en mode annuel, le libelle "Annuel" devient actif et "Mensuel" ne l\'est plus', () => {
    const { window, sw, labelMonthly, labelYearly } = setup();
    window.__initPricing();
    fireClick(window, sw);
    expect(labelYearly.classList.contains('active')).toBe(true);
    expect(labelMonthly.classList.contains('active')).toBe(false);
  });
});

describe('initPricing -- toggle au clavier', () => {
  it('Espace bascule comme un clic', () => {
    const { window, sw, amounts } = setup();
    window.__initPricing();
    fireKeydown(window, sw, ' ');
    expect(sw.classList.contains('yearly')).toBe(true);
    expect(amounts.map((a) => a.textContent)).toEqual(['0', '15', '63']);
  });

  it('Entree bascule comme un clic', () => {
    const { window, sw } = setup();
    window.__initPricing();
    fireKeydown(window, sw, 'Enter');
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });

  it('une autre touche (ex. Tab) ne bascule rien', () => {
    const { window, sw } = setup();
    window.__initPricing();
    fireKeydown(window, sw, 'Tab');
    expect(sw.classList.contains('yearly')).toBe(false);
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });
});

describe('initPricing -- isolation multi-tableau', () => {
  it('deux .pricing-section independantes : basculer la 1re ne touche pas les prix de la 2e', () => {
    const html = `
      <section class="pricing-section" id="a">
        <div class="pricing-toggle">
          <span class="pricing-toggle-label active" data-label="monthly">Mensuel</span>
          <button class="pricing-toggle-switch" role="switch" aria-checked="false"></button>
          <span class="pricing-toggle-label" data-label="yearly">Annuel</span>
        </div>
        <span class="pricing-price-amount" data-price-monthly="10" data-price-yearly="8">10</span>
      </section>
      <section class="pricing-section" id="b">
        <div class="pricing-toggle">
          <span class="pricing-toggle-label active" data-label="monthly">Mensuel</span>
          <button class="pricing-toggle-switch" role="switch" aria-checked="false"></button>
          <span class="pricing-toggle-label" data-label="yearly">Annuel</span>
        </div>
        <span class="pricing-price-amount" data-price-monthly="99" data-price-yearly="80">99</span>
      </section>
    `;
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    const { document } = window;
    window.__initPricing();
    const swA = document.querySelector('#a .pricing-toggle-switch');
    fireClick(window, swA);
    expect(document.querySelector('#a .pricing-price-amount').textContent).toBe('8');
    expect(document.querySelector('#b .pricing-price-amount').textContent).toBe('99');
    expect(document.querySelector('#b .pricing-toggle-switch').classList.contains('yearly')).toBe(false);
  });
});

describe('initPricing -- idempotence', () => {
  it('un second appel initPricing() ne double-bind pas (un clic ne bascule qu une fois)', () => {
    const { window, sw, amounts } = setup();
    window.__initPricing();
    window.__initPricing();
    fireClick(window, sw);
    // Si double-bound, le handler tournerait 2x -- toggle pair -> retour a
    // l'etat mensuel initial. Un seul bind => l'etat annuel est bien applique.
    expect(sw.classList.contains('yearly')).toBe(true);
    expect(amounts.map((a) => a.textContent)).toEqual(['0', '15', '63']);
  });
});
