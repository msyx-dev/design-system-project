import { ReactNode, useEffect, useRef, useState } from "react";

export interface CommentItem {
  /** Identifiant unique — clé React, cible des callbacks. */
  id: string;
  /** Rendu dans `.comment-avatar` (initiales, image, etc.). */
  avatar: ReactNode;
  /** Nom affiché dans `.comment-author`. */
  author: string;
  /** Date déjà formatée (ex. "il y a 5 min"), affichée telle quelle dans `.comment-date`. */
  date: string;
  /** Contenu du commentaire, `.comment-text`. */
  text: string;
  /** Compteur de likes initial (`.like-count`). @default 0 */
  likeCount?: number;
  /** Réponses imbriquées, rendues dans `.comment-thread`. */
  replies?: CommentItem[];
}

export interface CommentsProps {
  /** Commentaires racine, dans l'ordre d'affichage. */
  comments: CommentItem[];
  /** Appelé quand un commentaire est liké/déliké (état visuel géré en interne). */
  onLike?: (id: string, liked: boolean) => void;
  /** Appelé à l'envoi d'une réponse non vide (le formulaire se ferme ensuite). */
  onReply?: (id: string, text: string) => void;
  /** @default "Répondre" */
  replyLabel?: string;
  /** @default "J'aime" */
  likeLabel?: string;
  /** @default "Votre réponse..." */
  replyPlaceholder?: string;
  /** @default "Envoyer" */
  submitLabel?: string;
  /** @default "Annuler" */
  cancelLabel?: string;
  /** Classes additionnelles sur le conteneur racine. */
  className?: string;
}

/** Construit l'index initial des compteurs de likes (parcours récursif, une fois au montage) — calque `collectExpanded` de `<TreeView>`. */
function collectLikeCounts(
  comments: CommentItem[],
  acc: Record<string, number>,
): Record<string, number> {
  for (const comment of comments) {
    acc[comment.id] = comment.likeCount ?? 0;
    if (comment.replies?.length) collectLikeCounts(comment.replies, acc);
  }
  return acc;
}

/**
 * Comments — Fil de commentaires avec réponses imbriquées du Design System
 * msyx.fr (`feedback.html` #comments, calque `initComments` —
 * `shared/components.js:5148-5188`).
 *
 * Émet le markup canonique `.comment` (`components/forms.css:691-711`) :
 * ```html
 * <div class="comment">
 *   <div class="comment-avatar">MS</div>
 *   <div class="comment-body">
 *     <div class="comment-header"><span class="comment-author">Mike</span><span class="comment-date">il y a 5 min</span></div>
 *     <div class="comment-text">…</div>
 *     <div class="comment-actions">
 *       <button class="comment-action-btn" aria-expanded="false">↩ Répondre</button>
 *       <button class="comment-action-btn active" aria-pressed="true">♡ <span class="like-count">4</span></button>
 *     </div>
 *     <div class="comment-reply-form open" aria-label="Formulaire de réponse">
 *       <textarea class="comment-reply-input" rows="2"></textarea>
 *       <button class="btn-primary btn-xs">Envoyer</button>
 *       <button class="btn-ghost btn-xs">Annuler</button>
 *     </div>
 *     <div class="comment-thread">…</div>
 *   </div>
 * </div>
 * ```
 *
 * **Non-contrôlé** (état visuel interne — like/ouverture du formulaire, comme
 * `<ActionMenu>`/`<Lightbox>`) : `onLike`/`onReply` sont des callbacks
 * d'observation/persistance, pas des props de contrôle. Récursif —
 * `comment.replies` alimente `.comment-thread`, imbrication illimitée.
 *
 * **Like (`.comment-action-btn.active` + `.like-count`)** : toggle
 * indépendant par commentaire, incrémente/décrémente le compteur — calque
 * exact `btn.classList.toggle('active'); countEl.textContent = active ? n+1
 * : Math.max(0, n-1)`. `aria-pressed` **ajouté** vs le vanilla (qui ne pose
 * que la classe) : bouton à bascule visuel, ajout ARIA sans classe — pas une
 * invention de contrat, juste l'état déjà présent rendu accessible.
 *
 * **Répondre (`.comment-reply-form.open`)** : toggle sur clic, focus posé
 * sur `.comment-reply-input` à l'ouverture (calque `inp.focus()`),
 * `aria-expanded` synchronisé sur le déclencheur. Le bouton `.btn-ghost`
 * (Annuler) ferme sans soumettre — calque exact
 * `.comment-reply-form .btn-ghost` du vanilla.
 *
 * **Bouton Envoyer — ajouté vs le vanilla** : `initComments` ne câble
 * **aucun** écouteur sur le bouton "Envoyer" (`.btn-primary.btn-xs` de la
 * démo, confirmé par lecture complète de la fonction — seul `.btn-ghost` est
 * lié) ; cliquer dessus dans le vanilla ne fait rigoureusement rien. Un
 * composant réutilisable a besoin d'un point de sortie pour le texte saisi :
 * le wrapper lit `.comment-reply-input.value` au clic, appelle `onReply(id,
 * text)` si non vide, vide le champ et referme le formulaire — divergence
 * documentée, pas un contrat vanilla existant.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans les handlers (post-hydratation).
 */
