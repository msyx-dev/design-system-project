import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FileUpload } from "./FileUpload";

afterEach(() => {
  cleanup();
});

function makeFile(name = "photo.png", type = "image/png") {
  return new File(["contenu"], name, { type });
}

describe("FileUpload — structure", () => {
  it("rend le markup canonique .file-upload/.file-upload-icon/.file-upload-text/.file-upload-browse", () => {
    render(<FileUpload onFiles={() => {}} />);

    const zone = document.querySelector(".file-upload");
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute("role", "button");
    expect(zone).toHaveAttribute("tabindex", "0");
    expect(zone).toHaveAttribute("aria-label");
    expect(document.querySelector(".file-upload-icon")).toBeInTheDocument();
    expect(document.querySelector(".file-upload-text")).toBeInTheDocument();
    expect(document.querySelector(".file-upload-browse")).toHaveTextContent(
      "parcourir",
    );
  });

  it("affiche .file-upload-hint quand hint fourni, absent sinon", () => {
    const { rerender } = render(<FileUpload onFiles={() => {}} />);
    expect(document.querySelector(".file-upload-hint")).not.toBeInTheDocument();

    rerender(
      <FileUpload onFiles={() => {}} hint="PNG, JPG, PDF — Max 10 Mo" />,
    );
    expect(document.querySelector(".file-upload-hint")).toHaveTextContent(
      "PNG, JPG, PDF — Max 10 Mo",
    );
  });

  it("utilise browseLabel personnalisé dans .file-upload-browse et l'aria-label", () => {
    render(<FileUpload onFiles={() => {}} browseLabel="choisir un fichier" />);
    expect(document.querySelector(".file-upload-browse")).toHaveTextContent(
      "choisir un fichier",
    );
    expect(document.querySelector(".file-upload")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("choisir un fichier"),
    );
  });

  it("rend un input file caché en sibling de .file-upload (pas un enfant)", () => {
    const { container } = render(<FileUpload onFiles={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeVisible();
    expect(document.querySelector(".file-upload")?.contains(input)).toBe(false);
  });

  it("ne rend jamais .has-file", () => {
    render(<FileUpload onFiles={() => {}} files={[{ name: "a.pdf" }]} />);
    expect(document.querySelector(".has-file")).not.toBeInTheDocument();
  });
});

describe("FileUpload — état critique .dragover", () => {
  it("ajoute .dragover sur dragEnter", () => {
    render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;

    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });

    expect(zone).toHaveClass("dragover");
  });

  it("ajoute .dragover sur dragOver", () => {
    render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;

    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });

    expect(zone).toHaveClass("dragover");
  });

  it("retire .dragover sur dragLeave", () => {
    render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;

    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone).toHaveClass("dragover");

    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass("dragover");
  });

  it("retire .dragover sur drop", () => {
    const handleFiles = vi.fn();
    render(<FileUpload onFiles={handleFiles} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const file = makeFile();

    fireEvent.dragEnter(zone, { dataTransfer: { files: [file] } });
    expect(zone).toHaveClass("dragover");

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(zone).not.toHaveClass("dragover");
  });
});

