import { ButtonHTMLAttributes } from "react";

export interface ThemeToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "role"
> {
  /** Mode courant — "dark" ou "light". Contrôle la position du thumb et aria-checked. */
  mode: "dark" | "light";
  /** Callback appelé au clic pour basculer le mode. */
  onToggle: () => void;
  /** Label accessible optionnel (override auto-généré). */
  label?: string;
}

/**
 * ThemeToggle — Bascule dark/light du Design System msyx.fr.
 *
 * Rendu HTML attendu par le DS :
 * ```html
 * <button class="theme-toggle" role="switch" aria-checked="true" aria-label="…">
 *   <span class="theme-toggle-track">
 *     <span class="theme-toggle-thumb"></span>
 *   </span>
 * </button>
 * ```
 *
 * Le composant est SANS état interne — le parent gère `mode` et `onToggle`.
 * La position du thumb (dark=gauche / light=droite) est pilotée par CSS via
 * `[data-mode="light"]` sur `<html>`, conformément à la convention DS.
 * Le consumer reste responsable de setter `data-mode` sur `<html>`.
 */
export function ThemeToggle({
  mode,
  onToggle,
  label,
  className,
  ...rest
}: ThemeToggleProps) {
  const isDark = mode === "dark";

  const computedLabel =
    label ?? (isDark ? "Passer en mode clair" : "Passer en mode sombre");

  const classes = ["theme-toggle", className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={computedLabel}
      className={classes}
      onClick={onToggle}
      {...rest}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}

ThemeToggle.displayName = "ThemeToggle";
