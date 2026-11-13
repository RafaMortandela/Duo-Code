import { call } from "./client";
import type { Rewards } from "./progress";

export type Difficulty = "easy" | "medium" | "hard";
export type ProblemStatus = "new" | "attempted" | "solved";

export type ProblemSummary = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  unit: string;
  tags: string[];
  status: ProblemStatus;
};

export type ProblemDetail = ProblemSummary & {
  statement: string;
  starter: string;
  params: { name: string; type: string }[];
  returns: string;
  hints: string[];
  complexity: { time: string; space: string } | null;
  draft: string | null;
  solution_unlocked: boolean;
};

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "time_limit"
  | "syntax_error";

export type CaseStatus =
  | "passed"
  | "wrong_answer"
  | "runtime_error"
  | "time_limit"
  | "not_run";

export type ErrorInfo = {
  type: string;
  message: string;
  line: number | null;
  column: number | null;
  traceback: string;
};

export type CaseResult = {
  index: number;
  hidden: boolean;
  status: CaseStatus;
  /** `null` em caso oculto. */
  input: { name: string; value: unknown }[] | null;
  expected: unknown;
  actual: unknown;
  stdout: string;
  error: ErrorInfo | null;
  time_ms: number | null;
};

export type RunOutcome = {
  verdict: Verdict;
  passed: number;
  total: number;
  cases: CaseResult[];
  error: ErrorInfo | null;
  duration_ms: number;
};

export function listProblems(): Promise<ProblemSummary[]> {
  return call("list_problems");
}

export function getProblem(slug: string): Promise<ProblemDetail> {
  return call("get_problem", { slug });
}

/** Roda só os testes visíveis; não registra nada. */
export function runCode(slug: string, code: string): Promise<RunOutcome> {
  return call("run_code", { slug, code });
}

export type SubmitResult = {
  outcome: RunOutcome;
  /** Presente quando a submissão foi aceita. */
  rewards: Rewards | null;
};

/** Roda todos os testes, registra a submissão e devolve as recompensas. */
export function submitCode(slug: string, code: string): Promise<SubmitResult> {
  return call("submit_code", { slug, code });
}

export function saveDraft(slug: string, code: string): Promise<void> {
  return call("save_draft", { slug, code });
}

/** `giveUp: true` confirma a desistência quando a questão ainda não foi resolvida. */
export function getSolution(slug: string, giveUp: boolean): Promise<string> {
  return call("get_solution", { slug, giveUp });
}
