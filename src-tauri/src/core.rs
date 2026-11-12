//! Casos de uso do app, independentes do Tauri (testáveis sem janela).

use crate::content::{Complexity, Difficulty, Param, Problem, TestCase};
use crate::db;
use crate::error::{AppError, AppResult};
use crate::runner::{self, RunOutcome, Verdict};
use rusqlite::Connection;
use serde::Serialize;
use std::sync::{Mutex, MutexGuard};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProblemStatus {
    New,
    Attempted,
    Solved,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProblemSummary {
    pub slug: String,
    pub title: String,
    pub difficulty: Difficulty,
    pub unit: String,
    pub tags: Vec<String>,
    pub status: ProblemStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProblemDetail {
    #[serde(flatten)]
    pub summary: ProblemSummary,
    pub statement: String,
    pub starter: String,
    pub params: Vec<Param>,
    pub returns: String,
    pub hints: Vec<String>,
    pub complexity: Option<Complexity>,
    /// Rascunho salvo, se houver (RF-9).
    pub draft: Option<String>,
    /// A solução de referência já pode ser vista sem desistir (RF-10).
    pub solution_unlocked: bool,
}

pub struct Core {
    db: Mutex<Connection>,
    problems: Vec<Problem>,
    /// Interpretador a usar; `None` procura no PATH a cada execução.
    python: Option<String>,
}

impl Core {
    pub fn new(conn: Connection, problems: Vec<Problem>) -> Self {
        Self { db: Mutex::new(conn), problems, python: None }
    }

    pub fn conn(&self) -> AppResult<MutexGuard<'_, Connection>> {
        self.db
            .lock()
            .map_err(|_| AppError::new("state", "database lock poisoned"))
    }

    fn problem(&self, slug: &str) -> AppResult<&Problem> {
        self.problems
            .iter()
            .find(|p| p.slug == slug)
            .ok_or_else(|| AppError::new("not_found", format!("problem '{slug}' does not exist")))
    }

    fn python(&self) -> AppResult<String> {
        match &self.python {
            Some(p) => Ok(p.clone()),
            None => runner::find_python(),
        }
    }

    fn summary(p: &Problem, status: ProblemStatus) -> ProblemSummary {
        ProblemSummary {
            slug: p.slug.clone(),
            title: p.title.clone(),
            difficulty: p.difficulty,
            unit: p.unit.clone(),
            tags: p.tags.clone(),
            status,
        }
    }

    pub fn list_problems(&self) -> AppResult<Vec<ProblemSummary>> {
        let attempts = db::problems::attempt_map(&*self.conn()?)?;
        Ok(self
            .problems
            .iter()
            .map(|p| {
                let status = match attempts.get(&p.slug) {
                    Some(true) => ProblemStatus::Solved,
                    Some(false) => ProblemStatus::Attempted,
                    None => ProblemStatus::New,
                };
                Self::summary(p, status)
            })
            .collect())
    }

    pub fn get_problem(&self, slug: &str) -> AppResult<ProblemDetail> {
        let p = self.problem(slug)?;
        let conn = self.conn()?;
        let solved = db::problems::has_accepted(&conn, slug)?;
        let status = if solved {
            ProblemStatus::Solved
        } else if db::problems::count_submissions(&conn, slug)? > 0 {
            ProblemStatus::Attempted
        } else {
            ProblemStatus::New
        };
        Ok(ProblemDetail {
            summary: Self::summary(p, status),
            statement: p.statement.clone(),
            starter: p.starter.clone(),
            params: p.params.clone(),
            returns: p.returns.clone(),
            hints: p.hints.clone(),
            complexity: p.complexity.clone(),
            draft: db::problems::get_draft(&conn, slug)?,
            solution_unlocked: solved || db::problems::has_given_up(&conn, slug)?,
        })
    }

    /// "Executar": só os testes visíveis, sem registrar nada (RF-3, CA-9).
    pub fn run_code(&self, slug: &str, code: &str) -> AppResult<RunOutcome> {
        let p = self.problem(slug)?;
        let tests: Vec<&TestCase> = p.tests.iter().filter(|t| !t.hidden).collect();
        runner::run(&self.python()?, p, code, &tests)
    }

    /// "Enviar": todos os testes, e a submissão é gravada (RF-3, RF-8).
    pub fn submit_code(&self, slug: &str, code: &str, today: &str) -> AppResult<RunOutcome> {
        let p = self.problem(slug)?;
        let tests: Vec<&TestCase> = p.tests.iter().collect();
        // A trava do banco só é pega depois da execução, para não segurar o app.
        let outcome = runner::run(&self.python()?, p, code, &tests)?;
        db::problems::insert_submission(
            &*self.conn()?,
            &db::problems::NewSubmission {
                slug,
                code,
                verdict: outcome.verdict.as_str(),
                passed: outcome.passed,
                total: outcome.total,
                duration_ms: outcome.duration_ms,
                local_date: today,
            },
        )?;
        Ok(outcome)
    }

    pub fn save_draft(&self, slug: &str, code: &str) -> AppResult<()> {
        self.problem(slug)?;
        db::problems::save_draft(&*self.conn()?, slug, code)
    }

    /// Solução de referência: liberada se a questão já foi aceita, ou se a
    /// usuária confirma que desistiu (`give_up`), o que fica registrado (RF-10).
    pub fn get_solution(&self, slug: &str, give_up: bool, today: &str) -> AppResult<String> {
        let p = self.problem(slug)?;
        let conn = self.conn()?;
        let unlocked =
            db::problems::has_accepted(&conn, slug)? || db::problems::has_given_up(&conn, slug)?;
        if !unlocked {
            if !give_up {
                return Err(AppError::new("solution_locked", "solve the problem or give up first"));
            }
            db::problems::record_give_up(&conn, slug, today)?;
        }
        Ok(p.solution.clone())
    }
}

/// `true` quando a submissão foi aceita.
pub fn is_accepted(outcome: &RunOutcome) -> bool {
    outcome.verdict == Verdict::Accepted
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::testing::add_problem;

    const TODAY: &str = "2026-11-12";

    fn core() -> (tempfile::TempDir, Core) {
        let dir = tempfile::tempdir().unwrap();
        let conn = db::open(&dir.path().join("t.db")).unwrap();
        (dir, Core::new(conn, vec![add_problem()]))
    }

    fn submissions(core: &Core) -> i64 {
        db::problems::count_submissions(&core.conn().unwrap(), "add").unwrap()
    }

    // CA-9
    #[test]
    fn run_records_nothing_and_submit_records_exactly_one() {
        let (_d, core) = core();
        let good = add_problem().solution;

        let run = core.run_code("add", &good).unwrap();
        assert_eq!(run.total, 2, "run uses only the visible tests");
        assert_eq!(submissions(&core), 0);

        let sub = core.submit_code("add", &good, TODAY).unwrap();
        assert_eq!(sub.total, 3, "submit uses visible + hidden tests");
        assert!(is_accepted(&sub));
        assert_eq!(submissions(&core), 1);
    }

    #[test]
    fn submission_row_holds_code_verdict_and_date() {
        let (_d, core) = core();
        core.submit_code("add", "def add(a, b):\n    return 0\n", TODAY).unwrap();
        let conn = core.conn().unwrap();
        let (code, verdict, passed, total, date): (String, String, i64, i64, String) = conn
            .query_row(
                "SELECT code, verdict, passed, total, local_date FROM submissions",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .unwrap();
        assert!(code.contains("return 0"));
        assert_eq!(verdict, "wrong_answer");
        assert_eq!((passed, total), (1, 3));
        assert_eq!(date, TODAY);
    }

    #[test]
    fn status_goes_from_new_to_attempted_to_solved() {
        let (_d, core) = core();
        let status = |c: &Core| c.list_problems().unwrap()[0].status;
        assert_eq!(status(&core), ProblemStatus::New);

        core.submit_code("add", "def add(a, b):\n    return 0\n", TODAY).unwrap();
        assert_eq!(status(&core), ProblemStatus::Attempted);
        assert_eq!(core.get_problem("add").unwrap().summary.status, ProblemStatus::Attempted);

        core.submit_code("add", &add_problem().solution, TODAY).unwrap();
        assert_eq!(status(&core), ProblemStatus::Solved);

        // uma submissão errada depois de resolvida não tira o "resolvida"
        core.submit_code("add", "def add(a, b):\n    return 0\n", TODAY).unwrap();
        assert_eq!(status(&core), ProblemStatus::Solved);
    }

    // CA-10
    #[test]
    fn draft_survives_reopening_the_database() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("t.db");
        {
            let core = Core::new(db::open(&path).unwrap(), vec![add_problem()]);
            assert_eq!(core.get_problem("add").unwrap().draft, None);
            core.save_draft("add", "def add(a, b):\n    # wip\n").unwrap();
            core.save_draft("add", "def add(a, b):\n    return a\n").unwrap();
        }
        let core = Core::new(db::open(&path).unwrap(), vec![add_problem()]);
        assert_eq!(
            core.get_problem("add").unwrap().draft.as_deref(),
            Some("def add(a, b):\n    return a\n")
        );
    }

    // RF-10
    #[test]
    fn solution_is_locked_until_solved_or_given_up() {
        let (_d, core) = core();
        assert_eq!(core.get_solution("add", false, TODAY).unwrap_err().code, "solution_locked");
        assert!(!core.get_problem("add").unwrap().solution_unlocked);

        let solution = core.get_solution("add", true, TODAY).unwrap();
        assert_eq!(solution, add_problem().solution);
        assert!(core.get_problem("add").unwrap().solution_unlocked);
        // depois de desistir, não precisa confirmar de novo
        assert!(core.get_solution("add", false, TODAY).is_ok());
        assert!(db::problems::has_given_up(&core.conn().unwrap(), "add").unwrap());
    }

    #[test]
    fn solving_unlocks_the_solution_without_giving_up() {
        let (_d, core) = core();
        core.submit_code("add", &add_problem().solution, TODAY).unwrap();
        assert!(core.get_solution("add", false, TODAY).is_ok());
        assert!(!db::problems::has_given_up(&core.conn().unwrap(), "add").unwrap());
    }

    #[test]
    fn unknown_problem_is_not_found() {
        let (_d, core) = core();
        assert_eq!(core.get_problem("nope").unwrap_err().code, "not_found");
        assert_eq!(core.run_code("nope", "").unwrap_err().code, "not_found");
        assert_eq!(core.save_draft("nope", "").unwrap_err().code, "not_found");
    }

    #[test]
    fn missing_python_surfaces_as_python_missing() {
        let (_d, mut core) = core();
        core.python = Some("definitely-not-python-xyz".into());
        assert_eq!(core.run_code("add", "x").unwrap_err().code, "python_missing");
        assert_eq!(submissions(&core), 0);
    }

    // Ponta a ponta com o conteúdo real: toda solução de referência é aceita
    // pelo mesmo caminho que o botão "Enviar" usa, e nenhum starter é.
    #[test]
    fn repository_problems_accept_their_reference_solutions() {
        let content = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("content");
        let problems = crate::content::load_all(&content).problems;
        assert!(!problems.is_empty());
        let dir = tempfile::tempdir().unwrap();
        let core = Core::new(db::open(&dir.path().join("t.db")).unwrap(), problems.clone());

        for p in &problems {
            let starter = core.submit_code(&p.slug, &p.starter, TODAY).unwrap();
            assert!(!is_accepted(&starter), "{}: starter must not pass", p.slug);

            let solved = core.submit_code(&p.slug, &p.solution, TODAY).unwrap();
            assert!(is_accepted(&solved), "{}: {:?}", p.slug, solved.cases.iter().find(|c| c.error.is_some()));
            assert_eq!(solved.total, p.tests.len());
        }
        let statuses = core.list_problems().unwrap();
        assert!(statuses.iter().all(|s| s.status == ProblemStatus::Solved));
    }
}
