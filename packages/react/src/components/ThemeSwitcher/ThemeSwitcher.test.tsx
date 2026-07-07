import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeSwitcher } from "./ThemeSwitcher";
import type { ThemeConfig } from "./useTheme";

function cleanDom() {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-mode");
}

describe("ThemeSwitcher — rendu", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("rend .theme-switcher avec label et select", async () => {
    const { container } = render(<ThemeSwitcher />);
    await waitFor(() => {
      expect(container.querySelector(".theme-switcher")).toBeInTheDocument();
    });
    expect(
      container.querySelector(".theme-switcher-label"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".theme-switcher-select"),
    ).toBeInTheDocument();
  });

  it("le select expose les 3 options MSYX/ACSSI/Nhood par défaut", async () => {
    render(<ThemeSwitcher />);
    const select = await screen.findByRole("combobox");
    const options = Array.from(select.querySelectorAll("option")).map((o) => ({
      value: o.getAttribute("value"),
      label: o.textContent,
    }));
    expect(options).toEqual([
      { value: "msyx", label: "MSYX" },
      { value: "acssi", label: "ACSSI" },
      { value: "nhood", label: "Nhood" },
    ]);
  });

  it("compose ThemeToggle (.mode-switch) dans le switcher", async () => {
    const { container } = render(<ThemeSwitcher />);
    await waitFor(() => {
      expect(container.querySelector(".mode-switch")).toBeInTheDocument();
    });
  });

  it("label custom remplace le libellé par défaut", async () => {
    render(<ThemeSwitcher label="Palette" />);
    await waitFor(() => {
      expect(screen.getByText("Palette")).toBeInTheDocument();
    });
  });

  it("label par défaut est 'Thème'", async () => {
    render(<ThemeSwitcher />);
    await waitFor(() => {
      expect(screen.getByText("Thème")).toBeInTheDocument();
    });
  });
});

describe("ThemeSwitcher — classe d'état .is-dark", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("mode dark (défaut) → .mode-switch porte .is-dark et aria-checked=true", async () => {
    render(<ThemeSwitcher />);
    const toggle = await screen.findByRole("switch");
    await waitFor(() => {
      expect(toggle).toHaveClass("is-dark");
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });

  it("mode light (localStorage) → PAS de .is-dark, aria-checked=false", async () => {
    localStorage.setItem("msyx-mode", "light");
    render(<ThemeSwitcher />);
    const toggle = await screen.findByRole("switch");
    await waitFor(() => {
      expect(toggle).not.toHaveClass("is-dark");
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
  });

  it("clic sur le toggle bascule .is-dark et data-mode", async () => {
    render(<ThemeSwitcher />);
    const toggle = await screen.findByRole("switch");
    await waitFor(() => expect(toggle).toHaveClass("is-dark"));

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).not.toHaveClass("is-dark");
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(localStorage.getItem("msyx-mode")).toBe("light");
  });
});

describe("ThemeSwitcher — changement de thème", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("sélectionner acssi pose data-theme=acssi et persiste", async () => {
    render(<ThemeSwitcher />);
    const select = await screen.findByRole("combobox");
    await waitFor(() => expect(select).toHaveValue("msyx"));

    fireEvent.change(select, { target: { value: "acssi" } });

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("acssi");
    });
    expect(localStorage.getItem("msyx-theme")).toBe("acssi");
  });

  it("revenir à msyx retire data-theme (défaut implicite)", async () => {
    render(<ThemeSwitcher />);
    const select = await screen.findByRole("combobox");
    await waitFor(() => expect(select).toHaveValue("msyx"));

    fireEvent.change(select, { target: { value: "acssi" } });
    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-theme")).toBe("acssi"),
    );

    fireEvent.change(select, { target: { value: "msyx" } });

    await waitFor(() => {
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    });
    expect(localStorage.getItem("msyx-theme")).toBe("msyx");
  });
});

describe("ThemeSwitcher — mono-mode (config custom)", () => {
  const monoConfig: ThemeConfig = {
    msyx: { modes: ["dark"], defaultMode: "dark" },
  };

  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("le toggle est disabled/aria-disabled quand le thème n'a qu'un mode", async () => {
    render(<ThemeSwitcher config={monoConfig} />);
    const toggle = await screen.findByRole("switch");
    await waitFor(() => {
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveAttribute("aria-disabled", "true");
    });
  });
});
