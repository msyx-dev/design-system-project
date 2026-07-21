import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserFeedbackProvider, useUserFeedback } from "./UserFeedbackProvider";
import type { UserFeedbackProviderProps } from "./UserFeedbackProvider";
import type { ReactNode } from "react";
import type { FeedbackUser } from "./types";

const ORIGINAL_LOCATION = window.location;

function setLocation(url: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: new URL(url),
  });
}

function restoreLocation() {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: ORIGINAL_LOCATION,
  });
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: ua,
  });
}

function wrapperFor(props: Partial<UserFeedbackProviderProps> = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <UserFeedbackProvider appId="ds-showcase" {...props}>
        {children}
      </UserFeedbackProvider>
    );
  };
}

describe("useUserFeedback — hors provider", () => {
  it("lève une erreur explicite si utilisé hors UserFeedbackProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useUserFeedback())).toThrow(
      /UserFeedbackProvider/,
    );
    spy.mockRestore();
  });
});

describe("UserFeedbackProvider — état isOpen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isOpen démarre à false, openFeedback → true, closeFeedback → false", () => {
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openFeedback();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeFeedback();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("onSubmit est ré-exposé tel quel", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor({ onSubmit }),
    });

    expect(result.current.onSubmit).toBe(onSubmit);
  });
});

describe("UserFeedbackProvider — contexte : appId / user / tenant", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mode anonyme par défaut — user: null", () => {
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    expect(result.current.context.appId).toBe("ds-showcase");
    expect(result.current.context.user).toBeNull();
    expect(result.current.context.tenant).toBeNull();
  });

  it("mode connecté — user + tenant transmis au contexte", () => {
    const user: FeedbackUser = { id: "u-1", email: "mike@msyx.fr" };
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor({ user, tenant: "acssi" }),
    });

    expect(result.current.context.user).toEqual(user);
    expect(result.current.context.tenant).toBe("acssi");
  });
});

describe("UserFeedbackProvider — env auto (hostname)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreLocation();
  });

  it("localhost → dev", () => {
    setLocation("http://localhost:3000/dashboard");
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.env).toBe("dev");
  });

  it("127.0.0.1 → dev", () => {
    setLocation("http://127.0.0.1:3000/");
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.env).toBe("dev");
  });

  it("*.miklaw.fr → preprod", () => {
    setLocation("https://poc-foo.miklaw.fr/settings");
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.env).toBe("preprod");
  });

  it("*.msyx.fr → prod", () => {
    setLocation("https://design-system.msyx.fr/pages/composants.html");
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.env).toBe("prod");
  });

  it("hostname inconnu → unknown", () => {
    setLocation("https://example.com/app");
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.env).toBe("unknown");
  });
});

describe("UserFeedbackProvider — device (viewport)", () => {
  const ORIGINAL_WIDTH = window.innerWidth;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setInnerWidth(ORIGINAL_WIDTH);
  });

  it("largeur < 768 → mobile", () => {
    setInnerWidth(400);
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.device).toBe("mobile");
    expect(result.current.context.viewport.width).toBe(400);
  });

  it("768 <= largeur < 1024 → tablet", () => {
    setInnerWidth(800);
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.device).toBe("tablet");
  });

  it("largeur >= 1024 → desktop", () => {
    setInnerWidth(1280);
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.device).toBe("desktop");
  });
});

describe("UserFeedbackProvider — browser (userAgent)", () => {
  const ORIGINAL_UA = window.navigator.userAgent;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUserAgent(ORIGINAL_UA);
  });

  it("détecte Chrome", () => {
    setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.browser).toBe("Chrome");
  });

  it("détecte Firefox", () => {
    setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    );
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.context.browser).toBe("Firefox");
  });
});

describe("UserFeedbackProvider — route", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("route = pathname + search, rafraîchie à openFeedback()", () => {
    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    expect(result.current.context.route).toBe("/");

    window.history.pushState({}, "", "/settings?tab=notifications");

    act(() => {
      result.current.openFeedback();
    });

    expect(result.current.context.route).toBe("/settings?tab=notifications");
  });
});

describe("UserFeedbackProvider — version (fetch tolérant)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("version résolue depuis /version par défaut", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "3.0.0-alpha.14" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    await waitFor(() => {
      expect(result.current.context.version).toBe("3.0.0-alpha.14");
    });

    expect(fetchMock).toHaveBeenCalledWith("/version");
  });

  it("utilise versionUrl personnalisée si fournie", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ sha: "abc123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor({ versionUrl: "/api/version" }),
    });

    await waitFor(() => {
      expect(result.current.context.version).toBe("abc123");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/version");
  });

  it("échec réseau → version reste null (tolérant, ne throw pas)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    // Laisse la promesse rejetée se résoudre.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.context.version).toBeNull();
  });

  it("réponse HTTP non-ok → version reste null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useUserFeedback(), {
      wrapper: wrapperFor(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.context.version).toBeNull();
  });
});
