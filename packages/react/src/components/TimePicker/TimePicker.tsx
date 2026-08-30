import { useState } from "react";
import { NumberInput } from "../NumberInput/NumberInput";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";

export type TimePickerFormat = "24" | "12";
export type TimePickerPeriod = "AM" | "PM";

export interface TimePickerProps {
  /** Format horaire — 24h (`hh` 0-23) ou 12h AM/PM (`hh` 1-12). @default "24" */
  format?: TimePickerFormat;
  /**
   * Valeur courante — mode **contrôlé**. Chaîne formatée `"HH:MM"` (24h) ou
   * `"HH:MM AM|PM"` (12h), calque exact de `sync()` du vanilla
   * (`shared/components.js:5444-5455`).
   */
  value?: string | null;
  /**
   * Valeur initiale — mode **non contrôlé** (ignorée si `value` est fourni).
   * Même format que `value`. @default "00:00" (24h) / "01:00 AM" (12h)
   */
  defaultValue?: string | null;
  /**
   * Appelé avec la NOUVELLE valeur formatée à chaque changement (heure, minute
   * ou bascule AM/PM). **Chaîne vide quand l'heure n'est pas renseignée**
   * (#860) — distinguable d'une heure valide, et de minuit (`"00:00"`).
   */
  onChange?: (value: string) => void;
  /**
   * Affiche un bouton « Effacer » qui remet l'heure à l'état non renseigné
   * (#860). Opt-in : sans lui, aucun markup existant ne change. Requis dès que
   * l'heure est **facultative** — sans effacement, elle devient obligatoire à
   * la première saisie.
   */
  clearable?: boolean;
  /** Libellé du bouton d'effacement. @default "Effacer" */
  clearLabel?: string;
  /** Pas d'incrément/décrément des minutes. @default 5 (aligné démo DS, `formulaires.html:428`) */
  minuteStep?: number;
  /** `aria-label` du champ heures. @default "Heures" (libellé exact du vanilla) */
  hourLabel?: string;
  /** `aria-label` du champ minutes. @default "Minutes" (libellé exact du vanilla) */
  minuteLabel?: string;
  /** `aria-label` du groupe AM/PM (`role="radiogroup"`). @default "AM ou PM" (libellé exact du vanilla) */
  periodLabel?: string;
  /** Classes additionnelles sur `.time-input-wrap` (racine). */
  className?: string;
  /** id posé sur la racine. */
  id?: string;
}

interface TimeParts {
  /** `null` = champ vide (#860) — « non renseigné », pas 0. */
  hours: number | null;
  minutes: number | null;
  period: TimePickerPeriod;
}

/** Bornes de l'heure selon le format — calque exact des démos (`formulaires.html:422,442`). */
function hourBounds(format: TimePickerFormat): [number, number] {
  return format === "12" ? [1, 12] : [0, 23];
}

/** Bornes pures — PAS de wrap-around (calque exact de `clamp()` vanilla, `components.js:5471-5473` : `Math.min(max, Math.max(min, val))`). 23h+1 reste 23, 55min+5 reste 59 (jamais 0). */
function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultParts(format: TimePickerFormat): TimeParts {
  const [minHour] = hourBounds(format);
  return { hours: minHour, minutes: 0, period: "AM" };
}

const TIME_VALUE_RE = /^(\d{1,2}):(\d{1,2})(?:\s+(AM|PM))?$/i;

/** Heure absente (#860) — `null`/`""` en entrée, `""` en sortie. */
const EMPTY_PARTS: TimeParts = { hours: null, minutes: null, period: "AM" };

/** Parse tolérant — `null`/`""` donnent l'heure VIDE (#860) ; `undefined` ou une chaîne invalide retombent sur `defaultParts()`, bornes toujours respectées. */
function parseTimeValue(
  raw: string | null | undefined,
  format: TimePickerFormat,
): TimeParts {
  const fallback = defaultParts(format);
  // Distinction volontaire : `undefined` = « rien de fourni » (défaut
  // historique), `null`/`""` = « explicitement vide ».
  if (raw === null || raw === "") return EMPTY_PARTS;
  if (!raw) return fallback;
  const match = TIME_VALUE_RE.exec(raw.trim());
  if (!match) return fallback;
  const [minHour, maxHour] = hourBounds(format);
  const hours = clampInt(parseInt(match[1], 10) || 0, minHour, maxHour);
  const minutes = clampInt(parseInt(match[2], 10) || 0, 0, 59);
  const period: TimePickerPeriod =
    match[3]?.toUpperCase() === "PM" ? "PM" : "AM";
  return { hours, minutes, period };
}

