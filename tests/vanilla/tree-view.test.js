// Tests -- initTreeView (#744, vague 4/N infra tests vanilla ; #824 nav clavier)
//
// Markup repris de pages/data.html#tree-view (classes/roles reels : .tree,
// .tree-item, .tree-branch, .tree-leaf, .tree-toggle, .tree-children,
// .tree-label). Expose individuellement : window.__initTreeView().
//
// #824 : initTreeView() posait role="tree"/role="treeitem" sans AUCUNE
// navigation clavier (pas de ArrowUp/ArrowDown/ArrowLeft/ArrowRight, pas de
// roving tabindex) -- ecart documente en #744 vague 4, corrige ici. Le
// pattern ajoute suit initJsonViewer (#446) : DOM statique le plus proche
// (role=treeitem imbrique dans role=group, visibilite pilotee par .open sur
// l'ancetre .tree-children) -- pas le moteur graph (svg-renderer.js #671)
// dont la structure SVG plate + arbre couvrant recalcule est sans rapport
// avec un DOM imbrique statique. Les tests clic (comportement pre-existant)
// restent inchanges ci-dessous ; la nav clavier est couverte plus bas.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function treeHtml() {
  return `
    <ul class="tree" role="tree" aria-label="Structure de projet">
      <li class="tree-item tree-branch" role="treeitem" aria-expanded="true">
        <button class="tree-toggle" aria-label="Basculer src">
          <span class="tree-label">src</span>
        </button>
        <ul class="tree tree-children" role="group">
          <li class="tree-item tree-leaf" role="treeitem">
            <span class="tree-label">layout.tsx</span>
          </li>
          <li class="tree-item tree-leaf" role="treeitem">
            <span class="tree-label">page.tsx</span>
          </li>
        </ul>
      </li>
      <li class="tree-item tree-branch" role="treeitem" aria-expanded="false">
        <button class="tree-toggle" aria-label="Basculer public">
          <span class="tree-label">public</span>
        </button>
        <ul class="tree tree-children" role="group">
          <li class="tree-item tree-leaf" role="treeitem">
            <span class="tree-label">favicon.ico</span>
          </li>
        </ul>
      </li>
      <li class="tree-item tree-leaf" role="treeitem">
        <span class="tree-label">package.json</span>
      </li>
    </ul>
  `;
}

function setup() {
  const dom = loadComponentsWindow(treeHtml());
  const { window } = dom;
  const { document } = window;
  window.__initTreeView();
  const root = document.querySelector('.tree[role="tree"]');
  const branches = Array.from(root.querySelectorAll(':scope > .tree-branch'));
  const [srcBranch, publicBranch] = branches;
  const packageJson = root.querySelector(':scope > .tree-leaf');
  return { window, document, root, srcBranch, publicBranch, packageJson };
}

