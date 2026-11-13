import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { copy } from "../copy";

// Backend = fixtures de desenvolvimento (api/devFixtures.ts).

const CORRECT = "def add(a, b):\n    return a + b\n";

async function solveDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("link", { name: copy.nav.trail }));
  await user.click(await screen.findByRole("link", { name: /Demo: Add Two Numbers/ }));
  const editor = await screen.findByLabelText(copy.problem.editorLabel);
  fireEvent.change(editor, { target: { value: CORRECT } });
  await user.click(screen.getByRole("button", { name: copy.problem.submit }));
  await screen.findByText(copy.results.verdict.accepted, { exact: false });
}

describe("Home (003 RF-4)", () => {
  it("sem atividade: streak zerado, nível 1 e atalho para a próxima questão", async () => {
    render(<App />);
    expect(await screen.findByText(copy.home.state.fresh)).toBeTruthy();
    expect(screen.getByText(copy.level.label(1))).toBeTruthy();
    expect(screen.getByText(copy.level.progress(0, 100))).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: copy.level.barLabel });
    expect(bar.getAttribute("aria-valuenow")).toBe("0");

    const cta = screen.getByRole("link", { name: copy.home.nextCta });
    expect(cta.getAttribute("href")).toBe("#/problem/demo-add");
    expect(screen.getByText(copy.streak.sidebar(0))).toBeTruthy();
  });

  it("depois de resolver: dia garantido, XP na barra e streak na lateral", async () => {
    const user = userEvent.setup();
    render(<App />);
    await solveDemo(user);
    await waitFor(() => expect(screen.getByText(copy.streak.sidebar(1))).toBeTruthy());

    await user.click(screen.getByRole("link", { name: copy.nav.home }));
    expect(await screen.findByText(copy.home.state.secured)).toBeTruthy();
    expect(screen.getByText(copy.level.progress(10, 100))).toBeTruthy();
    expect(screen.getByText(copy.level.toNext(90, 2))).toBeTruthy();
    // não há mais questão nova para sugerir
    expect(screen.getByText(copy.home.allDone)).toBeTruthy();
  });
});

describe("resumo de recompensas (003 RF-6)", () => {
  it("mostra XP, streak e conquistas destravadas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await solveDemo(user);

    const rewards = screen.getByLabelText(copy.rewards.title);
    expect(within(rewards).getByText(copy.rewards.xp(10))).toBeTruthy();
    expect(within(rewards).getByText(copy.rewards.streak(1))).toBeTruthy();
    expect(within(rewards).getByText(copy.rewards.streakUp)).toBeTruthy();
    expect(within(rewards).getByText(copy.achievements["first-solve"].title)).toBeTruthy();
    expect(within(rewards).getByText(copy.achievements["first-try"].title)).toBeTruthy();
  });

  it("reenviar uma questão já resolvida explica que não rende nada", async () => {
    const user = userEvent.setup();
    render(<App />);
    await solveDemo(user);
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));

    expect(await screen.findByText(copy.rewards.already_solved)).toBeTruthy();
    expect(screen.queryByText(copy.rewards.xp(10))).toBeNull();
  });

  it("Executar e submissão errada não mostram recompensas", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/problem/demo-add";
    render(<App />);
    const editor = await screen.findByLabelText(copy.problem.editorLabel);
    fireEvent.change(editor, { target: { value: CORRECT } });
    await user.click(screen.getByRole("button", { name: copy.problem.run }));
    await screen.findByText(copy.results.verdict.acceptedRun, { exact: false });
    expect(screen.queryByLabelText(copy.rewards.title)).toBeNull();

    fireEvent.change(editor, { target: { value: "def add(a, b):\n    return 0\n" } });
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));
    await screen.findByText(copy.results.verdict.wrong_answer, { exact: false });
    expect(screen.queryByLabelText(copy.rewards.title)).toBeNull();
    expect(screen.getByText(copy.streak.sidebar(0))).toBeTruthy();
  });
});

describe("Perfil (003 RF-5)", () => {
  it("lista todas as conquistas, bloqueadas no começo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.profile }));

    expect(await screen.findByText(copy.profile.achievementsCount(0, 13))).toBeTruthy();
    expect(screen.getAllByText(copy.profile.locked)).toHaveLength(13);
    expect(screen.getByText(copy.profile.solvedOf(0, 1))).toBeTruthy();
    expect(
      screen.getByRole("img", { name: copy.profile.calendarSummary(0) }),
    ).toBeTruthy();
  });

  it("depois de resolver: estatísticas, calendário e conquistas atualizados", async () => {
    const user = userEvent.setup();
    render(<App />);
    await solveDemo(user);
    await user.click(screen.getByRole("link", { name: copy.nav.profile }));

    expect(await screen.findByText(copy.profile.solvedOf(1, 1))).toBeTruthy();
    expect(screen.getByText(copy.profile.achievementsCount(4, 13))).toBeTruthy();
    expect(screen.getAllByText(copy.profile.locked)).toHaveLength(9);
    expect(
      screen.getByRole("img", { name: copy.profile.calendarSummary(1) }),
    ).toBeTruthy();
    expect(screen.getByText(copy.achievements["first-solve"].title)).toBeTruthy();
  });
});
