import { useState } from "react";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Accordion, AccordionItem, AccordionProps } from "./Accordion";

afterEach(() => {
  cleanup();
});

/** 3 items : le premier ouvert par défaut, les deux autres fermés. */
const sampleItems: AccordionItem[] = [
  {
    id: "stack",
    title: "Quelle stack est utilisée ?",
    content: "Next.js 15 + FastAPI + PostgreSQL.",
    defaultOpen: true,
  },
  {
    id: "deploy",
    title: "Comment déployer un projet ?",
    content: "La commande /deploy configure le sous-domaine et le certificat.",
  },
  {
    id: "charte",
    title: "Comment personnaliser la charte ?",
    content: <p data-testid="charte-body">Modifiez les tokens CSS.</p>,
  },
];

/** Le `.accordion-item` dont l'en-tête contient ce fragment de libellé. */
function itemByTitle(fragment: string): HTMLElement {
  const header = Array.from(
    document.querySelectorAll<HTMLElement>(".accordion-header"),
  ).find((h) => h.textContent?.includes(fragment));
  if (!header) throw new Error(`En-tête introuvable : ${fragment}`);
  return header.closest(".accordion-item") as HTMLElement;
}

function headerByTitle(fragment: string): HTMLElement {
  return itemByTitle(fragment).querySelector(
    ".accordion-header",
  ) as HTMLElement;
}

/** Wrapper contrôlé — reflète `onOpenChange`, comme un vrai consumer. */
function ControlledAccordion(
  props: Partial<Omit<AccordionProps, "items" | "openIds">> & {
    items?: AccordionItem[];
    initialOpenIds?: string[];
  },
) {
  const {
    items = sampleItems,
    initialOpenIds = [],
    onOpenChange,
    ...rest
  } = props;
  const [open, setOpen] = useState<string[]>(initialOpenIds);
  return (
    <Accordion
      {...rest}
      items={items}
      openIds={open}
      onOpenChange={(ids, item) => {
        setOpen(ids);
        onOpenChange?.(ids, item);
      }}
    />
  );
}

