// Tests -- MarkdownEditor vanilla (#854)
//
// Deux blocs distincts :
//   1. le RENDU (renderMarkdownInto) est verrouille par le corpus PARTAGE
//      tests/fixtures/markdown-cases.json, que la suite React rejoue a
//      l'identique. Une divergence entre les deux = deux rendus differents pour
//      un meme contenu selon la techno du consumer.
//   2. l'EDITION (toolbar, raccourcis) est specifique au vanilla.
//
// La securite n'est pas un filtre mais une whitelist par CONSTRUCTION :
// renderMarkdownInto ne cree que p/br/strong/em/ul/ol/li/a et met tout le reste
// en createTextNode. Les cas « SECURITE » du corpus le verrouillent.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES = JSON.parse(
  readFileSync(path.resolve(__dirname, '../fixtures/markdown-cases.json'), 'utf8'),
).cases;

function editorHtml(value = '') {
  return `
    <div class="markdown-editor">
      <div class="markdown-toolbar" role="toolbar" aria-label="Mise en forme">
        <button type="button" class="btn-icon" data-md="bold" aria-label="Gras">B</button>
        <button type="button" class="btn-icon" data-md="italic" aria-label="Italique">I</button>
        <button type="button" class="btn-icon" data-md="ul" aria-label="Liste a puces">&#8226;</button>
        <button type="button" class="btn-icon" data-md="ol" aria-label="Liste numerotee">1.</button>
        <button type="button" class="btn-icon" data-md="link" aria-label="Lien">&#128279;</button>
      </div>
      <textarea class="markdown-input" aria-label="Contenu Markdown">${value}</textarea>
      <div class="markdown-preview prose" aria-live="polite"></div>
    </div>
  `;
}

function setup(value = '') {
  const dom = loadComponentsWindow(editorHtml(value));
  const { window } = dom;
  const { document } = window;
  window.__initMarkdownEditor();
  const root = document.querySelector('.markdown-editor');
  const textarea = root.querySelector('.markdown-input');
  const preview = root.querySelector('.markdown-preview');
  const btn = (name) => root.querySelector(`[data-md="${name}"]`);
  const type = (v) => {
    textarea.value = v;
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  return { window, document, root, textarea, preview, btn, type };
}

describe('renderMarkdownInto -- corpus partage avec React (#854)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  CASES.forEach((testCase) => {
    it(`rend « ${testCase.name} » a l'identique`, () => {
      const { window, document } = ctx;
      const container = document.createElement('div');
      window.__renderMarkdownInto(container, testCase.markdown);
      expect(container.innerHTML).toBe(testCase.html);
    });
  });

  it("ne cree JAMAIS d'autre element que la whitelist p/br/strong/em/ul/ol/li/a", () => {
    const { window, document } = ctx;
    const container = document.createElement('div');
    // Toutes les entrees du corpus concatenees : aucune ne doit produire un
    // element hors whitelist, quelle que soit leur combinaison.
    window.__renderMarkdownInto(
      container,
      CASES.map((c) => c.markdown).join('\n\n'),
    );
    const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A']);
    const tags = Array.from(container.querySelectorAll('*')).map((el) => el.tagName);
    expect(tags.filter((t) => !allowed.has(t))).toEqual([]);
  });

  it("le rendu est complet a chaque frappe (aucun residu du contenu precedent)", () => {
    const { preview, type } = ctx;
    type('**gras**');
    expect(preview.querySelector('strong')).not.toBeNull();
    type('juste du texte');
    expect(preview.querySelector('strong')).toBeNull();
    expect(preview.textContent).toBe('juste du texte');
  });
});

describe('MarkdownEditor vanilla -- toolbar (#854)', () => {
  it('gras enveloppe la selection et replace le curseur SUR le contenu, pas sur les marqueurs', () => {
    const { window, textarea, btn } = setup('bonjour monde');
    textarea.setSelectionRange(8, 13); // « monde »
    fireClick(window, btn('bold'));
    expect(textarea.value).toBe('bonjour **monde**');
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('monde');
  });

  it('sans selection, gras insere un texte de remplacement selectionne', () => {
    const { window, textarea, btn } = setup('');
    fireClick(window, btn('bold'));
    expect(textarea.value).toBe('**gras**');
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('gras');
  });

  it('italique utilise un seul asterisque', () => {
    const { window, textarea, btn } = setup('mot');
    textarea.setSelectionRange(0, 3);
    fireClick(window, btn('italic'));
    expect(textarea.value).toBe('*mot*');
  });

  it('liste a puces prefixe chaque ligne de la selection', () => {
    const { window, textarea, btn } = setup('un\ndeux');
    textarea.setSelectionRange(0, 7);
    fireClick(window, btn('ul'));
    expect(textarea.value).toBe('- un\n- deux');
  });

  it('re-cliquer sur liste a puces n empile pas les marqueurs', () => {
    const { window, textarea, btn } = setup('- un\n- deux');
    textarea.setSelectionRange(0, 11);
    fireClick(window, btn('ul'));
    expect(textarea.value).toBe('- un\n- deux');
  });

  it('liste numerotee numerote les lignes', () => {
    const { window, textarea, btn } = setup('un\ndeux');
    textarea.setSelectionRange(0, 7);
    fireClick(window, btn('ol'));
    expect(textarea.value).toBe('1. un\n2. deux');
  });

  it("le lien s'insere DANS le champ (jamais de window.prompt) avec une URL a completer", () => {
    const { window, textarea, btn } = setup('msyx');
    textarea.setSelectionRange(0, 4);
    fireClick(window, btn('link'));
    expect(textarea.value).toBe('[msyx](https://)');
  });

  it("chaque action de la toolbar met l'apercu a jour", () => {
    const { window, preview, textarea, btn } = setup('monde');
    textarea.setSelectionRange(0, 5);
    fireClick(window, btn('bold'));
    expect(preview.querySelector('strong')?.textContent).toBe('monde');
  });
});

describe('MarkdownEditor vanilla -- raccourcis clavier (#854)', () => {
  it('Ctrl+B met en gras', () => {
    const { window, textarea } = setup('mot');
    textarea.setSelectionRange(0, 3);
    fireKeydown(window, textarea, 'b', { ctrlKey: true });
    expect(textarea.value).toBe('**mot**');
  });

  it('Cmd+I met en italique (macOS)', () => {
    const { window, textarea } = setup('mot');
    textarea.setSelectionRange(0, 3);
    fireKeydown(window, textarea, 'i', { metaKey: true });
    expect(textarea.value).toBe('*mot*');
  });

  it('Ctrl+K insere un lien', () => {
    const { window, textarea } = setup('mot');
    textarea.setSelectionRange(0, 3);
    fireKeydown(window, textarea, 'k', { ctrlKey: true });
    expect(textarea.value).toBe('[mot](https://)');
  });

  it("une frappe ordinaire n'est jamais interceptee", () => {
    const { window, textarea } = setup('mot');
    fireKeydown(window, textarea, 'b');
    expect(textarea.value).toBe('mot');
  });
});

describe('MarkdownEditor vanilla -- idempotence SPA (#854)', () => {
  it('reappeler initMarkdownEditor() ne double pas les listeners (dataset.bound)', () => {
    const { window, textarea, btn } = setup('mot');
    window.__initMarkdownEditor();
    textarea.setSelectionRange(0, 3);
    fireClick(window, btn('bold'));
    // Double-bind => '****mot****'
    expect(textarea.value).toBe('**mot**');
  });
});
