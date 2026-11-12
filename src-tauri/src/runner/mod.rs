//! Executa uma solução Python contra casos de teste em um subprocesso (spec 002).
//!
//! O harness (`harness.py`) emite uma linha por evento, prefixada por um token
//! do job. O tempo limite é imposto aqui: se o resultado de um caso não chega
//! a tempo, o processo é morto.

use crate::content::{Problem, TestCase};
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::{Duration, Instant};

pub const HARNESS: &str = include_str!("harness.py");

/// Tempo para o interpretador subir e o harness começar.
const STARTUP: Duration = Duration::from_secs(10);
/// Tempo entre o fim de um caso e o começo do próximo.
const IDLE: Duration = Duration::from_secs(5);
/// Folga somada ao limite de cada caso antes de matar o processo.
const GRACE: Duration = Duration::from_millis(300);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Verdict {
    Accepted,
    WrongAnswer,
    RuntimeError,
    TimeLimit,
    SyntaxError,
}

impl Verdict {
    pub fn as_str(self) -> &'static str {
        match self {
            Verdict::Accepted => "accepted",
            Verdict::WrongAnswer => "wrong_answer",
            Verdict::RuntimeError => "runtime_error",
            Verdict::TimeLimit => "time_limit",
            Verdict::SyntaxError => "syntax_error",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CaseStatus {
    Passed,
    WrongAnswer,
    RuntimeError,
    TimeLimit,
    NotRun,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErrorInfo {
    #[serde(rename = "type")]
    pub ty: String,
    pub message: String,
    /// Linha no código da usuária, quando conhecida.
    pub line: Option<u32>,
    pub column: Option<u32>,
    pub traceback: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct NamedValue {
    pub name: String,
    pub value: Value,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct CaseResult {
    pub index: usize,
    pub hidden: bool,
    pub status: CaseStatus,
    /// Ausentes em caso oculto (RF-6).
    pub input: Option<Vec<NamedValue>>,
    pub expected: Option<Value>,
    pub actual: Option<Value>,
    pub stdout: String,
    pub error: Option<ErrorInfo>,
    pub time_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RunOutcome {
    pub verdict: Verdict,
    pub passed: usize,
    pub total: usize,
    pub cases: Vec<CaseResult>,
    /// Erro que impediu rodar qualquer caso (sintaxe, exceção ao carregar).
    pub error: Option<ErrorInfo>,
    pub duration_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "event", rename_all = "snake_case")]
enum Event {
    Loading,
    Loaded,
    Start {
        index: usize,
    },
    Result {
        index: usize,
        status: CaseStatus,
        #[serde(default)]
        actual: Value,
        #[serde(default)]
        stdout: String,
        #[serde(default)]
        error: Option<ErrorInfo>,
        time_ms: u64,
    },
    Fatal {
        verdict: Verdict,
        error: ErrorInfo,
    },
    Done,
}

struct Finished {
    status: CaseStatus,
    actual: Value,
    stdout: String,
    error: Option<ErrorInfo>,
    time_ms: u64,
}

/// Procura um interpretador Python 3 utilizável (RF-11).
pub fn find_python() -> AppResult<String> {
    for candidate in ["python3", "python"] {
        let ok = Command::new(candidate)
            .args(["-I", "-c", "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ok {
            return Ok(candidate.to_string());
        }
    }
    Err(python_missing())
}

fn python_missing() -> AppError {
    AppError::new("python_missing", "python3 (3.9 or newer) was not found on PATH")
}

fn token() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("duo-{:x}-{:x}", nanos, std::process::id())
}

/// Roda `code` contra `tests` (um subconjunto dos testes de `problem`).
pub fn run(
    python: &str,
    problem: &Problem,
    code: &str,
    tests: &[&TestCase],
) -> AppResult<RunOutcome> {
    let started = Instant::now();
    let limit = Duration::from_millis(problem.time_limit_ms);
    let token = token();

    let dir = tempfile::Builder::new().prefix("duo-code-run-").tempdir()?;
    std::fs::write(dir.path().join("solution.py"), code)?;
    std::fs::write(dir.path().join("harness.py"), HARNESS)?;
    let job = json!({
        "token": token,
        "code_file": "solution.py",
        "entrypoint": problem.entrypoint,
        "params": problem.params,
        "returns": problem.returns,
        "comparator": problem.comparator,
        "time_limit_ms": problem.time_limit_ms,
        "tests": tests.iter().map(|t| json!({"args": t.args, "expected": t.expected})).collect::<Vec<_>>(),
    });
    std::fs::write(dir.path().join("job.json"), job.to_string())?;

    let mut child = Command::new(python)
        .args(["-I", "harness.py", "job.json"])
        .current_dir(dir.path())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => python_missing(),
            _ => AppError::from(e),
        })?;

    // Leitores em threads próprias, para que o laço abaixo possa esperar com prazo.
    let (tx, rx) = mpsc::channel::<String>();
    let stdout = child.stdout.take().expect("piped stdout");
    thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if tx.send(line).is_err() {
                break;
            }
        }
    });
    let (err_tx, err_rx) = mpsc::channel::<String>();
    let mut stderr = child.stderr.take().expect("piped stderr");
    thread::spawn(move || {
        let mut text = String::new();
        let _ = stderr.read_to_string(&mut text);
        let _ = err_tx.send(text);
    });

