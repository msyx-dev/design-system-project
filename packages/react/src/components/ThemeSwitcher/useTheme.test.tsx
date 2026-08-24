import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_THEME_CONFIG, useTheme, type ThemeConfig } from "./useTheme";

function cleanDom() {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-mode");
}

describe("useTheme — état initial (SSR-safe)", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("défaut msyx/dark quand localStorage est vide", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => {
      expect(result.current.theme).toBe("msyx");
      expect(result.current.mode).toBe("dark");
    });
  });

  it("relit le localStorage pré-rempli après montage", async () => {
    localStorage.setItem("msyx-theme", "acssi");
    localStorage.setItem("msyx-mode", "light");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe("acssi");
      expect(result.current.mode).toBe("light");
    });
  });

  it("applique data-mode au DOM au montage depuis le localStorage (#785)", async () => {
    localStorage.setItem("msyx-mode", "light");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.mode).toBe("light"));
    // Sans le correctif #785, l'état React est bien "light" mais l'attribut
    // DOM n'est jamais posé — c'est précisément ce que ce test vérifie.
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("n'ajoute pas data-mode au montage pour le défaut implicite dark", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.mode).toBe("dark"));
    expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
  });

  it("applique data-theme au DOM au montage depuis le localStorage", async () => {
    localStorage.setItem("msyx-theme", "acssi");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("acssi"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("acssi");
  });

  it("n'ajoute pas data-theme au montage pour le défaut implicite msyx", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("msyx"));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("réconcilie le mode si incompatible avec le thème stocké (config mono-mode)", async () => {
    const config: ThemeConfig = {
      msyx: { modes: ["dark", "light"], defaultMode: "dark" },
      mono: { modes: ["dark"], defaultMode: "dark" },
    };
    localStorage.setItem("msyx-theme", "mono");
    localStorage.setItem("msyx-mode", "light");

    const { result } = renderHook(() => useTheme(config));

    await waitFor(() => {
      expect(result.current.theme).toBe("mono");
      // light stocké mais incompatible avec mono (modes: ['dark']) → réconcilié sur defaultMode
      expect(result.current.mode).toBe("dark");
      expect(result.current.isModeLocked).toBe(true);
    });
  });

  it("préserve le data-theme posé par un consumer mono-thème sans localStorage (#793)", async () => {
    document.documentElement.setAttribute("data-theme", "nhood");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("nhood"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("nhood");
  });

  it("préserve un data-theme consumer absent de la config par défaut (#793)", async () => {
    document.documentElement.setAttribute("data-theme", "captransfo");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("captransfo"));
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "captransfo",
    );
  });

  it("préserve le data-mode posé par un consumer sans localStorage (#793)", async () => {
    document.documentElement.setAttribute("data-mode", "light");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.mode).toBe("light"));
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("le localStorage reste prioritaire sur l'attribut déjà porté par <html> (#793)", async () => {
    document.documentElement.setAttribute("data-theme", "nhood");
    localStorage.setItem("msyx-theme", "acssi");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("acssi"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("acssi");
  });

  it("aucun attribut posé au montage quand le DOM est nu et le storage vide (#793)", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe("msyx");
      expect(result.current.mode).toBe("dark");
    });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
  });

  it("retombe sur l'attribut du DOM quand localStorage lève une exception (#793)", async () => {
    document.documentElement.setAttribute("data-theme", "nhood");
    document.documentElement.setAttribute("data-mode", "light");
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("SecurityError: storage indisponible");
    };

    try {
      const { result } = renderHook(() => useTheme());

      // Un storage qui lève est un storage muet : le DOM du consumer fait foi,
      // et l'état React ne doit pas diverger de ce que porte <html>.
      await waitFor(() => {
        expect(result.current.theme).toBe("nhood");
        expect(result.current.mode).toBe("light");
      });
      expect(document.documentElement.getAttribute("data-theme")).toBe("nhood");
      expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    } finally {
      Storage.prototype.getItem = getItem;
    }
  });
});

describe("useTheme — setTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("pose data-theme sur documentElement pour un thème non-msyx", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("msyx"));

    act(() => result.current.setTheme("acssi"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("acssi");
    expect(localStorage.getItem("msyx-theme")).toBe("acssi");
    expect(result.current.theme).toBe("acssi");
  });

  it("retire data-theme quand on revient à msyx (défaut implicite)", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("msyx"));

    act(() => result.current.setTheme("acssi"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("acssi");

    act(() => result.current.setTheme("msyx"));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem("msyx-theme")).toBe("msyx");
  });

  it("réconcilie le mode quand le nouveau thème ne le supporte pas", async () => {
    const config: ThemeConfig = {
      msyx: { modes: ["dark", "light"], defaultMode: "dark" },
      mono: { modes: ["dark"], defaultMode: "dark" },
    };
    const { result } = renderHook(() => useTheme(config));
    await waitFor(() => expect(result.current.theme).toBe("msyx"));

    act(() => result.current.setMode("light"));
    expect(result.current.mode).toBe("light");

    act(() => result.current.setTheme("mono"));

    expect(result.current.theme).toBe("mono");
    expect(result.current.mode).toBe("dark");
    expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
    expect(localStorage.getItem("msyx-mode")).toBe("dark");
  });
});

describe("useTheme — setMode / toggleMode", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanDom();
  });
  afterEach(() => {
    localStorage.clear();
    cleanDom();
  });

  it("setMode('light') pose data-mode=light et persiste", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.mode).toBe("dark"));

    act(() => result.current.setMode("light"));

    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(localStorage.getItem("msyx-mode")).toBe("light");
    expect(result.current.mode).toBe("light");
  });

  it("setMode('dark') retire data-mode (défaut implicite)", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.mode).toBe("dark"));

    act(() => result.current.setMode("light"));
    act(() => result.current.setMode("dark"));

    expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
    expect(localStorage.getItem("msyx-mode")).toBe("dark");
  });

  it("toggleMode bascule dark ⇄ light", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.mode).toBe("dark"));

    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe("light");

    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe("dark");
  });

  it("toggleMode est un no-op en mono-mode (isModeLocked)", async () => {
    const config: ThemeConfig = {
      mono: { modes: ["dark"], defaultMode: "dark" },
    };
    const { result } = renderHook(() => useTheme(config));
    await waitFor(() => expect(result.current.theme).toBe("mono"));

    expect(result.current.isModeLocked).toBe(true);
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe("dark");
  });
});

describe("useTheme — config par défaut", () => {
  it("expose availableModes cohérent avec DEFAULT_THEME_CONFIG", async () => {
    const { result } = renderHook(() => useTheme());
    await waitFor(() => expect(result.current.theme).toBe("msyx"));
    expect(result.current.availableModes).toEqual(
      DEFAULT_THEME_CONFIG.msyx.modes,
    );
    expect(result.current.isModeLocked).toBe(false);
    expect(result.current.config).toBe(DEFAULT_THEME_CONFIG);
  });

  it("expose auchan (dark+light) dans DEFAULT_THEME_CONFIG (#849)", async () => {
    localStorage.clear();
    cleanDom();
    localStorage.setItem("msyx-theme", "auchan");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.theme).toBe("auchan"));
    expect(DEFAULT_THEME_CONFIG.auchan).toEqual({
      modes: ["dark", "light"],
      defaultMode: "dark",
    });
    expect(result.current.availableModes).toEqual(["dark", "light"]);
    expect(result.current.isModeLocked).toBe(false);

    localStorage.clear();
    cleanDom();
  });
});
