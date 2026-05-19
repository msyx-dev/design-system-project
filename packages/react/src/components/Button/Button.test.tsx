import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button — variants", () => {
  it("renders with variant primary", () => {
    render(<Button variant="primary">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");
  });

  it("renders with variant secondary", () => {
    render(<Button variant="secondary">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-secondary");
  });

  it("renders with variant ghost", () => {
    render(<Button variant="ghost">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-ghost");
  });

  it("renders with variant danger", () => {
    render(<Button variant="danger">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-danger");
  });

  it("uses primary as default variant", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");
  });
});

describe("Button — sizes", () => {
  it("renders size sm with class btn-sm", () => {
    render(<Button size="sm">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-sm");
  });

  it("renders size md without size modifier class", () => {
    render(<Button size="md">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn).not.toHaveClass("btn-md");
    expect(btn).not.toHaveClass("btn-sm");
    expect(btn).not.toHaveClass("btn-lg");
  });

  it("renders size lg with class btn-lg", () => {
    render(<Button size="lg">Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-lg");
  });
});

describe("Button — loading state", () => {
  it("adds btn-loading class when loading=true", () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-loading");
  });

  it("sets aria-busy=true when loading", () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("is disabled when loading", () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("sets aria-disabled=true when loading", () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("does not fire onClick when loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Click
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button — disabled state", () => {
  it("is disabled when disabled=true", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("sets aria-disabled=true when disabled", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Click
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button — icons", () => {
  it("renders leftIcon with data-testid btn-icon-left", () => {
    render(<Button leftIcon={<span>L</span>}>Click</Button>);
    expect(screen.getByTestId("btn-icon-left")).toBeInTheDocument();
  });

  it("renders rightIcon with data-testid btn-icon-right", () => {
    render(<Button rightIcon={<span>R</span>}>Click</Button>);
    expect(screen.getByTestId("btn-icon-right")).toBeInTheDocument();
  });

  it("renders both icons simultaneously", () => {
    render(
      <Button leftIcon={<span>L</span>} rightIcon={<span>R</span>}>
        Click
      </Button>,
    );
    expect(screen.getByTestId("btn-icon-left")).toBeInTheDocument();
    expect(screen.getByTestId("btn-icon-right")).toBeInTheDocument();
  });

  it("does not render icon wrappers when no icons provided", () => {
    render(<Button>Click</Button>);
    expect(screen.queryByTestId("btn-icon-left")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-icon-right")).not.toBeInTheDocument();
  });
});

describe("Button — forwardRef", () => {
  it("forwards ref to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
  });
});

describe("Button — onClick", () => {
  it("fires onClick in normal state", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button — fullWidth", () => {
  it("applies width 100% style when fullWidth=true", () => {
    render(<Button fullWidth>Click</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ width: "100%" });
  });

  it("does not apply width style when fullWidth=false", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).not.toHaveStyle({ width: "100%" });
  });
});

describe("Button — className merge", () => {
  it("preserves custom className alongside variant class", () => {
    render(<Button className="mt-4 custom">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("btn-primary");
    expect(btn).toHaveClass("mt-4");
    expect(btn).toHaveClass("custom");
  });
});

describe("Button — a11y", () => {
  it("aria-busy is false by default", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
  });

  it("aria-disabled is false by default", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });
});
