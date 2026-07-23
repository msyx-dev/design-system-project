// @msyx-dev/react — SiteHeader (#716, sous-issue 1/3 de #712)
//
// Header applicatif composable. 100% présentationnel : ne possède aucune
// donnée, ne fetch rien (sauf si l'app opte pour un `feedback.provider`
// auto-monté). Compose les briques DS déjà portées et réutilise le CSS header
// existant (`shared/css/layout.css`) — zéro classe créée. Reproduit l'ordre
// de placement du header vanilla (`shared/nav.js buildHeader`) : burger →
// brand → version → spacer → thème → zone user (notifs → feedback → identité).

import { type ReactNode } from "react";
import {
  NotificationBell,
  type NotificationItem,
} from "../NotificationBell/NotificationBell";
import { UserMenu } from "../UserMenu/UserMenu";
import {
  VersionNotes,
  type VersionNotesProps,
} from "../VersionNotes/VersionNotes";
import { ThemeSwitcher } from "../ThemeSwitcher/ThemeSwitcher";
import {
  UserFeedbackButton,
  type UserFeedbackButtonProps,
} from "../UserFeedback/UserFeedbackButton";
import {
  UserFeedbackProvider,
  type UserFeedbackProviderProps,
} from "../UserFeedback/UserFeedbackProvider";

/** Identité affichée dans la zone user (mappée sur `<UserMenu>` en mode connecté). */
export interface SiteHeaderIdentity {
  /** Nom affiché — requis. */
  name: string;
  /** E-mail (dropdown UserMenu). Défaut `""` si absent. */
  email?: string;
  avatarUrl?: string;
  /** Lien « Mon compte ». Défaut `"#"` si absent. */
  authentikUserUrl?: string;
  /** Action POST de déconnexion. Défaut `"#"` si absent. */
  logoutUrl?: string;
  /** Badge de rôle dans l'en-tête du dropdown (ex. "Admin"). */
  roleBadge?: ReactNode;
}

/** Config du feedback header. `boolean` = raccourci (bouton par défaut, Provider ambiant). */
export interface SiteHeaderFeedbackConfig {
  /** Props du `<UserFeedbackButton>` (label, icon, onClick, className). */
  button?: UserFeedbackButtonProps;
  /**
   * Si fourni, SiteHeader monte lui-même un `<UserFeedbackProvider {...provider}>`
   * autour du bouton (app SANS Provider ambiant). Déclenche le fetch `/version`
   * du Provider — **opt-in explicite de l'app**. Si absent, le bouton s'appuie
   * sur un `<UserFeedbackProvider>` ancêtre fourni par l'app, et SiteHeader reste
   * 100 % présentationnel (zéro fetch).
   */
  provider?: Omit<UserFeedbackProviderProps, "children">;
}

export interface SiteHeaderProps {
  /** Slot logo/wordmark. Défaut : wordmark texte `.header-logo`/`.brand-wordmark`. */
  brand?: ReactNode;
  /**
   * `undefined` = LOADING (skeleton avatar, pas de flash) · `null` = ANONYME
   * (zone user réduite, pas de UserMenu) · objet = CONNECTÉ (`<UserMenu>`).
   */
  identity?: SiteHeaderIdentity | null;
  /** Rendu `<NotificationBell>` seulement si fourni (opt-out : masqué si absent). */
  notifications?: NotificationItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onItemClick?: (item: NotificationItem) => void;
  /** `<UserFeedbackButton>` (+ Provider si `provider` fourni). Rendu si truthy. */
  feedback?: SiteHeaderFeedbackConfig | boolean;
  /** `<VersionNotes>` (badge + modale). Rendu si fourni. */
  versionNotes?: VersionNotesProps;
  /** `<ThemeSwitcher>` (palette + mode). Rendu si `true`. */
  themeSwitch?: boolean;
  /** Burger mobile — affiché seulement si fourni. */
  onMenuToggle?: () => void;
  className?: string;
}

/** Brand par défaut — placeholder texte (aucun asset à servir). Les consumers
 *  passent leur propre `brand` (logo `<a>`/`<img>`). Classes DS existantes. */
