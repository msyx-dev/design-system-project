import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  forwardRef,
} from "react";

export interface SettingsRow {
  /** Clé React. */
  id: string;
  /** `.settings-row-label`. */
  label: ReactNode;
  /** `.settings-row-desc`. Omis → pas de description. */
  description?: ReactNode;
  /**
   * `.settings-row-control` — contrôle libre. Composez `<Toggle>` (déjà
   * porté, `.toggle`), `<SettingsRowInput>`/`<SettingsRowSelect>`
   * (co-localisés ici, `.settings-row-input`/`.settings-row-select` — classes
   * PROPRES à cette entrée registre, distinctes de `.input`/`<Input>`) ou
   * `<Button>` (zone danger). Le panneau ne décide jamais quel contrôle
   * représente un réglage.
   */
  control: ReactNode;
}

export interface SettingsSection {
  /** Clé React. */
  id: string;
  /** `.settings-section-title`. */
  title: ReactNode;
  rows: SettingsRow[];
  /** `.settings-danger` — section zone danger (rouge). */
  danger?: boolean;
}

export interface SettingsPanelProps {
  sections: SettingsSection[];
  className?: string;
}

/**
 * SettingsPanel — Panneau de paramètres du Design System msyx.fr
 * (`pages/templates.html` #settings-panel, `components/forms.css:669-687`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="settings-panel">
 *   <div class="settings-section[ settings-danger]">
 *     <div class="settings-section-title">…</div>
 *     <div class="settings-row">
 *       <div class="settings-row-info">
 *         <div class="settings-row-label">…</div>
 *         <div class="settings-row-desc">…</div>
 *       </div>
 *       <div class="settings-row-control">…</div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **Pure structure, aucun JS** (`docs/DS-PRINCIPLES.md` §8.1 — pas
 * d'`initSettingsPanel` côté vanilla, la démo réutilise les toggles `.toggle`
 * existants). Composant purement présentationnel, data-driven
 * (`sections`/`rows`) : ne connaît aucune politique de réglage, assemble
 * uniquement ce qu'on lui donne.
 *
 * **Composition** : `control` est fourni par le parent — composez `<Toggle>`
 * déjà porté (`.toggle`), `<SettingsRowInput>`/`<SettingsRowSelect>`
 * (co-localisés ci-dessous, classes propres à cette entrée registre) ou
 * `<Button variant="danger" size="sm">` pour la zone danger.
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function SettingsPanel({ sections, className }: SettingsPanelProps) {
  const classes = ["settings-panel", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {sections.map((section) => (
        <div
          key={section.id}
          className={
            section.danger
              ? "settings-section settings-danger"
              : "settings-section"
          }
        >
          <div className="settings-section-title">{section.title}</div>
          {section.rows.map((row) => (
            <div key={row.id} className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">{row.label}</div>
                {row.description != null && (
                  <div className="settings-row-desc">{row.description}</div>
                )}
              </div>
              <div className="settings-row-control">{row.control}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

SettingsPanel.displayName = "SettingsPanel";

export interface SettingsRowInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

/**
 * SettingsRowInput — champ texte étroit d'une ligne `<SettingsPanel>`.
 * Émet `.settings-row-input` (`forms.css:681-682`), distinct de `.input`
 * (`<Input>`) — largeur fixe 180px, propre à ce contexte.
 */
export const SettingsRowInput = forwardRef<
  HTMLInputElement,
  SettingsRowInputProps
>(function SettingsRowInput({ className, ...rest }, ref) {
  const classes = ["settings-row-input", className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...rest} />;
});
SettingsRowInput.displayName = "SettingsRowInput";

export interface SettingsRowSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

/**
 * SettingsRowSelect — liste déroulante d'une ligne `<SettingsPanel>`.
 * Émet `.settings-row-select` (`forms.css:683-684`), distinct de `.input`
 * (`<Select>`).
 */
export const SettingsRowSelect = forwardRef<
  HTMLSelectElement,
  SettingsRowSelectProps
>(function SettingsRowSelect({ className, children, ...rest }, ref) {
  const classes = ["settings-row-select", className]
    .filter(Boolean)
    .join(" ");
  return (
    <select ref={ref} className={classes} {...rest}>
      {children}
    </select>
  );
});
SettingsRowSelect.displayName = "SettingsRowSelect";
