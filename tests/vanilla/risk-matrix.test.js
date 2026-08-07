// Tests -- initRiskMatrix (#744, vague 16/N couverture tests vanilla)
//
// Expose directement via window.__initRiskMatrix (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#risk-matrix) : un
// .risk-matrix[data-size][data-label-x][data-label-y] contenant des
// .risk-item[data-prob][data-impact][data-label][data-level][data-owner]
// [data-detail] -- retires du DOM et reconstruits en grille CSS Grid
// (.risk-cell) avec des points cliquables (.risk-dot).
//
// normalizeLevel() (fix #758, XSS) contraint data-level a la whitelist
// {low,medium,high,critical} AVANT toute utilisation dans un attribut de
// classe -- un data-level invalide/malveillant tombe sur 'medium'. Une des
// suites ci-dessous verifie explicitement ce garde-fou (regression #758).
//
// Le clic/Entree/Espace sur un point ouvre le detail via window.__openModal
// -- deja defini par components.js lui-meme (pas un stub externe comme
// __pointerDrag), on exerce donc le VRAI chemin modal (dialog.showModal()
// polyfill du harnais).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function matrixHtml() {
  return `
    <div class="risk-matrix" data-size="3" data-label-x="Impact" data-label-y="Probabilité">
      <div class="risk-item" data-prob="3" data-impact="3" data-label="Risque critique A" data-level="critical" data-owner="CTO" data-detail="Action immédiate requise."></div>
      <div class="risk-item" data-prob="1" data-impact="2" data-label="Risque faible B" data-level="low"></div>
      <div class="risk-item" data-prob="2" data-impact="2" data-label="Collision X" data-level="high" data-owner="RSSI"></div>
      <div class="risk-item" data-prob="2" data-impact="2" data-label="Collision Y" data-level="medium" data-owner="DPO"></div>
      <div class="risk-item" data-prob="2" data-impact="2" data-label="Collision Z" data-level="low" data-owner="QA"></div>
      <div class="risk-item" data-prob="2" data-impact="2" data-label="Collision W" data-level="low" data-owner="Ops"></div>
      <div class="risk-item" data-prob="1" data-impact="1" data-label="Injection<script>" data-level="alert(1)" data-owner="&lt;img onerror=alert(1)&gt;"></div>
    </div>
  `;
}

