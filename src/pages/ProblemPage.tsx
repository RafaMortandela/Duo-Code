import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import type { Rewards } from "../api/progress";
import { failReview, type ReviewSchedule } from "../api/reviews";
import { CodeEditor } from "../components/CodeEditor";
import { Confetti } from "../components/Confetti";
import { DifficultyBadge, StatusBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { ResultsPanel, type RunMode } from "../components/ResultsPanel";
import { ReviewRating } from "../components/ReviewRating";
import { RewardsCard } from "../components/RewardsCard";
import { useToast } from "../components/Toast";
import { copy } from "../copy";
import { displayDay } from "../lib/dates";
import { useProgress } from "../progress/ProgressProvider";

const DRAFT_DELAY_MS = 600;

export function ProblemPage() {
  const { slug = "" } = useParams();
  // Modo revisão (spec 005): começa do código inicial e não mexe no rascunho.
  const reviewMode = useSearchParams()[0].get("review") === "1";
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh: refreshProgress } = useProgress();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [initialCode, setInitialCode] = useState("");
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  // Conta as submissões que renderam XP: cada uma dispara o confete.
  const [celebrations, setCelebrations] = useState(0);
  const [mode, setMode] = useState<RunMode>("run");
  const [busy, setBusy] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"reset" | "give-up" | "fail" | null>(null);
  // Agendamento depois de avaliar ou de "Não consegui"; encerra a revisão.
  const [reviewEnd, setReviewEnd] = useState<{ failed: boolean; schedule: ReviewSchedule } | null>(
    null,
  );

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
    setRewards(null);
    setHintsShown(0);
    setSolution(null);
    setConfirming(null);
    setReviewEnd(null);
    getProblem(slug)
      .then((p) => {
        if (cancelled) return;
        const start = reviewMode ? p.starter : (p.draft ?? p.starter);
        code.current = start;
        setInitialCode(start);
        setResetKey((k) => k + 1);
        setProblem(p);
      })
      .catch((e) => {
        // Unidade bloqueada: volta para a trilha, que explica o que falta (004 CA-5).
        if (toApiError(e).code === "unit_locked") {
          if (!cancelled) navigate("/trail", { replace: true, state: { lockedSlug: slug } });
          return;
        }
        reportError(e);
      });
    return () => {
      cancelled = true;
      flushDraft();
    };
  }, [slug, reviewMode, reportError, flushDraft, navigate]);

  const onChange = useCallback(
    (next: string) => {
      code.current = next;
      if (reviewMode) return; // a revisão não sobrescreve o rascunho
      pending.current = { slug, code: next };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flushDraft, DRAFT_DELAY_MS);
    },
    [slug, reviewMode, flushDraft],
  );

  const execute = useCallback(
    async (nextMode: RunMode) => {
      if (busy || !problem) return;
      setBusy(true);
      setMode(nextMode);
      flushDraft();
      try {
        if (nextMode === "run") {
          setOutcome(await runCode(slug, code.current));
          setRewards(null);
        } else {
          const result = await submitCode(slug, code.current, reviewMode);
          setOutcome(result.outcome);
          setRewards(result.rewards);
          if (result.rewards && result.rewards.xp_gained > 0) setCelebrations((n) => n + 1);
          void refreshProgress();
          const solved = result.outcome.verdict === "accepted" || problem.status === "solved";
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
    [busy, problem, slug, reviewMode, flushDraft, reportError, refreshProgress],
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
    if (!reviewMode) {
      pending.current = { slug, code: problem.starter };
      flushDraft();
    }
    setConfirming(null);
  };

  // "Não consegui": reagenda para amanhã e mostra a solução (005 CA-7).
  const failThisReview = async () => {
    try {
      const schedule = await failReview(slug);
      setReviewEnd({ failed: true, schedule });
      setSolution(await getSolution(slug, false));
      void refreshProgress();
    } catch (e) {
      reportError(e);
    } finally {
      setConfirming(null);
    }
  };

  // Durante uma revisão em andamento a solução fica guardada.
  const pendingReview = rewards?.review ?? null;
  const reviewInProgress = reviewMode && reviewEnd === null && pendingReview === null;

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
      <Confetti burst={celebrations} />
      <article className="problem-statement card">
        <Link to={reviewMode ? "/review" : "/trail"} className="back-link">
          <Icon name="back" size={18} />
          {reviewMode ? copy.review.back : copy.problem.back}
        </Link>
        <header className="problem-header">
          <h1>{problem.title}</h1>
          <div className="badges">
            <DifficultyBadge difficulty={problem.difficulty} />
            <StatusBadge status={problem.status} />
            {reviewMode && (
              <span className="badge" data-review="true">
                <Icon name="review" size={14} />
                {copy.review.mode}
              </span>
            )}
          </div>
          {reviewMode && <p className="muted">{copy.review.modeNote}</p>}
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
          {reviewEnd?.failed && (
            <p className="reward-note" role="status">
              {copy.review.failed(displayDay(reviewEnd.schedule.due_date))}
            </p>
          )}
          {solution !== null ? (
            <pre className="solution">
              <code>{solution}</code>
            </pre>
          ) : reviewInProgress ? (
            confirming === "fail" ? (
              <div className="confirm">
                <p>{copy.review.failConfirm}</p>
                <div className="confirm-actions">
                  <button type="button" className="btn btn-ghost" onClick={failThisReview}>
                    {copy.review.failYes}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setConfirming(null)}>
                    {copy.review.failNo}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming("fail")}>
                {copy.review.fail}
              </button>
            )
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
          <ResultsPanel
            outcome={outcome}
            mode={mode}
            busy={busy}
            afterVerdict={
              rewards && (
                <>
                  <RewardsCard rewards={rewards} />
                  {pendingReview && (
                    <ReviewRating
                      slug={slug}
                      schedule={reviewEnd?.schedule ?? pendingReview}
                      onRated={(schedule) => setReviewEnd({ failed: false, schedule })}
                    />
                  )}
                </>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
