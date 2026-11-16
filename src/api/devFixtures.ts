// Dados de demonstração para conferir a interface no navegador (`npm run dev`),
// onde não existe backend. Carregado só em modo de desenvolvimento e fora do
// Tauri; não entra no build de produção. O "runner" daqui é de mentira: decide
// o veredito olhando o texto do código. As regras de verdade (streak, XP,
// trilha) vivem no Rust e são testadas lá; aqui há só o bastante para as telas
// terem o que mostrar.

import type {
  CaseResult,
  Difficulty,
  ProblemDetail,
  ProblemStatus,
  ProblemSummary,
  RunOutcome,
  SubmitResult,
} from "./problems";
import type { Progress, Streak } from "./progress";
import type { Rating, ReviewQueue, ReviewSchedule } from "./reviews";
import type { TrailUnit } from "./trail";

type Handler = (args: Record<string, unknown>) => unknown;

const DRAFT = "duo-code:dev:draft:";
const SOLVED = "duo-code:dev:solved:";
const REWARDED = "duo-code:dev:rewarded:";
const GAVE_UP = "duo-code:dev:gave-up:";
const EVENTS = "duo-code:dev:xp-events";
const UNLOCKED = "duo-code:dev:achievements";
const REVIEWS = "duo-code:dev:reviews";
const AUTOSTART = "duo-code:dev:autostart";

const STARTER = "def add(a: int, b: int) -> int:\n    pass\n";
const SOLUTION = "def add(a: int, b: int) -> int:\n    return a + b\n";

type DemoProblem = Omit<ProblemSummary, "status">;

// Duas unidades de uma questão cada: resolver a primeira libera a segunda.
const problems: DemoProblem[] = [
  {
    slug: "demo-add",
    title: "Demo: Add Two Numbers",
    difficulty: "easy",
    unit: "arrays-hashing",
    tags: ["demo"],
  },
  {
    slug: "demo-add-again",
    title: "Demo: Add Again",
    difficulty: "medium",
    unit: "stack",
    tags: ["demo"],
  },
];

const units = [
  {
    id: "arrays-hashing",
    title: "Arrays & Hashing",
    description: "Demo unit shown only in the browser preview.",
    icon: "hash",
  },
  {
    id: "stack",
    title: "Stack",
    description: "Opens after the first demo problem is solved.",
    icon: "stack",
  },
];

const XP: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 40 };

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

// ---------- estado em localStorage ----------

const has = (key: string) => localStorage.getItem(key) !== null;

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function statusOf(slug: string): ProblemStatus {
  return has(SOLVED + slug) ? "solved" : "new";
}

function summary(p: DemoProblem): ProblemSummary {
  return { ...p, status: statusOf(p.slug) };
}

function find(slug: unknown): DemoProblem {
  const p = problems.find((x) => x.slug === slug);
  if (!p) throw { code: "not_found", message: `problem '${String(slug)}' does not exist` };
  return p;
}

/** A segunda unidade abre quando a questão da primeira foi resolvida. */
function isLocked(p: DemoProblem): boolean {
  return p.unit === units[1].id && !has(SOLVED + problems[0].slug);
}

function open(slug: unknown): DemoProblem {
  const p = find(slug);
  if (isLocked(p)) throw { code: "unit_locked", message: `unit '${p.unit}' is still locked` };
  return p;
}

function nextProblem(): DemoProblem | null {
  const unsolved = problems.filter((p) => !has(SOLVED + p.slug) && !isLocked(p));
  return unsolved[unsolved.length - 1] ?? null;
}

// ---------- datas, streak, nível ----------

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

// ---------- revisão ----------

const INTERVALS = [1, 3, 7, 14, 30];

type ReviewRow = {
  stage: number;
  due: string;
  awaiting: boolean;
  stageBefore: number | null;
  reviewedOn: string | null;
};

function reviews(): Record<string, ReviewRow> {
  return readJson<Record<string, ReviewRow>>(REVIEWS, {});
}

function saveReview(slug: string, row: ReviewRow) {
  localStorage.setItem(REVIEWS, JSON.stringify({ ...reviews(), [slug]: row }));
}

