import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../icons/Icon";

/** Valeur JSON — objet/tableau/primitive. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ValueType = "object" | "array" | "string" | "number" | "boolean" | "null";

/** Nœud passé aux callbacks (`onExpandedChange`) — pas de `defaultOpen` par
 * nœud comme `TreeNode` : la donnée JSON n'a pas de config déclarative par
 * nœud, seule `path` sert d'identifiant stable d'expansion. */
export interface JsonViewerNode {
  /** Chemin interne stable (ex. `$.settings.notifications.email`, `$.roles[0]`) — clé React ET identifiant d'expansion/focus. */
  path: string;
  /** Valeur JSON portée par ce nœud. */
  value: JsonValue;
}

export interface JsonViewerProps {
  /**
   * Valeur à afficher — objet/tableau/primitive JS **déjà résolue** (pas une
   * chaîne JSON à parser, à la différence du vanilla dont la source est
   * toujours `data-json`/`<script type="application/json">`). Normalisée en
   * interne via un aller-retour `JSON.stringify`/`JSON.parse` : détecte les
   * valeurs non sérialisables (`undefined`, fonctions, référence circulaire,
   * `BigInt`…) et les rend comme `.json-viewer-error`, à l'image du bloc
   * `catch` du vanilla (`shared/components.js:6038-6047`).
   */
  data: unknown;
  /**
   * Profondeur initiale d'expansion (mode non contrôlé uniquement, graine au
   * montage) — 0 = racine repliée, 1 = racine dépliée mais ses enfants
   * repliés, etc. Défaut `Infinity` : tout déplié — calque du vanilla, qui
   * n'a AUCUNE troncature par défaut (chaque nœud expandable naît avec la
   * classe `open`, `shared/components.js:6100`).
   */
  defaultExpandedDepth?: number;
  /**
   * Chemins dépliés — mode **contrôlé**. Fourni (même `[]`), l'état interne
   * ET `defaultExpandedDepth` sont ignorés : le parent doit répercuter
   * `onExpandedChange`. Convention alignée sur `<Accordion openIds>` (multi-
   * ouverture indépendante) plutôt que sur `<TreeView selectedId>` (sélection
   * unique) : comme l'accordéon, plusieurs nœuds JSON peuvent être ouverts
   * simultanément.
   */
  expandedPaths?: string[];
  /**
   * Appelé à chaque bascule d'un nœud (`node` renseigné) ou action groupée
   * de la toolbar « Tout déplier »/« Tout replier » (`node` alors
   * `undefined` — pas de nœud unique à désigner).
   */
  onExpandedChange?: (expandedPaths: string[], node?: JsonViewerNode) => void;
  /**
   * Affiche la toolbar « Tout déplier »/« Tout replier » — défaut `true`,
   * calque de `root.dataset.jsonToolbar !== 'false'` (`components.js:6051`).
   */
  toolbar?: boolean;
  /** Classes additionnelles sur la racine `.json-viewer`. */
  className?: string;
}

function valueType(value: JsonValue): ValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  return t as "string" | "number" | "boolean";
}

/** Paires `[clé, valeur]` — un index de tableau devient une clé STRING
 * (`"0"`, `"1"`…) : calque exact du vanilla, qui affiche l'index entre
 * guillemets comme une clé d'objet (`components.js:6136-6138` + `6126`),
 * PAS la convention usuelle « index nu » d'un highlighter JSON classique. */
function entriesOf(
  value: JsonValue,
  type: "object" | "array",
): [string, JsonValue][] {
  if (type === "array") {
    return (value as JsonValue[]).map(
      (v, i) => [String(i), v] as [string, JsonValue],
    );
  }
  const obj = value as { [key: string]: JsonValue };
  return Object.keys(obj).map((k) => [k, obj[k]] as [string, JsonValue]);
}

function childPath(
  parentPath: string,
  key: string,
  type: "object" | "array",
): string {
  return type === "array" ? `${parentPath}[${key}]` : `${parentPath}.${key}`;
}

