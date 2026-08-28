import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar, AvatarGroup, AvatarSize } from "./Avatar";

afterEach(() => {
  cleanup();
});

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

describe("Avatar — tailles & variantes", () => {
  it.each(SIZES)("size=%s émet .avatar.avatar-%s", (size) => {
    render(<Avatar size={size}>MS</Avatar>);
    expect(
      document.querySelector(`.avatar.avatar-${size}`),
    ).toBeInTheDocument();
  });

  it("size par défaut = md", () => {
    render(<Avatar>MS</Avatar>);
    expect(document.querySelector(".avatar.avatar-md")).toBeInTheDocument();
  });

  it("gradient ajoute .avatar-gradient", () => {
    render(<Avatar gradient>AI</Avatar>);
    const el = document.querySelector(".avatar") as HTMLElement;
    expect(el.classList.contains("avatar-gradient")).toBe(true);
  });

  it("sans gradient, .avatar-gradient absent", () => {
    render(<Avatar>AI</Avatar>);
    const el = document.querySelector(".avatar") as HTMLElement;
    expect(el.classList.contains("avatar-gradient")).toBe(false);
  });

  it("src rend une <img class='avatar-img'> plutôt que children", () => {
    render(
      <Avatar src="/photo.jpg" alt="Prénom Nom">
        MS
      </Avatar>,
    );
    const img = document.querySelector("img.avatar-img") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/photo.jpg");
    expect(img).toHaveAttribute("alt", "Prénom Nom");
    expect(document.querySelector(".avatar")).not.toHaveTextContent("MS");
  });

  it("status enveloppe l'avatar dans .avatar-status.{status}", () => {
    render(<Avatar status="online">A</Avatar>);
    const wrapper = document.querySelector(".avatar-status") as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.classList.contains("online")).toBe(true);
    expect(wrapper.querySelector(".avatar")).toBeInTheDocument();
  });

  it.each(["online", "busy", "offline"] as const)(
    "status=%s applique la classe correspondante",
    (status) => {
      render(<Avatar status={status}>A</Avatar>);
      expect(
        document.querySelector(`.avatar-status.${status}`),
      ).toBeInTheDocument();
    },
  );

  it("sans status, aucun wrapper .avatar-status n'est rendu", () => {
    render(<Avatar>A</Avatar>);
    expect(document.querySelector(".avatar-status")).not.toBeInTheDocument();
  });
});

describe("AvatarGroup", () => {
  it("émet .avatar-group contenant les avatars enfants", () => {
    render(
      <AvatarGroup>
        <Avatar size="sm">A</Avatar>
        <Avatar size="sm">B</Avatar>
        <Avatar size="sm">C</Avatar>
      </AvatarGroup>,
    );
    const group = document.querySelector(".avatar-group") as HTMLElement;
    expect(group).toBeInTheDocument();
    expect(group.querySelectorAll(".avatar")).toHaveLength(3);
  });

  it("className additionnelle est fusionnée", () => {
    render(<AvatarGroup className="custom" />);
    expect(document.querySelector(".avatar-group.custom")).toBeInTheDocument();
  });
});
