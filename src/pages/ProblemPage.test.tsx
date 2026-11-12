import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { copy } from "../copy";

// Usa as fixtures de desenvolvimento (api/devFixtures.ts) como backend e a
// <textarea> de test/setup.ts no lugar do Monaco.

const STARTER = "def add(a: int, b: int) -> int:\n    pass\n";
const CORRECT = "def add(a, b):\n    return a + b\n";
const WRONG = "def add(a, b):\n    return 0\n";

async function openProblem() {
  window.location.hash = "#/problem/demo-add";
  const view = render(<App />);
  const editor = (await screen.findByLabelText(copy.problem.editorLabel)) as HTMLTextAreaElement;
  return { ...view, editor };
}

const type = (editor: HTMLElement, code: string) =>
  fireEvent.change(editor, { target: { value: code } });

describe("tela de questão (spec 002)", () => {
  it("mostra enunciado, dificuldade e o código inicial", async () => {
    const { editor } = await openProblem();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Demo: Add Two Numbers");
    expect(screen.getByText(copy.difficulty.easy)).toBeTruthy();
    expect(screen.getByText(/Return the sum of/)).toBeTruthy();
    expect(editor.value).toBe(STARTER);
    expect(screen.getByText(copy.results.empty)).toBeTruthy();
  });

  it("Executar com resposta errada mostra esperado e obtido do caso que falhou", async () => {
    const user = userEvent.setup();
    const { editor } = await openProblem();
    type(editor, WRONG);
    await user.click(screen.getByRole("button", { name: copy.problem.run }));

    const verdict = await screen.findByRole("status");
    expect(verdict.textContent).toContain(copy.results.verdict.wrong_answer);
    expect(verdict.textContent).toContain(copy.results.count(1, 2));
    // abre direto no primeiro caso que falhou (a = 1, b = 2)
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/a = 1\s+b = 2/)).toBeTruthy();
    expect(within(panel).getByText("3")).toBeTruthy();
    expect(within(panel).getByText("0")).toBeTruthy();
    // Executar não mostra casos ocultos
    expect(screen.queryByRole("tab", { name: copy.results.hiddenLabel(1) })).toBeNull();
  });

  it("Executar com tudo certo convida a enviar; Enviar aceita marca como resolvida", async () => {
    const user = userEvent.setup();
    const { editor } = await openProblem();
    type(editor, CORRECT);

    await user.click(screen.getByRole("button", { name: copy.problem.run }));
    expect((await screen.findByRole("status")).textContent).toContain(
      copy.results.verdict.acceptedRun,
    );
    expect(screen.getByText(copy.status.new)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: copy.problem.submit }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(copy.results.verdict.accepted),
    );
    expect(screen.getByText(copy.status.solved)).toBeTruthy();
    // Enviar inclui o caso oculto, sem revelar a entrada
    await user.click(screen.getByRole("tab", { name: copy.results.hiddenLabel(1) }));
    expect(screen.getByText(copy.results.hiddenNote)).toBeTruthy();
  });

  it("erro em tempo de execução mostra o traceback e a linha", async () => {
    const user = userEvent.setup();
    const { editor } = await openProblem();
    type(editor, "def add(a, b):\n    raise ValueError('demo error')\n");
    await user.click(screen.getByRole("button", { name: copy.problem.run }));

    expect((await screen.findByRole("status")).textContent).toContain(
      copy.results.verdict.runtime_error,
    );
    expect(screen.getByText(/ValueError: demo error/)).toBeTruthy();
    expect(screen.getByText(copy.results.errorAt(2))).toBeTruthy();
  });

  // CA-10
  it("o rascunho volta ao reabrir a questão", async () => {
    const first = await openProblem();
    type(first.editor, CORRECT);
    first.unmount(); // sair da tela grava o rascunho pendente

    const second = await openProblem();
    expect(second.editor.value).toBe(CORRECT);
  });

  it("o rascunho é salvo sozinho depois de uma pausa na digitação", async () => {
    const { editor } = await openProblem();
    type(editor, WRONG);
    await waitFor(
      () => expect(localStorage.getItem("duo-code:dev:draft:demo-add")).toBe(WRONG),
      { timeout: 2000 },
    );
  });

  it("voltar ao código inicial pede confirmação", async () => {
    const user = userEvent.setup();
    const { editor } = await openProblem();
    type(editor, WRONG);

    await user.click(screen.getByRole("button", { name: copy.problem.reset }));
    await user.click(screen.getByRole("button", { name: copy.problem.cancel }));
    expect((screen.getByLabelText(copy.problem.editorLabel) as HTMLTextAreaElement).value).toBe(WRONG);

    await user.click(screen.getByRole("button", { name: copy.problem.reset }));
    await user.click(screen.getByRole("button", { name: copy.problem.confirm }));
    expect((screen.getByLabelText(copy.problem.editorLabel) as HTMLTextAreaElement).value).toBe(STARTER);
  });

  // RF-10
  it("as dicas aparecem uma por vez", async () => {
    const user = userEvent.setup();
    await openProblem();
    expect(screen.queryByText("Python already knows how to add.")).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.problem.hintShow(1, 2) }));
    expect(screen.getByText("Python already knows how to add.")).toBeTruthy();
    expect(screen.queryByText("Use the + operator.")).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.problem.hintShow(2, 2) }));
    expect(screen.getByText("Use the + operator.")).toBeTruthy();
    expect(screen.getByText(copy.problem.hintsDone)).toBeTruthy();
  });

  // RF-10
  it("a solução só aparece depois de confirmar a desistência", async () => {
    const user = userEvent.setup();
    await openProblem();
    const solutionLine = /return a \+ b/;

    await user.click(screen.getByRole("button", { name: copy.problem.giveUp }));
    expect(screen.getByText(copy.problem.giveUpConfirm)).toBeTruthy();
    expect(screen.queryByText(solutionLine)).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.problem.giveUpNo }));
    expect(screen.queryByText(solutionLine)).toBeNull();

    await user.click(screen.getByRole("button", { name: copy.problem.giveUp }));
    await user.click(screen.getByRole("button", { name: copy.problem.giveUpYes }));
    expect(await screen.findByText(solutionLine)).toBeTruthy();
  });

  it("depois de resolvida, a solução abre sem desistir", async () => {
    const user = userEvent.setup();
    const { editor } = await openProblem();
    type(editor, CORRECT);
    await user.click(screen.getByRole("button", { name: copy.problem.submit }));

    await user.click(await screen.findByRole("button", { name: copy.problem.solutionShow }));
    expect(await screen.findByText(/return a \+ b/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.problem.giveUp })).toBeNull();
  });
});
