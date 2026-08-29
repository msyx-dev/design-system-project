import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { Rating } from "./Rating";

describe("Rating — structure interactive", () => {
  it("rend le markup canonique .rating/.rating-star avec role=radiogroup/radio", () => {
    render(<Rating value={3} onChange={() => {}} />);

    const group = document.querySelector(".rating");
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute("role", "radiogroup");
    expect(group).toHaveAttribute("aria-label", "Notation");

    const stars = document.querySelectorAll(".rating-star");
    expect(stars).toHaveLength(5);
    stars.forEach((star) => expect(star).toHaveAttribute("role", "radio"));
  });

  it("applique .active aux étoiles <= value et aria-checked sur la seule étoile sélectionnée", () => {
    render(<Rating value={3} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));

    stars.slice(0, 3).forEach((star) => expect(star).toHaveClass("active"));
    stars.slice(3).forEach((star) => expect(star).not.toHaveClass("active"));

    expect(stars[2]).toHaveAttribute("aria-checked", "true");
    expect(stars[0]).toHaveAttribute("aria-checked", "false");
    expect(stars[4]).toHaveAttribute("aria-checked", "false");
  });

  it("roving tabindex — tabindex=0 sur l'étoile de la valeur courante, -1 sur les autres", () => {
    render(<Rating value={2} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));

    expect(stars[1]).toHaveAttribute("tabindex", "0");
    stars
      .filter((_, i) => i !== 1)
      .forEach((star) => expect(star).toHaveAttribute("tabindex", "-1"));
  });

  it("value=0 — la première étoile reçoit tabindex=0 (garde-fou aligné vanilla)", () => {
    render(<Rating value={0} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));
    expect(stars[0]).toHaveAttribute("tabindex", "0");
    expect(stars[0]).toHaveAttribute("aria-checked", "false");
  });

  it("aria-label par étoile utilise le max réel (divergence documentée vs hardcode vanilla)", () => {
    render(<Rating value={0} max={3} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));
    expect(stars[0]).toHaveAttribute("aria-label", "Note 1 sur 3");
    expect(stars[2]).toHaveAttribute("aria-label", "Note 3 sur 3");
  });

  it("applique .rating--sm / .rating--lg selon la prop size", () => {
    const { rerender } = render(
      <Rating value={1} onChange={() => {}} size="sm" />,
    );
    expect(document.querySelector(".rating")).toHaveClass("rating--sm");

    rerender(<Rating value={1} onChange={() => {}} size="lg" />);
    expect(document.querySelector(".rating")).toHaveClass("rating--lg");
  });
});

describe("Rating — survol", () => {
  it("mouseover pose .hover sur les étoiles <= l'index survolé (jamais .active)", async () => {
    const user = userEvent.setup();
    render(<Rating value={1} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));

    await user.hover(stars[3]);

    stars.slice(0, 4).forEach((star) => {
      expect(star).toHaveClass("hover");
      expect(star).not.toHaveClass("active");
    });
    expect(stars[4]).not.toHaveClass("hover");
  });

  it("mouseout retire .hover et restaure .active selon value", async () => {
    const user = userEvent.setup();
    render(<Rating value={2} onChange={() => {}} />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));

    await user.hover(stars[4]);
    expect(stars[4]).toHaveClass("hover");

    await user.unhover(stars[4]);
    expect(stars[4]).not.toHaveClass("hover");
    expect(stars[1]).toHaveClass("active");
    expect(stars[2]).not.toHaveClass("active");
  });
});

describe("Rating — interaction souris", () => {
  it("clic sur une étoile appelle onChange avec sa valeur (1-indexée)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Rating value={1} onChange={onChange} />);
    const stars = document.querySelectorAll(".rating-star");

    await user.click(stars[3]);

    expect(onChange).toHaveBeenCalledWith(4);
  });
});

function ControlledHarness({ max = 5 }: { max?: number }) {
  const [value, setValue] = useState(2);
  return <Rating value={value} max={max} onChange={setValue} />;
}

describe("Rating — navigation clavier WAI-ARIA radiogroup (#836)", () => {
  it("ArrowRight déplace la sélection vers l'étoile suivante et le focus suit", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[1].focus();
    await user.keyboard("{ArrowRight}");

    expect(stars()[2]).toHaveAttribute("aria-checked", "true");
    expect(stars()[2]).toHaveFocus();
  });

  it("ArrowLeft boucle vers la dernière étoile depuis la première", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[0].focus();
    await user.keyboard("{ArrowLeft}");

    expect(stars()[4]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowRight boucle vers la première étoile depuis la dernière", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[4].focus();
    await user.keyboard("{ArrowRight}");

    expect(stars()[0]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowDown/ArrowUp fonctionnent comme ArrowRight/ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[1].focus();
    await user.keyboard("{ArrowDown}");
    expect(stars()[2]).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowUp}");
    expect(stars()[1]).toHaveAttribute("aria-checked", "true");
  });

  it("Home/End sautent à la première/dernière étoile", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[1].focus();
    await user.keyboard("{End}");
    expect(stars()[4]).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(stars()[0]).toHaveAttribute("aria-checked", "true");
  });

  it("roving tabindex suit la sélection après un déplacement clavier", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const stars = () => Array.from(document.querySelectorAll(".rating-star"));

    stars()[1].focus();
    await user.keyboard("{ArrowRight}");

    expect(stars()[2]).toHaveAttribute("tabindex", "0");
    stars()
      .filter((_, i) => i !== 2)
      .forEach((star) => expect(star).toHaveAttribute("tabindex", "-1"));
  });
});

describe("Rating — mode lecture seule", () => {
  it("readonly déduit de l'absence d'onChange — role=img, pas de role radio/tabindex", () => {
    render(<Rating value={4} />);

    const group = document.querySelector(".rating");
    expect(group).toHaveClass("rating--readonly");
    expect(group).toHaveAttribute("role", "img");
    expect(group).not.toHaveAttribute("role", "radiogroup");
    expect(group).toHaveAttribute("aria-label", "Note : 4 sur 5");

    const stars = document.querySelectorAll(".rating-star");
    stars.forEach((star) => {
      expect(star).not.toHaveAttribute("role");
      expect(star).not.toHaveAttribute("tabindex");
    });
  });

  it("readonly explicite (avec onChange fourni) reste inerte au clic", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Rating value={2} onChange={onChange} readonly />);

    const stars = document.querySelectorAll(".rating-star");
    await user.click(stars[4]);

    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector(".rating")).toHaveAttribute("role", "img");
  });

  it("applique .active aux étoiles <= value en lecture seule", () => {
    render(<Rating value={2} readonlyLabel="Note : 2 sur 5" />);
    const stars = Array.from(document.querySelectorAll(".rating-star"));
    expect(stars[0]).toHaveClass("active");
    expect(stars[1]).toHaveClass("active");
    expect(stars[2]).not.toHaveClass("active");
  });
});
