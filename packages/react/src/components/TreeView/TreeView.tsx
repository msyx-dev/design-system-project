import { ReactNode, useState } from "react";

export interface TreeNode {
  /** Identifiant stable — clé React + modèle d'expansion/sélection. Unique dans tout l'arbre (les libellés, eux, peuvent être dupliqués). */
  id: string;
  /** Libellé affiché (`.tree-label`). */
  label: string;
  /**
   * Icône personnalisée rendue dans `.tree-icon`. Absente, le défaut est
   * le sprite `#i-folder` (branche) ou `#i-file` (feuille).
   */
  icon?: ReactNode;
  /**
   * Présence ⇒ **branche** (dépliable, chevron + `.tree-children`).
   * Absence ⇒ **feuille**. Un tableau vide reste une branche (dossier vide).
   */
  children?: TreeNode[];
  /**
   * Amorce l'état déplié au montage (branche uniquement). Sert de graine à
   * `aria-expanded` ET aux classes `.open` — calque du vanilla qui lit
   * `aria-expanded` au montage (`initTreeView`, `components.js:1835-1847`).
   */
  defaultExpanded?: boolean;
}

export interface TreeViewProps {
  /** Arbre de nœuds — rendu récursif, `key = node.id`. */
  nodes: TreeNode[];
  /** Libellé accessible requis pour la racine `role="tree"`. */
  ariaLabel: string;
  /**
   * Id sélectionné — mode **contrôlé**. Fourni, l'état interne est ignoré
   * (le parent doit répercuter `onSelect`). Absent, la sélection est interne.
   */
  selectedId?: string;
  /** Sélection interne initiale (mode non contrôlé uniquement). */
  defaultSelectedId?: string;
  /** Appelé avec le nœud cliqué — remplace le `CustomEvent treeview:select` du vanilla. */
  onSelect?: (node: TreeNode) => void;
  /** Classes additionnelles sur la racine `.tree`. */
  className?: string;
}

function isBranch(node: TreeNode): boolean {
  return Array.isArray(node.children);
}

/** Graine d'expansion : ids des branches `defaultExpanded` (parcours récursif, une fois au montage). */
function collectExpanded(nodes: TreeNode[], acc: Set<string>): Set<string> {
  for (const node of nodes) {
    if (isBranch(node)) {
      if (node.defaultExpanded) acc.add(node.id);
      collectExpanded(node.children as TreeNode[], acc);
    }
  }
  return acc;
}

/**
 * TreeView — Arborescence dépliable du Design System msyx.fr
 * (`data.html` #tree-view, calque `initTreeView` —
 * `shared/components.js:1830-1892`).
 *
 * Émet le markup canonique `.tree` (`components/lists.css:4-23`) :
 * ```html
 * <ul class="tree" role="tree" aria-label="...">
 *   <li class="tree-item tree-branch open" role="treeitem" aria-expanded="true">
 *     <button class="tree-toggle" aria-label="Basculer src">
 *       <svg class="tree-chevron">…<polyline points="5 8 8 11 11 8"/></svg>
 *       <span class="tree-icon tree-icon-folder"><svg class="icon"><use href="…#i-folder"/></svg></span>
 *       <span class="tree-label">src</span>
 *     </button>
 *     <ul class="tree tree-children open" role="group">…</ul>
 *   </li>
 *   <li class="tree-item tree-leaf" role="treeitem">
 *     <span class="tree-icon tree-icon-file"><svg class="icon"><use href="…#i-file"/></svg></span>
 *     <span class="tree-label">package.json</span>
 *   </li>
 * </ul>
 * ```
 *
 * **Data-driven** : l'arbre est décrit par `nodes` (récursif). Une branche
 * est un nœud dont `children` est défini ; sinon c'est une feuille.
 *
 * **Expansion — interne (non contrôlée)** : amorcée par `node.defaultExpanded`,
 * puis pilotée par le clic sur `.tree-toggle`. Suit la logique du vanilla
 * (aucune prop d'expansion contrôlée).
 *
 * **Double-bind `.open` (bug #1 — calque #612)** : à l'état déplié, la classe
 * `.open` DOIT être posée SIMULTANÉMENT sur le `<li>.tree-branch` (pilote la
 * rotation du chevron via `.tree-branch.open > .tree-toggle .tree-chevron`) ET
 * sur le `<ul>.tree-children` (pilote l'expansion `max-height:0 → 1000px`).
 * En oublier une = chevron figé OU contenu non déplié. `aria-expanded` reste
 * synchronisé avec `.open` sur la branche (source de l'état initial + toggle).
 *
 * **Sélection — unique par arbre** : `.selected` sur le `<li>.tree-item`
 * (branche → `.tree-item.selected > .tree-toggle` ; feuille →
 * `.tree-item.selected.tree-leaf`). Un seul item `selected` à la fois — la
 * sélection d'un nœud remplace la précédente. Non contrôlée par défaut
 * (graine `defaultSelectedId`), contrôlable via `selectedId`.
 *
 * **Clic** : sur une branche (le `.tree-toggle`) → déplie/replie ET
 * sélectionne (les deux, comme le vanilla `selectItem()` en plus du toggle) ;
 * sur une feuille → sélectionne.
 *
 * **Chevron** : SVG inline `<polyline>` unique qui pivote (-90deg fermé),
 * JAMAIS le sprite et JAMAIS de swap de glyphe. Dossier/fichier =
 * sprite `<use href>`.
 *
 * **Parité — pas de navigation clavier** : le vanilla est click-only
 * (feuilles `<li>` non focusables). Le wrapper reste iso. Une éventuelle
 * navigation aux flèches (roving-tabindex) relève de l'arbitrage ARIA #613,
 * hors calque strict.
 *
 * SSR-safe : aucun accès `window`/`document` au render (état 100% React).
 */
