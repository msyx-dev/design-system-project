import { cloneElement, ReactElement, ReactNode, useId } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Contenu de l'infobulle — rendu dans le `<span class="tooltip" role="tooltip">`. */
  content: ReactNode;
  /**
   * Position de l'infobulle par rapport au déclencheur.
   * `top` (défaut) = base `.tooltip` sans modifier ; les autres ajoutent
   * `.tooltip--bottom/left/right`.
   * @default "top"
   */
  position?: TooltipPosition;
  /** id du tip — sinon généré via `useId`. Sert de cible à `aria-describedby`. */
  id?: string;
  /** Classes additionnelles sur `.tooltip-wrap`. */
  className?: string;
  /**
   * Le déclencheur — un unique élément React (bouton, lien, badge focusable…).
   * Cloné pour recevoir `aria-describedby` pointant sur le tip. Son nœud DOM
   * racine doit propager les props (OK avec `<Button>` DS et éléments natifs).
   */
  children: ReactElement;
}

/**
 * Tooltip — Infobulle au survol/focus du Design System msyx.fr
 * (`overlays.html` #tooltip, calque `initTooltipsARIA` —
 * `shared/components.js:321-338`).
 *
 * Émet le markup canonique `.tooltip-wrap` (`components/overlays.css:4-19`) :
 * ```html
 * <div class="tooltip-wrap">
 *   <button aria-describedby="tooltip-xxx">Hover moi</button>
 *   <span id="tooltip-xxx" role="tooltip" class="tooltip">Info rapide</span>
 * </div>
 * ```
 *
 * **Visibilité 100% CSS** : `.tooltip-wrap:hover` / `:focus-within` bascule
 * `opacity 0→1` (`overlays.css:18-19`). Il n'y a AUCUN état runtime, aucune
 * classe togglée, aucun handler — donc rien à assérer côté état dynamique.
 * Le piège `.open`/`.active` (bug ActionMenu #612) ne s'applique PAS ici :
 * le CSS n'écoute aucune classe d'ouverture. Ne PAS introduire d'état `open`
 * contrôlé (le click-to-show riche relève de `Popover`/`ConfirmPopover`).
 *
 * **Position** = variant statique, pas un état : `top` (défaut) est la base
 * `.tooltip` SANS classe modifier ; `bottom`/`left`/`right` ajoutent
 * `.tooltip--{position}` (repositionne le tip + inverse la flèche `::after`).
 *
 * **Valeur ajoutée du wrapper** = exactement ce que faisait `initTooltipsARIA` :
 * génération d'un id (`useId`) + câblage `aria-describedby` sur le déclencheur
 * (via `cloneElement`) + `role="tooltip"` sur le tip. Un `aria-describedby`
 * déjà présent sur le déclencheur est préservé (fusionné, pas écrasé).
 *
 * **Non-goals** (identiques au vanilla, hors scope du port) : pas de flip/
 * collision (positions fixes, clipping possible en bord de viewport), pas de
 * retour à la ligne (`white-space: nowrap` — contenu long déborde).
 *
 * SSR-safe : aucun accès à `window`/`document` (visibilité déléguée au CSS).
 */
export function Tooltip({
  content,
  position = "top",
  id,
  className,
  children,
}: TooltipProps) {
  const generatedId = useId();
  const tipId = id ?? generatedId;

  const existingDescribedBy = (children.props as { "aria-describedby"?: string })[
    "aria-describedby"
  ];
  const describedBy = existingDescribedBy
    ? `${existingDescribedBy} ${tipId}`
    : tipId;

  const wrapClasses = ["tooltip-wrap", className].filter(Boolean).join(" ");
  const tipClasses = [
    "tooltip",
    position !== "top" ? `tooltip--${position}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClasses}>
      {cloneElement(children, { "aria-describedby": describedBy })}
      <span id={tipId} role="tooltip" className={tipClasses}>
        {content}
      </span>
    </div>
  );
}

Tooltip.displayName = "Tooltip";
