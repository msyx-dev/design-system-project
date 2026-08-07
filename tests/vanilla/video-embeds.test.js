// Tests -- initVideoEmbeds (#744, vague 18/18 -- DERNIERE vague couverture tests vanilla)
//
// Expose directement via window.__initVideoEmbeds (shared/components.js).
// Markup repris de la demo reelle (pages/divers.html#video-embed) :
// .video-embed[data-src][aria-label] > .video-embed-overlay[role=button]
// (facade cliquable/clavier) -- au declenchement, un <iframe src=
// "{data-src}?autoplay=1"> est cree et ajoute a .video-embed, qui recoit la
// classe .loaded (le CSS masque alors l'overlay -- shared/css/components/
// media.css:377).
//
// FIX INLINE (#744 vague 18) : activate() ne se protegeait pas contre un
// second declenchement (ex. Entree au clavier PUIS clic, ou double-clic
// avant que le CSS `.loaded .video-embed-overlay{display:none}` ne masque
// reellement l'overlay -- l'ecouteur reste attache, jsdom ne bloque de
// toute facon jamais un dispatchEvent programmatique sur un element "cache"
// par CSS) : chaque declenchement ajoutait un NOUVEL <iframe> autoplay,
// empile sur le(s) precedent(s). Corrige par un garde `if (embed.classList.
// contains('loaded')) return;` en tete d'activate(), meme esprit que
// dataset.bound. Preuve par mutation ci-dessous (executee puis restauree,
// cf. rapport de PR).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function embedHtml({ src = 'https://www.youtube.com/embed/dQw4w9WgXcQ', ariaLabel = 'Lecteur video' } = {}) {
  return `
    <div class="video-embed" data-src="${src}" aria-label="${ariaLabel}">
      <div class="video-embed-overlay" role="button" tabindex="0" aria-label="Lancer la lecture">
        <div class="video-embed-play" aria-hidden="true">&#9654;</div>
      </div>
    </div>
  `;
}

function setup(html = embedHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    embed: document.querySelector('.video-embed'),
    overlay: document.querySelector('.video-embed-overlay'),
  };
}

describe('initVideoEmbeds -- activation au clic', () => {
  it('un clic sur l\'overlay pose .loaded et cree un <iframe> avec src+"?autoplay=1"', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    expect(embed.classList.contains('loaded')).toBe(true);
    const iframe = embed.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1');
  });

  it('l\'iframe recoit allowfullscreen, allow="autoplay; encrypted-media" et un title', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    const iframe = embed.querySelector('iframe');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('allow')).toBe('autoplay; encrypted-media');
    expect(iframe.getAttribute('title')).toBe('Lecteur video');
  });

  it('sans aria-label sur .video-embed, le title de l\'iframe replie sur "Video"', () => {
    const { window, embed, overlay } = setup(`
      <div class="video-embed" data-src="https://example.com/embed/x">
        <div class="video-embed-overlay" role="button" tabindex="0"></div>
      </div>
    `);
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    expect(embed.querySelector('iframe').getAttribute('title')).toBe('Video');
  });

  it('sans data-src -- aucun iframe n\'est cree, .loaded n\'est jamais pose', () => {
    const { window, embed, overlay } = setup(`
      <div class="video-embed" aria-label="Sans source">
        <div class="video-embed-overlay" role="button" tabindex="0"></div>
      </div>
    `);
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    expect(embed.querySelector('iframe')).toBeNull();
    expect(embed.classList.contains('loaded')).toBe(false);
  });
});

describe('initVideoEmbeds -- activation au clavier', () => {
  it('Entree sur l\'overlay active la lecture (meme resultat que le clic)', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireKeydown(window, overlay, 'Enter');
    expect(embed.classList.contains('loaded')).toBe(true);
    expect(embed.querySelector('iframe')).not.toBeNull();
  });

  it('Espace sur l\'overlay active la lecture', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireKeydown(window, overlay, ' ');
    expect(embed.classList.contains('loaded')).toBe(true);
  });

  it('une autre touche (ex. Tab) n\'active rien', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireKeydown(window, overlay, 'Tab');
    expect(embed.classList.contains('loaded')).toBe(false);
    expect(embed.querySelector('iframe')).toBeNull();
  });
});

describe('initVideoEmbeds -- sans .video-embed-overlay', () => {
  it('un .video-embed sans overlay ne plante pas l\'init et n\'empeche pas les autres embeds de fonctionner', () => {
    const { window, document } = setup(`
      <div class="video-embed" data-src="https://example.com/embed/no-overlay"></div>
      <div class="video-embed" data-src="https://example.com/embed/ok">
        <div class="video-embed-overlay" role="button" tabindex="0"></div>
      </div>
    `);
    expect(() => window.__initVideoEmbeds()).not.toThrow();
    const embeds = document.querySelectorAll('.video-embed');
    fireClick(window, embeds[1].querySelector('.video-embed-overlay'));
    expect(embeds[1].querySelector('iframe')).not.toBeNull();
    expect(embeds[0].querySelector('iframe')).toBeNull();
  });
});

describe('initVideoEmbeds -- FIX double-activation (#744 vague 18)', () => {
  it('un second declenchement (clic apres Entree) ne cree PAS un second <iframe>', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireKeydown(window, overlay, 'Enter');
    fireClick(window, overlay);
    expect(embed.querySelectorAll('iframe').length).toBe(1);
  });

  it('deux clics consecutifs ne creent qu\'un seul <iframe>', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    fireClick(window, overlay);
    expect(embed.querySelectorAll('iframe').length).toBe(1);
  });
});

describe('initVideoEmbeds -- idempotence', () => {
  it('un second appel initVideoEmbeds() ne double-bind pas l\'ecouteur (un seul iframe pour un seul clic)', () => {
    const { window, embed, overlay } = setup();
    window.__initVideoEmbeds();
    window.__initVideoEmbeds();
    fireClick(window, overlay);
    expect(embed.querySelectorAll('iframe').length).toBe(1);
  });
});
