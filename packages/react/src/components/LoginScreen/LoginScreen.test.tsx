import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

// --- Variants ---

describe("LoginScreen — variant internal-only", () => {
  it("renders with class login-card--internal-only by default", () => {
    const { container } = render(<LoginScreen />);
    expect(
      container.querySelector(".login-card--internal-only"),
    ).not.toBeNull();
  });

  it("renders Authentik button", () => {
    render(<LoginScreen />);
    expect(
      screen.getByRole("button", { name: /se connecter avec authentik/i }),
    ).toBeInTheDocument();
  });

  it("does not render fallback form by default", () => {
    const { container } = render(<LoginScreen />);
    expect(container.querySelector(".login-form")).toBeNull();
  });
});

describe("LoginScreen — variant public-multi-providers", () => {
  it("renders with class login-card--public-multi-providers", () => {
    const { container } = render(
      <LoginScreen variant="public-multi-providers" />,
    );
    expect(
      container.querySelector(".login-card--public-multi-providers"),
    ).not.toBeNull();
  });

  it("renders Authentik button", () => {
    render(<LoginScreen variant="public-multi-providers" />);
    expect(
      screen.getByRole("button", { name: /se connecter avec authentik/i }),
    ).toBeInTheDocument();
  });
});

describe("LoginScreen — variant internal-with-fallback", () => {
  it("renders with class login-card--internal-with-fallback", () => {
    const { container } = render(
      <LoginScreen variant="internal-with-fallback" showFallbackForm />,
    );
    expect(
      container.querySelector(".login-card--internal-with-fallback"),
    ).not.toBeNull();
  });

  it("renders form before Authentik button (DOM order)", () => {
    const { container } = render(
      <LoginScreen variant="internal-with-fallback" showFallbackForm />,
    );
    const card = container.querySelector(
      ".login-card--internal-with-fallback",
    )!;
    const form = card.querySelector(".login-form")!;
    const btn = card.querySelector(".login-authentik-btn")!;
    // form doit apparaître avant le bouton dans le DOM
    expect(
      form.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// --- onAuthentikClick ---

describe("LoginScreen — onAuthentikClick", () => {
  it("calls onAuthentikClick when Authentik button is clicked", () => {
    const onClick = vi.fn();
    render(<LoginScreen onAuthentikClick={onClick} />);
    fireEvent.click(
      screen.getByRole("button", { name: /se connecter avec authentik/i }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// --- Providers ---

describe("LoginScreen — providers", () => {
  const providers = [
    { id: "google" as const, onClick: vi.fn() },
    { id: "apple" as const, label: "Apple (test)", onClick: vi.fn() },
    { id: "microsoft" as const, onClick: vi.fn() },
    { id: "github" as const, onClick: vi.fn() },
  ];

  it("renders each provider button with correct class", () => {
    const { container } = render(
      <LoginScreen variant="public-multi-providers" providers={providers} />,
    );
    expect(
      container.querySelector(".login-provider-btn--google"),
    ).not.toBeNull();
    expect(
      container.querySelector(".login-provider-btn--apple"),
    ).not.toBeNull();
    expect(
      container.querySelector(".login-provider-btn--microsoft"),
    ).not.toBeNull();
    expect(
      container.querySelector(".login-provider-btn--github"),
    ).not.toBeNull();
  });

  it("calls provider onClick when provider button is clicked", () => {
    const googleClick = vi.fn();
    render(
      <LoginScreen
        variant="public-multi-providers"
        providers={[{ id: "google", onClick: googleClick }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(googleClick).toHaveBeenCalledTimes(1);
  });

  it("uses custom label when provided", () => {
    render(
      <LoginScreen
        variant="public-multi-providers"
        providers={[{ id: "apple", label: "Apple (test)", onClick: vi.fn() }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /apple \(test\)/i }),
    ).toBeInTheDocument();
  });

  it("uses default label when no label provided", () => {
    render(
      <LoginScreen
        variant="public-multi-providers"
        providers={[{ id: "microsoft", onClick: vi.fn() }]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /microsoft/i }),
    ).toBeInTheDocument();
  });
});

// --- Fallback form ---

describe("LoginScreen — fallback form", () => {
  it("renders form when showFallbackForm=true", () => {
    const { container } = render(<LoginScreen showFallbackForm />);
    expect(container.querySelector(".login-form")).not.toBeNull();
  });

  it("does not render form when showFallbackForm=false", () => {
    const { container } = render(<LoginScreen showFallbackForm={false} />);
    expect(container.querySelector(".login-form")).toBeNull();
  });

  it("calls onFallbackSubmit with login and password on submit", () => {
    const onSubmit = vi.fn();
    render(<LoginScreen showFallbackForm onFallbackSubmit={onSubmit} />);

    const loginInput = screen.getByLabelText(/identifiant/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    fireEvent.change(loginInput, { target: { value: "admin" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    fireEvent.submit(
      screen.getByRole("button", { name: /se connecter$/i }).closest("form")!,
    );

    expect(onSubmit).toHaveBeenCalledWith({
      login: "admin",
      password: "secret",
    });
  });

  it("submit button has class login-submit", () => {
    render(<LoginScreen showFallbackForm />);
    expect(screen.getByRole("button", { name: /se connecter$/i })).toHaveClass(
      "login-submit",
    );
  });
});

// --- appName ---

describe("LoginScreen — appName", () => {
  it("reflects appName in heading", () => {
    render(<LoginScreen appName="Laserbox" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Connexion Laserbox",
    );
  });

  it("defaults to msyx in heading when no appName", () => {
    render(<LoginScreen />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Connexion msyx",
    );
  });
});

// --- logo prop ---

describe("LoginScreen — logo prop", () => {
  it("renders logo ReactNode inside .login-logo", () => {
    const { container } = render(
      <LoginScreen
        logo={<img src="/logo.png" alt="Logo" data-testid="custom-logo" />}
      />,
    );
    const logoContainer = container.querySelector(".login-logo");
    expect(logoContainer).not.toBeNull();
    expect(
      logoContainer?.querySelector("[data-testid='custom-logo']"),
    ).not.toBeNull();
  });

  it("renders default text 'ms' when no logo provided", () => {
    const { container } = render(<LoginScreen />);
    const logoContainer = container.querySelector(".login-logo");
    expect(logoContainer?.textContent).toBe("ms");
  });
});

// --- subtitle ---

describe("LoginScreen — subtitle", () => {
  it("renders subtitle when provided", () => {
    render(<LoginScreen subtitle="Application interne" />);
    expect(screen.getByText("Application interne")).toBeInTheDocument();
  });

  it("does not render subtitle paragraph when omitted", () => {
    const { container } = render(<LoginScreen />);
    expect(container.querySelector(".subtitle")).toBeNull();
  });
});

// --- A11y baseline ---

describe("LoginScreen — a11y", () => {
  it("labels are associated via htmlFor/id in fallback form", () => {
    render(<LoginScreen showFallbackForm />);
    // getByLabelText throws if no association found
    expect(screen.getByLabelText(/identifiant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  });

  it("providers have aria-label", () => {
    const { container } = render(
      <LoginScreen
        variant="public-multi-providers"
        providers={[{ id: "google", onClick: vi.fn() }]}
      />,
    );
    const btn = container.querySelector(".login-provider-btn--google");
    expect(btn?.getAttribute("aria-label")).toBeTruthy();
  });

  it("logo container has aria-hidden", () => {
    const { container } = render(<LoginScreen />);
    const logoEl = container.querySelector(".login-logo");
    expect(logoEl?.getAttribute("aria-hidden")).toBe("true");
  });

  it("Authentik button is type=button (not submit)", () => {
    render(<LoginScreen />);
    const btn = screen.getByRole("button", {
      name: /se connecter avec authentik/i,
    });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("password input has type=password and autocomplete=current-password", () => {
    render(<LoginScreen showFallbackForm />);
    const passwordInput = screen.getByLabelText(/mot de passe/i);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
  });

  it("auto aria-label on provider button matches default label exactly", () => {
    const { container } = render(
      <LoginScreen
        variant="public-multi-providers"
        providers={[{ id: "microsoft", onClick: vi.fn() }]}
      />,
    );
    const btn = container.querySelector(".login-provider-btn--microsoft");
    expect(btn?.getAttribute("aria-label")).toBe("Microsoft");
  });
});

// --- variant internal-with-fallback sans showFallbackForm ---

describe("LoginScreen — variant internal-with-fallback sans fallback form", () => {
  it("renders only Authentik button when showFallbackForm is false", () => {
    const { container } = render(
      <LoginScreen variant="internal-with-fallback" showFallbackForm={false} />,
    );
    expect(container.querySelector(".login-form")).toBeNull();
    expect(container.querySelector(".login-divider")).toBeNull();
    expect(container.querySelector(".login-authentik-btn")).not.toBeNull();
  });
});

// --- Exports types ---

describe("LoginScreen — exports", () => {
  it("LoginScreen has a displayName", () => {
    expect(LoginScreen.displayName).toBe("LoginScreen");
  });
});
