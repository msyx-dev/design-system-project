import { useCallback, useEffect, useState } from "react";

/** Mode d'affichage clair/sombre. */
export type ThemeMode = "dark" | "light";

/** Configuration d'un thème unique : modes disponibles + mode par défaut. */
export interface ThemeModeConfig {
  modes: ThemeMode[];
  defaultMode: ThemeMode;
}

/** Configuration complète : une entrée par thème (clé = nom du thème). */
export type ThemeConfig = Record<string, ThemeModeConfig>;

const STORAGE_KEY_THEME = "msyx-theme";
const STORAGE_KEY_MODE = "msyx-mode";

/**
 * Config par défaut du DS msyx.fr — réplique `THEME_CONFIG`
 * (`shared/components.js:771-775`). Les 3 thèmes officiels sont dark+light.
 * Le mécanisme mono-mode (`modes: ['dark']` seul) est supporté ici mais
 * dormant côté DS vanilla — un consumer peut le déclencher en passant un
 * `config` custom à `useTheme()`.
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  msyx: { modes: ["dark", "light"], defaultMode: "dark" },
  acssi: { modes: ["dark", "light"], defaultMode: "dark" },
  nhood: { modes: ["dark", "light"], defaultMode: "dark" },
};

/** Nom de thème dérivé des clés de la config par défaut (msyx/acssi/nhood). */
export type ThemeName = keyof typeof DEFAULT_THEME_CONFIG;

const DEFAULT_THEME = "msyx";
const DEFAULT_MODE: ThemeMode = "dark";

export interface UseThemeReturn {
  /** Thème courant (clé de `config`). */
  theme: string;
  /** Mode courant. */
  mode: ThemeMode;
  /** Change le thème — pose l'attribut DOM, persiste, réconcilie le mode si besoin. */
  setTheme: (theme: string) => void;
  /** Change le mode — pose l'attribut DOM + persiste. */
  setMode: (mode: ThemeMode) => void;
  /** Bascule dark ⇄ light (no-op si `isModeLocked`). */
  toggleMode: () => void;
  /** Modes disponibles pour le thème courant. */
  availableModes: ThemeMode[];
  /** true si le thème courant n'a qu'un seul mode (toggle désactivé, mono-mode). */
  isModeLocked: boolean;
  /** Config effectivement utilisée (défaut ou override). */
  config: ThemeConfig;
}

function resolveThemeConfig(
  config: ThemeConfig,
  theme: string,
): ThemeModeConfig {
  return config[theme] ?? Object.values(config)[0];
}

function applyThemeAttr(theme: string) {
  if (typeof document === "undefined") return;
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function applyModeAttr(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (mode === DEFAULT_MODE) {
    document.documentElement.removeAttribute("data-mode");
  } else {
    document.documentElement.setAttribute("data-mode", mode);
  }
}

/** Attribut porté par `<html>` — source d'initialisation quand le storage est muet (#793). */
function readThemeAttr(): string | null {
  if (typeof document === "undefined") return null;
  // `getAttribute` rend "" pour `data-theme=""` — traité comme absent.
  return document.documentElement.getAttribute("data-theme") || null;
}

function readModeAttr(): ThemeMode | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.getAttribute("data-mode");
  return value === "dark" || value === "light" ? value : null;
}

function persist(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage indisponible (mode privé, quota…) — pas bloquant pour le runtime theming.
  }
}

/**
 * useTheme — moteur runtime du theme switching msyx.fr.
 *
 * Réplique le comportement de `applyThemeTransition`/`applyMode`
 * (`shared/components.js:778-834`) : 2 attributs `documentElement`
 * (`data-theme`, `data-mode` — retirés quand la valeur est le défaut implicite
 * `msyx`/`dark`), 2 clés localStorage (`msyx-theme`, `msyx-mode`), et
 * réconciliation automatique du mode si le nouveau thème ne le supporte pas
 * (bascule sur `config[theme].defaultMode`).
 *
 * SSR-safe : aucun accès `window`/`document`/`localStorage` pendant le rendu —
 * l'état initial est celui des defaults (`msyx`/`dark`), puis un `useEffect`
 * se resynchronise après montage selon la priorité
 * `localStorage` > attribut déjà porté par `<html>` > défaut (#793).
 * Un consumer mono-thème qui pose son `data-theme`/`data-mode` au boot sans
 * jamais écrire les clés de storage garde donc son thème après hydratation.
 */
export function useTheme(
  config: ThemeConfig = DEFAULT_THEME_CONFIG,
): UseThemeReturn {
  const [theme, setThemeState] = useState<string>(
    config[DEFAULT_THEME] ? DEFAULT_THEME : Object.keys(config)[0],
  );
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  // Resynchronisation post-montage depuis localStorage (SSR-safe).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let storedTheme: string | null = null;
    let storedMode: string | null = null;
    try {
      storedTheme = window.localStorage.getItem(STORAGE_KEY_THEME);
      storedMode = window.localStorage.getItem(STORAGE_KEY_MODE);
    } catch {
      return;
    }

    // Priorité d'initialisation : localStorage > attribut déjà porté par <html> > défaut.
    // Le DOM fait foi quand le storage est muet : un consumer mono-thème pose son
    // `data-theme` au boot et n'écrit jamais `msyx-theme` (pas de sélecteur de palette).
    // Sans ça, l'état initial `msyx` était appliqué au DOM depuis #785 et effaçait le
    // thème du consumer à l'hydratation (#793).
    const nextTheme =
      storedTheme && config[storedTheme]
        ? storedTheme
        : (readThemeAttr() ?? theme);
    const themeConfig = resolveThemeConfig(config, nextTheme);
    const requestedMode: ThemeMode =
      storedMode === "dark" || storedMode === "light"
        ? storedMode
        : (readModeAttr() ?? mode);
    const reconciledMode = themeConfig.modes.includes(requestedMode)
      ? requestedMode
      : themeConfig.defaultMode;

    // Applique au DOM en plus de l'état React — sans ça, React réconcilie
    // `data-theme`/`data-mode` à l'hydratation et efface ce que le script
    // anti-FOUC avait posé avant paint (#785).
    applyThemeAttr(nextTheme);
    applyModeAttr(reconciledMode);
    setThemeState(nextTheme);
    setModeState(reconciledMode);
    // Ne tourne qu'une fois, après le montage — pas de resync continue sur `config`/`theme`/`mode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback(
    (nextTheme: string) => {
      const themeConfig = resolveThemeConfig(config, nextTheme);
      applyThemeAttr(nextTheme);
      persist(STORAGE_KEY_THEME, nextTheme);
      setThemeState(nextTheme);

      if (!themeConfig.modes.includes(mode)) {
        applyModeAttr(themeConfig.defaultMode);
        persist(STORAGE_KEY_MODE, themeConfig.defaultMode);
        setModeState(themeConfig.defaultMode);
      }
    },
    [config, mode],
  );

  const setMode = useCallback((nextMode: ThemeMode) => {
    applyModeAttr(nextMode);
    persist(STORAGE_KEY_MODE, nextMode);
    setModeState(nextMode);
  }, []);

  const activeThemeConfig = resolveThemeConfig(config, theme);
  const availableModes = activeThemeConfig.modes;
  const isModeLocked = availableModes.length === 1;

  const toggleMode = useCallback(() => {
    if (isModeLocked) return;
    setMode(mode === "dark" ? "light" : "dark");
  }, [isModeLocked, mode, setMode]);

  return {
    theme,
    mode,
    setTheme,
    setMode,
    toggleMode,
    availableModes,
    isModeLocked,
    config,
  };
}
