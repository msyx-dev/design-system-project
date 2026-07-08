import { useEffect, useId, useRef, useState } from "react";

/** Option d'une question — libellé affiché dans `<span>` de `.quiz-option`. */
export interface QuizOption {
  label: string;
}

/** Question data-driven — remplace le markup HTML statique du vanilla. */
export interface QuizQuestion {
  /** Légende de la question — `.quiz-question-title`. */
  title: string;
  /** Options proposées — rendues en `.quiz-option` (radios). */
  options: QuizOption[];
  /** Index (0-based) de la bonne réponse dans `options`. */
  correctIndex: number;
}

export interface QuizProps {
  /** Questions du quiz, dans l'ordre d'affichage. */
  questions: QuizQuestion[];
  /** Appelé une fois la dernière question répondue, avec le score final. */
  onComplete?: (score: number, total: number) => void;
  /** Appelé quand l'utilisateur clique sur `.quiz-restart`. */
  onRestart?: () => void;
  /** Texte de `.quiz-feedback.correct`. @default "Bonne réponse !" */
  feedbackCorrect?: string;
  /** Texte de `.quiz-feedback.wrong`. @default "Mauvaise réponse." */
  feedbackWrong?: string;
  /** Délai (ms) avant passage à la question suivante après réponse. @default 1000 */
  autoAdvanceMs?: number;
  /** Classes additionnelles sur `.quiz`. */
  className?: string;
}

/**
 * Props internes d'une option de quiz/poll — sous-primitive partagée entre
 * `<Quiz>` et `<Poll>` (co-localisés dans ce dossier, cf. `.quiz-option`
 * commun aux deux modes, `shared/css/components/quiz.css:48-79`).
 */
interface QuizOptionItemProps {
  /** `name` du groupe de radios natif (isolation entre questions/instances). */
  name: string;
  index: number;
  label: string;
  checked: boolean;
  disabled: boolean;
  /** `"correct"` / `"wrong"` (mode quiz uniquement) ou `null` (mode poll). */
  stateClass?: "correct" | "wrong" | null;
  onSelect: (index: number) => void;
}

