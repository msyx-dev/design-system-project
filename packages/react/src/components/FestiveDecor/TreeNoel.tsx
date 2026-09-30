// @msyx-dev/react — TreeNoel (interne à FestiveDecor, #950)
//
// Sapin décoré du thème Noël, en **SVG inline (JSX natif)** — jamais un
// `<img src="…svg">`, jamais un `dangerouslySetInnerHTML`.
//
// Pourquoi inline : un SVG chargé en `<img>` est opaque au CSS de la page hôte —
// ni les tokens de couleur du thème ni l'animation `.tree-lights` de
// `festive.css` ne l'atteignent (mesure de `shared/nav.js` : 0 capture sur 4
// diffère en `<img>`, contre 4 sur 4 pour la guirlande). Bénéfice collatéral :
// `sync.sh` ne distribue aucun fichier de `assets/` (#954), une variante en
// `<img>` serait cassée chez le consommateur.
//
// Pourquoi `useId()` : les `id` d'un SVG (`tn-fol`, `tn-pot`, `tn-glow`,
// `tn-bauble`) sont **globaux au document** et référencés en `url(#…)`. Deux
// sapins montés dans la même page se disputeraient ces `id` et le second
// piocherait les dégradés du premier. Chaque instance préfixe donc les siens.
//
// Source de vérité du dessin : `ensureFestiveDecor()` de `shared/nav.js`
// (mêmes tracés, mêmes 11 lumières). Les couleurs des lumières sont des tokens
// du thème (`var(--accent, …)`), c'est ce qui les rend thémables.

import { useId, type ReactElement } from "react";

/** Lumières du sapin — rang = ordre du DOM (`.tree-lights circle:nth-child` dépend de cet ordre). */
const LIGHTS = [
  { cx: 72, cy: 92, r: 6, token: "--accent", fallback: "#ff4757" },
  { cx: 100, cy: 100, r: 6, token: "--warning", fallback: "#ffd250" },
  { cx: 128, cy: 90, r: 6, token: "--success", fallback: "#36e07f" },
  { cx: 58, cy: 158, r: 7, token: "--deco-cyan", fallback: "#56d4ff" },
  { cx: 90, cy: 170, r: 7, token: "--deco-pink", fallback: "#ff6fae" },
  { cx: 124, cy: 166, r: 7, token: "--deco-violet", fallback: "#b98cff" },
  { cx: 150, cy: 150, r: 7, token: "--accent", fallback: "#ff4757" },
  { cx: 48, cy: 232, r: 8, token: "--warning", fallback: "#ffd250" },
  { cx: 82, cy: 244, r: 8, token: "--success", fallback: "#36e07f" },
  { cx: 118, cy: 242, r: 8, token: "--deco-cyan", fallback: "#56d4ff" },
  { cx: 152, cy: 226, r: 8, token: "--deco-pink", fallback: "#ff6fae" },
] as const;

/**
 * Préfixe unique par instance. `useId()` renvoie `:r1:` (React 18) ou `«r1»`
 * (React 19) : ces délimiteurs sont des caractères délicats dans un
 * `url(#…)`, on ne garde que l'alphanumérique — deux instances restent
 * distinctes, l'unicité vient du compteur de React.
 */
