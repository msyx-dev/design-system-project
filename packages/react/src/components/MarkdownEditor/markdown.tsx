import { Fragment, ReactNode } from "react";

/**
 * Rendu du Markdown léger du DS (#854) — pendant React exact de
 * `renderMarkdownInto` (`shared/components.js`).
 *
 * **La sécurité est une whitelist par CONSTRUCTION, pas un filtre.** Cette
 * fonction ne produit QUE des éléments React `p`/`br`/`strong`/`em`/`ul`/`ol`/
 * `li`/`a` et met tout le reste en chaînes de caractères — que React échappe.
 * `dangerouslySetInnerHTML` n'apparaît nulle part : une balise saisie par
 * l'utilisateur n'a aucun chemin vers le parseur HTML, il n'y a donc rien à
 * assainir ni à contourner (cf. `DS-PRINCIPLES` §11).
 *
 * La parité avec le vanilla est verrouillée par le corpus partagé
 * `tests/fixtures/markdown-cases.json`, rejoué à l'identique par les deux
 * suites de tests : un même contenu doit rendre pareil quelle que soit la
 * techno du consommateur.
 */

/**
 * Source de la regex, jamais un objet partagé : le parseur inline est RÉCURSIF
 * (un gras peut contenir de l'italique) et une regex `/g` porte un `lastIndex`
 * mutable — un objet unique verrait son curseur réinitialisé par l'appel
 * imbriqué, et la boucle du parent repartirait de zéro (boucle infinie).
 */
const MD_INLINE_SOURCE =
  "\\*\\*([\\s\\S]+?)\\*\\*|\\*([^*\\n]+?)\\*|_([^_\\n]+?)_|\\[([^\\]]*)\\]\\(([^)\\s]*)\\)";

/** Schémas d'URL autorisés — calque `safeUrl()` de `shared/components.js`. */
const SAFE_SCHEMES = ["http", "https", "mailto"];

/**
 * Neutralise toute URL dont le schéma n'est pas explicitement autorisé
 * (`javascript:`, `data:`…). Calque `safeUrl()` du vanilla, fallback `#`.
 */
export function safeUrl(url: string, fallback = "#"): string {
  if (!url) return fallback;
  // eslint-disable-next-line no-control-regex
  const cleaned = url.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (cleaned === "") return fallback;
  // Relative (chemin, "//host", "?query") ou ancre : pas de schéma, sûr.
  if (/^[./#?]/.test(cleaned)) return cleaned;
  const schemeMatch = cleaned.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) return cleaned; // pas de "schéma:" détecté — chemin relatif
  return SAFE_SCHEMES.includes(schemeMatch[1].toLowerCase())
    ? cleaned
    : fallback;
}

/** Découpe une portion de texte en nœuds inline (gras, italique, lien). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(MD_INLINE_SOURCE, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-${index++}`;
    if (match[1] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[1], key)}</strong>);
    } else if (match[2] !== undefined || match[3] !== undefined) {
      nodes.push(
        <em key={key}>{renderInline(match[2] ?? match[3], key)}</em>,
      );
    } else {
      // Lien : le LIBELLÉ reste une chaîne (jamais du markup, même si
      // l'utilisateur y a mis des balises) et l'URL passe par safeUrl.
      const href = safeUrl(match[5]);
      const external = /^(https?|mailto):/i.test(href);
      nodes.push(
        <a
          key={key}
          href={href}
          {...(external
            ? { rel: "noopener noreferrer", target: "_blank" }
            : {})}
        >
          {match[4]}
        </a>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const isBullet = (line: string) => /^\s*[-*]\s+/.test(line);
const isOrdered = (line: string) => /^\s*\d+[.)]\s+/.test(line);

/** Rend un Markdown léger en éléments React. Aucun HTML n'est jamais produit. */
export function renderMarkdown(markdown: string): ReactNode {
  const lines = String(markdown ?? "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockIndex = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }

    if (isBullet(lines[i]) || isOrdered(lines[i])) {
      const ordered = isOrdered(lines[i]);
      const items: ReactNode[] = [];
      const key = `b${blockIndex++}`;
      while (
        i < lines.length &&
        (ordered ? isOrdered(lines[i]) : isBullet(lines[i]))
      ) {
        // Les numéros de la source sont ignorés : <ol> renumérote seul.
        const content = lines[i].replace(
          ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/,
          "",
        );
        items.push(
          <li key={`${key}-${items.length}`}>
            {renderInline(content, `${key}-${items.length}`)}
          </li>,
        );
        i++;
      }
      blocks.push(
        ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>,
      );
      continue;
    }

    // Paragraphe : lignes consécutives jusqu'à une ligne vide ou une liste. Un
    // simple retour à la ligne devient <br> — attendu dans un champ de saisie
    // court, où l'utilisateur ne pense pas en « lignes vides ».
    const key = `b${blockIndex++}`;
    const parts: ReactNode[] = [];
    let first = true;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i])
    ) {
      const lineKey = `${key}-l${parts.length}`;
      parts.push(
        <Fragment key={lineKey}>
          {first ? null : <br />}
          {renderInline(lines[i], lineKey)}
        </Fragment>,
      );
      first = false;
      i++;
    }
    blocks.push(<p key={key}>{parts}</p>);
  }

  return blocks;
}
