import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { Pricing, PricingPlan } from "./Pricing";

afterEach(() => {
  cleanup();
});

const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { id: "f1", label: "3 projets", icon: "✓" },
      { id: "f2", label: "API access", icon: "✕", disabled: true },
    ],
    cta: <button>Commencer gratuitement</button>,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    priceYearly: 15,
    description: "Pour les équipes.",
    features: [{ id: "f1", label: "Projets illimités", icon: "✓" }],
    cta: <button>Essayer 14 jours</button>,
    recommended: true,
  },
];

function Controlled(props: { initialYearly?: boolean }) {
  const [yearly, setYearly] = useState(props.initialYearly ?? false);
  return (
    <Pricing
      plans={PLANS}
      yearly={yearly}
      onYearlyChange={setYearly}
      discountBadge="-20%"
    />
  );
}

describe("Pricing", () => {
  it("rend une carte par plan avec le montant mensuel par défaut", () => {
    render(<Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />);
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("pose .pricing-card--recommended + badge sur le plan recommandé", () => {
    render(<Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />);
    const proCard = screen.getByText("Pro").closest(".pricing-card");
    expect(proCard).toHaveClass("pricing-card--recommended");
    expect(screen.getByText("Recommandé")).toBeInTheDocument();
  });

  it("pose .pricing-feature--disabled sur les features désactivées", () => {
    render(<Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />);
    const disabledFeature = screen.getByText("API access").closest("li");
    expect(disabledFeature).toHaveClass("pricing-feature--disabled");
  });

  it("role=switch + aria-checked=false par défaut, .yearly absent", () => {
    render(<Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(sw).not.toHaveClass("yearly");
  });

  it("yearly=true pose .yearly + aria-checked=true + montant annuel", () => {
    render(<Pricing plans={PLANS} yearly={true} onYearlyChange={() => {}} />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveClass("yearly");
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("clic sur le switch appelle onYearlyChange avec la valeur inversée", () => {
    const onYearlyChange = vi.fn();
    render(
      <Pricing plans={PLANS} yearly={false} onYearlyChange={onYearlyChange} />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onYearlyChange).toHaveBeenCalledWith(true);
  });

  it("Espace/Entrée sur le switch togglent aussi", () => {
    const onYearlyChange = vi.fn();
    render(
      <Pricing plans={PLANS} yearly={false} onYearlyChange={onYearlyChange} />,
    );
    const sw = screen.getByRole("switch");
    fireEvent.keyDown(sw, { key: " " });
    fireEvent.keyDown(sw, { key: "Enter" });
    expect(onYearlyChange).toHaveBeenCalledTimes(2);
  });

  it("bascule .pricing-toggle-label.active entre mensuel/annuel", () => {
    const { rerender } = render(
      <Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />,
    );
    expect(screen.getByText("Mensuel")).toHaveClass("active");
    expect(screen.getByText("Annuel")).not.toHaveClass("active");

    rerender(<Pricing plans={PLANS} yearly={true} onYearlyChange={() => {}} />);
    expect(screen.getByText("Mensuel")).not.toHaveClass("active");
    expect(screen.getByText("Annuel")).toHaveClass("active");
  });

  it("affiche le badge de remise si fourni, l'omet sinon", () => {
    const { rerender } = render(
      <Pricing
        plans={PLANS}
        yearly={false}
        onYearlyChange={() => {}}
        discountBadge="-20%"
      />,
    );
    expect(screen.getByText("-20%")).toBeInTheDocument();

    rerender(<Pricing plans={PLANS} yearly={false} onYearlyChange={() => {}} />);
    expect(screen.queryByText("-20%")).not.toBeInTheDocument();
  });

  it("entièrement contrôlé : un cycle complet via un parent réel", () => {
    render(<Controlled />);
    expect(screen.getByText("19")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveClass("yearly");
  });
});
