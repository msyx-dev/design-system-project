import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FR_MESSAGES,
  useFormValidation,
  type FormValidationError,
} from "./useFormValidation";

/**
 * Construit un vrai formulaire DOM (hors JSX/render) et attache manuellement
 * les callbacks de ref retournés par le hook, comme le ferait React lors du
 * montage. Permet d'asserter le comportement de la Constraint Validation API
 * native (`field.validity`) sans dépendre d'un composant de test.
 */
function mountForm(fields: Record<string, HTMLInputElement>) {
  const form = document.createElement("form");
  Object.values(fields).forEach((field) => form.appendChild(field));
  document.body.appendChild(form);
  return form;
}

function makeInput(id: string, attrs: Partial<HTMLInputElement> = {}) {
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  Object.assign(input, attrs);
  return input;
}

describe("useFormValidation — cycle blur : pose/retrait de aria-invalid", () => {
  it("pose aria-invalid=true + fieldErrors au blur d'un champ requis vide", () => {
    const { result } = renderHook(() => useFormValidation());

    const nameField = makeInput("name", { required: true });
    mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(nameField.closest("form"));
      result.current.getFieldProps("name").ref(nameField);
    });

    act(() => {
      result.current.getFieldProps("name").onBlur({} as never);
    });

    expect(nameField.getAttribute("aria-invalid")).toBeNull(); // pas de mutation DOM directe, piloté par React
    expect(result.current.fieldErrors.name).toBe(
      DEFAULT_FR_MESSAGES.valueMissing,
    );
    expect(result.current.getFieldProps("name")["aria-invalid"]).toBe(true);
    expect(result.current.getFieldProps("name")["aria-describedby"]).toBe(
      "name-error",
    );
  });

  it("retire aria-invalid + fieldErrors dès que le champ redevient valide (frappe) sans attendre le prochain blur", () => {
    const { result } = renderHook(() => useFormValidation());

    const nameField = makeInput("name", { required: true });
    mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(nameField.closest("form"));
      result.current.getFieldProps("name").ref(nameField);
    });

    act(() => {
      result.current.getFieldProps("name").onBlur({} as never);
    });
    expect(result.current.getFieldProps("name")["aria-invalid"]).toBe(true);

    // L'utilisateur tape une valeur valide → événement natif 'input' (pas onChange React)
    act(() => {
      nameField.value = "Alice";
      nameField.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(result.current.fieldErrors.name).toBeUndefined();
    expect(
      result.current.getFieldProps("name")["aria-invalid"],
    ).toBeUndefined();
    expect(
      result.current.getFieldProps("name")["aria-describedby"],
    ).toBeUndefined();
  });

  it("ne retire rien sur 'input' si la valeur reste invalide (autre raison)", () => {
    const { result } = renderHook(() => useFormValidation());
    // required + email : d'abord valueMissing (vide), puis typeMismatch
    // (valeur non vide mais toujours invalide) — jsdom ne peut pas émuler
    // tooShort/tooLong nativement (cf. resolveMessage tests plus bas), donc
    // ce cas de "correction partielle qui reste invalide" est vérifié via
    // typeMismatch, qui est un vrai comportement jsdom.
    const emailField = makeInput("name", { required: true, type: "email" });
    mountForm({ name: emailField });

    act(() => {
      result.current.formProps.ref(emailField.closest("form"));
      result.current.getFieldProps("name").ref(emailField);
    });

    act(() => {
      result.current.getFieldProps("name").onBlur({} as never);
    });
    expect(result.current.fieldErrors.name).toBe(
      DEFAULT_FR_MESSAGES.valueMissing,
    );

    act(() => {
      emailField.value = "toujours-pas-un-email";
      emailField.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(result.current.fieldErrors.name).toBeDefined();
    expect(result.current.getFieldProps("name")["aria-invalid"]).toBe(true);
  });
});

describe("useFormValidation — getFieldProps : aria-describedby cohérent", () => {
  it("n'inclut ni aria-invalid ni aria-describedby quand le champ est valide (laisse la place à <Input hint>)", () => {
    const { result } = renderHook(() => useFormValidation());
    const props = result.current.getFieldProps("email");
    expect(props).not.toHaveProperty("aria-invalid");
    expect(props).not.toHaveProperty("aria-describedby");
  });

  it("aria-describedby vaut `${id}-error` (convention alignée sur <Input error>)", () => {
    const { result } = renderHook(() => useFormValidation());
    const emailField = makeInput("email", { required: true, type: "email" });
    mountForm({ email: emailField });

    act(() => {
      result.current.getFieldProps("email").ref(emailField);
    });
    act(() => {
      result.current.getFieldProps("email").onBlur({} as never);
    });

    expect(result.current.getFieldProps("email")["aria-describedby"]).toBe(
      "email-error",
    );
  });
});

