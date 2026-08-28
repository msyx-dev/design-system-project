import { forwardRef, HTMLAttributes, ReactNode } from "react";

/**
 * Tailles de `.spinner` (`shared/css/components/feedback.css:48-51`).
 * @default "md"
 */
export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "md" */
  size?: SpinnerSize;
  /**
   * Libellé accessible par défaut (`aria-label`), ignoré si `aria-label` est
   * fourni explicitement. Registre : `example` documente
   * `role="status" aria-label="Chargement"` (`components-registry.json:954`).
   * @default "Chargement"
   */
  label?: string;
}

/**
 * `Spinner` — Design System msyx.fr (`pages/feedback.html` #spinners).
 *
 * Émet `.spinner .spinner-{sm,md,lg}`, toujours cumulés (jamais `.spinner`
 * seul). `role="status"` + `aria-label` par défaut (a11y baseline DS,
 * exemple canonique du registre), overridables via les props natives.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  function Spinner(
    {
      size = "md",
      label = "Chargement",
      role,
      className,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) {
    const classes = ["spinner", `spinner-${size}`, className]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={classes}
        role={role ?? "status"}
        aria-label={ariaLabel ?? label}
        {...rest}
      />
    );
  },
);
Spinner.displayName = "Spinner";

export interface SpinnerDotsProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "Chargement" */
  label?: string;
}

/**
 * `SpinnerDots` — variante 3 points rebondissants. Émet `.spinner-dots` +
 * 3 `<span>` internes (animation `dotBounce`, `feedback.css:53-55`) —
 * structure fixe, pas de children (markup réel `feedback.html:256`
 * `<span></span><span></span><span></span>`).
 */
export function SpinnerDots({
  label = "Chargement",
  role,
  className,
  "aria-label": ariaLabel,
  ...rest
}: SpinnerDotsProps) {
  const classes = ["spinner-dots", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role={role ?? "status"}
      aria-label={ariaLabel ?? label}
      {...rest}
    >
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
SpinnerDots.displayName = "SpinnerDots";

export interface LoadingBarProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "Chargement" */
  label?: string;
}

/**
 * `LoadingBar` — barre de progression indéterminée. Émet `.loading-bar`
 * (`feedback.html:260`). `role="progressbar"` par défaut (exemple canonique
 * du registre).
 */
export function LoadingBar({
  label = "Chargement",
  role,
  className,
  "aria-label": ariaLabel,
  ...rest
}: LoadingBarProps) {
  const classes = ["loading-bar", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role={role ?? "progressbar"}
      aria-label={ariaLabel ?? label}
      {...rest}
    />
  );
}
LoadingBar.displayName = "LoadingBar";

export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * `LoadingOverlay` — voile plein cadre (`position:absolute; inset:0`,
 * `feedback.css:60`) au-dessus d'un contenu en chargement. Le parent doit
 * être positionné (`position:relative`, cf. `feedback.html:271`
 * `style="position:relative;min-height:150px;"`) — responsabilité du
 * consommateur, pas de cette primitive. Émet `.loading-overlay`, contenu
 * libre (typiquement `<Spinner size="lg" />` + message, markup réel
 * `feedback.html:274-277`).
 */
export function LoadingOverlay({
  className,
  children,
  ...rest
}: LoadingOverlayProps) {
  const classes = ["loading-overlay", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
LoadingOverlay.displayName = "LoadingOverlay";