function defaultAxesHtml() {
  return `
    <div class="risk-matrix">
      <div class="risk-item" data-prob="1" data-impact="1" data-label="R" data-level="low"></div>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  const matrix = document.querySelector('.risk-matrix');
  return { window, document, matrix };
}

describe('initRiskMatrix -- construction DOM', () => {
  it('retire tous les .risk-item du DOM et construit .risk-matrix-wrap + grille size x size', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    expect(matrix.querySelectorAll('.risk-item').length).toBe(0);
    expect(matrix.querySelector('.risk-matrix-wrap')).not.toBeNull();
    expect(matrix.querySelectorAll('.risk-cell').length).toBe(9); // size=3 -> 3x3
    expect(matrix.querySelectorAll('.risk-row-label').length).toBe(3);
    expect(matrix.querySelectorAll('.risk-col-label').length).toBe(3);
  });

  it('les axes reprennent data-label-x/data-label-y du conteneur', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    expect(matrix.querySelector('.risk-axis-x').textContent).toBe('Impact →');
    expect(matrix.querySelector('.risk-axis-y').textContent).toBe('Probabilité ↑');
  });

  it('sans data-label-x/y ni data-size -- defauts Impact/Probabilité et grille 5x5', () => {
    const { window, matrix } = setup(defaultAxesHtml());
    window.__initRiskMatrix();
    expect(matrix.querySelector('.risk-axis-x').textContent).toBe('Impact →');
    expect(matrix.querySelector('.risk-axis-y').textContent).toBe('Probabilité ↑');
    expect(matrix.querySelectorAll('.risk-cell').length).toBe(25);
  });
});

describe('initRiskMatrix -- points (.risk-dot) ARIA + contenu', () => {
  it('chaque dot recoit role=button, tabindex=0, aria-label "label — niveau X"', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = Array.from(matrix.querySelectorAll('.risk-dot')).find(
      (d) => d.dataset.riskLabel === 'Risque critique A'
    );
    expect(dot.getAttribute('role')).toBe('button');
    expect(dot.getAttribute('tabindex')).toBe('0');
    expect(dot.getAttribute('aria-label')).toBe('Risque critique A — niveau Critique');
  });

  it('le texte du dot = initiales du label (2 mots -> 2 lettres, 1 mot -> 2 premieres lettres)', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const critique = Array.from(matrix.querySelectorAll('.risk-dot')).find(
      (d) => d.dataset.riskLabel === 'Risque critique A'
    );
    expect(critique.textContent).toBe('RC');
  });

  it('data-level invalide/XSS est neutralise en "medium" (regression #758)', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const injected = Array.from(matrix.querySelectorAll('.risk-dot')).find(
      (d) => d.dataset.riskLabel === 'Injection<script>'
    );
    expect(injected.dataset.riskLevel).toBe('medium');
    expect(injected.getAttribute('data-level')).toBe('medium');
    expect(injected.getAttribute('aria-label')).toBe('Injection<script> — niveau Moyen');
  });

  it('collision (4 items sur la meme case) -- 3 dots max + badge overflow "+1" aria-hidden', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const cell = Array.from(matrix.querySelectorAll('.risk-cell')).find(
      (c) => c.querySelectorAll('.risk-dot:not(.risk-dot-overflow)').length > 0 &&
             c.querySelector('.risk-dot-overflow')
    );
    expect(cell.querySelectorAll('.risk-dot:not(.risk-dot-overflow)').length).toBe(3);
    const overflow = cell.querySelector('.risk-dot-overflow');
    expect(overflow.textContent).toBe('+1');
    expect(overflow.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('initRiskMatrix -- tooltip hover/focus', () => {
  it('mouseenter affiche le tooltip (classe visible) avec le badge du niveau', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="critical"]');
    dot.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true, clientX: 10, clientY: 10 }));
    const tooltip = document.querySelector('.risk-tooltip');
    expect(tooltip.classList.contains('visible')).toBe(true);
    expect(tooltip.querySelector('.risk-tooltip-badge').classList.contains('critical')).toBe(true);
    expect(tooltip.querySelector('.risk-tooltip-badge').textContent).toBe('Critique');
  });

  it('mouseleave masque le tooltip', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="critical"]');
    dot.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true, clientX: 10, clientY: 10 }));
    dot.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
    expect(document.querySelector('.risk-tooltip').classList.contains('visible')).toBe(false);
  });

  it('focus clavier affiche aussi le tooltip (parite a11y hover/focus)', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="critical"]');
    dot.dispatchEvent(new window.FocusEvent('focus', { bubbles: false }));
    expect(document.querySelector('.risk-tooltip').classList.contains('visible')).toBe(true);
  });
});

describe('initRiskMatrix -- ouverture du detail (modal)', () => {
  it('un clic sur un dot ouvre window.__openModal avec titre + table niveau/probabilite/impact/responsable', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="critical"]');
    fireClick(window, dot);
    const dialog = document.getElementById('ds-dynamic-modal');
    expect(dialog).not.toBeNull();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('.modal-header h3').textContent).toBe('Risque critique A');
    const bodyText = dialog.querySelector('.modal-body').textContent;
    expect(bodyText).toContain('Critique');
    expect(bodyText).toContain('3 / 3'); // probabilite / size
    expect(bodyText).toContain('CTO');
  });

  it('Entree/Espace sur un dot ouvrent le meme detail que le clic', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="critical"]');
    fireKeydown(window, dot, 'Enter');
    expect(document.getElementById('ds-dynamic-modal').querySelector('.modal-header h3').textContent).toBe(
      'Risque critique A'
    );
  });

  it('owner/detail contenant du HTML sont echappes dans la table du modal (pas d-injection)', () => {
    const { window, document, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    const dot = matrix.querySelector('.risk-dot[data-risk-level="medium"][data-risk-label="Injection<script>"]');
    fireClick(window, dot);
    const dialog = document.getElementById('ds-dynamic-modal');
    expect(dialog.querySelector('script')).toBeNull();
    expect(dialog.querySelector('img[onerror]')).toBeNull();
    expect(dialog.querySelector('.modal-body').innerHTML).toContain('&lt;img');
  });
});

describe('initRiskMatrix -- idempotence', () => {
  it('un second appel initRiskMatrix() ne reconstruit pas la matrice (data-bound)', () => {
    const { window, matrix } = setup(matrixHtml());
    window.__initRiskMatrix();
    window.__initRiskMatrix();
    expect(matrix.querySelectorAll('.risk-matrix-wrap').length).toBe(1);
  });
});
