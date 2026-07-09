import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp, type UseCountUpOptions } from "./useCountUp";

/**
 * Ce port est un HOOK sans classe d'état ni style inline (`stateClasses: []`,
 * `inlineStyles: []` de la fiche de groom). Le SEUL contrat observable est la
 * VALEUR formatée (`.counter-value.textContent`) que le vanilla écrit, plus le
 * drapeau `done`. Les tests assertent donc ce contrat : départ `"0"`,
 * progression `0 → cible`, cible formatée exacte (Math.floor vs toFixed),
 * garde run-once, reduced-motion, fallback sans IntersectionObserver, opt-out.
 */

// --- Harness (createElement — fichier .ts, pas de JSX, cf. useFormValidation.test.ts)
function Harness(props: { target: number; options?: UseCountUpOptions }) {
  const { ref, value, done } = useCountUp<HTMLDivElement>(
    props.target,
    props.options,
  );
  return createElement(
    "div",
    { className: "counter", ref },
    createElement("span", { className: "counter-value" }, value),
    createElement("span", { className: "counter-done" }, String(done)),
  );
}

const readValue = () =>
  document.querySelector(".counter-value")?.textContent ?? null;
const readDone = () =>
  document.querySelector(".counter-done")?.textContent ?? null;

// --- Mock IntersectionObserver (jsdom n'en fournit aucun)
type IOEntry = Pick<
  IntersectionObserverEntry,
  "isIntersecting" | "target" | "intersectionRatio"
>;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simule une intersection sur les éléments actuellement observés. */
  intersect(isIntersecting = true) {
    const entries: IOEntry[] = this.observed.map((target) => ({
      isIntersecting,
      target,
      intersectionRatio: isIntersecting ? 1 : 0,
    }));
    this.callback(
      entries as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }

  /**
   * Force un appel du callback même après `disconnect()` — sert à prouver la
   * garde run-once INTERNE (drapeau `startedRef`), indépendamment de la
   * déconnexion de l'observer.
   */
  fireRaw(target: Element) {
    const entries: IOEntry[] = [
      { isIntersecting: true, target, intersectionRatio: 1 },
    ];
    this.callback(
      entries as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

const lastObserver = () => {
  const { instances } = MockIntersectionObserver;
  return instances[instances.length - 1];
};

// --- Horloge déterministe : requestAnimationFrame / cancelAnimationFrame / performance.now
let fakeNow = 0;
let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
let rafSeq = 0;

function installClock() {
  fakeNow = 0;
  rafQueue = [];
  rafSeq = 0;
  vi.spyOn(performance, "now").mockImplementation(() => fakeNow);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
    rafSeq += 1;
    rafQueue.push({ id: rafSeq, cb });
    return rafSeq;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
    rafQueue = rafQueue.filter((e) => e.id !== id);
  });
}

/** Avance l'horloge par frames de 16 ms en flushant les rAF (1 rAF = 1 frame). */
function advanceFrames(ms: number) {
  const end = fakeNow + ms;
  while (fakeNow < end) {
    fakeNow = Math.min(fakeNow + 16, end);
    const pending = rafQueue;
    rafQueue = [];
    pending.forEach((e) => e.cb(fakeNow));
  }
}

/** Stub matchMedia — `reduce=true` déclenche prefers-reduced-motion. */
function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  installClock();
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  MockIntersectionObserver.instances = [];
});

describe("useCountUp — tween au scroll (parité initAnimatedCounters)", () => {
  it("part à \"0\" et n'anime pas avant l'intersection", () => {
    render(createElement(Harness, { target: 1247 }));

    expect(readValue()).toBe("0");
    expect(readDone()).toBe("false");
    // L'observer est bien branché sur le nœud .counter, au seuil 0.3 par défaut.
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(lastObserver().options?.threshold).toBe(0.3);
    expect(lastObserver().observed[0]).toBe(
      document.querySelector(".counter"),
    );
  });

  it("interpole 0 → cible puis fige à l'entier (decimals absent → Math.floor)", () => {
    render(createElement(Harness, { target: 100 }));

    act(() => lastObserver().intersect(true));
    // Juste après l'intersection : le premier tick n'a pas encore couru.
    expect(readValue()).toBe("0");
    expect(readDone()).toBe("false");

    // Milieu du tween : valeur strictement entre 0 et la cible, pas encore fini.
    act(() => advanceFrames(200));
    const mid = Number(readValue());
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    expect(readDone()).toBe("false");

    // Fin du tween (> DURATION) : cible exacte, entier, done=true.
    act(() => advanceFrames(2000));
    expect(readValue()).toBe("100");
    expect(readDone()).toBe("true");
  });

  it("respecte decimals via toFixed (98.5 → \"98.5\", jamais \"98\" ni \"99\")", () => {
    render(createElement(Harness, { target: 98.5, options: { decimals: 1 } }));

    act(() => lastObserver().intersect(true));
    act(() => advanceFrames(2000));

    expect(readValue()).toBe("98.5");
    expect(readDone()).toBe("true");
  });

  it("passe le threshold custom à l'IntersectionObserver", () => {
    render(createElement(Harness, { target: 10, options: { threshold: 0.75 } }));
    expect(lastObserver().options?.threshold).toBe(0.75);
  });

  it("respecte une duration custom (tween plus court)", () => {
    render(createElement(Harness, { target: 50, options: { duration: 300 } }));

    act(() => lastObserver().intersect(true));
    act(() => advanceFrames(400)); // > 300 → terminé
    expect(readValue()).toBe("50");
    expect(readDone()).toBe("true");
  });
});

