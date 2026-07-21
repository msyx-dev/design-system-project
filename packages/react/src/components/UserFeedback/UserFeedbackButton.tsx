// @msyx-dev/react — UserFeedbackButton (#694)
//
// Bouton icône déclencheur du feedback utilisateur, destiné à être placé par
// chaque app consommatrice dans son header (à côté de la cloche notifications
// / du UserMenu). Contrat figé en groom parent — voir issue #694 commentaire
// "🔒 Contrat figé".

import type { ReactNode } from "react";
import { useUserFeedback } from "./UserFeedbackProvider";

export interface UserFeedbackButtonProps {
  /** aria-label du bouton — défaut « Donner un feedback ». */
  label?: string;
  /**
   * Icône affichée dans le bouton — défaut icône DS via le sprite Lucide
   * self-hosted (`i-message-circle`). Le contrat évoque "message-square" à
   * titre d'exemple mais ce glyphe n'existe pas dans `shared/icons/sprite.svg` ;
   * `i-message-circle` est l'équivalent le plus proche disponible.
   */
  icon?: ReactNode;
  className?: string;
  /**
   * Override optionnel. Fourni ⇒ le consumer pilote le clic (contrôlé),
   * `openFeedback()` n'est alors PAS appelé automatiquement. Absent ⇒
   * comportement non-contrôlé par défaut : appelle `useUserFeedback().openFeedback()`.
   * Convention contrôlé/non-contrôlé alignée sur `UserMenu`
   * (`components/UserMenu/UserMenu.tsx`).
   */
  onClick?: () => void;
}

const DEFAULT_LABEL = "Donner un feedback";

function DefaultIcon() {
  return (
    <svg className="icon" aria-hidden="true">
      <use href="/shared/icons/sprite.svg#i-message-circle" />
    </svg>
  );
}

/**
 * UserFeedbackButton — Déclencheur du feedback utilisateur (#694).
 *
 * **Zéro CSS nouveau** : émet le markup canonique du bouton-cloche header —
 * `<button class="header-notification btn-icon">` (`layout.css`
 * `.header-notification` + `buttons.css` `.btn-icon`), classes existantes
 * réutilisées à l'identique, aucune classe DS créée pour ce composant.
 *
 * Doit être rendu à l'intérieur d'un `<UserFeedbackProvider>` (#692) — sans
 * quoi `useUserFeedback()` lève une erreur explicite. Par défaut appelle
 * `openFeedback()` du contexte ; `onClick` fourni bascule en mode contrôlé
 * (le consumer pilote entièrement le clic).
 *
 * A11y : `aria-haspopup="dialog"` (la cible est la `UserFeedbackModal` #693,
 * pas un menu) + `aria-expanded` reflète `isOpen` du contexte. La fermeture
 * (Échap, bouton close, submit) est intégralement gérée par la Modal — ce
 * bouton ne fait qu'ouvrir.
 */
export function UserFeedbackButton({
  label = DEFAULT_LABEL,
  icon,
  className,
  onClick,
}: UserFeedbackButtonProps) {
  const { isOpen, openFeedback } = useUserFeedback();

  const classes = ["header-notification", "btn-icon", className]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }
    openFeedback();
  }

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={handleClick}
    >
      {icon ?? <DefaultIcon />}
    </button>
  );
}

UserFeedbackButton.displayName = "UserFeedbackButton";
