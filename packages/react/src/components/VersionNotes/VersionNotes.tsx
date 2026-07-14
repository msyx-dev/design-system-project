import { ReactNode, useId, useState } from "react";
import { Modal } from "../Modal/Modal";
import { VersionBadge } from "../VersionBadge/VersionBadge";

/**
 * Catégories de highlight — calque `VERSION_NOTE_CATEGORIES` (shared/nav.js:178)
 * et le mapping de statut #647. Type ouvert côté données : un `type` hors
 * énumération retombe sur un chip neutre (cf. `categoryMeta`).
 */
export type VersionNoteCategory =
  "nouveaute" | "amelioration" | "correction" | "securite";

export interface Highlight {
  /** Catégorie → chip `.badge badge-*` + libellé FR. */
  type: VersionNoteCategory;
  /** Texte du point saillant. */
  text: string;
}

export interface ReleaseNote {
  /** Version SemVer (ex. "2.97.0") — affichée `· v${version}`. */
  version: string;
  /** Date ISO `YYYY-MM-DD` — rendue via `<time dateTime>` + format FR. */
  date: string;
  /** Titre optionnel — rendu dans un `<h4>` UNIQUEMENT si présent. */
  titre?: string;
  /** Points saillants de la release. */
  highlights: Highlight[];
}

export interface VersionNotesProps {
  /** Version courante — passée à `VersionBadge` (pilote `.version-badge--new`). */
  latestVersion: string;
  /** Clé localStorage de la dernière version vue — passée à `VersionBadge`. */
  storageKey: string;
  /** Releases, la plus récente en tête (index 0 → `.timeline-item--latest`). */
  releases: ReleaseNote[];
  /** Highlights « À venir » — rend un `.timeline-item--upcoming` en tête si non vide. */
  next?: Highlight[];
  /** Sous-titre optionnel — rendu dans `.version-notes-sub` UNIQUEMENT si présent. */
  subtitle?: string;
  /** Classes additionnelles posées sur le badge `.version-badge`. */
  className?: string;
}

/** Métadonnées de catégorie → chip DS. Calque `VERSION_NOTE_CATEGORIES` (nav.js:178). */
const CATEGORY_META: Record<
  VersionNoteCategory,
  { label: string; chipClass: string }
> = {
  nouveaute: { label: "Nouveauté", chipClass: "badge badge-success" },
  amelioration: { label: "Amélioration", chipClass: "badge badge-info" },
  correction: { label: "Correction", chipClass: "badge badge-warning" },
  securite: { label: "Sécurité", chipClass: "badge badge-danger" },
};

/** Résout un `type` (potentiellement hors énumération, données runtime) → chip. */
function categoryMeta(type: string): { label: string; chipClass: string } {
  return (
    CATEGORY_META[type as VersionNoteCategory] ?? {
      label: type,
      chipClass: "badge badge-neutral",
    }
  );
}

/** Format date FR — calque `formatVersionNoteDate` (nav.js:170). SSR-safe (try/catch). */
function formatDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Rend la liste `<li>` de highlights (chip catégorie + texte). */
function renderHighlights(highlights: Highlight[]): ReactNode {
  return highlights.map((h, i) => {
    const meta = categoryMeta(h.type);
    return (
      // eslint-disable-next-line react/no-array-index-key
      <li key={i}>
        {meta.label && <span className={meta.chipClass}>{meta.label}</span>}{" "}
        {h.text}
      </li>
    );
  });
}

/**
 * VersionNotes — Notes de version *data-driven* du Design System msyx.fr
 * (`overlays.html` #version-notes, calque `renderVersionNotesTimeline` /
 * `renderVersionNotesUpcoming`, `shared/nav.js:187-221`).
 *
 * **Data-driven** : le consumer passe `releases` (+ `next` optionnel) ; le
 * composant rend l'intégralité badge + modale + timeline — plus aucun markup
 * timeline à écrire côté app (objectif cap-transfo #355).
 *
 * **Composition, pas duplication** :
 * - le badge = `<VersionBadge>` (localStorage `.version-badge--new`, SSR-safe,
 *   aria-label augmenté) — hérité tel quel, `onOpen` ouvre la modale interne ;
 * - la modale = `<Modal className="version-notes-dialog">` (focus restore
 *   WAI-APG, ESC/backdrop) — jamais re-wrappée.
 *
 * **Seul état interne** : `open` (booléen d'ouverture de la modale). Le suivi
 * « version vue » reste dans `<VersionBadge>`.
 *
 * SSR-safe : aucun accès `window`/`localStorage` hors des `useEffect`/handlers
 * de `<VersionBadge>`/`<Modal>` ; `useId()` pour l'id de titre a11y.
 */
export function VersionNotes({
  latestVersion,
  storageKey,
  releases,
  next,
  subtitle,
  className,
}: VersionNotesProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const hasUpcoming = Array.isArray(next) && next.length > 0;

  return (
    <>
      <VersionBadge
        version={latestVersion}
        storageKey={storageKey}
        className={className}
        onOpen={() => setOpen(true)}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        className="version-notes-dialog"
        aria-labelledby={titleId}
        title={
          <h3 className="modal-title" id={titleId}>
            Notes de version
          </h3>
        }
      >
        <div className="version-notes">
          {subtitle && <p className="version-notes-sub">{subtitle}</p>}
          <ol className="timeline">
            {hasUpcoming && (
              <li className="timeline-item timeline-item--upcoming">
                <div className="timeline-dot" aria-hidden="true" />
                <div className="timeline-content">
                  <div className="timeline-date">À venir</div>
                  <ul>{renderHighlights(next ?? [])}</ul>
                </div>
              </li>
            )}
            {releases.map((rel, i) => {
              const isLatest = i === 0;
              return (
                <li
                  key={rel.version}
                  className={
                    isLatest
                      ? "timeline-item timeline-item--latest"
                      : "timeline-item"
                  }
                >
                  <div className="timeline-dot" aria-hidden="true" />
                  <div className="timeline-content">
                    <div className="timeline-date">
                      <time dateTime={rel.date}>{formatDate(rel.date)}</time>
                      {" · v"}
                      {rel.version}
                    </div>
                    {rel.titre && (
                      <h4>
                        {rel.titre}
                        {isLatest && (
                          <>
                            {" "}
                            <span className="badge badge-success">Nouveau</span>
                          </>
                        )}
                      </h4>
                    )}
                    <ul>{renderHighlights(rel.highlights)}</ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Modal>
    </>
  );
}

VersionNotes.displayName = "VersionNotes";
