import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { copy } from "./copy";
import { system } from "./test/setup";

const routes = [
  { link: copy.nav.trail, heading: copy.trail.title },
  { link: copy.nav.review, heading: copy.review.title },
  { link: copy.nav.profile, heading: copy.profile.title },
  { link: copy.nav.settings, heading: copy.settings.title },
  { link: copy.nav.home, heading: copy.home.title },
];

describe("navegação (001 CA-4)", () => {
  it("cada item do menu leva à sua rota e fica destacado", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const { link, heading } of routes) {
      const item = screen.getByRole("link", { name: link });
      await user.click(item);

      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(heading);
      expect(item.getAttribute("aria-current")).toBe("page");
      const active = screen
        .getAllByRole("link")
        .filter((a) => a.getAttribute("aria-current") === "page");
      expect(active).toHaveLength(1);
    }
  });

  it("a trilha lista as questões e leva à tela da questão", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.trail }));
    await user.click(await screen.findByRole("link", { name: /Demo: Add Two Numbers/ }));

    expect(window.location.hash).toBe("#/problem/demo-add");
    expect(
      (await screen.findByRole("heading", { level: 1 })).textContent,
    ).toBe("Demo: Add Two Numbers");
  });
});

describe("tema (001 CA-5)", () => {
  const theme = () => document.documentElement.dataset.theme;

  it("automático + sistema escuro abre no tema escuro", async () => {
    system.dark = true;
    render(<App />);
    await waitFor(() => expect(theme()).toBe("dark"));
  });

  it("automático + sistema claro abre no tema claro", async () => {
    render(<App />);
    await waitFor(() => expect(theme()).toBe("light"));
  });

  it("preferência salva vence o sistema", async () => {
    system.dark = true;
    localStorage.setItem("duo-code:setting:theme", "light");
    render(<App />);
    await waitFor(() => expect(theme()).toBe("light"));
  });

  it("trocar em Ajustes aplica na hora e persiste", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.settings }));
    await user.click(screen.getByRole("button", { name: copy.settings.themeDark }));

    expect(theme()).toBe("dark");
    await waitFor(() =>
      expect(localStorage.getItem("duo-code:setting:theme")).toBe("dark"),
    );
  });
});