/** `.quiz-option` — sous-primitive partagée par `<Quiz>` et `<Poll>`. */
export function QuizOptionItem({
  name,
  index,
  label,
  checked,
  disabled,
  stateClass,
  onSelect,
}: QuizOptionItemProps) {
  const classes = [
    "quiz-option",
    stateClass ?? null,
    checked ? "selected" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={classes}>
      <input
        type="radio"
        name={name}
        value={index}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(index)}
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Quiz — Questions à choix multiple avec scoring, feedback immédiat et
 * progression du Design System msyx.fr (`pages/formulaires.html` #quiz
 * variante quiz, calque `initQuiz` mode `"quiz"` —
 * `shared/components.js:2914-3087`).
 *
 * **Data-driven, contrôlé côté flux** : `questions` en props, `onComplete`
 * appelé une fois la dernière question répondue. La progression
 * (`currentIndex`), le score et l'état de la question courante
 * (sélection/verrouillage) restent un état INTERNE — c'est un flux temporisé
 * (auto-advance), pas une liste pilotée par le parent comme `TagInput`.
 * Restart interne (bouton `.quiz-restart`) + `onRestart` optionnel.
 *
 * Émet le markup canonique (une `.quiz-question` par question, une seule
 * `.active` à la fois) :
 * ```html
 * <div class="quiz">
 *   <div class="quiz-progress" role="progressbar" ...><div class="quiz-progress-bar" style="width:33%"></div></div>
 *   <div class="quiz-question active">
 *     <fieldset class="quiz-fieldset"><legend class="quiz-question-title">...</legend>
 *       <div class="quiz-options">
 *         <label class="quiz-option correct selected"><input type="radio" ...><span>...</span></label>
 *       </div>
 *     </fieldset>
 *     <div class="quiz-feedback show correct" role="status" aria-live="polite">Bonne réponse !</div>
 *   </div>
 *   <div class="quiz-result show" role="region" aria-label="Résultat du quiz">
 *     <div class="quiz-score" aria-live="polite">2/3 — 67%</div>
 *     <button class="quiz-restart btn-primary" style="margin-top:1rem;">Recommencer</button>
 *   </div>
 * </div>
 * ```
 *
 * **Classes d'état critiques** (`display:none` sans elles, cf.
 * `shared/css/components/quiz.css`) :
 * - `.quiz-question.active` — une seule question visible à la fois
 *   (`quiz.css:24-30`). Retirée de TOUTES les questions puis `.quiz-result.show`
 *   posée à la fin (`showResult()`, `components.js:2978-2988`).
 * - `.quiz-feedback.show` (+ `.correct`/`.wrong`) — invisible sans `.show`
 *   (`quiz.css:80-97`).
 * - `.quiz-option.correct`/`.wrong`/`.selected` — posées ensemble : la bonne
 *   réponse est toujours marquée `.correct`, le choix erroné de l'utilisateur
 *   `.wrong`, son choix (bon ou mauvais) `.selected`
 *   (`handleQuizAnswer()`, `components.js:2947-2959`).
 * - `.quiz-result.show` — écran de score final (`quiz.css:98-106`).
 *
 * **Style inline obligatoire — `.quiz-progress-bar`** : `quiz.css:18-23` ne
 * déclare AUCUN `width` (seulement `height:100%` + `transition:width`). Le
 * pourcentage `((currentIndex + 1) / total) * 100` est donc posé en
 * `style.width` à chaque rendu, comme le vanilla (`updateProgress()`,
 * `components.js:2929-2933`) — piège identique à `.progress-fill`
 * (`FileUpload`, #622) et `.tag-item--removing` (`TagInput`, #612).
 *
 * **Auto-advance temporisé** (`autoAdvanceMs`, défaut 1000ms — cf.
 * `components.js:2973-2980`) : `setTimeout` déclenché à la sélection d'une
 * réponse, nettoyé au démontage (pas d'avance ni d'appel `onComplete` après
 * unmount, cf. StrictMode double-invoke).
 *
 * **Radios verrouillés après réponse** : `disabled` posé sur toutes les
 * options de la question courante dès la sélection (`disableOptions()`,
 * `components.js:2941-2945`) — aucune re-réponse possible avant l'auto-advance.
 *
 * A11y : `role="progressbar"` + `aria-valuenow` dynamique sur `.quiz-progress`,
 * `role="status"` + `aria-live="polite"` sur `.quiz-feedback`, `aria-live="polite"`
 * sur `.quiz-score`. `useId()` isole le `name` des groupes de radios entre
 * questions et entre instances de `<Quiz>` sur la même page.
 *
 * SSR-safe : aucun accès à `document`/`window` en dehors du timer d'effet.
 */
export function Quiz({
  questions,
  onComplete,
  onRestart,
  feedbackCorrect = "Bonne réponse !",
  feedbackWrong = "Mauvaise réponse.",
  autoAdvanceMs = 1000,
  className,
}: QuizProps) {
  const total = questions.length;
  const baseId = useId();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const question = questions[currentIndex];
  const pct = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const resultPct = total > 0 ? Math.round((score / total) * 100) : 0;

  function handleSelect(optionIndex: number) {
    if (answered || !question) return;
    const isCorrect = optionIndex === question.correctIndex;
    const newScore = score + (isCorrect ? 1 : 0);

    setSelected(optionIndex);
    setAnswered(true);
    setScore(newScore);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const nextIndex = currentIndex + 1;
      if (nextIndex < total) {
        setCurrentIndex(nextIndex);
        setSelected(null);
        setAnswered(false);
      } else {
        setFinished(true);
        onComplete?.(newScore, total);
      }
    }, autoAdvanceMs);
  }

  function handleRestart() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setScore(0);
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setFinished(false);
    onRestart?.();
  }

  return (
    <div className={["quiz", className].filter(Boolean).join(" ")}>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progression du quiz"
      >
        <div className="quiz-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      {questions.map((q, qIndex) => {
        const isCurrent = qIndex === currentIndex && !finished;
        const isAnswered = isCurrent && answered;
        const isCorrectAnswer = isAnswered && selected === q.correctIndex;

        const feedbackClasses = [
          "quiz-feedback",
          isAnswered ? "show" : null,
          isAnswered ? (isCorrectAnswer ? "correct" : "wrong") : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            className={["quiz-question", isCurrent ? "active" : null]
              .filter(Boolean)
              .join(" ")}
            key={qIndex}
          >
            <fieldset className="quiz-fieldset">
              <legend className="quiz-question-title">{q.title}</legend>
              <div className="quiz-options">
                {q.options.map((option, optIndex) => {
                  const isSelected = isCurrent && selected === optIndex;
                  let stateClass: "correct" | "wrong" | null = null;
                  if (isAnswered) {
                    if (optIndex === q.correctIndex) stateClass = "correct";
                    else if (isSelected) stateClass = "wrong";
                  }
                  return (
                    <QuizOptionItem
                      key={optIndex}
                      name={`${baseId}-q${qIndex}`}
                      index={optIndex}
                      label={option.label}
                      checked={isSelected}
                      disabled={isAnswered}
                      stateClass={stateClass}
                      onSelect={handleSelect}
                    />
                  );
                })}
              </div>
            </fieldset>
            <div className={feedbackClasses} role="status" aria-live="polite">
              {isAnswered
                ? isCorrectAnswer
                  ? feedbackCorrect
                  : feedbackWrong
                : ""}
            </div>
          </div>
        );
      })}

      <div
        className={["quiz-result", finished ? "show" : null]
          .filter(Boolean)
          .join(" ")}
        role="region"
        aria-label="Résultat du quiz"
      >
        <div className="quiz-score" aria-live="polite">
          {finished ? `${score}/${total} — ${resultPct}%` : ""}
        </div>
        <button
          type="button"
          className="quiz-restart btn-primary"
          style={{ marginTop: "1rem" }}
          onClick={handleRestart}
        >
          Recommencer
        </button>
      </div>
    </div>
  );
}

Quiz.displayName = "Quiz";
