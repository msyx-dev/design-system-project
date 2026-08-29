import type { ReactElement, ReactNode } from "react";
import { useId } from "react";

export interface AccessDeniedUser {
  /** Nom affiché du compte connecté. */
  name?: string;
  /** Email affiché du compte connecté. */
  email?: string;
}

export interface AccessDeniedProps {
  /** Nom de l'app affiché dans le message. Absent → message générique. */
  appName?: string;
  /** URL du bouton de retour. @default "https://msyx.fr" */
  homeUrl?: string;
  /** Libellé du bouton de retour. @default "Retour à msyx.fr" */
  homeLabel?: ReactNode;
  /** URL du formulaire de déconnexion (POST — jamais GET). @default "/auth/logout" */
  logoutUrl?: string;
  /** Libellé du bouton de déconnexion. @default "Se déconnecter" */
  logoutLabel?: ReactNode;
  /** Utilisateur connecté — affiche `.access-denied-user` si `name` ou `email` fourni. */
  user?: AccessDeniedUser;
  /** Chemin du logo msyx (PNG officiel). @default "/assets/sources/logoMSYX.png" */
  logoSrc?: string;
  /** Titre principal. @default "Accès refusé" */
  title?: ReactNode;
  className?: string;
}

/** Initiales : 2 lettres depuis `name` (prénom+nom), sinon 2 lettres depuis `name` seul, sinon 1re lettre d'`email` — calque exact `access-denied.html` (script inline). */
function computeInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "";
}

/**
 * `AccessDenied` — page 403 standalone msyx (`access-denied`, `feedback.html`
 * #access-denied ; calque `access-denied.html`, issue #291).
 *
 * Affichée quand un utilisateur authentifié (UC3, groupe `app-{slug}`)
 * n'appartient pas au groupe requis de l'app — remplace l'erreur Authentik
 * brute. Composant de PRÉSENTATION pur : aucune logique de session, tout
 * vient des props (le consumer connaît son état d'auth).
 *
 * Racine `.access-denied-preview` (seule variante dont le CSS distribué —
 * `access-denied.css` — couvre le positionnement des orbes ; la page
 * standalone `access-denied.html` définit son propre `<style>` non
 * distribué par `shared/sync.sh`, hors périmètre d'un composant React).
 *
 * Bouton de déconnexion en `<form method="POST">` — jamais un lien GET
 * (calque exact du vanilla, sécurité : la déconnexion ne doit pas être
 * déclenchable par un simple lien).
 */
export function AccessDenied({
  appName,
  homeUrl = "https://msyx.fr",
  homeLabel = "Retour à msyx.fr",
  logoutUrl = "/auth/logout",
  logoutLabel = "Se déconnecter",
  user,
  logoSrc = "/assets/sources/logoMSYX.png",
  title = "Accès refusé",
  className,
}: AccessDeniedProps): ReactElement {
  const titleId = useId();
  const classes = ["access-denied-preview", className]
    .filter(Boolean)
    .join(" ");

  const message = appName
    ? `Vous n'avez pas accès à ${appName}. Si vous pensez que c'est une erreur, contactez l'administrateur.`
    : "Vous n'avez pas les droits nécessaires pour accéder à cette application. Si vous pensez que c'est une erreur, contactez l'administrateur.";

  const showUser = Boolean(user?.name || user?.email);
  const initials = computeInitials(user?.name, user?.email);

  return (
    <div className={classes} aria-labelledby={titleId}>
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="access-denied-card">
        <div className="access-denied-logo">
          <img src={logoSrc} alt="msyx" width={56} height={56} />
        </div>

        <p className="access-denied-code" aria-hidden="true">
          403 — Accès refusé
        </p>

        <h1 id={titleId}>{title}</h1>

        <p className="access-denied-message">{message}</p>

        {showUser ? (
          <div className="access-denied-user" aria-label="Compte connecté">
            <div className="access-denied-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="access-denied-user-info">
              {user?.name ? (
                <div className="access-denied-user-name">{user.name}</div>
              ) : null}
              {user?.email ? (
                <div className="access-denied-user-email">{user.email}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className="access-denied-actions"
          role="group"
          aria-label="Actions disponibles"
        >
          <a
            href={homeUrl}
            className="access-denied-btn-primary"
            aria-label={`Retourner à ${homeUrl}`}
          >
            {homeLabel}
          </a>
          <form
            method="POST"
            action={logoutUrl}
            style={{ display: "contents" }}
          >
            <button
              type="submit"
              className="access-denied-btn-secondary"
              aria-label="Se déconnecter du compte actuel"
            >
              {logoutLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

AccessDenied.displayName = "AccessDenied";