describe("FileUpload — onFiles", () => {
  it("appelle onFiles avec les File[] au drop", () => {
    const handleFiles = vi.fn();
    render(<FileUpload onFiles={handleFiles} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const file = makeFile("rapport.pdf", "application/pdf");

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(handleFiles).toHaveBeenCalledTimes(1);
    const received = handleFiles.mock.calls[0][0] as File[];
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe("rapport.pdf");
  });

  it("n'appelle pas onFiles si le drop ne contient aucun fichier", () => {
    const handleFiles = vi.fn();
    render(<FileUpload onFiles={handleFiles} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;

    fireEvent.drop(zone, { dataTransfer: { files: [] } });

    expect(handleFiles).not.toHaveBeenCalled();
  });

  it("appelle onFiles avec les File[] au change de l'input (sélection)", () => {
    const handleFiles = vi.fn();
    const { container } = render(<FileUpload onFiles={handleFiles} />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile("avatar.jpg", "image/jpeg");

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleFiles).toHaveBeenCalledTimes(1);
    const received = handleFiles.mock.calls[0][0] as File[];
    expect(received[0].name).toBe("avatar.jpg");
  });
});

describe("FileUpload — déclenchement de l'input", () => {
  it("clic sur .file-upload déclenche l'input caché", () => {
    const { container } = render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(zone);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("touche Enter sur .file-upload déclenche l'input caché", () => {
    const { container } = render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(zone, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("touche Espace sur .file-upload déclenche l'input caché", () => {
    const { container } = render(<FileUpload onFiles={() => {}} />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(zone, { key: " " });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe("FileUpload — .file-list / .file-item contrôlés", () => {
  const files = [
    { name: "design-system.pdf", size: "2.4 Mo", progress: 100 },
    { name: "screenshot.png", size: "856 Ko" },
  ];

  it("rend .file-list/.file-item/.file-item-name/.file-item-size depuis la prop files", () => {
    render(<FileUpload onFiles={() => {}} files={files} />);

    expect(document.querySelector(".file-list")).toBeInTheDocument();
    const items = document.querySelectorAll(".file-item");
    expect(items).toHaveLength(2);
    const names = Array.from(document.querySelectorAll(".file-item-name")).map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["design-system.pdf", "screenshot.png"]);
    const sizes = Array.from(document.querySelectorAll(".file-item-size")).map(
      (n) => n.textContent,
    );
    expect(sizes).toEqual(["2.4 Mo", "856 Ko"]);
  });

  it("n'affiche pas .file-list quand files est vide ou absent", () => {
    const { rerender } = render(<FileUpload onFiles={() => {}} />);
    expect(document.querySelector(".file-list")).not.toBeInTheDocument();

    rerender(<FileUpload onFiles={() => {}} files={[]} />);
    expect(document.querySelector(".file-list")).not.toBeInTheDocument();
  });

  it("rend .progress-fill uniquement si progress est défini", () => {
    render(<FileUpload onFiles={() => {}} files={files} />);
    const fills = document.querySelectorAll(".progress-fill");
    expect(fills).toHaveLength(1);
    expect((fills[0] as HTMLElement).style.width).toBe("100%");
  });

  it("pose un background inline non vide sur .progress-fill (défaut DS var(--gradient-1))", () => {
    render(<FileUpload onFiles={() => {}} files={files} />);
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.background).toBeTruthy();
    expect(fill.style.background).toBe("var(--gradient-1)");
  });

  it("respecte un color personnalisé sur .progress-fill si fourni", () => {
    render(
      <FileUpload
        onFiles={() => {}}
        files={[
          {
            name: "custom.pdf",
            progress: 42,
            color: "var(--success)",
          },
        ]}
      />,
    );
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.background).toBe("var(--success)");
  });

  it("n'affiche pas .file-item-size si size est absent", () => {
    render(
      <FileUpload onFiles={() => {}} files={[{ name: "sans-taille.txt" }]} />,
    );
    expect(document.querySelector(".file-item-size")).not.toBeInTheDocument();
  });

  it("appelle onRemove(index) au clic sur .file-item-remove", () => {
    const handleRemove = vi.fn();
    render(
      <FileUpload onFiles={() => {}} files={files} onRemove={handleRemove} />,
    );
    const removeButtons = document.querySelectorAll(".file-item-remove");
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[1]).toHaveAttribute(
      "aria-label",
      "Supprimer screenshot.png",
    );

    fireEvent.click(removeButtons[1]);

    expect(handleRemove).toHaveBeenCalledWith(1);
  });
});

describe("FileUpload — disabled : pas de drag/clic actif", () => {
  it("tabIndex passe à -1 et aria-disabled est posé", () => {
    render(<FileUpload onFiles={() => {}} disabled />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    expect(zone).toHaveAttribute("tabindex", "-1");
    expect(zone).toHaveAttribute("aria-disabled", "true");
  });

  it("le clic ne déclenche pas l'input", () => {
    const { container } = render(<FileUpload onFiles={() => {}} disabled />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(zone);

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("le drag n'ajoute pas .dragover", () => {
    render(<FileUpload onFiles={() => {}} disabled />);
    const zone = document.querySelector(".file-upload") as HTMLElement;

    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });

    expect(zone).not.toHaveClass("dragover");
  });

  it("le drop n'appelle pas onFiles", () => {
    const handleFiles = vi.fn();
    render(<FileUpload onFiles={handleFiles} disabled />);
    const zone = document.querySelector(".file-upload") as HTMLElement;
    const file = makeFile();

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(handleFiles).not.toHaveBeenCalled();
  });

  it("l'input natif caché est disabled", () => {
    const { container } = render(<FileUpload onFiles={() => {}} disabled />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});
