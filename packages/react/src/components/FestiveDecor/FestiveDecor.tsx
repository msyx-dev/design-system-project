// @msyx-dev/react — FestiveDecor (#950)
//
// Décor saisonnier du thème `noel` : neige, guirlande, ornements suspendus,
// givre, sapin. Portage React de `ensureFestiveDecor()` / `updateFestiveDecor()`
// (`shared/nav.js`), qui reste la source de vérité du comportement ; le CSS est
// celui de `shared/css/components/festive.css` — zéro classe créée, zéro règle
// réécrite (`prefers-reduced-motion` est déjà couvert globalement par `_a11y.css`).
//
// Quatre pièges mesurés dans le code vanilla, traités ici :
//   1. `snowflake` n'existait pas dans <Icon> → glyphe reporté dans `Icon.tsx`
//      (jamais un `<use href="/shared/icons/sprite.svg#…">`, chemin absolu qui
//      n'existe pas chez le consommateur, cf. #713).
//   2. Le sapin est un SVG INLINE en JSX natif (`TreeNoel.tsx`), pas un `<img>` :
//      en `<img>` il est opaque au CSS (ni tokens du thème, ni `.tree-lights`).
//   3. Les `id` du SVG sont globaux au document → préfixés par `useId()`.
//   4. `msyx-festive` est partagée avec `nav.js` : seule la valeur littérale
//      `"off"` coupe la neige, une clé absente la laisse tomber (ON par défaut
//      depuis #946). Tout accès `localStorage` est dans un `try/catch`.

import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
} from "react";
import { Icon } from "../../icons/Icon";
import { TreeNoel } from "./TreeNoel";

/** Thème pour lequel le décor existe (`data-theme` de `<html>`). */
const FESTIVE_THEME = "noel";
/** Clé partagée avec `shared/nav.js` et `initFestiveDemo()` (`shared/components.js`). */
const STORAGE_KEY_FESTIVE = "msyx-festive";

const LABEL_SNOW_STOP = "Arrêter la neige";
const LABEL_SNOW_START = "Faire tomber la neige";

// --- Thème courant : lecture seule, vérité = attribut de <html> --------------
//
// `useTheme()` n'est PAS un point d'accroche viable ici : chaque appel porte son
// propre `useState`, aucun état n'est partagé entre instances. Le `setTheme`
// d'un `<ThemeSwitcher>` pose bien `data-theme`, mais le `useTheme()` d'un
// composant voisin ne le sait pas (il ne se resynchronise qu'au montage). Et
// l'appeler aurait un effet de bord indésirable pour un simple décor : au
// montage il RÉÉCRIT `data-theme`/`data-mode` depuis `localStorage`, ce qui
// écraserait le `data-theme="noel"` fixe d'un consommateur mono-thème.
// On lit donc l'attribut lui-même : c'est ce que fait `updateFestiveDecor()`
// et ce que le `ThemeSwitcher`, un script anti-FOUC ou un consommateur posent
// tous en dernier ressort.

