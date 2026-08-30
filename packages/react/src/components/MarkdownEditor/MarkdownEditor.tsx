import {
  KeyboardEvent as ReactKeyboardEvent,
  TextareaHTMLAttributes,
  useId,
  useRef,
} from "react";
import { Icon } from "../../icons/Icon";
import { renderMarkdown } from "./markdown";

export interface MarkdownEditorProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange" | "className"
  > {
  /** Contenu **Markdown** — le parent pilote l'état, aucun état interne. */
  value: string;
  /** Appelé avec le nouveau **Markdown** à chaque saisie ou action de toolbar. */
  onChange: (markdown: string) => void;
  /** Libellé accessible du champ (`aria-label`). @default "Contenu Markdown" */
  label?: string;
  /** Affiche l'aperçu rendu sous le champ. @default true */
  preview?: boolean;
  /** Libellé accessible de la toolbar. @default "Mise en forme" */
  toolbarLabel?: string;
  /** Classes additionnelles sur le conteneur `.markdown-editor`. */
  className?: string;
}

/** Libellés des actions — exposés pour les tests et la cohérence des `aria-label`. */
const ACTIONS = [
  { id: "bold", label: "Gras", hint: "Ctrl+B", glyph: <strong>B</strong> },
  { id: "italic", label: "Italique", hint: "Ctrl+I", glyph: <em>I</em> },
  { id: "ul", label: "Liste à puces", hint: null, glyph: "•" },
  { id: "ol", label: "Liste numérotée", hint: null, glyph: "1." },
  {
    id: "link",
    label: "Lien",
    hint: "Ctrl+K",
    glyph: <Icon name="link" aria-hidden="true" />,
  },
] as const;

/**
 * MarkdownEditor — Éditeur Markdown **léger** du Design System msyx.fr
 * (`formulaires.html` #markdown-editor, `initMarkdownEditor` dans
 * `shared/components.js`). Gras, italique, listes, liens : rien de plus —
 * « l'objectif n'est pas de fournir un traitement de texte complet » (#854).
 *
 * Émet le markup canonique (`components/forms.css`) :
 * ```html
 * <div class="markdown-editor">
 *   <div class="markdown-toolbar" role="toolbar" aria-label="Mise en forme">…</div>
 *   <textarea class="markdown-input"></textarea>
 *   <div class="markdown-preview prose" aria-live="polite">…</div>
 * </div>
 * ```
 *
 * **La source de vérité est un `<textarea>` contenant du Markdown BRUT**
 * (option A, arbitrée avec le demandeur). Conséquences directes :
 * - **entrée et sortie sont du Markdown**, sans aucune conversion HTML → MD :
 *   le consommateur stocke exactement ce qu'il reçoit ;
 * - la **saisie Markdown directe** (`**gras**`, `- item`) est native — il n'y a
 *   rien à intercepter ;
 * - la toolbar ne fait qu'**insérer de la syntaxe** autour de la sélection ;
 * - **zéro dépendance tierce** (le DS n'en a qu'une, `dagre`, et elle est
 *   vendorée) — contrairement au `RichTextEditor` de `cap-transfo` (TipTap),
 *   cité par l'issue pour ses patterns, pas pour sa dépendance.
 *
 * **Sécurité — whitelist par CONSTRUCTION, pas filtrage** : l'aperçu passe par
 * `renderMarkdown` qui ne produit QUE `p`/`br`/`strong`/`em`/`ul`/`ol`/`li`/`a`
 * et met tout le reste en chaînes (React les échappe).
 * `dangerouslySetInnerHTML` n'apparaît nulle part : une balise saisie n'a aucun
 * chemin vers le parseur HTML. Les URL passent par `safeUrl` — `javascript:` et
 * `data:` sont neutralisés en `#`, les liens externes reçoivent
 * `rel="noopener noreferrer"`.
 *
 * **Contrôlé** : `value`/`onChange`, aucun état interne.
 *
 * **Clavier** : `Ctrl/Cmd+B` gras, `Ctrl/Cmd+I` italique, `Ctrl/Cmd+K` lien. Le
 * lien s'insère **dans le champ** (`[texte](https://)`, curseur sur le libellé)
 * — jamais de `window.prompt`, anti-pattern relevé sur `cap-transfo`.
 *
 * **Toolbar en glyphes texte** (`B`, `I`, `•`, `1.`) plutôt qu'en icônes : le
 * sprite Lucide du DS n'embarque ni `bold`, ni `italic`, ni `list`, et
 * `build-sprite.sh` est un build reproductible qu'on ne détourne pas pour un
 * seul composant. Chaque bouton porte un `aria-label` explicite.
 *
 * SSR-safe sous Next 15 : aucun accès à `document`/`window` au niveau module ni
 * au rendu — tout est dans les handlers (post-hydratation). Aucun équivalent
 * d'`immediatelyRender: false` n'est nécessaire, puisqu'il n'y a pas d'éditeur
 * tiers à monter.
 */
