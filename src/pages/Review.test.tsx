import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { copy } from "../copy";
import { displayDay } from "../lib/dates";

// Backend = fixtures de desenvolvimento (api/devFixtures.ts).

const STARTER = "def add(a: int, b: int) -> int:\n    pass\n";
const CORRECT = "def add(a, b):\n    return a + b\n";
const OLD_DRAFT = "def add(a, b):\n    return a + b  # my old answer\n";

/** Data local `YYYY-MM-DD`, `offset` dias a partir de hoje. */
function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Deixa "demo-add" resolvida, no estágio 1, vencida há `daysLate` dias. */
function seedDueReview(daysLate: number) {
  localStorage.setItem("duo-code:dev:solved:demo-add", "1");
  localStorage.setItem("duo-code:dev:rewarded:demo-add", "1");
  localStorage.setItem("duo-code:dev:draft:demo-add", OLD_DRAFT);
  localStorage.setItem(
    "duo-code:dev:reviews",
    JSON.stringify({
      "demo-add": { stage: 1, due: day(-daysLate), awaiting: false, stageBefore: null, reviewedOn: null },
    }),
  );
}

async function openReviewOfDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("link", { name: copy.nav.review }));
  await user.click(await screen.findByRole("link", { name: copy.review.start }));
  return (await screen.findByLabelText(copy.problem.editorLabel)) as HTMLTextAreaElement;
}

describe("fila de revisão (005 RF-2, RF-3)", () => {
  it("vazia e sem histórico: convida a resolver a primeira questão", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    expect(await screen.findByText(copy.review.empty)).toBeTruthy();
    expect(screen.getByText(copy.review.emptyNever)).toBeTruthy();
  });

  it("depois de resolver, a questão fica marcada para amanhã", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/problem/demo-add";
    render(<App />);
    fireEvent.change(await screen.findByLabelText(copy.problem.editorLabel), {
      target: { value: CORRECT },
    });
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));
    await screen.findByText(copy.results.verdict.accepted, { exact: false });

    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    expect(await screen.findByText(copy.review.emptyNext(displayDay(day(1))))).toBeTruthy();
  });

  it("lista as vencidas com o atraso, e a Home mostra o contador", async () => {
    seedDueReview(3);
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText(copy.review.count(1))).toBeTruthy();
    await user.click(screen.getByRole("link", { name: copy.review.homeCta }));

    expect(await screen.findByText(copy.review.overdue(3))).toBeTruthy();
    expect(screen.getByText("Demo: Add Two Numbers")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: copy.review.start }).getAttribute("href"),
    ).toBe("#/problem/demo-add?review=1");
  });

  it("vencida hoje aparece como 'vence hoje'", async () => {
    seedDueReview(0);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    expect(await screen.findByText(copy.review.dueToday)).toBeTruthy();
  });
});