function subscribeTheme(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getTheme(): string | null {
  return document.documentElement.getAttribute("data-theme");
}

/** Rendu serveur : rien. Le décor apparaît à l'hydratation, jamais de divergence. */
function getServerTheme(): string | null {
  return null;
}

/** `true` tant que `<html data-theme="noel">`. Réagit en direct au changement. */
function useFestiveActive(): boolean {
  return (
    useSyncExternalStore(subscribeTheme, getTheme, getServerTheme) ===
    FESTIVE_THEME
  );
}

// --- Préférence neige : clé `msyx-festive` ------------------------------------
//
// Asymétrie à reproduire À L'IDENTIQUE de `nav.js`
// (`localStorage.getItem('msyx-festive') === 'off'`) : la neige est ON par
// défaut, SEULE la valeur littérale "off" la coupe. Une clé absente, "on" ou
// toute autre valeur la laisse tomber. Un `=== 'on'` inversé ferait diverger
// une page React d'une page vanilla du même site.

const snowListeners = new Set<() => void>();

/**
 * Repli mémoire quand `localStorage` refuse l'écriture (mode privé, quota) :
 * sans lui le bouton resterait sans effet — or c'est le contrôle exigé par
 * WCAG 2.2.2 (Pause/Stop/Hide). `null` = le storage fait foi.
 */
let memorySnowOff: boolean | null = null;

function readSnowOff(): boolean {
  if (memorySnowOff !== null) return memorySnowOff;
  try {
    return window.localStorage.getItem(STORAGE_KEY_FESTIVE) === "off";
  } catch {
    // localStorage indisponible — comme nav.js : neige par défaut (ON).
    return false;
  }
}

function toggleSnow(): void {
  const next = readSnowOff() ? "on" : "off";
  let persisted = true;
  try {
    window.localStorage.setItem(STORAGE_KEY_FESTIVE, next);
  } catch {
    persisted = false;
  }
  memorySnowOff = persisted ? null : next === "off";
  snowListeners.forEach((listener) => listener());
}

function subscribeSnow(onChange: () => void): () => void {
  snowListeners.add(onChange);
  // Autre onglet / autre code qui écrit la clé : le storage refait foi.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY_FESTIVE) return;
    memorySnowOff = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    snowListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnowOff(): boolean {
  return false;
}

function useSnowOff(): boolean {
  return useSyncExternalStore(subscribeSnow, readSnowOff, getServerSnowOff);
}

// --- Composants ---------------------------------------------------------------

/** Nombre d'ampoules de la guirlande (`ensureFestiveDecor()`). */
const GARLAND_BULBS = 14;

/** Couleurs des ornements : tokens du thème actif, jamais de valeur en dur. */
const ORNAMENT_COLORS = [
  "var(--accent)",
  "var(--warning)",
  "var(--success)",
  "var(--deco-cyan)",
  "var(--deco-pink)",
  "var(--deco-violet)",
] as const;

/** Position horizontale (%) de chaque ornement. */
const ORNAMENT_LEFT = [8, 21, 34, 52, 66, 79, 92] as const;

/**
 * Rangs des ornements (1 à 3) : la géométrie d'un rang = tokens
 * `--ornament-{drop,size}-N` (tokens.css, #1042), source unique d'où dérive
 * aussi la réserve haute `--festive-top-clearance` (festive.css). Aucun px
 * ici ; le `top` d'une boule est posé par `.ornaments > .ornament` (CSS).
 */
const ORNAMENT_TIERS = 3;

function ornamentStyle(index: number): CSSProperties {
  const tier = (index % ORNAMENT_TIERS) + 1;
  return {
    "--ornament-color": ORNAMENT_COLORS[index % ORNAMENT_COLORS.length],
    "--i": String(index),
    "--ornament-drop": `var(--ornament-drop-${tier})`,
    "--ornament-size": `var(--ornament-size-${tier})`,
    left: `${ORNAMENT_LEFT[index]}%`,
  } as CSSProperties;
}

export interface FestiveDecorProps {
  /**
   * Autorise la neige (défaut `true`). `false` supprime la neige : le décor ne
   * garde alors que ses éléments statiques (guirlande, ornements, givre, sapin).
   *
   * La neige est la SEULE animation continue du décor, donc la seule à exiger
   * un contrôle d'arrêt (WCAG 2.2.2). Ce contrôle est `<FestiveSnowToggle>`,
   * monté par `<SiteHeader festive>`. Un consommateur qui monte `<FestiveDecor>`
   * SANS l'un ni l'autre doit passer `snow={false}`.
   */
  snow?: boolean;
}

/**
 * FestiveDecor — décor festif du thème Noël (#950).
 *
 * Ne rend **rien** hors `data-theme="noel"` et réagit en direct au changement
 * de thème (sans rechargement). Tout est `aria-hidden="true"` et `position:
 * fixed` (hors flux : le composant se monte à la racine de l'app sans
 * perturber la mise en page). La neige reste la nappe de gradients de
 * `festive.css` — aucun nœud DOM par flocon.
 *
 * À monter **une seule fois** par page. Ne pas l'imbriquer dans un ancêtre qui
 * porte `transform`, `filter` ou `backdrop-filter` (typiquement `.site-header`) :
 * un tel ancêtre devient le bloc conteneur des enfants `position: fixed` et le
 * décor se retrouverait cadré sur lui au lieu de la fenêtre. `<SiteHeader
 * festive>` le rend comme frère du `<header>`, pas comme enfant.
 */
export function FestiveDecor({
  snow = true,
}: FestiveDecorProps): ReactElement | null {
  const active = useFestiveActive();
  const snowOff = useSnowOff();

  if (!active) return null;

  const snowOn = snow && !snowOff;

  return (
    <>
      {snowOn && (
        <div className="snowfall" data-festive="snow" aria-hidden="true" />
      )}
      <ul
        className="garland garland--header"
        data-festive="garland"
        aria-hidden="true"
      >
        {Array.from({ length: GARLAND_BULBS }, (_, i) => (
          <li
            key={i}
            className="garland-bulb"
            style={{ "--i": String(i) } as CSSProperties}
          />
        ))}
      </ul>
      <div className="ornaments" data-festive="ornaments" aria-hidden="true">
        {ORNAMENT_LEFT.map((_, i) => (
          <div key={i} className="ornament" style={ornamentStyle(i)} />
        ))}
      </div>
      <div className="frost" data-festive="frost" aria-hidden="true" />
      <div className="festive-character" data-festive="tree" aria-hidden="true">
        <TreeNoel />
      </div>
    </>
  );
}

FestiveDecor.displayName = "FestiveDecor";

export interface FestiveSnowToggleProps {
  className?: string;
}

/**
 * FestiveSnowToggle — bouton flocon qui arrête / relance la neige (WCAG 2.2.2).
 *
 * Markup canonique du bouton-icône header (`.header-notification`, comme
 * `NotificationBell` et `UserFeedbackButton`). Ne rend rien hors `noel`.
 * `aria-pressed` reflète l'état de la neige ; `aria-label` bascule entre
 * « Arrêter la neige » (neige active) et « Faire tomber la neige ».
 * Partage la clé `msyx-festive` avec `nav.js` et avec `<FestiveDecor>`.
 */
export function FestiveSnowToggle({
  className,
}: FestiveSnowToggleProps): ReactElement | null {
  const active = useFestiveActive();
  const snowOff = useSnowOff();

  if (!active) return null;

  const snowOn = !snowOff;
  const classes = ["header-notification", className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={snowOn}
      aria-label={snowOn ? LABEL_SNOW_STOP : LABEL_SNOW_START}
      onClick={toggleSnow}
    >
      <Icon name="snowflake" aria-hidden="true" />
    </button>
  );
}

FestiveSnowToggle.displayName = "FestiveSnowToggle";
