import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Slider } from "./Slider";

afterEach(() => {
  cleanup();
});

describe("Slider — structure", () => {
  it("rend le markup canonique .slider-group/.slider-header/.slider-track", () => {
    render(<Slider value={50} onChange={() => {}} label="Volume" showValue />);

    expect(document.querySelector(".slider-group")).toBeInTheDocument();
    expect(document.querySelector(".slider-header")).toBeInTheDocument();
    const input = document.querySelector(".slider-track");
    expect(input).toBeInTheDocument();
    expect(input?.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "range");
  });

  it("lie le label via htmlFor/id", () => {
    render(<Slider value={50} onChange={() => {}} label="Opacité" />);
    const input = screen.getByLabelText("Opacité");
    expect(input).toHaveClass("slider-track");
  });

  it("n'affiche pas .slider-header si ni label ni showValue", () => {
    render(<Slider value={50} onChange={() => {}} />);
    expect(document.querySelector(".slider-header")).not.toBeInTheDocument();
  });
});

describe("Slider — --slider-fill (état critique)", () => {
  it("pose --slider-fill au bon pourcentage pour une value donnée", () => {
    render(<Slider value={25} min={0} max={100} onChange={() => {}} />);
    const track = document.querySelector(".slider-track") as HTMLElement;
    expect(track.style.getPropertyValue("--slider-fill")).toBe("25%");
  });

  it("calcule --slider-fill en tenant compte de min/max non-défaut", () => {
    render(<Slider value={16} min={8} max={72} onChange={() => {}} />);
    const track = document.querySelector(".slider-track") as HTMLElement;
    // (16-8)/(72-8) = 12.5%
    expect(track.style.getPropertyValue("--slider-fill")).toBe("12.5%");
  });

  it("recalcule --slider-fill quand value change (rerender)", () => {
    const { rerender } = render(
      <Slider value={10} min={0} max={100} onChange={() => {}} />,
    );
    const track = document.querySelector(".slider-track") as HTMLElement;
    expect(track.style.getPropertyValue("--slider-fill")).toBe("10%");

    rerender(<Slider value={90} min={0} max={100} onChange={() => {}} />);
    expect(track.style.getPropertyValue("--slider-fill")).toBe("90%");
  });
});

describe("Slider — onChange", () => {
  it("appelle onChange avec un number au changement de valeur", () => {
    const handleChange = vi.fn();
    render(
      <Slider
        value={20}
        min={0}
        max={100}
        onChange={handleChange}
        label="Test"
      />,
    );
    const input = screen.getByLabelText("Test");
    fireEvent.change(input, { target: { value: "60" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(60);
    expect(typeof handleChange.mock.calls[0][0]).toBe("number");
  });
});

describe("Slider — showValue / unit", () => {
  it("affiche la valeur dans .slider-value-display quand showValue", () => {
    render(<Slider value={75} onChange={() => {}} showValue />);
    const display = document.querySelector(".slider-value-display");
    expect(display).toBeInTheDocument();
    expect(display).toHaveTextContent("75");
  });

  it("affiche la valeur + unit dans .slider-value-display", () => {
    render(<Slider value={8} onChange={() => {}} showValue unit="px" />);
    const display = document.querySelector(".slider-value-display");
    expect(display).toHaveTextContent("8px");
  });

  it("n'affiche pas .slider-value-display si showValue est absent", () => {
    render(<Slider value={75} onChange={() => {}} label="Opacité" />);
    expect(
      document.querySelector(".slider-value-display"),
    ).not.toBeInTheDocument();
  });
});

describe("Slider — disabled", () => {
  it("pose .slider-disabled sur le groupe et disabled sur l'input", () => {
    render(
      <Slider value={30} onChange={() => {}} label="Désactivé" disabled />,
    );
    expect(document.querySelector(".slider-group")).toHaveClass(
      "slider-disabled",
    );
    const input = screen.getByLabelText("Désactivé");
    expect(input).toBeDisabled();
  });

  it("n'ajoute pas .slider-disabled quand disabled est absent", () => {
    render(<Slider value={30} onChange={() => {}} label="Actif" />);
    expect(document.querySelector(".slider-group")).not.toHaveClass(
      "slider-disabled",
    );
  });
});