const DEFAULT_BRAND = (
  <span className="header-logo" aria-label="Accueil">
    <span className="brand-wordmark">design-system</span>
  </span>
);

/** 3 états d'identité — voir `SiteHeaderProps.identity`. */
function renderIdentity(identity: SiteHeaderProps["identity"]): ReactNode {
  if (identity === undefined) {
    // LOADING : skeleton avatar (aucune donnée encore, pas de flash de contenu).
    return (
      <span
        className="skeleton skeleton-avatar"
        aria-hidden="true"
        data-testid="site-header-identity-loading"
      />
    );
  }
  if (identity === null) {
    // ANONYME : zone user réduite — aucun contrôle d'identité.
    return null;
  }
  // CONNECTÉ : UserMenu (défauts sûrs pour les champs requis par UserMenu).
  return (
    <UserMenu
      displayName={identity.name}
      email={identity.email ?? ""}
      avatarUrl={identity.avatarUrl}
      authentikUserUrl={identity.authentikUserUrl ?? "#"}
      logoutUrl={identity.logoutUrl ?? "#"}
      roleBadge={identity.roleBadge}
    />
  );
}

/** Bouton feedback (+ Provider auto-monté si `provider` fourni). */
function renderFeedback(feedback: SiteHeaderProps["feedback"]): ReactNode {
  if (!feedback) return null;
  const config: SiteHeaderFeedbackConfig = feedback === true ? {} : feedback;
  const button = <UserFeedbackButton {...(config.button ?? {})} />;
  if (config.provider) {
    return (
      <UserFeedbackProvider {...config.provider}>{button}</UserFeedbackProvider>
    );
  }
  return button;
}

/**
 * SiteHeader — header applicatif composable du Design System msyx.fr (#716).
 *
 * **100 % présentationnel** : ne possède aucune donnée, ne fetch rien (sauf si
 * l'app opte pour un `feedback.provider` auto-monté). Compose les briques DS
 * déjà portées et **réutilise le CSS header existant** (`layout.css`) — zéro
 * classe créée. Reproduit l'ordre de placement du header vanilla
 * (`shared/nav.js buildHeader`) : burger → brand → version → spacer → thème →
 * zone user (notifs → feedback → identité).
 *
 * Chaque feature est **opt-out** : rendue uniquement si sa prop/données sont
 * fournies. Coexiste avec `<PageHeader>` (rôles distincts).
 */
export function SiteHeader({
  brand,
  identity,
  notifications,
  unreadCount,
  onMarkAllRead,
  onItemClick,
  feedback,
  versionNotes,
  themeSwitch,
  onMenuToggle,
  className,
}: SiteHeaderProps) {
  const rootClasses = ["site-header", className].filter(Boolean).join(" ");
  const feedbackNode = renderFeedback(feedback);
  const identityNode = renderIdentity(identity);

  return (
    <header className={rootClasses}>
      {onMenuToggle && (
        <button
          type="button"
          className="header-burger"
          aria-label="Ouvrir le menu"
          onClick={onMenuToggle}
        >
          {"☰"}
        </button>
      )}

      {brand ?? DEFAULT_BRAND}

      {versionNotes && <VersionNotes {...versionNotes} />}

      <span className="header-spacer" />

      {themeSwitch && (
        <div className="header-controls">
          <ThemeSwitcher />
        </div>
      )}

      {/* NotificationBell rend SA PROPRE .header-user-zone (ancre du panel
          position:absolute — contrat shipped alpha.17, non re-wrappable). */}
      {notifications !== undefined && (
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={onMarkAllRead}
          onItemClick={onItemClick}
        />
      )}

      {/* Feedback + identité groupés dans UNE .header-user-zone (gap space-sm,
          position:relative pour le dropdown UserMenu). Sibling de la zone bell
          — pas de nesting de .header-user-zone. */}
      {(feedbackNode != null || identityNode != null) && (
        <div className="header-user-zone">
          {feedbackNode}
          {identityNode}
        </div>
      )}
    </header>
  );
}

SiteHeader.displayName = "SiteHeader";