export function MarkdownEditor({
  value,
  onChange,
  label = "Contenu Markdown",
  preview = true,
  toolbarLabel = "Mise en forme",
  className,
  id,
  ...rest
}: MarkdownEditorProps) {
  const generatedId = useId();
  const textareaId = id ?? `markdown-editor-${generatedId}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Insère `before`/`after` autour de la sélection puis replace la sélection sur
   * le CONTENU, pas sur les marqueurs : l'utilisateur continue de taper là où il
   * regarde.
   */
  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    // Le DOM n'a pas encore la nouvelle valeur (le parent la repasse en prop) :
    // la sélection est posée après le prochain rendu.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };

  /**
   * Préfixe chaque ligne de la sélection. Une ligne déjà préfixée est laissée
   * telle quelle : re-cliquer n'empile pas les marqueurs.
   */
  const prefixLines = (ordered: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
    const endOfLine = value.indexOf("\n", textarea.selectionEnd);
    const end = endOfLine === -1 ? value.length : endOfLine;
    const next = value
      .slice(start, end)
      .split("\n")
      .map((line, index) =>
        ordered
          ? /^\s*\d+[.)]\s+/.test(line)
            ? line
            : `${index + 1}. ${line}`
          : /^\s*[-*]\s+/.test(line)
            ? line
            : `- ${line}`,
      )
      .join("\n");
    onChange(value.slice(0, start) + next + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + next.length);
    });
  };

  const runAction = (action: (typeof ACTIONS)[number]["id"]) => {
    switch (action) {
      case "bold":
        wrapSelection("**", "**", "gras");
        break;
      case "italic":
        wrapSelection("*", "*", "italique");
        break;
      case "ul":
        prefixLines(false);
        break;
      case "ol":
        prefixLines(true);
        break;
      case "link":
        wrapSelection("[", "](https://)", "texte");
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runAction("bold");
    } else if (key === "i") {
      event.preventDefault();
      runAction("italic");
    } else if (key === "k") {
      event.preventDefault();
      runAction("link");
    }
  };

  return (
    <div className={["markdown-editor", className].filter(Boolean).join(" ")}>
      <div className="markdown-toolbar" role="toolbar" aria-label={toolbarLabel}>
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="btn-icon"
            data-md={action.id}
            aria-label={
              action.hint ? `${action.label} (${action.hint})` : action.label
            }
            title={action.hint ? `${action.label} (${action.hint})` : action.label}
            onClick={() => runAction(action.id)}
          >
            {action.glyph}
          </button>
        ))}
      </div>
      <textarea
        {...rest}
        ref={textareaRef}
        id={textareaId}
        className="markdown-input"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {preview && (
        <div className="markdown-preview prose" aria-live="polite">
          {renderMarkdown(value)}
        </div>
      )}
    </div>
  );
}

MarkdownEditor.displayName = "MarkdownEditor";
