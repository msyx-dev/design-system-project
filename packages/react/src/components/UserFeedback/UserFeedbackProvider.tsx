import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  FeedbackDevice,
  FeedbackEnv,
  FeedbackSubmitHandler,
  FeedbackUser,
  UserFeedbackContextData,
} from "./types";

const DEFAULT_VERSION_URL = "/version";

/** Seuils de largeur cohérents avec les breakpoints mobile-first du DS (768/1024). */
const TABLET_MIN_WIDTH = 768;
const DESKTOP_MIN_WIDTH = 1024;

export interface UseUserFeedbackReturn {
  /** Snapshot du contexte transverse — rafraîchi à chaque `openFeedback()`. */
  context: UserFeedbackContextData;
  isOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
  /** Ré-exposé pour que la Modal (#693) l'appelle. */
  onSubmit?: FeedbackSubmitHandler;
}

export interface UserFeedbackProviderProps {
  appId: string;
  /** URL de l'endpoint version, tolérant aux échecs (défaut `/version`). */
  versionUrl?: string;
  /** Utilisateur connecté — `null`/omis = anonyme. */
  user?: FeedbackUser | null;
  tenant?: string | null;
  onSubmit?: FeedbackSubmitHandler;
  children: ReactNode;
}

const UserFeedbackContext = createContext<UseUserFeedbackReturn | null>(null);

/** `*.miklaw.fr` → preprod, `*.msyx.fr` → prod, localhost/127.* → dev, sinon unknown. */
function detectEnv(hostname: string): FeedbackEnv {
  if (!hostname) return "unknown";
  if (hostname === "localhost" || hostname.startsWith("127.")) return "dev";
  if (hostname === "miklaw.fr" || hostname.endsWith(".miklaw.fr")) {
    return "preprod";
  }
  if (hostname === "msyx.fr" || hostname.endsWith(".msyx.fr")) return "prod";
  return "unknown";
}

/** Catégorie d'appareil dérivée de la largeur de viewport (breakpoints DS 768/1024). */
function detectDevice(width: number): FeedbackDevice {
  if (width < TABLET_MIN_WIDTH) return "mobile";
  if (width < DESKTOP_MIN_WIDTH) return "tablet";
  return "desktop";
}

/** Sniffing minimal — suffisant pour un contexte de rapport de bug, pas une lib de détection exhaustive. */
function detectBrowser(userAgent: string): string {
  if (!userAgent) return "unknown";
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return "Opera";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) {
    return "Chrome";
  }
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
    return "Safari";
  }
  return "unknown";
}

interface BuildContextParams {
  appId: string;
  version: string | null;
  user: FeedbackUser | null;
  tenant: string | null;
}

/**
 * Construit un snapshot du contexte transverse. SSR-safe : aucun accès à
 * `window`/`document`/`navigator` en dehors de ce garde `isBrowser` — les
 * valeurs par défaut ci-dessous sont celles renvoyées côté serveur.
 */
function buildContext(params: BuildContextParams): UserFeedbackContextData {
  const isBrowser = typeof window !== "undefined";

  const hostname = isBrowser ? window.location.hostname : "";
  const route = isBrowser
    ? `${window.location.pathname}${window.location.search}`
    : "";
  const userAgent = isBrowser ? window.navigator.userAgent : "";
  const language = isBrowser ? window.navigator.language : "";
  const width = isBrowser ? window.innerWidth : 0;
  const height = isBrowser ? window.innerHeight : 0;

  return {
    appId: params.appId,
    version: params.version,
    env: detectEnv(hostname),
    route,
    browser: detectBrowser(userAgent),
    device: detectDevice(width),
    viewport: { width, height },
    language,
    user: params.user,
    tenant: params.tenant,
  };
}

/** `fetch(versionUrl)` tolérant — retourne `null` sur tout échec (réseau, HTTP, parsing). */
async function fetchVersion(versionUrl: string): Promise<string | null> {
  try {
    const res = await fetch(versionUrl);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.version === "string") return record.version;
      if (typeof record.sha === "string") return record.sha;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * UserFeedbackProvider — Fournit le contexte transverse du système de
 * feedback utilisateur du Design System msyx.fr (patron `ToastProvider`).
 *
 * Capture automatiquement `browser`/`device`/`viewport` (`navigator`/`window`),
 * `route` (`location`), `language` (`navigator.language`) et résout `env`
 * depuis le hostname. La `version` applicative est résolue via
 * `fetch(versionUrl)` (tolérant, `null` en cas d'échec) au montage.
 *
 * Le snapshot exposé (`context`) est recalculé à chaque `openFeedback()` —
 * pas seulement au montage — pour refléter la route/viewport courants.
 *
 * **Périmètre #692** : expose l'état (`isOpen`) mais ne monte pas encore la
 * Modal (livrée #693) — `isOpen` pilote uniquement l'état interne pour
 * l'instant.
 *
 * SSR-safe : aucun accès `window`/`document`/`fetch` au niveau module, tout
 * est confiné à `useEffect`/aux handlers.
 */
export function UserFeedbackProvider({
  appId,
  versionUrl = DEFAULT_VERSION_URL,
  user = null,
  tenant = null,
  onSubmit,
  children,
}: UserFeedbackProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const versionRef = useRef<string | null>(null);
  const [context, setContext] = useState<UserFeedbackContextData>(() =>
    buildContext({ appId, version: null, user, tenant }),
  );

  useEffect(() => {
    let cancelled = false;

    // Si versionUrl change après une résolution précédente, versionRef
    // garderait sinon la valeur de l'ancienne URL le temps du nouveau fetch —
    // on la neutralise immédiatement pour éviter d'attribuer une version
    // périmée à la nouvelle URL.
    versionRef.current = null;
    setContext((prev) => ({ ...prev, version: null }));

    fetchVersion(versionUrl).then((version) => {
      if (cancelled) return;
      versionRef.current = version;
      setContext((prev) => ({ ...prev, version }));
    });

    return () => {
      cancelled = true;
    };
    // appId/user/tenant volontairement absents : le refetch ne dépend que de
    // l'URL — les autres champs sont recalculés à chaque openFeedback().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionUrl]);

  const openFeedback = useCallback(() => {
    setContext(
      buildContext({ appId, version: versionRef.current, user, tenant }),
    );
    setIsOpen(true);
  }, [appId, user, tenant]);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue: UseUserFeedbackReturn = {
    context,
    isOpen,
    openFeedback,
    closeFeedback,
    onSubmit,
  };

  return (
    <UserFeedbackContext.Provider value={contextValue}>
      {children}
    </UserFeedbackContext.Provider>
  );
}

UserFeedbackProvider.displayName = "UserFeedbackProvider";

/**
 * useUserFeedback — Hook d'accès au contexte de feedback utilisateur.
 *
 * Doit être appelé dans un descendant de `<UserFeedbackProvider>`, sinon
 * lève une erreur explicite.
 */
export function useUserFeedback(): UseUserFeedbackReturn {
  const ctx = useContext(UserFeedbackContext);
  if (!ctx) {
    throw new Error(
      "useUserFeedback() doit être utilisé à l'intérieur d'un <UserFeedbackProvider>.",
    );
  }
  return ctx;
}
