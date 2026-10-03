import { Fragment } from "react";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";

export interface TableCardsColumn<T> {
  /** Clé React de `<th>`/`<td>` et accès par défaut `row[key]`. */
  key: string;
  /**
   * Texte de l'en-tête de colonne ET du libellé de carte. `string`, jamais
   * `ReactNode` (contrairement à `DataGrid`) : il est rendu deux fois, dont
   * une en `aria-hidden` — un contenu interactif dupliqué dans une zone
   * `aria-hidden` serait focusable sans être annoncé.
   */
  header: string;
  /** Rendu de cellule. @default `String(row[key] ?? "")` */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Pas de libellé visible en mode cartes. @default false */
  hideLabel?: boolean;
  /** Cellule d'actions (`.table-cards-actions`) ; implique `hideLabel`. @default false */
  actions?: boolean;
}

export interface TableCardsProps<T> {
  columns: TableCardsColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** `<caption>` du tableau (nom accessible). */
  caption?: ReactNode;
  /** Nom accessible du tableau quand il n'y a pas de `caption`. */
  "aria-label"?: string;
  /** Contenu de la ligne unique quand `rows` est vide. @default "Aucun résultat" */
  emptyLabel?: ReactNode;
  /** Classes additionnelles sur `.table-wrap`. */
  className?: string;
  /**
   * Attributs par ligne (point d'extension : état d'erreur, `aria-describedby`…).
   * `role` reste `"row"` : posé après le spread, il n'est pas écrasable.
   */
  getRowProps?: (
    row: T,
    rowIndex: number,
  ) => HTMLAttributes<HTMLTableRowElement>;
  /**
   * Contenu de `<tfoot role="rowgroup">` : des `<tr role="row">` de
   * `<TableCardsCell>` (point d'extension : ligne d'ajout). Absent → pas de
   * `<tfoot>`.
   */
  footer?: ReactNode;
  /**
   * Tableau de saisie : ajoute `.table-cards--editable` sur le `<table>`
   * (cibles 44 px, alignement haut, messages d'erreur sans effet sur les
   * colonnes ; `tables.css` bloc TABLE CARDS — SAISIE, #1008). Une classe de
   * modificateur se pose sur le bloc `<table>`, pas sur `.table-wrap` : d'où une
   * prop dédiée plutôt que `className`. @default false
   */
  editable?: boolean;
  /**
   * Rend une ligne du corps à la place du rendu par colonnes : doit renvoyer un
   * `<tr role="row">` de `<TableCardsCell>`, typiquement un composant de ligne
   * qui porte son propre état (un `useActionState` par ligne est impossible dans
   * un rendu de cellule appelé par `TableCards`). La clé React est
   * `getRowKey(row, i)`, posée par `TableCards` : ne pas la poser dans le `<tr>`.
   *
   * Avec `renderRow`, `columns[].render`, `hideLabel`, `actions` et `getRowProps`
   * sont IGNORÉS pour le corps ; `columns` reste la source du `<thead>` et du
   * `colSpan` de la ligne vide.
   */
  renderRow?: (row: T, rowIndex: number) => ReactNode;
}

export interface TableCardsCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Libellé de carte, rendu en `<span class="table-cards-label"
   * aria-hidden="true">` en premier enfant. Absent → aucun libellé.
   */
  label?: string;
  /** Cellule d'actions : ajoute `.table-cards-actions`, ignore `label`. @default false */
  actions?: boolean;
  /**
   * Erreur de la ligne qui ne concerne aucun champ (échec d'une action : retrait
   * refusé…). Rendue APRÈS les enfants : `<p class="table-cards-error"
   * role="alert">`. Absent, `null` ou vide → rien. Une erreur de CHAMP passe par
   * `<Input error>`, pas par ici. À poser sur la cellule d'actions : l'erreur
   * suit les boutons.
   */
  error?: ReactNode;
}

/**
 * TableCardsCell — cellule de `TableCards` (`<td role="cell">`).
 *
 * Sert au corps du tableau (via `TableCards`) ET aux lignes du `<tfoot>` que le
 * consommateur compose lui-même (`footer`) : un seul chemin de rendu pour le
 * libellé de carte. `role="cell"` est posé AVANT le spread, un consommateur qui
 * en a besoin d'un autre le surcharge sous sa responsabilité.
 */
