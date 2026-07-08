import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Poll, PollQuestion, PollResult } from "./Poll";

const question: PollQuestion = {
  title: "Quel framework préférez-vous ?",
  options: [{ label: "React" }, { label: "Vue" }, { label: "Svelte" }],
};

const results: PollResult[] = [
  { label: "React", pct: 20 },
  { label: "Vue", pct: 55 },
  { label: "Svelte", pct: 25 },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Poll — structure", () => {
  it("rend .quiz-question.active + une .quiz-option par option, sans .quiz-poll-results.show", () => {
    render(<Poll question={question} onVote={() => {}} />);

    expect(document.querySelector(".quiz-question")).toHaveClass("active");
    expect(document.querySelectorAll(".quiz-option")).toHaveLength(3);
    expect(document.querySelector(".quiz-poll-results")).not.toHaveClass(
      "show",
    );
    expect(document.querySelectorAll(".quiz-poll-bar")).toHaveLength(0);
  });

  it("aucun radio n'est coché ni désactivé avant vote", () => {
    render(<Poll question={question} onVote={() => {}} />);
    document.querySelectorAll('input[type="radio"]').forEach((radio) => {
      expect(radio).not.toBeChecked();
      expect(radio).not.toBeDisabled();
    });
  });

  it("isole le name des groupes de radios entre deux instances de Poll", () => {
    render(
      <>
        <Poll question={question} onVote={() => {}} />
        <Poll question={question} onVote={() => {}} />
      </>,
    );
    const radios = document.querySelectorAll('input[type="radio"]');
    const names = new Set(
      Array.from(radios).map((radio) => (radio as HTMLInputElement).name),
    );
    expect(names.size).toBe(2);
  });
});

describe("Poll — vote", () => {
  it("appelle onVote(index) au clic sur une option, sans générer de résultat random en interne", () => {
    const onVote = vi.fn();
    render(<Poll question={question} onVote={onVote} />);

    fireEvent.click(document.querySelectorAll('input[type="radio"]')[1]);

    expect(onVote).toHaveBeenCalledTimes(1);
    expect(onVote).toHaveBeenCalledWith(1);
    // Sans results fournis en retour par le parent : rien à afficher.
    expect(document.querySelector(".quiz-poll-results")).not.toHaveClass(
      "show",
    );
    expect(document.querySelectorAll(".quiz-poll-bar")).toHaveLength(0);
  });
});

describe("Poll — contrôlé (voted + results fournis par le parent)", () => {
  it("verrouille tous les radios et marque .selected sur l'option votée", () => {
    render(
      <Poll
        question={question}
        voted={1}
        results={results}
        onVote={() => {}}
      />,
    );

    document.querySelectorAll('input[type="radio"]').forEach((radio) => {
      expect(radio).toBeDisabled();
    });
    const options = document.querySelectorAll(".quiz-option");
    expect(options[1]).toHaveClass("selected");
    expect(options[0]).not.toHaveClass("selected");
    expect(options[2]).not.toHaveClass("selected");
  });

  it("affiche .quiz-poll-results.show avec role=region + aria-live=polite et une barre par résultat", () => {
    render(
      <Poll
        question={question}
        voted={0}
        results={results}
        onVote={() => {}}
      />,
    );

    const pollResults = document.querySelector(".quiz-poll-results");
    expect(pollResults).toHaveClass("show");
    expect(pollResults).toHaveAttribute("role", "region");
    expect(pollResults).toHaveAttribute("aria-label", "Résultats du sondage");
    expect(pollResults).toHaveAttribute("aria-live", "polite");

    const bars = document.querySelectorAll(".quiz-poll-bar");
    expect(bars).toHaveLength(3);
    expect(bars[1].querySelector(".quiz-poll-label")?.textContent).toBe("Vue");
    expect(bars[1].querySelector(".quiz-poll-pct")?.textContent).toBe("55%");
  });

  it("anime .quiz-poll-fill : width:0% au montage puis width:{pct}% après le double frame de révélation", () => {
    render(
      <Poll
        question={question}
        voted={0}
        results={results}
        onVote={() => {}}
      />,
    );

    const fillsBefore = document.querySelectorAll(".quiz-poll-fill");
    expect((fillsBefore[0] as HTMLElement).style.width).toBe("0%");
    expect((fillsBefore[1] as HTMLElement).style.width).toBe("0%");

    act(() => {
      vi.advanceTimersByTime(40);
    });

    const fillsAfter = document.querySelectorAll(".quiz-poll-fill");
    expect((fillsAfter[0] as HTMLElement).style.width).toBe("20%");
    expect((fillsAfter[1] as HTMLElement).style.width).toBe("55%");
    expect((fillsAfter[2] as HTMLElement).style.width).toBe("25%");
  });

  it("nettoie les frames programmées au démontage (pas d'erreur après unmount)", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { unmount } = render(
      <Poll
        question={question}
        voted={0}
        results={results}
        onVote={() => {}}
      />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
