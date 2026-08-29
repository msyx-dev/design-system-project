import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BottomNav, BottomNavItem } from "./BottomNav";

afterEach(() => {
  cleanup();
});

const ITEMS: BottomNavItem[] = [
  { id: "home", label: "Accueil", icon: <svg data-testid="icon-home" /> },
  {
    id: "messages",
    label: "Messages",
    icon: <svg data-testid="icon-messages" />,
    badge: "3",
  },
  {
    id: "notifs",
    label: "Notifs",
    icon: <svg data-testid="icon-notifs" />,
    badgeDot: true,
  },
  { id: "profile", label: "Profil", icon: <svg data-testid="icon-profile" /> },
];

describe("BottomNav — structure", () => {
  it("rend .bottom-nav avec un .bottom-nav-item par item", () => {
    render(<BottomNav items={ITEMS} value="home" onChange={() => {}} />);
    const nav = document.querySelector(".bottom-nav");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Navigation principale");
    expect(document.querySelectorAll(".bottom-nav-item")).toHaveLength(4);
  });

  it("rend button par défaut, <a href> si href fourni", () => {
    render(
      <BottomNav
        items={[
          { id: "home", label: "Accueil", icon: "H", href: "/" },
          { id: "search", label: "Recherche", icon: "S" },
        ]}
        value="home"
        onChange={() => {}}
      />,
    );
    const items = document.querySelectorAll(".bottom-nav-item");
    expect(items[0].tagName).toBe("A");
    expect(items[0]).toHaveAttribute("href", "/");
    expect(items[1].tagName).toBe("BUTTON");
  });

  it("badge numérique et badge point rendus correctement", () => {
    render(<BottomNav items={ITEMS} value="home" onChange={() => {}} />);
    const messages = screen.getByText("Messages").closest(".bottom-nav-item");
    expect(messages?.querySelector(".bottom-nav-badge")).toHaveTextContent("3");
    const notifs = screen.getByText("Notifs").closest(".bottom-nav-item");
    const dot = notifs?.querySelector(".bottom-nav-badge--dot");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bottom-nav-badge");
  });
});

describe("BottomNav — état actif (classe + aria-current)", () => {
  it("l'item actif porte .active et aria-current=page — les autres non", () => {
    render(<BottomNav items={ITEMS} value="messages" onChange={() => {}} />);
    const active = screen.getByText("Messages").closest(".bottom-nav-item");
    expect(active).toHaveClass("bottom-nav-item", "active");
    expect(active).toHaveAttribute("aria-current", "page");

    const inactive = screen.getByText("Accueil").closest(".bottom-nav-item");
    expect(inactive).not.toHaveClass("active");
    expect(inactive).not.toHaveAttribute("aria-current");
  });

  it("ne pose jamais aria-selected (divergence documentée vs le vanilla)", () => {
    render(<BottomNav items={ITEMS} value="home" onChange={() => {}} />);
    document.querySelectorAll(".bottom-nav-item").forEach((item) => {
      expect(item).not.toHaveAttribute("aria-selected");
    });
  });

  it("clic sur un item appelle onChange avec son id — contrôlé, aucun état interne", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BottomNav items={ITEMS} value="home" onChange={onChange} />);

    await user.click(screen.getByText("Profil"));
    expect(onChange).toHaveBeenCalledWith("profile");

    // Contrôlé : sans changement de `value` par le parent, la classe active
    // ne bouge pas toute seule.
    expect(screen.getByText("Accueil").closest(".bottom-nav-item")).toHaveClass(
      "active",
    );
  });

  it("clic sur un item <a href> appelle onChange sans navigation réelle (preventDefault)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BottomNav
        items={[
          { id: "home", label: "Accueil", icon: "H", href: "/" },
          { id: "search", label: "Recherche", icon: "S", href: "/search" },
        ]}
        value="home"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByText("Recherche"));
    expect(onChange).toHaveBeenCalledWith("search");
  });
});