describe("useFormValidation — messages FR (Constraint Validation API)", () => {
  function setup(input: HTMLInputElement) {
    const { result } = renderHook(() => useFormValidation());
    mountForm({ f: input });
    act(() => {
      result.current.getFieldProps("f").ref(input);
    });
    act(() => {
      result.current.getFieldProps("f").onBlur({} as never);
    });
    return result;
  }

  it("valueMissing → message requis", () => {
    const input = makeInput("f", { required: true });
    const result = setup(input);
    expect(result.current.fieldErrors.f).toBe(DEFAULT_FR_MESSAGES.valueMissing);
  });

  it("typeMismatch email → message email", () => {
    const input = makeInput("f", { type: "email" });
    input.value = "pas-un-email";
    const result = setup(input);
    expect(result.current.fieldErrors.f).toBe(
      DEFAULT_FR_MESSAGES.typeMismatchEmail,
    );
  });

  it("tooShort → message paramétré avec minLength (validity stubbée)", () => {
    // jsdom hardcode `tooShort`/`tooLong` à `false` en toute circonstance
    // (cf. node_modules/jsdom .../HTMLInputElement-impl.js:968-976 —
    // "jsdom has no way at the moment to emulate a user interaction, so
    // tooLong/tooShort have to be set to false") : impossible de déclencher
    // ce cas nativement dans ce jsdom. On stub `validity` pour couvrir la
    // branche `resolveMessage` correspondante — le reste (mapping name →
    // message, merge messages custom) est identique aux autres contraintes,
    // déjà couvertes nativement ci-dessus.
    const input = makeInput("f", { minLength: 5 });
    input.value = "ab";
    Object.defineProperty(input, "validity", {
      configurable: true,
      get: () => ({
        valid: false,
        valueMissing: false,
        typeMismatch: false,
        tooShort: true,
        tooLong: false,
        patternMismatch: false,
      }),
    });
    const result = setup(input);
    expect(result.current.fieldErrors.f).toBe(DEFAULT_FR_MESSAGES.tooShort(5));
  });

  it("DEFAULT_FR_MESSAGES.tooShort/tooLong produisent le bon texte paramétré (unité pure, sans DOM)", () => {
    expect(DEFAULT_FR_MESSAGES.tooShort(1)).toBe("Minimum 1 caractère.");
    expect(DEFAULT_FR_MESSAGES.tooShort(3)).toBe("Minimum 3 caractères.");
    expect(DEFAULT_FR_MESSAGES.tooLong(1)).toBe("Maximum 1 caractère.");
    expect(DEFAULT_FR_MESSAGES.tooLong(10)).toBe("Maximum 10 caractères.");
  });

  it("patternMismatch → message pattern", () => {
    // Pattern volontairement sans `-` en fin de classe de caractères : sous
    // le flag `v` (Unicode Sets) utilisé par jsdom pour `RegExp`, un `-`
    // final dans `[a-z0-9-]` lève une erreur de construction (catché en
    // interne par jsdom → `patternMismatch` retombe à `false`). `[a-z]+`
    // évite l'ambiguïté et exerce la même branche de code.
    const input = makeInput("f", { pattern: "[a-z]+" });
    input.value = "PAS-MINUSCULE";
    const result = setup(input);
    expect(result.current.fieldErrors.f).toBe(
      DEFAULT_FR_MESSAGES.patternMismatch,
    );
  });

  it("surcharge via data-validate-msg-* posé directement sur le champ (fidélité vanilla)", () => {
    const input = makeInput("f", { required: true });
    input.dataset.validateMsgRequired = "Merci de renseigner ce champ";
    const result = setup(input);
    expect(result.current.fieldErrors.f).toBe("Merci de renseigner ce champ");
  });

  it("options.messages surcharge les messages par défaut", () => {
    const { result } = renderHook(() =>
      useFormValidation({
        messages: { valueMissing: "Champ obligatoire !" },
      }),
    );
    const input = makeInput("f", { required: true });
    mountForm({ f: input });
    act(() => {
      result.current.getFieldProps("f").ref(input);
    });
    act(() => {
      result.current.getFieldProps("f").onBlur({} as never);
    });
    expect(result.current.fieldErrors.f).toBe("Champ obligatoire !");
  });
});

