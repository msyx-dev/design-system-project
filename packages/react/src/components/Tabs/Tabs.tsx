import { KeyboardEvent, ReactNode, useEffect, useRef } from "react";

export interface TabItem {
  /** Identifiant unique de l'onglet (utilisé pour `value`/`onChange` et les ids ARIA). */
  id: string;
  /** Libellé affiché dans l'onglet. */
  label: ReactNode;
  /** Contenu du panneau associé. */
  content: ReactNode;
  /** Désactive l'onglet — non sélectionnable, sauté par la navigation clavier. */
  disabled?: boolean;
}

export interface TabsProps {
  /** Liste des onglets (ordre d'affichage). */
  items: TabItem[];
  /** Id de l'onglet actif — le parent gère l'état, aucun état interne. */
  value: string;
  /** Appelé avec l'id du nouvel onglet sélectionné. */
  onChange: (id: string) => void;
  /** Classes additionnelles sur le conteneur `.tabs`. */
  className?: string;
  /** Label accessible du `role="tablist"` (`aria-label`). */
  label?: string;
}

/**
 * Tabs — Onglets du Design System msyx.fr (`navigation.html` #nav-components).
 *
 * Émet le markup canonique `.tabs` / `.tab` (`components/navigation.css`) :
 * ```html
 * <div class="tabs" role="tablist">
 *   <button class="tab active" role="tab" aria-selected="true" aria-controls="..." id="..." tabindex="0">Aperçu</button>
 *   <button class="tab" role="tab" aria-selected="false" aria-controls="..." id="..." tabindex="-1">Détails</button>
 * </div>
 * <div role="tabpanel" id="..." aria-labelledby="...">Contenu de l'aperçu</div>
 * <div role="tabpanel" id="..." aria-labelledby="..." hidden>Contenu des détails</div>
 * ```
 *
 * **Contrôlé** : le parent pilote `value`/`onChange`, aucun état interne.
 *
 * **Navigation clavier WAI-ARIA Tabs (calquée sur `initComponents` tabs,
 * `shared/components.js`)** : roving tabindex (`0` sur l'onglet actif, `-1`
 * sinon), ←/→ déplacent la sélection en bouclant, Home/End vont au premier/
 * dernier onglet activable. Les onglets `disabled` sont sautés par la
 * navigation clavier. Activation automatique (la flèche sélectionne
 * directement le nouvel onglet et lui donne le focus), à l'identique du
 * comportement `next.click()` du DS vanilla.
 *
 * SSR-safe : aucun accès à `document`/`window`, tout est piloté par les props.
 */
export function Tabs({ items, value, onChange, className, label }: TabsProps) {
  const enabledItems = items.filter((item) => !item.disabled);

  // Onglet à focus après le prochain rendu déclenché par la navigation
  // clavier (roving tabindex) — évite de dépendre d'un rAF non déterministe
  // vis-à-vis du cycle de commit React.
  const pendingFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const pendingId = pendingFocusIdRef.current;
    if (pendingId === null) return;
    pendingFocusIdRef.current = null;
    document.getElementById(`tab-${pendingId}`)?.focus();
  });

  const focusAndSelect = (id: string) => {
    pendingFocusIdRef.current = id;
    onChange(id);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const currentEnabledIndex = enabledItems.findIndex(
      (item) => item.id === id,
    );
    if (currentEnabledIndex === -1) return;

    let targetIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        targetIndex = (currentEnabledIndex + 1) % enabledItems.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex =
          (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = enabledItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = enabledItems[targetIndex];
    if (target) {
      focusAndSelect(target.id);
    }
  };

  const classes = ["tabs", className].filter(Boolean).join(" ");

  return (
    <>
      <div className={classes} role="tablist" aria-label={label}>
        {items.map((item) => {
          const isActive = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              id={`tab-${item.id}`}
              className={["tab", isActive ? "active" : null]
                .filter(Boolean)
                .join(" ")}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => !item.disabled && onChange(item.id)}
              onKeyDown={(event) => handleKeyDown(event, item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`tabpanel-${item.id}`}
            aria-labelledby={`tab-${item.id}`}
            hidden={!isActive}
          >
            {isActive ? item.content : null}
          </div>
        );
      })}
    </>
  );
}

Tabs.displayName = "Tabs";
