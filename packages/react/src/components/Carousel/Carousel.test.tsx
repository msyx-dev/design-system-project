import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Carousel, CarouselSlide } from "./Carousel";

const SLIDES: CarouselSlide[] = [
  { id: "a", content: "Diapo A" },
  { id: "b", content: "Diapo B" },
  { id: "c", content: "Diapo C" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Carousel — structure", () => {
  it("rend le markup canonique .carousel/.carousel-track/.carousel-slide xN", () => {
    render(<Carousel slides={SLIDES} index={0} onIndexChange={() => {}} />);

    const root = document.querySelector(".carousel");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("role", "region");
    expect(root).toHaveAttribute("aria-label", "Carrousel");
    expect(root).toHaveAttribute("tabindex", "0");

    expect(document.querySelector(".carousel-track")).toHaveAttribute(
      "role",
      "list",
    );
    expect(document.querySelectorAll(".carousel-slide")).toHaveLength(3);
    expect(document.querySelector(".carousel-btn-prev")).toBeInTheDocument();
    expect(document.querySelector(".carousel-btn-next")).toBeInTheDocument();
    expect(document.querySelectorAll(".carousel-dot")).toHaveLength(3);
    expect(document.querySelector(".carousel-dots")).toHaveAttribute(
      "role",
      "tablist",
    );
  });

  it("aria-label personnalisable via label", () => {
    render(
      <Carousel
        slides={SLIDES}
        index={0}
        onIndexChange={() => {}}
        label="Images du produit"
      />,
    );
    expect(document.querySelector(".carousel")).toHaveAttribute(
      "aria-label",
      "Images du produit",
    );
  });

  it("variant='cards' ajoute .carousel--cards", () => {
    render(
      <Carousel
        slides={SLIDES}
        index={0}
        onIndexChange={() => {}}
        variant="cards"
      />,
    );
    expect(document.querySelector(".carousel")).toHaveClass("carousel--cards");
  });
});

describe("Carousel — état actif", () => {
  it("la piste se translate selon l'index courant", () => {
    render(<Carousel slides={SLIDES} index={1} onIndexChange={() => {}} />);
    const track = document.querySelector(".carousel-track") as HTMLElement;
    expect(track.style.transform).toBe("translateX(-100%)");
  });

  it("seul le carousel-dot de l'index courant porte .active", () => {
    render(<Carousel slides={SLIDES} index={1} onIndexChange={() => {}} />);
    const dots = document.querySelectorAll(".carousel-dot");
    expect(dots[0]).not.toHaveClass("active");
    expect(dots[1]).toHaveClass("active");
    expect(dots[2]).not.toHaveClass("active");
  });
});

describe("Carousel — navigation", () => {
  it("bouton suivant appelle onIndexChange(index+1)", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={0} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Slide suivant" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("bouton précédent boucle sur la dernière diapositive depuis l'index 0", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={0} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Slide precedent" }));
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it("bouton suivant boucle sur la première diapositive depuis le dernier index", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={2} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Slide suivant" }));
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it("clic sur une pastille appelle onIndexChange avec son index", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={0} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(document.querySelectorAll(".carousel-dot")[2]);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it("ArrowRight/ArrowLeft sur le conteneur naviguent", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={1} onIndexChange={onIndexChange} />,
    );
    const root = document.querySelector(".carousel") as HTMLElement;
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(2);
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it("swipe tactile horizontal (>50px) navigue dans le sens du glissement", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={0} onIndexChange={onIndexChange} />,
    );
    const root = document.querySelector(".carousel") as HTMLElement;
    fireEvent.touchStart(root, { touches: [{ clientX: 200, clientY: 50 }] });
    fireEvent.touchMove(root, { touches: [{ clientX: 100, clientY: 50 }] });
    fireEvent.touchEnd(root, {
      changedTouches: [{ clientX: 100, clientY: 50 }],
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("swipe vertical (ou sous le seuil) ne déclenche pas de navigation", () => {
    const onIndexChange = vi.fn();
    render(
      <Carousel slides={SLIDES} index={0} onIndexChange={onIndexChange} />,
    );
    const root = document.querySelector(".carousel") as HTMLElement;
    fireEvent.touchStart(root, { touches: [{ clientX: 200, clientY: 50 }] });
    fireEvent.touchMove(root, { touches: [{ clientX: 220, clientY: 50 }] });
    fireEvent.touchEnd(root, {
      changedTouches: [{ clientX: 220, clientY: 50 }],
    });
    expect(onIndexChange).not.toHaveBeenCalled();
  });
});

describe("Carousel — auto-play", () => {
  it("avance automatiquement toutes les autoplayMs", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    render(
      <Carousel
        slides={SLIDES}
        index={0}
        onIndexChange={onIndexChange}
        autoplayMs={1000}
      />,
    );
    vi.advanceTimersByTime(1000);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("suspend l'auto-play tant que la souris survole le conteneur", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    render(
      <Carousel
        slides={SLIDES}
        index={0}
        onIndexChange={onIndexChange}
        autoplayMs={1000}
      />,
    );
    const root = document.querySelector(".carousel") as HTMLElement;
    fireEvent.mouseEnter(root);
    vi.advanceTimersByTime(2000);
    expect(onIndexChange).not.toHaveBeenCalled();

    fireEvent.mouseLeave(root);
    vi.advanceTimersByTime(1000);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });
});