/** Calque exact de `sync()` (`components.js:5444-5449`) : `padStart(2,'0')` sur la valeur brute, pas de conversion 12h→24h. */
function formatTimeValue(parts: TimeParts, format: TimePickerFormat): string {
  // Une heure INCOMPLÈTE est une heure absente : « 08:__ » ne forme aucune
  // valeur, et compléter le champ manquant par 0 inventerait une donnée que
  // l'utilisateur n'a pas saisie (#860). Calque exact du vanilla.
  if (parts.hours === null || parts.minutes === null) return "";
  const hh = String(parts.hours).padStart(2, "0");
  const mm = String(parts.minutes).padStart(2, "0");
  return format === "12" ? `${hh}:${mm} ${parts.period}` : `${hh}:${mm}`;
}

/**
 * TimePicker — Sélecteur d'heure 24h/12h du Design System msyx.fr
 * (`formulaires.html` #time-picker "Time picker", calque `initTimePicker` —
 * `shared/components.js:5427-5538`).
 *
 * Émet le markup canonique `.time-input-wrap` / `.time-sep`
 * (`components/templates.css:125-127`) :
 * ```html
 * <div class="time-input-wrap" data-time data-format="24|12">
 *   <div data-time-part="hh"><NumberInput .../></div>
 *   <span class="time-sep">:</span>
 *   <div data-time-part="mm"><NumberInput .../></div>
 *   <!-- 12h uniquement -->
 *   <SegmentedControl .../>
 * </div>
 * ```
 *
 * **Composition, pas réimplémentation** : les steppers heures/minutes sont
 * `<NumberInput>` et le groupe AM/PM est `<SegmentedControl>` (tous deux déjà
 * portés dans le package) — aucune logique de clamp/step/ARIA dupliquée ici.
 *
 * **Écarts de composition documentés (aucun contournement silencieux)** :
 * - `<NumberInput>` n'expose pas de passthrough `data-*` sur son propre
 *   `.number-input-wrap` (racine fixe). Pour conserver le sélecteur
 *   `[data-time-part="hh"|"mm"]` de la structure DS réelle, chaque
 *   `<NumberInput>` est enveloppé dans un `<div data-time-part>` SANS classe
 *   ni style — transparent pour `.time-input-wrap .number-input-wrap { width: auto }`
 *   (sélecteur descendant, `templates.css:127`) et pour le layout flex du
 *   parent (un flex-item block se comporte identiquement à l'enfant direct).
 * - `<NumberInput>` pose des `aria-label` **génériques et non paramétrables**
 *   sur ses boutons +/- (`"Diminuer"`/`"Augmenter"`, littéraux en dur) là où
 *   le vanilla les qualifie par champ (`"Diminuer les heures"`,
 *   `"Augmenter les minutes"`). Les `aria-label` des CHAMPS (les `<input>`,
 *   via `hourLabel`/`minuteLabel`) sont eux fidèles au vanilla. Étendre
 *   `<NumberInput>` pour paramétrer les boutons est hors périmètre de ce
 *   ticket (composant partagé par ~10 autres consumers) — signalé tel quel.
 * - `<SegmentedControl>` n'expose pas de `data-*` par option : les boutons
 *   `data-ampm="AM"|"PM"` du vanilla n'ont pas d'équivalent React (cibler
 *   plutôt `role="radio"` + libellé ou `aria-checked`).
 * - `<SegmentedControl>` rend toujours un `.segmented-indicator` (pastille
 *   glissante). Le vanilla time-picker en est dépourvu — `initTimePicker`
 *   gère l'ARIA du groupe AM/PM À LA MAIN précisément parce que
 *   `initSegmentedControls` **saute** les instances sans indicateur
 *   (commentaire `components.js:5502-5504`). Additif et purement décoratif
 *   (`aria-hidden`, aucune classe/attribut supprimé) : `.segmented-item.active`
 *   + `aria-checked` + roving tabindex restent identiques bit-à-bit à la
 *   logique manuelle du vanilla. Documenté plutôt que masqué.
 *
 * **Bornes — PAS de wrap-around** (vérifié dans le code vanilla, pas deviné) :
 * `clamp()` (`components.js:5471-5473`) est un simple
 * `Math.min(max, Math.max(min, val))`. 23h+1 → reste **23** (pas 0h) ;
 * 55min+5 (step 5) → reste **59** (pas 0, pas de report sur les heures).
 * `<NumberInput>` republique ce même clamp — aucune divergence.
 *
 * **Contrôlé/non-contrôlé** : `value`/`onChange` vs `defaultValue`,
 * convention alignée sur `<SplitPane ratio/defaultRatio>`. `value` est
 * re-parsée à chaque rendu (pas d'état interne dupliqué en mode contrôlé) ;
 * `defaultValue` amorce l'état interne UNE SEULE fois (`useState` lazy).
 * Contrairement au vanilla qui appelle `sync()` une fois au montage
 * (écriture initiale de `data-target`), le wrapper React n'appelle
 * `onChange` qu'après une interaction utilisateur — le consumer connaît déjà
 * la valeur initiale via `value`/`defaultValue` (convention du package,
 * aucun autre composant ne fire son callback au montage).
 *
 * **Format de sortie** : `HH:MM` (24h) ou `HH:MM AM|PM` (12h), zero-padded
 * sur la valeur BRUTE de l'heure (`padStart(2,'0')`, pas de conversion —
 * en 12h l'heure reste 1-12, calque exact de `sync()`).
 *
 * **Changement de `format` à chaud (non contrôlé)** : l'heure affichée est
 * re-bornée défensivement à chaque rendu (`clampInt` sur les bornes du
 * format courant) sans réécrire l'état interne — évite un affichage hors
 * bornes si `format` change (ex. 24→12) alors que l'état interne datait de
 * l'ancien format ; la prochaine interaction re-committe une valeur propre.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export function TimePicker({
  format = "24",
  value,
  defaultValue,
  onChange,
  clearable,
  clearLabel = "Effacer",
  minuteStep = 5,
  hourLabel = "Heures",
  minuteLabel = "Minutes",
  periodLabel = "AM ou PM",
  className,
  id,
}: TimePickerProps) {
  const isControlled = value !== undefined;

  const [internalParts, setInternalParts] = useState<TimeParts>(() =>
    parseTimeValue(defaultValue, format),
  );

  const rawParts = isControlled ? parseTimeValue(value, format) : internalParts;

  const [minHour, maxHour] = hourBounds(format);
  const parts: TimeParts = {
    ...rawParts,
    hours:
      rawParts.hours === null
        ? null
        : clampInt(rawParts.hours, minHour, maxHour),
  };

  function commit(next: TimeParts): void {
    if (!isControlled) setInternalParts(next);
    onChange?.(formatTimeValue(next, format));
  }

  const wrapClasses = ["time-input-wrap", className].filter(Boolean).join(" ");

  return (
    <div id={id} className={wrapClasses} data-time="" data-format={format}>
      <div data-time-part="hh">
        <NumberInput
          value={parts.hours}
          onChange={(hours) => commit({ ...parts, hours })}
          onEmpty={() => commit({ ...parts, hours: null })}
          min={minHour}
          max={maxHour}
          label={hourLabel}
        />
      </div>
      <span className="time-sep">:</span>
      <div data-time-part="mm">
        <NumberInput
          value={parts.minutes}
          onChange={(minutes) => commit({ ...parts, minutes })}
          onEmpty={() => commit({ ...parts, minutes: null })}
          min={0}
          max={59}
          step={minuteStep}
          label={minuteLabel}
        />
      </div>
      {format === "12" && (
        <SegmentedControl
          options={[
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
          ]}
          value={parts.period}
          onChange={(period) =>
            commit({ ...parts, period: period as TimePickerPeriod })
          }
          label={periodLabel}
        />
      )}
      {clearable && (
        <button
          type="button"
          className="btn-ghost btn-sm"
          data-time-clear=""
          onClick={() => commit(EMPTY_PARTS)}
          disabled={parts.hours === null && parts.minutes === null}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

TimePicker.displayName = "TimePicker";
