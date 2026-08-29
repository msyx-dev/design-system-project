import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Roadmap, RoadmapQuarter } from "./Roadmap";

afterEach(() => {
  cleanup();
});

const QUARTERS: RoadmapQuarter[] = [
  {
    id: "q1",
    title: "Q1 2026",
    milestones: [
      {
        id: "m1",
        status: "completed",
        title: "Infrastructure VPS",
        description: "Setup Contabo, Docker, Caddy",
        progress: 100,
      },
    ],
  },
  {
    id: "q2",
    title: "Q2 2026",
    milestones: [
      {
        id: "m2",
        status: "in-progress",
        title: "Dashboard projet",
        progress: 45,
      },
    ],
  },
  {
    id: "q3",
    title: "Q3 2026",
    milestones: [
      { id: "m3", status: "planned", title: "CI/CD Pipeline" },
    ],
  },
];

describe("Roadmap", () => {
  it("rend un .roadmap-quarter par trimestre avec son titre", () => {
    render(<Roadmap quarters={QUARTERS} />);
    expect(screen.getByText("Q1 2026")).toHaveClass("roadmap-quarter-title");
    expect(screen.getByText("Q2 2026")).toHaveClass("roadmap-quarter-title");
  });

  it("pose la classe de statut sur .roadmap-milestone", () => {
    render(<Roadmap quarters={QUARTERS} />);
    expect(
      screen.getByText("Infrastructure VPS").closest(".roadmap-milestone"),
    ).toHaveClass("completed");
    expect(
      screen.getByText("Dashboard projet").closest(".roadmap-milestone"),
    ).toHaveClass("in-progress");
    expect(
      screen.getByText("CI/CD Pipeline").closest(".roadmap-milestone"),
    ).toHaveClass("planned");
  });

  it("rend la description si fournie, l'omet sinon", () => {
    render(<Roadmap quarters={QUARTERS} />);
    expect(screen.getByText("Setup Contabo, Docker, Caddy")).toHaveClass(
      "roadmap-milestone-desc",
    );
    expect(
      screen.getByText("CI/CD Pipeline").closest(".roadmap-milestone")!
        .querySelector(".roadmap-milestone-desc"),
    ).toBeNull();
  });

  it("rend une Progress avec role=progressbar quand progress est fourni, l'omet sinon", () => {
    render(<Roadmap quarters={QUARTERS} />);
    const completedMilestone = screen
      .getByText("Infrastructure VPS")
      .closest(".roadmap-milestone")!;
    expect(
      completedMilestone.querySelector('[role="progressbar"]'),
    ).toHaveAttribute("aria-valuenow", "100");

    const plannedMilestone = screen
      .getByText("CI/CD Pipeline")
      .closest(".roadmap-milestone")!;
    expect(plannedMilestone.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("pose .roadmap-milestone-dot avant le titre", () => {
    render(<Roadmap quarters={QUARTERS} />);
    const titleEl = screen.getByText("Infrastructure VPS").closest(
      ".roadmap-milestone-title",
    )!;
    expect(titleEl.querySelector(".roadmap-milestone-dot")).not.toBeNull();
  });
});
