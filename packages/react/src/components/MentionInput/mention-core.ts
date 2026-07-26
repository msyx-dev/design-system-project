/**
 * Fonctions PURES de <MentionInput> — aucune dépendance DOM, testables en Node.
 *
 * Pourquoi cette séparation : jsdom renvoie 0 pour toutes les mesures de layout
 * (`offsetTop`, `offsetLeft`, `offsetHeight`, `getBoundingClientRect`). Tout ce
 * qui est calculable sans layout vit ici et est testé unitairement — même
 * pattern que `shared/graph/render/viewport.js` (`clampZoom`, `zoomAt`,
 * `userToWorld`, testés par `tests/regression/graph-viewport.test.js`).
 * Seule `caret-position.ts` lit de vrais offsets : elle n'est pas testable en
 * valeur, uniquement en effet de bord.
 *
 * Portage 1:1 de `initMentionInput` / `getCaretCoordinates`
 * (`shared/components.js:5589-5806`).
 */
import type { ReactNode } from "react";

/* ─── Token @ ──────────────────────────────────────────────────────────── */

export interface MentionToken {
  /** Index du `@` dans la valeur (inclus). */
  start: number;
  /** Index de fin (= position du caret, exclu). */
  end: number;
  /** Texte saisi après le `@` (peut être vide). */
  query: string;
}

/**
 * Regex du vanilla, à l'identique (`components.js:5760`) : un `@` en début de
 * chaîne ou précédé d'un blanc, suivi de `\w*` jusqu'au caret.
 * Limite connue héritée : `\w` = `[A-Za-z0-9_]` — pas d'accents, pas d'espace
 * (cf. défaut V4 du groom). NE PAS « améliorer » ici : ce serait un écart
 * CSS↔React unilatéral.
 */
const TOKEN_RE = /(?:^|\s)@(\w*)$/;

export function detectMentionToken(
  value: string,
  caret: number,
): MentionToken | null {
  const textBefore = value.slice(0, caret);
  const match = TOKEN_RE.exec(textBefore);
  if (!match) return null;
  const query = match[1];
  return { start: caret - query.length - 1, end: caret, query };
}

/* ─── Suggestions ─────────────────────────────────────────────────────── */

export interface MentionSuggestionObject {
  /** Valeur insérée dans le texte (après le `@`) et remontée à `onSelect`. */
  value: string;
  /** Libellé affiché ; si absent, `value`. Un label non-texte n'est pas surligné. */
  label?: ReactNode;
}

export type MentionSuggestions = string[] | MentionSuggestionObject[];

export interface NormalizedMention {
  value: string;
  label: ReactNode;
  searchText: string;
}

export function normalizeSuggestion(
  suggestion: string | MentionSuggestionObject,
): NormalizedMention {
  if (typeof suggestion === "string") {
    return { value: suggestion, label: suggestion, searchText: suggestion };
  }
  const label = suggestion.label ?? suggestion.value;
  const searchText = typeof label === "string" ? label : suggestion.value;
  return { value: suggestion.value, label, searchText };
}

/** Filtre insensible à la casse — calque de `components.js:5766-5768`. */
export function filterMentions(
  items: NormalizedMention[],
  query: string,
): NormalizedMention[] {
  const q = query.toLowerCase();
  return items.filter((item) => item.searchText.toLowerCase().includes(q));
}

/* ─── Insertion ───────────────────────────────────────────────────────── */

export interface MentionInsertion {
  value: string;
  caret: number;
}

/**
 * Remplace `@{query}` par `@{mention} ` (espace final) et renvoie la position
 * de caret attendue — calque de `insertMention` (`components.js:5713-5726`).
 * PURE : n'écrit ni dans le DOM ni dans un state.
 */
export function applyMention(
  value: string,
  token: MentionToken,
  mention: string,
): MentionInsertion {
  const before = value.slice(0, token.start);
  const after = value.slice(token.end);
  const insertion = `@${mention} `;
  return {
    value: before + insertion + after,
    caret: before.length + insertion.length,
  };
}

/* ─── Miroir (partie pure du calcul de caret) ─────────────────────────── */

/**
 * Découpe utilisée par le mirror-div : le marqueur est TOUJOURS un caractère
 * (`.` de repli en fin de texte) pour garantir un rectangle mesurable —
 * comportement exact du vanilla (`components.js:5623-5627`).
 */
export function splitAroundCaret(
  value: string,
  caret: number,
): { before: string; marker: string; after: string } {
  const before = value.slice(0, caret);
  const rest = value.slice(caret);
  return { before, marker: rest.charAt(0) || ".", after: rest.slice(1) };
}

/** Propriétés clonées du textarea vers le miroir — liste du vanilla, ordre inclus. */
export const MIRROR_STYLE_PROPERTIES = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

export interface CaretRect {
  /** `offsetTop` BRUT du marqueur (scroll non déduit). */
  top: number;
  /** `offsetLeft` BRUT du marqueur (scroll non déduit). */
  left: number;
  height: number;
}

/**
 * Projette un rectangle de caret en style inline du dropdown.
 * PURE et testable : c'est ici que vivent la déduction du scroll et l'ajout de
 * la hauteur de ligne — l'équivalent exact de `components.js:5629-5633 + 5747-5748`,
 * mais sans aucune lecture DOM.
 */
export function caretRectToDropdownStyle(
  rect: CaretRect,
  scrollTop: number,
  scrollLeft: number,
): { top: string; left: string } {
  return {
    top: `${rect.top - scrollTop + rect.height}px`,
    left: `${rect.left - scrollLeft}px`,
  };
}
