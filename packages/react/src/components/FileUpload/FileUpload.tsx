import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";

/** Entrée de la liste contrôlée `.file-item` — cf. `files` prop. */
export interface FileUploadFileItem {
  /** Nom affiché — `.file-item-name`. */
  name: string;
  /** Taille formatée affichée — `.file-item-size`. Omis → pas de ligne taille. */
  size?: string;
  /** Progression 0-100 — pose `.progress-bar > .progress-fill` (largeur %). Omis → pas de barre. */
  progress?: number;
}

export interface FileUploadProps {
  /** Appelé avec les `File[]` sélectionnés — au drop OU à la sélection via l'input. */
  onFiles: (files: File[]) => void;
  /** Passthrough `accept` de l'input natif caché. */
  accept?: string;
  /** Passthrough `multiple` de l'input natif caché. */
  multiple?: boolean;
  /** Texte d'aide — `.file-upload-hint`. Omis → non rendu. */
  hint?: string;
  /** Libellé du lien "parcourir" — `.file-upload-browse`. @default "parcourir" */
  browseLabel?: string;
  /** Désactive la zone : pas de drag/clic actif, input natif désactivé. */
  disabled?: boolean;
  /** Classes additionnelles sur `.file-upload`. */
  className?: string;
  /** Liste contrôlée de fichiers déjà déposés — rendu `.file-list`/`.file-item`. Omis → pas de liste. */
  files?: FileUploadFileItem[];
  /** Appelé avec l'index cliqué au clic sur `.file-item-remove`. */
  onRemove?: (index: number) => void;
  /** id de l'input natif caché — sinon généré via `useId`. */
  id?: string;
}

/**
 * FileUpload — Zone de dépôt drag & drop du Design System msyx.fr
 * (`pages/formulaires.html` #file-upload, `shared/css/components/forms.css:61-74`).
 *
 * **Particularité** : le DS vanilla est 100% présentationnel — aucune fonction
 * JS n'existe dans `shared/components.js` pour ce composant (pas
 * d'`initFileUpload`). Le wrapper React ajoute donc TOUTE la logique
 * (input file caché, drag & drop, liste, suppression) tout en restant fidèle
 * au markup et aux classes DS.
 *
 * Émet le markup canonique :
 * ```html
 * <input type="file" hidden>
 * <div class="file-upload" role="button" tabindex="0" aria-label="...">
 *   <span class="file-upload-icon">...</span>
 *   <div class="file-upload-text">Déposez vos fichiers ici ou <span class="file-upload-browse">parcourir</span></div>
 *   <div class="file-upload-hint">...</div>
 * </div>
 * <div class="file-list">
 *   <div class="file-item">
 *     <span class="file-item-icon">...</span>
 *     <div class="file-item-info"><div class="file-item-name">...</div><div class="file-item-size">...</div></div>
 *     <div class="progress-bar"><div class="progress-fill" style="width:60%"></div></div>
 *     <button class="file-item-remove" aria-label="Supprimer ...">&times;</button>
 *   </div>
 * </div>
 * ```
 *
 * **État critique — `.dragover`** : la classe est définie dans le CSS
 * (`forms.css:62` : `.file-upload:hover, .file-upload.dragover { border-color:
 * var(--accent); ... }`) mais AUCUN JS vanilla ne l'ajoute (le composant est
 * purement statique côté DS). Sans implémentation explicite ici, le feedback
 * visuel du drag serait absent — piège équivalent à la classe `.open`
 * manquante d'`<ActionMenu>` (#612). Posée sur `dragEnter`/`dragOver`, retirée
 * sur `dragLeave` ET sur `drop`.
 *
 * **`.file-list`/`.file-item` contrôlés** : rendu uniquement depuis la prop
 * `files` (aucun état interne sur la liste — le parent pilote l'ajout/retrait,
 * comme `TagInput`). `.progress-fill` seulement si `progress` est défini ;
 * `.file-item-size` seulement si `size` est défini.
 *
 * **Ne rend jamais `.has-file`** : classe absente du DS (ni CSS ni HTML) —
 * volontairement non émise, non assertée.
 *
 * A11y : `.file-upload` porte `role="button"` + `tabIndex` (0, ou -1 si
 * `disabled`) + `aria-label` + gestion clavier Enter/Espace (déclenche
 * l'input caché, sibling — jamais un enfant, pour éviter la ré-entrance du
 * clic synthétique dans le handler du parent). `.file-item-remove` porte
 * `aria-label="Supprimer <nom>"`.
 *
 * SSR-safe : aucun accès à `document`/`window` hors des refs/handlers.
 */
export function FileUpload({
  onFiles,
  accept,
  multiple,
  hint,
  browseLabel = "parcourir",
  disabled,
  className,
  files,
  onRemove,
  id,
}: FileUploadProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDisabled = Boolean(disabled);

  function openPicker() {
    if (isDisabled) return;
    inputRef.current?.click();
  }

  function handleClick() {
    openPicker();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isDisabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isDisabled) return;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isDisabled) return;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    const dropped = Array.from(event.dataTransfer?.files ?? []);
    if (dropped.length > 0) onFiles(dropped);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) onFiles(selected);
    // Réinitialise pour permettre de re-sélectionner le(s) même(s) fichier(s).
    event.target.value = "";
  }

  const zoneClasses = ["file-upload", isDragging ? "dragover" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={isDisabled}
        onChange={handleInputChange}
      />
      <div
        className={zoneClasses}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={`Déposer des fichiers ou ${browseLabel}`}
        aria-disabled={isDisabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="file-upload-icon" aria-hidden="true">
          <svg className="icon" width={28} height={28}>
            <use href="/shared/icons/sprite.svg#i-upload" />
          </svg>
        </span>
        <div className="file-upload-text">
          Déposez vos fichiers ici ou{" "}
          <span className="file-upload-browse">{browseLabel}</span>
        </div>
        {hint && <div className="file-upload-hint">{hint}</div>}
      </div>
      {files && files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div className="file-item" key={`${file.name}-${index}`}>
              <span className="file-item-icon" aria-hidden="true">
                <svg className="icon" width={18} height={18}>
                  <use href="/shared/icons/sprite.svg#i-file" />
                </svg>
              </span>
              <div className="file-item-info">
                <div className="file-item-name">{file.name}</div>
                {file.size && <div className="file-item-size">{file.size}</div>}
              </div>
              {typeof file.progress === "number" && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}
              <button
                type="button"
                className="file-item-remove"
                aria-label={`Supprimer ${file.name}`}
                onClick={() => onRemove?.(index)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

FileUpload.displayName = "FileUpload";
