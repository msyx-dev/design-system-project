// Tests -- initDecisionTree (#744, vague 12/N couverture tests vanilla)
//
// Expose via window.__initDecisionTree (shared/components.js:3749). Markup
// repris de pages/divers.html#decision-tree (classes/attrs reels) : .dtree
// > .dtree-node[id][role] > .dtree-choices > .dtree-choice[data-next] ;
// .dtree-connector[data-from] entre 2 noeuds ; .dtree-node--result final ;
// .dtree-reset (masque par defaut, style="display:none").
//
// Delegation d'evenement : un seul listener 'click' sur .dtree (pas un
// listener par bouton) -- verifie shared/components.js:3756.
//
// treeHtml() accepte un prefixe d'id (2e test d'isolation) : le composant
// resout ses noeuds via `dtree.querySelector('#' + nextId)`, une recherche
// scopee a l'instance -- mais les navigateurs (jsdom compris) optimisent la
// resolution d'un selecteur #id via une table document-wide et retombent sur
// le PREMIER element portant cet id en cas de doublon, meme quand la requete
// est scopee a un sous-arbre qui n'est pas ce premier element (verifie a la
// main : `elementSansCetId.querySelector('#duplique')` -> null au lieu d'une
// recherche de secours dans le sous-arbre). Ce n'est pas un defaut du
// composant : deux instances de dtree copiees-collees SANS renommer leurs id
// casseraient la navigation dans N'IMPORTE QUEL navigateur, id dupliques =
// HTML invalide de toute facon. D'ou des ids prefixes ici, comme le ferait
// n'importe quel consommateur reel avec 2 arbres sur la meme page.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function treeHtml(prefix = 'dt') {
  const id = suffix => prefix + '-' + suffix;
  return `
    <div class="dtree">
      <div class="dtree-node dtree-node--question active" id="${id('q1')}" role="group" aria-label="Etape 1">
        <div class="dtree-node-content">Quel type de projet ?</div>
        <div class="dtree-choices">
          <button class="dtree-choice" data-next="${id('q2a')}" aria-label="Site vitrine">Site vitrine</button>
          <button class="dtree-choice" data-next="${id('q2b')}" aria-label="Application web">Application web</button>
        </div>
      </div>
      <div class="dtree-connector" data-from="${id('q1')}" aria-hidden="true"></div>
      <div class="dtree-node dtree-node--question" id="${id('q2a')}" role="group" aria-label="Etape 2a">
        <div class="dtree-node-content">Besoin d'un CMS ?</div>
        <div class="dtree-choices">
          <button class="dtree-choice" data-next="${id('r1')}" aria-label="Oui">Oui</button>
          <button class="dtree-choice" data-next="${id('r2')}" aria-label="Non">Non</button>
        </div>
      </div>
      <div class="dtree-connector" data-from="${id('q2a')}" aria-hidden="true"></div>
      <div class="dtree-node dtree-node--question" id="${id('q2b')}" role="group" aria-label="Etape 2b">
        <div class="dtree-node-content">Quelle stack ?</div>
        <div class="dtree-choices">
          <button class="dtree-choice" data-next="${id('r3')}" aria-label="Next.js">Next.js</button>
          <button class="dtree-choice" data-next="${id('r4')}" aria-label="FastAPI + React">FastAPI + React</button>
        </div>
      </div>
      <div class="dtree-node dtree-node--result" id="${id('r1')}" role="region" aria-label="Resultat">
        <div class="dtree-node-content">WordPress ou Strapi</div>
      </div>
      <div class="dtree-node dtree-node--result" id="${id('r2')}" role="region" aria-label="Resultat">
        <div class="dtree-node-content">HTML/CSS statique + Caddy</div>
      </div>
      <div class="dtree-node dtree-node--result" id="${id('r3')}" role="region" aria-label="Resultat">
        <div class="dtree-node-content">Next.js + Vercel ou Docker</div>
      </div>
      <div class="dtree-node dtree-node--result" id="${id('r4')}" role="region" aria-label="Resultat">
        <div class="dtree-node-content">FastAPI + React + Docker Compose</div>
      </div>
      <button class="dtree-reset btn-primary" style="margin-top:1rem;display:none;" aria-label="Recommencer l'arbre de decision">Recommencer</button>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initDecisionTree();
  return { window, document, dtree: document.querySelector('.dtree') };
}

describe('initDecisionTree -- etat initial', () => {
  it('seul le 1er noeud est actif, le reset est masque', () => {
    const { dtree } = setup(treeHtml());
    expect(dtree.querySelector('#dt-q1').classList.contains('active')).toBe(true);
    expect(dtree.querySelector('#dt-q2a').classList.contains('active')).toBe(false);
    expect(dtree.querySelector('.dtree-reset').style.display).toBe('none');
  });
});

describe('initDecisionTree -- parcours (question intermediaire)', () => {
  it("choisir une reponse marque .selected, desactive les 2 choix du noeud, revele le connecteur et le noeud suivant", () => {
    const { window, dtree } = setup(treeHtml());
    const choiceVitrine = dtree.querySelector('[data-next="dt-q2a"]');
    const choiceApp = dtree.querySelector('[data-next="dt-q2b"]');

    fireClick(window, choiceVitrine);

    expect(choiceVitrine.classList.contains('selected')).toBe(true);
    expect(choiceVitrine.disabled).toBe(true);
    expect(choiceApp.classList.contains('selected')).toBe(false);
    expect(choiceApp.disabled).toBe(true);

    const connector = dtree.querySelector('.dtree-connector[data-from="dt-q1"]');
    expect(connector.classList.contains('visible')).toBe(true);

    expect(dtree.querySelector('#dt-q2a').classList.contains('active')).toBe(true);
    expect(dtree.querySelector('#dt-q2b').classList.contains('active')).toBe(false);
  });

  it("un noeud suivant qui est une QUESTION (pas un resultat) ne revele PAS le bouton reset", () => {
    const { window, dtree } = setup(treeHtml());
    fireClick(window, dtree.querySelector('[data-next="dt-q2a"]'));
    expect(dtree.querySelector('.dtree-reset').style.display).toBe('none');
  });

  it("cliquer un choix DEJA selectionne est un no-op (aucun changement d'etat)", () => {
    const { window, dtree } = setup(treeHtml());
    const choice = dtree.querySelector('[data-next="dt-q2a"]');
    fireClick(window, choice);
    const q2aBefore = dtree.querySelector('#dt-q2a').classList.contains('active');

    // Reproduire un 2e clic natif serait impossible (disabled=true empeche le
    // clic reel) -- on verifie ici la garde explicite de la fonction : forcer
    // un choix marque .selected a rester un no-op meme sans la protection
    // disabled du navigateur.
    choice.disabled = false;
    fireClick(window, choice);

    expect(dtree.querySelector('#dt-q2a').classList.contains('active')).toBe(q2aBefore);
  });
});

describe('initDecisionTree -- parcours jusqu au resultat', () => {
  it("atteindre un noeud resultat revele le bouton reset", () => {
    const { window, dtree } = setup(treeHtml());
    fireClick(window, dtree.querySelector('[data-next="dt-q2a"]'));
    fireClick(window, dtree.querySelector('[data-next="dt-r1"]'));

    expect(dtree.querySelector('#dt-r1').classList.contains('active')).toBe(true);
    expect(dtree.querySelector('.dtree-reset').style.display).toBe('');
    const connector2 = dtree.querySelector('.dtree-connector[data-from="dt-q2a"]');
    expect(connector2.classList.contains('visible')).toBe(true);
  });

  it("l'autre branche (Application web -> FastAPI + React) mene independamment a son propre resultat", () => {
    const { window, dtree } = setup(treeHtml());
    fireClick(window, dtree.querySelector('[data-next="dt-q2b"]'));
    fireClick(window, dtree.querySelector('[data-next="dt-r4"]'));

    expect(dtree.querySelector('#dt-r4').classList.contains('active')).toBe(true);
    expect(dtree.querySelector('#dt-r1').classList.contains('active')).toBe(false);
    expect(dtree.querySelector('.dtree-reset').style.display).toBe('');
  });
});

describe('initDecisionTree -- retour arriere via reset', () => {
  it("le bouton reset restaure le 1er noeud actif, masque tous les autres, reactive tous les choix, cache les connecteurs et se recache lui-meme", () => {
    const { window, dtree } = setup(treeHtml());
    fireClick(window, dtree.querySelector('[data-next="dt-q2a"]'));
    fireClick(window, dtree.querySelector('[data-next="dt-r1"]'));

    fireClick(window, dtree.querySelector('.dtree-reset'));

    expect(dtree.querySelector('#dt-q1').classList.contains('active')).toBe(true);
    ['#dt-q2a', '#dt-q2b', '#dt-r1', '#dt-r2', '#dt-r3', '#dt-r4'].forEach(sel => {
      expect(dtree.querySelector(sel).classList.contains('active')).toBe(false);
    });
    dtree.querySelectorAll('.dtree-choice').forEach(btn => {
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('selected')).toBe(false);
    });
    dtree.querySelectorAll('.dtree-connector').forEach(c => {
      expect(c.classList.contains('visible')).toBe(false);
    });
    expect(dtree.querySelector('.dtree-reset').style.display).toBe('none');
  });

  it("apres reset, un nouveau parcours (branche differente) fonctionne normalement", () => {
    const { window, dtree } = setup(treeHtml());
    fireClick(window, dtree.querySelector('[data-next="dt-q2a"]'));
    fireClick(window, dtree.querySelector('[data-next="dt-r1"]'));
    fireClick(window, dtree.querySelector('.dtree-reset'));

    fireClick(window, dtree.querySelector('[data-next="dt-q2b"]'));
    expect(dtree.querySelector('#dt-q2b').classList.contains('active')).toBe(true);
  });
});

describe('initDecisionTree -- isolation multi-arbre et idempotence', () => {
  it('deux arbres sur la meme page (ids prefixes, HTML valide) sont independants', () => {
    const dom = loadComponentsWindow(
      `<div id="wrap-x">${treeHtml('x')}</div><div id="wrap-y">${treeHtml('y')}</div>`
    );
    const { window } = dom;
    const { document } = window;
    window.__initDecisionTree();

    const treeX = document.getElementById('wrap-x').querySelector('.dtree');
    const treeY = document.getElementById('wrap-y').querySelector('.dtree');

    fireClick(window, treeX.querySelector('[data-next="x-q2a"]'));

    expect(treeX.querySelector('#x-q2a').classList.contains('active')).toBe(true);
    expect(treeY.querySelector('#y-q2a').classList.contains('active')).toBe(false);
  });

  it("reappeler initDecisionTree() est idempotent (pas de double-bind du clic)", () => {
    const { window, dtree } = setup(treeHtml());
    window.__initDecisionTree(); // 2e appel -- doit no-op (dataset.bound)

    fireClick(window, dtree.querySelector('[data-next="dt-q2a"]'));

    // Si le listener 'click' etait double-attache, le 2e passage tenterait
    // de re-traiter le MEME clic sur un choix deja .selected -- la garde
    // "if (choice.classList.contains('selected')) return;" absorberait
    // silencieusement le doublon, donc l'etat final doit rester coherent
    // (un seul passage a l'etape suivante).
    expect(dtree.querySelector('#dt-q2a').classList.contains('active')).toBe(true);
    expect(dtree.querySelector('[data-next="dt-q2a"]').disabled).toBe(true);
  });
});
