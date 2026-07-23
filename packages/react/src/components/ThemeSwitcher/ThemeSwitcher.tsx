import { useId } from "react";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { DEFAULT_THEME_CONFIG, useTheme, type ThemeConfig } from "./useTheme";

export interface ThemeSwitcherProps {
  /** Config des thèmes disponibles (défaut : `DEFAULT_THEME_CONFIG` — msyx/acssi/nhood). */
  config?: ThemeConfig;
  /** Label du select (défaut : "Thème"). */
  label?: string;
}

/** Libellés lisibles des 3 thèmes officiels du DS (`THEME_LABELS`, `shared/components.js`). */
const THEME_LABELS: Record<string, string> = {
  msyx: "MSYX",
  acssi: "ACSSI",
  nhood: "Nhood",
};

/**
 * ThemeSwitcher — sélecteur de palette + interrupteur de mode, batteries-included.
 *
 * Compose `useTheme()` (moteur runtime : attributs `documentElement`,
 * persistance `localStorage['msyx-theme'|'msyx-mode']`, réconciliation
 * mono-mode) et `<ThemeToggle>` (émetteur du markup `.mode-switch` canonique)
 * pour reproduire `initThemeSwitcher`/`updateModeSwitch` (`shared/components.js`).
 *
 * Markup émis (`fondation.html` §theme-switcher / `shared/nav.js:111-116`) :
 * ```html
 * <div class="theme-switcher">
 *   <label class="theme-switcher-label">Thème</label>
 *   <select class="theme-switcher-select">
 *     <option value="msyx">MSYX</option>
 *     <option value="acssi">ACSSI</option>
 *     <option value="nhood">Nhood</option>
 *   </select>
 *   <button class="mode-switch [is-dark]" role="switch" aria-checked="true|false">…</button>
 * </div>
 * ```
 *
 * Il est recommandé d'ajouter le script anti-FOUC synchrone inline dans
 * `<head>` qui lit `msyx-theme`/`msyx-mode` et pose les attributs
 * `documentElement` avant le premier paint — évite le flash du thème par
 * défaut le temps que React hydrate/monte.
 */
export function ThemeSwitcher({
  config = DEFAULT_THEME_CONFIG,
  label,
}: ThemeSwitcherProps) {
  const id = useId();
  const { theme, mode, setTheme, toggleMode, isModeLocked } = useTheme(config);
  const themeNames = Object.keys(config);

  return (
    <div className="theme-switcher">
      <label className="theme-switcher-label" htmlFor={id}>
        {label ?? "Thème"}
      </label>
      <select
        className="theme-switcher-select"
        id={id}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        {themeNames.map((name) => (
          <option key={name} value={name}>
            {THEME_LABELS[name] ?? name}
          </option>
        ))}
      </select>
      <ThemeToggle
        mode={mode}
        onToggle={toggleMode}
        disabled={isModeLocked}
        aria-disabled={isModeLocked || undefined}
      />
    </div>
  );
}

ThemeSwitcher.displayName = "ThemeSwitcher";