describe('initTreeView', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("initialise l'etat open/ferme depuis aria-expanded (src ouvert, public ferme)", () => {
    const { srcBranch, publicBranch } = ctx;
    expect(srcBranch.classList.contains('open')).toBe(true);
    expect(srcBranch.querySelector('.tree-children').classList.contains('open')).toBe(true);
    expect(publicBranch.classList.contains('open')).toBe(false);
    expect(publicBranch.querySelector('.tree-children').classList.contains('open')).toBe(false);
  });

  it('un clic sur .tree-toggle ferme une branche ouverte (classe + aria-expanded)', () => {
    const { window, srcBranch } = ctx;
    const toggle = srcBranch.querySelector('.tree-toggle');
    fireClick(window, toggle);
    expect(srcBranch.classList.contains('open')).toBe(false);
    expect(srcBranch.getAttribute('aria-expanded')).toBe('false');
    expect(srcBranch.querySelector('.tree-children').classList.contains('open')).toBe(false);
  });

  it('un clic sur .tree-toggle ouvre une branche fermee (classe + aria-expanded)', () => {
    const { window, publicBranch } = ctx;
    const toggle = publicBranch.querySelector('.tree-toggle');
    fireClick(window, toggle);
    expect(publicBranch.classList.contains('open')).toBe(true);
    expect(publicBranch.getAttribute('aria-expanded')).toBe('true');
    expect(publicBranch.querySelector('.tree-children').classList.contains('open')).toBe(true);
  });

  it('un clic sur .tree-toggle selectionne aussi la branche elle-meme (.selected)', () => {
    const { window, srcBranch, publicBranch } = ctx;
    const toggle = srcBranch.querySelector('.tree-toggle');
    fireClick(window, toggle);
    expect(srcBranch.classList.contains('selected')).toBe(true);
    expect(publicBranch.classList.contains('selected')).toBe(false);
  });

  it('un clic sur une feuille (.tree-leaf) la selectionne et deselectionne les autres', () => {
    const { window, document, root, packageJson } = ctx;
    const leaf = root.querySelector('.tree-children .tree-leaf');
    fireClick(window, leaf);
    expect(leaf.classList.contains('selected')).toBe(true);
    expect(packageJson.classList.contains('selected')).toBe(false);

    fireClick(window, packageJson);
    expect(packageJson.classList.contains('selected')).toBe(true);
    expect(leaf.classList.contains('selected')).toBe(false);
    // Un seul item selectionne dans tout l'arbre a la fois
    const selected = Array.from(document.querySelectorAll('.tree-item.selected'));
    expect(selected).toHaveLength(1);
  });

  it('la selection emet un evenement treeview:select avec le label du texte reel', () => {
    const { window, root } = ctx;
    const leaf = root.querySelector('.tree-children .tree-leaf');
    let detail = null;
    root.addEventListener('treeview:select', (e) => { detail = e.detail; });
    fireClick(window, leaf);
    expect(detail).toEqual({ label: 'layout.tsx' });
  });

  it('reappeler initTreeView() est idempotent (dataset.bound, pas de double listener)', () => {
    const { window, root } = ctx;
    let selectCount = 0;
    root.addEventListener('treeview:select', () => { selectCount++; });
    window.__initTreeView(); // 2e appel -- doit no-op
    const leaf = root.querySelector('.tree-children .tree-leaf');
    fireClick(window, leaf);
    expect(selectCount).toBe(1);
  });
});

