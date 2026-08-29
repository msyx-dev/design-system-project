import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { VideoEmbed } from "./VideoEmbed";

afterEach(() => {
  cleanup();
});

describe("VideoEmbed — chargement différé", () => {
  it("ne monte AUCUN iframe au rendu initial", () => {
    render(<VideoEmbed src="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(document.querySelector(".video-embed-overlay")).toBeInTheDocument();
    expect(document.querySelector(".video-embed")).not.toHaveClass("loaded");
  });

  it("monte l'iframe au clic sur la façade, avec ?autoplay=1", () => {
    render(<VideoEmbed src="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    fireEvent.click(screen.getByRole("button", { name: "Lancer la lecture" }));

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
    expect(document.querySelector(".video-embed")).toHaveClass("loaded");
    // la façade disparaît une fois chargé (calque .loaded .video-embed-overlay)
    expect(
      document.querySelector(".video-embed-overlay"),
    ).not.toBeInTheDocument();
  });

  it("Entrée/Espace sur la façade activent aussi la lecture", () => {
    render(<VideoEmbed src="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    const overlay = screen.getByRole("button", { name: "Lancer la lecture" });
    fireEvent.keyDown(overlay, { key: "Enter" });
    expect(document.querySelector("iframe")).toBeInTheDocument();
  });

  it("Espace sur la façade active la lecture (idempotent au second déclenchement)", () => {
    render(<VideoEmbed src="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    const overlay = screen.getByRole("button", { name: "Lancer la lecture" });
    fireEvent.keyDown(overlay, { key: " " });
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("attributs iframe : allow, allowFullScreen, title=label", () => {
    render(
      <VideoEmbed
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        label="Lecteur promo"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lancer la lecture" }));
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).toHaveAttribute("allow", "autoplay; encrypted-media");
    expect(iframe).toHaveAttribute("title", "Lecteur promo");
    expect(document.querySelector(".video-embed")).toHaveAttribute(
      "aria-label",
      "Lecteur promo",
    );
  });
});

describe("VideoEmbed — variante carte", () => {
  it("cardTitle absent → pas de .video-card, racine = .video-embed", () => {
    render(<VideoEmbed src="https://example.com/embed/1" />);
    expect(document.querySelector(".video-card")).not.toBeInTheDocument();
    expect(document.querySelector(".video-embed")).toBeInTheDocument();
  });

  it("cardTitle fourni → enveloppe .video-card avec .video-card-body/title/desc", () => {
    render(
      <VideoEmbed
        src="https://example.com/embed/1"
        cardTitle="Présentation DS"
        cardDescription="3 thèmes, dark & light."
      />,
    );
    expect(document.querySelector(".video-card")).toBeInTheDocument();
    expect(document.querySelector(".video-card-title")).toHaveTextContent(
      "Présentation DS",
    );
    expect(document.querySelector(".video-card-desc")).toHaveTextContent(
      "3 thèmes, dark & light.",
    );
    expect(
      document.querySelector(".video-card .video-embed"),
    ).toBeInTheDocument();
  });
});