function inDays(from: string, n: number): string {
  const [y, m, d] = from.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

function scheduled(stage: number, from: string) {
  const capped = Math.min(stage, INTERVALS.length - 1);
  return { stage: capped, due: inDays(from, INTERVALS[capped]) };
}

function isDue(slug: string): boolean {
  const row = reviews()[slug];
  return row !== undefined && !row.awaiting && row.due <= daysAgo(0);
}

function scheduleView(row: ReviewRow): ReviewSchedule {
  return { stage: row.stage, due_date: row.due, awaiting_rating: row.awaiting };
}

function reviewQueue(): ReviewQueue {
  const today = daysAgo(0);
  const rows = Object.entries(reviews());
  const due = rows
    .filter(([slug]) => isDue(slug))
    .sort(([, a], [, b]) => a.due.localeCompare(b.due))
    .map(([slug, row]) => ({
      problem: summary(find(slug)),
      due_date: row.due,
      days_overdue: Math.round(
        (new Date(today).getTime() - new Date(row.due).getTime()) / 86_400_000,
      ),
      stage: row.stage,
    }));
  const future = rows.map(([, row]) => row.due).filter((d) => d > today).sort();
  return { due, next_due: future[0] ?? null };
}

function progress(): Progress {
  const events = readJson<XpEvent[]>(EVENTS, []);
  const unlocked = readJson<Record<string, string>>(UNLOCKED, {});
  const rewarded = problems.filter((p) => has(REWARDED + p.slug));
  const count = (d: Difficulty) => rewarded.filter((p) => p.difficulty === d).length;
  const byDate = new Map<string, number>();
  for (const e of events) byDate.set(e.date, (byDate.get(e.date) ?? 0) + 1);
  const next = nextProblem();
  return {
    today: daysAgo(0),
    streak: streakOf(events),
    level: levelOf(events.reduce((sum, e) => sum + e.amount, 0)),
    solved: {
      easy: count("easy"),
      medium: count("medium"),
      hard: count("hard"),
      total: rewarded.length,
    },
    problems_total: problems.length,
    activity: [...byDate.entries()].sort().map(([date, n]) => ({ date, count: n })),
    achievements: CATALOG.map((id) => ({ id, unlocked_on: unlocked[id] ?? null })),
    next_problem: next ? summary(next) : null,
    reviews_due: reviewQueue().due.length,
  };
}

function trail(): TrailUnit[] {
  const next = nextProblem();
  return units.map((unit, index) => {
    const own = problems.filter((p) => p.unit === unit.id);
    const solved = own.filter((p) => has(SOLVED + p.slug)).length;
    const locked = own.some(isLocked);
    return {
      ...unit,
      state: locked
        ? "locked"
        : solved === 0
          ? "unlocked"
          : solved === own.length
            ? "completed"
            : "in_progress",
      solved,
      total: own.length,
      blocked_by: locked
        ? { unit_id: units[index - 1].id, unit_title: units[index - 1].title, remaining: 1 }
        : null,
      current: next !== null && next.unit === unit.id,
      problems: own.map(summary),
    };
  });
}

// ---------- juiz de mentira ----------

function judge(code: string, includeHidden: boolean, revealHidden = false): RunOutcome {
  const selected = cases.filter((c) => includeHidden || !c.hidden);
  const correct = /return\s+a\s*\+\s*b/.test(code);
  const raises = code.includes("raise");
  const results: CaseResult[] = selected.map((c, index) => {
    const visible = !c.hidden || revealHidden;
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

function submit(slug: string, code: string, reviewMode: boolean): SubmitResult {
  const p = open(slug);
  const attempt = judge(code, true);
  if (attempt.verdict !== "accepted") return { outcome: attempt, rewards: null };
  // aceita: os casos ocultos são revelados
  const outcome = judge(code, true, true);

  const before = progress();
  const lockedBefore = problems.filter(isLocked).map((x) => x.unit);
  const dueReview = reviewMode && isDue(slug);
  const reason = dueReview
    ? "review"
    : has(REWARDED + slug)
      ? "already_solved"
      : has(GAVE_UP + slug)
        ? "gave_up"
        : "first_solve";
  localStorage.setItem(SOLVED + slug, "1");

  let review: ReviewSchedule | null = null;
  const existing = reviews()[slug];
  if (dueReview && existing) {
    // provisoriamente "ok", até a avaliação chegar
    const row = {
      ...scheduled(existing.stage + 1, daysAgo(0)),
      awaiting: true,
      stageBefore: existing.stage,
      reviewedOn: daysAgo(0),
    };
    saveReview(slug, row);
    review = scheduleView(row);
    const events = readJson<XpEvent[]>(EVENTS, []);
    events.push({ date: daysAgo(0), amount: 5 });
    localStorage.setItem(EVENTS, JSON.stringify(events));
  } else if (!existing) {
    saveReview(slug, {
      ...scheduled(0, daysAgo(0)),
      awaiting: false,
      stageBefore: null,
      reviewedOn: null,
    });
  }

  const earned: string[] = [];
  if (reason === "first_solve") {
    localStorage.setItem(REWARDED + slug, "1");
    const events = readJson<XpEvent[]>(EVENTS, []);
    events.push({ date: daysAgo(0), amount: XP[p.difficulty] });
    localStorage.setItem(EVENTS, JSON.stringify(events));

    const candidates = ["first-solve", "first-try", "unit-complete"];
    if (p.difficulty === "medium") candidates.push("first-medium");
    if (problems.every((x) => has(REWARDED + x.slug))) candidates.push("trail-complete");
    const unlocked = readJson<Record<string, string>>(UNLOCKED, {});
    for (const id of candidates) {
      if (!unlocked[id]) {
        unlocked[id] = daysAgo(0);
        earned.push(id);
      }
    }
    localStorage.setItem(UNLOCKED, JSON.stringify(unlocked));
  }

  const after = progress();
  const stillLocked = new Set(problems.filter(isLocked).map((x) => x.unit));
  return {
    outcome,
    rewards: {
      reason,
      xp_gained: reason === "first_solve" ? XP[p.difficulty] : reason === "review" ? 5 : 0,
      level_before: before.level.level,
      level: after.level,
      streak_before: before.streak.current,
      streak: after.streak,
      achievements: earned,
      units_unlocked: units
        .filter((u) => lockedBefore.includes(u.id) && !stillLocked.has(u.id))
        .map((u) => u.title),
      review,
    },
  };
}

function rate(slug: string, rating: Rating): ReviewSchedule {
  const row = reviews()[slug];
  if (!row || !row.awaiting) {
    throw { code: "not_awaiting_rating", message: "this review has no pending rating" };
  }
  const before = row.stageBefore ?? row.stage;
  const stage = rating === "hard" ? 0 : rating === "ok" ? before + 1 : before + 2;
  const next = {
    ...scheduled(stage, row.reviewedOn ?? daysAgo(0)),
    awaiting: false,
    stageBefore: null,
    reviewedOn: row.reviewedOn,
  };
  saveReview(slug, next);
  return scheduleView(next);
}

function fail(slug: string): ReviewSchedule {
  if (!isDue(slug)) throw { code: "not_due", message: "this problem is not due for review" };
  const next = {
    ...scheduled(0, daysAgo(0)),
    awaiting: false,
    stageBefore: null,
    reviewedOn: daysAgo(0),
  };
  saveReview(slug, next);
  return scheduleView(next);
}

export const devHandlers: Record<string, Handler> = {
  list_problems: (): ProblemSummary[] => problems.map(summary),

  get_problem: ({ slug }): ProblemDetail => {
    const p = open(slug);
    return {
      ...summary(p),
      statement,
      starter: STARTER,
      params: [
        { name: "a", type: "int" },
        { name: "b", type: "int" },
      ],
      returns: "int",
      hints: ["Python already knows how to add.", "Use the + operator."],
      complexity: { time: "O(1)", space: "O(1)" },
      draft: localStorage.getItem(DRAFT + p.slug),
      solution_unlocked: has(SOLVED + p.slug) || has(GAVE_UP + p.slug),
    };
  },

  run_code: ({ slug, code }) => {
    open(slug);
    return judge(String(code), false);
  },

  submit_code: ({ slug, code, review }) => submit(String(slug), String(code), review === true),

  get_review_queue: () => reviewQueue(),

  rate_review: ({ slug, rating }) => rate(String(slug), rating as Rating),

  fail_review: ({ slug }) => fail(String(slug)),

  // Sem área de trabalho no navegador: os comandos existem, mas não fazem nada.
  test_notification: () => null,

  get_autostart: () => has(AUTOSTART),

  set_autostart: ({ enabled }) => {
    if (enabled) localStorage.setItem(AUTOSTART, "1");
    else localStorage.removeItem(AUTOSTART);
    return null;
  },

  get_progress: () => progress(),

  get_trail: () => trail(),

  save_draft: ({ slug, code }) => {
    localStorage.setItem(DRAFT + find(slug).slug, String(code));
    return null;
  },

  get_solution: ({ slug, giveUp }) => {
    const key = open(slug).slug;
    if (!has(SOLVED + key) && !has(GAVE_UP + key)) {
      if (!giveUp) {
        throw { code: "solution_locked", message: "solve the problem or give up first" };
      }
      localStorage.setItem(GAVE_UP + key, "1");
    }
    return SOLUTION;
  },
};
