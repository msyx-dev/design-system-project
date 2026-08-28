// @msyx-dev/react — verrou export public (#870)
//
// `Icon` (packages/react/src/icons/Icon.tsx) est consommé par plus de dix
// wrappers internes (Calendar, Dropdown, TreeView, TransferList,
// ThemeToggle, Accordion, SplitButton, ContextMenu, VersionNotes,
// UserFeedbackButton…) mais était absent de `index.ts` : un consumer ne
// pouvait pas faire `import { Icon } from "@msyx-dev/react"`. Ce test
// échoue si l'export public régresse.

import { describe, expect, it } from "vitest";
import { Icon } from "./index";

describe("index.ts — entrée publique du package (#870)", () => {
  it("exporte Icon", () => {
    expect(typeof Icon).toBe("function");
  });
});
