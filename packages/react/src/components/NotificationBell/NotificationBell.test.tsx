import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotificationBell, NotificationItem } from "./NotificationBell";

const items: NotificationItem[] = [
  {
    id: "1",
    title: "Nouveau message",
    desc: "de Alice",
    time: "2 min",
    unread: true,
  },
  { id: "2", title: "Build terminé", time: "1 h", unread: false },
];
const bell = () => screen.getByRole("button", { name: "Notifications" });
const panel = () => document.querySelector(".header-notif-panel");

// --- Render ---
describe("NotificationBell — render", () => {
  it("rend la cloche .header-notification avec l'icône bell (inline, sans <use>)", () => {
    const { container } = render(<NotificationBell notifications={items} />);
    expect(bell()).toHaveClass("header-notification");
    expect(container.querySelector('svg[data-icon="bell"]')).not.toBeNull();
    expect(container.querySelector("use")).toBeNull();
  });

  it("panel role=dialog fermé par défaut (pas .open, aria-hidden, inert)", () => {
    render(<NotificationBell notifications={items} />);
    const p = screen.getByRole("dialog", { hidden: true });
    expect(p).not.toHaveClass("open");
    expect(p).toHaveAttribute("aria-hidden", "true");
    expect(p).toHaveAttribute("inert");
  });

  it("rend les items avec titre/desc/time et l'état .unread", () => {
    render(<NotificationBell notifications={items} />);
    expect(screen.getByText("Nouveau message")).toBeInTheDocument();
    expect(screen.getByText("de Alice")).toBeInTheDocument();
    const first = document.querySelectorAll(".header-notif-item")[0];
    expect(first).toHaveClass("unread");
    expect(document.querySelectorAll(".header-notif-item")[1]).not.toHaveClass(
      "unread",
    );
  });
});

// --- Badge ---
describe("NotificationBell — badge", () => {
  it("dérive le compteur des items unread quand unreadCount absent", () => {
    render(<NotificationBell notifications={items} />);
    expect(
      document.querySelector(".header-notification-badge")?.textContent,
    ).toBe("1");
  });

  it("unreadCount explicite l'emporte (42 non lues, 2 items)", () => {
    render(<NotificationBell notifications={items} unreadCount={42} />);
    expect(
      document.querySelector(".header-notification-badge")?.textContent,
    ).toBe("42");
  });

  it("badge .hidden et vide quand compteur 0", () => {
    render(<NotificationBell notifications={[]} unreadCount={0} />);
    const badge = document.querySelector(".header-notification-badge");
    expect(badge).toHaveClass("hidden");
    expect(badge?.textContent).toBe("");
  });

  it("affiche 99+ au-delà de 99", () => {
    render(<NotificationBell notifications={items} unreadCount={150} />);
    expect(
      document.querySelector(".header-notification-badge")?.textContent,
    ).toBe("99+");
  });
});

// --- Ouverture / fermeture ---
describe("NotificationBell — toggle", () => {
  it("ouvre au clic (.open + .active + aria-expanded=true, plus d'inert)", () => {
    render(<NotificationBell notifications={items} />);
    fireEvent.click(bell());
    expect(panel()).toHaveClass("open");
    expect(bell()).toHaveClass("active");
    expect(bell()).toHaveAttribute("aria-expanded", "true");
    expect(panel()).not.toHaveAttribute("inert");
  });

  it("ferme au second clic", () => {
    render(<NotificationBell notifications={items} />);
    fireEvent.click(bell());
    fireEvent.click(bell());
    expect(panel()).not.toHaveClass("open");
  });
});

// --- Échap + focus return ---
describe("NotificationBell — Échap", () => {
  it("Échap ferme et rend le focus à la cloche", async () => {
    render(<NotificationBell notifications={items} />);
    fireEvent.click(bell());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(panel()).not.toHaveClass("open"));
    expect(document.activeElement).toBe(bell());
  });
});

// --- Click-outside ---
describe("NotificationBell — click-outside", () => {
  it("ferme sur mousedown extérieur", async () => {
    render(
      <div>
        <NotificationBell notifications={items} />
        <button data-testid="outside">out</button>
      </div>,
    );
    fireEvent.click(bell());
    expect(panel()).toHaveClass("open");
    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => expect(panel()).not.toHaveClass("open"));
  });

  it("ne ferme pas sur mousedown intérieur", () => {
    render(<NotificationBell notifications={items} />);
    fireEvent.click(bell());
    fireEvent.mouseDown(panel()!);
    expect(panel()).toHaveClass("open");
  });
});

