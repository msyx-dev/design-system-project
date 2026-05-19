import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UserMenu } from "./UserMenu";

const defaultProps = {
  displayName: "Mike Doe",
  email: "mike@msyx.fr",
  authentikUserUrl: "https://auth.msyx.fr/if/user/",
  logoutUrl: "/auth/logout",
};

// --- Render ---

describe("UserMenu — render", () => {
  it("renders with initials when no avatarUrl", () => {
    render(<UserMenu {...defaultProps} />);
    // MD = initiales de "Mike Doe"
    const avatarSpans = document.querySelectorAll(
      ".user-menu-avatar, .user-menu-dropdown-avatar",
    );
    expect(
      Array.from(avatarSpans).some((el) => el.textContent?.includes("MD")),
    ).toBe(true);
  });

  it("renders img when avatarUrl provided", () => {
    const { container } = render(
      <UserMenu {...defaultProps} avatarUrl="https://example.com/avatar.png" />,
    );
    // img avec alt="" a le rôle ARIA "presentation", on interroge par tag
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("shows displayName in dropdown header", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("Mike Doe")).toBeInTheDocument();
  });

  it("shows email in dropdown header", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("mike@msyx.fr")).toBeInTheDocument();
  });
});

// --- getInitials logic ---

describe("UserMenu — initials", () => {
  it("uses first letter of first + last word for two-word name", () => {
    render(<UserMenu {...defaultProps} displayName="Alice Martin" />);
    const avatarSpans = document.querySelectorAll(".user-menu-avatar");
    expect(
      Array.from(avatarSpans).some((el) => el.textContent?.includes("AM")),
    ).toBe(true);
  });

  it("uses first 2 chars for single-word name", () => {
    render(<UserMenu {...defaultProps} displayName="Mike" />);
    const avatarSpans = document.querySelectorAll(".user-menu-avatar");
    expect(
      Array.from(avatarSpans).some((el) => el.textContent?.includes("MI")),
    ).toBe(true);
  });

  it("uses first letter of first + last word for three-word name", () => {
    render(<UserMenu {...defaultProps} displayName="Jean Pierre Dupont" />);
    const avatarSpans = document.querySelectorAll(".user-menu-avatar");
    // J (Jean) + D (Dupont) = JD
    expect(
      Array.from(avatarSpans).some((el) => el.textContent?.includes("JD")),
    ).toBe(true);
  });
});

// --- Toggle ---

describe("UserMenu — toggle", () => {
  it("dropdown is closed by default", () => {
    render(<UserMenu {...defaultProps} />);
    const dropdown = document.querySelector(".user-menu-dropdown");
    expect(dropdown).not.toHaveClass("open");
  });

  it("opens on trigger click", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const dropdown = document.querySelector(".user-menu-dropdown");
    expect(dropdown).toHaveClass("open");
  });

  it("closes on second trigger click", () => {
    render(<UserMenu {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /menu utilisateur/i });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    const dropdown = document.querySelector(".user-menu-dropdown");
    expect(dropdown).not.toHaveClass("open");
  });

  it("aria-expanded=false by default", () => {
    render(<UserMenu {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /menu utilisateur/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-expanded=true after click", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    expect(
      screen.getByRole("button", { name: /menu utilisateur/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

// --- Click-outside ---

describe("UserMenu — click-outside", () => {
  it("closes when clicking outside the component", async () => {
    render(
      <div>
        <UserMenu {...defaultProps} />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    expect(document.querySelector(".user-menu-dropdown")).toHaveClass("open");

    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => {
      expect(document.querySelector(".user-menu-dropdown")).not.toHaveClass(
        "open",
      );
    });
  });

  it("does not close when clicking inside the dropdown", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    fireEvent.mouseDown(document.querySelector(".user-menu-dropdown")!);
    expect(document.querySelector(".user-menu-dropdown")).toHaveClass("open");
  });
});

// --- Focus return ---

describe("UserMenu — focus return", () => {
  it("trigger receives focus after Escape closes menu", async () => {
    render(<UserMenu {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /menu utilisateur/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});

// --- Keyboard navigation ---

describe("UserMenu — keyboard navigation", () => {
  it("ArrowDown moves focus to next menuitem", async () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[0].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "ArrowDown",
    });
    expect(document.activeElement).toBe(items[1]);
  });

  it("ArrowUp moves focus to previous menuitem", async () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[1].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "ArrowUp",
    });
    expect(document.activeElement).toBe(items[0]);
  });

  it("Home moves focus to first menuitem", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[1].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "Home",
    });
    expect(document.activeElement).toBe(items[0]);
  });

  it("End moves focus to last menuitem", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[0].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "End",
    });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("ArrowDown wraps from last to first", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[items.length - 1].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "ArrowDown",
    });
    expect(document.activeElement).toBe(items[0]);
  });

  it("ArrowUp wraps from first to last", () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    const items = screen.getAllByRole("menuitem");
    items[0].focus();
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "ArrowUp",
    });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("Escape closes the menu from dropdown keydown", async () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "Escape",
    });
    await waitFor(() => {
      expect(document.querySelector(".user-menu-dropdown")).not.toHaveClass(
        "open",
      );
    });
  });

  it("Tab closes the menu", async () => {
    render(<UserMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    fireEvent.keyDown(document.querySelector(".user-menu-dropdown")!, {
      key: "Tab",
    });
    await waitFor(() => {
      expect(document.querySelector(".user-menu-dropdown")).not.toHaveClass(
        "open",
      );
    });
  });
});

