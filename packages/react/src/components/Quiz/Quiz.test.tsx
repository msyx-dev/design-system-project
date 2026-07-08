import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Quiz, QuizQuestion } from "./Quiz";

const questions: QuizQuestion[] = [
  {
    title: "Q1 — token accent",
    options: [
      { label: "--primary" },
      { label: "--accent" },
      { label: "--text" },
    ],
    correctIndex: 1,
  },
  {
    title: "Q2 — nombre de thèmes",
    options: [{ label: "1" }, { label: "2" }, { label: "3" }],
    correctIndex: 0,
  },
];

function activeQuestion(): HTMLElement {
  return document.querySelector(".quiz-question.active") as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Quiz — structure", () => {
  it("rend une seule .quiz-question.active (la première) + width initial de la progress-bar", () => {
    render(<Quiz questions={questions} />);

    expect(document.querySelectorAll(".quiz-question.active")).toHaveLength(1);
    expect(document.querySelectorAll(".quiz-question")[0]).toHaveClass(
      "active",
    );
    expect(document.querySelectorAll(".quiz-question")[1]).not.toHaveClass(
      "active",
    );

    const bar = document.querySelector(".quiz-progress-bar") as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });

  it("expose role=progressbar + aria-valuenow sur .quiz-progress, role=status + aria-live sur le feedback", () => {
    render(<Quiz questions={questions} />);

    const progress = document.querySelector(".quiz-progress");
    expect(progress).toHaveAttribute("role", "progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");

    const feedback = activeQuestion().querySelector(".quiz-feedback");
    expect(feedback).toHaveAttribute("role", "status");
    expect(feedback).toHaveAttribute("aria-live", "polite");
  });

  it("le .quiz-result n'a pas .show avant la fin du quiz", () => {
    render(<Quiz questions={questions} />);
    expect(document.querySelector(".quiz-result")).not.toHaveClass("show");
  });

  it("isole le name des groupes de radios entre deux instances de Quiz", () => {
    render(
      <>
        <Quiz questions={questions} />
        <Quiz questions={questions} />
      </>,
    );
    const radios = document.querySelectorAll('input[type="radio"]');
    const names = new Set(
      Array.from(radios).map((radio) => (radio as HTMLInputElement).name),
    );
    // 2 instances x 2 questions = au moins 4 groupes distincts
    expect(names.size).toBeGreaterThanOrEqual(4);
  });
});

describe("Quiz — réponse correcte", () => {
  it("marque .correct + .selected sur la bonne réponse choisie et affiche le feedback correct", () => {
    render(<Quiz questions={questions} />);
    const radios = activeQuestion().querySelectorAll('input[type="radio"]');

    fireEvent.click(radios[1]); // correctIndex = 1

    const options = activeQuestion().querySelectorAll(".quiz-option");
    expect(options[1]).toHaveClass("correct");
    expect(options[1]).toHaveClass("selected");
    expect(options[0]).not.toHaveClass("wrong");
    expect(options[0]).not.toHaveClass("correct");

    const feedback = activeQuestion().querySelector(".quiz-feedback");
    expect(feedback).toHaveClass("show");
    expect(feedback).toHaveClass("correct");
    expect(feedback?.textContent).toBe("Bonne réponse !");
  });

  it("accepte un texte de feedback correct personnalisé", () => {
    render(<Quiz questions={questions} feedbackCorrect="Gagné !" />);
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );

    expect(activeQuestion().querySelector(".quiz-feedback")?.textContent).toBe(
      "Gagné !",
    );
  });
});

describe("Quiz — réponse incorrecte", () => {
  it("marque .wrong + .selected sur le choix erroné, .correct sur la bonne réponse, feedback wrong", () => {
    render(<Quiz questions={questions} feedbackWrong="Perdu." />);
    const radios = activeQuestion().querySelectorAll('input[type="radio"]');

    fireEvent.click(radios[0]); // faux, correctIndex = 1

    const options = activeQuestion().querySelectorAll(".quiz-option");
    expect(options[0]).toHaveClass("wrong");
    expect(options[0]).toHaveClass("selected");
    expect(options[1]).toHaveClass("correct");
    expect(options[1]).not.toHaveClass("selected");

    const feedback = activeQuestion().querySelector(".quiz-feedback");
    expect(feedback).toHaveClass("show");
    expect(feedback).toHaveClass("wrong");
    expect(feedback?.textContent).toBe("Perdu.");
  });

  it("verrouille (disabled) tous les radios de la question courante après réponse", () => {
    render(<Quiz questions={questions} />);
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[0],
    );

    activeQuestion()
      .querySelectorAll('input[type="radio"]')
      .forEach((radio) => {
        expect(radio).toBeDisabled();
      });
  });
});

describe("Quiz — auto-advance", () => {
  it("passe à la question suivante après autoAdvanceMs (défaut 1000ms) et met à jour .active + la progress-bar", () => {
    render(<Quiz questions={questions} />);
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(document.querySelectorAll(".quiz-question")[0]).toHaveClass(
      "active",
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const allQuestions = document.querySelectorAll(".quiz-question");
    expect(allQuestions[0]).not.toHaveClass("active");
    expect(allQuestions[1]).toHaveClass("active");

    const bar = document.querySelector(".quiz-progress-bar") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("respecte un autoAdvanceMs personnalisé", () => {
    render(<Quiz questions={questions} autoAdvanceMs={300} />);
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(document.querySelectorAll(".quiz-question")[0]).toHaveClass(
      "active",
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelectorAll(".quiz-question")[1]).toHaveClass(
      "active",
    );
  });

  it("nettoie le timer d'auto-advance au démontage (pas d'erreur/log après unmount)", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { unmount } = render(<Quiz questions={questions} />);
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("Quiz — fin de quiz / score / restart", () => {
  it("affiche .quiz-result.show + le score final et appelle onComplete(score, total)", () => {
    const onComplete = vi.fn();
    render(<Quiz questions={questions} onComplete={onComplete} />);

    // Q1 : bonne réponse (index 1)
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Q2 : mauvaise réponse (correctIndex 0, choix index 1)
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(1, 2);

    expect(document.querySelector(".quiz-result")).toHaveClass("show");
    expect(document.querySelector(".quiz-score")?.textContent).toBe(
      "1/2 — 50%",
    );
    expect(document.querySelectorAll(".quiz-question.active")).toHaveLength(0);
  });

  it("le bouton « Recommencer » réinitialise le quiz (première question, score, options) et appelle onRestart", () => {
    const onRestart = vi.fn();
    render(<Quiz questions={questions} onRestart={onRestart} />);

    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[1],
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(
      activeQuestion().querySelectorAll('input[type="radio"]')[0],
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(document.querySelector(".quiz-result")).toHaveClass("show");

    fireEvent.click(screen.getByRole("button", { name: "Recommencer" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".quiz-result")).not.toHaveClass("show");

    const allQuestions = document.querySelectorAll(".quiz-question");
    expect(allQuestions[0]).toHaveClass("active");
    expect(allQuestions[0].querySelectorAll(".quiz-option")[0]).not.toHaveClass(
      "correct",
    );
    expect(allQuestions[0].querySelectorAll(".quiz-option")[0]).not.toHaveClass(
      "selected",
    );

    const bar = document.querySelector(".quiz-progress-bar") as HTMLElement;
    expect(bar.style.width).toBe("50%");

    activeQuestion()
      .querySelectorAll('input[type="radio"]')
      .forEach((radio) => {
        expect(radio).not.toBeDisabled();
      });
  });
});
