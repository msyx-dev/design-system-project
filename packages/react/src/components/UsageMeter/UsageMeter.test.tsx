import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { UsageMeter } from "./UsageMeter";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // Nettoie un éventuel stub matchMedia posé dans un test.
  // @ts-expect-error suppression du stub de test
  delete window.matchMedia;
});

const fill = () => document.querySelector(".usage-fill") as HTMLElement;
const track = () => document.querySelector(".usage-meter-track") as HTMLElement;

describe("UsageMeter — structure & markup canonique", () => {
  it("rend .usage-meter > .usage-meter-header (label/value) + .usage-meter-track > .usage-fill + .usage-meter-hint", () => {
    render(
      <UsageMeter
        value={30}
        label="Stockage"
        valueLabel="300 Mo / 1 Go"
        hint="30% utilisé — OK"
        animate={false}
      />,
    );

    expect(document.querySelector(".usage-meter")).toBeInTheDocument();
    expect(document.querySelector(".usage-meter-header")).toBeInTheDocument();
    expect(document.querySelector(".usage-meter-label")).toHaveTextContent(
      "Stockage",
    );
    expect(document.querySelector(".usage-meter-value")).toHaveTextContent(
      "300 Mo / 1 Go",
    );
    expect(track()).toBeInTheDocument();
    expect(fill()).toBeInTheDocument();
    expect(document.querySelector(".usage-meter-hint")).toHaveTextContent(
      "30% utilisé — OK",
    );
  });

  it("n'ajoute pas de classe de variante hardcodée hors --ok/--warn/--danger + applique className additionnelle", () => {
    render(<UsageMeter value={10} className="ma-classe" animate={false} />);
    expect(document.querySelector(".usage-meter")).toHaveClass("ma-classe");
    expect(fill()).toHaveClass("usage-fill");
  });

  it("n'a PAS de header quand ni label ni valueLabel ne sont fournis", () => {
    render(<UsageMeter value={45} animate={false} />);
    expect(document.querySelector(".usage-meter-header")).not.toBeInTheDocument();
    expect(document.querySelector(".usage-meter-label")).not.toBeInTheDocument();
    expect(document.querySelector(".usage-meter-value")).not.toBeInTheDocument();
  });

  it("rend le header si SEUL valueLabel est fourni (label omis)", () => {
    render(<UsageMeter value={60} valueLabel="60%" animate={false} />);
    expect(document.querySelector(".usage-meter-header")).toBeInTheDocument();
    expect(document.querySelector(".usage-meter-value")).toHaveTextContent("60%");
    expect(document.querySelector(".usage-meter-label")).not.toBeInTheDocument();
  });

  it("n'a PAS de hint quand hint est omis", () => {
    render(<UsageMeter value={45} label="Bande passante" animate={false} />);
    expect(document.querySelector(".usage-meter-hint")).not.toBeInTheDocument();
  });
});

describe("UsageMeter — PIÈGE largeur inline (.usage-fill sans width = invisible)", () => {
  it("pose style width = value% inline sur .usage-fill (animate=false)", () => {
    render(<UsageMeter value={72} animate={false} />);
    expect(fill().style.width).toBe("72%");
    expect(fill()).toHaveStyle({ width: "72%" });
  });

  it("width à 0% pour value=0", () => {
    render(<UsageMeter value={0} animate={false} />);
    expect(fill().style.width).toBe("0%");
  });

  it("width à 100% pour value=100", () => {
    render(<UsageMeter value={100} animate={false} />);
    expect(fill().style.width).toBe("100%");
  });
});

describe("UsageMeter — variante explicite (.usage-fill--{ok|warn|danger})", () => {
  it("variant par défaut = ok", () => {
    render(<UsageMeter value={10} animate={false} />);
    expect(fill()).toHaveClass("usage-fill--ok");
    expect(fill()).not.toHaveClass("usage-fill--warn");
    expect(fill()).not.toHaveClass("usage-fill--danger");
  });

  it("variant='warn' pose .usage-fill--warn", () => {
    render(<UsageMeter value={70} variant="warn" animate={false} />);
    expect(fill()).toHaveClass("usage-fill--warn");
  });

  it("variant='danger' pose .usage-fill--danger (déclencheur du pulse @keyframes usagePulse)", () => {
    render(<UsageMeter value={95} variant="danger" animate={false} />);
    expect(fill()).toHaveClass("usage-fill--danger");
  });

  it("variant explicite est prioritaire sur thresholds", () => {
    render(
      <UsageMeter
        value={10}
        variant="danger"
        thresholds={[60, 80]}
        animate={false}
      />,
    );
    // value 10 tomberait en ok via thresholds, mais variant force danger.
    expect(fill()).toHaveClass("usage-fill--danger");
    expect(fill()).not.toHaveClass("usage-fill--ok");
  });
});

