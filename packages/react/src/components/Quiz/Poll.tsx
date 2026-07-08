import { useEffect, useId, useRef, useState } from "react";
import { QuizOption, QuizOptionItem } from "./Quiz";

/** Question du sondage — sans `correctIndex` (pas de bonne réponse). */
export interface PollQuestion {
  /** Légende de la question — `.quiz-question-title`. */
  title: string;
  /** Options proposées — rendues en `.quiz-option` (radios). */
  options: QuizOption[];
}

/** Résultat agrégé d'une option — fourni par le PARENT après `onVote`. */
export interface PollResult {
  label: string;
  /** Pourcentage 0-100, déjà calculé côté parent. */
  pct: number;
}

export interface PollProps {
  /** Question du sondage (une seule, pas de progression multi-questions). */
  question: PollQuestion;
  /**
   * Résultats agrégés, fournis par le parent après `onVote` (aucun random
   * généré ici — contrairement au vanilla `handlePollAnswer()`,
   * `components.js:3031-3036`). Omis/vide → `.quiz-poll-results` reste sans
   * `.show` (pas encore de résultats à afficher).
   */
  results?: PollResult[];
  /** Index voté (contrôlé) — verrouille les radios + marque `.selected`. */
  voted?: number;
  /** Appelé avec l'index choisi au clic sur une option. */
  onVote: (index: number) => void;
  /** Classes additionnelles sur `.quiz`. */
  className?: string;
}

/**
 * `.quiz-poll-bar` — une barre de résultat, avec l'animation de révélation
 * `width:0%` → `width:{pct}%` (double frame, cf. `handlePollAnswer()`,
 * `components.js:3055-3061`). Le CSS (`quiz.css:129-134`) ne déclare AUCUN
 * `width` par défaut — sans ce style inline la barre serait toujours à 100%
 * (piège identique à `.quiz-progress-bar` / `.progress-fill` FileUpload).
 *
 * La révélation 0%→pct% ne joue qu'au premier montage de la barre (édition
 * du DOM identique au vanilla qui construit les `.quiz-poll-fill` avec
 * `style="width:0%"` puis les anime après paint). Les mises à jour
 * ultérieures de `pct` (ex. resultats live) sont reflétées directement — la
 * transition CSS `width 0.5s ease` s'applique alors naturellement puisque
 * l'élément est déjà monté avec une largeur non nulle.
 */
function PollBar({ label, pct }: { label: string; pct: number }) {
  const [width, setWidth] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) {
      setWidth(pct);
      return undefined;
    }
    mountedRef.current = true;

    let innerCancel: (() => void) | null = null;
    const outerCancel = scheduleFrame(() => {
      innerCancel = scheduleFrame(() => setWidth(pct));
    });

    return () => {
      outerCancel();
      innerCancel?.();
    };
  }, [pct]);

  return (
    <div className="quiz-poll-bar">
      <div className="quiz-poll-fill" style={{ width: `${width}%` }} />
      <span className="quiz-poll-label">{label}</span>
      <span className="quiz-poll-pct">{pct}%</span>
    </div>
  );
}

/**
 * Planifie un callback à la frame suivante. Utilise `requestAnimationFrame`
 * quand disponible (navigateurs réels) ; retombe sur `setTimeout(..., 16)`
 * sinon (environnements de test type jsdom, qui n'implémentent pas
 * `requestAnimationFrame` — cf. `src/test-setup.ts`). Retourne une fonction
 * d'annulation symétrique dans les deux cas.
 */
function scheduleFrame(callback: () => void): () => void {
  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    const id = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

/**
 * Poll — Variante sondage (sans correction) du composant Quiz/Poll du Design
 * System msyx.fr (`pages/formulaires.html` #quiz variante poll, calque
 * `initQuiz` mode `"poll"` — `shared/components.js:2914-3087`).
 *
 * **Contrôlé, data-driven — ne génère AUCUN random** : contrairement au
 * vanilla (`handlePollAnswer()` tire des pourcentages aléatoires,
 * `components.js:3031-3036`), `<Poll>` reçoit `results` déjà calculés du
 * parent (après l'appel de `onVote`). Pas d'état de progression multi-
 * questions (une seule question par instance, pas d'auto-advance).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="quiz">
 *   <div class="quiz-question active">
 *     <fieldset class="quiz-fieldset"><legend class="quiz-question-title">...</legend>
 *       <div class="quiz-options">
 *         <label class="quiz-option selected"><input type="radio" ...><span>...</span></label>
 *       </div>
 *     </fieldset>
 *     <div class="quiz-poll-results show" role="region" aria-label="Résultats du sondage" aria-live="polite">
 *       <div class="quiz-poll-bar"><div class="quiz-poll-fill" style="width:42%"></div><span class="quiz-poll-label">...</span><span class="quiz-poll-pct">42%</span></div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **Classes d'état critiques** : `.quiz-poll-results.show` — `display:flex`
 * vs `display:none` (`quiz.css:113-121`), posée uniquement quand `results`
 * contient au moins une entrée. `.quiz-option.selected` sur l'option votée
 * (`voted`).
 *
 * **Styles inline obligatoires** : `.quiz-poll-fill[style.width]` — voir
 * `PollBar` ci-dessus pour l'animation 0%→pct%.
 *
 * **Radios verrouillés après vote** : dès que `voted` est défini, toutes les
 * options sont `disabled` (pas de re-vote, calque `disableOptions()`).
 *
 * A11y : `role="region"` + `aria-live="polite"` sur `.quiz-poll-results`
 * (conservés du vanilla). `useId()` isole le `name` du groupe de radios entre
 * instances de `<Poll>` sur la même page.
 *
 * SSR-safe : aucun accès à `document` hors effets ; `window.requestAnimationFrame`
 * gardé derrière un test de disponibilité (cf. `scheduleFrame`).
 */
export function Poll({
  question,
  results,
  voted,
  onVote,
  className,
}: PollProps) {
  const baseId = useId();
  const hasResults = Boolean(results && results.length > 0);
  const isLocked = typeof voted === "number";

  return (
    <div className={["quiz", className].filter(Boolean).join(" ")}>
      <div className="quiz-question active">
        <fieldset className="quiz-fieldset">
          <legend className="quiz-question-title">{question.title}</legend>
          <div className="quiz-options">
            {question.options.map((option, index) => (
              <QuizOptionItem
                key={index}
                name={`${baseId}-poll`}
                index={index}
                label={option.label}
                checked={voted === index}
                disabled={isLocked}
                onSelect={onVote}
              />
            ))}
          </div>
        </fieldset>
        <div
          className={["quiz-poll-results", hasResults ? "show" : null]
            .filter(Boolean)
            .join(" ")}
          role="region"
          aria-label="Résultats du sondage"
          aria-live="polite"
        >
          {results?.map((result, index) => (
            <PollBar key={index} label={result.label} pct={result.pct} />
          ))}
        </div>
      </div>
    </div>
  );
}

Poll.displayName = "Poll";
