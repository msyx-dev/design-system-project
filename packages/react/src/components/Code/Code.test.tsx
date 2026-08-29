import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CodeBlock,
  CodeComment,
  CodeFunction,
  CodeKeyword,
  CodeNumber,
  CodeString,
  CopyButton,
  InlineCode,
} from "./Code";

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

function clearClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearClipboard();
  vi.useRealTimers();
});

describe("CopyButton — structure et variantes", () => {
  it("rend .copy-btn avec aria-label par défaut 'Copier'", () => {
    mockClipboard();
    render(<CopyButton text="hello" />);
    const btn = document.querySelector(".copy-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Copier");
    expect(btn).not.toHaveClass("copy-btn--icon", "copy-btn--inline");
  });

  it("applique .copy-btn--icon / .copy-btn--inline selon variant", () => {
    mockClipboard();
    const { rerender } = render(<CopyButton text="x" variant="icon" />);
    expect(document.querySelector(".copy-btn")).toHaveClass("copy-btn--icon");

    rerender(<CopyButton text="x" variant="inline" />);
    expect(document.querySelector(".copy-btn")).toHaveClass("copy-btn--inline");
  });

  it("rend .copy-icon et .copy-tooltip", () => {
    mockClipboard();
    render(<CopyButton text="x" />);
    expect(document.querySelector(".copy-icon")).toBeInTheDocument();
    expect(document.querySelector(".copy-tooltip")).toHaveTextContent(
      "Copie !",
    );
  });
});

describe("CopyButton — copie réussie", () => {
  it("clic copie `text` via navigator.clipboard.writeText et pose .copy-btn--success", async () => {
    const writeText = mockClipboard();
    render(<CopyButton text="texte à copier" />);
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;

    fireEvent.click(btn);
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("texte à copier");
    expect(btn).toHaveClass("copy-btn--success");
  });

  it("retire .copy-btn--success après 2000ms", async () => {
    mockClipboard();
    render(<CopyButton text="x" />);
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;

    fireEvent.click(btn);
    await act(async () => {
      await Promise.resolve();
    });
    expect(btn).toHaveClass("copy-btn--success");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(btn).not.toHaveClass("copy-btn--success");
  });

  it("getText est appelé au clic (lazy) plutôt que `text`", async () => {
    const writeText = mockClipboard();
    const getText = vi.fn(() => "valeur live");
    render(<CopyButton getText={getText} text="ignoré" />);

    fireEvent.click(document.querySelector(".copy-btn") as HTMLButtonElement);
    await act(async () => {
      await Promise.resolve();
    });

    expect(getText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("valeur live");
  });
});

describe("CopyButton — robustesse (issue #874)", () => {
  it("navigator.clipboard indisponible — no-op silencieux, pas de .copy-btn--success", () => {
    clearClipboard();
    render(<CopyButton text="x" />);
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;

    expect(() => fireEvent.click(btn)).not.toThrow();
    expect(btn).not.toHaveClass("copy-btn--success");
  });

  it("writeText rejetée (permission refusée) — pas de .copy-btn--success, pas d'exception non gérée", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<CopyButton text="x" />);
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;

    fireEvent.click(btn);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(btn).not.toHaveClass("copy-btn--success");
  });
});

describe("CodeBlock — structure et copie intégrée", () => {
  it("rend .code-block-wrap > .code-block[tabindex=0] + CopyButton inline", () => {
    mockClipboard();
    render(
      <CodeBlock>
        <CodeKeyword>const</CodeKeyword> x = <CodeNumber>1</CodeNumber>;
      </CodeBlock>,
    );

    const wrap = document.querySelector(".code-block-wrap");
    expect(wrap).toBeInTheDocument();
    const block = wrap?.querySelector(".code-block");
    expect(block).toHaveAttribute("tabindex", "0");
    const copyBtn = wrap?.querySelector(".copy-btn");
    expect(copyBtn).toHaveClass("copy-btn--inline");
  });

  it("copyable=false n'injecte aucun bouton de copie", () => {
    render(<CodeBlock copyable={false}>test</CodeBlock>);
    expect(document.querySelector(".copy-btn")).not.toBeInTheDocument();
  });

  it("le clic sur le bouton copie le textContent live du bloc (pas une prop figée)", async () => {
    const writeText = mockClipboard();
    render(
      <CodeBlock>
        <CodeComment>{"// hello"}</CodeComment>
        <br />
        <CodeFunction>deploy</CodeFunction>(<CodeString>"prod"</CodeString>)
      </CodeBlock>,
    );

    fireEvent.click(document.querySelector(".copy-btn") as HTMLButtonElement);
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('// hellodeploy("prod")');
  });
});

describe("InlineCode et primitives de coloration", () => {
  it("InlineCode rend <code class='code-inline'>", () => {
    render(<InlineCode>docker compose up -d</InlineCode>);
    const el = screen.getByText("docker compose up -d");
    expect(el.tagName).toBe("CODE");
    expect(el).toHaveClass("code-inline");
  });

  it("les primitives de token émettent leur classe respective", () => {
    render(
      <div>
        <CodeKeyword>const</CodeKeyword>
        <CodeString>"x"</CodeString>
        <CodeComment>{"/* c */"}</CodeComment>
        <CodeFunction>fn</CodeFunction>
        <CodeNumber>42</CodeNumber>
      </div>,
    );
    expect(screen.getByText("const")).toHaveClass("kw");
    expect(screen.getByText('"x"')).toHaveClass("str");
    expect(screen.getByText("/* c */")).toHaveClass("cm");
    expect(screen.getByText("fn")).toHaveClass("fn");
    expect(screen.getByText("42")).toHaveClass("num");
  });
});
