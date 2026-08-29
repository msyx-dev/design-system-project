import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Lightbox, LightboxImage } from "./Lightbox";

const IMAGES: LightboxImage[] = [
  { id: "1", src: "img1-full.jpg", caption: "Première image", thumbnail: "T1" },
  { id: "2", src: "img2-full.jpg", caption: "Deuxième image", thumbnail: "T2" },
  { id: "3", src: "img3-full.jpg", thumbnail: "T3" },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.overflow = "";
});

describe("Lightbox — structure galerie", () => {
  it("rend .lightbox-gallery avec un .lightbox-trigger par image", () => {
    render(<Lightbox images={IMAGES} />);
    const triggers = document.querySelectorAll(".lightbox-trigger");
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toHaveAttribute("tabindex", "0");
    expect(triggers[0]).toHaveAttribute("aria-label", "Ouvrir l'image 1");
    expect(triggers[0]).toHaveTextContent("T1");
  });

  it("triggerLabel personnalisable par image", () => {
    render(
      <Lightbox
        images={[
          {
            id: "1",
            src: "a.jpg",
            thumbnail: "T",
            triggerLabel: "Agrandir la photo",
          },
        ]}
      />,
    );
    expect(document.querySelector(".lightbox-trigger")).toHaveAttribute(
      "aria-label",
      "Agrandir la photo",
    );
  });

  it("l'overlay est présent mais fermé (pas de .lb-open) au repos", () => {
    render(<Lightbox images={IMAGES} />);
    const overlay = document.querySelector(".lightbox-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).not.toHaveClass("lb-open");
    expect(overlay).toHaveAttribute("role", "dialog");
    expect(overlay).toHaveAttribute("aria-modal", "true");
    expect(overlay).toHaveAttribute("aria-label", "Visionneuse d'images");
  });
});

describe("Lightbox — ouverture", () => {
  it("clic sur une vignette ouvre l'overlay (.lb-open) avec la bonne image", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[1]);

    const overlay = document.querySelector(".lightbox-overlay");
    expect(overlay).toHaveClass("lb-open");
    const img = document.querySelector(".lightbox-img") as HTMLImageElement;
    expect(img).toHaveAttribute("src", "img2-full.jpg");
    expect(img).toHaveAttribute("alt", "Deuxième image");
    expect(document.querySelector(".lightbox-caption")).toHaveTextContent(
      "Deuxième image",
    );
    expect(document.querySelector(".lightbox-counter")).toHaveTextContent(
      "2 / 3",
    );
  });

  it("Entrée sur une vignette ouvre aussi l'overlay", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.keyDown(document.querySelectorAll(".lightbox-trigger")[0], {
      key: "Enter",
    });
    expect(document.querySelector(".lightbox-overlay")).toHaveClass("lb-open");
  });

  it("le bouton fermer reçoit le focus à l'ouverture (calque btnClose.focus())", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    expect(document.querySelector(".lightbox-close")).toHaveFocus();
  });

  it("verrouille le scroll du body à l'ouverture", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it(".lightbox-img devient .lb-img-visible après le chargement (onLoad)", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    const img = document.querySelector(".lightbox-img") as HTMLImageElement;
    expect(img).not.toHaveClass("lb-img-visible");
    fireEvent.load(img);
    expect(img).toHaveClass("lb-img-visible");
  });
});

