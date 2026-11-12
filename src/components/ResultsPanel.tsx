import { useEffect, useState } from "react";
import type { CaseResult, CaseStatus, ErrorInfo, RunOutcome, Verdict } from "../api/problems";
import { copy } from "../copy";
import { pyRepr } from "../lib/pyRepr";
import { Icon, type IconName } from "./Icon";

export type RunMode = "run" | "submit";

const statusIcon: Record<CaseStatus, IconName> = {
  passed: "check",
  wrong_answer: "cross",
  runtime_error: "alert",
  time_limit: "clock",
  not_run: "minus",
};

const verdictIcon: Record<Verdict, IconName> = {
  accepted: "check",
  wrong_answer: "cross",
  runtime_error: "alert",
  time_limit: "clock",
  syntax_error: "alert",
};

function verdictText(outcome: RunOutcome, mode: RunMode): string {
  if (outcome.verdict === "accepted" && mode === "run") {
    return copy.results.verdict.acceptedRun;
  }
  return copy.results.verdict[outcome.verdict];
}

function caseName(c: CaseResult, cases: CaseResult[]): string {
  const sameKind = cases.filter((o) => o.hidden === c.hidden && o.index <= c.index);
  return c.hidden
    ? copy.results.hiddenLabel(sameKind.length)
    : copy.results.caseLabel(sameKind.length);
}

function ErrorBlock({ error }: { error: ErrorInfo }) {
  return (
    <div className="result-field">
      <span className="result-label">
        {copy.results.error}
        {error.line !== null && (
          <span className="result-line">{copy.results.errorAt(error.line)}</span>
        )}
      </span>
      <pre className="result-value" data-tone="error">
        {error.traceback}
      </pre>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-field">
      <span className="result-label">{label}</span>
      <pre className="result-value">{value}</pre>
    </div>
  );
}

function CaseDetail({ c }: { c: CaseResult }) {
  if (c.hidden) {
    return (
      <div className="case-detail">
        <p className="muted">{copy.results.hiddenNote}</p>
        {c.error && <ErrorBlock error={c.error} />}
      </div>
    );
  }
  const input = (c.input ?? [])
    .map((arg) => `${arg.name} = ${pyRepr(arg.value)}`)
    .join("\n");
  const ran = c.status === "passed" || c.status === "wrong_answer";
  return (
    <div className="case-detail">
      <Field label={copy.results.input} value={input} />
      <Field label={copy.results.expected} value={pyRepr(c.expected)} />
      {ran && <Field label={copy.results.actual} value={pyRepr(c.actual)} />}
      {c.stdout && <Field label={copy.results.stdout} value={c.stdout} />}
      {c.error && <ErrorBlock error={c.error} />}
    </div>
  );
}

export function ResultsPanel({
  outcome,
  mode,
  busy,
}: {
  outcome: RunOutcome | null;
  mode: RunMode;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(0);

  // A cada novo resultado, abre no primeiro caso que falhou.
  useEffect(() => {
    if (!outcome) return;
    const firstFail = outcome.cases.findIndex((c) => c.status !== "passed");
    setSelected(firstFail === -1 ? 0 : firstFail);
  }, [outcome]);

  if (busy) {
    return (
      <section className="results" aria-live="polite">
        <p className="results-empty">{copy.problem.running}</p>
      </section>
    );
  }
  if (!outcome) {
    return (
      <section className="results">
        <p className="results-empty">{copy.results.empty}</p>
        <p className="muted">{copy.results.emptyHint}</p>
      </section>
    );
  }

  const current = outcome.cases[selected];
  return (
    <section className="results" aria-live="polite" aria-label={copy.results.title}>
      <div className="verdict" data-verdict={outcome.verdict} role="status">
        <Icon name={verdictIcon[outcome.verdict]} size={24} />
        <strong>{verdictText(outcome, mode)}</strong>
        <span className="verdict-count">
          {copy.results.count(outcome.passed, outcome.total)}
        </span>
      </div>

      {outcome.error && <ErrorBlock error={outcome.error} />}

      {!outcome.error && outcome.cases.length > 0 && (
        <>
          <div className="case-tabs" role="tablist" aria-label={copy.results.cases}>
            {outcome.cases.map((c, i) => (
              <button
                key={c.index}
                type="button"
                role="tab"
                aria-selected={i === selected}
                className="case-tab"
                data-status={c.status}
                onClick={() => setSelected(i)}
              >
                <Icon name={statusIcon[c.status]} size={16} />
                {caseName(c, outcome.cases)}
              </button>
            ))}
          </div>
          {current && (
            <div role="tabpanel">
              <p className="case-status" data-status={current.status}>
                <Icon name={statusIcon[current.status]} size={18} />
                {copy.results.caseStatus[current.status]}
                {current.time_ms !== null && (
                  <span className="muted">{copy.results.time(current.time_ms)}</span>
                )}
              </p>
              <CaseDetail c={current} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