describe("useCountUp — garde run-once (≈ data-counted)", () => {
  it("déconnecte l'observer à la 1re intersection et ne redémarre pas à une ré-intersection", () => {
    render(createElement(Harness, { target: 100 }));
    const observer = lastObserver();

    act(() => observer.intersect(true));
    act(() => advanceFrames(2000));
    expect(readValue()).toBe("100");
    expect(readDone()).toBe("true");
    // Couche 1 de la garde : l'observer est déconnecté après le 1er trigger.
    expect(observer.disconnected).toBe(true);

    // Couche 2 : même si le navigateur rappelait le callback (fireRaw ignore le
    // disconnect), la valeur ne repart PAS de 0 (drapeau startedRef interne).
    const counter = document.querySelector(".counter") as Element;
    act(() => observer.fireRaw(counter));
    act(() => advanceFrames(500));
    expect(readValue()).toBe("100");
    expect(readDone()).toBe("true");
  });

  it("ne rejoue pas le tween sur un re-render du parent", () => {
    const { rerender } = render(createElement(Harness, { target: 100 }));

    act(() => lastObserver().intersect(true));
    act(() => advanceFrames(2000));
    expect(readValue()).toBe("100");

    // Re-render avec les mêmes props : pas de nouvel observer, pas de reset.
    const observersBefore = MockIntersectionObserver.instances.length;
    rerender(createElement(Harness, { target: 100 }));
    expect(MockIntersectionObserver.instances.length).toBe(observersBefore);
    expect(readValue()).toBe("100");
    expect(readDone()).toBe("true");
  });
});

describe("useCountUp — a11y prefers-reduced-motion (écart de parité assumé)", () => {
  it("saute directement à la cible formatée sans tween ni observer", () => {
    stubMatchMedia(true);
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");

    render(createElement(Harness, { target: 1247 }));

    // Valeur finale immédiate, done=true, AUCUN rAF, AUCUN observer créé.
    expect(readValue()).toBe("1247");
    expect(readDone()).toBe("true");
    expect(rafSpy).not.toHaveBeenCalled();
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("applique aussi le format decimals en reduced-motion", () => {
    stubMatchMedia(true);
    render(createElement(Harness, { target: 3.2, options: { decimals: 1 } }));
    expect(readValue()).toBe("3.2");
    expect(readDone()).toBe("true");
  });
});

describe("useCountUp — robustesse & opt-out", () => {
  it("présente la valeur finale quand IntersectionObserver est absent", () => {
    stubMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", undefined);

    render(createElement(Harness, { target: 42 }));

    expect(readValue()).toBe("42");
    expect(readDone()).toBe("true");
  });

  it("enabled:false → inerte : reste \"0\", done=false, aucun observer", () => {
    render(createElement(Harness, { target: 100, options: { enabled: false } }));

    expect(readValue()).toBe("0");
    expect(readDone()).toBe("false");
    expect(MockIntersectionObserver.instances).toHaveLength(0);

    // Même en avançant l'horloge, rien ne bouge (aucun tween planifié).
    act(() => advanceFrames(2000));
    expect(readValue()).toBe("0");
    expect(readDone()).toBe("false");
  });

  it("enabled false→true branche l'observer et anime au passage à true", () => {
    const { rerender } = render(
      createElement(Harness, { target: 100, options: { enabled: false } }),
    );
    expect(MockIntersectionObserver.instances).toHaveLength(0);

    rerender(
      createElement(Harness, { target: 100, options: { enabled: true } }),
    );
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    act(() => lastObserver().intersect(true));
    act(() => advanceFrames(2000));
    expect(readValue()).toBe("100");
    expect(readDone()).toBe("true");
  });
});

describe("useCountUp — cleanup", () => {
  it("déconnecte l'observer et annule le rAF au démontage (pas de fuite)", () => {
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { unmount } = render(createElement(Harness, { target: 100 }));
    const observer = lastObserver();

    // Tween en vol (non terminé) puis démontage.
    act(() => observer.intersect(true));
    act(() => advanceFrames(100)); // < DURATION → rAF encore en vol
    expect(readDone()).toBe("false");

    unmount();

    expect(observer.disconnected).toBe(true);
    expect(cancelSpy).toHaveBeenCalled();
  });
});
