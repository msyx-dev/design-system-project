// @msyx-dev/react — Icon (INTERNE, #713)
//
// Primitif d'icône SVG auto-contenu : inline directement les paths des glyphes
// du sprite Lucide self-hosted du DS (`shared/icons/sprite.svg`) au lieu de
// référencer `<use href="/shared/icons/sprite.svg#i-…">`. Objectif : rendre les
// composants React 100 % autonomes, sans dépendance à un sprite servi par
// l'app consommatrice (bug #713).
//
// INTERNE — non exporté depuis `index.ts`. Calqué sur le précédent
// `components/LoginScreen/ProviderIcons.tsx` (SVG inline + dispatcher).
//
// Source de vérité des paths : `shared/icons/sprite.svg` (viewBox 0 0 24 24,
// glyphes Lucide). Toute modification d'un glyphe côté sprite doit être
// répercutée ici.

import type { ReactElement, SVGProps } from "react";

/** Noms de glyphes disponibles (sans le préfixe `i-` du sprite). */
export type IconName =
  | "chevron-left"
  | "chevron-right"
  | "check"
  | "upload"
  | "file"
  | "folder"
  | "eye"
  | "eye-off"
  | "message-circle"
  | "sun"
  | "moon"
  | "bell";

/**
 * Enfants SVG de chaque glyphe — copie FIDÈLE des `<symbol id="i-…">` de
 * `shared/icons/sprite.svg` (viewBox commun `0 0 24 24`).
 */
const ICON_CHILDREN: Record<IconName, ReactElement> = {
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  upload: (
    <>
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </>
  ),
  file: (
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  eye: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </>
  ),
  "message-circle": (
    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  moon: (
    <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  ),
  bell: (
    <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Nom du glyphe (sans préfixe `i-`). */
  name: IconName;
}

/**
 * Icon — glyphe SVG inline auto-contenu (INTERNE, #713).
 *
 * Remplace `<svg class="icon"><use href="/shared/icons/sprite.svg#i-…"/></svg>`
 * par les paths inline du glyphe → supprime la dépendance à un sprite servi
 * par l'app consommatrice.
 *
 * - `className` défaut `"icon"` (`_base.css` : size + stroke/fill). Surchargeable
 *   (ex. `className="mode-switch-icon mode-switch-icon--sun"`).
 * - `fill`/`stroke`/`strokeWidth` posés en ATTRIBUTS de présentation
 *   (spécificité la plus faible) : pour `.icon`, la règle CSS les écrase →
 *   rendu identique au `<use>` d'origine ; pour un wrapper sans règle de trait
 *   (`.mode-switch-icon`), ils garantissent la visibilité du glyphe. Même
 *   approche que `ProviderIcons`.
 * - `...rest` passe-plat (`aria-hidden`, `width`, `height`, `aria-label`…).
 * - `data-icon={name}` : hook stable (remplace le fragment `#i-…`).
 */
export function Icon({
  name,
  className = "icon",
  ...rest
}: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      data-icon={name}
      {...rest}
    >
      {ICON_CHILDREN[name]}
    </svg>
  );
}

Icon.displayName = "Icon";
