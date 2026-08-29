import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AccessDenied } from "./AccessDenied";

afterEach(cleanup);

describe("AccessDenied — structure canonique", () => {
  it("rend .access-denied-preview > .orb-1/.orb-2 + .access-denied-card", () => {
    render(<AccessDenied />);
    const root = document.querySelector(".access-denied-preview")!;
    expect(root).toBeInTheDocument();
    expect(root.querySelector(".orb.orb-1")).toBeInTheDocument();
    expect(root.querySelector(".orb.orb-2")).toBeInTheDocument();
    expect(root.querySelector(".access-denied-card")).toBeInTheDocument();
  });

  it("lie le <h1> à la racine via aria-labelledby", () => {
    render(<AccessDenied />);
    const root = document.querySelector(".access-denied-preview")!;
    const h1 = document.querySelector("h1")!;
    expect(h1).toHaveTextContent("Accès refusé");
    expect(root.getAttribute("aria-labelledby")).toBe(h1.id);
  });

  it("logo : img.access-denied-logo avec src par défaut", () => {
    render(<AccessDenied />);
    const img = document.querySelector(".access-denied-logo img")!;
    expect(img).toHaveAttribute("src", "/assets/sources/logoMSYX.png");
    expect(img).toHaveAttribute("alt", "msyx");
  });

  it("logoSrc custom remplace le défaut", () => {
    render(<AccessDenied logoSrc="/brand/logo.png" />);
    expect(document.querySelector(".access-denied-logo img")).toHaveAttribute(
      "src",
      "/brand/logo.png",
    );
  });

  it("className additionnel fusionné sur la racine", () => {
    render(<AccessDenied className="extra" />);
    const root = document.querySelector(".access-denied-preview")!;
    expect(root).toHaveClass("extra");
  });
});

describe("AccessDenied — message", () => {
  it("message générique quand appName absent", () => {
    render(<AccessDenied />);
    expect(document.querySelector(".access-denied-message")).toHaveTextContent(
      "Vous n'avez pas les droits nécessaires pour accéder à cette application.",
    );
  });

  it("message personnalisé avec appName fourni", () => {
    render(<AccessDenied appName="Laserbox" />);
    expect(document.querySelector(".access-denied-message")).toHaveTextContent(
      "Vous n'avez pas accès à Laserbox.",
    );
  });
});

describe("AccessDenied — bloc utilisateur connecté (optionnel)", () => {
  it("absent par défaut (aucun user fourni)", () => {
    render(<AccessDenied />);
    expect(
      document.querySelector(".access-denied-user"),
    ).not.toBeInTheDocument();
  });

  it("affiché si user.name fourni, initiales prénom+nom", () => {
    render(<AccessDenied user={{ name: "Mike Dubois" }} />);
    const block = document.querySelector(".access-denied-user")!;
    expect(block).toBeInTheDocument();
    expect(block.querySelector(".access-denied-avatar")).toHaveTextContent(
      "MD",
    );
    expect(block.querySelector(".access-denied-user-name")).toHaveTextContent(
      "Mike Dubois",
    );
  });

  it("initiales sur 2 lettres du prénom seul si un seul mot", () => {
    render(<AccessDenied user={{ name: "Mike" }} />);
    expect(document.querySelector(".access-denied-avatar")).toHaveTextContent(
      "MI",
    );
  });

  it("affiché si seul user.email fourni, initiale = 1re lettre email", () => {
    render(<AccessDenied user={{ email: "mike@msyx.fr" }} />);
    const block = document.querySelector(".access-denied-user")!;
    expect(block).toBeInTheDocument();
    expect(block.querySelector(".access-denied-avatar")).toHaveTextContent("M");
    expect(block.querySelector(".access-denied-user-email")).toHaveTextContent(
      "mike@msyx.fr",
    );
  });
});

describe("AccessDenied — actions", () => {
  it("bouton primaire = lien vers homeUrl (défaut https://msyx.fr)", () => {
    render(<AccessDenied />);
    const link = document.querySelector(".access-denied-btn-primary")!;
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://msyx.fr");
    expect(link).toHaveAttribute("aria-label", "Retourner à https://msyx.fr");
  });

  it("homeUrl/homeLabel custom appliqués", () => {
    render(<AccessDenied homeUrl="https://laserbox.fr" homeLabel="Accueil" />);
    const link = document.querySelector(".access-denied-btn-primary")!;
    expect(link).toHaveAttribute("href", "https://laserbox.fr");
    expect(link).toHaveTextContent("Accueil");
    expect(link).toHaveAttribute(
      "aria-label",
      "Retourner à https://laserbox.fr",
    );
  });

  it("bouton secondaire = submit dans un <form method=POST action=logoutUrl>", () => {
    render(<AccessDenied logoutUrl="/custom/logout" />);
    const btn = document.querySelector(".access-denied-btn-secondary")!;
    expect(btn).toHaveAttribute("type", "submit");
    const form = btn.closest("form")!;
    expect(form).toHaveAttribute("method", "POST");
    expect(form).toHaveAttribute("action", "/custom/logout");
  });

  it("logoutLabel custom remplace le défaut", () => {
    render(<AccessDenied logoutLabel="Quitter" />);
    expect(
      document.querySelector(".access-denied-btn-secondary"),
    ).toHaveTextContent("Quitter");
  });
});