    let prefix = format!("{token} ");
    let mut results: Vec<Option<Finished>> = (0..tests.len()).map(|_| None).collect();
    let mut fatal: Option<(Verdict, ErrorInfo)> = None;
    let mut current: Option<usize> = None;
    let mut loading = false;
    let mut loaded = false;
    let mut done = false;
    let mut timed_out = false;
    let mut wait = STARTUP;

    loop {
        match rx.recv_timeout(wait) {
            Ok(line) => {
                let Some(payload) = line.strip_prefix(&prefix) else {
                    continue; // não é do protocolo
                };
                let Ok(event) = serde_json::from_str::<Event>(payload) else {
                    continue;
                };
                match event {
                    Event::Loading => {
                        loading = true;
                        wait = limit + GRACE;
                    }
                    Event::Loaded => {
                        loaded = true;
                        wait = IDLE;
                    }
                    Event::Start { index } => {
                        current = Some(index);
                        wait = limit + GRACE;
                    }
                    Event::Result { index, status, actual, stdout, error, time_ms } => {
                        if let Some(slot) = results.get_mut(index) {
                            *slot = Some(Finished { status, actual, stdout, error, time_ms });
                        }
                        current = None;
                        wait = IDLE;
                    }
                    Event::Fatal { verdict, error } => {
                        fatal = Some((verdict, error));
                        break;
                    }
                    Event::Done => {
                        done = true;
                        break;
                    }
                }
            }
            Err(RecvTimeoutError::Timeout) => {
                timed_out = true;
                break;
            }
            Err(RecvTimeoutError::Disconnected) => break, // o processo terminou
        }
    }

    let _ = child.kill();
    let _ = child.wait();
    let stderr_text = err_rx
        .recv_timeout(Duration::from_millis(500))
        .unwrap_or_default();

    let duration_ms = started.elapsed().as_millis() as u64;
    let outcome = |verdict, cases: Vec<CaseResult>, error| RunOutcome {
        verdict,
        passed: cases.iter().filter(|c| c.status == CaseStatus::Passed).count(),
        total: cases.len(),
        cases,
        error,
        duration_ms,
    };
    let blank = |index: usize, status: CaseStatus| {
        let test = tests[index];
        CaseResult {
            index,
            hidden: test.hidden,
            status,
            input: (!test.hidden).then(|| named_args(problem, test)),
            expected: (!test.hidden).then(|| test.expected.clone()),
            actual: None,
            stdout: String::new(),
            error: None,
            time_ms: None,
        }
    };
    let all_not_run = || (0..tests.len()).map(|i| blank(i, CaseStatus::NotRun)).collect();

    if let Some((verdict, error)) = fatal {
        return Ok(outcome(verdict, all_not_run(), Some(error)));
    }
    if !loaded {
        if timed_out && loading {
            // laço infinito no nível do módulo
            return Ok(outcome(Verdict::TimeLimit, all_not_run(), None));
        }
        let detail = stderr_text.trim();
        return Err(AppError::new(
            "runner",
            if detail.is_empty() { "the Python process did not start" } else { detail },
        ));
    }

