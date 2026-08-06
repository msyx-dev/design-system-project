// Tests -- initLightbox (#744, vague 7/N couverture tests vanilla)
//
// Expose individuellement : window.__initLightbox(). Markup repris de
// pages/divers.html#lightbox (classes/attrs reels : .lightbox-gallery
// [data-lightbox-group] > .lightbox-trigger [data-full][data-caption]).
// L'overlay (#lb-overlay) et son contenu (#lb-img-wrap, #lb-close,
// #lb-prev/#lb-next, #lb-caption, #lb-counter) sont CREES par le JS
// lui-meme au premier appel -- on les recupere APRES __initLightbox(), pas
// dans le markup de depart (`data-full="#"` reproduit le mode placeholder
// utilise en demo, sans vraie image).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function galleryHtml() {
  return `
    <div class="lightbox-gallery" data-lightbox-group="gallery-1">
      <div class="lightbox-trigger" data-full="#" data-caption="Premiere image" tabindex="0" aria-label="Ouvrir l'image 1">
        <div class="lightbox-thumb-placeholder" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);">Premiere</div>
      </div>
      <div class="lightbox-trigger" data-full="#" data-caption="Deuxieme image" tabindex="0" aria-label="Ouvrir l'image 2">
        <div class="lightbox-thumb-placeholder" style="background:linear-gradient(135deg,#06b6d4,#3b82f6);">Deuxieme</div>
      </div>
      <div class="lightbox-trigger" data-full="#" data-caption="Troisieme image" tabindex="0" aria-label="Ouvrir l'image 3">
        <div class="lightbox-thumb-placeholder" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">Troisieme</div>
      </div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(galleryHtml());
  const { window } = dom;
  const { document } = window;
  window.__initLightbox();
  const triggers = Array.from(document.querySelectorAll('.lightbox-trigger'));
  const overlay = document.getElementById('lb-overlay');
  const btnClose = document.getElementById('lb-close');
  const btnPrev = document.getElementById('lb-prev');
  const btnNext = document.getElementById('lb-next');
  const caption = document.getElementById('lb-caption');
  const counter = document.getElementById('lb-counter');
  const imgWrap = document.getElementById('lb-img-wrap');
  return { window, document, triggers, overlay, btnClose, btnPrev, btnNext, caption, counter, imgWrap };
}

describe('initLightbox', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("le clic sur un declencheur ouvre l'overlay, focus le bouton fermer, affiche legende + compteur", () => {
    const { window, document, triggers, overlay, btnClose, caption, counter } = ctx;
    fireClick(window, triggers[0]);
    expect(overlay.classList.contains('lb-open')).toBe(true);
    expect(document.activeElement).toBe(btnClose);
    expect(caption.textContent).toBe('Premiere image');
    expect(counter.textContent).toBe('1 / 3');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('sur la 1ere image, le bouton precedent est masque, le bouton suivant visible', () => {
    const { window, triggers, btnPrev, btnNext } = ctx;
    fireClick(window, triggers[0]);
    expect(btnPrev.classList.contains('lb-hidden')).toBe(true);
    expect(btnNext.classList.contains('lb-hidden')).toBe(false);
  });

  it('le bouton suivant navigue vers l image suivante (legende + compteur + les 2 boutons redeviennent visibles)', () => {
    const { window, triggers, btnNext, btnPrev, caption, counter } = ctx;
    fireClick(window, triggers[0]);
    fireClick(window, btnNext);
    expect(caption.textContent).toBe('Deuxieme image');
    expect(counter.textContent).toBe('2 / 3');
    expect(btnPrev.classList.contains('lb-hidden')).toBe(false);
    expect(btnNext.classList.contains('lb-hidden')).toBe(false);
  });

  it('sur la derniere image, le bouton suivant est masque ; naviguer au-dela ne fait rien (garde de borne)', () => {
    const { window, triggers, btnNext, caption } = ctx;
    fireClick(window, triggers[2]); // ouvre directement sur la 3e
    expect(btnNext.classList.contains('lb-hidden')).toBe(true);
    fireClick(window, btnNext); // au-dela de la derniere image -> no-op
    expect(caption.textContent).toBe('Troisieme image');
  });

  it('ArrowRight/ArrowLeft navigue au clavier quand l overlay est ouvert', () => {
    const { window, document, triggers, caption } = ctx;
    fireClick(window, triggers[0]);
    fireKeydown(window, document, 'ArrowRight');
    expect(caption.textContent).toBe('Deuxieme image');
    fireKeydown(window, document, 'ArrowLeft');
    expect(caption.textContent).toBe('Premiere image');
  });

  it('Echap referme l overlay et restaure le scroll du body', () => {
    const { window, document, triggers, overlay } = ctx;
    fireClick(window, triggers[0]);
    fireKeydown(window, document, 'Escape');
    expect(overlay.classList.contains('lb-open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('le clic sur le bouton fermer referme l overlay', () => {
    const { window, triggers, overlay, btnClose } = ctx;
    fireClick(window, triggers[0]);
    fireClick(window, btnClose);
    expect(overlay.classList.contains('lb-open')).toBe(false);
  });

  it("le clic sur le fond de l'overlay (hors image) referme, le clic DANS l'image ne referme pas", () => {
    const { window, triggers, overlay, imgWrap } = ctx;
    fireClick(window, triggers[0]);
    fireClick(window, imgWrap);
    expect(overlay.classList.contains('lb-open')).toBe(true);
    fireClick(window, overlay);
    expect(overlay.classList.contains('lb-open')).toBe(false);
  });

  it("Entree/Espace sur un declencheur au clavier ouvre l'overlay sur la bonne image", () => {
    const { window, triggers, overlay, caption } = ctx;
    fireKeydown(window, triggers[1], 'Enter');
    expect(overlay.classList.contains('lb-open')).toBe(true);
    expect(caption.textContent).toBe('Deuxieme image');
  });

  it("reste idempotent : un second appel de __initLightbox() ne recree pas l'overlay ni ne double-bind les declencheurs", () => {
    const { window, document, triggers, overlay, caption } = ctx;
    window.__initLightbox(); // 2e appel
    expect(document.querySelectorAll('#lb-overlay')).toHaveLength(1);
    fireClick(window, triggers[0]);
    expect(overlay.classList.contains('lb-open')).toBe(true);
    expect(caption.textContent).toBe('Premiere image');
  });
});