export function TableCardsCell({
  label,
  actions = false,
  error,
  className,
  children,
  ...rest
}: TableCardsCellProps) {
  const classes =
    [actions ? "table-cards-actions" : null, className]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <td role="cell" {...rest} className={classes}>
      {!actions && label ? (
        <span className="table-cards-label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      {children}
      {error ? (
        <p className="table-cards-error" role="alert">
          {error}
        </p>
      ) : null}
    </td>
  );
}

function defaultCellValue<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined ? "" : String(value);
}

/**
 * TableCards — tableau qui se replie en cartes (`data.html` #table-cards, CSS
 * `components/tables.css` bloc TABLE CARDS, #1007).
 *
 * Sous 768 px (`--bp-md`) chaque ligne devient une carte et chaque cellule
 * affiche son libellé ; au-delà, tableau classique. CSS seul, aucun état, aucun
 * tri : le consommateur passe des `rows` déjà triées/filtrées et compose
 * `<Pagination>` à côté si besoin. Pour un tableau triable ou filtrable, utiliser
 * `DataGrid` (qui défile horizontalement sur mobile, inchangé).
 *
 * Émet le markup canonique, identique à la démo vanilla :
 * ```html
 * <div class="table-wrap">
 *   <table class="table-cards" role="table" aria-label="…">
 *     <caption>…</caption>                      <!-- si caption -->
 *     <thead role="rowgroup">
 *       <tr role="row"><th scope="col" role="columnheader">Nom</th>…</tr>
 *     </thead>
 *     <tbody role="rowgroup">
 *       <tr role="row">
 *         <td role="cell"><span class="table-cards-label" aria-hidden="true">Nom</span>Alice</td>
 *         <td role="cell" class="table-cards-actions">…</td>   <!-- sans libellé -->
 *       </tr>
 *     </tbody>
 *     <tfoot role="rowgroup">…</tfoot>          <!-- si footer -->
 *   </table>
 * </div>
 * ```
 *
 * **Pourquoi un nœud `aria-hidden` et pas `td::before { content: … }`** : le
 * contenu généré par CSS entre dans le nom accessible de la cellule, annoncé
 * alors deux fois (« Nom, Nom Alice »). Le `<thead>`, masqué visuellement par le
 * CSS (déclarations de `.sr-only`), reste lu : c'est lui le canal accessible, le
 * libellé visible n'est qu'un doublon de présentation.
 *
 * **Rôles ARIA explicites** : certains moteurs abandonnent la sémantique de
 * tableau quand `display` change. `role="row"` de `<tr>` n'est pas écrasable via
 * `getRowProps`.
 *
 * Aucune donnée consommateur n'est jamais injectée en HTML brut : tout passe par
 * des nœuds React (texte échappé par construction).
 *
 * ## Tableau de saisie (`editable` + `renderRow`, #1008)
 *
 * Champs et boutons en cellule, une ligne = un enregistrement. Un `<form>` ne
 * peut pas envelopper un `<tr>` (le parseur HTML le sort du tableau) : le
 * formulaire de la ligne est un `<form id hidden>` VIDE (champs cachés
 * seulement) dans la cellule d'actions ; champs et boutons d'envoi s'y
 * rattachent par `form="<id>"`. Mesuré en navigateur : `form.elements`,
 * `FormData`, validation native et touche Entrée sont limités à la ligne, et
 * l'ordre de tabulation reste Nom → E-mail → actions → ligne suivante.
 *
 * ```tsx
 * function LigneParticipant({ p }: { p: Participant }) {
 *   const formId = `participant-${p.id}`, retraitId = `retrait-${p.id}`;
 *   const [modif, actionModif, modifEnCours] = useActionState(modifierParticipantAction, {});
 *   const [retrait, actionRetrait, retraitEnCours] = useActionState(retirerParticipantAction, {});
 *   return (
 *     <tr role="row">
 *       <TableCardsCell label="Nom">
 *         <Input form={formId} name="name" defaultValue={p.name} required aria-label={`Nom de ${p.name}`} />
 *       </TableCardsCell>
 *       <TableCardsCell label="E-mail">
 *         <Input form={formId} name="email" type="email" defaultValue={p.email} required
 *                aria-label={`E-mail de ${p.name}`} error={modif.erreur} />
 *       </TableCardsCell>
 *       <TableCardsCell actions error={retrait.erreur}>
 *         <form id={formId} action={actionModif} hidden><input type="hidden" name="participantId" value={p.id} /></form>
 *         <form id={retraitId} action={actionRetrait} hidden><input type="hidden" name="participantId" value={p.id} /></form>
 *         <Button type="submit" form={formId} variant="secondary" size="sm" loading={modifEnCours}
 *                 aria-label={`Enregistrer ${p.name}`}>Enregistrer</Button>
 *         <Button type="submit" form={retraitId} variant="danger" size="sm" loading={retraitEnCours}
 *                 aria-label={`Retirer ${p.name}`}>Retirer</Button>
 *       </TableCardsCell>
 *     </tr>
 *   );
 * }
 *
 * <TableCards editable aria-label="Participants" rows={participants} getRowKey={(p) => p.id}
 *   columns={[{ key: "name", header: "Nom" }, { key: "email", header: "E-mail" },
 *             { key: "actions", header: "Actions", actions: true }]}
 *   renderRow={(p) => <LigneParticipant p={p} />}
 *   footer={<NouveauParticipantRow />} /> // <tr role="row" className="table-cards-add-row">…
 * ```
 *
 * Règles de câblage (à la charge du consommateur, le DS n'en fait aucune) :
 * - **Nom accessible** d'un champ = en-tête de colonne + identité enregistrée de
 *   la ligne (« Nom de Alice Martin »), unique dans le tableau et commençant par
 *   l'en-tête (WCAG 2.5.3 : le libellé de carte est `aria-hidden`). Ligne
 *   d'ajout : « Nom du nouveau participant ». Boutons : texte visible + identité.
 * - **Aucun champ nommé** `id`, `action`, `method`, `submit`, `reset` ni
 *   `elements` : il masque la propriété homonyme de `form` (`form.id` renverrait
 *   l'`<input>`).
 * - **Erreur de champ** : `<Input error>` (sous le champ, déjà relié par
 *   `aria-invalid` / `aria-describedby`). **Erreur sans champ** : `error` de la
 *   cellule d'actions (`role="alert"`, après les boutons).
 * - **`useFormStatus` ne voit pas** un bouton rattaché par `form=` (il lit
 *   l'ancêtre `<form>` React) : utiliser le `isPending` de `useActionState`.
 * - **Après un envoi refusé**, déplacer le focus sur le premier champ en erreur
 *   de la ligne (`Input` transmet `ref`) : l'annonce du message passe par le
 *   focus, `.input-error-msg` n'est volontairement pas un `role="alert"`.
 * - **`useFormValidation` n'est pas utilisable** pour un formulaire de ligne
 *   (ses champs sont hors du `<form>`) ; la validation native (`required`,
 *   `type="email"`) s'applique, limitée à la ligne.
 * - Ligne d'ajout : `<tr role="row" className="table-cards-add-row">` dans
 *   `footer` (fond teinté et bordure pointillée fournis par le CSS).
 */
