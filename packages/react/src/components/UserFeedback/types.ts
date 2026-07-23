// @msyx-dev/react — UserFeedback — types partagés (#692)
//
// Source unique des types du lot "Feedback Core" — importés tels quels par
// UserFeedbackProvider.tsx (#692), la Modal (#693), le Button (#694) et
// ré-exportés depuis l'index public par #695. Contrat figé en groom parent,
// NE PAS modifier la forme des types ici sans re-ouvrir le groom (#692 issue
// comment "🔒 Contrat figé").

/** Environnement d'exécution, dérivé automatiquement du hostname courant. */
export type FeedbackEnv = "preprod" | "prod" | "dev" | "unknown";

/** Catégorie d'appareil, dérivée de la largeur de viewport. */
export type FeedbackDevice = "desktop" | "tablet" | "mobile";

/** Identité utilisateur minimale transmise par le consumer (mode connecté). */
export interface FeedbackUser {
  id: string;
  email?: string;
}

/**
 * Contexte transverse capturé automatiquement à chaque ouverture du feedback
 * (`openFeedback()`), exposé via `useUserFeedback().context`.
 */
export interface UserFeedbackContextData {
  appId: string;
  /** Version applicative résolue via `versionUrl` (`/version` par défaut), `null` si indisponible. */
  version: string | null;
  /** Environnement auto-détecté depuis le hostname. */
  env: FeedbackEnv;
  /** `location.pathname + location.search`. */
  route: string;
  /** Navigateur dérivé de `navigator.userAgent`. */
  browser: string;
  /** Catégorie d'appareil dérivée de la largeur de viewport. */
  device: FeedbackDevice;
  viewport: { width: number; height: number };
  /** `navigator.language`. */
  language: string;
  /** `null` = utilisateur anonyme. */
  user: FeedbackUser | null;
  tenant: string | null;
}

// Valeurs du formulaire — la Modal (#693) est la SEULE à les produire,
// mais le type vit ici pour être référencé par onSubmit du Provider.

/** Nature du retour utilisateur. */
export type FeedbackType = "bug" | "idea" | "question" | "other";

/** Sévérité perçue par l'utilisateur (optionnelle). */
export type FeedbackImpact = "low" | "medium" | "high";

/** Valeurs saisies dans la Modal de feedback (#693). */
export interface FeedbackFormValues {
  type: FeedbackType;
  title: string;
  description: string;
  impact?: FeedbackImpact;
  /** Requis si `context.user === null` (mode anonyme). */
  email?: string;
  /** Pièce jointe optionnelle (image ≤5 Mo). Un `File` est accepté (`File extends Blob`). */
  screenshot?: Blob | null;
}

/** Handler de soumission — reçoit les valeurs saisies + le contexte capturé. */
export type FeedbackSubmitHandler = (
  values: FeedbackFormValues,
  context: UserFeedbackContextData,
) => void | Promise<void>;
