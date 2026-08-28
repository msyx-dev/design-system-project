import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Stepper, StepData } from "./Stepper";

afterEach(() => {
  cleanup();
});

const STEPS: StepData[] = [
  { id: 1, label: "Projet", state: "completed" },
  { id: 2, label: "Config", state: "completed" },
  { id: 3, label: "Deploy", state: "active" },
  { id: 4, label: "Verif", state: "pending" },
];

describe("Stepper — markup et états", () => {
  it("émet .stepper, aria-label par défaut", () => {
    render(<Stepper steps={STEPS} />);
    const el = document.querySelector(".stepper");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-label", "Étapes");
  });

  it("chaque étape émet .step > .step-dot.{state} + .step-label", () => {
    render(<Stepper steps={STEPS} />);
    const steps = document.querySelectorAll(".step");
    expect(steps).toHaveLength(4);

    const dots = document.querySelectorAll(".step-dot");
    expect(dots[0]).toHaveClass("completed");
    expect(dots[1]).toHaveClass("completed");
    expect(dots[2]).toHaveClass("active");
    expect(dots[3]).toHaveClass("pending");

    const labels = document.querySelectorAll(".step-label");
    expect(labels[0]).toHaveTextContent("Projet");
    expect(labels[3]).toHaveTextContent("Verif");
  });

  it("dot completed sans dotContent affiche l'icône check (.icon)", () => {
    render(<Stepper steps={STEPS} />);
    const dots = document.querySelectorAll(".step-dot");
    expect(dots[0].querySelector("svg.icon")).toBeInTheDocument();
    expect(dots[1].querySelector("svg.icon")).toBeInTheDocument();
  });

  it("dot active/pending sans dotContent affiche le rang 1-indexé", () => {
    render(<Stepper steps={STEPS} />);
    const dots = document.querySelectorAll(".step-dot");
    expect(dots[2]).toHaveTextContent("3");
    expect(dots[3]).toHaveTextContent("4");
  });

  it("dotContent explicite prime sur le défaut", () => {
    const steps: StepData[] = [
      { id: 1, label: "A", state: "pending", dotContent: "★" },
    ];
    render(<Stepper steps={steps} />);
    expect(document.querySelector(".step-dot")).toHaveTextContent("★");
  });

  it("N étapes -> N-1 .step-line, présentes uniquement entre les étapes", () => {
    render(<Stepper steps={STEPS} />);
    expect(document.querySelectorAll(".step-line")).toHaveLength(3);
  });

  it(".step-line est .completed après une étape completed, pas après active/pending", () => {
    render(<Stepper steps={STEPS} />);
    const lines = document.querySelectorAll(".step-line");
    // ligne après step1(completed) -> completed
    expect(lines[0]).toHaveClass("completed");
    // ligne après step2(completed) -> completed
    expect(lines[1]).toHaveClass("completed");
    // ligne après step3(active) -> pas completed
    expect(lines[2]).not.toHaveClass("completed");
  });

  it("un seul step : aucune .step-line", () => {
    render(<Stepper steps={[{ id: 1, label: "Seul", state: "active" }]} />);
    expect(document.querySelectorAll(".step-line")).toHaveLength(0);
  });

  it("className additionnelle par step est fusionnée sur .step", () => {
    const steps: StepData[] = [
      { id: 1, label: "A", state: "active", className: "custom-step" },
    ];
    render(<Stepper steps={steps} />);
    expect(document.querySelector(".step.custom-step")).toBeInTheDocument();
  });

  it("className additionnelle sur la racine est fusionnée", () => {
    render(<Stepper steps={STEPS} className="custom" />);
    expect(document.querySelector(".stepper.custom")).toBeInTheDocument();
  });
});
