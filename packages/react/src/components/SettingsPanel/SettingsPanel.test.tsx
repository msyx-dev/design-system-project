import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  SettingsPanel,
  SettingsRowInput,
  SettingsRowSelect,
  SettingsSection,
} from "./SettingsPanel";
import { Toggle } from "../Input/Toggle";
import { Button } from "../Button/Button";

afterEach(() => {
  cleanup();
});

function makeSections(onToggle: () => void): SettingsSection[] {
  return [
    {
      id: "account",
      title: "Compte",
      rows: [
        {
          id: "name",
          label: "Nom d'affichage",
          description: "Visible par les autres membres",
          control: <SettingsRowInput defaultValue="Mike" aria-label="Nom d'affichage" />,
        },
        {
          id: "lang",
          label: "Langue",
          control: (
            <SettingsRowSelect aria-label="Langue">
              <option>Français</option>
              <option>English</option>
            </SettingsRowSelect>
          ),
        },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      rows: [
        {
          id: "email",
          label: "Notifications email",
          control: (
            <Toggle
              defaultChecked
              aria-label="Notifications email"
              onChange={onToggle}
            />
          ),
        },
      ],
    },
    {
      id: "danger",
      title: "Zone danger",
      danger: true,
      rows: [
        {
          id: "delete",
          label: "Supprimer le compte",
          description: "Action irréversible",
          control: (
            <Button variant="danger" size="sm">
              Supprimer
            </Button>
          ),
        },
      ],
    },
  ];
}

describe("SettingsPanel", () => {
  it("rend une section par entrée avec son titre", () => {
    render(<SettingsPanel sections={makeSections(() => {})} />);
    expect(screen.getByText("Compte")).toHaveClass("settings-section-title");
    expect(screen.getByText("Notifications")).toHaveClass(
      "settings-section-title",
    );
  });

  it("pose .settings-danger uniquement sur la section marquée danger", () => {
    render(<SettingsPanel sections={makeSections(() => {})} />);
    expect(screen.getByText("Zone danger").closest(".settings-section")).toHaveClass(
      "settings-danger",
    );
    expect(screen.getByText("Compte").closest(".settings-section")).not.toHaveClass(
      "settings-danger",
    );
  });

  it("rend label + description + control dans une row", () => {
    render(<SettingsPanel sections={makeSections(() => {})} />);
    const row = screen.getByText("Nom d'affichage").closest(".settings-row")!;
    expect(row.querySelector(".settings-row-desc")?.textContent).toBe(
      "Visible par les autres membres",
    );
    expect(row.querySelector(".settings-row-control input")).toHaveClass(
      "settings-row-input",
    );
  });

  it("compose <Toggle> déjà porté et son interaction fonctionne", () => {
    const onToggle = vi.fn();
    render(<SettingsPanel sections={makeSections(onToggle)} />);
    const toggle = screen.getByLabelText("Notifications email");
    expect(toggle.closest("label")).toHaveClass("toggle");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("compose <Button variant=danger> dans la zone danger", () => {
    render(<SettingsPanel sections={makeSections(() => {})} />);
    const btn = screen.getByText("Supprimer");
    expect(btn).toHaveClass("btn-danger");
    expect(btn).toHaveClass("btn-sm");
  });

  it("SettingsRowSelect émet .settings-row-select avec ses options", () => {
    render(<SettingsPanel sections={makeSections(() => {})} />);
    const select = screen.getByLabelText("Langue");
    expect(select).toHaveClass("settings-row-select");
    expect(select.querySelectorAll("option")).toHaveLength(2);
  });
});
