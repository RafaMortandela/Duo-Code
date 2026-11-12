import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { toApiError } from "../api/client";
import {
  getProblem,
  getSolution,
  runCode,
  saveDraft,
  submitCode,
  type ProblemDetail,
  type RunOutcome,
} from "../api/problems";
import { CodeEditor } from "../components/CodeEditor";
import { DifficultyBadge, StatusBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { ResultsPanel, type RunMode } from "../components/ResultsPanel";
import { useToast } from "../components/Toast";
import { copy } from "../copy";

const DRAFT_DELAY_MS = 600;

export function ProblemPage() {
  const { slug = "" } = useParams();
  const toast = useToast();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [initialCode, setInitialCode] = useState("");
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [mode, setMode] = useState<RunMode>("run");
  const [busy, setBusy] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"reset" | "give-up" | null>(null);

  const code = useRef("");
  // Rascunho ainda não gravado: { slug, code } e o timer que vai gravá-lo.
  const pending = useRef<{ slug: string; code: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const reportError = useCallback(
    (e: unknown) => {
      const err = toApiError(e);
      toast.error(err.code === "python_missing" ? copy.problem.pythonMissing : err.message);
    },
    [toast],
  );

  const flushDraft = useCallback(() => {
    window.clearTimeout(timer.current);
    const draft = pending.current;
    pending.current = null;
    if (draft) saveDraft(draft.slug, draft.code).catch(reportError);
  }, [reportError]);

  // Carrega a questão; ao sair dela (ou fechar a tela), grava o rascunho pendente.
  useEffect(() => {
    let cancelled = false;
    setProblem(null);
    setOutcome(null);
    setHintsShown(0);
    setSolution(null);
    setConfirming(null);
    getProblem(slug)
      .then((p) => {
        if (cancelled) return;
        const start = p.draft ?? p.starter;
        code.current = start;
        setInitialCode(start);
        setResetKey((k) => k + 1);
        setProblem(p);
      })
      .catch(reportError);
    return () => {
      cancelled = true;
      flushDraft();
    };
  }, [slug, reportError, flushDraft]);

  const onChange = useCallback(
    (next: string) => {
      code.current = next;
      pending.current = { slug, code: next };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flushDraft, DRAFT_DELAY_MS);
    },
    [slug, flushDraft],
  );

  const execute = useCallback(
    async (nextMode: RunMode) => {
      if (busy || !problem) return;
      setBusy(true);
      setMode(nextMode);
      flushDraft();
      try {
        const result =
          nextMode === "run"
            ? await runCode(slug, code.current)
            : await submitCode(slug, code.current);
        setOutcome(result);
        if (nextMode === "submit") {
          const solved = result.verdict === "accepted" || problem.status === "solved";
          setProblem({
            ...problem,
            status: solved ? "solved" : "attempted",
            solution_unlocked: problem.solution_unlocked || solved,
          });
        }
      } catch (e) {
        reportError(e);
      } finally {
        setBusy(false);
      }
    },
    [busy, problem, slug, flushDraft, reportError],
  );

  const run = useCallback(() => void execute("run"), [execute]);
  const submit = useCallback(() => void execute("submit"), [execute]);

  if (!problem) {
    return <p className="muted">{copy.problem.loading}</p>;
  }

  const resetCode = () => {
    code.current = problem.starter;
    setInitialCode(problem.starter);
    setResetKey((k) => k + 1);
    pending.current = { slug, code: problem.starter };
    flushDraft();
    setConfirming(null);
  };

  const showSolution = async (giveUp: boolean) => {
    try {
      setSolution(await getSolution(slug, giveUp));
      setProblem({ ...problem, solution_unlocked: true });
    } catch (e) {
      reportError(e);
    } finally {
      setConfirming(null);
    }
  };

  const nextHint = hintsShown + 1;
  return (
    <div className="problem">
      <article className="problem-statement card">
        <Link to="/trail" className="back-link">
          <Icon name="back" size={18} />
          {copy.problem.back}
        </Link>
        <header className="problem-header">
          <h1>{problem.title}</h1>
          <div className="badges">
            <DifficultyBadge difficulty={problem.difficulty} />
            <StatusBadge status={problem.status} />
          </div>
        </header>

        <div className="markdown">
          <Markdown>{problem.statement}</Markdown>
        </div>

        {problem.complexity && (
          <p className="complexity">
            <strong>{copy.problem.complexity}</strong>
            <code>{problem.complexity.time}</code>
            {copy.problem.complexityTime}
            <code>{problem.complexity.space}</code>
            {copy.problem.complexitySpace}
          </p>
        )}

        {problem.hints.length > 0 && (
          <section className="aside-section">
            <h2>{copy.problem.hints}</h2>
            <ol className="hints">
              {problem.hints.slice(0, hintsShown).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
            {hintsShown < problem.hints.length ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setHintsShown(nextHint)}
              >
                <Icon name="bulb" size={18} />
                {copy.problem.hintShow(nextHint, problem.hints.length)}
              </button>
            ) : (
              <p className="muted">{copy.problem.hintsDone}</p>
            )}
          </section>
        )}

        <section className="aside-section">
          <h2>{copy.problem.solution}</h2>
          {solution !== null ? (
            <pre className="solution">
              <code>{solution}</code>
            </pre>
          ) : problem.solution_unlocked ? (
            <button type="button" className="btn btn-ghost" onClick={() => showSolution(false)}>
              <Icon name="eye" size={18} />
              {copy.problem.solutionShow}
            </button>
          ) : confirming === "give-up" ? (
            <div className="confirm">
              <p>{copy.problem.giveUpConfirm}</p>
              <div className="confirm-actions">
                <button type="button" className="btn btn-ghost" onClick={() => showSolution(true)}>
                  {copy.problem.giveUpYes}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setConfirming(null)}>
                  {copy.problem.giveUpNo}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming("give-up")}>
              <Icon name="eye" size={18} />
              {copy.problem.giveUp}
            </button>
          )}
        </section>
      </article>

      <div className="problem-work">
        <div className="editor-card card">
          <CodeEditor
            value={initialCode}
            resetKey={resetKey}
            onChange={onChange}
            onRun={run}
            onSubmit={submit}
            ariaLabel={copy.problem.editorLabel}
          />
          <div className="toolbar">
            {confirming === "reset" ? (
              <span className="confirm-inline">
                {copy.problem.resetConfirm}
                <button type="button" className="btn btn-ghost" onClick={resetCode}>
                  {copy.problem.confirm}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirming(null)}>
                  {copy.problem.cancel}
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming("reset")}>
                <Icon name="reset" size={18} />
                {copy.problem.reset}
              </button>
            )}
            <span className="toolbar-spacer" />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={run}
              disabled={busy}
              title={copy.problem.runShortcut}
            >
              <Icon name="play" size={18} />
              {copy.problem.run}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={busy}
              title={copy.problem.submitShortcut}
            >
              <Icon name="send" size={18} />
              {copy.problem.submit}
            </button>
          </div>
        </div>
        <div className="results-card card">
          <ResultsPanel outcome={outcome} mode={mode} busy={busy} />
        </div>
      </div>
    </div>
  );
}
