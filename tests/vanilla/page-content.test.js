// Tests -- .page-content, contrat CSS de largeur (#859)
//
// `.page-content` est calibree pour du TEXTE : `--content-max: 72ch` est une
// mesure de LECTURE. Un `.data-grid` (min-width 640px) y part en defilement
// horizontal alors que l'ecran a de la place, et une colonne epinglee
// (`.data-grid-col-sticky-end`) recouvre alors les donnees en defilant.
// Aucune variante large n'existait, et la convention interdit au consommateur
// d'ecrire sa propre classe -- d'ou `.page-content--wide`.
//
// Ce fichier ne couvre que du CSS (aucun JS n'est attache a ce conteneur).
// Les assertions portent sur la SOURCE : jsdom resout les valeurs calculees
// mais PAS les custom properties -- `var(--content-max)` n'y est jamais
// substitue, une assertion de largeur resolue y serait vide de sens (meme
// raison que pour `dialog.modal-dialog`, #917). La largeur reellement rendue
// est verifiee au navigateur.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readCss = (rel) => readFileSync(path.resolve(__dirname, '../../shared/css', rel), 'utf8');
const LAYOUT_CSS_SOURCE = readCss('layout.css');
const TOKENS_CSS_SOURCE = readCss('tokens.css');

const ruleBodies = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[{}\\n])\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'g');
  const bodies = [];
  let match;
  while ((match = re.exec(css)) !== null) bodies.push(match[1]);
  return bodies;
};

describe('.page-content -- largeur par token (#859)', () => {
  it('la mesure typo reste le DEFAUT (aucune rupture pour les consumers existants)', () => {
    expect(TOKENS_CSS_SOURCE).toMatch(/--content-max:\s*72ch/);
    // 3 occurrences : la regle de base, puis les 2 paliers responsive qui ne
    // touchent QUE le padding. La largeur est declaree une seule fois.
    const bodies = ruleBodies(LAYOUT_CSS_SOURCE, '.page-content');
    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toMatch(/max-width:\s*var\(--content-max\)/);
    expect(bodies.filter((b) => /max-width/.test(b))).toHaveLength(1);
  });

  it('declare le token de la variante large', () => {
    expect(TOKENS_CSS_SOURCE).toMatch(/--content-max-wide:\s*1440px/);
  });

  it('la variante REMAPPE le token au lieu de redeclarer une max-width', () => {
    const [body] = ruleBodies(LAYOUT_CSS_SOURCE, '.page-content--wide');
    expect(body).toBeDefined();
    expect(body).toMatch(/--content-max:\s*var\(--content-max-wide\)/);
    // Le point du correctif : centrage, gouttieres et degagement bottom-nav
    // restent CEUX de `.page-content`. Toute propriete reecrite ici serait une
    // divergence a maintenir en double.
    expect(body).not.toMatch(/max-width|margin-inline|padding/);
  });

  it("n'introduit aucune media query en max-width (mobile-first)", () => {
    const wideRules = LAYOUT_CSS_SOURCE.split('\n')
      .filter((line) => line.includes('page-content--wide'));
    expect(wideRules.length).toBeGreaterThan(0);
    expect(LAYOUT_CSS_SOURCE).not.toMatch(/@media[^{]*max-width[^{]*\{[^}]*page-content--wide/);
  });
});