/** Libellé du résumé (`.json-preview`) — ex. `"3 clés"`, `"1 élément"`.
 * Concaténé par l'appelant avec le préfixe `"… "` (calque exact de
 * `components.js:6147-6149`). */
function entryCountLabel(value: JsonValue, type: "object" | "array"): string {
  const count =
    type === "array"
      ? (value as JsonValue[]).length
      : Object.keys(value as Record<string, JsonValue>).length;
  if (type === "array") {
    return `${count}${count === 1 ? " élément" : " éléments"}`;
  }
  return `${count}${count === 1 ? " clé" : " clés"}`;
}

interface FlatNode {
  path: string;
  parentPath: string | null;
  value: JsonValue;
  isExpandable: boolean;
}

/** Aplatit l'arbre en ordre document (pré-ordre — racine puis enfants dans
 * l'ordre de `entriesOf`) : reproduit l'ordre de `tree.querySelectorAll('.json-node')`
 * du vanilla, utilisé pour la navigation clavier ↓/↑/Home/End. */
function flatten(
  value: JsonValue,
  path: string,
  parentPath: string | null,
  acc: FlatNode[],
): FlatNode[] {
  const type = valueType(value);
  const isExpandable = type === "object" || type === "array";
  acc.push({ path, parentPath, value, isExpandable });
  if (isExpandable) {
    for (const [k, v] of entriesOf(value, type)) {
      flatten(v, childPath(path, k, type), path, acc);
    }
  }
  return acc;
}

/** Graine d'expansion pour `defaultExpandedDepth` — un nœud à profondeur `d`
 * (racine = 0) est ouvert par défaut si `d < depth`. */
function computeDefaultExpanded(
  value: JsonValue,
  depth: number,
  path: string,
  acc: Set<string>,
): Set<string> {
  if (depth <= 0) return acc;
  const type = valueType(value);
  if (type === "object" || type === "array") {
    acc.add(path);
    for (const [k, v] of entriesOf(value, type)) {
      computeDefaultExpanded(v, depth - 1, childPath(path, k, type), acc);
    }
  }
  return acc;
}

type NormalizeResult =
  { ok: true; value: JsonValue } | { ok: false; message: string };

/**
 * Normalise/valide `data` via un aller-retour `JSON.stringify`/`JSON.parse` —
 * équivalent du `JSON.parse(raw)` du vanilla (`components.js:6039`) mais
 * appliqué à une valeur JS déjà résolue plutôt qu'à une chaîne brute.
 * Échoue (→ `.json-viewer-error`) sur `undefined` racine, fonctions/`Symbol`
 * (silencieusement supprimés en profondeur par `JSON.stringify`, comme la
 * vraie sérialisation JSON), référence circulaire ou `BigInt` — tous des
 * `TypeError`/`SyntaxError` capturés, message réutilisé tel quel (parité de
 * FORME avec `'JSON invalide : ' + err.message`, pas de message figé à la main).
 */
