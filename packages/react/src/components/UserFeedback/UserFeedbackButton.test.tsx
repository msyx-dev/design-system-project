import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { UserFeedbackButton } from "./UserFeedbackButton";
import { UserFeedbackProvider } from "./UserFeedbackProvider";

afterEach(cleanup);

beforeEach(() => {
  // Provider tolérant : /version échoue silencieusement, pas de bruit réseau
  // dans les assertions de ce fichier (cf. UserFeedbackProvider.test.tsx).
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <UserFeedbackProvider appId="ds-showcase">{children}</UserFeedbackProvider>
  );
}

function renderButton(
  props: Partial<Parameters<typeof UserFeedbackButton>[0]> = {},
) {
  return render(<UserFeedbackButton {...props} />, { wrapper: Wrapper });
}

describe("UserFeedbackButton — markup DS (zéro CSS nouveau)", () => {
  it('émet <button class="header-notification btn-icon">', () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining(["header-notification", "btn-icon"]),
    );
  });

  it("fusionne un className additionnel sans retirer les classes DS", () => {
    renderButton({ className: "custom-extra" });
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining([
        "header-notification",
        "btn-icon",
        "custom-extra",
      ]),
    );
  });

  it("rend l'icône par défaut du sprite DS (i-message-circle)", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    const use = button.querySelector("svg.icon use");
    expect(use).not.toBeNull();
    expect(use?.getAttribute("href")).toBe(
      "/shared/icons/sprite.svg#i-message-circle",
    );
  });

  it("accepte une icône custom qui remplace l'icône par défaut", () => {
    renderButton({ icon: <span data-testid="custom-icon">★</span> });
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    expect(button.querySelector("svg.icon use")).toBeNull();
  });
});

describe("UserFeedbackButton — a11y (conventions UserMenu)", () => {
  it("aria-label par défaut « Donner un feedback »", () => {
    renderButton();
    expect(
      screen.getByRole("button", { name: "Donner un feedback" }),
    ).toBeInTheDocument();
  });

  it("aria-label custom via prop label", () => {
    renderButton({ label: "Signaler un problème" });
    expect(
      screen.getByRole("button", { name: "Signaler un problème" }),
    ).toBeInTheDocument();
  });

  it('aria-haspopup="dialog" (cible = UserFeedbackModal, pas un menu)', () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("aria-expanded reflète isOpen du contexte (false par défaut, true après ouverture)", async () => {
    const user = userEvent.setup();
    renderButton();
    const button = screen.getByRole("button", { name: "Donner un feedback" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});

describe("UserFeedbackButton — comportement contrôlé/non-contrôlé", () => {
  it("non-contrôlé (pas d'onClick) : le clic appelle openFeedback() du contexte et ouvre la Modal", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(
      screen.getByRole("button", { name: "Donner un feedback" }),
    );

    // La Modal (#693) n'est montée par le Provider que si isOpen === true.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("contrôlé (onClick fourni) : le clic appelle onClick et N'ouvre PAS la Modal via openFeedback", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderButton({ onClick });

    await user.click(
      screen.getByRole("button", { name: "Donner un feedback" }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    // Mode contrôlé : openFeedback() n'est pas déclenché automatiquement,
    // donc aria-expanded reste false et la Modal n'est pas montée.
    expect(
      screen.getByRole("button", { name: "Donner un feedback" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