// ─── Navigation clavier WAI-ARIA APG Tree (#824) ────────────────────────
// Pattern repris d'initJsonViewer (#446, voir tests/vanilla/json-viewer.test.js)
// : roving tabindex sur les .tree-item, visibilite pilotee par .tree-children.open.
describe('initTreeView — navigation clavier (#824)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it('roving tabindex initial : le 1er item visible (racine) a tabindex=0, tous les autres -1', () => {
    const { root, srcBranch, publicBranch, packageJson } = ctx;
    const allItems = Array.from(root.querySelectorAll('.tree-item'));
    expect(srcBranch.getAttribute('tabindex')).toBe('0');
    allItems.filter((i) => i !== srcBranch).forEach((i) => {
      expect(i.getAttribute('tabindex')).toBe('-1');
    });
    expect(publicBranch.getAttribute('tabindex')).toBe('-1');
    expect(packageJson.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown depuis une branche ouverte descend au 1er enfant (item visible suivant)', () => {
    const { window, srcBranch } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus();
    fireKeydown(window, srcBranch, 'ArrowDown');
    const layoutLeaf = srcBranch.querySelector('.tree-children .tree-leaf');
    expect(window.document.activeElement).toBe(layoutLeaf);
    expect(layoutLeaf.getAttribute('tabindex')).toBe('0');
    expect(srcBranch.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown depuis une branche FERMEE saute ses enfants caches (item visible suivant, pas le 1er enfant invisible)', () => {
    const { window, publicBranch, packageJson } = ctx;
    publicBranch.setAttribute('tabindex', '0');
    publicBranch.focus();
    fireKeydown(window, publicBranch, 'ArrowDown');
    // favicon.ico (enfant de public, ferme) n'est pas visible -> on va direct a package.json
    expect(window.document.activeElement).toBe(packageJson);
    expect(packageJson.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp deplace le focus vers l item visible precedent', () => {
    const { window, publicBranch, packageJson } = ctx;
    packageJson.setAttribute('tabindex', '0');
    packageJson.focus();
    fireKeydown(window, packageJson, 'ArrowUp');
    expect(window.document.activeElement).toBe(publicBranch);
    expect(publicBranch.getAttribute('tabindex')).toBe('0');
    expect(packageJson.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight sur une branche FERMEE la deplie sans deplacer le focus', () => {
    const { window, publicBranch } = ctx;
    publicBranch.setAttribute('tabindex', '0');
    publicBranch.focus();
    fireKeydown(window, publicBranch, 'ArrowRight');
    expect(publicBranch.classList.contains('open')).toBe(true);
    expect(publicBranch.getAttribute('aria-expanded')).toBe('true');
    expect(window.document.activeElement).toBe(publicBranch);
  });

  it('ArrowRight sur une branche OUVERTE descend au 1er enfant', () => {
    const { window, srcBranch } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus(); // deja ouverte par defaut
    fireKeydown(window, srcBranch, 'ArrowRight');
    const layoutLeaf = srcBranch.querySelector('.tree-children .tree-leaf');
    expect(window.document.activeElement).toBe(layoutLeaf);
  });

  it('ArrowLeft sur une branche OUVERTE la replie sans deplacer le focus', () => {
    const { window, srcBranch } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus();
    fireKeydown(window, srcBranch, 'ArrowLeft');
    expect(srcBranch.classList.contains('open')).toBe(false);
    expect(srcBranch.getAttribute('aria-expanded')).toBe('false');
    expect(window.document.activeElement).toBe(srcBranch);
  });

  it('ArrowLeft sur une feuille remonte le focus a sa branche parente', () => {
    const { window, srcBranch } = ctx;
    const layoutLeaf = srcBranch.querySelector('.tree-children .tree-leaf');
    layoutLeaf.setAttribute('tabindex', '0');
    layoutLeaf.focus();
    fireKeydown(window, layoutLeaf, 'ArrowLeft');
    expect(window.document.activeElement).toBe(srcBranch);
    expect(srcBranch.getAttribute('tabindex')).toBe('0');
    expect(layoutLeaf.getAttribute('tabindex')).toBe('-1');
  });

  it('Home deplace le focus au 1er item visible de tout l arbre', () => {
    const { window, srcBranch, packageJson } = ctx;
    packageJson.setAttribute('tabindex', '0');
    packageJson.focus();
    fireKeydown(window, packageJson, 'Home');
    expect(window.document.activeElement).toBe(srcBranch);
    expect(srcBranch.getAttribute('tabindex')).toBe('0');
  });

  it('End deplace le focus au dernier item VISIBLE de tout l arbre (pas le dernier du DOM si cache)', () => {
    const { window, srcBranch, packageJson } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus();
    fireKeydown(window, srcBranch, 'End');
    // favicon.ico est dans le DOM mais cache (public ferme) -> le dernier visible est package.json
    expect(window.document.activeElement).toBe(packageJson);
    expect(packageJson.getAttribute('tabindex')).toBe('0');
  });

  it('Enter sur une branche fermee la deplie ET la selectionne', () => {
    const { window, publicBranch } = ctx;
    publicBranch.setAttribute('tabindex', '0');
    publicBranch.focus();
    fireKeydown(window, publicBranch, 'Enter');
    expect(publicBranch.classList.contains('open')).toBe(true);
    expect(publicBranch.getAttribute('aria-expanded')).toBe('true');
    expect(publicBranch.classList.contains('selected')).toBe(true);
  });

  it("Espace sur une branche ouverte la replie ET la selectionne (aller-retour, pas juste un sens)", () => {
    const { window, srcBranch } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus();
    fireKeydown(window, srcBranch, ' ');
    expect(srcBranch.classList.contains('open')).toBe(false);
    expect(srcBranch.getAttribute('aria-expanded')).toBe('false');
    expect(srcBranch.classList.contains('selected')).toBe(true);
  });

  it('Enter sur une feuille la selectionne (pas de toggle -- ce n est pas une branche)', () => {
    const { window, srcBranch, publicBranch } = ctx;
    const layoutLeaf = srcBranch.querySelector('.tree-children .tree-leaf');
    layoutLeaf.setAttribute('tabindex', '0');
    layoutLeaf.focus();
    fireKeydown(window, layoutLeaf, 'Enter');
    expect(layoutLeaf.classList.contains('selected')).toBe(true);
    expect(srcBranch.classList.contains('selected')).toBe(false);
    expect(publicBranch.classList.contains('selected')).toBe(false);
  });

  it("touches non gerees (ex. 'a') n'affectent ni le focus ni la selection", () => {
    const { window, srcBranch } = ctx;
    srcBranch.setAttribute('tabindex', '0');
    srcBranch.focus();
    fireKeydown(window, srcBranch, 'a');
    expect(window.document.activeElement).toBe(srcBranch);
    expect(srcBranch.classList.contains('selected')).toBe(false);
  });
});