// --- Mark-all-read ---
describe("NotificationBell — mark-all-read", () => {
  it("clic « Tout lire » appelle onMarkAllRead une fois", () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationBell notifications={items} onMarkAllRead={onMarkAllRead} />,
    );
    fireEvent.click(bell());
    fireEvent.click(screen.getByRole("button", { name: "Tout lire" }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("markAllLabel personnalisable", () => {
    render(
      <NotificationBell notifications={items} markAllLabel="Marquer lu" />,
    );
    // Panel fermé par défaut (inert + aria-hidden) : ouvrir avant de query
    // par role, sinon le bouton est inaccessible pour getByRole (attendu).
    fireEvent.click(bell());
    expect(
      screen.getByRole("button", { name: "Marquer lu" }),
    ).toBeInTheDocument();
  });
});

// --- Item click ---
describe("NotificationBell — item click", () => {
  it("clic item appelle onItemClick(item), ne ferme pas, ne délie pas .unread", () => {
    const onItemClick = vi.fn();
    render(
      <NotificationBell notifications={items} onItemClick={onItemClick} />,
    );
    fireEvent.click(bell());
    fireEvent.click(screen.getByText("Nouveau message"));
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
    expect(panel()).toHaveClass("open");
    expect(document.querySelectorAll(".header-notif-item")[0]).toHaveClass(
      "unread",
    );
  });

  it("item avec href rendu en <a>", () => {
    render(
      <NotificationBell
        notifications={[{ id: "1", title: "Lien", href: "/x", unread: true }]}
      />,
    );
    const a = document.querySelector("a.header-notif-item");
    expect(a).not.toBeNull();
    expect(a).toHaveAttribute("href", "/x");
  });

  it("item interactif (onItemClick) activable au clavier (Enter)", () => {
    const onItemClick = vi.fn();
    render(
      <NotificationBell notifications={items} onItemClick={onItemClick} />,
    );
    fireEvent.click(bell());
    const div = document.querySelectorAll(".header-notif-item")[0];
    expect(div).toHaveAttribute("role", "button");
    fireEvent.keyDown(div, { key: "Enter" });
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it("item non interactif (sans onItemClick, sans href) = div sans role", () => {
    render(<NotificationBell notifications={items} />);
    expect(
      document.querySelectorAll(".header-notif-item")[0],
    ).not.toHaveAttribute("role");
  });
});

// --- Empty state ---
describe("NotificationBell — empty", () => {
  it("liste vide → .header-notif-empty avec emptyLabel par défaut", () => {
    render(<NotificationBell notifications={[]} />);
    expect(document.querySelector(".header-notif-empty")?.textContent).toBe(
      "Aucune notification",
    );
  });

  it("emptyLabel personnalisable", () => {
    render(
      <NotificationBell notifications={[]} emptyLabel="Rien à signaler" />,
    );
    expect(screen.getByText("Rien à signaler")).toBeInTheDocument();
  });
});

// --- a11y ---
describe("NotificationBell — a11y", () => {
  it("cloche : aria-haspopup=dialog + aria-controls vers l'id du panel", () => {
    render(<NotificationBell notifications={items} />);
    expect(bell()).toHaveAttribute("aria-haspopup", "dialog");
    const id = bell().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toBe(panel());
  });

  it("panel a un aria-label (Centre de notifications)", () => {
    render(<NotificationBell notifications={items} />);
    expect(panel()).toHaveAttribute("aria-label", "Centre de notifications");
  });

  it("label personnalise l'aria-label de la cloche", () => {
    render(<NotificationBell notifications={items} label="Alertes" />);
    expect(screen.getByRole("button", { name: "Alertes" })).toBeInTheDocument();
  });
});

// --- Controlled ---
describe("NotificationBell — controlled", () => {
  it("open=true force le panel ouvert", () => {
    render(<NotificationBell notifications={items} open />);
    expect(panel()).toHaveClass("open");
    expect(bell()).toHaveAttribute("aria-expanded", "true");
  });

  it("clic en contrôlé appelle onOpenChange sans muter l'état interne", () => {
    const onOpenChange = vi.fn();
    render(
      <NotificationBell
        notifications={items}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(bell());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(panel()).not.toHaveClass("open");
  });
});
