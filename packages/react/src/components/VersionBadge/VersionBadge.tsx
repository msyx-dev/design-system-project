import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from "react";

export interface VersionBadgeProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick"
  > {
  /**
   * Version courante (ex. "2.95.0"). Comparée par **égalité de chaîne** à
   * `localStorage[storageKey]` (aucun comparateur semver, calque
   * `initVersionNotes`). Requis (le vanilla early-return sans
   * `data-latest-version`, `components.js:6281`).
   */
  version: string;
  /**
   * Clé localStorage de la dernière version vue. Requis (early-return vanilla
   * sans `data-storage-key`).
   */
  storageKey: string;
  /**
   * Appelé au clic — à charge de l'app d'ouvrir SA PROPRE
   * `<Modal className="version-notes-dialog">`. Le composant ne bundle PAS la
   * modale (cf. JSDoc composition ci-dessous).
   */
  onOpen?: () => void;
  /** Label visible du badge — @default `v${version}`. */
  children?: ReactNode;
  /**
   * aria-label de base — @default `Notes de version, v${version}`. Augmenté de
   * `, nouveautés disponibles` quand la pastille est active (garde
   * `indexOf('nouveaut') === -1` pour ne jamais double-concaténer).
   */
  ariaLabel?: string;
  /** Classes additionnelles sur `.version-badge`. */
  className?: string;
}

/** Lecture localStorage SSR-safe — no-op silencieux si indisponible (SSR, mode privé, quota). */
function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Écriture localStorage SSR-safe — no-op silencieux si indisponible. */
function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible — no-op */
  }
}

/**
 * VersionBadge — Badge « notes de version » du Design System msyx.fr
 * (`overlays.html` #version-notes, calque `initVersionNotes` —
 * `shared/components.js:6274-6306`).
 *
 * Émet le markup canonique `.version-badge` (`components/version-notes.css`) :
 * ```html
 * <button class="version-badge version-badge--new" aria-label="Notes de version, v2.95.0, nouveautés disponibles">
 *   v2.95.0
 *   <span class="version-badge-dot" aria-hidden="true"></span>
 * </button>
 * ```
 *
 * **État critique — `.version-badge--new`** : UNIQUE classe d'état et seule
 * surface de bug. Le CSS révèle la pastille EXCLUSIVEMENT via cette classe
 * (`.version-badge-dot{display:none}` → `.version-badge--new .version-badge-dot{display:block}`,
 * `version-notes.css:40-42`). Analogue direct au bug `<ActionMenu>` `.open`
 * (#612) : sans la classe, la pastille reste invisible. Elle est posée quand
 * `localStorage[storageKey] !== version`.
 *
 * **Non-contrôlé, état interne `isNew`** : le suivi « version vue » est une
 * logique non-composable (localStorage, égalité de chaîne) — le seul état
 * interne légitime.
 * - SSR / 1er render : `isNew = false` → PAS de `.version-badge--new` (pastille
 *   cachée, coïncide avec l'anti-FOUC CSS → zéro flash, zéro mismatch
 *   d'hydratation). Aucune lecture localStorage au render.
 * - `useEffect` post-mount : `localStorage.getItem(storageKey) !== version`
 *   → `setIsNew(true)`.
 * - `onClick` : `localStorage.setItem(storageKey, version)` → `setIsNew(false)`
 *   → `onOpen?.()`.
 *
 * **aria-label** : recalculé depuis la base à chaque render (garde
 * `indexOf('nouveaut') === -1`) — pas de double-concaténation, reset à la base
 * quand la pastille disparaît (calque `components.js:6289-6303`).
 *
 * **Composition (hors composant)** : le port ne couvre QUE le badge. La modale
 * = `<Modal className="version-notes-dialog">` (Modal déjà porté, passe
 * `className` tel quel) ; le contenu = `<div className="version-notes"><div className="timeline">…</div></div>`
 * où l'app écrit ses propres `.timeline-item`. `.version-notes-dialog`
 * (largeur) et `.version-notes` (scroll `max-height:60vh`) sont des classes CSS
 * pures posées par l'app sur le `<Modal>` existant. Ne PAS re-wrapper une
 * `VersionNotesModal` — ce serait dupliquer `Modal`.
 *
 * SSR-safe : aucun accès `window`/`localStorage` en dehors du `useEffect` et du
 * handler de clic.
 */
export function VersionBadge({
  version,
  storageKey,
  onOpen,
  children,
  ariaLabel,
  className,
  type = "button",
  ...rest
}: VersionBadgeProps) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setIsNew(safeGetItem(storageKey) !== version);
  }, [storageKey, version]);

  function handleClick() {
    safeSetItem(storageKey, version);
    setIsNew(false);
    onOpen?.();
  }

  const baseLabel = ariaLabel ?? `Notes de version, v${version}`;
  const computedLabel =
    isNew && baseLabel.indexOf("nouveaut") === -1
      ? `${baseLabel}, nouveautés disponibles`
      : baseLabel;

  const classes = [
    "version-badge",
    isNew ? "version-badge--new" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      aria-label={computedLabel}
      onClick={handleClick}
      {...rest}
    >
      {children ?? `v${version}`}
      <span className="version-badge-dot" aria-hidden="true" />
    </button>
  );
}

VersionBadge.displayName = "VersionBadge";
