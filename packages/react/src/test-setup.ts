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