function useSvgIdPrefix(): string {
  return `tn${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function TreeNoel(): ReactElement {
  const prefix = useSvgIdPrefix();
  const ids = {
    fol: `${prefix}-fol`,
    pot: `${prefix}-pot`,
    glow: `${prefix}-glow`,
    bauble: `${prefix}-bauble`,
  };

  return (
    <svg
      viewBox="0 0 200 300"
      width="100%"
      height="auto"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={ids.fol} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fa563"/>
          <stop offset=".55" stopColor="#1f7a44"/>
          <stop offset="1" stopColor="#0f4d2b"/>
        </linearGradient>
        <linearGradient id={ids.pot} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8433f"/>
          <stop offset="1" stopColor="#8d2422"/>
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0" stopColor="#fff6c2" stopOpacity=".95"/>
          <stop offset="1" stopColor="#ffd24f" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={ids.bauble} cx=".34" cy=".3">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".7"/>
          <stop offset=".45" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="292" rx="70" ry="9" fill="rgba(0,0,0,.22)"/>
      <path d="M74 252h52l-7 34a6 6 0 0 1-6 5H87a6 6 0 0 1-6-5z" fill={`url(#${ids.pot})`}/>
      <rect x="70" y="246" width="60" height="12" rx="4" fill="#d9534f"/>
      <rect x="70" y="250" width="60" height="4" fill="#ffd24f" opacity=".85"/>
      <rect x="88" y="236" width="24" height="18" fill="#6b4423"/>
      <path d="M100 128 L176 246 L165.1 255 L154.3 246 L143.4 255 L132.6 246 L121.7 255 L110.9 246 L100.0 255 L89.1 246 L78.3 255 L67.4 246 L56.6 255 L45.7 246 L34.9 255 L24.0 246 Z" fill={`url(#${ids.fol})`}/>
      <path d="M100 128 L176 246 L100 246 Z" fill="#000" opacity=".12"/>
      <path d="M100 74 L158 172 L148.3 181 L138.7 172 L129.0 181 L119.3 172 L109.7 181 L100.0 172 L90.3 181 L80.7 172 L71.0 181 L61.3 172 L51.7 181 L42.0 172 Z" fill={`url(#${ids.fol})`}/>
      <path d="M100 74 L158 172 L100 172 Z" fill="#000" opacity=".12"/>
      <path d="M100 26 L142 104 L133.6 113 L125.2 104 L116.8 113 L108.4 104 L100.0 113 L91.6 104 L83.2 113 L74.8 104 L66.4 113 L58.0 104 Z" fill={`url(#${ids.fol})`}/>
      <path d="M100 26 L142 104 L100 104 Z" fill="#000" opacity=".12"/>
      <path d="M64 101 q23.1 11 39.9 1 q21.0 -9 37.800000000000004 3 l0 5 q-35.699999999999996 -9 -23.1 2 q-25.2 10 -54.6 -4z" fill="#ffffff" opacity=".9"/>
      <path d="M48 169 q31.900000000000002 11 55.099999999999994 1 q29.0 -9 52.2 3 l0 5 q-49.3 -9 -31.900000000000002 2 q-34.8 10 -75.4 -4z" fill="#ffffff" opacity=".9"/>
      <path d="M30 243 q41.800000000000004 11 72.2 1 q38.0 -9 68.4 3 l0 5 q-64.6 -9 -41.800000000000004 2 q-45.6 10 -98.8 -4z" fill="#ffffff" opacity=".9"/>
      <path d="M64 88 q36 24 74 -6" stroke="#f2c14e" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      <path d="M50 152 q50 28 102 -8" stroke="#f2c14e" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      <path d="M34 224 q66 32 134 -10" stroke="#f2c14e" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      <g className="tree-lights">
        {LIGHTS.map((l) => (
          <circle
            key={`${l.cx}-${l.cy}`}
            cx={l.cx}
            cy={l.cy}
            r={l.r}
            fill={`var(${l.token}, ${l.fallback})`}
          />
        ))}
      </g>
      <g>
        {LIGHTS.map((l) => (
          <circle
            key={`${l.cx}-${l.cy}`}
            cx={l.cx}
            cy={l.cy}
            r={l.r}
            fill={`url(#${ids.bauble})`}
          />
        ))}
      </g>
      <circle cx="100" cy="24" r="30" fill={`url(#${ids.glow})`}/>
      <path d="M100 2 l6.8 14.4 15.8 2.2-11.6 11.1 2.9 15.7L100 38l-13.9 7.4 2.9-15.7L77.4 18.6l15.8-2.2z" fill="#ffd24f" stroke="#e0a92f" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

TreeNoel.displayName = "TreeNoel";
