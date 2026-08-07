// Tests -- initPieCharts (#744, vague 17/N couverture tests vanilla)
//
// Expose directement via window.__initPieCharts (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#charts) : .pie-chart >
// svg (existant dans le HTML) + .pie-legend. Variantes : pie (defaut),
// donut (.pie-chart--donut), mini (.pie-chart--mini, toujours rendu comme
// un donut -- cf. isDonutType = classList.contains('--donut') ||
// classList.contains('--mini') lu dans le source). Les segments/cercles
// SVG sont crees par window.__svg('path'|'circle', attrs), une fonction
// PAS definie dans components.js -- elle est fournie par un script inline
// des pages consumers (verifie par grep, absent de shared/components.js).
// On la stube ici comme le fait deja tests/vanilla/progress-tracker.test.js
// pour le meme motif (svgStub).
//
// Contrat testable prioritaire (demande explicitement dans le prompt) :
// les couleurs de serie DOIVENT venir des tokens CSS (--chart-1..5,
// --success/--warning/--danger/--info), jamais d'une valeur en dur. jsdom
// ne charge aucune feuille de style externe -- getComputedStyle() ne
// resout donc les custom properties QUE si on les pose explicitement en
// inline sur document.documentElement.style avant l'init (meme motif que
// tests/vanilla/virtual-list.test.js). On y pose des valeurs SENTINELLES
// non plausibles (rgb(1,2,3)...) : si resolveColor() retombait un jour sur
// un hex hardcode, l'assertion sur la valeur exacte du token le detecterait.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function svgStub(win) {
  return function (tag, attrs) {
    const el = win.document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  };
}

function pieHtml(values, labels, colors, extraClass) {
  return `
    <div class="pie-chart ${extraClass || ''}" data-values="${values}" data-labels="${labels}"${colors ? ` data-colors="${colors}"` : ''}>
      <svg viewBox="0 0 200 200" role="img" aria-labelledby="t1"><title id="t1">Repartition</title></svg>
      <div class="pie-legend"></div>
    </div>
  `;
}

const TOKENS = {
  '--chart-1': 'rgb(11,11,11)',
  '--chart-2': 'rgb(22,22,22)',
  '--chart-3': 'rgb(33,33,33)',
  '--chart-4': 'rgb(44,44,44)',
  '--chart-5': 'rgb(55,55,55)',
  '--success': 'rgb(101,101,101)',
  '--warning': 'rgb(102,102,102)',
  '--danger': 'rgb(103,103,103)',
  '--info': 'rgb(104,104,104)',
};

function setup(bodyHtml) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  window.__svg = svgStub(window);
  Object.keys(TOKENS).forEach((k) => {
    document.documentElement.style.setProperty(k, TOKENS[k]);
  });
  return { window, document };
}

