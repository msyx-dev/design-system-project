import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle — rendu", () => {
  it("rend un bouton avec role=switch", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    const btn = screen.getByRole("switch");
    expect(btn).toBeInTheDocument();
  });

  it("a la classe theme-toggle", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("theme-toggle");
  });

  it("rend le track et le thumb", () => {
    const { container } = render(
      <ThemeToggle mode="dark" onToggle={() => {}} />,
    );
    expect(container.querySelector(".theme-toggle-track")).toBeInTheDocument();
    expect(container.querySelector(".theme-toggle-thumb")).toBeInTheDocument();
  });
});

describe("ThemeToggle — accessibilité", () => {
  it("aria-checked=false en mode dark (light inactif)", () => {
    render(<ThemeToggle mode="dark" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("aria-checked=true en mode light (light actif)", () => {
    render(<ThemeToggle mode="light" onToggle={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
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
    expect(btn).toHaveClass("theme-toggle");
    expect(btn).toHaveClass("my-toggle");
  });
});