function normalize(data: unknown): NormalizeResult {
  try {
    const serialized = JSON.stringify(data);
    // `JSON.parse(undefined)` coerce en la chaîne "undefined" → SyntaxError :
    // couvre le cas `data === undefined` que `JSON.stringify` seul ne rejette pas.
    const parsed = JSON.parse(serialized as string) as JsonValue;
    return { ok: true, value: parsed };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function renderLeafValue(type: ValueType, value: JsonValue): ReactNode {
  if (type === "string")
    return <span className="json-string">{`"${value as string}"`}</span>;
  if (type === "number")
    return <span className="json-number">{String(value)}</span>;
  if (type === "boolean")
    return <span className="json-boolean">{String(value)}</span>;
  return <span className="json-null">null</span>;
}

/**
 * JsonViewer — Arbre JSON repliable en lecture seule du Design System msyx.fr
 * (`divers.html` #json-viewer — calque de `initJsonViewer`, `shared/components.js:6025-6314`).
 *
 * Émet le markup canonique (`components/json-viewer.css`) :
 * ```html
 * <div class="json-viewer">
 *   <div class="json-viewer-toolbar">…</div>          <!-- opt-out via toolbar={false} -->
 *   <div role="tree">                                  <!-- PAS de classe (voir note ci-dessous) -->
 *     <div class="json-node json-node--expandable open" role="treeitem" aria-expanded="true" tabindex="0">
 *       <div class="json-row">
 *         <button class="json-toggle" aria-hidden="true" tabindex="-1"><svg class="json-chevron">…</svg></button>
 *         <span class="json-punct">{</span><span class="json-preview">… 3 clés</span><span class="json-punct">}</span>
 *       </div>
 *       <div class="json-children open" role="group">   <!-- littéralement "open" en dur, voir note -->
 *         <div class="json-node json-node--leaf" role="treeitem" tabindex="-1">
 *           <div class="json-row">
 *             <span class="json-toggle-spacer" aria-hidden="true"></span>
 *             <span class="json-key">"id"</span><span class="json-punct">: </span>
 *             <span class="json-number">4821</span>
 *           </div>
 *         </div>
 *         <div class="json-punct">}</div>                    <!-- pas de .json-close-punct (dead CSS, voir note) -->
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **`.open` va sur `.json-node` (le PARENT) ; `.json-children` porte la
 * classe "open" EN DUR, jamais togglée.** Le CSS pilote l'affichage via
 * `.json-node:not(.open) > .json-children { max-height: 0 }`
 * (`json-viewer.css`) — `.json-children.open` seule ne suffirait pas à
 * masquer (les deux règles ont la même spécificité, celle avec `:not()`
 * gagne par ordre de cascade). Poser `.open` sur `.json-children` au lieu du
 * `.json-node` = composant visuellement mort (rejeu de l'incident
 * `<ActionMenu>`). Cette implémentation pose react bien `.open` sur le
 * `.json-node`, et rend `.json-children` avec `"json-children open"` LITTÉRAL
 * (jamais conditionnel), exactement comme `children.className = 'json-children open'`
 * du vanilla (`components.js:6160`).
 *
 * **La ligne d'en-tête reste toujours visible telle quelle** : `{ … N clés }`
 * (chevron, clé, accolade ouvrante, résumé, accolade fermante) est rendu
 * inconditionnellement dans `.json-row`, que le nœud soit ouvert ou fermé —
 * seul `.json-children` en dessous est masqué par CSS. Ce n'est PAS un bug :
 * c'est le comportement exact du vanilla (le résumé récapitulatif ne
 * disparaît jamais, même déplié).
 *
 * **Index de tableau = clé quotée `"0"`, `"1"`…**, comme une clé d'objet
 * (`components.js:6126` — `keyEl.textContent = '"' + key + '"'` s'applique
 * aussi aux entrées `[i, v]` d'un tableau). Pas la convention usuelle d'un
 * highlighter JSON (index nu) : calque volontaire de la source.
 *
 * **Navigation clavier — WAI-ARIA Tree (roving tabindex), présente dans le
 * vanilla** (`components.js:6223-6307`) : ↓/↑ item suivant/précédent, →
 * déplie ou descend au 1er enfant, ← replie ou remonte au parent, Home/End
 * premier/dernier, Entrée/Espace bascule un nœud expandable (preventDefault
 * uniquement dans ce cas — sur une feuille, Espace fait défiler la page,
 * fidèle au vanilla qui ne preventDefault pas non plus dans cette branche).
 *
 * **Trouvaille de parité — `isVisible()` du vanilla est du code mort** : la
 * fonction ne considère un nœud invisible que si un ancêtre `.json-children`
 * n'a PAS la classe `open` — or `.json-children` la porte TOUJOURS en dur
 * (note ci-dessus), donc cette branche ne peut jamais retourner `false` :
 * `getVisibleNodes()` équivaut en pratique à *tous* les nœuds, repliés ou
 * non. La navigation ↓/↑/Home/End traverse donc aussi les sous-arbres
 * visuellement repliés. Comportement copié tel quel (source de vérité = le
 * code, pas l'intention supposée) : ne pas « corriger » sans ticket DS dédié
 * sur le vanilla d'abord.
 *
 * **Données — API volontairement différente du vanilla** : `data` est une
 * valeur JS déjà résolue (pas une chaîne `data-json` à parser). Normalisée
 * via un aller-retour JSON (voir `normalize()`) pour détecter les valeurs non
 * sérialisables → `.json-viewer-error`, équivalent du bloc `catch` vanilla.
 *
 * **Expansion — non contrôlée par défaut**, graine `defaultExpandedDepth`
 * (déf. `Infinity`, tout déplié comme le vanilla). **Contrôlée** dès que
 * `expandedPaths` est fourni (même `[]`) — convention alignée sur
 * `<Accordion openIds>` (multi-ouverture), pas sur `<TreeView selectedId>`
 * (sélection unique) : plusieurs nœuds JSON peuvent être ouverts en même
 * temps, comme plusieurs items d'accordéon.
 *
 * **Toolbar « Tout déplier »/« Tout replier »** — opt-out via `toolbar={false}`,
 * calque de `data-json-toolbar="false"`. « Tout replier » garde la racine
 * ouverte (`components.js:6086-6089` — `if (n !== rootNode) setOpen(n, false); setOpen(rootNode, true);`).
 *
 * **`.json-tree`, `.json-node--last` et `.json-close-punct` non émises** :
 * grep sur `shared/css/**` confirme qu'aucune des trois classes n'a la
 * moindre règle CSS (crochets JS morts du vanilla, absentes aussi du
 * registre `cssClasses` de `json-viewer`). Les émettre ferait échouer le
 * détecteur anti-fantôme (`generate-registry.js --check`) pour zéro gain
 * visuel/comportemental. Le rôle ARIA `role="tree"` est conservé (a11y
 * intacte) sur un `<div>` non classé ; la ponctuation fermante en bas du
 * bloc enfant reste `.json-punct` seule (même rendu visuel, juste sans le
 * hook mort).
 *
 * SSR-safe : aucun accès `window`/`document` au render (état 100 % React).
 */
export function JsonViewer({
  data,
  defaultExpandedDepth = Infinity,
  expandedPaths,
  onExpandedChange,
  toolbar = true,
  className,
}: JsonViewerProps) {
  const normalized = useMemo(() => normalize(data), [data]);

  const flatNodes = useMemo(
    () => (normalized.ok ? flatten(normalized.value, "$", null, []) : []),
    [normalized],
  );
  const indexByPath = useMemo(
    () => new Map(flatNodes.map((n, i) => [n.path, i] as const)),
    [flatNodes],
  );

  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() =>
    normalized.ok
      ? computeDefaultExpanded(
          normalized.value,
          defaultExpandedDepth,
          "$",
          new Set(),
        )
      : new Set(),
  );
  const [focusedPath, setFocusedPath] = useState<string>("$");
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());

  const isControlled = expandedPaths !== undefined;
  const currentExpanded = isControlled
    ? new Set(expandedPaths)
    : internalExpanded;

  function applyExpanded(nextPaths: string[], node?: JsonViewerNode) {
    if (!isControlled) setInternalExpanded(new Set(nextPaths));
    onExpandedChange?.(nextPaths, node);
  }

  function toggle(path: string, value: JsonValue) {
    const next = new Set(currentExpanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    applyExpanded(Array.from(next), { path, value });
  }

  function setExpandedExplicit(path: string, value: JsonValue, open: boolean) {
    if (currentExpanded.has(path) === open) return;
    const next = new Set(currentExpanded);
    if (open) next.add(path);
    else next.delete(path);
    applyExpanded(Array.from(next), { path, value });
  }

  function moveFocusTo(path: string) {
    setFocusedPath(path);
    nodeRefs.current.get(path)?.focus();
  }

  function handleRowClick(e: MouseEvent, path: string, value: JsonValue) {
    e.preventDefault();
    toggle(path, value);
    moveFocusTo(path);
  }

  function handleExpandAll() {
    applyExpanded(flatNodes.filter((n) => n.isExpandable).map((n) => n.path));
  }

  function handleCollapseAll() {
    applyExpanded(["$"]);
  }

  function handleTreeKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = indexByPath.get(focusedPath);
    if (idx === undefined) return;
    const current = flatNodes[idx];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < flatNodes.length - 1) moveFocusTo(flatNodes[idx + 1].path);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) moveFocusTo(flatNodes[idx - 1].path);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (current.isExpandable) {
        if (!currentExpanded.has(current.path)) {
          setExpandedExplicit(current.path, current.value, true);
        } else {
          const child = flatNodes[idx + 1];
          if (child && child.parentPath === current.path)
            moveFocusTo(child.path);
        }
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (current.isExpandable && currentExpanded.has(current.path)) {
        setExpandedExplicit(current.path, current.value, false);
      } else if (current.parentPath) {
        moveFocusTo(current.parentPath);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      if (flatNodes.length) moveFocusTo(flatNodes[0].path);
    } else if (e.key === "End") {
      e.preventDefault();
      if (flatNodes.length) moveFocusTo(flatNodes[flatNodes.length - 1].path);
    } else if (e.key === "Enter" || e.key === " ") {
      if (current.isExpandable) {
        e.preventDefault();
        toggle(current.path, current.value);
      }
    }
  }

  function renderNode(
    key: string,
    value: JsonValue,
    path: string,
    isRoot: boolean,
  ): ReactNode {
    const type = valueType(value);
    const isExpandable = type === "object" || type === "array";
    const isOpen = currentExpanded.has(path);

    const nodeClasses = [
      "json-node",
      isExpandable ? "json-node--expandable" : "json-node--leaf",
      isExpandable && isOpen ? "open" : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        key={path}
        ref={(el) => {
          if (el) nodeRefs.current.set(path, el);
          else nodeRefs.current.delete(path);
        }}
        className={nodeClasses}
        role="treeitem"
        tabIndex={focusedPath === path ? 0 : -1}
        aria-expanded={isExpandable ? isOpen : undefined}
      >
        <div
          className="json-row"
          onClick={
            isExpandable ? (e) => handleRowClick(e, path, value) : undefined
          }
        >
          {isExpandable ? (
            <button
              type="button"
              className="json-toggle"
              aria-hidden="true"
              tabIndex={-1}
            >
              <Icon
                name="chevron-down"
                className="json-chevron"
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="json-toggle-spacer" aria-hidden="true" />
          )}

          {!isRoot && (
            <>
              <span className="json-key">{`"${key}"`}</span>
              <span className="json-punct">{": "}</span>
            </>
          )}

          {isExpandable ? (
            <>
              <span className="json-punct">{type === "array" ? "[" : "{"}</span>
              <span className="json-preview">{`… ${entryCountLabel(value, type)}`}</span>
              <span className="json-punct">{type === "array" ? "]" : "}"}</span>
            </>
          ) : (
            renderLeafValue(type, value)
          )}
        </div>

        {isExpandable && (
          <div className="json-children open" role="group">
            {entriesOf(value, type).map(([k, v]) =>
              renderNode(k, v, childPath(path, k, type), false),
            )}
            <div className="json-punct">{type === "array" ? "]" : "}"}</div>
          </div>
        )}
      </div>
    );
  }

  const rootClasses = ["json-viewer", className].filter(Boolean).join(" ");

  if (!normalized.ok) {
    return (
      <div className={rootClasses}>
        <p className="json-viewer-error">{`JSON invalide : ${normalized.message}`}</p>
      </div>
    );
  }

  return (
    <div className={rootClasses}>
      {toolbar && (
        <div className="json-viewer-toolbar">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleExpandAll}
          >
            Tout déplier
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleCollapseAll}
          >
            Tout replier
          </button>
        </div>
      )}
      <div role="tree" onKeyDown={handleTreeKeyDown}>
        {renderNode("$", normalized.value, "$", true)}
      </div>
    </div>
  );
}

JsonViewer.displayName = "JsonViewer";
