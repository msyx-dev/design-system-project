import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Type de toast — pilote l'icône, le token couleur et le role/aria-live. */
export type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  /** Type du toast (défaut "info"). */
  type?: ToastType;
  /** Durée avant auto-dismiss en ms (défaut 4000). */
  duration?: number;
}

interface ToastRecord {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  /** État de transition — pilote la classe .toast-enter/.toast-exit. */
  exiting: boolean;
}

export interface UseToastReturn {
  /** Affiche un toast, retourne son id (utilisable avec dismiss). */
  showToast: (message: string, options?: ToastOptions) => string;
  /** Démonte un toast avant son auto-dismiss (déclenche la transition exit). */
  dismiss: (id: string) => void;
}

export interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<UseToastReturn | null>(null);

const TOAST_ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

const TOAST_COLOR_TOKENS: Record<ToastType, string> = {
  success: "var(--success)",
  error: "var(--danger)",
  warning: "var(--warning)",
  info: "var(--info)",
};

const EXIT_TRANSITION_MS = 300;
const DEFAULT_DURATION = 4000;

let toastIdSeq = 0;
function nextToastId(): string {
  toastIdSeq += 1;
  return `toast-${toastIdSeq}-${Date.now()}`;
}

/**
 * ToastItem — Rendu d'un toast individuel du Design System msyx.fr.
 *
 * Émet le markup canonique `.toast` (alerts.css) :
 * ```html
 * <div class="toast toast-{type} [toast-enter|toast-exit]" role="{alert|status}" aria-live="{assertive|polite}">
 *   <span class="toast-message">
 *     <span aria-hidden="true" style="color:var(--{token});font-size:1rem">{icon}</span>
 *     {message}
 *   </span>
 *   <button class="toast-close" aria-label="Fermer">×</button>
 * </div>
 * ```
 *
 * Sémantique a11y (calquée sur `shared/components.js` `showToast`, #255) :
 * `role="alert"` + `aria-live="assertive"` pour error/warning (interruption assistive),
 * `role="status"` + `aria-live="polite"` pour success/info.
 */
function ToastItem({
  toast,
  onRequestDismiss,
}: {
  toast: ToastRecord;
  onRequestDismiss: (id: string) => void;
}) {
  const { id, message, type, exiting } = toast;
  const role = type === "error" || type === "warning" ? "alert" : "status";
  const ariaLive = role === "alert" ? "assertive" : "polite";

  const classes = [
    "toast",
    `toast-${type}`,
    exiting ? "toast-exit" : "toast-enter",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role={role} aria-live={ariaLive}>
      <span className="toast-message">
        <span
          aria-hidden="true"
          style={{ color: TOAST_COLOR_TOKENS[type], fontSize: "1rem" }}
        >
          {TOAST_ICONS[type]}
        </span>
        {message}
      </span>
      <button
        type="button"
        className="toast-close"
        aria-label="Fermer"
        onClick={() => onRequestDismiss(id)}
      >
        &times;
      </button>
    </div>
  );
}

/**
 * ToastProvider — Fournit le système de toasts du Design System msyx.fr en contexte React.
 *
 * Équivalent React de `showToast(message, type, duration)` (`shared/components.js`) :
 * monte un conteneur singleton `.toast-container` via portal sur `document.body`,
 * gère la pile de toasts, l'auto-dismiss par timer et la transition
 * enter/exit (`.toast-enter` → `.toast-exit`, démontage après 300ms).
 *
 * Le CSS des classes émises vient de la distribution DS (`alerts.css`) —
 * ce wrapper n'ajoute AUCUN style, il orchestre uniquement le state React.
 *
 * Utilisation :
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * function App() {
 *   const { showToast } = useToast();
 *   return <button onClick={() => showToast("Enregistré", { type: "success" })}>Save</button>;
 * }
 * ```
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const clearTimers = useCallback((id: string) => {
    const timers = timersRef.current;
    const existing = timers.get(id);
    if (existing) {
      clearTimeout(existing);
      timers.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimers(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimers],
  );

  const dismiss = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      clearTimers(id);
      const exitTimer = setTimeout(() => removeToast(id), EXIT_TRANSITION_MS);
      timersRef.current.set(id, exitTimer);
    },
    [clearTimers, removeToast],
  );

  const showToast = useCallback(
    (message: string, options?: ToastOptions): string => {
      const id = nextToastId();
      const type = options?.type ?? "info";
      const duration = options?.duration ?? DEFAULT_DURATION;

      setToasts((prev) => [
        ...prev,
        { id, message, type, duration, exiting: false },
      ]);

      const autoTimer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, autoTimer);

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const contextValue: UseToastReturn = { showToast, dismiss };

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {portalTarget &&
        createPortal(
          <div
            className="toast-container"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRequestDismiss={dismiss}
              />
            ))}
          </div>,
          portalTarget,
        )}
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = "ToastProvider";

/**
 * useToast — Hook d'accès au système de toasts du Design System msyx.fr.
 *
 * Doit être appelé dans un descendant de `<ToastProvider>`, sinon lève une erreur explicite.
 */
export function useToast(): UseToastReturn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast() doit être utilisé à l'intérieur d'un <ToastProvider>.",
    );
  }
  return ctx;
}
