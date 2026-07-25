import "@testing-library/jest-dom/vitest";

// jsdom n'implémente pas HTMLDialogElement.showModal()/close() (cf.
// https://github.com/jsdom/jsdom/issues/3294). Polyfill minimal pour les
// composants basés sur <dialog> natif (ex. Modal, #454) : pose/retire
// l'attribut `open` et déclenche l'événement `close` comme le ferait un
// navigateur réel.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute("open")) return;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}

// jsdom n'implémente pas `SVGGraphicsElement.prototype.getScreenCTM()` (méthode
// absente, pas seulement no-op) — le moteur graph (`shared/graph/render/
// viewport.js` `screenToUser()`) a une branche défensive explicite pour ce cas
// (« env sans layout ») qui retombe sur les coordonnées écran telles quelles
// quand `getScreenCTM()` renvoie `null`. Sans ce polyfill, l'appel lève
// `TypeError: ... is not a function` (constaté sur `<Graph mode="edit">`,
// #677 I6-2 — création de nœud via la toolbar déclenche `_clientToWorld()`).
// Le polyfill retourne `null` : exactement la branche déjà prévue côté moteur,
// aucun comportement inventé.
if (typeof SVGGraphicsElement !== "undefined") {
  if (!SVGGraphicsElement.prototype.getScreenCTM) {
    SVGGraphicsElement.prototype.getScreenCTM = () => null;
  }
}
