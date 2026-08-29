import { RefObject, useEffect } from "react";

/**
 * Éléments consideres comme focalisables par le piège de tabulation — liste
 * IDENTIQUE à celle du DS vanilla (`FOCUSABLE_SELECTOR` d'`initBottomSheet`,
 * `shared/components.js`, #825), pour que React et vanilla piègent exactement
 * le même ensemble d'éléments.
 */
export const FOCUS_TRAP_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * useFocusTrap — piège la tabulation à l'intérieur d'un conteneur tant qu'il
 * est actif (surface modale ouverte). `Tab` depuis le dernier élément
 * focalisable revient au premier, `Maj+Tab` depuis le premier va au dernier.
 *
 * **Pourquoi un piège en plus d'`inert`** (#862) : `inert` sur l'arrière-plan
 * neutralise effectivement la page derrière la surface — mais les surfaces du
 * DS ne le posent que sur elles-mêmes quand elles sont FERMÉES (pour que leur
 * contenu hors écran ne reste pas tabulable). Rien ne neutralise donc
 * l'arrière-plan quand la surface est ouverte : `role="dialog"` +
 * `aria-modal="true"` ANNONCENT au lecteur d'écran que le reste de la page est
 * inerte, sans que quoi que ce soit ne l'applique — `Tab` continuait de
 * parcourir le contenu derrière le panneau malgré l'annonce. Constat identique
 * à celui qui a produit le piège vanilla du bottom sheet (#825).
 *
 * **Primitive partagée** : même sélecteur et même logique de bouclage que le
 * vanilla, utilisée par `<Drawer>` et `<BottomSheet>`. `<Modal>` n'en a pas
 * besoin — il est porté sur `<dialog>` + `showModal()`, dont le piège est
 * natif au navigateur.
 *
 * Le listener est posé sur le conteneur lui-même (et non sur `document`) :
 * il ne se déclenche donc que lorsque le focus est déjà à l'intérieur —
 * exactement le moment où il y a quelque chose à piéger. Le contrat de la
 * surface appelante est de déplacer le focus dans le panneau à l'ouverture
 * (bouton de fermeture pour `<Drawer>`/`<BottomSheet>`).
 *
 * @param containerRef conteneur dont la tabulation doit boucler
 * @param active piège actif (typiquement le prop `open` de la surface)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables =
        container.querySelectorAll<HTMLElement>(FOCUS_TRAP_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = container.ownerDocument.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || activeElement === container) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last || activeElement === container) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, active]);
}
