// Tests -- initActivityFeed (#744, vague 18/18 -- DERNIERE vague couverture tests vanilla)
//
// Expose directement via window.__initActivityFeed (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#activity-feed) :
// .activity-feed > .activity-filters (.activity-filter-chip[data-filter]) +
// liste de .activity-item[data-type] (dont certains .initially-hidden) +
// .activity-load-more > .activity-load-more-btn.
//
// initActivityFeed() ne CONSTRUIT aucun DOM a partir de donnees -- il ne fait
// que (dis)basculer des classes (.active/.hidden/.initially-hidden) sur du
// markup DEJA rendu par le consumer. Verifie en lisant le code : aucune
// affectation .innerHTML/.textContent nulle part dans la fonction. La regle
// DS-PRINCIPLES #11 ("un contenu porteur de balisage doit rester du texte,
// jamais interprete") est donc verifiee par construction plutot que par
// echappement -- la suite "donnees" ci-dessous le PROUVE : un item dont le
// texte contient des caracteres de balisage traverse tous les changements de
// filtre avec un innerHTML BYTE-IDENTIQUE (aucun sink, aucune reecriture).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function feedHtml() {
  return `
    <div class="activity-feed">
      <div class="activity-filters">
        <button class="activity-filter-chip active" data-filter="all">Tous</button>
        <button class="activity-filter-chip" data-filter="create">Creations</button>
        <button class="activity-filter-chip" data-filter="deploy">Deploiements</button>
      </div>
      <div class="activity-item" data-type="deploy">
        <div class="activity-text"><strong>Mickael</strong> a déployé <span class="activity-target">design-system v2.17</span></div>
      </div>
      <div class="activity-item" data-type="create">
        <div class="activity-text"><strong>Claude</strong> a cree <span class="activity-target">&lt;script&gt;alert(1)&lt;/script&gt;</span></div>
      </div>
      <div class="activity-item" data-type="edit">
        <div class="activity-text">Modification anonyme</div>
      </div>
      <div class="activity-item initially-hidden" data-type="create">
        <div class="activity-text">Item masque #1</div>
      </div>
      <div class="activity-item initially-hidden" data-type="deploy">
        <div class="activity-text">Item masque #2</div>
      </div>
      <div class="activity-load-more">
        <button class="btn-secondary btn-sm activity-load-more-btn">Charger plus</button>
      </div>
    </div>
  `;
}

function setup(html = feedHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    feed: document.querySelector('.activity-feed'),
    chips: Array.from(document.querySelectorAll('.activity-filter-chip')),
    items: Array.from(document.querySelectorAll('.activity-item')),
    loadMoreBtn: document.querySelector('.activity-load-more-btn'),
    loadMoreWrap: document.querySelector('.activity-load-more'),
  };
}

function chip(chips, filter) {
  return chips.find((c) => c.dataset.filter === filter);
}

describe('initActivityFeed -- filtre par chip', () => {
  it('cliquer un chip pose .active dessus et le retire des autres', () => {
    const { window, chips } = setup();
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'create'));
    expect(chip(chips, 'create').classList.contains('active')).toBe(true);
    expect(chip(chips, 'all').classList.contains('active')).toBe(false);
    expect(chip(chips, 'deploy').classList.contains('active')).toBe(false);
  });

  it('filtre "create" masque (.hidden) tous les items dont data-type != create', () => {
    const { window, chips, items } = setup();
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'create'));
    items.forEach((item) => {
      expect(item.classList.contains('hidden')).toBe(item.dataset.type !== 'create');
    });
  });

  it('filtre "deploy" ne laisse visibles que les items data-type=deploy (y compris initially-hidden)', () => {
    const { window, chips, items } = setup();
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'deploy'));
    const visibles = items.filter((i) => !i.classList.contains('hidden'));
    expect(visibles.every((i) => i.dataset.type === 'deploy')).toBe(true);
    expect(visibles.length).toBe(items.filter((i) => i.dataset.type === 'deploy').length);
  });

  it('revenir sur "all" retire .hidden de tous les items', () => {
    const { window, chips, items } = setup();
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'create'));
    fireClick(window, chip(chips, 'all'));
    items.forEach((item) => expect(item.classList.contains('hidden')).toBe(false));
  });
});

describe('initActivityFeed -- Charger plus', () => {
  it('un clic revele les items .initially-hidden (classe retiree) et masque le bloc "Charger plus"', () => {
    const { window, document, loadMoreBtn, loadMoreWrap } = setup();
    window.__initActivityFeed();
    fireClick(window, loadMoreBtn);
    expect(document.querySelectorAll('.activity-item.initially-hidden').length).toBe(0);
    expect(loadMoreWrap.style.display).toBe('none');
  });

  it('sans .activity-load-more-btn dans le markup -- init ne plante pas', () => {
    const { window } = setup(`
      <div class="activity-feed">
        <div class="activity-item" data-type="create">Item</div>
      </div>
    `);
    expect(() => window.__initActivityFeed()).not.toThrow();
  });
});

describe('initActivityFeed -- donnees porteuses de balisage (DS-PRINCIPLES #11)', () => {
  it('un item dont le texte contient des caracteres de balisage traverse un cycle de filtrage avec un innerHTML BYTE-IDENTIQUE', () => {
    const { window, chips, items } = setup();
    const withMarkup = items.find((i) => i.textContent.includes('<script>'));
    const before = withMarkup.innerHTML;
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'deploy')); // masque cet item (data-type=create)
    fireClick(window, chip(chips, 'all')); // le reaffiche
    expect(withMarkup.innerHTML).toBe(before);
    expect(withMarkup.querySelector('script')).toBeNull();
    expect(withMarkup.textContent).toContain('<script>alert(1)</script>');
  });

  it('aucun nouvel element .activity-item n\'apparait apres un cycle complet de filtres (le composant ne re-rend rien)', () => {
    const { window, document, chips } = setup();
    window.__initActivityFeed();
    const countBefore = document.querySelectorAll('.activity-item').length;
    fireClick(window, chip(chips, 'create'));
    fireClick(window, chip(chips, 'deploy'));
    fireClick(window, chip(chips, 'all'));
    expect(document.querySelectorAll('.activity-item').length).toBe(countBefore);
  });
});

describe('initActivityFeed -- idempotence', () => {
  it('un second appel initActivityFeed() ne double-bind pas les chips (un clic ne bascule qu une fois)', () => {
    const { window, chips, items } = setup();
    window.__initActivityFeed();
    window.__initActivityFeed();
    fireClick(window, chip(chips, 'create'));
    // Si double-bound, le handler tournerait 2x -- toggle pair -> retour a
    // l'etat initial. Un seul bind => l'etat "create" est bien applique.
    expect(chip(chips, 'create').classList.contains('active')).toBe(true);
    items.forEach((item) => {
      expect(item.classList.contains('hidden')).toBe(item.dataset.type !== 'create');
    });
  });

  it('un second appel ne double-bind pas "Charger plus" (pas de crash sur un second clic post-reveal)', () => {
    const { window, document, loadMoreBtn } = setup();
    window.__initActivityFeed();
    window.__initActivityFeed();
    fireClick(window, loadMoreBtn);
    expect(document.querySelectorAll('.activity-item.initially-hidden').length).toBe(0);
    expect(() => fireClick(window, loadMoreBtn)).not.toThrow();
  });
});
