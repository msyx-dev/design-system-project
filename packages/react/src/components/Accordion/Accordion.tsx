import { type ReactNode, useId, useState } from "react";
import { Icon } from "../../icons/Icon";

/**
 * Niveau du heading enveloppant `.accordion-header` (WAI-ARIA APG).
 * `"div"` = aucun heading (opt-out pour les accordéons imbriqués où un heading
 * fausserait le plan du document).
 */
export type AccordionHeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6" | "div";

export interface AccordionItem {
  /** Identifiant stable — clé React, modèle d'ouverture ET graine des `id` ARIA. Unique dans l'accordéon. */
  id: string;
  /** Contenu de l'en-tête (`.accordion-header`), rendu dans un `<span>` avant la flèche. */
  title: ReactNode;
  /** Contenu du panneau (`.accordion-body`). TOUJOURS monté — c'est le CSS qui gère `display`. */
  content: ReactNode;
  /**
   * Amorce l'état ouvert au montage (mode non contrôlé uniquement) — calque du
   * vanilla, qui lit `.open` sur le `.accordion-item` au montage
   * (`shared/components.js:127`).
   */
  defaultOpen?: boolean;
}

export interface AccordionProps {
  /** Items rendus en frères (`.accordion-item`), `key = item.id`. */
  items: AccordionItem[];
  /**
   * Ids ouverts — mode **contrôlé**. Fourni (même `[]`), l'état interne ET les
   * `defaultOpen` sont ignorés : le parent doit répercuter `onOpenChange`.
   */
  openIds?: string[];
  /**
   * Appelé à chaque bascule avec `(nextOpenIds, item)`. `nextOpenIds` est
   * toujours trié dans l'ordre de `items` (jamais l'ordre des clics).
   */
  onOpenChange?: (openIds: string[], item: AccordionItem) => void;
  /** Niveau du heading enveloppant l'en-tête — défaut : `"h3"`. */
  headingLevel?: AccordionHeadingLevel;
  /** Classes additionnelles sur le `<div>` racine (aucune classe DS par défaut). */
  className?: string;
}

