import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AchievementBadge,
  AchievementGrid,
  AchievementLevel,
  AchievementProgress,
} from "./AchievementBadge";

afterEach(() => {
  cleanup();
});

const LEVELS: AchievementLevel[] = ["bronze", "silver", "gold"];

describe("AchievementBadge — niveaux et états", () => {
  it.each(LEVELS)("level=%s émet .achievement.achievement--%s", (level) => {
    render(<AchievementBadge level={level} icon="🏆" title="Champion" />);
    expect(
      document.querySelector(`.achievement.achievement--${level}`),
    ).toBeInTheDocument();
  });

  it("émet .achievement-icon (aria-hidden) + .achievement-title", () => {
    render(<AchievementBadge level="gold" icon="🏆" title="Champion" />);
    const icon = document.querySelector(".achievement-icon");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveTextContent("🏆");
    expect(document.querySelector(".achievement-title")).toHaveTextContent(
      "Champion",
    );
  });

  it("state fourni émet .achievement-state", () => {
    render(
      <AchievementBadge
        level="gold"
        icon="🏆"
        title="Champion"
        state="Débloqué"
      />,
    );
    expect(document.querySelector(".achievement-state")).toHaveTextContent(
      "Débloqué",
    );
  });

  it("state omis : aucun .achievement-state (démo « Niveaux »)", () => {
    render(<AchievementBadge level="bronze" icon="🥉" title="Bronze" />);
    expect(
      document.querySelector(".achievement-state"),
    ).not.toBeInTheDocument();
  });

  it("locked ajoute .locked", () => {
    render(<AchievementBadge level="gold" icon="🌟" title="Etoile" locked />);
    expect(document.querySelector(".achievement")).toHaveClass("locked");
  });

  it("sans locked, pas de .locked", () => {
    render(<AchievementBadge level="gold" icon="🌟" title="Etoile" />);
    expect(document.querySelector(".achievement")).not.toHaveClass("locked");
  });

  it("isNew ajoute .new", () => {
    render(<AchievementBadge level="gold" icon="🎯" title="Précision" isNew />);
    expect(document.querySelector(".achievement")).toHaveClass("new");
  });

  it("locked et isNew peuvent se combiner avec le niveau", () => {
    render(
      <AchievementBadge
        level="silver"
        icon="⚡"
        title="Vitesse"
        locked
        isNew
      />,
    );
    const el = document.querySelector(".achievement") as HTMLElement;
    expect(el.classList.contains("achievement--silver")).toBe(true);
    expect(el.classList.contains("locked")).toBe(true);
    expect(el.classList.contains("new")).toBe(true);
  });

  it("className additionnelle est fusionnée", () => {
    render(
      <AchievementBadge level="gold" icon="🏆" title="x" className="custom" />,
    );
    expect(document.querySelector(".achievement.custom")).toBeInTheDocument();
  });
});

describe("AchievementGrid", () => {
  it("émet .achievement-grid avec ses enfants", () => {
    render(
      <AchievementGrid>
        <AchievementBadge level="gold" icon="🏆" title="Champion" />
      </AchievementGrid>,
    );
    const grid = document.querySelector(".achievement-grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.querySelector(".achievement")).toBeInTheDocument();
  });
});

describe("AchievementProgress", () => {
  it("émet .achievement-progress > .achievement-progress-label + .achievement-progress-bar > .achievement-progress-fill", () => {
    render(<AchievementProgress label="4/6 badges" value={66.6} />);
    expect(document.querySelector(".achievement-progress")).toBeInTheDocument();
    expect(
      document.querySelector(".achievement-progress-label"),
    ).toHaveTextContent("4/6 badges");
    const bar = document.querySelector(".achievement-progress-bar");
    expect(bar).toBeInTheDocument();
    const fill = document.querySelector(
      ".achievement-progress-fill",
    ) as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).toBe("66.6%");
  });

  it("expose role=progressbar + aria-valuenow/min/max", () => {
    render(
      <AchievementProgress
        label="x"
        value={40}
        ariaLabel="Progression badges"
      />,
    );
    const bar = document.querySelector(".achievement-progress-bar");
    expect(bar).toHaveAttribute("role", "progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-label", "Progression badges");
  });

  it("value est bornée à [0, 100]", () => {
    const { rerender } = render(<AchievementProgress label="x" value={150} />);
    let fill = document.querySelector(
      ".achievement-progress-fill",
    ) as HTMLElement;
    expect(fill.style.width).toBe("100%");

    rerender(<AchievementProgress label="x" value={-10} />);
    fill = document.querySelector(".achievement-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });
});
