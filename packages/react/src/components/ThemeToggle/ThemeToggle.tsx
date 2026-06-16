import { ButtonHTMLAttributes } from "react";

export interface ThemeToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "role"
> {
  /** Mode courant — "dark" ou "light". Contrôle la position du thumb, la classe .is-dark et aria-checked. */
  mode: "dark" | "light";
  /** Callback appelé au clic pour basculer le mode. */
  onToggle: () => void;
  /** Label accessible optionnel (override auto-généré). */
  label?: string;
}

/**
 * ThemeToggle — Bascule dark/light du Design System msyx.fr.
 *
 * Émet le markup canonique `.mode-switch` (layout.css, iOS-style 56×32) :
 * ```html
 * <button class="mode-switch [is-dark]" role="switch" aria-checked="true|false" aria-label="…">
 *   <span class="mode-switch-track">
 *     <svg class="mode-switch-icon mode-switch-icon--sun" aria-hidden="true" width="14" height="14">
 *       <use href="/shared/icons/sprite.svg#i-sun" />
 *     </svg>
 *     <svg class="mode-switch-icon mode-switch-icon--moon" aria-hidden="true" width="14" height="14">
 *       <use href="/shared/icons/sprite.svg#i-moon" />
 *     </svg>
 *     <span class="mode-switch-thumb"></span>
 *   </span>
 * </button>
 * ```
 *
 * Le composant est SANS état interne — le parent gère `mode` et `onToggle`.
 * L'état dark est piloté par la classe `.is-dark` (prop `mode`), plus par `[data-mode]`.
 * Sémantique a11y : `aria-checked="true"` === mode DARK actif (#382).
 *
 * ⚠️ Dépendance sprite : les icônes sun/moon sont rendues via
 * `<use href="/shared/icons/sprite.svg#i-sun|#i-moon">`. Le consumer
 * **doit servir** le sprite SVG du DS à `/shared/icons/sprite.svg`
 * (fourni par la distribution DS CSS), sinon les icônes seront vides.
 */
export function ThemeToggle({
  mode,
  onToggle,
  label,
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClick: _onClick,
  ...rest
}: ThemeToggleProps) {
  const isDark = mode === "dark";

  const computedLabel =
    label ?? (isDark ? "Passer en mode clair" : "Passer en mode sombre");

  const classes = ["mode-switch", isDark && "is-dark", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={computedLabel}
      className={classes}
      onClick={onToggle}
      {...rest}
    >
      <span className="mode-switch-track">
        <svg
          className="mode-switch-icon mode-switch-icon--sun"
          aria-hidden="true"
          width={14}
          height={14}
        >
          <use href="/shared/icons/sprite.svg#i-sun" />
        </svg>
        <svg
          className="mode-switch-icon mode-switch-icon--moon"
          aria-hidden="true"
          width={14}
          height={14}
        >
          <use href="/shared/icons/sprite.svg#i-moon" />
        </svg>
        <span className="mode-switch-thumb" />
      </span>
    </button>
  );
}

ThemeToggle.displayName = "ThemeToggle";
