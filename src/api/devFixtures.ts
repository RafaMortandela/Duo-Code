// Dados de demonstração para conferir a interface no navegador (`npm run dev`),
// onde não existe backend. Carregado só em modo de desenvolvimento e fora do
// Tauri; não entra no build de produção. O "runner" daqui é de mentira: decide
// o veredito olhando o texto do código.

import type {
  CaseResult,
  ProblemDetail,
  ProblemSummary,
  RunOutcome,
} from "./problems";

type Handler = (args: Record<string, unknown>) => unknown;

const DRAFT = "duo-code:dev:draft:";
const SOLVED = "duo-code:dev:solved:";
const GAVE_UP = "duo-code:dev:gave-up:";

const STARTER = "def add(a: int, b: int) -> int:\n    pass\n";
const SOLUTION = "def add(a: int, b: int) -> int:\n    return a + b\n";

const base: ProblemSummary = {
  slug: "demo-add",
  title: "Demo: Add Two Numbers",
  difficulty: "easy",
  unit: "arrays-hashing",
  tags: ["demo"],
  status: "new",
};

const statement = [
  "Return the sum of `a` and `b`.",
  "",
  "This is a **demo** problem shown only in the browser preview.",
  "",
  "### Example",
  "",
  "```",
  "Input:  a = 1, b = 2",
  "Output: 3",
  "```",
  "",
  "### Constraints",
  "",
  "- `-1000 <= a, b <= 1000`",
].join("\n");

const cases: { a: number; b: number; hidden: boolean }[] = [
  { a: 1, b: 2, hidden: false },
  { a: -5, b: 5, hidden: false },
  { a: 40, b: 2, hidden: true },
];

function status(slug: string): ProblemSummary["status"] {
  return localStorage.getItem(SOLVED + slug) ? "solved" : "new";
}

function judge(code: string, includeHidden: boolean): RunOutcome {
  const selected = cases.filter((c) => includeHidden || !c.hidden);
  const correct = /return\s+a\s*\+\s*b/.test(code);
  const raises = code.includes("raise");
  const results: CaseResult[] = selected.map((c, index) => {
    const visible = !c.hidden;
    const expected = c.a + c.b;
    const passed = correct || (!raises && expected === 0);
    return {
      index,
      hidden: c.hidden,
      status: raises ? "runtime_error" : passed ? "passed" : "wrong_answer",
      input: visible
        ? [
            { name: "a", value: c.a },
            { name: "b", value: c.b },
          ]
        : null,
      expected: visible ? expected : null,
      actual: visible && !raises ? (correct ? expected : 0) : null,
      stdout: visible && code.includes("print") ? `debug ${c.a} ${c.b}\n` : "",
      error: raises
        ? {
            type: "ValueError",
            message: "demo error",
            line: 2,
            column: null,
            traceback: "  line 2, in add\n    raise ValueError('demo error')\nValueError: demo error",
          }
        : null,
      time_ms: 1,
    };
  });
  const firstFail = results.find((r) => r.status !== "passed");
  return {
    verdict: !firstFail
      ? "accepted"
      : firstFail.status === "runtime_error"
        ? "runtime_error"
        : "wrong_answer",
    passed: results.filter((r) => r.status === "passed").length,
    total: results.length,
    cases: results,
    error: null,
    duration_ms: 42,
  };
}

export const devHandlers: Record<string, Handler> = {
  list_problems: (): ProblemSummary[] => [{ ...base, status: status(base.slug) }],

  get_problem: ({ slug }): ProblemDetail => {
    if (slug !== base.slug) {
      throw { code: "not_found", message: `problem '${String(slug)}' does not exist` };
    }
    return {
      ...base,
      status: status(base.slug),
      statement,
      starter: STARTER,
      params: [
        { name: "a", type: "int" },
        { name: "b", type: "int" },
      ],
      returns: "int",
      hints: ["Python already knows how to add.", "Use the + operator."],
      complexity: { time: "O(1)", space: "O(1)" },
      draft: localStorage.getItem(DRAFT + base.slug),
      solution_unlocked:
        status(base.slug) === "solved" ||
        localStorage.getItem(GAVE_UP + base.slug) !== null,
    };
  },

  run_code: ({ code }) => judge(String(code), false),

  submit_code: ({ slug, code }) => {
    const outcome = judge(String(code), true);
    if (outcome.verdict === "accepted") {
      localStorage.setItem(SOLVED + String(slug), "1");
    }
    return outcome;
  },

  save_draft: ({ slug, code }) => {
    localStorage.setItem(DRAFT + String(slug), String(code));
    return null;
  },

  get_solution: ({ slug, giveUp }) => {
    const key = String(slug);
    const unlocked =
      localStorage.getItem(SOLVED + key) !== null ||
      localStorage.getItem(GAVE_UP + key) !== null;
    if (!unlocked) {
      if (!giveUp) {
        throw { code: "solution_locked", message: "solve the problem or give up first" };
      }
      localStorage.setItem(GAVE_UP + key, "1");
    }
    return SOLUTION;
  },
};
