import { HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";

function ClipboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

const SUCCESS_DURATION_MS = 2000;

export interface CopyButtonProps {
  /** Texte à copier — ignoré si `getText` est fourni. */
  text?: string;
  /**
   * Résout le texte à copier au moment du clic (lazy) — utilisé par
   * `<CodeBlock>` pour lire le `textContent` live du bloc plutôt que de
   * dupliquer une prop `text` figée au montage.
   */
  getText?: () => string;
  /** @default "Copier" */
  ariaLabel?: string;
  /** `.copy-btn--icon` (carré 32px, sans libellé) ou `.copy-btn--inline` (injecté au survol d'un `.code-block-wrap`). Absent = `.copy-btn` nu. */
  variant?: "icon" | "inline";
  className?: string;
}

/**
 * `CopyButton` — bouton de copie presse-papiers du Design System msyx.fr
 * (`divers.html` #code, calque `doCopy`/`initCopyButtons` —
 * `shared/components.js:1026-1078`).
 *
 * Émet `.copy-btn(.copy-btn--icon|.copy-btn--inline)(.copy-btn--success) >
 * .copy-icon + .copy-tooltip`. `.copy-btn--success` piloté par un état
 * interne (`success`), retiré après `SUCCESS_DURATION_MS` (2000ms, calque
 * exact du `setTimeout` vanilla) — c'est CETTE classe que le CSS du DS
 * utilise pour la couleur succès + l'apparition du tooltip
 * (`interactive.css:30,45,58`).
 *
 * **Robustesse ajoutée vs le vanilla** (demandé par l'issue #874) :
 * `navigator.clipboard` absent (contexte non sécurisé, vieux navigateur) ⇒
 * no-op silencieux, comme le vanilla. Mais `writeText()` **rejetée**
 * (permission refusée) — le vanilla n'a AUCUN `.catch()`, la rejection part
 * en `unhandledrejection` silencieuse ; ici la rejection est interceptée
 * explicitement et n'affiche jamais l'état succès (pas de classe d'erreur
 * dédiée côté CSS DS aujourd'hui — juste l'absence de faux positif visuel).
 */
export function CopyButton({
  text,
  getText,
  ariaLabel = "Copier",
  variant,
  className,
}: CopyButtonProps) {
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function handleClick() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const value = getText ? getText() : (text ?? "");
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setSuccess(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setSuccess(false);
        }, SUCCESS_DURATION_MS);
      })
      .catch(() => {
        // API indisponible/refusée après coup (permission révoquée en vol,
        // contexte devenu non sécurisé) — pas d'état succès affiché, pas de
        // faux positif visuel.
      });
  }

  const classes = [
    "copy-btn",
    variant === "icon" ? "copy-btn--icon" : null,
    variant === "inline" ? "copy-btn--inline" : null,
    success ? "copy-btn--success" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={handleClick}
    >
      <span className="copy-icon">
        {success ? <CheckIcon /> : <ClipboardIcon />}
      </span>
      <span className="copy-tooltip">Copie !</span>
    </button>
  );
}
CopyButton.displayName = "CopyButton";

export interface CodeBlockProps {
  children: ReactNode;
  /** Injecte un `<CopyButton variant="inline">` calqué sur l'injection auto du vanilla. @default true */
  copyable?: boolean;
  /** @default "Copier le code" */
  copyLabel?: string;
  className?: string;
}

/**
 * `CodeBlock` — bloc de code avec coloration syntaxique et copie intégrée
 * du Design System msyx.fr (`divers.html` #code, calque `.code-block` +
 * l'injection auto de `initCopyButtons` — `shared/components.js:1050-1078`).
 *
 * Émet `.code-block-wrap > .code-block[tabindex=0] + CopyButton(inline)` —
 * `tabindex="0"` posé comme le vanilla, pour rendre le bloc scrollable
 * focusable au clavier (`shared/components.js:1056-1058`).
 *
 * **Aucune coloration syntaxique calculée** : le DS n'a jamais eu de lexer
 * (`.kw`/`.str`/.cm`/`.fn`/`.num` sont des spans **manuellement composés**
 * dans le markup vanilla, `divers.html:100-112` — aucune fonction
 * `initSyntaxHighlight` n'existe). `<CodeBlock>` reproduit ce contrat :
 * `children` est le markup déjà coloré par le consommateur, via les
 * primitives exportées `<CodeKeyword>`/`<CodeString>`/`<CodeComment>`/
 * `<CodeFunction>`/`<CodeNumber>` (spans `.kw`/`.str`/`.cm`/`.fn`/`.num`).
 *
 * Le texte copié est lu **lazy** (`blockRef.current.textContent`, au clic —
 * pas figé au montage) : calque `block.innerText || block.textContent` du
 * vanilla (`shared/components.js:1063`), reste correct si `children`
 * change dynamiquement.
 */
export function CodeBlock({
  children,
  copyable = true,
  copyLabel = "Copier le code",
  className,
}: CodeBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const classes = ["code-block", className].filter(Boolean).join(" ");

  return (
    <div className="code-block-wrap">
      <div ref={blockRef} className={classes} tabIndex={0}>
        {children}
      </div>
      {copyable && (
        <CopyButton
          variant="inline"
          ariaLabel={copyLabel}
          getText={() => blockRef.current?.textContent ?? ""}
        />
      )}
    </div>
  );
}
CodeBlock.displayName = "CodeBlock";

export interface InlineCodeProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  children: ReactNode;
}

/**
 * `InlineCode` — code inline du Design System msyx.fr (`divers.html`
 * #code, `.code-inline` — `interactive.css:11-19`).
 */
export function InlineCode({ children, className, ...rest }: InlineCodeProps) {
  const classes = ["code-inline", className].filter(Boolean).join(" ");
  return (
    <code className={classes} {...rest}>
      {children}
    </code>
  );
}
InlineCode.displayName = "InlineCode";

export interface CodeTokenProps {
  children: ReactNode;
  className?: string;
}

function makeTokenComponent(tokenClass: string, displayName: string) {
  function TokenComponent({ children, className }: CodeTokenProps) {
    const classes = [tokenClass, className].filter(Boolean).join(" ");
    return <span className={classes}>{children}</span>;
  }
  TokenComponent.displayName = displayName;
  return TokenComponent;
}

/** Mot-clé — `.kw` (`interactive.css:6`). */
export const CodeKeyword = makeTokenComponent("kw", "CodeKeyword");
/** Chaîne de caractères — `.str` (`interactive.css:7`). */
export const CodeString = makeTokenComponent("str", "CodeString");
/** Commentaire — `.cm` (`interactive.css:8`). */
export const CodeComment = makeTokenComponent("cm", "CodeComment");
/** Nom de fonction/attribut — `.fn` (`interactive.css:9`). */
export const CodeFunction = makeTokenComponent("fn", "CodeFunction");
/** Nombre — `.num` (`interactive.css:10`). */
export const CodeNumber = makeTokenComponent("num", "CodeNumber");