    let mut cases = Vec::with_capacity(tests.len());
    for (index, slot) in results.into_iter().enumerate() {
        let case = match slot {
            Some(f) => {
                let mut c = blank(index, f.status);
                if !c.hidden {
                    c.actual = f.error.is_none().then_some(f.actual);
                    c.stdout = f.stdout;
                }
                c.error = f.error;
                c.time_ms = Some(f.time_ms);
                c
            }
            None if current == Some(index) && timed_out => blank(index, CaseStatus::TimeLimit),
            None if current == Some(index) && !done => {
                let mut c = blank(index, CaseStatus::RuntimeError);
                c.error = Some(process_exit(&stderr_text));
                c
            }
            None => blank(index, CaseStatus::NotRun),
        };
        cases.push(case);
    }

    let verdict = match cases.iter().find(|c| c.status != CaseStatus::Passed) {
        None => Verdict::Accepted,
        Some(c) => match c.status {
            CaseStatus::WrongAnswer => Verdict::WrongAnswer,
            CaseStatus::TimeLimit => Verdict::TimeLimit,
            _ => Verdict::RuntimeError,
        },
    };
    Ok(outcome(verdict, cases, None))
}

fn named_args(problem: &Problem, test: &TestCase) -> Vec<NamedValue> {
    problem
        .params
        .iter()
        .zip(&test.args)
        .map(|(p, v)| NamedValue { name: p.name.clone(), value: v.clone() })
        .collect()
}

