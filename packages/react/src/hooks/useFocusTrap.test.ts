import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { FOCUS_TRAP_SELECTOR } from "./useFocusTrap";

/**
 * Le comportement du piège est couvert par les surfaces qui l'utilisent
 * (`Drawer.test.tsx`, `BottomSheet.test.tsx`, #862). Ce fichier verrouille le
 * seul contrat que ces tests ne peuvent pas voir : la liste des éléments
 * focalisables doit rester IDENTIQUE à celle du DS vanilla. Une divergence
 * silencieuse (React piégeant un ensemble d'éléments different du vanilla)
 * produirait deux comportements clavier pour un même markup selon la techno
 * du consumer — exactement ce que le DS existe pour empêcher.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_JS = readFileSync(
  path.resolve(__dirname, "../../../../shared/components.js"),
  "utf8",
);

describe("useFocusTrap — contrat partagé avec le vanilla (#862)", () => {
  it("FOCUS_TRAP_SELECTOR est identique au FOCUSABLE_SELECTOR de shared/components.js (#825)", () => {
    const match = COMPONENTS_JS.match(/var FOCUSABLE_SELECTOR = '([^']+)';/);
    expect(
      match,
      "FOCUSABLE_SELECTOR introuvable dans shared/components.js",
    ).not.toBeNull();
    expect(FOCUS_TRAP_SELECTOR).toBe(match![1]);
  });

  it("couvre les 6 familles d'elements focalisables et exclut tabindex=-1", () => {
    expect(FOCUS_TRAP_SELECTOR).toContain("a[href]");
    expect(FOCUS_TRAP_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUS_TRAP_SELECTOR).toContain("input:not([disabled])");
    expect(FOCUS_TRAP_SELECTOR).toContain("select:not([disabled])");
    expect(FOCUS_TRAP_SELECTOR).toContain("textarea:not([disabled])");
    expect(FOCUS_TRAP_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });
});
