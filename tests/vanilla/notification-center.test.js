// Tests -- initNotificationCenter (#744, vague 5/N infra tests vanilla)
//
// Expose directement via window.__initNotificationCenter
// (shared/components.js:4045). Markup repris de
// pages/overlays.html#notification-center (classes/attrs reels), reduit a
// 2 items non-lus + 1 lu pour lisibilite.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `
  <div class="notif-center">
    <button class="notif-trigger" aria-label="Notifications">
      <span class="notif-trigger-count">3</span>
    </button>
    <div class="notif-panel" role="dialog" aria-label="Centre de notifications">
      <div class="notif-panel-header">
        <span class="notif-panel-title">Notifications</span>
        <button class="notif-mark-all">Tout marquer lu</button>
      </div>
      <div class="notif-list">
        <div class="notif-item notif-item--unread" id="notif-1">
          <div class="notif-content">Mickael a deploye le projet</div>
          <button class="notif-read-btn" aria-label="Marquer comme lu">OK</button>
        </div>
        <div class="notif-item notif-item--unread" id="notif-2">
          <div class="notif-content">Claude a termine l issue</div>
          <button class="notif-read-btn" aria-label="Marquer comme lu">OK</button>
        </div>
        <div class="notif-item" id="notif-3">
          <div class="notif-content">Backup quotidien termine</div>
          <button class="notif-read-btn" aria-label="Marquer comme lu">OK</button>
        </div>
      </div>
    </div>
  </div>
`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initNotificationCenter();
  const center = document.querySelector('.notif-center');
  const trigger = center.querySelector('.notif-trigger');
  const panel = center.querySelector('.notif-panel');
  const badge = trigger.querySelector('.notif-trigger-count');
  const markAllBtn = center.querySelector('.notif-mark-all');
  const item1 = document.getElementById('notif-1');
  const item2 = document.getElementById('notif-2');
  const item3 = document.getElementById('notif-3');
  return { window, document, center, trigger, panel, badge, markAllBtn, item1, item2, item3 };
}

describe('initNotificationCenter', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it('affiche le compteur de non-lus au chargement (2 items --unread)', () => {
    const { badge } = ctx;
    expect(badge.textContent).toBe('2');
    expect(badge.style.display).not.toBe('none');
  });

  it("ouvre le panel au clic sur la cloche : .open presente + aria-expanded='true'", () => {
    const { window, trigger, panel } = ctx;
    expect(panel.classList.contains('open')).toBe(false);
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('un 2e clic sur la cloche referme le panel (toggle)', () => {
    const { window, trigger, panel } = ctx;
    fireClick(window, trigger);
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it("cliquer sur le bouton 'lu' d'un item retire --unread ET decremente le compteur", () => {
    const { window, item1, badge } = ctx;
    const readBtn = item1.querySelector('.notif-read-btn');
    fireClick(window, readBtn);
    expect(item1.classList.contains('notif-item--unread')).toBe(false);
    expect(badge.textContent).toBe('1');
  });

  it("cliquer directement sur un item non-lu le marque lu", () => {
    const { window, item2, badge } = ctx;
    fireClick(window, item2);
    expect(item2.classList.contains('notif-item--unread')).toBe(false);
    expect(badge.textContent).toBe('1');
  });

  it("'Tout marquer lu' retire --unread de TOUS les items et vide le badge", () => {
    const { window, markAllBtn, item1, item2, badge } = ctx;
    fireClick(window, markAllBtn);
    expect(item1.classList.contains('notif-item--unread')).toBe(false);
    expect(item2.classList.contains('notif-item--unread')).toBe(false);
    expect(badge.textContent).toBe('');
    expect(badge.style.display).toBe('none');
  });

  it('un clic en dehors du centre referme le panel', () => {
    const { window, document, trigger, panel } = ctx;
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);

    fireClick(window, document.body);

    expect(panel.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Echap referme le panel et restaure le focus sur la cloche', () => {
    const { window, document, trigger, panel } = ctx;
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);

    fireKeydown(window, document, 'Escape');

    expect(panel.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('reste idempotent : un second appel de __initNotificationCenter() ne double-bind pas (dataset.bound)', () => {
    const { window, trigger, panel, item1, badge } = ctx;
    window.__initNotificationCenter(); // 2e appel (simule une re-init SPA)

    const readBtn = item1.querySelector('.notif-read-btn');
    fireClick(window, readBtn);
    // Si double-bind, la decrementation du badge serait comptee 2x depuis
    // countUnread() (recalcul, pas un simple --), donc indetectable ici --
    // mais le toggle open/close, lui, serait immediatement referme par un
    // 2e handler de clic qui s'execute a la suite du 1er sur le MEME clic.
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    expect(badge.textContent).toBe('1');
  });
});
