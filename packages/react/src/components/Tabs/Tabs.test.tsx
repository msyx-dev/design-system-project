import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { Tabs, TabItem } from "./Tabs";

const ITEMS: TabItem[] = [
  { id: "general", label: "General", content: "Contenu General" },
  { id: "securite", label: "Securite", content: "Contenu Securite" },
  {
    id: "notifications",
    label: "Notifications",
    content: "Contenu Notifications",
  },
];

const ITEMS_WITH_DISABLED: TabItem[] = [
  { id: "a", label: "A", content: "Contenu A" },
  { id: "b", label: "B", content: "Contenu B", disabled: true },
  { id: "c", label: "C", content: "Contenu C" },
];

describe("Tabs — structure", () => {
  it("rend le markup canonique .tabs/.tab avec role=tablist/tab", () => {
    render(<Tabs items={ITEMS} value="general" onChange={() => {}} />);

    const tablist = document.querySelector(".tabs");
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute("role", "tablist");

    const tabs = document.querySelectorAll(".tab");
    expect(tabs).toHaveLength(3);
    tabs.forEach((tab) => expect(tab).toHaveAttribute("role", "tab"));
  });

  it("rend N tabs et seul le panel actif est visible", () => {
    render(<Tabs items={ITEMS} value="securite" onChange={() => {}} />);

    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(3);

    const activePanel = screen.getByText("Contenu Securite");
    expect(activePanel.closest('[role="tabpanel"]')).not.toHaveAttribute(
      "hidden",
    );

    const generalPanel = document.getElementById("tabpanel-general");
    expect(generalPanel).toHaveAttribute("hidden");
  });

  it("applique la classe active uniquement sur l'onglet sélectionné", () => {
    render(<Tabs items={ITEMS} value="notifications" onChange={() => {}} />);

    const activeTab = document.getElementById("tab-notifications");
    expect(activeTab).toHaveClass("tab", "active");

    const inactiveTab = document.getElementById("tab-general");
    expect(inactiveTab).toHaveClass("tab");
    expect(inactiveTab).not.toHaveClass("active");
  });

  it("aria-selected/aria-controls/tabindex corrects (roving tabindex)", () => {
    render(<Tabs items={ITEMS} value="general" onChange={() => {}} />);

    const activeTab = document.getElementById("tab-general") as HTMLElement;
    const inactiveTab = document.getElementById("tab-securite") as HTMLElement;

    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(activeTab).toHaveAttribute("aria-controls", "tabpanel-general");

    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
    expect(inactiveTab).toHaveAttribute("tabindex", "-1");
  });

  it("aria-labelledby du tabpanel référence le bon tab", () => {
    render(<Tabs items={ITEMS} value="general" onChange={() => {}} />);
    const panel = document.getElementById("tabpanel-general");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-general");
  });

  it("applique aria-label sur le tablist via la prop label", () => {
    render(
      <Tabs
        items={ITEMS}
        value="general"
        onChange={() => {}}
        label="Paramètres"
      />,
    );
    expect(document.querySelector(".tabs")).toHaveAttribute(
      "aria-label",
      "Paramètres",
    );
  });
});

describe("Tabs — interaction souris", () => {
  it("clic sur un onglet appelle onChange avec son id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs items={ITEMS} value="general" onChange={onChange} />);

    await user.click(screen.getByText("Securite"));

    expect(onChange).toHaveBeenCalledWith("securite");
  });

  it("clic sur un onglet disabled n'appelle pas onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs items={ITEMS_WITH_DISABLED} value="a" onChange={onChange} />);

    const disabledTab = document.getElementById("tab-b") as HTMLButtonElement;
    expect(disabledTab).toBeDisabled();

    await user.click(disabledTab);
    expect(onChange).not.toHaveBeenCalled();
  });
});

function ControlledHarness({ items }: { items: TabItem[] }) {
  const [value, setValue] = useState(items[0].id);
  return <Tabs items={items} value={value} onChange={setValue} />;
}

describe("Tabs — navigation clavier WAI-ARIA", () => {
  it("ArrowRight déplace la sélection vers l'onglet suivant et le focus suit", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness items={ITEMS} />);

    const first = document.getElementById("tab-general") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(document.getElementById("tab-securite")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowLeft boucle vers le dernier onglet depuis le premier", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness items={ITEMS} />);

    const first = document.getElementById("tab-general") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowLeft}");

    expect(document.getElementById("tab-notifications")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowRight boucle vers le premier onglet depuis le dernier", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness items={ITEMS} />);

    const last = document.getElementById("tab-notifications") as HTMLElement;
    last.focus();
    await user.keyboard("{ArrowRight}");

    expect(document.getElementById("tab-general")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("End sélectionne le dernier onglet, Home revient au premier", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness items={ITEMS} />);

    const first = document.getElementById("tab-general") as HTMLElement;
    first.focus();
    await user.keyboard("{End}");
    expect(document.getElementById("tab-notifications")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{Home}");
    expect(document.getElementById("tab-general")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("la navigation clavier saute les onglets disabled", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness items={ITEMS_WITH_DISABLED} />);

    const first = document.getElementById("tab-a") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");

    // "b" est disabled, doit sauter directement à "c"
    expect(document.getElementById("tab-c")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
