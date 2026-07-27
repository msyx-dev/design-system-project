// Tests -- initJsonViewer (#744, amorce infra tests vanilla)
//
// Composant choisi pour sa logique de rendu RECURSIF (objets/tableaux
// imbriques) + roving tabindex WAI-ARIA Tree. Recemment touche par le
// retrait de classes JS mortes (#776) -- forte valeur de regression.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, fireClick } from './helpers/load-components.js';

const SAMPLE = {
  name: 'msyx',
  active: true,
  tags: ['ds', 'react'],
  meta: { version: 2 },
};

function wrapHtml(data) {
  return `<div class="json-viewer" data-json='${JSON.stringify(data)}'></div>`;
}

describe('initJsonViewer', () => {
  let window, document, root, tree;

  beforeEach(() => {
    const dom = loadComponentsWindow(wrapHtml(SAMPLE));
    window = dom.window;
    document = window.document;
    window.__initJsonViewer();
    root = document.querySelector('.json-viewer');
    tree = root.querySelector('[role="tree"]');
  });

  it('rend un noeud racine ouvert et un noeud par cle de premier niveau (rendu recursif)', () => {
    expect(tree).not.toBeNull();
    const rootNode = tree.querySelector(':scope > .json-node');
    expect(rootNode.classList.contains('json-node--expandable')).toBe(true);
    expect(rootNode.classList.contains('open')).toBe(true);
    expect(rootNode.getAttribute('aria-expanded')).toBe('true');

    // 4 clefs de premier niveau : name, active, tags, meta.
    const topLevelNodes = rootNode.querySelectorAll(':scope > .json-children > .json-node');
    expect(topLevelNodes.length).toBe(4);
  });

  it('rend recursivement un objet imbrique (meta.version) comme noeud enfant expandable', () => {
    const metaNode = Array.from(tree.querySelectorAll('.json-node')).find(
      (n) => n.querySelector(':scope > .json-row > .json-key')?.textContent === '"meta"'
    );
    expect(metaNode).toBeDefined();
    expect(metaNode.classList.contains('json-node--expandable')).toBe(true);
    const versionLeaf = metaNode.querySelector('.json-number');
    expect(versionLeaf.textContent).toBe('2');
  });

  it('un clic sur un noeud expandable retire .open (feuille visible non affectee)', () => {
    const rootNode = tree.querySelector(':scope > .json-node');
    const rootRow = rootNode.querySelector(':scope > .json-row');
    expect(rootNode.classList.contains('open')).toBe(true);

    fireClick(window, rootRow);

    expect(rootNode.classList.contains('open')).toBe(false);
    expect(rootNode.getAttribute('aria-expanded')).toBe('false');
  });

  it('un 2e clic sur le meme noeud restaure .open (aller-retour, pas juste un sens)', () => {
    const rootNode = tree.querySelector(':scope > .json-node');
    const rootRow = rootNode.querySelector(':scope > .json-row');

    fireClick(window, rootRow); // ferme
    fireClick(window, rootRow); // rouvre

    expect(rootNode.classList.contains('open')).toBe(true);
    expect(rootNode.getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight sur un noeud ferme le reouvre sans deplacer le focus ; ArrowRight sur un noeud deja ouvert descend au 1er enfant', () => {
    const rootNode = tree.querySelector(':scope > .json-node');
    rootNode.setAttribute('tabindex', '0');
    rootNode.focus();

    // Racine deja ouverte par defaut -> ArrowRight descend au 1er enfant visible.
    fireKeydown(window, rootNode, 'ArrowRight');
    const firstChild = rootNode.querySelector(':scope > .json-children > .json-node');
    expect(window.document.activeElement).toBe(firstChild);
    expect(firstChild.getAttribute('tabindex')).toBe('0');
    expect(rootNode.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowLeft sur un enfant remonte le focus au parent (roving tabindex, absence sur l enfant)', () => {
    const rootNode = tree.querySelector(':scope > .json-node');
    rootNode.setAttribute('tabindex', '0');
    rootNode.focus();
    fireKeydown(window, rootNode, 'ArrowRight'); // descend au 1er enfant ("name")
    const firstChild = rootNode.querySelector(':scope > .json-children > .json-node');

    fireKeydown(window, firstChild, 'ArrowLeft');

    expect(window.document.activeElement).toBe(rootNode);
    expect(rootNode.getAttribute('tabindex')).toBe('0');
    expect(firstChild.getAttribute('tabindex')).toBe('-1');
  });

  it('un JSON invalide (data-json non parsable) affiche .json-viewer-error au lieu de l arbre', () => {
    const dom = loadComponentsWindow('<div class="json-viewer" data-json="{not valid json"></div>');
    dom.window.__initJsonViewer();
    const errRoot = dom.window.document.querySelector('.json-viewer');
    expect(errRoot.querySelector('[role="tree"]')).toBeNull();
    expect(errRoot.querySelector('.json-viewer-error')).not.toBeNull();
  });
});