describe("Accordion — structure & markup canonique", () => {
  it("rend un .accordion-item par item, frères directs de la racine", () => {
    const { container } = render(<Accordion items={sampleItems} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.querySelectorAll(":scope > .accordion-item")).toHaveLength(3);
  });

  it("la racine ne porte AUCUNE classe DS (il n'existe pas de .accordion)", () => {
    const { container } = render(<Accordion items={sampleItems} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("class")).toBeNull();
    // `.accordion` n'existe pas dans le CSS DS — ne jamais l'inventer.
    expect(document.querySelector(".accordion")).toBeNull();
    expect(document.querySelector(".accordion-group")).toBeNull();
    expect(document.querySelector(".accordion-container")).toBeNull();
  });

  it("applique className sur la racine sans autre classe", () => {
    const { container } = render(
      <Accordion items={sampleItems} className="faq" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("faq");
    expect(root.className).toBe("faq");
  });

  it("l'en-tête est un <div role=button tabindex=0>, JAMAIS un <button>", () => {
    render(<Accordion items={sampleItems} />);
    const header = headerByTitle("stack");
    expect(header.tagName).toBe("DIV");
    expect(header).toHaveAttribute("role", "button");
    expect(header).toHaveAttribute("tabindex", "0");
    // Écart assumé vs APG : aucun <button> natif (cf. JSDoc — dark mode).
    expect(document.querySelector("button.accordion-header")).toBeNull();
    expect(document.querySelector(".accordion-header button")).toBeNull();
  });

  it("l'en-tête contient le titre dans un <span> puis la flèche", () => {
    render(<Accordion items={sampleItems} />);
    const header = headerByTitle("stack");
    const span = header.querySelector(":scope > span");
    expect(span?.textContent).toBe("Quelle stack est utilisée ?");
  });

  it("la flèche porte .accordion-arrow (+ .icon.icon--sm), aria-hidden, glyphe inline", () => {
    render(<Accordion items={sampleItems} />);
    const arrow = headerByTitle("stack").querySelector(
      ".accordion-arrow",
    ) as SVGElement;
    expect(arrow).not.toBeNull();
    expect(arrow.tagName.toLowerCase()).toBe("svg");
    // .accordion-arrow est OBLIGATOIRE : sans elle, la rotation
    // `.accordion-item.open .accordion-arrow` est morte (bug de la démo vanilla).
    expect(arrow).toHaveClass("accordion-arrow");
    expect(arrow).toHaveClass("icon");
    expect(arrow).toHaveClass("icon--sm");
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(arrow).toHaveAttribute("data-icon", "chevron-down");
    // Auto-contenu (contrat #713) : aucun <use> vers un sprite externe.
    expect(arrow.querySelector("use")).toBeNull();
    expect(arrow.querySelector("path")).not.toBeNull();
    expect(document.querySelectorAll(".accordion-arrow")).toHaveLength(3);
  });

  it("le .accordion-body est monté même fermé (c'est le CSS qui masque)", () => {
    render(<Accordion items={sampleItems} />);
    const closed = itemByTitle("déployer");
    expect(closed).not.toHaveClass("open");
    const body = closed.querySelector(".accordion-body") as HTMLElement;
    expect(body).toBeInTheDocument();
    expect(body.textContent).toContain("/deploy");
    // Pas d'attribut `hidden` : 2e source de vérité d'affichage interdite.
    expect(body).not.toHaveAttribute("hidden");
  });

  it("accepte un ReactNode en content", () => {
    render(<Accordion items={sampleItems} />);
    expect(
      document.querySelector("[data-testid='charte-body']"),
    ).toBeInTheDocument();
  });
});

describe("Accordion — classe d'état .open (placement)", () => {
  it("defaultOpen pose .open sur le .accordion-item (le PARENT)", () => {
    render(<Accordion items={sampleItems} />);
    expect(itemByTitle("stack")).toHaveClass("accordion-item");
    expect(itemByTitle("stack")).toHaveClass("open");
    expect(itemByTitle("déployer")).not.toHaveClass("open");
  });

  it("un clic pose .open sur le .accordion-item, pas ailleurs", () => {
    render(<Accordion items={sampleItems} />);
    fireEvent.click(headerByTitle("déployer"));
    expect(itemByTitle("déployer")).toHaveClass("open");
    expect(document.querySelectorAll(".accordion-item.open")).toHaveLength(2);
  });

  it("NÉGATIF : .accordion-header ne porte JAMAIS .open (ni fermé, ni ouvert)", () => {
    render(<Accordion items={sampleItems} />);
    const assertNoOpenOnHeaders = () => {
      document
        .querySelectorAll(".accordion-header")
        .forEach((h) => expect(h).not.toHaveClass("open"));
      expect(document.querySelector(".accordion-header.open")).toBeNull();
    };
    // État initial : "stack" est ouvert — son en-tête ne doit rien porter.
    assertNoOpenOnHeaders();
    fireEvent.click(headerByTitle("déployer"));
    assertNoOpenOnHeaders();
    fireEvent.click(headerByTitle("stack"));
    assertNoOpenOnHeaders();
  });

  it("NÉGATIF : aucune classe d'état alternative n'est émise", () => {
    render(<Accordion items={sampleItems} />);
    fireEvent.click(headerByTitle("déployer"));
    for (const selector of [
      ".accordion--open",
      ".accordion-item--open",
      ".accordion-header--open",
      ".accordion-body--open",
      ".accordion-body.open",
      ".accordion-arrow.open",
      ".active",
      ".expanded",
      ".is-open",
    ]) {
      expect(document.querySelector(selector)).toBeNull();
    }
  });

  it("un 2e clic referme : .open retiré du .accordion-item", () => {
    render(<Accordion items={sampleItems} />);
    fireEvent.click(headerByTitle("stack"));
    expect(itemByTitle("stack")).not.toHaveClass("open");
    expect(document.querySelectorAll(".accordion-item.open")).toHaveLength(0);
  });
});

describe("Accordion — multi-ouverture indépendante (iso-vanilla)", () => {
  it("ouvrir un item n'en ferme aucun autre", () => {
    render(<Accordion items={sampleItems} />);
    fireEvent.click(headerByTitle("déployer"));
    fireEvent.click(headerByTitle("personnaliser"));
    expect(itemByTitle("stack")).toHaveClass("open");
    expect(itemByTitle("déployer")).toHaveClass("open");
    expect(itemByTitle("personnaliser")).toHaveClass("open");
    expect(document.querySelectorAll(".accordion-item.open")).toHaveLength(3);
  });

  it("fermer un item n'affecte pas les autres", () => {
    render(<Accordion items={sampleItems} />);
    fireEvent.click(headerByTitle("déployer"));
    fireEvent.click(headerByTitle("stack")); // ferme "stack"
    expect(itemByTitle("stack")).not.toHaveClass("open");
    expect(itemByTitle("déployer")).toHaveClass("open");
  });
});

describe("Accordion — ARIA (WAI-ARIA APG)", () => {
  it("aria-expanded est synchronisé avec .open", () => {
    render(<Accordion items={sampleItems} />);
    expect(headerByTitle("stack")).toHaveAttribute("aria-expanded", "true");
    expect(headerByTitle("déployer")).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(headerByTitle("déployer"));
    expect(headerByTitle("déployer")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(headerByTitle("déployer"));
    expect(headerByTitle("déployer")).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-controls ↔ id du panneau et aria-labelledby ↔ id de l'en-tête", () => {
    render(<Accordion items={sampleItems} />);
    // useId() produit des ids type ':r0:' — comparer les attributs,
    // JAMAIS via querySelector("#id") (sélecteur CSS invalide).
    for (const fragment of ["stack", "déployer", "personnaliser"]) {
      const item = itemByTitle(fragment);
      const header = item.querySelector(".accordion-header") as HTMLElement;
      const body = item.querySelector(".accordion-body") as HTMLElement;
      expect(header.id).toBeTruthy();
      expect(body.id).toBeTruthy();
      expect(header.getAttribute("aria-controls")).toBe(body.id);
      expect(body.getAttribute("aria-labelledby")).toBe(header.id);
    }
  });

  it("le panneau porte role=region", () => {
    render(<Accordion items={sampleItems} />);
    expect(
      document.querySelectorAll(".accordion-body[role='region']"),
    ).toHaveLength(3);
  });

  it("les ids sont uniques entre deux instances montées simultanément", () => {
    render(
      <>
        <Accordion items={sampleItems} />
        <Accordion items={sampleItems} />
      </>,
    );
    const ids = Array.from(
      document.querySelectorAll(".accordion-header, .accordion-body"),
    ).map((el) => el.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("heading enveloppant : <h3> par défaut, sans classe", () => {
    render(<Accordion items={sampleItems} />);
    const wrapper = headerByTitle("stack").parentElement as HTMLElement;
    expect(wrapper.tagName).toBe("H3");
    // Aucune classe DS inventée sur le heading.
    expect(wrapper.getAttribute("class")).toBeNull();
    expect(wrapper.parentElement).toHaveClass("accordion-item");
  });

  it("headingLevel pilote le niveau, 'div' désactive le heading", () => {
    const { unmount } = render(
      <Accordion items={sampleItems} headingLevel="h2" />,
    );
    expect((headerByTitle("stack").parentElement as HTMLElement).tagName).toBe(
      "H2",
    );
    unmount();

    render(<Accordion items={sampleItems} headingLevel="div" />);
    const wrapper = headerByTitle("stack").parentElement as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(document.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
  });
});

describe("Accordion — clavier (contrat natif reproduit)", () => {
  it("Enter bascule et appelle preventDefault", () => {
    render(<Accordion items={sampleItems} />);
    const header = headerByTitle("déployer");
    const ev = createEvent.keyDown(header, { key: "Enter" });
    fireEvent(header, ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(itemByTitle("déployer")).toHaveClass("open");
  });

  it("Space bascule et appelle preventDefault (sinon la page scrolle)", () => {
    render(<Accordion items={sampleItems} />);
    const header = headerByTitle("déployer");
    const ev = createEvent.keyDown(header, { key: " " });
    fireEvent(header, ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(itemByTitle("déployer")).toHaveClass("open");
  });

  it("toute autre touche est inerte (pas de bascule, pas de preventDefault)", () => {
    render(<Accordion items={sampleItems} />);
    const header = headerByTitle("déployer");
    const ev = createEvent.keyDown(header, { key: "a" });
    fireEvent(header, ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(itemByTitle("déployer")).not.toHaveClass("open");
  });
});

describe("Accordion — mode contrôlé (openIds)", () => {
  it("openIds pilote l'ouverture et IGNORE defaultOpen", () => {
    render(<Accordion items={sampleItems} openIds={["deploy"]} />);
    // "stack" a defaultOpen: true — ignoré en mode contrôlé.
    expect(itemByTitle("stack")).not.toHaveClass("open");
    expect(itemByTitle("déployer")).toHaveClass("open");
  });

  it("openIds={[]} ferme tout malgré defaultOpen", () => {
    render(<Accordion items={sampleItems} openIds={[]} />);
    expect(document.querySelectorAll(".accordion-item.open")).toHaveLength(0);
  });

  it("contrôlé : un clic n'altère pas le rendu mais notifie onOpenChange", () => {
    const handleOpenChange = vi.fn();
    render(
      <Accordion
        items={sampleItems}
        openIds={["deploy"]}
        onOpenChange={handleOpenChange}
      />,
    );

    fireEvent.click(headerByTitle("personnaliser"));

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(
      ["deploy", "charte"],
      expect.objectContaining({ id: "charte" }),
    );
    // L'ouverture reste pilotée par le parent : rien n'a bougé.
    expect(itemByTitle("personnaliser")).not.toHaveClass("open");
    expect(itemByTitle("déployer")).toHaveClass("open");
  });

  it("onOpenChange reçoit les ids dans l'ordre de `items`, pas l'ordre des clics", () => {
    const handleOpenChange = vi.fn();
    render(<Accordion items={sampleItems} onOpenChange={handleOpenChange} />);

    fireEvent.click(headerByTitle("personnaliser"));
    expect(handleOpenChange).toHaveBeenLastCalledWith(
      ["stack", "charte"],
      expect.objectContaining({ id: "charte" }),
    );

    fireEvent.click(headerByTitle("déployer"));
    expect(handleOpenChange).toHaveBeenLastCalledWith(
      ["stack", "deploy", "charte"],
      expect.objectContaining({ id: "deploy" }),
    );
  });

  it("un consumer qui reflète onOpenChange obtient bien l'ouverture", () => {
    render(<ControlledAccordion initialOpenIds={["stack"]} />);
    expect(itemByTitle("stack")).toHaveClass("open");

    fireEvent.click(headerByTitle("déployer"));
    expect(itemByTitle("déployer")).toHaveClass("open");
    expect(itemByTitle("stack")).toHaveClass("open");

    fireEvent.click(headerByTitle("stack"));
    expect(itemByTitle("stack")).not.toHaveClass("open");
    expect(itemByTitle("déployer")).toHaveClass("open");
  });

  it("non contrôlé : onOpenChange est aussi appelé", () => {
    const handleOpenChange = vi.fn();
    render(<Accordion items={sampleItems} onOpenChange={handleOpenChange} />);
    fireEvent.click(headerByTitle("déployer"));
    expect(handleOpenChange).toHaveBeenCalledWith(
      ["stack", "deploy"],
      expect.objectContaining({ id: "deploy" }),
    );
    expect(itemByTitle("déployer")).toHaveClass("open");
  });
});
