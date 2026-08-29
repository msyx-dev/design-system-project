import type { ImgHTMLAttributes, ReactElement } from "react";

/**
 * Variante d'asset SVG résolue depuis `assets/` (racine du repo DS,
 * NON distribuée par `shared/sync.sh` — cf. docstring `Logo` ci-dessous).
 */
export type LogoVariant = "default" | "mark" | "dark" | "light";

/**
 * Nom de fichier par variante. `mark` est un alias strict de `default`
 * aujourd'hui (CLAUDE.md : « Mark alias : assets/logo-msyx-mark.svg ») —
 * conservé comme variante distincte pour rester stable si les deux fichiers
 * divergent un jour (le nom `mark` documente une intention, pas un accident).
 */
const LOGO_FILES: Record<LogoVariant, string> = {
  default: "logo-msyx.svg",
  mark: "logo-msyx-mark.svg",
  dark: "logo-msyx-dark.svg",
  light: "logo-msyx-light.svg",
};

/** Chemin de base par défaut — convention DS (`/assets/logo-*.svg`, cf. CLAUDE.md). */
const DEFAULT_BASE_PATH = "/assets";

export interface LogoProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt"
> {
  /** Fichier SVG résolu. @default "default" (logo-msyx.svg, mark PRIMARY) */
  variant?: LogoVariant;
  /**
   * Chemin de base des assets SVG, SANS slash final. Le DS ne distribue PAS
   * `assets/` via `shared/sync.sh` (uniquement le CSS) — c'est précisément
   * ce qui casse chez les consumers React selon leur bundler/base URL. Le
   * consumer doit copier les 4 SVG (`logo-msyx*.svg`) sous ce chemin dans
   * son propre app (ou pointer vers une URL absolue, CDN par ex.).
   * @default "/assets"
   */
  basePath?: string;
  /** Largeur ET hauteur (carré, viewBox 1475×1562 quasi-carré). @default 40 (`.header-logo-img`) */
  size?: number;
  /** Texte alternatif. Ignoré (forcé `""` + `aria-hidden`) quand `href` est fourni — le nom accessible est alors porté par le lien. @default "msyx" */
  alt?: string;
  /** Si fourni, enveloppe l'`<img>` dans `<a class="header-logo">` (calque `buildHeader()`, `shared/nav.js`). */
  href?: string;
  /** `aria-label` du lien quand `href` est fourni. @default `${alt} — Accueil` */
  linkAriaLabel?: string;
}

/**
 * `Logo` — pictogramme SVG msyx (`brand-logo-svg`, `fondation.html`
 * #brand-logo-svg ; calque `buildHeader()` `shared/nav.js:137-159`).
 *
 * **Absorbe 3 entrées du registre** (#878, lot de clôture) : cette entrée
 * (`brand-logo-svg`) directement, plus `brand-wordmark` (→ `<Wordmark>`,
 * co-localisé dans ce dossier) et `brand-mark-ds` (→ `<LogoMark>`, idem) —
 * un seul wrapper React couvre les trois, aucune n'a de dossier propre.
 *
 * **Rôle principal : résoudre le chemin de l'asset SVG.** Les 4 fichiers
 * (`logo-msyx.svg`/`-mark`/`-dark`/`-light`) vivent dans `assets/` à la
 * racine du repo DS — un dossier que `shared/sync.sh` ne distribue PAS
 * (seul le CSS l'est). Selon le bundler et la base URL du consumer, un
 * chemin absolu codé en dur casse. `basePath` isole ce point de friction
 * dans une seule prop plutôt que de laisser chaque consumer le découvrir
 * à l'usage.
 *
 * Rendu nu par défaut (`<img>` seul, ex. mark seul en login/favicon).
 * Avec `href`, reproduit le lockup header exact : `<a class="header-logo">
 * <img class="header-logo-img"/></a>` (le wordmark, s'il est voulu à côté,
 * se compose séparément via `<Wordmark/>` — même composition que le
 * vanilla, qui les place en siblings dans le même `<a>`).
 */
export function Logo({
  variant = "default",
  basePath = DEFAULT_BASE_PATH,
  size = 40,
  alt = "msyx",
  href,
  linkAriaLabel,
  className,
  width,
  height,
  ...rest
}: LogoProps): ReactElement {
  const src = `${basePath.replace(/\/+$/, "")}/${LOGO_FILES[variant]}`;
  const imgClassName = href
    ? ["header-logo-img", className].filter(Boolean).join(" ")
    : className;

  const img = (
    <img
      src={src}
      alt={href ? "" : alt}
      aria-hidden={href ? true : undefined}
      width={width ?? size}
      height={height ?? size}
      className={imgClassName || undefined}
      {...rest}
    />
  );

  if (!href) return img;

  return (
    <a
      href={href}
      className="header-logo"
      aria-label={linkAriaLabel ?? `${alt} — Accueil`}
    >
      {img}
    </a>
  );
}

Logo.displayName = "Logo";
