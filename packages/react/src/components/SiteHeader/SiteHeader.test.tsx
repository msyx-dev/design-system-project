import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SiteHeader, SiteHeaderIdentity } from "./SiteHeader";
import { NotificationItem } from "../NotificationBell/NotificationBell";
import { UserFeedbackProvider } from "../UserFeedback/UserFeedbackProvider";

const identity: SiteHeaderIdentity = {
  name: "Alice Martin",
  email: "alice@msyx.fr",
  authentikUserUrl: "https://auth.msyx.fr/user",
  logoutUrl: "/logout",
};
const notifs: NotificationItem[] = [
  { id: "1", title: "Nouveau message", unread: true },
];

const header = () => screen.getByRole("banner");

// --- Structure / render ---
describe("SiteHeader — structure", () => {
  it("rend <header class=site-header> avec brand par défaut + spacer", () => {
    const { container } = render(<SiteHeader />);
    expect(header()).toHaveClass("site-header");
    expect(
      container.querySelector(".header-logo .brand-wordmark"),
    ).not.toBeNull();
    expect(container.querySelector(".header-spacer")).not.toBeNull();
  });

  it("className additionnel fusionné sur la racine", () => {
    render(<SiteHeader className="app-header" />);
    expect(header()).toHaveClass("site-header");
    expect(header()).toHaveClass("app-header");
  });

  it("brand fourni remplace le défaut", () => {
    render(
      <SiteHeader
        brand={
          <a className="header-logo" href="/">
            MonApp
          </a>
        }
      />,
    );
    expect(screen.getByText("MonApp")).toBeInTheDocument();
    expect(document.querySelector(".brand-wordmark")).toBeNull();
  });
});

// --- Identité : 3 états ---
describe("SiteHeader — identité", () => {
  it("undefined → skeleton avatar (loading), pas de UserMenu", () => {
    render(<SiteHeader identity={undefined} />);
    expect(document.querySelector(".skeleton.skeleton-avatar")).not.toBeNull();
    expect(document.querySelector(".user-menu")).toBeNull();
  });

  it("null → anonyme : ni skeleton ni UserMenu", () => {
    render(<SiteHeader identity={null} />);
    expect(document.querySelector(".skeleton-avatar")).toBeNull();
    expect(document.querySelector(".user-menu")).toBeNull();
  });

  it("objet → UserMenu avec displayName", () => {
    render(<SiteHeader identity={identity} />);
    expect(document.querySelector(".user-menu-trigger")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /Alice Martin/ }),
    ).toBeInTheDocument();
  });

  it("champs UserMenu requis reçoivent des défauts sûrs quand absents", () => {
    render(<SiteHeader identity={{ name: "Bob" }} />);
    // UserMenu se monte sans crash (email/authentikUserUrl/logoutUrl requis)
    fireEvent.click(document.querySelector(".user-menu-trigger")!);
    expect(
      screen.getByRole("menuitem", { name: /Mon compte/ }),
    ).toHaveAttribute("href", "#");
  });
});

// --- Opt-out par feature ---
describe("SiteHeader — notifications opt-out", () => {
  it("absent → pas de cloche", () => {
    render(<SiteHeader />);
    expect(document.querySelector(".header-notification")).toBeNull();
  });
  it("fourni → NotificationBell rendu + câblé", () => {
    const onMarkAllRead = vi.fn();
    render(<SiteHeader notifications={notifs} onMarkAllRead={onMarkAllRead} />);
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".header-notification-badge")?.textContent,
    ).toBe("1");
  });
  it("unreadCount explicite propagé", () => {
    render(<SiteHeader notifications={notifs} unreadCount={42} />);
    expect(
      document.querySelector(".header-notification-badge")?.textContent,
    ).toBe("42");
  });
});

describe("SiteHeader — versionNotes opt-out", () => {
  it("absent → pas de badge version", () => {
    render(<SiteHeader />);
    expect(document.querySelector(".version-badge")).toBeNull();
  });
  it("fourni → .version-badge rendu", () => {
    render(
      <SiteHeader
        versionNotes={{
          latestVersion: "1.0.0",
          storageKey: "app-v",
          releases: [{ version: "1.0.0", date: "2026-07-24", highlights: [] }],
        }}
      />,
    );
    expect(document.querySelector(".version-badge")).not.toBeNull();
  });
});

