import {
  MIRROR_STYLE_PROPERTIES,
  splitAroundCaret,
  type CaretRect,
} from "./mention-core";

/**
 * Mesure la position du caret d'un textarea via la technique du « mirror-div » :
 * un div fantôme hors-écran clone les styles calculés du textarea, reçoit le
 * texte jusqu'au caret + un span marqueur, dont on lit les offsets.
 * Portage de `getCaretCoordinates` (`shared/components.js:5589-5638`).
 *
 * ⚠️ SEULE fonction non testable en valeur du composant : jsdom renvoie 0 pour
 * `offsetTop`/`offsetLeft`/`offsetHeight`. Les tests se limitent à : ne throw
 * pas, et le miroir est bien retiré du DOM. Tout le reste du calcul est pur
 * (`mention-core.ts`).
 *
 * Écart ASSUMÉ avec le vanilla : `try/finally` autour de la lecture — le
 * vanilla ne retire le miroir qu'en chemin nominal et laisse un `<div>`
 * fantôme dans `<body>` en cas d'exception (défaut V5 du groom, non corrigé
 * côté vanilla dans cette PR).
 */
export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): CaretRect {
  const doc = textarea.ownerDocument;
  const view = doc.defaultView;
  const div = doc.createElement("div");
  const style = div.style as unknown as Record<string, string>;

  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "-9999px";
  style.left = "-9999px";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";

  if (view) {
    const computed = view.getComputedStyle(textarea) as unknown as Record<
      string,
      string
    >;
    for (const prop of MIRROR_STYLE_PROPERTIES) {
      const val = computed[prop];
      if (val != null) style[prop] = val;
    }
  }

  const { before, marker, after } = splitAroundCaret(textarea.value, position);
  div.textContent = before;

  const span = doc.createElement("span");
  span.textContent = marker;
  div.appendChild(span);
  div.appendChild(doc.createTextNode(after));

  doc.body.appendChild(div);
  try {
    return {
      top: span.offsetTop,
      left: span.offsetLeft,
      height: span.offsetHeight,
    };
  } finally {
    div.remove();
  }
}