// --- ARIA states ---

describe("UserMenu — ARIA states", () => {
  it("trigger has aria-haspopup=menu", () => {
    render(<UserMenu {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /menu utilisateur/i }),
    ).toHaveAttribute("aria-haspopup", "menu");
  });

  it("trigger has aria-controls pointing to menu id", () => {
    render(<UserMenu {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /menu utilisateur/i });
    const menuId = trigger.getAttribute("aria-controls");
    expect(menuId).toBeTruthy();
    expect(document.getElementById(menuId!)).toBeInTheDocument();
  });

  it("dropdown has role=menu", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("items have role=menuitem", () => {
    render(<UserMenu {...defaultProps} />);
    const items = screen.getAllByRole("menuitem");
    expect(items.length).toBe(2);
  });

  it("divider has role=separator", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

// --- Controlled mode ---

describe("UserMenu — controlled mode", () => {
  it("respects open=true prop", () => {
    render(<UserMenu {...defaultProps} open={true} />);
    expect(document.querySelector(".user-menu-dropdown")).toHaveClass("open");
    expect(
      screen.getByRole("button", { name: /menu utilisateur/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("respects open=false prop", () => {
    render(<UserMenu {...defaultProps} open={false} />);
    expect(document.querySelector(".user-menu-dropdown")).not.toHaveClass(
      "open",
    );
  });

  it("calls onOpenChange with true when trigger clicked while closed", () => {
    const onOpenChange = vi.fn();
    render(
      <UserMenu {...defaultProps} open={false} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("calls onOpenChange with false when trigger clicked while open", () => {
    const onOpenChange = vi.fn();
    render(
      <UserMenu {...defaultProps} open={true} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not update internal state when controlled (open prop set)", () => {
    // Clicking trigger should not change visual state since open is controlled externally
    const onOpenChange = vi.fn();
    render(
      <UserMenu {...defaultProps} open={false} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /menu utilisateur/i }));
    // Still closed because open=false is controlled
    expect(document.querySelector(".user-menu-dropdown")).not.toHaveClass(
      "open",
    );
  });
});

// --- POST form logout ---

describe("UserMenu — POST form logout", () => {
  it("logout form has method=POST", () => {
    render(<UserMenu {...defaultProps} />);
    const form = document.querySelector(".user-menu-logout-form");
    expect(form).toHaveAttribute("method", "POST");
  });

  it("logout form action points to logoutUrl", () => {
    render(<UserMenu {...defaultProps} logoutUrl="/custom/logout" />);
    const form = document.querySelector(".user-menu-logout-form");
    expect(form).toHaveAttribute("action", "/custom/logout");
  });

  it("Mon compte link href points to authentikUserUrl", () => {
    render(
      <UserMenu
        {...defaultProps}
        authentikUserUrl="https://auth.msyx.fr/if/user/"
      />,
    );
    const link = screen.getByRole("menuitem", { name: /mon compte/i });
    expect(link).toHaveAttribute("href", "https://auth.msyx.fr/if/user/");
  });
});
