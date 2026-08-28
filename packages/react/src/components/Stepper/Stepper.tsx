import { Fragment, HTMLAttributes, ReactNode } from "react";
import { Icon } from "../../icons/Icon";

/**
 * États réellement stylés (`shared/css/components/navigation.css:23-25,28`) :
 * `.step-dot.completed`/`.active`/`.pending` + `.step-line.completed`.
 */
export type StepState = "completed" | "active" | "pending";

export interface StepData {
  /** Clé React et identité de l'étape. */
  id: string | number;
  /** Contenu de `.step-label`. */
  label: ReactNode;
  /** État — pilote `.step-dot.{state}` (et `.step-line.completed` après une étape complétée). */
  state: StepState;
  /**
   * Contenu de `.step-dot`. Omis → coche (`<Icon name="check">`) si `state`
   * vaut `completed` (markup réel `navigation.html:437,439` — icône SVG du
   * sprite, PAS l'entité `&#10003;` de l'`example` du registre, périmé),
   * sinon le rang 1-indexé de l'étape (`navigation.html:441,443`).
   */
  dotContent?: ReactNode;
  /** Classes additionnelles sur `.step`. */
  className?: string;
}

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  steps: StepData[];
}

/**
 * `Stepper` — Design System msyx.fr (`pages/navigation.html` #stepper).
 *
 * Émet `.stepper > (.step > .step-dot.{state} + .step-label) / .step-line(.completed)`.
 *
 * **Ligne après l'étape i** : `.completed` si `steps[i].state === "completed"`
 * (vérifié sur les deux markups réels — `navigation.html` 4 étapes et
 * l'`example` du registre 3 étapes : la ligne suivant une étape complétée
 * est toujours `.step-line.completed`, la ligne suivant `active`/`pending`
 * ne l'est jamais).
 *
 * **Composant contrôlé/statique** : aucun état interne, `steps` piloté par
 * le parent (le passage d'une étape à l'autre reste décidé par le
 * consumer, comme `Timeline`/`ProgressTracker`).
 */
export function Stepper({
  steps,
  className,
  "aria-label": ariaLabel,
  ...rest
}: StepperProps & { "aria-label"?: string }) {
  const classes = ["stepper", className].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-label={ariaLabel ?? "Étapes"} {...rest}>
      {steps.map((step, idx) => (
        <Fragment key={step.id}>
          <div className={["step", step.className].filter(Boolean).join(" ")}>
            <div className={`step-dot ${step.state}`}>
              {step.dotContent ??
                (step.state === "completed" ? (
                  <Icon name="check" aria-hidden="true" />
                ) : (
                  idx + 1
                ))}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                "step-line",
                step.state === "completed" && "completed",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
Stepper.displayName = "Stepper";
