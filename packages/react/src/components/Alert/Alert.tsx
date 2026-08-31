import { forwardRef, HTMLAttributes, ReactNode } from "react";

/**
 * Variantes sémantiques de `.alert` (`shared/css/components/alerts.css:8-11`).
 */
/**
 * `"neutral"` (#923) : variante NON sémantique — pour un indicateur qui ne
 * signale rien (un compteur à zéro). Sans elle, `variant` retombait sur
 * `"info"` et peignait en couleur d'état une information qui n'en est pas une.
 * Le défaut reste `"info"` : aucun consommateur existant ne bouge.
 */
export type AlertVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "info" */
  variant?: AlertVariant;
  /**
   * `.alert--kpi` — variante « indicateur chiffré » (ex-`zone-banner`, #519).
   * Layout vertical (`display:block`, border-left 4px) — composer avec
   * `AlertTitle`/`AlertValue`/`AlertDesc` (`pages/feedback.html` #zone-banner).
   */
  kpi?: boolean;
  /**
   * `.alert--cta` — variante « incitation actionnable » (ex-`upgrade-prompt`,
   * #519). Composer avec `AlertIcon`/`AlertBody`(`AlertTitle`+`AlertDesc`+
   * `AlertActions`) (`pages/feedback.html` #upgrade-prompt).
   */
  cta?: boolean;
  children?: ReactNode;
}

/**
 * `Alert` — Design System msyx.fr (`pages/feedback.html` #alerts, #zone-banner,
 * #upgrade-prompt).
 *
 * Absorbe **trois** entrées du registre depuis #519 : `alert` (base), `zone-banner`
 * (`.alert--kpi`) et `upgrade-prompt` (`.alert--cta`) sont un seul composant CSS.
 * API retenue : **composition** via sous-composants slot (`AlertIcon`/`AlertTitle`/
 * `AlertBody`/`AlertDesc`/`AlertValue`/`AlertActions`) plutôt que des props dédiées
 * par variante — les classes de slot sont explicitement partagées entre `--kpi`
 * et `--cta` côté CSS (`alerts.css:13` « Slots optionnels (réutilisés par
 * .alert--kpi et .alert--cta) »), la composition évite de dupliquer une surface
 * de props par variante et reste cohérente avec le pattern déjà retenu pour
 * `CardMedia`/`CardThumb`/`CardBody` (#871).
 *
 * `role="alert"` par défaut uniquement pour `cta` (markup réel `feedback.html:337`
 * `role="alert"` sur les 3 démos `--cta`) — ni la démo simple (`feedback.html:20-23`)
 * ni `--kpi` (`feedback.html:179-198`) ne portent ce rôle dans le markup réel.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = "info", kpi, cta, role, className, children, ...rest },
  ref,
) {
  const classes = [
    "alert",
    `alert-${variant}`,
    kpi && "alert--kpi",
    cta && "alert--cta",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      role={role ?? (cta ? "alert" : undefined)}
      {...rest}
    >
      {children}
    </div>
  );
});
Alert.displayName = "Alert";

export interface AlertIconProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/**
 * `AlertIcon` — pictogramme décoratif en tête d'`Alert` (simple ou `cta`).
 * Émet `.alert-icon`. `aria-hidden="true"` par défaut (icône décorative
 * accompagnée de texte, cf. `feedback.html:338` sur la variante `cta`).
 */
export function AlertIcon({
  className,
  children,
  "aria-hidden": ariaHidden,
  ...rest
}: AlertIconProps) {
  const classes = ["alert-icon", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden={ariaHidden ?? true} {...rest}>
      {children}
    </span>
  );
}
AlertIcon.displayName = "AlertIcon";

export interface AlertTitleProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** `AlertTitle` — slot titre, réutilisé par `kpi` et `cta`. Émet `.alert-title`. */
export function AlertTitle({ className, children, ...rest }: AlertTitleProps) {
  const classes = ["alert-title", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AlertTitle.displayName = "AlertTitle";

export interface AlertDescProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** `AlertDesc` — slot description, réutilisé par `kpi` et `cta`. Émet `.alert-desc`. */
export function AlertDesc({ className, children, ...rest }: AlertDescProps) {
  const classes = ["alert-desc", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AlertDesc.displayName = "AlertDesc";

export interface AlertValueProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** `AlertValue` — valeur chiffrée mise en avant, propre à `kpi`. Émet `.alert-value`. */
export function AlertValue({ className, children, ...rest }: AlertValueProps) {
  const classes = ["alert-value", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AlertValue.displayName = "AlertValue";

export interface AlertBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * `AlertBody` — enveloppe `AlertTitle`/`AlertDesc`/`AlertActions`, propre à `cta`
 * (`feedback.html:339`). Émet `.alert-body`.
 */
export function AlertBody({ className, children, ...rest }: AlertBodyProps) {
  const classes = ["alert-body", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AlertBody.displayName = "AlertBody";

export interface AlertActionsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** `AlertActions` — rangée de boutons d'action, propre à `cta`. Émet `.alert-actions`. */
export function AlertActions({
  className,
  children,
  ...rest
}: AlertActionsProps) {
  const classes = ["alert-actions", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AlertActions.displayName = "AlertActions";