export function TableCards<T>({
  columns,
  rows,
  getRowKey,
  caption,
  "aria-label": ariaLabel,
  emptyLabel = "Aucun résultat",
  className,
  getRowProps,
  footer,
  editable = false,
  renderRow,
}: TableCardsProps<T>) {
  const rootClasses = ["table-wrap", className].filter(Boolean).join(" ");
  // Classes en chaînes LITTÉRALES (jamais un gabarit `${}`) : le scanner
  // `extractReactClasses` de generate-registry.js doit voir `table-cards--editable`.
  const tableClasses = editable
    ? "table-cards table-cards--editable"
    : "table-cards";
  return (
    <div className={rootClasses}>
      <table className={tableClasses} role="table" aria-label={ariaLabel}>
        {caption ? <caption>{caption}</caption> : null}
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((column) => (
              <th key={column.key} scope="col" role="columnheader">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.length === 0 ? (
            <tr role="row">
              <TableCardsCell colSpan={columns.length}>
                {emptyLabel}
              </TableCardsCell>
            </tr>
          ) : (
            rows.map((row, rowIndex) =>
              renderRow ? (
                <Fragment key={getRowKey(row, rowIndex)}>
                  {renderRow(row, rowIndex)}
                </Fragment>
              ) : (
                <tr
                  key={getRowKey(row, rowIndex)}
                  {...getRowProps?.(row, rowIndex)}
                  role="row"
                >
                  {columns.map((column) => (
                    <TableCardsCell
                      key={column.key}
                      actions={column.actions}
                      label={
                        column.hideLabel || column.actions
                          ? undefined
                          : column.header
                      }
                    >
                      {column.render
                        ? column.render(row, rowIndex)
                        : defaultCellValue(row, column.key)}
                    </TableCardsCell>
                  ))}
                </tr>
              ),
            )
          )}
        </tbody>
        {footer ? <tfoot role="rowgroup">{footer}</tfoot> : null}
      </table>
    </div>
  );
}
