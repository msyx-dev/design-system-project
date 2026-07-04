import { act, render, screen, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./Toast";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("useToast — hors provider", () => {
  it("lève une erreur explicite si utilisé hors ToastProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe("useToast — rendu du toast", () => {
  it("showToast rend un .toast.toast-success avec .toast-message et .toast-close", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Enregistré", { type: "success" });
    });

    const toastEl = document.querySelector(".toast.toast-success");
    expect(toastEl).toBeInTheDocument();
    expect(toastEl?.querySelector(".toast-message")).toBeInTheDocument();
    expect(toastEl?.querySelector(".toast-close")).toBeInTheDocument();
    expect(toastEl?.textContent).toContain("Enregistré");
  });

  it("defaut type=info quand aucune option fournie", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Info générique");
    });

    expect(document.querySelector(".toast.toast-info")).toBeInTheDocument();
  });
});

describe("useToast — a11y role/aria-live", () => {
  it("type error → role=alert, aria-live=assertive", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Erreur serveur", { type: "error" });
    });

    const toastEl = document.querySelector(".toast.toast-error");
    expect(toastEl).toHaveAttribute("role", "alert");
    expect(toastEl).toHaveAttribute("aria-live", "assertive");
  });

  it("type warning → role=alert, aria-live=assertive", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Attention", { type: "warning" });
    });

    const toastEl = document.querySelector(".toast.toast-warning");
    expect(toastEl).toHaveAttribute("role", "alert");
    expect(toastEl).toHaveAttribute("aria-live", "assertive");
  });

  it("type info → role=status, aria-live=polite", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Info", { type: "info" });
    });

    const toastEl = document.querySelector(".toast.toast-info");
    expect(toastEl).toHaveAttribute("role", "status");
    expect(toastEl).toHaveAttribute("aria-live", "polite");
  });

  it("type success → role=status, aria-live=polite", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Succès", { type: "success" });
    });

    const toastEl = document.querySelector(".toast.toast-success");
    expect(toastEl).toHaveAttribute("role", "status");
    expect(toastEl).toHaveAttribute("aria-live", "polite");
  });
});

describe("useToast — interaction / timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clic sur .toast-close retire le toast après la transition exit (300ms)", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("À fermer", { type: "info", duration: 100000 });
    });

    const toastEl = document.querySelector(".toast.toast-info") as HTMLElement;
    expect(toastEl).toBeInTheDocument();
    const closeBtn = toastEl.querySelector(".toast-close") as HTMLButtonElement;

    act(() => {
      closeBtn.click();
    });

    // Juste après le clic : toast-exit doit remplacer toast-enter
    expect(document.querySelector(".toast.toast-info")).toHaveClass(
      "toast-exit",
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.querySelector(".toast.toast-info")).not.toBeInTheDocument();
  });

  it("auto-dismiss après duration retire le toast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Auto", { type: "success", duration: 1000 });
    });

    expect(document.querySelector(".toast.toast-success")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // exit engagé
    expect(document.querySelector(".toast.toast-success")).toHaveClass(
      "toast-exit",
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(
      document.querySelector(".toast.toast-success"),
    ).not.toBeInTheDocument();
  });

  it("dismiss(id) programmatique déclenche aussi la transition exit puis retrait", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id = "";
    act(() => {
      id = result.current.showToast("Programmatique", {
        type: "info",
        duration: 100000,
      });
    });

    act(() => {
      result.current.dismiss(id);
    });

    expect(document.querySelector(".toast.toast-info")).toHaveClass(
      "toast-exit",
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.querySelector(".toast.toast-info")).not.toBeInTheDocument();
  });
});

describe("ToastProvider — rendu enfants", () => {
  it("rend ses children normalement", () => {
    render(
      <ToastProvider>
        <div data-testid="child">Contenu</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
