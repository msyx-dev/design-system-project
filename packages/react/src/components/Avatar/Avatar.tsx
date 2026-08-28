import { forwardRef, HTMLAttributes, ReactNode } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatusValue = "online" | "busy" | "offline";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "md" */
  size?: AvatarSize;
  /** `.avatar-gradient` — fond `--gradient-1`. */
  gradient?: boolean;
  /**
   * Pastille de statut — enveloppe l'avatar dans `.avatar-status.{status}`
   * (`avatars.css`, compound `.avatar-status.online/.busy/.offline`).
   */
  status?: AvatarStatusValue;
  /** Image — rendue via `.avatar-img` (`object-fit:cover`), prioritaire sur `children`. */
  src?: string;
  alt?: string;
  children?: ReactNode;
}

/**
 * `Avatar` — Design System msyx.fr (`pages/composants.html` #avatars).
 * Émet `.avatar .avatar-{size}` (+`.avatar-gradient` si `gradient`), optionnellement
 * enveloppé dans `.avatar-status.{status}`.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { size = "md", gradient, status, src, alt, className, children, ...rest },
  ref,
) {
  const classes = [
    "avatar",
    `avatar-${size}`,
    gradient && "avatar-gradient",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = src ? (
    <img className="avatar-img" src={src} alt={alt ?? ""} />
  ) : (
    children
  );

  const avatar = (
    <div ref={ref} className={classes} {...rest}>
      {content}
    </div>
  );

  if (status) {
    return <div className={`avatar-status ${status}`}>{avatar}</div>;
  }

  return avatar;
});
Avatar.displayName = "Avatar";

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * `AvatarGroup` — pile d'avatars superposés (`.avatar-group .avatar { margin-left:-8px }`).
 *
 * Composant à part plutôt qu'une prop de `Avatar` : `.avatar-group` est un
 * conteneur de PLUSIEURS `Avatar` frères (le CSS cible `.avatar-group .avatar`,
 * un sélecteur descendant, jamais l'avatar lui-même) — modéliser ça comme une
 * prop sur `Avatar` obligerait chaque enfant à connaître son appartenance au
 * groupe. Un composant conteneur reflète directement la relation 1-groupe/N-avatars
 * du CSS, à l'identique du couple `CardMedia`/`CardThumb`/`CardBody` de ce même lot.
 */
export function AvatarGroup({
  className,
  children,
  ...rest
}: AvatarGroupProps) {
  const classes = ["avatar-group", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AvatarGroup.displayName = "AvatarGroup";