describe("useFormValidation — submit : résumé, callbacks, focus", () => {
  function setupForm() {
    const nameField = makeInput("name", { required: true });
    const emailField = makeInput("email", { required: true, type: "email" });
    const form = mountForm({ name: nameField, email: emailField });
    return { form, nameField, emailField };
  }

  it("onValid est appelé quand tous les champs enregistrés sont valides", () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation({ onValid, onInvalid }),
    );
    const { form, nameField, emailField } = setupForm();
    nameField.value = "Alice";
    emailField.value = "alice@example.com";

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
      result.current.getFieldProps("email").ref(emailField);
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.formProps.onSubmit({
        preventDefault,
      } as never);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onInvalid).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual([]);
    expect(result.current.isValid).toBe(true);
  });

  it("onInvalid reçoit la liste des erreurs {id, message} quand des champs sont invalides", () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation({ onValid, onInvalid }),
    );
    const { form, nameField, emailField } = setupForm();
    // name reste vide (invalide), email invalide aussi

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
      result.current.getFieldProps("email").ref(emailField);
    });

    act(() => {
      result.current.formProps.onSubmit({
        preventDefault: vi.fn(),
      } as never);
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    const receivedErrors = onInvalid.mock.calls[0][0] as FormValidationError[];
    expect(receivedErrors).toHaveLength(2);
    expect(receivedErrors.map((e) => e.id).sort()).toEqual(["email", "name"]);
    expect(result.current.errors).toHaveLength(2);
    expect(result.current.isValid).toBe(false);
    expect(result.current.fieldErrors.name).toBe(
      DEFAULT_FR_MESSAGES.valueMissing,
    );
  });

  it("focuse summaryRef.current au submit invalide", () => {
    const { result } = renderHook(() => useFormValidation());
    const { form, nameField, emailField } = setupForm();

    const summaryEl = document.createElement("div");
    summaryEl.tabIndex = -1;
    document.body.appendChild(summaryEl);
    const focusSpy = vi.spyOn(summaryEl, "focus");

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
      result.current.getFieldProps("email").ref(emailField);
      (result.current.summaryRef as { current: HTMLElement | null }).current =
        summaryEl;
    });

    act(() => {
      result.current.formProps.onSubmit({
        preventDefault: vi.fn(),
      } as never);
    });

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("ignore les champs disabled lors du passage de validation", () => {
    const onValid = vi.fn();
    const { result } = renderHook(() => useFormValidation({ onValid }));
    const nameField = makeInput("name", { required: true, disabled: true });
    const form = mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
    });

    act(() => {
      result.current.formProps.onSubmit({
        preventDefault: vi.fn(),
      } as never);
    });

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(result.current.errors).toEqual([]);
  });
});

describe("useFormValidation — validate() manuel", () => {
  it("retourne false et peuple fieldErrors/errors sans dépendre d'un submit event", () => {
    const { result } = renderHook(() => useFormValidation());
    const nameField = makeInput("name", { required: true });
    const form = mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
    });

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.fieldErrors.name).toBe(
      DEFAULT_FR_MESSAGES.valueMissing,
    );
    expect(result.current.errors).toHaveLength(1);
  });

  it("retourne true quand tous les champs enregistrés sont valides", () => {
    const { result } = renderHook(() => useFormValidation());
    const nameField = makeInput("name", { required: true });
    nameField.value = "Bob";
    const form = mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
    });

    let valid: boolean | undefined;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });
});

describe("useFormValidation — région live (sr-only, aria-live=polite)", () => {
  it("crée une région live préfixée au form au montage (formProps.ref)", () => {
    const { result } = renderHook(() => useFormValidation());
    const form = document.createElement("form");
    document.body.appendChild(form);

    act(() => {
      result.current.formProps.ref(form);
    });

    const liveRegion = form.querySelector("[data-fv-live]");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveClass("sr-only");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("annonce le message d'erreur dans la région live au blur d'un champ invalide", () => {
    const { result } = renderHook(() => useFormValidation());
    const nameField = makeInput("name", { required: true });
    const form = mountForm({ name: nameField });

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
    });

    act(() => {
      result.current.getFieldProps("name").onBlur({} as never);
    });

    const liveRegion = form.querySelector("[data-fv-live]");
    expect(liveRegion?.textContent).toBe(DEFAULT_FR_MESSAGES.valueMissing);
  });

  it("annonce un résumé (N erreurs à corriger) au submit invalide", () => {
    const { result } = renderHook(() => useFormValidation());
    const nameField = makeInput("name", { required: true });
    const emailField = makeInput("email", { required: true });
    const form = mountForm({ name: nameField, email: emailField });

    act(() => {
      result.current.formProps.ref(form);
      result.current.getFieldProps("name").ref(nameField);
      result.current.getFieldProps("email").ref(emailField);
    });

    act(() => {
      result.current.formProps.onSubmit({
        preventDefault: vi.fn(),
      } as never);
    });

    const liveRegion = form.querySelector("[data-fv-live]");
    expect(liveRegion?.textContent).toBe("2 erreurs à corriger");
  });
});

describe("useFormValidation — formProps", () => {
  it("expose noValidate=true (bloque la validation native du navigateur)", () => {
    const { result } = renderHook(() => useFormValidation());
    expect(result.current.formProps.noValidate).toBe(true);
  });
});
