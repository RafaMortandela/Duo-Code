import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { copy } from "../copy";

// Backend = fixtures de desenvolvimento: duas unidades de uma questão cada,
// a segunda ("Stack") abre quando a questão da primeira é resolvida.

const CORRECT = "def add(a, b):\n    return a + b\n";
const BLOCKED = copy.trail.blocked(1, "Arrays & Hashing");

function unit(title: string) {
  return screen.getByRole("button", { name: new RegExp(title) });
}

async function openTrail(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("link", { name: copy.nav.trail }));
  await screen.findByRole("button", { name: /Arrays & Hashing/ });
}

async function submitCorrect(user: ReturnType<typeof userEvent.setup>) {
  const editor = await screen.findByLabelText(copy.problem.editorLabel);
  fireEvent.change(editor, { target: { value: CORRECT } });
  await user.click(screen.getByRole("button", { name: copy.problem.submit }));
  await screen.findByText(copy.results.verdict.accepted, { exact: false });
}

describe("Trilha (spec 004)", () => {
  // CA-1, RF-2
  it("mostra as unidades em ordem, com estado e progresso", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTrail(user);

    const first = unit("Arrays & Hashing");
    const second = unit("Stack");
    expect(first.textContent).toContain(copy.trail.state.unlocked);
    expect(first.textContent).toContain(copy.trail.progress(0, 1));
    expect(second.textContent).toContain(copy.trail.state.locked);
    // a unidade atual já vem aberta, com suas questões
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("link", { name: /Demo: Add Two Numbers/ })).toBeTruthy();
  });

  // RF-4
  it("unidade bloqueada explica o que falta e não lista questões", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTrail(user);
    await user.click(unit("Stack"));

    expect(screen.getByRole("status").textContent).toContain(BLOCKED);
    expect(screen.queryByRole("link", { name: /Demo: Add Again/ })).toBeNull();
    // só uma unidade fica aberta por vez
    expect(unit("Arrays & Hashing").getAttribute("aria-expanded")).toBe("false");
  });

  // RF-3, RF-6, CA-3
  it("resolver libera a próxima unidade e o resumo avisa", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTrail(user);
    await user.click(screen.getByRole("link", { name: /Demo: Add Two Numbers/ }));
    await submitCorrect(user);

    const rewards = screen.getByLabelText(copy.rewards.title);
    expect(within(rewards).getByText(copy.rewards.unitUnlocked)).toBeTruthy();
    expect(within(rewards).getByText("Stack")).toBeTruthy();

    await user.click(screen.getByRole("link", { name: copy.problem.back }));
    await waitFor(() =>
      expect(unit("Arrays & Hashing").textContent).toContain(copy.trail.state.completed),
    );
    const second = unit("Stack");
    expect(second.textContent).toContain(copy.trail.state.unlocked);
    // a unidade recém-liberada passa a ser a atual
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: /Demo: Add Again/ })).toBeTruthy();
  });

  // CA-5
  it("abrir questão de unidade bloqueada volta para a trilha com o aviso", async () => {
    window.location.hash = "#/problem/demo-add-again";
    render(<App />);

    expect((await screen.findByRole("status")).textContent).toContain(BLOCKED);
    expect(window.location.hash).toBe("#/trail");
    expect(unit("Stack").getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByLabelText(copy.problem.editorLabel)).toBeNull();
  });

  // CA-7
  it("com a trilha concluída, a Home aponta para a revisão", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTrail(user);
    await user.click(screen.getByRole("link", { name: /Demo: Add Two Numbers/ }));
    await submitCorrect(user);
    await user.click(screen.getByRole("link", { name: copy.problem.back }));
    await user.click(await screen.findByRole("link", { name: /Demo: Add Again/ }));
    await submitCorrect(user);

    await user.click(screen.getByRole("link", { name: copy.nav.home }));
    expect(await screen.findByText(copy.home.allDone)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: copy.home.goReview }).getAttribute("href"),
    ).toBe("#/review");
  });
});
