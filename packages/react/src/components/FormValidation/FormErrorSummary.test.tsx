import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormErrorSummary } from "./FormErrorSummary";
import type { FormValidationError } from "../../hooks/useFormValidation";

const errors: FormValidationError[] = [
  { id: "email", message: "Ce champ est requis." },
  { id: "age", message: "Minimum 18." },
];

afterEach(cleanup);

describe("FormErrorSummary", () => {
  it("ne rend rien quand errors est vide", () => {
    const { container } = render(<FormErrorSummary errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("émet le markup DS .alert.alert-danger + .alert-title + .form-error-list", () => {
    const { container } = render(<FormErrorSummary errors={errors} />);
    const alert = container.querySelector(".alert.alert-danger");
    expect(alert).not.toBeNull();
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveAttribute("tabindex", "-1");
    expect(container.querySelector(".alert-title")?.textContent).toBe(
      "2 erreurs à corriger",
    );
    const items = container.querySelectorAll(".form-error-list li a");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("href", "#email");
    expect(items[0].textContent).toBe("Ce champ est requis.");
  });

  it("singularise le titre pour une seule erreur, et accepte un titre custom", () => {
    const { container, rerender } = render(
      <FormErrorSummary errors={[errors[0]]} />,
    );
    expect(container.querySelector(".alert-title")?.textContent).toBe(
      "1 erreur à corriger",
    );
    rerender(<FormErrorSummary errors={errors} title="Corrigez les champs" />);
    expect(container.querySelector(".alert-title")?.textContent).toBe(
      "Corrigez les champs",
    );
  });

  it("focus-link : le clic sur une erreur preventDefault + focus le champ correspondant par id", () => {
    const field = document.createElement("input");
    field.id = "email";
    document.body.appendChild(field);

    const { container } = render(<FormErrorSummary errors={errors} />);
    const link = container.querySelector(
      '.form-error-list a[href="#email"]',
    ) as HTMLAnchorElement;

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    const prevented = !link.dispatchEvent(clickEvent);

    expect(prevented).toBe(true); // preventDefault appelé
    expect(document.activeElement).toBe(field); // champ focus
    field.remove();
  });

  it("onFocusField surcharge le comportement de focus par défaut", () => {
    const onFocusField = vi.fn();
    const { container } = render(
      <FormErrorSummary errors={errors} onFocusField={onFocusField} />,
    );
    fireEvent.click(
      container.querySelector('.form-error-list a[href="#age"]') as HTMLElement,
    );
    expect(onFocusField).toHaveBeenCalledWith("age");
  });

  it("transfère summaryRef sur le conteneur .alert (pour le focus post-commit du hook)", () => {
    const ref = { current: null as HTMLElement | null };
    const { container } = render(
      <FormErrorSummary errors={errors} summaryRef={ref} />,
    );
    expect(ref.current).toBe(container.querySelector(".alert.alert-danger"));
  });
});
