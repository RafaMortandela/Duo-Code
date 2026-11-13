// Dados de demonstração para conferir a interface no navegador (`npm run dev`),
// onde não existe backend. Carregado só em modo de desenvolvimento e fora do
// Tauri; não entra no build de produção. O "runner" daqui é de mentira: decide
// o veredito olhando o texto do código.

import type {
  CaseResult,
  ProblemDetail,
  ProblemSummary,
  RunOutcome,
  SubmitResult,
} from "./problems";
import type { Progress, Streak } from "./progress";

type Handler = (args: Record<string, unknown>) => unknown;

const DRAFT = "duo-code:dev:draft:";
const SOLVED = "duo-code:dev:solved:";
const GAVE_UP = "duo-code:dev:gave-up:";
const EVENTS = "duo-code:dev:xp-events";
const UNLOCKED = "duo-code:dev:achievements";

const CATALOG = [
  "first-solve",
  "first-try",
  "streak-3",
  "streak-7",
  "streak-30",
  "first-medium",
  "first-hard",
  "solved-10",
  "solved-30",
  "unit-complete",
  "trail-complete",
  "review-10",
  "level-5",
];

type XpEvent = { date: string; amount: number };

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function streakOf(events: XpEvent[]): Streak {
  const active = new Set(events.map((e) => e.date));
  const start = active.has(daysAgo(0)) ? 0 : active.has(daysAgo(1)) ? 1 : -1;
  let current = 0;
  if (start >= 0) {
    while (active.has(daysAgo(start + current))) current += 1;
  }
  return {
    current,
    best: current,
    state: start === 0 ? "secured" : start === 1 ? "at_risk" : "broken",
  };
}

function levelOf(xp: number) {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level += 1;
  return {
    level,
    xp_total: xp,
    level_start: 50 * level * (level - 1),
    next_level_at: 50 * (level + 1) * level,
  };
}

function progress(): Progress {
  const events = readJson<XpEvent[]>(EVENTS, []);
  const unlocked = readJson<Record<string, string>>(UNLOCKED, {});
  const solved = status(base.slug) === "solved" && events.length > 0 ? 1 : 0;
  const byDate = new Map<string, number>();
  for (const e of events) byDate.set(e.date, (byDate.get(e.date) ?? 0) + 1);
  return {
    today: daysAgo(0),
    streak: streakOf(events),
    level: levelOf(events.reduce((sum, e) => sum + e.amount, 0)),
    solved: { easy: solved, medium: 0, hard: 0, total: solved },
    problems_total: 1,
    activity: [...byDate.entries()].sort().map(([date, count]) => ({ date, count })),
    achievements: CATALOG.map((id) => ({ id, unlocked_on: unlocked[id] ?? null })),
    next_problem: status(base.slug) === "solved" ? null : { ...base, status: "new" },
  };
}

function submit(slug: string, code: string): SubmitResult {
  const outcome = judge(code, true);
  if (outcome.verdict !== "accepted") return { outcome, rewards: null };

  const before = progress();
  const gaveUp = localStorage.getItem(GAVE_UP + slug) !== null;
  const alreadySolved = localStorage.getItem(SOLVED + slug) !== null;
  const reason = alreadySolved ? "already_solved" : gaveUp ? "gave_up" : "first_solve";
  localStorage.setItem(SOLVED + slug, "1");

  const earned: string[] = [];
  if (reason === "first_solve") {
    const events = readJson<XpEvent[]>(EVENTS, []);
    localStorage.setItem(EVENTS, JSON.stringify([...events, { date: daysAgo(0), amount: 10 }]));
    const unlocked = readJson<Record<string, string>>(UNLOCKED, {});
    for (const id of ["first-solve", "first-try", "unit-complete", "trail-complete"]) {
      if (!unlocked[id]) {
        unlocked[id] = daysAgo(0);
        earned.push(id);
      }
    }
    localStorage.setItem(UNLOCKED, JSON.stringify(unlocked));
  }
  const after = progress();
  return {
    outcome,
    rewards: {
      reason,
      xp_gained: reason === "first_solve" ? 10 : 0,
      level_before: before.level.level,
      level: after.level,
      streak_before: before.streak.current,
      streak: after.streak,
      achievements: earned,
    },
  };
}

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

  submit_code: ({ slug, code }) => submit(String(slug), String(code)),

  get_progress: () => progress(),

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
