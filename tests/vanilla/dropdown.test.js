// Tests -- Dropdown vanilla, entree de creation (#855)
//
// Le dropdown vanilla n'a pas de fonction initDropdowns() dediee : le bloc est
// inline dans initComponents() (meme cas que Tabs), donc on passe par
// window.__initComponents().
//
// #855 -- motif combobox creatif : quand la recherche ne donne rien,
// l'utilisateur doit pouvoir creer la valeur saisie. L'entree de creation est
// une ACTION, pas une option du referentiel -- trois consequences que ces tests
// verrouillent :
//   1. elle echappe au filtre par texte (son libelle CONTIENT la requete, donc
//      un filtre naif la garderait toujours visible, y compris quand d'autres
//      options matchent) ;
//   2. elle n'entre pas dans la selection (jamais .selected, n'ecrit pas dans
//      .dropdown-value) ;
//   3. elle emet `dropdown:create` avec la requete -- c'est au consumer
//      d'ajouter l'option et de la selectionner.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

// Markup repris de pages/formulaires.html#dropdown (classes reelles).
function dropdownHtml() {
  return `
    <div class="dropdown">
      <button class="dropdown-trigger">
        <span class="dropdown-value">Choisir un acteur</span>
        <span class="arrow">&#9662;</span>
      </button>
      <div class="dropdown-menu">
        <div class="dropdown-search"><input type="text" placeholder="Filtrer..."></div>
        <div class="dropdown-option">Camille Berger</div>
        <div class="dropdown-option">Dominique Lefevre</div>
        <div class="dropdown-option dropdown-create" style="display:none">
          <span class="check"></span>
          Ajouter «&nbsp;<span class="dropdown-create-query"></span>&nbsp;»
        </div>
      </div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(dropdownHtml());
  const { window } = dom;
  const { document } = window;
  window.__initComponents();
  const dd = document.querySelector('.dropdown');
  const input = dd.querySelector('.dropdown-search input');
  const create = dd.querySelector('.dropdown-create');
  const options = Array.from(dd.querySelectorAll('.dropdown-option:not(.dropdown-create)'));
  const type = (value) => {
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  return { window, document, dd, input, create, options, type };
}

describe('Dropdown vanilla -- entree de creation (#855)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("reste masquee tant que la recherche retourne au moins une option", () => {
    ctx.type('Camille');
    expect(ctx.create.style.display).toBe('none');
    expect(ctx.options[0].style.display).toBe('');
  });

  it("apparait quand la recherche ne retourne AUCUNE option", () => {
    ctx.type('Alexandre');
    expect(ctx.create.style.display).toBe('');
    ctx.options.forEach((o) => expect(o.style.display).toBe('none'));
  });

  it("reste masquee sur une requete vide -- il n'y a rien a creer", () => {
    ctx.type('Alexandre');
    ctx.type('');
    expect(ctx.create.style.display).toBe('none');
  });

  it("affiche la requete via textContent (donnee utilisateur, jamais innerHTML -- DS-PRINCIPLES 11)", () => {
    ctx.type('<img src=x onerror=alert(1)>');
    const slot = ctx.create.querySelector('.dropdown-create-query');
    expect(slot.textContent).toBe('<img src=x onerror=alert(1)>');
    // Aucun noeud element injecte : le contenu est du texte, pas du markup.
    expect(slot.querySelector('img')).toBeNull();
    expect(slot.children).toHaveLength(0);
  });

  it("emet dropdown:create avec la requete, et ferme le menu", () => {
    const { window, document, dd, create, type } = ctx;
    // Le menu est DEPLACE dans document.body a l'ouverture (panneau flottant
    // #856, pour echapper aux ancetres overflow:hidden) et n'est remis a sa
    // place qu'apres la transition de fermeture (FLOATING_PANEL_RESTORE_MS) :
    // on garde donc la reference du noeud plutot que de le rechercher sous
    // `.dropdown`, ou il n'est plus a cet instant.
    const menu = document.querySelector('.dropdown-menu');
    let received = null;
    dd.addEventListener('dropdown:create', (e) => { received = e.detail; });
    fireClick(window, dd.querySelector('.dropdown-trigger'));
    type('Alexandre Poutrain');
    expect(menu.classList.contains('open')).toBe(true);
    fireClick(window, create);
    expect(received).toEqual({ query: 'Alexandre Poutrain' });
    expect(menu.classList.contains('open')).toBe(false);
  });

  it("n'entre jamais dans la selection : pas de .selected, .dropdown-value inchangee", () => {
    const { window, dd, create, type } = ctx;
    type('Alexandre');
    fireClick(window, create);
    expect(create.classList.contains('selected')).toBe(false);
    expect(dd.querySelector('.dropdown-value').textContent).toBe('Choisir un acteur');
  });

  it("une option ordinaire selectionne toujours normalement (aucune regression)", () => {
    const { window, dd, options } = ctx;
    fireClick(window, options[0]);
    expect(options[0].classList.contains('selected')).toBe(true);
    expect(dd.querySelector('.dropdown-value').textContent).toBe('Camille Berger');
  });
});
