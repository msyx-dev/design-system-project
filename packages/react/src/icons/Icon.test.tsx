import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icon, IconName } from "./Icon";

afterEach(cleanup);

const ALL_NAMES: IconName[] = [
  "chevron-left",
  "chevron-right",
  "check",
  "upload",
  "file",
  "folder",
  "eye",
  "eye-off",
  "message-circle",
  "sun",
  "moon",
];

describe("Icon — primitif inline auto-contenu (#713)", () => {
  it("rend un <svg class='icon' viewBox='0 0 24 24' data-icon> par défaut", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("icon");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("data-icon", "check");
  });

  it("inline les paths du glyphe et n'émet JAMAIS de <use>", () => {
    const { container } = render(<Icon name="check" aria-hidden="true" />);
    expect(container.querySelector("path")).not.toBeNull();
    expect(container.querySelector("use")).toBeNull();
  });

  it("pose fill=none/stroke=currentColor en attributs (auto-contenu)", () => {
    const { container } = render(<Icon name="sun" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });

  it("surcharge className (ex. mode-switch-icon) sans perdre le glyphe", () => {
    const { container } = render(
      <Icon name="sun" className="mode-switch-icon mode-switch-icon--sun" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("mode-switch-icon");
    expect(svg).not.toHaveClass("icon");
    expect(svg?.querySelector("path")).not.toBeNull();
  });

  it("passe-plat aria-hidden / width / height", () => {
    const { container } = render(
      <Icon name="file" aria-hidden="true" width={18} height={18} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
  });

  it("chaque glyphe (11) rend au moins un enfant SVG, sans <use>", () => {
    ALL_NAMES.forEach((name) => {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector(`svg[data-icon="${name}"]`);
      expect(svg?.querySelector("path, circle")).not.toBeNull();
      expect(svg?.querySelector("use")).toBeNull();
      unmount();
    });
  });
});