// Replique EXACTE de describeArcPath() (shared/components.js) -- meme
// convention que CIRC_62 dans progress-tracker.test.js : le calcul
// trigonometrique est reproduit ici pour comparer bit-a-bit le 'd' produit,
// sans tester "sa propre implementation" au sens ou une regression sur la
// vraie formule (ex. inversion sin/cos, mauvais offset -90) ferait diverger
// les deux resultats et rougirait le test.
function describeArcPath(cx, cy, r, startAngle, endAngle) {
  const toRad = (a) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

describe('initPieCharts -- pie (secteurs), couleurs depuis les tokens', () => {
  it('cree un <path role="img"> par segment, avec aria-label "label: valeur"', () => {
    const { window, document } = setup(pieHtml('35,25,20,12,8', 'Frontend,Backend,Design,DevOps,QA'));
    window.__initPieCharts();
    const paths = document.querySelectorAll('.pie-chart svg .pie-segment');
    expect(paths.length).toBe(5);
    expect(paths[0].getAttribute('role')).toBe('img');
    expect(paths[0].getAttribute('aria-label')).toBe('Frontend: 35');
    expect(paths[4].getAttribute('aria-label')).toBe('QA: 8');
  });

  it("la couleur de chaque segment sans data-colors vient de --chart-N (N = index%5+1), jamais d'une valeur en dur", () => {
    const { window, document } = setup(pieHtml('10,10,10,10,10,10', 'A,B,C,D,E,F'));
    window.__initPieCharts();
    const paths = document.querySelectorAll('.pie-chart .pie-segment');
    // index 0..4 -> chart-1..5, puis index 5 (6e segment) revient a chart-1 (5%5+1=1)
    expect(paths[0].getAttribute('fill')).toBe(TOKENS['--chart-1']);
    expect(paths[1].getAttribute('fill')).toBe(TOKENS['--chart-2']);
    expect(paths[4].getAttribute('fill')).toBe(TOKENS['--chart-5']);
    expect(paths[5].getAttribute('fill')).toBe(TOKENS['--chart-1']);
  });

  it('data-colors="success,warning,danger" resout via le token semantique correspondant', () => {
    const { window, document } = setup(pieHtml('60,25,15', 'Conforme,En cours,Non conforme', 'success,warning,danger'));
    window.__initPieCharts();
    const paths = document.querySelectorAll('.pie-chart .pie-segment');
    expect(paths[0].getAttribute('fill')).toBe(TOKENS['--success']);
    expect(paths[1].getAttribute('fill')).toBe(TOKENS['--warning']);
    expect(paths[2].getAttribute('fill')).toBe(TOKENS['--danger']);
  });

  it('le d du path reproduit exactement la geometrie attendue (angles cumules, grand arc si >180deg)', () => {
    // total=300 : segment0 = 200/300*360 = 240deg (>180 -> large-arc=1),
    // segment1 = 100/300*360 = 120deg (<=180 -> large-arc=0)
    const { window, document } = setup(pieHtml('200,100', 'Big,Small'));
    window.__initPieCharts();
    const paths = document.querySelectorAll('.pie-chart .pie-segment');
    expect(paths[0].getAttribute('d')).toBe(describeArcPath(100, 100, 88, 0, 240));
    expect(paths[1].getAttribute('d')).toBe(describeArcPath(100, 100, 88, 240, 360));
  });

  it('legende : un item par segment (dot + texte du label), couleur du dot = couleur resolue du segment', () => {
    const { window, document } = setup(pieHtml('60,40', 'Oui,Non', 'success,danger'));
    window.__initPieCharts();
    const items = document.querySelectorAll('.pie-legend-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Oui');
    // style.background passe par le parseur CSSOM (normalise l'espacement
    // "rgb(a,b,c)" -> "rgb(a, b, c)") contrairement a un attribut SVG brut
    // (setAttribute) -- meme valeur logique, representation textuelle differente.
    expect(items[0].querySelector('.pie-legend-dot').style.background).toBe('rgb(101, 101, 101)');
    expect(items[1].textContent).toBe('Non');
  });

  it('survol d\'un item de legende attenue les autres segments (opacity 0.3 + classe dimmed), mouseleave restaure', () => {
    const { window, document } = setup(pieHtml('60,40', 'Oui,Non'));
    window.__initPieCharts();
    const items = document.querySelectorAll('.pie-legend-item');
    const paths = document.querySelectorAll('.pie-segment');
    items[0].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    expect(paths[0].style.opacity).toBe('1');
    expect(paths[1].style.opacity).toBe('0.3');
    expect(items[1].classList.contains('dimmed')).toBe(true);
    expect(items[0].classList.contains('dimmed')).toBe(false);
    items[0].dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
    expect(paths[0].style.opacity).toBe('1');
    expect(paths[1].style.opacity).toBe('1');
    expect(items[1].classList.contains('dimmed')).toBe(false);
  });

  it('les valeurs <= 0 ou NaN sont filtrees (segments non crees)', () => {
    const { window, document } = setup(pieHtml('50,0,-5,abc,30', 'A,B,C,D,E'));
    window.__initPieCharts();
    const paths = document.querySelectorAll('.pie-segment');
    expect(paths.length).toBe(2);
  });

  it('data-values absent/vide : aucun crash, aucun segment, mais dataset.bound quand meme pose (bind se fait avant le parse)', () => {
    const { window, document } = setup('<div class="pie-chart"><svg viewBox="0 0 200 200"></svg><div class="pie-legend"></div></div>');
    expect(() => window.__initPieCharts()).not.toThrow();
    const chart = document.querySelector('.pie-chart');
    expect(chart.dataset.bound).toBe('1');
    expect(chart.querySelectorAll('.pie-segment').length).toBe(0);
  });

  it('idempotence : un second appel ne double pas les segments (dataset.bound sur .pie-chart)', () => {
    const { window, document } = setup(pieHtml('60,40', 'Oui,Non'));
    window.__initPieCharts();
    window.__initPieCharts();
    expect(document.querySelectorAll('.pie-segment').length).toBe(2);
  });
});

describe('initPieCharts -- donut (cercles), geometrie stroke-dasharray/dashoffset', () => {
  it('cree un <circle role="img"> par segment avec stroke = couleur resolue', () => {
    const { window, document } = setup(pieHtml('60,25,15', 'Conforme,En cours,Non conforme', 'success,warning,danger', 'pie-chart--donut'));
    window.__initPieCharts();
    const circles = document.querySelectorAll('.pie-donut-segment');
    expect(circles.length).toBe(3);
    expect(circles[0].getAttribute('stroke')).toBe(TOKENS['--success']);
    expect(circles[0].getAttribute('fill')).toBe('none');
    expect(circles[0].getAttribute('role')).toBe('img');
    expect(circles[0].getAttribute('aria-label')).toBe('Conforme: 60');
  });

  it('stroke-width = 28 (donut plein) / 14 (mini), rayon 72 / 28', () => {
    const { window, document } = setup(pieHtml('50,50', 'A,B', null, 'pie-chart--donut'));
    window.__initPieCharts();
    const full = document.querySelector('.pie-donut-segment');
    expect(full.getAttribute('stroke-width')).toBe('28');
    expect(full.getAttribute('cx')).toBe('100');
    expect(full.getAttribute('r')).toBe('72');

    const { window: winMini, document: docMini } = setup(pieHtml('50,50', 'A,B', null, 'pie-chart--mini'));
    winMini.__initPieCharts();
    const mini = docMini.querySelector('.pie-donut-segment');
    expect(mini.getAttribute('stroke-width')).toBe('14');
    expect(mini.getAttribute('cx')).toBe('40');
    expect(mini.getAttribute('r')).toBe('28');
  });

  it('.pie-chart--mini SANS --donut est quand meme rendu en cercles (isDonutType inclut --mini)', () => {
    const { window, document } = setup(pieHtml('75,25', 'Done,Remaining', null, 'pie-chart--mini'));
    window.__initPieCharts();
    expect(document.querySelectorAll('.pie-donut-segment').length).toBe(2);
    expect(document.querySelectorAll('.pie-segment').length).toBe(0);
  });

  it('stroke-dasharray/stroke-dashoffset suivent exactement fraction et angle cumule', () => {
    const { window, document } = setup(pieHtml('60,25,15', 'A,B,C', null, 'pie-chart--donut'));
    window.__initPieCharts();
    const circles = document.querySelectorAll('.pie-donut-segment');
    const CIRC = 2 * Math.PI * 72;

    const [dash0, total0] = circles[0].getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(dash0).toBeCloseTo(0.6 * CIRC, 6);
    expect(total0).toBeCloseTo(CIRC, 6);
    expect(Number(circles[0].getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRC, 6);

    const dash1 = Number(circles[1].getAttribute('stroke-dasharray').split(' ')[0]);
    expect(dash1).toBeCloseTo(0.25 * CIRC, 6);
    // offsetAngle apres segment0 = 216deg -> dashOffset1 = CIRC*(1-216/360) = CIRC*0.4
    expect(Number(circles[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRC * 0.4, 6);

    const dash2 = Number(circles[2].getAttribute('stroke-dasharray').split(' ')[0]);
    expect(dash2).toBeCloseTo(0.15 * CIRC, 6);
    // offsetAngle apres segment1 = 306deg -> dashOffset2 = CIRC*(1-306/360) = CIRC*0.15
    expect(Number(circles[2].getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRC * 0.15, 6);
  });

  it('idempotence donut : un second appel ne double pas les cercles', () => {
    const { window, document } = setup(pieHtml('50,50', 'A,B', null, 'pie-chart--donut'));
    window.__initPieCharts();
    window.__initPieCharts();
    expect(document.querySelectorAll('.pie-donut-segment').length).toBe(2);
  });
});
