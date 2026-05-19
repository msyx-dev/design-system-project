import { FormEvent, ReactNode, useState, useId } from "react";
import {
  AuthentikIcon,
  ProviderIcon,
  defaultProviderLabel,
} from "./ProviderIcons";

export type LoginScreenVariant =
  | "internal-only"
  | "public-multi-providers"
  | "internal-with-fallback";

export interface LoginScreenProvider {
  id: "google" | "apple" | "microsoft" | "github";
  label?: string;
  onClick: () => void;
}

export interface LoginScreenProps {
  variant?: LoginScreenVariant;
  appName?: string;
  subtitle?: string;
  logo?: ReactNode;
  onAuthentikClick?: () => void;
  providers?: LoginScreenProvider[];
  showFallbackForm?: boolean;
  onFallbackSubmit?: (values: { login: string; password: string }) => void;
}

export const LoginScreen = ({
  variant = "internal-only",
  appName,
  subtitle,
  logo,
  onAuthentikClick,
  providers,
  showFallbackForm = false,
  onFallbackSubmit,
}: LoginScreenProps) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const loginId = useId();
  const passwordId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onFallbackSubmit?.({ login, password });
  };

  const logoNode = logo !== undefined ? logo : "ms";

  const headingText = `Connexion ${appName ?? "msyx"}`;

  const authentikButton = (
    <button
      type="button"
      className="login-authentik-btn"
      onClick={onAuthentikClick}
    >
      <AuthentikIcon className="login-authentik-icon" aria-hidden="true" />
      Se connecter avec Authentik
    </button>
  );

  const providersSection =
    providers && providers.length > 0 ? (
      <div className="login-providers">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`login-provider-btn login-provider-btn--${p.id}`}
            onClick={p.onClick}
            aria-label={p.label ?? defaultProviderLabel(p.id)}
          >
            <ProviderIcon id={p.id} aria-hidden="true" />
            {p.label ?? defaultProviderLabel(p.id)}
          </button>
        ))}
      </div>
    ) : null;

  const fallbackForm = showFallbackForm ? (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor={loginId}>Identifiant</label>
      <input
        id={loginId}
        type="text"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoComplete="username"
        required
      />
      <label htmlFor={passwordId}>Mot de passe</label>
      <input
        id={passwordId}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <button type="submit" className="login-submit">
        Se connecter
      </button>
    </form>
  ) : null;

  const renderContent = () => {
    if (variant === "internal-with-fallback") {
      // Form EN PREMIER, puis divider, puis bouton Authentik
      return (
        <>
          {fallbackForm}
          {showFallbackForm && (
            <div className="login-divider">ou si disponible</div>
          )}
          {authentikButton}
        </>
      );
    }

    if (variant === "public-multi-providers") {
      return (
        <>
          {authentikButton}
          {providersSection}
          {showFallbackForm && <div className="login-divider">ou</div>}
          {fallbackForm}
        </>
      );
    }

    // internal-only (default)
    return (
      <>
        {authentikButton}
        {showFallbackForm && (
          <div className="login-divider">ou accès de secours</div>
        )}
        {fallbackForm}
      </>
    );
  };

  return (
    <div className={`login-card login-card--${variant}`}>
      <div className="login-logo" aria-hidden="true">
        {logoNode}
      </div>
      <h3>{headingText}</h3>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {renderContent()}
    </div>
  );
};

LoginScreen.displayName = "LoginScreen";