describe("Lightbox — restitution du focus (WAI-APG, ajoutée vs le vanilla)", () => {
  it("Échap ferme l'overlay ET restaure le focus sur la vignette déclenchante", () => {
    render(<Lightbox images={IMAGES} />);
    const trigger = document.querySelectorAll(
      ".lightbox-trigger",
    )[1] as HTMLElement;

    fireEvent.click(trigger);
    expect(document.querySelector(".lightbox-overlay")).toHaveClass("lb-open");
    expect(document.querySelector(".lightbox-close")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.querySelector(".lightbox-overlay")).not.toHaveClass(
      "lb-open",
    );
    expect(trigger).toHaveFocus();
  });

  it("le bouton fermer restaure aussi le focus sur la vignette déclenchante", () => {
    render(<Lightbox images={IMAGES} />);
    const trigger = document.querySelectorAll(
      ".lightbox-trigger",
    )[0] as HTMLElement;

    fireEvent.click(trigger);
    fireEvent.click(document.querySelector(".lightbox-close") as HTMLElement);

    expect(trigger).toHaveFocus();
  });

  it("clic sur l'overlay (hors image) ferme et restaure le focus", () => {
    render(<Lightbox images={IMAGES} />);
    const trigger = document.querySelectorAll(
      ".lightbox-trigger",
    )[0] as HTMLElement;
    fireEvent.click(trigger);

    const overlay = document.querySelector(".lightbox-overlay") as HTMLElement;
    fireEvent.click(overlay);

    expect(overlay).not.toHaveClass("lb-open");
    expect(trigger).toHaveFocus();
  });

  it("clic sur l'image elle-même (enfant de l'overlay) NE ferme PAS", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    const img = document.querySelector(".lightbox-img") as HTMLElement;
    fireEvent.click(img);
    expect(document.querySelector(".lightbox-overlay")).toHaveClass("lb-open");
  });

  it("restaure le focus sur la vignette ouverte AU CLAVIER (Entrée), pas une autre", () => {
    render(<Lightbox images={IMAGES} />);
    const triggers = document.querySelectorAll(".lightbox-trigger");
    fireEvent.keyDown(triggers[2], { key: "Enter" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(triggers[2]).toHaveFocus();
  });

  it("déverrouille le scroll du body à la fermeture", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("l'image reste montée 250ms après fermeture puis est retirée (fade-out)", () => {
    vi.useFakeTimers();
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    expect(document.querySelector(".lightbox-img")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector(".lightbox-img")).toBeInTheDocument();

    vi.advanceTimersByTime(250);
    expect(document.querySelector(".lightbox-img")).not.toBeInTheDocument();
  });
});

describe("Lightbox — navigation clavier globale (calque exact initLightbox)", () => {
  it("ArrowRight/ArrowLeft naviguent entre les images tant que l'overlay est ouvert", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(document.querySelector(".lightbox-img")).toHaveAttribute(
      "src",
      "img2-full.jpg",
    );

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(document.querySelector(".lightbox-img")).toHaveAttribute(
      "src",
      "img1-full.jpg",
    );
  });

  it("ArrowLeft/ArrowRight ne bouclent PAS aux bornes (calque exact : newIdx hors bornes → no-op)", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(document.querySelector(".lightbox-img")).toHaveAttribute(
      "src",
      "img1-full.jpg",
    );
  });

  it("les boutons prev/next sont masqués (.lb-hidden) aux bornes de la galerie", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    expect(document.querySelector(".lightbox-prev")).toHaveClass("lb-hidden");
    expect(document.querySelector(".lightbox-next")).not.toHaveClass(
      "lb-hidden",
    );

    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[2]);
    expect(document.querySelector(".lightbox-prev")).not.toHaveClass(
      "lb-hidden",
    );
    expect(document.querySelector(".lightbox-next")).toHaveClass("lb-hidden");
  });

  it("clic sur le bouton suivant navigue sans fermer (stopPropagation)", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Image suivante" }));
    expect(document.querySelector(".lightbox-overlay")).toHaveClass("lb-open");
    expect(document.querySelector(".lightbox-img")).toHaveAttribute(
      "src",
      "img2-full.jpg",
    );
  });

  it("touches non gérées (ex: Tab) sont ignorées", () => {
    render(<Lightbox images={IMAGES} />);
    fireEvent.click(document.querySelectorAll(".lightbox-trigger")[0]);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.querySelector(".lightbox-overlay")).toHaveClass("lb-open");
  });
});