/**
 * Accordion — Sections repliables du Design System msyx.fr
 * (`divers.html` #accordion — calque de la logique inline d'`initComponents`,
 * `shared/components.js:121-140` ; il n'existe PAS de fonction `initAccordion`).
 *
 * Émet le markup canonique (`components/lists.css:44-52`) :
 * ```html
 * <div>                                 <!-- racine sans classe DS : il n'existe AUCUN .accordion -->
 *   <div class="accordion-item open">
 *     <h3>                              <!-- heading APG, configurable, sans classe -->
 *       <div class="accordion-header" id="…-header" role="button" tabindex="0"
 *            aria-expanded="true" aria-controls="…-body">
 *         <span>Quelle stack est utilisée ?</span>
 *         <svg class="icon icon--sm accordion-arrow" aria-hidden="true">…</svg>
 *       </div>
 *     </h3>
 *     <div class="accordion-body" id="…-body" role="region" aria-labelledby="…-header">…</div>
 *   </div>
 *   <div class="accordion-item">…</div>
 * </div>
 * ```
 *
 * **`.open` va sur le `.accordion-item` (le PARENT), JAMAIS sur l'en-tête.**
 * Les deux seuls sélecteurs d'état du CSS sont `.accordion-item.open .accordion-body`
 * (`display:none → block`) et `.accordion-item.open .accordion-arrow`
 * (`rotate(180deg)`). Poser `.open` sur `.accordion-header` = composant
 * visuellement mort (rejeu de l'incident `<ActionMenu>`).
 *
 * **Pas de conteneur `.accordion`** : la classe n'existe pas dans le DS, les
 * `.accordion-item` sont des frères. La racine ne porte que le `className` du
 * consumer, s'il en fournit un. Ne JAMAIS inventer de classe ici (le contrôle
 * de parité React de `bin/generate-registry.js` échoue sur toute classe absente
 * du CSS DS).
 *
 * **Pas d'animation de hauteur** : l'ouverture est un `display:none → block`
 * sec. Aucune transition sur `.accordion-body` dans le DS — ne pas en simuler
 * une côté React (`height`/`max-height`/`ref` de mesure interdits).
 *
 * **Panneau toujours monté** : `content` reste dans le DOM même fermé, c'est le
 * CSS qui le masque (iso-vanilla). Pas d'attribut `hidden` non plus : il
 * introduirait une 2e source de vérité d'affichage, désynchronisable par une
 * surcharge CSS d'un consumer.
 *
 * **Multi-ouverture indépendante** : calque du vanilla, dont le `toggle()` ne
 * touche que `h.parentElement` — rien ne ferme les frères. Aucune prop
 * d'exclusivité n'est exposée (hors périmètre du calque).
 *
 * **Ouverture — non contrôlée par défaut** : graine `item.defaultOpen`, puis
 * clic/clavier. **Contrôlée** dès que `openIds` est fourni (même `[]`) :
 * l'état interne et les `defaultOpen` sont alors ignorés (convention alignée
 * sur `<TreeView selectedId>`).
 *
 * **A11y — WAI-ARIA APG « Accordion »** : `aria-expanded` synchronisé,
 * `aria-controls` → id du panneau, panneau en `role="region"` +
 * `aria-labelledby` → id de l'en-tête, ids issus de `useId()` (uniques entre
 * instances, SSR-safe). ⚠️ `useId()` produit des ids de forme `:r0:` : valides
 * en attribut HTML et pour les relations ARIA, mais **inutilisables dans un
 * sélecteur CSS `#id`** — les tests comparent les attributs, pas via
 * `querySelector("#…")`.
 *
 * **Écart assumé vs APG — l'en-tête est un `<div role="button">`, pas un
 * `<button>`** : iso-vanilla, et OBLIGATOIRE ici. Le DS n'a aucun reset global
 * `button` (`shared/css/base.css` + `components/_base.css` vérifiés) et
 * `.accordion-header` ne déclare ni `border`, ni `font-family`, ni `color` : un
 * `<button>` natif hériterait de la bordure UA `outset`, de la police système
 * (au lieu d'Inter) et de `color: ButtonText`, **ce dernier cassant le dark
 * mode**. Le corriger imposerait de modifier `lists.css` → bump `@ds-version`,
 * hors périmètre. NE PAS « corriger » sans ticket DS dédié.
 * Le clavier reproduit donc explicitement le contrat natif : Enter et Space
 * basculent, avec `preventDefault()` (Space scrollerait la page sinon).
 *
 * SSR-safe : aucun accès `window`/`document` au render (état 100 % React).
 */
export function Accordion({
  items,
  openIds,
  onOpenChange,
  headingLevel: Heading = "h3",
  className,
}: AccordionProps) {
  const baseId = useId();
  const [internalOpenIds, setInternalOpenIds] = useState<Set<string>>(
    () => new Set(items.filter((it) => it.defaultOpen).map((it) => it.id)),
  );

  const isControlled = openIds !== undefined;
  const currentOpenIds = isControlled ? new Set(openIds) : internalOpenIds;

  function toggle(item: AccordionItem) {
    const willOpen = !currentOpenIds.has(item.id);
    // Ordre déterministe : toujours l'ordre de `items`, jamais l'ordre des clics.
    const nextIds = items
      .filter((it) =>
        it.id === item.id ? willOpen : currentOpenIds.has(it.id),
      )
      .map((it) => it.id);

    if (!isControlled) setInternalOpenIds(new Set(nextIds));
    onOpenChange?.(nextIds, item);
  }

  return (
    <div className={className}>
      {items.map((item) => {
        const open = currentOpenIds.has(item.id);
        const headerId = `${baseId}-${item.id}-header`;
        const bodyId = `${baseId}-${item.id}-body`;
        // `.open` sur le .accordion-item — le PARENT, jamais l'en-tête.
        const itemClasses = ["accordion-item", open ? "open" : null]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={item.id} className={itemClasses}>
            <Heading>
              <div
                id={headerId}
                className="accordion-header"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => toggle(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(item);
                  }
                }}
              >
                <span>{item.title}</span>
                <Icon
                  name="chevron-down"
                  className="icon icon--sm accordion-arrow"
                  aria-hidden="true"
                />
              </div>
            </Heading>
            <div
              id={bodyId}
              className="accordion-body"
              role="region"
              aria-labelledby={headerId}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Accordion.displayName = "Accordion";
