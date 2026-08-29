import { ReactNode } from "react";

export interface DecisionTreeChoice {
  /** Identifiant unique du choix dans le nœud (clé React). */
  id: string;
  /** Libellé affiché sur le bouton `.dtree-choice`. */
  label: ReactNode;
  /** Id du nœud révélé quand ce choix est sélectionné (calque `data-next`). */
  next: string;
  /** `aria-label` du bouton — défaut le `label` si string. */
  ariaLabel?: string;
}

export interface DecisionTreeNode {
  /** Identifiant unique du nœud — utilisé par `path` et `data-next`. */
  id: string;
  /** `question` (a des choix) ou `result` (nœud terminal). @default "question" */
  kind?: "question" | "result";
  /** Contenu du nœud, rendu dans `.dtree-node-content`. */
  content: ReactNode;
  /** Choix du nœud — obligatoire pour `kind: "question"`, ignoré sinon. */
  choices?: DecisionTreeChoice[];
  /** `aria-label` du groupe (`role="group"`/`"region"` selon `kind`). */
  ariaLabel?: string;
  /**
   * Affiche le connecteur `.dtree-connector` juste après ce nœud (calque le
   * `<div class="dtree-connector" data-from="…">` placé après un nœud dans le
   * markup vanilla, `divers.html:547`). Décoratif, optionnel par nœud — le
   * vanilla n'en place pas systématiquement après chaque nœud.
   */
  connectorAfter?: boolean;
}

export interface DecisionTreeProps {
  /** Nœuds du questionnaire, dans l'ordre d'affichage (le 1er est la racine). */
  nodes: DecisionTreeNode[];
  /**
   * Chemin parcouru — liste d'ids visités dans l'ordre, `path[0]` = racine.
   * Composant **contrôlé** : le parent pilote `path` via `onNavigate`/
   * `onReset`, aucun état interne.
   */
  path: string[];
  /** Appelé avec l'id du nœud suivant quand un choix est sélectionné. */
  onNavigate: (nextId: string) => void;
  /** Appelé au clic sur le bouton de réinitialisation. */
  onReset: () => void;
  /** `aria-label` du bouton de réinitialisation. @default "Recommencer" */
  resetLabel?: string;
  /** Libellé du bouton de réinitialisation. @default "Recommencer" */
  resetText?: ReactNode;
  /** Classes additionnelles sur `.dtree`. */
  className?: string;
}