describe("UsageMeter — thresholds auto-calcul [warnAt, dangerAt]", () => {
  it("value < warnAt ⇒ ok", () => {
    render(<UsageMeter value={45} thresholds={[60, 80]} animate={false} />);
    expect(fill()).toHaveClass("usage-fill--ok");
  });

  it("value == warnAt ⇒ warn (borne inférieure inclusive)", () => {
    render(<UsageMeter value={60} thresholds={[60, 80]} animate={false} />);
    expect(fill()).toHaveClass("usage-fill--warn");
  });

  it("value == dangerAt ⇒ warn (borne dangerAt inclusive côté warn)", () => {
    render(<UsageMeter value={80} thresholds={[60, 80]} animate={false} />);
    expect(fill()).toHaveClass("usage-fill--warn");
  });

  it("value > dangerAt ⇒ danger", () => {
    render(<UsageMeter value={95} thresholds={[60, 80]} animate={false} />);
    expect(fill()).toHaveClass("usage-fill--danger");
  });
});

describe("UsageMeter — bornage & arrondi de value", () => {
  it("clamp value > 100 → width 100% + aria-valuenow 100", () => {
    render(<UsageMeter value={150} animate={false} />);
    expect(fill().style.width).toBe("100%");
    expect(track()).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamp value < 0 → width 0% + aria-valuenow 0", () => {
    render(<UsageMeter value={-10} animate={false} />);
    expect(fill().style.width).toBe("0%");
    expect(track()).toHaveAttribute("aria-valuenow", "0");
  });

  it("arrondit une value fractionnaire pour width et aria-valuenow", () => {
    render(<UsageMeter value={72.6} animate={false} />);
    expect(fill().style.width).toBe("73%");
    expect(track()).toHaveAttribute("aria-valuenow", "73");
  });
});

describe("UsageMeter — a11y progressbar sur .usage-meter-track (gap vanilla, #613)", () => {
  it("le track porte role=progressbar + aria-valuemin/max/now", () => {
    render(<UsageMeter value={30} animate={false} />);
    const bar = track();
    expect(bar).toHaveAttribute("role", "progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "30");
  });

  it("le .usage-fill NE porte PAS role=progressbar (l'ARIA est sur le track)", () => {
    render(<UsageMeter value={30} animate={false} />);
    expect(fill()).not.toHaveAttribute("role");
    expect(fill()).not.toHaveAttribute("aria-valuenow");
  });

  it("aria-label dérivé du label quand label est une chaîne", () => {
    render(<UsageMeter value={30} label="Stockage" animate={false} />);
    expect(track()).toHaveAttribute("aria-label", "Stockage");
  });

  it("aria-label depuis la prop ariaLabel quand pas de header (barre sans label)", () => {
    render(<UsageMeter value={45} ariaLabel="Bande passante" animate={false} />);
    expect(track()).toHaveAttribute("aria-label", "Bande passante");
  });

  it("ariaLabel est prioritaire sur label pour aria-label", () => {
    render(
      <UsageMeter
        value={30}
        label="Stockage"
        ariaLabel="Quota stockage"
        animate={false}
      />,
    );
    expect(track()).toHaveAttribute("aria-label", "Quota stockage");
  });

  it("aria-valuetext dérivé de valueLabel quand c'est une chaîne", () => {
    render(
      <UsageMeter value={30} valueLabel="300 Mo / 1 Go" animate={false} />,
    );
    expect(track()).toHaveAttribute("aria-valuetext", "300 Mo / 1 Go");
  });

  it("pas d'aria-label ni aria-valuetext quand ni label/ariaLabel ni valueLabel string", () => {
    render(<UsageMeter value={30} animate={false} />);
    expect(track()).not.toHaveAttribute("aria-label");
    expect(track()).not.toHaveAttribute("aria-valuetext");
  });
});

describe("UsageMeter — animation d'entrée (0 → value via transition CSS)", () => {
  it("animate (défaut) : width part de 0% au montage, puis atteint value%", async () => {
    render(<UsageMeter value={40} label="RAM" />);
    // Avant le rAF, la largeur cible n'est pas encore posée (paint à 0).
    expect(fill().style.width).toBe("0%");
    // Après le rAF, la transition CSS peut jouer 0 → 40%.
    await waitFor(() => expect(fill().style.width).toBe("40%"));
    // La classe de variante est présente dès le montage (danger animerait le pulse).
    expect(fill()).toHaveClass("usage-fill--ok");
  });

  it("animate=false : width posée directement à value% (aucun état 0 intermédiaire)", () => {
    render(<UsageMeter value={82} animate={false} />);
    expect(fill().style.width).toBe("82%");
  });

  it("prefers-reduced-motion : rendu direct à value% sans passer par rAF", () => {
    const rafSpy = vi.fn();
    vi.stubGlobal("requestAnimationFrame", rafSpy);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<UsageMeter value={55} />);

    expect(fill().style.width).toBe("55%");
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("SSR-safe : matchMedia absent (jsdom par défaut) n'empêche pas d'atteindre value%", async () => {
    // window.matchMedia est supprimé dans afterEach → absent ici.
    render(<UsageMeter value={12} />);
    await waitFor(() => expect(fill().style.width).toBe("12%"));
  });
});
