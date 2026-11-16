import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { copy } from "../copy";
import { system } from "../test/setup";

const CORRECT = "def add(a, b):\n    return a + b\n";
const motion = () => document.documentElement.dataset.motion;

async function solveDemo(user: ReturnType<typeof userEvent.setup>) {
  window.location.hash = "#/problem/demo-add";
  render(<App />);
  const editor = await screen.findByLabelText(copy.problem.editorLabel);
  fireEvent.change(editor, { target: { value: CORRECT } });
  await user.click(screen.getByRole("button", { name: copy.problem.submit }));
  await screen.findByText(copy.results.verdict.accepted, { exact: false });
}

describe("movimento (spec 007)", () => {
  it("submissão que rende XP solta o confete", async () => {
    await solveDemo(userEvent.setup());
    expect(motion()).toBe("on");
    expect(screen.getByTestId("confetti")).toBeTruthy();
  });

  // CA-4
  it("com prefers-reduced-motion o confete não é renderizado", async () => {
    system.reducedMotion = true;
    await solveDemo(userEvent.setup());
    expect(motion()).toBe("off");
    expect(screen.queryByTestId("confetti")).toBeNull();
    // as recompensas continuam aparecendo, só sem animação
    expect(screen.getByLabelText(copy.rewards.title)).toBeTruthy();
  });

  it("a opção de Ajustes desliga as animações e fica gravada", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.settings }));
    const toggle = (await screen.findByRole("switch", {
      name: copy.settings.animationsEnabled,
    })) as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    await user.click(toggle);
    expect(motion()).toBe("off");
    await waitFor(() =>
      expect(localStorage.getItem("duo-code:setting:animations")).toBe("off"),
    );
  });

  it("com as animações desligadas em Ajustes, não há confete", async () => {
    localStorage.setItem("duo-code:setting:animations", "off");
    await solveDemo(userEvent.setup());
    expect(motion()).toBe("off");
    expect(screen.queryByTestId("confetti")).toBeNull();
  });

  it("submissão que não rende XP não solta confete", async () => {
    const user = userEvent.setup();
    await solveDemo(user);
    await waitFor(() => expect(screen.queryByTestId("confetti")).toBeNull(), { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));
    await screen.findByText(copy.rewards.already_solved);
    expect(screen.queryByTestId("confetti")).toBeNull();
  });
});

describe("mascote (spec 007)", () => {
  const pose = () => document.querySelector(".mascot")?.getAttribute("data-pose");

  it("acompanha o estado do streak na Home e é decorativa", async () => {
    render(<App />);
    await screen.findByText(copy.home.state.fresh);
    expect(pose()).toBe("happy");
    expect(document.querySelector(".mascot")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("dorme na fila de revisão vazia", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    await screen.findByText(copy.review.empty);
    expect(document.querySelector('.mascot[data-pose="sleepy"]')).toBeTruthy();
  });
});
