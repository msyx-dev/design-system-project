// Tests -- initTreeView (#744, vague 4/N infra tests vanilla)
//
// Markup repris de pages/data.html#tree-view (classes/roles reels : .tree,
// .tree-item, .tree-branch, .tree-leaf, .tree-toggle, .tree-children,
// .tree-label). Expose individuellement : window.__initTreeView().
//
// IMPORTANT (verifie en lisant shared/components.js:2141-2204 AVANT
// d'ecrire ce fichier, cf. consigne de reperage) : contrairement a ce que
// le nom "navigation WAI-ARIA tree" suggere, initTreeView() ne pose AUCUNE
// navigation clavier (pas de ArrowUp/ArrowDown/ArrowLeft/ArrowRight, pas de
// roving tabindex) malgre role="tree"/role="treeitem" dans le markup -- le
// pattern WAI-ARIA APG Tree View attend cette navigation. Seuls le clic sur
// .tree-toggle (expand/collapse) et le clic sur .tree-leaf/.tree-branch
// (selection) sont geres. Ce fichier teste donc le comportement REEL
// (clic), pas le comportement suppose par l'intitule du composant --
// l'ecart est documente dans la PR (#744 vague 4), pas invente ici.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

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