describe("modo revisão (005 RF-4)", () => {
  it("começa do código inicial, esconde a solução e não toca no rascunho", async () => {
    seedDueReview(1);
    const user = userEvent.setup();
    render(<App />);
    const editor = await openReviewOfDemo(user);

    expect(editor.value).toBe(STARTER);
    expect(screen.getByText(copy.review.mode)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.problem.solutionShow })).toBeNull();
    expect(screen.getByRole("button", { name: copy.review.fail })).toBeTruthy();

    fireEvent.change(editor, { target: { value: "def add(a, b):\n    return 1\n" } });
    await new Promise((r) => setTimeout(r, 800)); // passa do tempo do auto-salvamento
    expect(localStorage.getItem("duo-code:dev:draft:demo-add")).toBe(OLD_DRAFT);
  });

  it("revisão aceita rende 5 XP e exige a avaliação, que define a próxima data", async () => {
    seedDueReview(1);
    const user = userEvent.setup();
    render(<App />);
    const editor = await openReviewOfDemo(user);
    fireEvent.change(editor, { target: { value: CORRECT } });
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));

    const rewards = await screen.findByLabelText(copy.rewards.title);
    expect(within(rewards).getByText(copy.rewards.xp(5))).toBeTruthy();
    expect(within(rewards).getByText(copy.rewards.reviewed)).toBeTruthy();

    const rating = screen.getByRole("group", { name: copy.review.rateTitle });
    expect(within(rating).getAllByRole("button")).toHaveLength(3);
    // antes de avaliar não há atalho de volta dentro do painel
    expect(within(rating).queryByRole("link")).toBeNull();

    await user.click(within(rating).getByRole("button", { name: new RegExp(copy.review.rating.easy) }));
    // estágio 1 + fácil = estágio 3 → 14 dias a partir de hoje
    expect(await screen.findByText(copy.review.nextDate(displayDay(day(14))))).toBeTruthy();
    expect(screen.queryByRole("group", { name: copy.review.rateTitle })).toBeNull();

    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    expect(await screen.findByText(copy.review.empty)).toBeTruthy();
    expect(screen.getByText(copy.streak.sidebar(1))).toBeTruthy();
  });

  it("'difícil' traz a questão de volta amanhã", async () => {
    seedDueReview(2);
    const user = userEvent.setup();
    render(<App />);
    const editor = await openReviewOfDemo(user);
    fireEvent.change(editor, { target: { value: CORRECT } });
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));
    await user.click(await screen.findByRole("button", { name: new RegExp(copy.review.rating.hard) }));
    expect(await screen.findByText(copy.review.nextDate(displayDay(day(1))))).toBeTruthy();
  });

  // CA-7
  it("'Não consegui' mostra a solução, reagenda para amanhã e não rende nada", async () => {
    seedDueReview(1);
    const user = userEvent.setup();
    render(<App />);
    await openReviewOfDemo(user);

    await user.click(screen.getByRole("button", { name: copy.review.fail }));
    expect(screen.getByText(copy.review.failConfirm)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.review.failNo }));
    expect(screen.queryByText(/return a \+ b/)).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.review.fail }));
    await user.click(screen.getByRole("button", { name: copy.review.failYes }));
    expect(await screen.findByText(/return a \+ b/)).toBeTruthy();
    expect(screen.getByText(copy.review.failed(displayDay(day(1))))).toBeTruthy();
    expect(screen.queryByLabelText(copy.rewards.title)).toBeNull();
    expect(screen.getByText(copy.streak.sidebar(0))).toBeTruthy();

    await user.click(screen.getByRole("link", { name: copy.review.back }));
    expect(await screen.findByText(copy.review.empty)).toBeTruthy();
  });

  // CA-15
  it("reenviar pela tela normal não conta como revisão", async () => {
    seedDueReview(1);
    const user = userEvent.setup();
    window.location.hash = "#/problem/demo-add";
    render(<App />);
    const editor = (await screen.findByLabelText(copy.problem.editorLabel)) as HTMLTextAreaElement;
    expect(editor.value).toBe(OLD_DRAFT); // fora da revisão o rascunho continua valendo
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));

    expect(await screen.findByText(copy.rewards.already_solved)).toBeTruthy();
    expect(screen.queryByRole("group", { name: copy.review.rateTitle })).toBeNull();
    await user.click(screen.getByRole("link", { name: copy.nav.review }));
    expect(await screen.findByText(copy.review.count(1))).toBeTruthy();
  });
});

describe("Ajustes do lembrete (005 RF-6)", () => {
  const setting = (key: string) => localStorage.getItem(`duo-code:setting:${key}`);

  it("lembrete vem ligado às 19:00 e as mudanças são gravadas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.settings }));

    const toggle = (await screen.findByRole("switch", {
      name: copy.settings.reminderEnabled,
    })) as HTMLInputElement;
    const time = screen.getByLabelText(copy.settings.reminderTime) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(time.value).toBe("19:00");

    fireEvent.change(time, { target: { value: "07:30" } });
    await waitFor(() => expect(setting("reminder_time")).toBe("07:30"));

    await user.click(toggle);
    await waitFor(() => expect(setting("reminder_enabled")).toBe("false"));
    expect(time.disabled).toBe(true);
  });

  it("restaura o que foi salvo", async () => {
    localStorage.setItem("duo-code:setting:reminder_enabled", "false");
    localStorage.setItem("duo-code:setting:reminder_time", "21:15");
    localStorage.setItem("duo-code:dev:autostart", "1");
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.settings }));

    const toggle = screen.getByRole("switch", { name: copy.settings.reminderEnabled });
    await waitFor(() => expect((toggle as HTMLInputElement).checked).toBe(false));
    expect((screen.getByLabelText(copy.settings.reminderTime) as HTMLInputElement).value).toBe("21:15");
    expect(
      (screen.getByRole("switch", { name: copy.settings.autostart }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("iniciar com o sistema e testar notificação", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: copy.nav.settings }));

    await user.click(await screen.findByRole("switch", { name: copy.settings.autostart }));
    await waitFor(() => expect(localStorage.getItem("duo-code:dev:autostart")).toBe("1"));

    await user.click(screen.getByRole("button", { name: copy.settings.reminderTest }));
    expect(await screen.findByText(copy.settings.reminderTested)).toBeTruthy();
  });
});
