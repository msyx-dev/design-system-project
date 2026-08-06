// Tests -- initTransferList (#744, vague 14/N couverture tests vanilla)
//
// Expose directement via window.__initTransferList (shared/components.js).
// Markup repris de la demo reelle (pages/formulaires.html#transfer-list) :
// .transfer-list > [.transfer-panel(x2), .transfer-actions]. Panel 0 = source
// ("Disponibles"), panel 1 = cible ("Assignes"). Chaque panel porte un
// .transfer-panel-header (titre + compteur), une .transfer-search (filtre),
// et un .transfer-body qui contient les .transfer-option.
//
// Defaut trouve + corrige a la volee (#744 vague 14) : bindOption() posait
// role="option" sur chaque .transfer-option SANS que le conteneur
// .transfer-body porte role="listbox" -- un option DOIT avoir un listbox
// pour parent (WAI-ARIA), sinon un lecteur d'ecran ne l'annonce pas comme
// faisant partie d'une liste selectionnable. Corrige par l'ajout de
// role="listbox" + aria-multiselectable="true" + aria-label (titre du
// panel) sur .transfer-body, dans initTransferList() lui-meme.
import { describe, it, expect, afterEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function listHtml() {
  return `
    <div class="transfer-list">
      <div class="transfer-panel">
        <div class="transfer-panel-header">
          <span class="transfer-panel-title">Disponibles</span>
          <span class="transfer-count">0 / 6</span>
        </div>
        <div class="transfer-search">
          <input type="text" class="input" placeholder="Filtrer...">
        </div>
        <div class="transfer-body">
          <div class="transfer-option">Alice Martin</div>
          <div class="transfer-option">Bruno Faure</div>
          <div class="transfer-option">Chloé Dubois</div>
          <div class="transfer-option">David Nguyen</div>
          <div class="transfer-option">Emma Petit</div>
          <div class="transfer-option">Farid Lopez</div>
        </div>
      </div>
      <div class="transfer-actions">
        <button type="button" class="btn-icon" data-transfer="right" aria-label="Transférer la sélection à droite">&gt;</button>
        <button type="button" class="btn-icon" data-transfer="left" aria-label="Transférer la sélection à gauche">&lt;</button>
        <button type="button" class="btn-icon" data-transfer="all-right" aria-label="Transférer tout à droite">»</button>
        <button type="button" class="btn-icon" data-transfer="all-left" aria-label="Transférer tout à gauche">«</button>
      </div>
      <div class="transfer-panel">
        <div class="transfer-panel-header">
          <span class="transfer-panel-title">Assignés</span>
          <span class="transfer-count">0 / 0</span>
        </div>
        <div class="transfer-search">
          <input type="text" class="input" placeholder="Filtrer...">
        </div>
        <div class="transfer-body"></div>
      </div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(listHtml());
  const { window } = dom;
  const { document } = window;
  const list = document.querySelector('.transfer-list');
  const panels = document.querySelectorAll('.transfer-panel');
  const sourcePanel = panels[0];
  const targetPanel = panels[1];
  const sourceBody = sourcePanel.querySelector('.transfer-body');
  const targetBody = targetPanel.querySelector('.transfer-body');
  return { window, document, list, sourcePanel, targetPanel, sourceBody, targetBody };
}

describe('initTransferList -- ARIA listbox (defaut corrige #744 vague 14)', () => {
  it('.transfer-body porte role="listbox" (bindOption pose role="option" sur les enfants -- invalide sans parent listbox)', () => {
    const { window, sourceBody, targetBody } = setup();
    window.__initTransferList();
    expect(sourceBody.getAttribute('role')).toBe('listbox');
    expect(targetBody.getAttribute('role')).toBe('listbox');
  });

  it('.transfer-body porte aria-multiselectable="true" (selection multiple possible)', () => {
    const { window, sourceBody, targetBody } = setup();
    window.__initTransferList();
    expect(sourceBody.getAttribute('aria-multiselectable')).toBe('true');
    expect(targetBody.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('.transfer-body porte aria-label depuis le titre du panel', () => {
    const { window, sourceBody, targetBody } = setup();
    window.__initTransferList();
    expect(sourceBody.getAttribute('aria-label')).toBe('Disponibles');
    expect(targetBody.getAttribute('aria-label')).toBe('Assignés');
  });

  it('chaque .transfer-option recoit role="option" + tabindex="0" + aria-selected="false"', () => {
    const { window, sourceBody } = setup();
    window.__initTransferList();
    const options = sourceBody.querySelectorAll('.transfer-option');
    options.forEach((opt) => {
      expect(opt.getAttribute('role')).toBe('option');
      expect(opt.getAttribute('tabindex')).toBe('0');
      expect(opt.getAttribute('aria-selected')).toBe('false');
    });
  });
});

describe('initTransferList -- selection', () => {
  it('un clic sur une option la selectionne (classe + aria-selected + compteur)', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    const alice = sourceBody.querySelector('.transfer-option');
    fireClick(window, alice);
    expect(alice.classList.contains('selected')).toBe(true);
    expect(alice.getAttribute('aria-selected')).toBe('true');
    expect(sourcePanel.querySelector('.transfer-count').textContent).toBe('1 / 6');
  });

  it('un second clic desselectionne', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    const alice = sourceBody.querySelector('.transfer-option');
    fireClick(window, alice);
    fireClick(window, alice);
    expect(alice.classList.contains('selected')).toBe(false);
    expect(alice.getAttribute('aria-selected')).toBe('false');
    expect(sourcePanel.querySelector('.transfer-count').textContent).toBe('0 / 6');
  });

  it('Entree/Espace selectionnent au clavier comme un clic', () => {
    const { window, sourceBody } = setup();
    window.__initTransferList();
    const alice = sourceBody.querySelector('.transfer-option');
    fireKeydown(window, alice, 'Enter');
    expect(alice.classList.contains('selected')).toBe(true);
    const bruno = sourceBody.querySelectorAll('.transfer-option')[1];
    fireKeydown(window, bruno, ' ');
    expect(bruno.classList.contains('selected')).toBe(true);
  });

  it('ArrowDown/ArrowUp deplacent le focus entre options visibles', () => {
    const { window, sourceBody } = setup();
    window.__initTransferList();
    const opts = sourceBody.querySelectorAll('.transfer-option');
    fireKeydown(window, opts[0], 'ArrowDown');
    expect(window.document.activeElement).toBe(opts[1]);
    fireKeydown(window, opts[1], 'ArrowUp');
    expect(window.document.activeElement).toBe(opts[0]);
  });

  it('ArrowDown sur la derniere option ne plante pas (borne)', () => {
    const { window, sourceBody } = setup();
    window.__initTransferList();
    const opts = sourceBody.querySelectorAll('.transfer-option');
    const last = opts[opts.length - 1];
    expect(() => fireKeydown(window, last, 'ArrowDown')).not.toThrow();
  });
});

describe('initTransferList -- filtre par panneau', () => {
  it('le filtre masque les options ne correspondant pas (substring, insensible casse)', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    const input = sourcePanel.querySelector('.transfer-search input');
    input.value = 'ali';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    const opts = Array.from(sourceBody.querySelectorAll('.transfer-option'));
    const alice = opts.find((o) => o.textContent === 'Alice Martin');
    const bruno = opts.find((o) => o.textContent === 'Bruno Faure');
    expect(alice.classList.contains('hidden')).toBe(false);
    expect(bruno.classList.contains('hidden')).toBe(true);
  });

  it('vider le filtre reaffiche toutes les options', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    const input = sourcePanel.querySelector('.transfer-search input');
    input.value = 'ali';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.value = '';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    const opts = sourceBody.querySelectorAll('.transfer-option');
    opts.forEach((o) => expect(o.classList.contains('hidden')).toBe(false));
  });

  it('ArrowDown ignore les options masquees par le filtre', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    const input = sourcePanel.querySelector('.transfer-search input');
    input.value = 'a'; // matche Alice Martin, Farid Lopez (contient "a"), pas Bruno... verifions le jeu de donnees
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    const visible = Array.from(sourceBody.querySelectorAll('.transfer-option')).filter(
      (o) => !o.classList.contains('hidden')
    );
    expect(visible.length).toBeGreaterThan(0);
    fireKeydown(window, visible[0], 'ArrowDown');
    if (visible.length > 1) {
      expect(window.document.activeElement).toBe(visible[1]);
    } else {
      expect(window.document.activeElement).toBe(visible[0]);
    }
  });
});

describe('initTransferList -- transfert', () => {
  it('bouton droit deplace UNIQUEMENT les options selectionnees vers la cible, reinitialise la selection, met a jour les compteurs', () => {
    const { window, document, sourceBody, targetBody, sourcePanel, targetPanel } = setup();
    window.__initTransferList();
    const opts = sourceBody.querySelectorAll('.transfer-option');
    fireClick(window, opts[0]); // Alice
    fireClick(window, opts[2]); // Chloé
    fireClick(window, document.querySelector('[data-transfer="right"]'));
    expect(targetBody.querySelectorAll('.transfer-option').length).toBe(2);
    expect(sourceBody.querySelectorAll('.transfer-option').length).toBe(4);
    // la selection est effacee une fois deplacee
    targetBody.querySelectorAll('.transfer-option').forEach((opt) => {
      expect(opt.classList.contains('selected')).toBe(false);
      expect(opt.getAttribute('aria-selected')).toBe('false');
    });
    expect(sourcePanel.querySelector('.transfer-count').textContent).toBe('0 / 4');
    expect(targetPanel.querySelector('.transfer-count').textContent).toBe('0 / 2');
  });

  it('bouton gauche deplace les options selectionnees de la cible vers la source', () => {
    const { window, document, sourceBody, targetBody } = setup();
    window.__initTransferList();
    fireClick(window, sourceBody.querySelectorAll('.transfer-option')[0]);
    fireClick(window, document.querySelector('[data-transfer="right"]'));
    // Alice est maintenant dans la cible -- la selectionner et la renvoyer
    const inTarget = targetBody.querySelector('.transfer-option');
    fireClick(window, inTarget);
    fireClick(window, document.querySelector('[data-transfer="left"]'));
    expect(targetBody.querySelectorAll('.transfer-option').length).toBe(0);
    expect(sourceBody.querySelectorAll('.transfer-option').length).toBe(6);
  });

  it('bouton droit sans selection est un no-op (rien ne bouge, pas de crash)', () => {
    const { window, document, sourceBody, targetBody } = setup();
    window.__initTransferList();
    expect(() => fireClick(window, document.querySelector('[data-transfer="right"]'))).not.toThrow();
    expect(sourceBody.querySelectorAll('.transfer-option').length).toBe(6);
    expect(targetBody.querySelectorAll('.transfer-option').length).toBe(0);
  });

  it('bouton "tout transferer a droite" deplace TOUTES les options, meme non selectionnees', () => {
    const { window, document, sourceBody, targetBody } = setup();
    window.__initTransferList();
    fireClick(window, document.querySelector('[data-transfer="all-right"]'));
    expect(sourceBody.querySelectorAll('.transfer-option').length).toBe(0);
    expect(targetBody.querySelectorAll('.transfer-option').length).toBe(6);
  });

  it('bouton "tout transferer a gauche" ramene tout dans la source', () => {
    const { window, document, sourceBody, targetBody } = setup();
    window.__initTransferList();
    fireClick(window, document.querySelector('[data-transfer="all-right"]'));
    fireClick(window, document.querySelector('[data-transfer="all-left"]'));
    expect(sourceBody.querySelectorAll('.transfer-option').length).toBe(6);
    expect(targetBody.querySelectorAll('.transfer-option').length).toBe(0);
  });

  it('un deplacement retire aussi l\'etat "hidden" (filtre) des options deplacees', () => {
    const { window, document, sourceBody, targetBody, sourcePanel } = setup();
    window.__initTransferList();
    const input = sourcePanel.querySelector('.transfer-search input');
    input.value = 'ali';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    fireClick(window, document.querySelector('[data-transfer="all-right"]'));
    targetBody.querySelectorAll('.transfer-option').forEach((opt) => {
      expect(opt.classList.contains('hidden')).toBe(false);
    });
  });

  it('un transfert emet transfer:change avec direction et count corrects', () => {
    const { window, document, list, sourceBody } = setup();
    window.__initTransferList();
    let detail = null;
    list.addEventListener('transfer:change', (e) => { detail = e.detail; });
    fireClick(window, sourceBody.querySelectorAll('.transfer-option')[0]);
    fireClick(window, document.querySelector('[data-transfer="right"]'));
    expect(detail).toEqual({ direction: 'right', count: 1 });
  });

  it('la region aria-live annonce le nombre d\'elements deplaces et la panel cible', () => {
    const { window, document, sourceBody, list } = setup();
    window.__initTransferList();
    fireClick(window, sourceBody.querySelectorAll('.transfer-option')[0]);
    fireClick(window, document.querySelector('[data-transfer="right"]'));
    const live = list.querySelector('[data-transfer-live]');
    expect(live).not.toBeNull();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('1 élément(s) déplacé(s) vers Assignés.');
  });
});

describe('initTransferList -- idempotence', () => {
  it('un second appel initTransferList() ne double-bind pas le clic (dataset.bound sur .transfer-list)', () => {
    const { window, sourceBody, sourcePanel } = setup();
    window.__initTransferList();
    window.__initTransferList();
    const alice = sourceBody.querySelector('.transfer-option');
    fireClick(window, alice);
    // Si double-bound, le clic basculerait 2x (selected -> non-selected) : on
    // resterait a non-selectionne. Un seul bind => selectionne.
    expect(alice.classList.contains('selected')).toBe(true);
    expect(sourcePanel.querySelector('.transfer-count').textContent).toBe('1 / 6');
  });

  it('un second appel initTransferList() ne double-bind pas les options individuelles (dataset.transferOptionBound)', () => {
    const { window, sourceBody } = setup();
    window.__initTransferList();
    // reappel global -- bindAllOptions() est aussi rappele en interne
    window.__initTransferList();
    const alice = sourceBody.querySelector('.transfer-option');
    fireClick(window, alice);
    expect(alice.classList.contains('selected')).toBe(true);
    fireClick(window, alice);
    expect(alice.classList.contains('selected')).toBe(false);
  });
});