describe("SiteHeader — toggle clair/sombre standard + paletteSwitch opt-in", () => {
  it("sans prop → toggle .mode-switch rendu par défaut, pas de theme-switcher", () => {
    render(<SiteHeader />);
    expect(document.querySelector(".mode-switch")).not.toBeNull();
    expect(document.querySelector(".theme-switcher")).toBeNull();
  });

  it("identity undefined (loading) → toggle quand même présent", () => {
    render(<SiteHeader identity={undefined} />);
    expect(document.querySelector(".mode-switch")).not.toBeNull();
  });

  it("identity null (anonyme) → toggle quand même présent", () => {
    render(<SiteHeader identity={null} />);
    expect(document.querySelector(".mode-switch")).not.toBeNull();
  });

  it("identity objet (connecté) → toggle quand même présent", () => {
    render(<SiteHeader identity={identity} />);
    expect(document.querySelector(".mode-switch")).not.toBeNull();
  });

  it("paletteSwitch → ThemeSwitcher (.theme-switcher-select) dans .header-controls", () => {
    render(<SiteHeader paletteSwitch />);
    expect(
      document.querySelector(".header-controls .theme-switcher"),
    ).not.toBeNull();
    expect(document.querySelector(".theme-switcher-select")).not.toBeNull();
  });

  it("paletteSwitch → un seul .mode-switch (pas de double toggle)", () => {
    render(<SiteHeader paletteSwitch />);
    expect(document.querySelectorAll(".mode-switch")).toHaveLength(1);
  });

  it("sans paletteSwitch → pas de .theme-switcher-select", () => {
    render(<SiteHeader />);
    expect(document.querySelector(".theme-switcher-select")).toBeNull();
  });
});

describe("SiteHeader — feedback opt-out", () => {
  it("absent → pas de bouton feedback", () => {
    render(<SiteHeader />);
    expect(
      screen.queryByRole("button", { name: "Donner un feedback" }),
    ).toBeNull();
  });

  it("true + Provider ambiant → bouton rendu", () => {
    render(
      <UserFeedbackProvider appId="test">
        <SiteHeader feedback />
      </UserFeedbackProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Donner un feedback" }),
    ).toBeInTheDocument();
  });

  it("config.provider → Provider auto-monté (pas besoin d'ambiant)", () => {
    // Le Provider fetch /version au montage — stub pour un test déterministe.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    render(<SiteHeader feedback={{ provider: { appId: "test" } }} />);
    expect(
      screen.getByRole("button", { name: "Donner un feedback" }),
    ).toBeInTheDocument();
  });

  it("config.button.label personnalise l'aria-label", () => {
    render(
      <UserFeedbackProvider appId="test">
        <SiteHeader feedback={{ button: { label: "Un souci ?" } }} />
      </UserFeedbackProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Un souci ?" }),
    ).toBeInTheDocument();
  });
});

describe("SiteHeader — burger (onMenuToggle)", () => {
  it("absent → pas de burger", () => {
    render(<SiteHeader />);
    expect(document.querySelector(".header-burger")).toBeNull();
  });
  it("fourni → burger rendu + clic appelle le callback", () => {
    const onMenuToggle = vi.fn();
    render(<SiteHeader onMenuToggle={onMenuToggle} />);
    const burger = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(burger).toHaveClass("header-burger");
    fireEvent.click(burger);
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });
});

// --- Placement / ordre ---
describe("SiteHeader — placement", () => {
  it("ordre DOM : brand < spacer < zone user ; notif avant identité", () => {
    render(
      <SiteHeader
        identity={identity}
        notifications={notifs}
        onMenuToggle={() => {}}
      />,
    );
    const h = header();
    const kids = Array.from(h.children);
    const idxBurger = kids.findIndex((n) =>
      n.classList.contains("header-burger"),
    );
    const idxBrand = kids.findIndex((n) => n.classList.contains("header-logo"));
    const idxSpacer = kids.findIndex((n) =>
      n.classList.contains("header-spacer"),
    );
    expect(idxBurger).toBeLessThan(idxBrand);
    expect(idxBrand).toBeLessThan(idxSpacer);
    // Cloche (sa propre zone) placée avant la zone feedback+identité (UserMenu).
    const bell = document.querySelector(".header-notification");
    const menu = document.querySelector(".user-menu");
    expect(
      bell!.compareDocumentPosition(menu!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("pas de nesting .header-user-zone (deux zones siblings au plus)", () => {
    // feedback=true suppose un Provider ambiant (cf. describe "feedback opt-out").
    render(
      <UserFeedbackProvider appId="test">
        <SiteHeader identity={identity} notifications={notifs} feedback />
      </UserFeedbackProvider>,
    );
    const zones = document.querySelectorAll(".header-user-zone");
    zones.forEach((z) =>
      expect(z.querySelector(".header-user-zone")).toBeNull(),
    );
  });
});

// --- a11y ---
describe("SiteHeader — a11y", () => {
  it("racine = landmark banner", () => {
    render(<SiteHeader identity={identity} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
  it("skeleton loading est aria-hidden", () => {
    render(<SiteHeader identity={undefined} />);
    expect(document.querySelector(".skeleton-avatar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

afterEach(() => vi.unstubAllGlobals());