/**
 * DecisionTree — Questionnaire pas à pas du Design System msyx.fr
 * (`divers.html` #decision-tree, calque `initDecisionTree` —
 * `shared/components.js:4059-4126`).
 *
 * Émet le markup canonique `.dtree` (`components/tracker.css`) :
 * ```html
 * <div class="dtree">
 *   <div class="dtree-node dtree-node--question active" role="group" aria-label="…">
 *     <div class="dtree-node-content">Quel type de projet ?</div>
 *     <div class="dtree-choices">
 *       <button class="dtree-choice" aria-label="Site vitrine">Site vitrine</button>
 *       <button class="dtree-choice selected" disabled aria-label="Application web">Application web</button>
 *     </div>
 *   </div>
 *   <div class="dtree-connector visible"></div>
 *   <div class="dtree-node dtree-node--result active" role="region" aria-label="…">
 *     <div class="dtree-node-content">➲ Next.js + Vercel</div>
 *   </div>
 *   <button class="dtree-reset btn-primary" aria-label="Recommencer">Recommencer</button>
 * </div>
 * ```
 *
 * **Contrôlé** (recommandation de l'issue #876) : `path` porte les ids
 * visités dans l'ordre (`path[0]` = racine, toujours présent). Un nœud est
 * `.active` (donc affiché — le CSS le masque par défaut, `display: none`)
 * ssi son id figure dans `path`. Un choix est `.selected`+`disabled` ssi son
 * nœud a déjà été « répondu » (le nœud est dans `path`, à un index < le
 * dernier) — les AUTRES choix du même nœud sont `disabled` mais pas
 * `.selected`, calque exact `siblings.forEach(btn => { btn.disabled = true;
 * btn.classList.remove('selected'); }); choice.classList.add('selected')`.
 *
 * **Connecteur `.dtree-connector`** : décoratif, optionnel par nœud
 * (`connectorAfter`). `.visible` ssi le nœud qui le précède a été dépassé
 * (présent dans `path`, pas en dernière position) — calque
 * `dtree.querySelector('.dtree-connector[data-from="' + currentNode.id + '"]')
 * .classList.add('visible')` déclenché au moment où un choix de CE nœud est
 * sélectionné.
 *
 * **Bouton de réinitialisation** : toujours rendu (comme le vanilla,
 * `style.display` piloté par une condition plutôt que monté/démonté),
 * visible (`display: ''`) ssi le dernier nœud de `path` est `kind: "result"`
 * — calque `if (nextNode.classList.contains('dtree-node--result'))
 * resetBtn.style.display = ''`. `.dtree-reset` n'a **aucune règle CSS propre**
 * (confirmé par grep sur `shared/css/**`) — c'est un hook `querySelector`
 * vanilla pur (`shared/components.js:4064`), son style vient entièrement de
 * `.btn-primary`.
 *
 * **`prefers-reduced-motion` — déjà respecté, sans code dédié** : l'animation
 * d'apparition des nœuds (`@keyframes fadeSlideIn`, `tracker.css:154`) est
 * couverte par la règle globale `@media (prefers-reduced-motion: reduce) {
 * *, *::before, *::after { animation-duration: 0.01ms !important; … } }`
 * (`components/_a11y.css:73-79`) — un kill-switch CSS site-large, pas une
 * règle locale à `.dtree-node`. Aucune logique JS supplémentaire n'est donc
 * nécessaire côté wrapper : la réduction de mouvement est déjà garantie par
 * la cascade CSS partagée du DS.
 *
 * SSR-safe : aucun accès à `document`/`window`, tout est piloté par les props.
 */
export function DecisionTree({
  nodes,
  path,
  onNavigate,
  onReset,
  resetLabel = "Recommencer",
  resetText = "Recommencer",
  className,
}: DecisionTreeProps) {
  const lastVisitedId = path[path.length - 1];
  const lastNode = nodes.find((node) => node.id === lastVisitedId);
  const showReset = lastNode?.kind === "result";

  function isAnswered(nodeId: string): boolean {
    const idx = path.indexOf(nodeId);
    return idx !== -1 && idx < path.length - 1;
  }

  const classes = ["dtree", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {nodes.map((node) => {
        const kind = node.kind ?? "question";
        const isActive = path.includes(node.id);
        const answered = isAnswered(node.id);
        const nextChosenId = answered ? path[path.indexOf(node.id) + 1] : null;

        const nodeClasses = [
          "dtree-node",
          `dtree-node--${kind}`,
          isActive ? "active" : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <>
            <div
              key={node.id}
              className={nodeClasses}
              role={kind === "result" ? "region" : "group"}
              aria-label={node.ariaLabel}
            >
              <div className="dtree-node-content">{node.content}</div>
              {kind === "question" && (
                <div className="dtree-choices">
                  {(node.choices ?? []).map((choice) => {
                    const selected = answered && choice.next === nextChosenId;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        className={[
                          "dtree-choice",
                          selected ? "selected" : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={answered}
                        aria-label={
                          choice.ariaLabel ??
                          (typeof choice.label === "string"
                            ? choice.label
                            : undefined)
                        }
                        onClick={() => {
                          if (answered) return;
                          onNavigate(choice.next);
                        }}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {node.connectorAfter && (
              <div
                key={`${node.id}-connector`}
                className={["dtree-connector", answered ? "visible" : null]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
            )}
          </>
        );
      })}
      <button
        type="button"
        className="dtree-reset btn-primary"
        style={{ display: showReset ? "" : "none" }}
        aria-label={resetLabel}
        onClick={onReset}
      >
        {resetText}
      </button>
    </div>
  );
}

DecisionTree.displayName = "DecisionTree";