export function Comments({
  comments,
  onLike,
  onReply,
  replyLabel = "Répondre",
  likeLabel = "J'aime",
  replyPlaceholder = "Votre réponse...",
  submitLabel = "Envoyer",
  cancelLabel = "Annuler",
  className,
}: CommentsProps) {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() =>
    collectLikeCounts(comments, {}),
  );
  const [openReplyIds, setOpenReplyIds] = useState<Set<string>>(
    () => new Set(),
  );

  const pendingFocusIdRef = useRef<string | null>(null);
  const replyInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Focus le textarea de réponse au prochain rendu suivant une ouverture —
  // calque le pattern `pendingFocusIdRef` de `<Tabs>` (rAF non déterministe
  // évité, focus posé après le commit React qui a rendu le formulaire ouvert).
  useEffect(() => {
    const id = pendingFocusIdRef.current;
    if (id === null) return;
    pendingFocusIdRef.current = null;
    replyInputRefs.current.get(id)?.focus();
  });

  function toggleLike(id: string) {
    const nowLiked = !likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (nowLiked) next.add(id);
      else next.delete(id);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (nowLiked ? 1 : -1)),
    }));
    onLike?.(id, nowLiked);
  }

  function toggleReply(id: string) {
    setOpenReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        pendingFocusIdRef.current = id;
      }
      return next;
    });
  }

  function closeReply(id: string) {
    setOpenReplyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function submitReply(id: string) {
    const el = replyInputRefs.current.get(id);
    const text = el?.value.trim() ?? "";
    if (!text) return;
    onReply?.(id, text);
    if (el) el.value = "";
    closeReply(id);
  }

  function renderComment(comment: CommentItem): ReactNode {
    const liked = likedIds.has(comment.id);
    const count = likeCounts[comment.id] ?? 0;
    const replyOpen = openReplyIds.has(comment.id);

    return (
      <div className="comment" key={comment.id}>
        <div className="comment-avatar">{comment.avatar}</div>
        <div className="comment-body">
          <div className="comment-header">
            <span className="comment-author">{comment.author}</span>
            <span className="comment-date">{comment.date}</span>
          </div>
          <div className="comment-text">{comment.text}</div>
          <div className="comment-actions">
            <button
              type="button"
              className="comment-action-btn"
              aria-expanded={replyOpen}
              aria-label={replyLabel}
              onClick={() => toggleReply(comment.id)}
            >
              <span aria-hidden="true">&#8617;</span> {replyLabel}
            </button>
            <button
              type="button"
              className={["comment-action-btn", liked ? "active" : null]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={liked}
              aria-label={likeLabel}
              onClick={() => toggleLike(comment.id)}
            >
              <span aria-hidden="true">&#9825;</span>{" "}
              <span className="like-count">{count}</span>
            </button>
          </div>
          <div
            className={["comment-reply-form", replyOpen ? "open" : null]
              .filter(Boolean)
              .join(" ")}
            aria-label="Formulaire de réponse"
          >
            <textarea
              ref={(el) => {
                if (el) replyInputRefs.current.set(comment.id, el);
                else replyInputRefs.current.delete(comment.id);
              }}
              className="comment-reply-input"
              placeholder={replyPlaceholder}
              rows={2}
              aria-label={replyPlaceholder}
            />
            <button
              type="button"
              className="btn-primary btn-xs"
              onClick={() => submitReply(comment.id)}
            >
              {submitLabel}
            </button>
            <button
              type="button"
              className="btn-ghost btn-xs"
              onClick={() => closeReply(comment.id)}
            >
              {cancelLabel}
            </button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className="comment-thread">
              {comment.replies.map((reply) => renderComment(reply))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>{comments.map((c) => renderComment(c))}</div>
  );
}

Comments.displayName = "Comments";