fn process_exit(stderr: &str) -> ErrorInfo {
    let tail: Vec<&str> = stderr.lines().rev().take(5).collect();
    let tail: Vec<&str> = tail.into_iter().rev().collect();
    ErrorInfo {
        ty: "ProcessExit".into(),
        message: "the Python process ended before finishing this test".into(),
        line: None,
        column: None,
        traceback: tail.join("\n"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::testing::add_problem;
    use crate::content::{Comparator, Param};

    fn python() -> String {
        find_python().expect("python3 is required to run these tests")
    }

    fn run_all(problem: &Problem, code: &str) -> RunOutcome {
        let tests: Vec<&TestCase> = problem.tests.iter().collect();
        run(&python(), problem, code, &tests).unwrap()
    }

    fn single(params: &[(&str, &str)], returns: &str, cmp: Comparator, args: Vec<Value>, expected: Value) -> Problem {
        let mut p = add_problem();
        p.entrypoint = "f".into();
        p.params = params
            .iter()
            .map(|(n, t)| Param { name: n.to_string(), ty: t.to_string() })
            .collect();
        p.returns = returns.into();
        p.comparator = cmp;
        p.tests = vec![TestCase { args, expected, hidden: false }];
        p
    }

    // CA-1
    #[test]
    fn correct_solution_is_accepted() {
        let p = add_problem();
        let out = run_all(&p, &p.solution);
        assert_eq!(out.verdict, Verdict::Accepted);
        assert_eq!((out.passed, out.total), (3, 3));
        assert!(out.cases.iter().all(|c| c.status == CaseStatus::Passed));
    }

    // CA-2
    #[test]
    fn wrong_answer_reports_expected_and_actual() {
        let p = add_problem();
        let out = run_all(&p, "def add(a, b):\n    return 3\n");
        assert_eq!(out.verdict, Verdict::WrongAnswer);
        let first_fail = out.cases.iter().find(|c| c.status != CaseStatus::Passed).unwrap();
        assert_eq!(first_fail.index, 1);
        assert_eq!(first_fail.expected, Some(json!(0)));
        assert_eq!(first_fail.actual, Some(json!(3)));
        let input = first_fail.input.as_ref().unwrap();
        assert_eq!(input[0], NamedValue { name: "a".into(), value: json!(-5) });
    }

    // CA-3
    #[test]
    fn exception_reports_type_and_user_line() {
        let p = add_problem();
        let code = "def helper(x):\n    return x / 0\n\ndef add(a, b):\n    return helper(a)\n";
        let out = run_all(&p, code);
        assert_eq!(out.verdict, Verdict::RuntimeError);
        let err = out.cases[0].error.as_ref().unwrap();
        assert_eq!(err.ty, "ZeroDivisionError");
        assert_eq!(err.line, Some(2));
        assert!(err.traceback.contains("line 5, in add"), "{}", err.traceback);
        assert!(!err.traceback.contains("harness"), "{}", err.traceback);
    }

    // CA-4
    #[test]
    fn syntax_error_runs_no_tests() {
        let p = add_problem();
        let out = run_all(&p, "def add(a, b):\n    return a +\n");
        assert_eq!(out.verdict, Verdict::SyntaxError);
        let err = out.error.unwrap();
        assert_eq!(err.line, Some(2));
        assert!(err.column.is_some());
        assert!(out.cases.iter().all(|c| c.status == CaseStatus::NotRun));
        assert_eq!(out.passed, 0);
    }

    // CA-5
    #[test]
    fn infinite_loop_is_killed_within_the_limit() {
        let mut p = add_problem();
        p.time_limit_ms = 500;
        // captura tudo: o limite não pode depender de exceção dentro do código
        let code = "def add(a, b):\n    while True:\n        try:\n            pass\n        except BaseException:\n            pass\n";
        let started = Instant::now();
        let out = run_all(&p, code);
        let elapsed = started.elapsed();

        assert_eq!(out.verdict, Verdict::TimeLimit);
        assert_eq!(out.cases[0].status, CaseStatus::TimeLimit);
        assert_eq!(out.cases[1].status, CaseStatus::NotRun);
        assert!(elapsed < Duration::from_millis(1500), "took {elapsed:?}");
    }

    #[test]
    fn infinite_loop_at_module_level_is_a_time_limit() {
        let mut p = add_problem();
        p.time_limit_ms = 400;
        let out = run_all(&p, "while True:\n    pass\n");
        assert_eq!(out.verdict, Verdict::TimeLimit);
    }

    #[test]
    fn slow_but_finishing_case_is_a_time_limit() {
        let mut p = add_problem();
        p.time_limit_ms = 100;
        let code = "import time\ndef add(a, b):\n    time.sleep(0.2)\n    return a + b\n";
        let out = run_all(&p, code);
        assert_eq!(out.cases[0].status, CaseStatus::TimeLimit);
    }

    // CA-6
    #[test]
    fn print_is_captured_and_does_not_affect_the_verdict() {
        let p = add_problem();
        let code = "import sys\ndef add(a, b):\n    print('debug', a, b)\n    print('oops', file=sys.stderr)\n    return a + b\n";
        let out = run_all(&p, code);
        assert_eq!(out.verdict, Verdict::Accepted);
        assert_eq!(out.cases[0].stdout, "debug 1 2\noops\n");
        // saída de caso oculto não é devolvida
        assert_eq!(out.cases[2].stdout, "");
    }

    #[test]
    fn printing_protocol_lookalikes_cannot_forge_results() {
        let p = add_problem();
        let code = "import os\ndef add(a, b):\n    os.write(1, b'{\"event\": \"done\"}\\n')\n    return 0\n";
        let out = run_all(&p, code);
        assert_eq!(out.verdict, Verdict::WrongAnswer);
    }

    // CA-7
    #[test]
    fn unordered_comparator_ignores_order() {
        let p = single(&[], "list[int]", Comparator::Unordered, vec![], json!([1, 2]));
        assert_eq!(run_all(&p, "def f():\n    return [2, 1]\n").verdict, Verdict::Accepted);
        assert_eq!(run_all(&p, "def f():\n    return [2, 2]\n").verdict, Verdict::WrongAnswer);

        let exact = single(&[], "list[int]", Comparator::Exact, vec![], json!([1, 2]));
        assert_eq!(run_all(&exact, "def f():\n    return [2, 1]\n").verdict, Verdict::WrongAnswer);
    }

    // CA-7
    #[test]
    fn float_comparator_has_tolerance() {
        let p = single(&[], "float", Comparator::Float, vec![], json!(0.3));
        assert_eq!(run_all(&p, "def f():\n    return 0.1 + 0.2\n").verdict, Verdict::Accepted);
        assert_eq!(run_all(&p, "def f():\n    return 0.30001\n").verdict, Verdict::WrongAnswer);

        let exact = single(&[], "float", Comparator::Exact, vec![], json!(0.3));
        assert_eq!(run_all(&exact, "def f():\n    return 0.1 + 0.2\n").verdict, Verdict::WrongAnswer);
    }

    #[test]
    fn exact_comparator_distinguishes_bool_from_int_and_accepts_tuples() {
        let p = single(&[], "bool", Comparator::Exact, vec![], json!(true));
        assert_eq!(run_all(&p, "def f():\n    return 1\n").verdict, Verdict::WrongAnswer);
        assert_eq!(run_all(&p, "def f():\n    return True\n").verdict, Verdict::Accepted);

        let t = single(&[], "list[int]", Comparator::Exact, vec![], json!([1, 2]));
        assert_eq!(run_all(&t, "def f():\n    return (1, 2)\n").verdict, Verdict::Accepted);
    }

    // CA-8
    #[test]
    fn linked_list_is_converted_both_ways() {
        let p = single(
            &[("head", "ListNode")],
            "ListNode",
            Comparator::Exact,
            vec![json!([1, 2, 3])],
            json!([2, 3]),
        );
        let code = "def f(head):\n    assert isinstance(head, ListNode)\n    assert head.next.next.val == 3 and head.next.next.next is None\n    return head.next\n";
        let out = run_all(&p, code);
        assert_eq!(out.verdict, Verdict::Accepted, "{:?}", out.cases[0].error);

        let empty = single(&[("head", "ListNode")], "ListNode", Comparator::Exact, vec![json!([])], json!([]));
        assert_eq!(run_all(&empty, "def f(head):\n    assert head is None\n    return None\n").verdict, Verdict::Accepted);
    }

    #[test]
    fn tree_is_converted_both_ways() {
        let p = single(
            &[("root", "TreeNode")],
            "TreeNode",
            Comparator::Exact,
            vec![json!([1, null, 2, 3])],
            json!([2, 3]),
        );
        let code = "def f(root):\n    assert root.left is None and root.right.left.val == 3\n    return root.right\n";
        let out = run_all(&p, code);
        assert_eq!(out.verdict, Verdict::Accepted, "{:?}", out.cases[0].error);
    }

    #[test]
    fn returning_the_wrong_kind_of_value_is_reported() {
        let p = single(&[("head", "ListNode")], "ListNode", Comparator::Exact, vec![json!([1])], json!([1]));
        let out = run_all(&p, "def f(head):\n    return [1]\n");
        assert_eq!(out.verdict, Verdict::RuntimeError);
        assert!(out.cases[0].error.as_ref().unwrap().message.contains("ListNode"));
    }

    #[test]
    fn mutating_the_arguments_does_not_change_the_reported_input() {
        let p = single(&[("xs", "list[int]")], "int", Comparator::Exact, vec![json!([3, 1, 2])], json!(0));
        let out = run_all(&p, "def f(xs):\n    xs.sort()\n    return xs[0]\n");
        assert_eq!(out.cases[0].input.as_ref().unwrap()[0].value, json!([3, 1, 2]));
    }

    #[test]
    fn hidden_cases_never_reveal_input_or_expected() {
        let p = add_problem();
        let out = run_all(&p, "def add(a, b):\n    return -1\n");
        let hidden = &out.cases[2];
        assert!(hidden.hidden);
        assert_eq!(hidden.status, CaseStatus::WrongAnswer);
        assert_eq!((&hidden.input, &hidden.expected, &hidden.actual), (&None, &None, &None));
    }

    #[test]
    fn missing_entrypoint_is_a_runtime_error() {
        let p = add_problem();
        let out = run_all(&p, "def other():\n    pass\n");
        assert_eq!(out.verdict, Verdict::RuntimeError);
        assert!(out.error.unwrap().message.contains("add"));
    }

    #[test]
    fn exception_while_loading_is_a_runtime_error() {
        let p = add_problem();
        let out = run_all(&p, "import nonexistent_module_xyz\ndef add(a, b):\n    return a + b\n");
        assert_eq!(out.verdict, Verdict::RuntimeError);
        let err = out.error.unwrap();
        assert_eq!(err.ty, "ModuleNotFoundError");
        assert_eq!(err.line, Some(1));
    }

    #[test]
    fn hard_exit_is_reported_on_the_running_case() {
        let p = add_problem();
        let out = run_all(&p, "import os\ndef add(a, b):\n    os._exit(3)\n");
        assert_eq!(out.verdict, Verdict::RuntimeError);
        assert_eq!(out.cases[0].error.as_ref().unwrap().ty, "ProcessExit");
        assert_eq!(out.cases[1].status, CaseStatus::NotRun);
    }

    // RF-11
    #[test]
    fn missing_interpreter_is_a_clear_error() {
        let p = add_problem();
        let tests: Vec<&TestCase> = p.tests.iter().collect();
        let err = run("definitely-not-python-xyz", &p, &p.solution, &tests).unwrap_err();
        assert_eq!(err.code, "python_missing");
    }
}