export function TreeView({
  nodes,
  ariaLabel,
  selectedId,
  defaultSelectedId,
  onSelect,
  className,
}: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    collectExpanded(nodes, new Set<string>()),
  );
  const [internalSelectedId, setInternalSelectedId] = useState<
    string | undefined
  >(defaultSelectedId);

  const isSelectionControlled = selectedId !== undefined;
  const currentSelectedId = isSelectionControlled
    ? selectedId
    : internalSelectedId;

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectNode(node: TreeNode) {
    if (!isSelectionControlled) {
      setInternalSelectedId(node.id);
    }
    onSelect?.(node);
  }

  function handleBranchClick(node: TreeNode) {
    // Comme le vanilla : le clic sur le toggle déplie/replie ET sélectionne.
    toggleExpanded(node.id);
    selectNode(node);
  }

  function renderNode(node: TreeNode): ReactNode {
    const selected = node.id === currentSelectedId;

    if (isBranch(node)) {
      const expanded = expandedIds.has(node.id);
      const branchClasses = [
        "tree-item",
        "tree-branch",
        expanded ? "open" : null,
        selected ? "selected" : null,
      ]
        .filter(Boolean)
        .join(" ");
      const childrenClasses = [
        "tree",
        "tree-children",
        expanded ? "open" : null,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <li
          key={node.id}
          className={branchClasses}
          role="treeitem"
          aria-expanded={expanded}
        >
          <button
            type="button"
            className="tree-toggle"
            aria-label={`Basculer ${node.label}`}
            onClick={() => handleBranchClick(node)}
          >
            <svg
              className="tree-chevron"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="5 8 8 11 11 8" />
            </svg>
            <span className="tree-icon">
              {node.icon ?? (
                <svg className="icon" aria-hidden="true">
                  <use href="/shared/icons/sprite.svg#i-folder" />
                </svg>
              )}
            </span>
            <span className="tree-label">{node.label}</span>
          </button>
          <ul className={childrenClasses} role="group">
            {(node.children as TreeNode[]).map((child) => renderNode(child))}
          </ul>
        </li>
      );
    }

    const leafClasses = ["tree-item", "tree-leaf", selected ? "selected" : null]
      .filter(Boolean)
      .join(" ");

    return (
      <li
        key={node.id}
        className={leafClasses}
        role="treeitem"
        onClick={() => selectNode(node)}
      >
        <span className="tree-icon">
          {node.icon ?? (
            <svg className="icon" aria-hidden="true">
              <use href="/shared/icons/sprite.svg#i-file" />
            </svg>
          )}
        </span>
        <span className="tree-label">{node.label}</span>
      </li>
    );
  }

  const rootClasses = ["tree", className].filter(Boolean).join(" ");

  return (
    <ul className={rootClasses} role="tree" aria-label={ariaLabel}>
      {nodes.map((node) => renderNode(node))}
    </ul>
  );
}

TreeView.displayName = "TreeView";
