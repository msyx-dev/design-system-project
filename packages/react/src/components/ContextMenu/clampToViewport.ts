/**
 * Marge minimale (px) entre le menu et le bord du viewport.
 * Parité stricte avec `initContextMenu` (`shared/components.js` L2397-2400).
 */
export const VIEWPORT_MARGIN = 8;

export interface ClampToViewportInput {
  /** Coordonnée X du clic (`event.clientX`). */
  x: number;
  /** Coordonnée Y du clic (`event.clientY`). */
  y: number;
  /** Largeur mesurée du menu (`offsetWidth`). */
  menuWidth: number;
  /** Hauteur mesurée du menu (`offsetHeight`). */
  menuHeight: number;
  /** Largeur du viewport (`window.innerWidth`). */
  viewportWidth: number;
  /** Hauteur du viewport (`window.innerHeight`). */
  viewportHeight: number;
  /** Marge de sécurité. @default VIEWPORT_MARGIN (8) */
  margin?: number;
}

export interface ViewportPosition {
  left: number;
  top: number;
}

/**
 * Position `position: fixed` d'un menu contextuel, bornée au viewport.
 *
 * Fonction PURE (aucun accès DOM) — reproduction ligne à ligne de
 * `showMenu()` (`shared/components.js` L2394-2400), y compris **l'ordre** des
 * bornes : d'abord le débordement bas/droite, ensuite le plancher `margin`.
 * Cet ordre garantit qu'un menu plus grand que le viewport reste collé au
 * bord haut/gauche (et non poussé hors écran).
 */
export function clampToViewport({
  x,
  y,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  margin = VIEWPORT_MARGIN,
}: ClampToViewportInput): ViewportPosition {
  let left = x;
  let top = y;

  if (left + menuWidth > viewportWidth - margin) {
    left = viewportWidth - menuWidth - margin;
  }
  if (top + menuHeight > viewportHeight - margin) {
    top = viewportHeight - menuHeight - margin;
  }
  if (left < margin) left = margin;
  if (top < margin) top = margin;

  return { left, top };
}
