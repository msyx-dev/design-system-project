import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle — rendu", () => {
  it("rend un bouton avec role=switch", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    const btn = screen.getByRole("switch");
    expect(btn).toBeInTheDocument();
  });

  it("a la classe mode-switch", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("mode-switch");
  });

  it("ajoute is-dark en mode dark, l'omet en mode light", () => {
    const { rerender } = render(
      <ThemeToggle mode="dark" onToggle={() => {}} />,
    );
    expect(screen.getByRole("switch")).toHaveClass("is-dark");
    rerender(<ThemeToggle mode="light" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).not.toHaveClass("is-dark");
  });

  it("rend le track, le thumb et les 2 icônes", () => {
    const { container } = render(
      <ThemeToggle mode="dark" onToggle={() => {}} />,
    );
    expect(container.querySelector(".mode-switch-track")).toBeInTheDocument();
    expect(container.querySelector(".mode-switch-thumb")).toBeInTheDocument();
    expect(
      container.querySelector(".mode-switch-icon--sun"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".mode-switch-icon--moon"),
    ).toBeInTheDocument();
  });

  it("les icônes sont inline (paths, data-icon) sans <use> sprite", () => {
    const { container } = render(
      <ThemeToggle mode="dark" onToggle={() => {}} />,
    );
    const sun = container.querySelector(".mode-switch-icon--sun");
    const moon = container.querySelector(".mode-switch-icon--moon");
    expect(sun).toHaveAttribute("data-icon", "sun");
    expect(moon).toHaveAttribute("data-icon", "moon");
    expect(sun?.querySelector("path")).not.toBeNull();
    expect(container.querySelector("use")).toBeNull();
  });
});

describe("ThemeToggle — accessibilité", () => {
  it("aria-checked=true en mode dark (#382 — DARK actif)", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("aria-checked=false en mode light", () => {
    render(<ThemeToggle mode="light" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("label auto en mode dark", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-label",
      "Passer en mode clair",
    );
  });

  it("label auto en mode light", () => {
    render(<ThemeToggle mode="light" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-label",
      "Passer en mode sombre",
    );
  });

  it("label override si prop label fournie", () => {
    render(
      <ThemeToggle
        mode="dark"
        onToggle={() => {}}
        label="Thème sombre actif"
      />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-label",
      "Thème sombre actif",
    );
  });

  it("type=button pour éviter submit implicite", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("type", "button");
  });
});

describe("ThemeToggle — interaction", () => {
  it("appelle onToggle au clic", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle mode="dark" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("ne déclenche pas onToggle si disabled", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle mode="dark" onToggle={onToggle} disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("ThemeToggle — className", () => {
  it("fusionne une className custom", () => {
    render(
      <ThemeToggle mode="dark" onToggle={() => {}} className="my-toggle" />,
    );
    const btn = screen.getByRole("switch");
    expect(btn).toHaveClass("mode-switch");
    expect(btn).toHaveClass("my-toggle");
  });
});
