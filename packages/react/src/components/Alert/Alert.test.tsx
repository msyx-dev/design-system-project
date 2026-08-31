import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Alert,
  AlertActions,
  AlertBody,
  AlertDesc,
  AlertIcon,
  AlertTitle,
  AlertValue,
} from "./Alert";

afterEach(() => {
  cleanup();
});

describe("Alert — base (4 variantes sémantiques)", () => {
  it("émet .alert.alert-info par défaut", () => {
    render(<Alert>Message</Alert>);
    const el = document.querySelector(".alert") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toBe("alert alert-info");
  });

  it.each(["info", "success", "warning", "danger"] as const)(
    "variant=%s émet .alert.alert-%s",
    (variant) => {
      render(<Alert variant={variant}>Message</Alert>);
      expect(
        document.querySelector(`.alert.alert-${variant}`),
      ).toBeInTheDocument();
    },
  );

  it("n'a pas de role par défaut (markup réel feedback.html:20-23)", () => {
    render(<Alert>Message</Alert>);
    const el = document.querySelector(".alert") as HTMLElement;
    expect(el).not.toHaveAttribute("role");
  });

  it("role explicite passe par les props", () => {
    render(<Alert role="status">Message</Alert>);
    expect(document.querySelector(".alert")).toHaveAttribute("role", "status");
  });
});

describe("Alert — kpi (ex-zone-banner #519)", () => {
  it("kpi ajoute .alert--kpi en plus de .alert.alert-{variant} (jamais seul)", () => {
    render(
      <Alert kpi variant="danger">
        Contenu
      </Alert>,
    );
    const el = document.querySelector(".alert") as HTMLElement;
    expect(el.classList.contains("alert")).toBe(true);
    expect(el.classList.contains("alert--kpi")).toBe(true);
    expect(el.classList.contains("alert-danger")).toBe(true);
  });

  it("kpi n'ajoute pas de role par défaut (markup réel feedback.html:179-198)", () => {
    render(
      <Alert kpi variant="warning">
        Contenu
      </Alert>,
    );
    expect(document.querySelector(".alert")).not.toHaveAttribute("role");
  });

  it("compose AlertTitle/AlertValue/AlertDesc", () => {
    render(
      <Alert kpi variant="success">
        <AlertTitle>Zone rentable</AlertTitle>
        <AlertValue>+8 750 €</AlertValue>
        <AlertDesc>Marge nette : 34%.</AlertDesc>
      </Alert>,
    );
    expect(document.querySelector(".alert-title")).toBeInTheDocument();
    expect(document.querySelector(".alert-value")).toBeInTheDocument();
    expect(document.querySelector(".alert-desc")).toBeInTheDocument();
  });
});

describe("Alert — cta (ex-upgrade-prompt #519)", () => {
  it("cta ajoute .alert--cta en plus de .alert.alert-{variant} (jamais seul)", () => {
    render(
      <Alert cta variant="info">
        Contenu
      </Alert>,
    );
    const el = document.querySelector(".alert") as HTMLElement;
    expect(el.classList.contains("alert")).toBe(true);
    expect(el.classList.contains("alert--cta")).toBe(true);
    expect(el.classList.contains("alert-info")).toBe(true);
  });

  it("cta ajoute role=alert par défaut (markup réel feedback.html:337)", () => {
    render(
      <Alert cta variant="info">
        Contenu
      </Alert>,
    );
    expect(document.querySelector(".alert")).toHaveAttribute("role", "alert");
  });

  it("role explicite sur cta écrase le défaut", () => {
    render(
      <Alert cta variant="info" role="status">
        Contenu
      </Alert>,
    );
    expect(document.querySelector(".alert")).toHaveAttribute("role", "status");
  });

  it("compose AlertIcon/AlertBody/AlertTitle/AlertDesc/AlertActions", () => {
    render(
      <Alert cta variant="warning">
        <AlertIcon>⚡</AlertIcon>
        <AlertBody>
          <AlertTitle>Limite atteinte</AlertTitle>
          <AlertDesc>85% utilisé.</AlertDesc>
          <AlertActions>
            <button type="button">Augmenter le quota</button>
          </AlertActions>
        </AlertBody>
      </Alert>,
    );
    expect(document.querySelector(".alert-icon")).toBeInTheDocument();
    expect(document.querySelector(".alert-body")).toBeInTheDocument();
    expect(document.querySelector(".alert-title")).toBeInTheDocument();
    expect(document.querySelector(".alert-desc")).toBeInTheDocument();
    expect(document.querySelector(".alert-actions")).toBeInTheDocument();
  });
});

describe("AlertIcon", () => {
  it("émet .alert-icon avec aria-hidden=true par défaut", () => {
    render(<AlertIcon>⚡</AlertIcon>);
    const el = document.querySelector(".alert-icon") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("aria-hidden explicite écrase le défaut", () => {
    render(<AlertIcon aria-hidden="false">⚡</AlertIcon>);
    expect(document.querySelector(".alert-icon")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });
});

describe("Alert — className additionnelle", () => {
  it("est fusionnée sans écraser .alert", () => {
    render(<Alert className="custom">Message</Alert>);
    expect(document.querySelector(".alert.custom")).toBeInTheDocument();
  });
});

// --- Variante neutral (#923) -------------------------------------------------
//
// Les quatre variantes étaient toutes sémantiques et toutes colorées : un
// indicateur chiffré à ZÉRO — qui ne signale rien — retombait sur `info` et
// s'affichait en couleur d'état. Le vert perdait alors sa valeur de signal
// partout ailleurs. `.badge-neutral` avait déjà résolu ce cas côté badge.
describe("Alert — variante neutral (#923)", () => {
  it('variant="neutral" émet .alert-neutral', () => {
    render(<Alert variant="neutral">Aucune action en retard</Alert>);
    expect(document.querySelector(".alert.alert-neutral")).toBeInTheDocument();
  });

  it("n'émet AUCUNE classe sémantique en même temps", () => {
    render(<Alert variant="neutral">Rien à signaler</Alert>);
    const el = document.querySelector(".alert") as HTMLElement;
    for (const semantic of ["alert-info", "alert-success", "alert-warning", "alert-danger"]) {
      expect(el.classList.contains(semantic)).toBe(false);
    }
  });

  it("le défaut reste info — aucun consommateur existant ne bouge", () => {
    render(<Alert>Message</Alert>);
    expect(document.querySelector(".alert.alert-info")).toBeInTheDocument();
  });
});
