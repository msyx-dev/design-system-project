import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Comments, CommentItem } from "./Comments";

afterEach(() => {
  cleanup();
});

const COMMENTS: CommentItem[] = [
  {
    id: "c1",
    avatar: "MS",
    author: "Mike",
    date: "il y a 5 min",
    text: "Super implementation !",
    likeCount: 3,
    replies: [
      {
        id: "c1-r1",
        avatar: "CB",
        author: "Claude",
        date: "il y a 2 min",
        text: "Merci !",
        likeCount: 1,
      },
    ],
  },
  {
    id: "c2",
    avatar: "AB",
    author: "Alice",
    date: "hier",
    text: "Question sur le skeleton.",
  },
];

describe("Comments — structure", () => {
  it("rend un .comment par commentaire racine + réponses imbriquées dans .comment-thread", () => {
    render(<Comments comments={COMMENTS} />);
    expect(document.querySelectorAll(".comment")).toHaveLength(3); // 2 racines + 1 réponse
    const thread = document.querySelector(".comment-thread");
    expect(thread).toBeInTheDocument();
    expect(thread?.querySelectorAll(".comment")).toHaveLength(1);
  });

  it("affiche author/date/text/likeCount initial", () => {
    render(<Comments comments={COMMENTS} />);
    expect(screen.getByText("Mike")).toBeInTheDocument();
    expect(screen.getByText("il y a 5 min")).toBeInTheDocument();
    expect(screen.getByText("Super implementation !")).toBeInTheDocument();
    expect(document.querySelector(".like-count")).toHaveTextContent("3");
  });

  it("likeCount absent → compteur à 0", () => {
    render(<Comments comments={COMMENTS} />);
    const alice = screen.getByText("Alice").closest(".comment");
    expect(alice?.querySelector(".like-count")).toHaveTextContent("0");
  });
});

describe("Comments — like (.active + .like-count)", () => {
  it("clic sur J'aime bascule .active, incrémente le compteur, et appelle onLike", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<Comments comments={COMMENTS} onLike={onLike} />);

    const likeBtn = document.querySelector(
      '[aria-label="J\'aime"]',
    ) as HTMLElement;
    expect(likeBtn).not.toHaveClass("active");
    expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(likeBtn);
    expect(likeBtn).toHaveClass("comment-action-btn", "active");
    expect(likeBtn).toHaveAttribute("aria-pressed", "true");
    expect(likeBtn.querySelector(".like-count")).toHaveTextContent("4");
    expect(onLike).toHaveBeenCalledWith("c1", true);

    await user.click(likeBtn);
    expect(likeBtn).not.toHaveClass("active");
    expect(likeBtn.querySelector(".like-count")).toHaveTextContent("3");
    expect(onLike).toHaveBeenCalledWith("c1", false);
  });

  it("le compteur ne descend jamais sous 0", async () => {
    const user = userEvent.setup();
    render(
      <Comments
        comments={[
          {
            id: "z",
            avatar: "Z",
            author: "Z",
            date: "-",
            text: "-",
            likeCount: 0,
          },
        ]}
      />,
    );
    const likeBtn = document.querySelector(
      '[aria-label="J\'aime"]',
    ) as HTMLElement;
    // Un seul clic amène à 1 (like), pas de scénario de démultiplication —
    // vérifie juste que le plancher est respecté après un cycle complet.
    await user.click(likeBtn);
    await user.click(likeBtn);
    expect(likeBtn.querySelector(".like-count")).toHaveTextContent("0");
  });

  it("liker une réponse imbriquée n'affecte pas le compteur du parent", async () => {
    const user = userEvent.setup();
    render(<Comments comments={COMMENTS} />);
    const replyLikeBtn = document
      .querySelector(".comment-thread .comment")
      ?.querySelector('[aria-label="J\'aime"]') as HTMLElement;
    await user.click(replyLikeBtn);
    expect(replyLikeBtn.querySelector(".like-count")).toHaveTextContent("2");

    const rootLikeBtn = document.querySelectorAll(
      '[aria-label="J\'aime"]',
    )[0] as HTMLElement;
    expect(rootLikeBtn.querySelector(".like-count")).toHaveTextContent("3");
  });
});

describe("Comments — répondre (.comment-reply-form.open)", () => {
  it("clic sur Répondre ouvre le formulaire, met aria-expanded=true, et focus le textarea", async () => {
    const user = userEvent.setup();
    render(<Comments comments={COMMENTS} />);
    const replyBtn = document.querySelector(
      '[aria-label="Répondre"]',
    ) as HTMLElement;
    expect(replyBtn).toHaveAttribute("aria-expanded", "false");

    const form = replyBtn
      .closest(".comment-body")
      ?.querySelector(".comment-reply-form") as HTMLElement;
    expect(form).not.toHaveClass("open");

    await user.click(replyBtn);
    expect(form).toHaveClass("comment-reply-form", "open");
    expect(replyBtn).toHaveAttribute("aria-expanded", "true");
    expect(form.querySelector(".comment-reply-input")).toHaveFocus();
  });

  it("re-clic sur Répondre referme le formulaire (toggle)", async () => {
    const user = userEvent.setup();
    render(<Comments comments={COMMENTS} />);
    const replyBtn = document.querySelector(
      '[aria-label="Répondre"]',
    ) as HTMLElement;
    await user.click(replyBtn);
    await user.click(replyBtn);
    const form = replyBtn
      .closest(".comment-body")
      ?.querySelector(".comment-reply-form");
    expect(form).not.toHaveClass("open");
    expect(replyBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("Annuler (.btn-ghost) referme le formulaire sans appeler onReply", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<Comments comments={COMMENTS} onReply={onReply} />);
    const replyBtn = document.querySelector(
      '[aria-label="Répondre"]',
    ) as HTMLElement;
    await user.click(replyBtn);
    const form = replyBtn
      .closest(".comment-body")
      ?.querySelector(".comment-reply-form") as HTMLElement;
    await user.type(
      form.querySelector(".comment-reply-input") as HTMLElement,
      "Un brouillon",
    );
    await user.click(form.querySelector(".btn-ghost.btn-xs") as HTMLElement);
    expect(form).not.toHaveClass("open");
    expect(onReply).not.toHaveBeenCalled();
  });

  it("Envoyer appelle onReply avec le texte saisi, vide le champ et referme (ajout vs vanilla non câblé)", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<Comments comments={COMMENTS} onReply={onReply} />);
    const replyBtn = document.querySelector(
      '[aria-label="Répondre"]',
    ) as HTMLElement;
    await user.click(replyBtn);
    const form = replyBtn
      .closest(".comment-body")
      ?.querySelector(".comment-reply-form") as HTMLElement;
    const textarea = form.querySelector(
      ".comment-reply-input",
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Merci pour le retour !");
    await user.click(form.querySelector(".btn-primary.btn-xs") as HTMLElement);

    expect(onReply).toHaveBeenCalledWith("c1", "Merci pour le retour !");
    expect(form).not.toHaveClass("open");
    expect(textarea.value).toBe("");
  });

  it("Envoyer avec un champ vide n'appelle pas onReply", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<Comments comments={COMMENTS} onReply={onReply} />);
    const replyBtn = document.querySelector(
      '[aria-label="Répondre"]',
    ) as HTMLElement;
    await user.click(replyBtn);
    const form = replyBtn
      .closest(".comment-body")
      ?.querySelector(".comment-reply-form") as HTMLElement;
    await user.click(form.querySelector(".btn-primary.btn-xs") as HTMLElement);
    expect(onReply).not.toHaveBeenCalled();
  });
});
