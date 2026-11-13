//! Casos de uso do app, independentes do Tauri (testáveis sem janela).

use crate::content::{Complexity, Difficulty, Param, Problem, TestCase, Unit};
use crate::db;
use crate::domain::achievements::{self, AchievementState};
use crate::domain::streak::{streak, Streak};
use crate::domain::trail::{self, UnitDef, UnitProgress, UnitState};
use crate::domain::xp::{level_info, xp_for, LevelInfo, XpEvent};
use crate::error::{AppError, AppResult};
use crate::runner::{self, RunOutcome, Verdict};
use chrono::{Days, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, MutexGuard};

/// Por que uma submissão aceita rendeu (ou não) recompensa.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RewardReason {
    FirstSolve,
    /// Já tinha rendido XP antes: reenviar não conta (CA-7).
    AlreadySolved,
    /// A usuária desistiu desta questão antes de resolvê-la (CA-13).
    GaveUp,
}

/// Resumo de recompensas de uma submissão aceita (RF-3).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Rewards {
    pub reason: RewardReason,
    pub xp_gained: u32,
    pub level_before: u32,
    pub level: LevelInfo,
    pub streak_before: u32,
    pub streak: Streak,
    /// Ids das conquistas destravadas por esta submissão.
    pub achievements: Vec<String>,
    /// Títulos das unidades da trilha que abriram com esta submissão (004 RF-6).
    pub units_unlocked: Vec<String>,
}

/// O que falta para uma unidade bloqueada abrir (004 RF-4).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TrailBlocker {
    pub unit_id: String,
    pub unit_title: String,
    pub remaining: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TrailUnit {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub state: UnitState,
    pub solved: u32,
    pub total: u32,
    pub blocked_by: Option<TrailBlocker>,
    /// É a unidade da próxima questão sugerida.
    pub current: bool,
    pub problems: Vec<ProblemSummary>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SubmitResult {
    pub outcome: RunOutcome,
    /// Presente quando a submissão foi aceita.
    pub rewards: Option<Rewards>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
pub struct SolvedCounts {
    pub easy: u32,
    pub medium: u32,
    pub hard: u32,
    pub total: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ActivityDay {
    pub date: String,
    /// Eventos que renderam XP no dia.
    pub count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AchievementStatus {
    pub id: String,
    pub unlocked_on: Option<String>,
}

/// Tudo que Home e Perfil mostram (RF-4, RF-5).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Progress {
    pub today: String,
    pub streak: Streak,
    pub level: LevelInfo,
    pub solved: SolvedCounts,
    pub problems_total: u32,
    /// Últimos 12 meses, só os dias com atividade.
    pub activity: Vec<ActivityDay>,
    pub achievements: Vec<AchievementStatus>,
    pub next_problem: Option<ProblemSummary>,
}

/// Quantos dias de atividade o calendário do perfil cobre (53 semanas).
pub const ACTIVITY_DAYS: u64 = 371;

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
    /// Trilha, em ordem. Vazia = sem trilha: toda questão fica acessível.
    units: Vec<Unit>,
    unit_defs: Vec<UnitDef>,
    /// Interpretador a usar; `None` procura no PATH a cada execução.
    python: Option<String>,
}

impl Core {
    /// Sem trilha: nenhuma questão é bloqueada.
    pub fn new(conn: Connection, problems: Vec<Problem>) -> Self {
        Self::with_units(conn, problems, Vec::new())
    }

    pub fn with_units(conn: Connection, problems: Vec<Problem>, units: Vec<Unit>) -> Self {
        let unit_defs = units
            .iter()
            .map(|u| UnitDef { id: u.id.clone(), problems: u.problems.clone() })
            .collect();
        Self { db: Mutex::new(conn), problems, units, unit_defs, python: None }
    }

    /// Questões com submissão aceita: é o que conta como "resolvida" na trilha.
    fn accepted_slugs(conn: &Connection) -> AppResult<HashSet<String>> {
        Ok(db::problems::attempt_map(conn)?
            .into_iter()
            .filter(|(_, solved)| *solved)
            .map(|(slug, _)| slug)
            .collect())
    }

    fn trail_progress(&self, conn: &Connection) -> AppResult<(Vec<UnitProgress>, HashSet<String>)> {
        let solved = Self::accepted_slugs(conn)?;
        let kept = db::progress::unlocked_units(conn)?;
        Ok((trail::trail_state(&self.unit_defs, &solved, &kept), solved))
    }

    /// Grava as unidades que estão liberadas, para nunca voltarem a bloquear.
    fn keep_unlocked(&self, conn: &Connection, progress: &[UnitProgress], today: &str) -> AppResult<()> {
        for (unit, p) in self.units.iter().zip(progress) {
            if p.state != UnitState::Locked {
                db::progress::keep_unit_unlocked(conn, &unit.id, today)?;
            }
        }
        Ok(())
    }

    /// Erro `unit_locked` se a questão pertence a uma unidade bloqueada (004 CA-5).
    fn ensure_unlocked(&self, conn: &Connection, slug: &str) -> AppResult<()> {
        let Some(index) = self.units.iter().position(|u| u.problems.iter().any(|s| s == slug)) else {
            return Ok(()); // fora da trilha
        };
        let (progress, _) = self.trail_progress(conn)?;
        if progress[index].state == UnitState::Locked {
            return Err(AppError::new(
                "unit_locked",
                format!("unit '{}' is still locked", self.units[index].id),
            ));
        }
        Ok(())
    }

    fn blocker(&self, progress: &UnitProgress) -> Option<TrailBlocker> {
        progress.blocked_by.map(|b| TrailBlocker {
            unit_id: self.units[b.unit].id.clone(),
            unit_title: self.units[b.unit].title.clone(),
            remaining: b.remaining,
        })
    }

    /// A trilha inteira, com o estado de cada unidade e questão (004 RF-1 a RF-4).
    pub fn trail(&self, today: &str) -> AppResult<Vec<TrailUnit>> {
        db::progress::parse_date(today)?;
        let conn = self.conn()?;
        let (progress, solved) = self.trail_progress(&conn)?;
        self.keep_unlocked(&conn, &progress, today)?;
        let attempts = db::problems::attempt_map(&conn)?;
        let suggested = trail::suggest(&self.unit_defs, &progress, &solved);

        Ok(self
            .units
            .iter()
            .zip(&progress)
            .map(|(unit, p)| TrailUnit {
                id: unit.id.clone(),
                title: unit.title.clone(),
                description: unit.description.clone(),
                icon: unit.icon.clone(),
                state: p.state,
                solved: p.solved,
                total: p.total,
                blocked_by: self.blocker(p),
                current: suggested.is_some_and(|s| unit.problems.iter().any(|x| x == s)),
                problems: unit
                    .problems
                    .iter()
                    .filter_map(|slug| self.problems.iter().find(|q| &q.slug == slug))
                    .map(|q| Self::summary(q, Self::status_of(&attempts, &q.slug)))
                    .collect(),
            })
            .collect())
    }

    fn status_of(attempts: &HashMap<String, bool>, slug: &str) -> ProblemStatus {
        match attempts.get(slug) {
            Some(true) => ProblemStatus::Solved,
            Some(false) => ProblemStatus::Attempted,
            None => ProblemStatus::New,
        }
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
            .map(|p| Self::summary(p, Self::status_of(&attempts, &p.slug)))
            .collect())
    }

    pub fn get_problem(&self, slug: &str) -> AppResult<ProblemDetail> {
        let p = self.problem(slug)?;
        let conn = self.conn()?;
        self.ensure_unlocked(&conn, slug)?;
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
        self.ensure_unlocked(&*self.conn()?, slug)?;
        let tests: Vec<&TestCase> = p.tests.iter().filter(|t| !t.hidden).collect();
        runner::run(&self.python()?, p, code, &tests)
    }

    /// Estado de progresso lido do banco, para as regras puras decidirem.
    fn snapshot(
        &self,
        conn: &Connection,
        today: NaiveDate,
    ) -> AppResult<(Streak, LevelInfo, HashSet<String>)> {
        let streak = streak(&db::progress::active_dates(conn)?, today);
        let level = level_info(db::progress::xp_total(conn)?);
        Ok((streak, level, db::progress::rewarded_slugs(conn)?))
    }

    fn solved_counts(&self, rewarded: &HashSet<String>) -> SolvedCounts {
        let mut counts = SolvedCounts::default();
        for p in self.problems.iter().filter(|p| rewarded.contains(&p.slug)) {
            match p.difficulty {
                Difficulty::Easy => counts.easy += 1,
                Difficulty::Medium => counts.medium += 1,
                Difficulty::Hard => counts.hard += 1,
            }
            counts.total += 1;
        }
        counts
    }

    /// (unidades com todas as questões resolvidas, total de unidades)
    fn unit_counts(&self, rewarded: &HashSet<String>) -> (u32, u32) {
        let mut units: HashMap<&str, bool> = HashMap::new();
        for p in &self.problems {
            let complete = units.entry(p.unit.as_str()).or_insert(true);
            *complete &= rewarded.contains(&p.slug);
        }
        (units.values().filter(|c| **c).count() as u32, units.len() as u32)
    }

    /// "Enviar": todos os testes; grava a submissão e, se aceita, as
    /// recompensas — tudo em uma única transação (RF-2, CA-11).
    pub fn submit_code(&self, slug: &str, code: &str, today: &str) -> AppResult<SubmitResult> {
        let p = self.problem(slug)?;
        let date = db::progress::parse_date(today)?;
        self.ensure_unlocked(&*self.conn()?, slug)?;
        let tests: Vec<&TestCase> = p.tests.iter().collect();
        // A trava do banco só é pega depois da execução, para não segurar o app.
        let outcome = runner::run(&self.python()?, p, code, &tests)?;

        let mut conn = self.conn()?;
        let tx = conn.transaction()?;
        let (trail_before, _) = self.trail_progress(&tx)?;
        let first_submission = db::problems::count_submissions(&tx, slug)? == 0;
        db::problems::insert_submission(
            &tx,
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

        let rewards = if is_accepted(&outcome) {
            let (streak_before, level_before, rewarded_before) = self.snapshot(&tx, date)?;
            let reason = if rewarded_before.contains(slug) {
                RewardReason::AlreadySolved
            } else if db::problems::has_given_up(&tx, slug)? {
                RewardReason::GaveUp
            } else {
                RewardReason::FirstSolve
            };
            let xp_gained = if reason == RewardReason::FirstSolve {
                let amount = xp_for(XpEvent::FirstSolve(p.difficulty));
                db::progress::insert_xp_event(&tx, today, db::progress::KIND_SOLVE, slug, amount)?;
                amount
            } else {
                0
            };

            let (streak, level, rewarded) = self.snapshot(&tx, date)?;
            let solved = self.solved_counts(&rewarded);
            let (units_completed, units_total) = self.unit_counts(&rewarded);
            let state = AchievementState {
                solved: solved.total,
                solved_medium: solved.medium,
                solved_hard: solved.hard,
                streak: streak.current,
                units_completed,
                units_total,
                first_try: reason == RewardReason::FirstSolve && first_submission,
                reviews: db::progress::review_count(&tx)?,
                level: level.level,
            };
            let already = db::progress::unlocked_achievements(&tx)?;
            let mut unlocked = Vec::new();
            for id in achievements::evaluate(&state) {
                if !already.contains_key(id) {
                    db::progress::unlock_achievement(&tx, id, today)?;
                    unlocked.push(id.to_string());
                }
            }
            let (trail_after, _) = self.trail_progress(&tx)?;
            self.keep_unlocked(&tx, &trail_after, today)?;
            let units_unlocked = self
                .units
                .iter()
                .zip(trail_before.iter().zip(&trail_after))
                .filter(|(_, (before, after))| {
                    before.state == UnitState::Locked && after.state != UnitState::Locked
                })
                .map(|(unit, _)| unit.title.clone())
                .collect();
            Some(Rewards {
                reason,
                xp_gained,
                level_before: level_before.level,
                level,
                streak_before: streak_before.current,
                streak,
                achievements: unlocked,
                units_unlocked,
            })
        } else {
            None
        };

        tx.commit()?;
        Ok(SubmitResult { outcome, rewards })
    }

    pub fn progress(&self, today: &str) -> AppResult<Progress> {
        let date = db::progress::parse_date(today)?;
        let conn = self.conn()?;
        let (streak, level, rewarded) = self.snapshot(&conn, date)?;

        let from = date
            .checked_sub_days(Days::new(ACTIVITY_DAYS - 1))
            .unwrap_or(date)
            .format(db::progress::DATE_FORMAT)
            .to_string();
        let activity = db::progress::activity_since(&conn, &from)?
            .into_iter()
            .map(|(date, count)| ActivityDay { date, count })
            .collect();

        let unlocked = db::progress::unlocked_achievements(&conn)?;
        let achievements = achievements::CATALOG
            .iter()
            .map(|(id, _)| AchievementStatus {
                id: id.to_string(),
                unlocked_on: unlocked.get(*id).cloned(),
            })
            .collect();

        // Próxima sugestão: segue a trilha (004 RF-5). Sem trilha, é a primeira
        // questão ainda não resolvida.
        let attempts = db::problems::attempt_map(&conn)?;
        let next_slug: Option<&str> = if self.units.is_empty() {
            self.problems
                .iter()
                .find(|p| attempts.get(&p.slug) != Some(&true))
                .map(|p| p.slug.as_str())
        } else {
            let (trail_progress, solved) = self.trail_progress(&conn)?;
            trail::suggest(&self.unit_defs, &trail_progress, &solved)
        };
        let next_problem = next_slug
            .and_then(|slug| self.problems.iter().find(|p| p.slug == slug))
            .map(|p| Self::summary(p, Self::status_of(&attempts, &p.slug)));

        Ok(Progress {
            today: today.to_string(),
            streak,
            level,
            solved: self.solved_counts(&rewarded),
            problems_total: self.problems.len() as u32,
            activity,
            achievements,
            next_problem,
        })
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
        self.ensure_unlocked(&conn, slug)?;
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

        let sub = core.submit_code("add", &good, TODAY).unwrap().outcome;
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
            let starter = core.submit_code(&p.slug, &p.starter, TODAY).unwrap().outcome;
            assert!(!is_accepted(&starter), "{}: starter must not pass", p.slug);

            let solved = core.submit_code(&p.slug, &p.solution, TODAY).unwrap().outcome;
            assert!(is_accepted(&solved), "{}: {:?}", p.slug, solved.cases.iter().find(|c| c.error.is_some()));
            assert_eq!(solved.total, p.tests.len());
        }
        let statuses = core.list_problems().unwrap();
        assert!(statuses.iter().all(|s| s.status == ProblemStatus::Solved));
    }

    // ---------- spec 003 ----------

    use crate::content::{Difficulty, Problem};
    use crate::domain::streak::DayState;

    const WRONG: &str = "def add(a, b):\n    return 0\n";

    fn variant(slug: &str, difficulty: Difficulty, unit: &str) -> Problem {
        let mut p = add_problem();
        p.slug = slug.into();
        p.difficulty = difficulty;
        p.unit = unit.into();
        p
    }

    /// e1, e2 (easy, unidade a) · m1 (medium, unidade b) · h1, h2, h3 (hard, unidade c)
    fn game() -> (tempfile::TempDir, Core) {
        let dir = tempfile::tempdir().unwrap();
        let conn = db::open(&dir.path().join("t.db")).unwrap();
        let problems = vec![
            variant("e1", Difficulty::Easy, "a"),
            variant("e2", Difficulty::Easy, "a"),
            variant("m1", Difficulty::Medium, "b"),
            variant("h1", Difficulty::Hard, "c"),
            variant("h2", Difficulty::Hard, "c"),
            variant("h3", Difficulty::Hard, "c"),
        ];
        (dir, Core::new(conn, problems))
    }

    fn solve(core: &Core, slug: &str, day: &str) -> Rewards {
        let solution = add_problem().solution;
        core.submit_code(slug, &solution, day).unwrap().rewards.expect("accepted")
    }

    // CA-7
    #[test]
    fn first_solve_grants_xp_once_and_resubmitting_grants_nothing() {
        let (_d, core) = game();
        let first = solve(&core, "m1", "2026-11-10");
        assert_eq!(first.reason, RewardReason::FirstSolve);
        assert_eq!(first.xp_gained, 20);
        assert_eq!(first.level.xp_total, 20);

        // dois dias depois: reenviar não rende XP nem torna o dia ativo
        let again = solve(&core, "m1", "2026-11-12");
        assert_eq!(again.reason, RewardReason::AlreadySolved);
        assert_eq!(again.xp_gained, 0);
        assert_eq!(again.level.xp_total, 20);
        assert_eq!(again.streak.state, DayState::Broken);
        assert_eq!(again.streak.current, 0);
        assert!(again.achievements.is_empty());
    }

    #[test]
    fn xp_follows_difficulty() {
        let (_d, core) = game();
        assert_eq!(solve(&core, "e1", TODAY).xp_gained, 10);
        assert_eq!(solve(&core, "m1", TODAY).xp_gained, 20);
        assert_eq!(solve(&core, "h1", TODAY).xp_gained, 40);
        assert_eq!(core.progress(TODAY).unwrap().level.xp_total, 70);
    }

    // CA-4
    #[test]
    fn two_solves_on_the_same_day_raise_the_streak_by_one() {
        let (_d, core) = game();
        let a = solve(&core, "e1", TODAY);
        assert_eq!((a.streak_before, a.streak.current), (0, 1));
        let b = solve(&core, "e2", TODAY);
        assert_eq!((b.streak_before, b.streak.current), (1, 1));
        assert_eq!(b.streak.state, DayState::Secured);
    }

    // CA-5
    #[test]
    fn solves_on_each_side_of_midnight_are_two_active_days() {
        let (_d, core) = game();
        solve(&core, "e1", "2026-11-11");
        let next = solve(&core, "e2", "2026-11-12");
        assert_eq!((next.streak_before, next.streak.current), (1, 2));
    }

    // CA-9
    #[test]
    fn streak_achievement_is_granted_once() {
        let (_d, core) = game();
        solve(&core, "e1", "2026-11-10");
        let second = solve(&core, "e2", "2026-11-11");
        assert!(!second.achievements.contains(&"streak-3".to_string()));

        let third = solve(&core, "m1", "2026-11-12");
        assert_eq!((third.streak_before, third.streak.current), (2, 3));
        assert!(third.achievements.contains(&"streak-3".to_string()));

        let fourth = solve(&core, "h1", "2026-11-13");
        assert_eq!(fourth.streak.current, 4);
        assert!(!fourth.achievements.contains(&"streak-3".to_string()));

        let unlocked = db::progress::unlocked_achievements(&core.conn().unwrap()).unwrap();
        assert_eq!(unlocked.get("streak-3").map(String::as_str), Some("2026-11-12"));
    }

    // CA-10
    #[test]
    fn rejected_submission_changes_nothing() {
        let (_d, core) = game();
        let result = core.submit_code("e1", WRONG, TODAY).unwrap();
        assert!(result.rewards.is_none());

        let progress = core.progress(TODAY).unwrap();
        assert_eq!(progress.level.xp_total, 0);
        assert_eq!(progress.streak.current, 0);
        assert_eq!(progress.solved, SolvedCounts::default());
        assert!(progress.achievements.iter().all(|a| a.unlocked_on.is_none()));
        assert!(progress.activity.is_empty());
    }

    // CA-11
    #[test]
    fn a_failure_while_saving_rewards_persists_nothing() {
        let (_d, core) = game();
        core.conn()
            .unwrap()
            .execute_batch(
                "CREATE TRIGGER fail_xp BEFORE INSERT ON xp_events
                 BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;",
            )
            .unwrap();

        let err = core.submit_code("e1", &add_problem().solution, TODAY).unwrap_err();
        assert_eq!(err.code, "db");

        let conn = core.conn().unwrap();
        assert_eq!(db::problems::count_submissions(&conn, "e1").unwrap(), 0);
        assert_eq!(db::progress::xp_total(&conn).unwrap(), 0);
        assert!(db::progress::unlocked_achievements(&conn).unwrap().is_empty());
    }

    // CA-12
    #[test]
    fn first_try_only_when_the_first_submission_is_accepted() {
        let (_d, core) = game();
        let clean = solve(&core, "e1", TODAY);
        assert!(clean.achievements.contains(&"first-try".to_string()));
        assert!(clean.achievements.contains(&"first-solve".to_string()));

        let (_d2, other) = game();
        other.submit_code("e1", WRONG, TODAY).unwrap();
        let second_attempt = solve(&other, "e1", TODAY);
        assert!(!second_attempt.achievements.contains(&"first-try".to_string()));
        assert!(second_attempt.achievements.contains(&"first-solve".to_string()));
    }

    // CA-13
    #[test]
    fn solving_after_giving_up_earns_nothing() {
        let (_d, core) = game();
        core.get_solution("m1", true, TODAY).unwrap();
        let r = solve(&core, "m1", TODAY);
        assert_eq!(r.reason, RewardReason::GaveUp);
        assert_eq!(r.xp_gained, 0);
        assert_eq!(r.streak.current, 0);
        assert!(r.achievements.is_empty());
        // a questão fica resolvida, mas não entra na contagem de resolvidas
        assert_eq!(core.list_problems().unwrap()[2].status, ProblemStatus::Solved);
        assert_eq!(core.progress(TODAY).unwrap().solved.total, 0);
    }

    #[test]
    fn level_up_is_reported_in_the_rewards() {
        let (_d, core) = game();
        let a = solve(&core, "h1", TODAY);
        assert_eq!((a.level_before, a.level.level), (1, 1));
        solve(&core, "h2", TODAY);
        let c = solve(&core, "h3", TODAY); // 120 XP
        assert_eq!((c.level_before, c.level.level), (1, 2));
        assert_eq!(c.level.next_level_at, 300);
    }

    #[test]
    fn unit_complete_needs_every_problem_of_the_unit() {
        let (_d, core) = game();
        let first = solve(&core, "e1", TODAY);
        assert!(!first.achievements.contains(&"unit-complete".to_string()));
        let second = solve(&core, "e2", TODAY);
        assert!(second.achievements.contains(&"unit-complete".to_string()));
        assert!(!second.achievements.contains(&"trail-complete".to_string()));
    }

    #[test]
    fn difficulty_achievements() {
        let (_d, core) = game();
        assert!(solve(&core, "m1", TODAY).achievements.contains(&"first-medium".to_string()));
        assert!(solve(&core, "h1", TODAY).achievements.contains(&"first-hard".to_string()));
    }

    // RF-4, RF-5
    #[test]
    fn progress_summarises_everything_home_and_profile_show() {
        let (_d, core) = game();
        solve(&core, "e1", "2026-11-10");
        solve(&core, "m1", "2026-11-11");
        solve(&core, "h1", "2026-11-11");
        core.submit_code("e2", WRONG, "2026-11-11").unwrap();

        let p = core.progress("2026-11-12").unwrap();
        assert_eq!(p.today, "2026-11-12");
        assert_eq!(p.streak, Streak { current: 2, best: 2, state: DayState::AtRisk });
        assert_eq!(p.level, LevelInfo { level: 1, xp_total: 70, level_start: 0, next_level_at: 100 });
        assert_eq!(p.solved, SolvedCounts { easy: 1, medium: 1, hard: 1, total: 3 });
        assert_eq!(p.problems_total, 6);
        assert_eq!(
            p.activity,
            vec![
                ActivityDay { date: "2026-11-10".into(), count: 1 },
                ActivityDay { date: "2026-11-11".into(), count: 2 },
            ]
        );
        assert_eq!(p.achievements.len(), 13);
        let unlocked: Vec<&str> = p
            .achievements
            .iter()
            .filter(|a| a.unlocked_on.is_some())
            .map(|a| a.id.as_str())
            .collect();
        assert_eq!(unlocked, vec!["first-solve", "first-try", "first-medium", "first-hard", "unit-complete"]);
        // a próxima sugestão é a primeira não resolvida; e2 já foi tentada
        let next = p.next_problem.unwrap();
        assert_eq!((next.slug.as_str(), next.status), ("e2", ProblemStatus::Attempted));
    }

    #[test]
    fn activity_window_is_limited_to_the_last_year() {
        let (_d, core) = game();
        solve(&core, "e1", "2025-01-01");
        solve(&core, "e2", "2026-11-12");
        let p = core.progress("2026-11-12").unwrap();
        assert_eq!(p.activity.len(), 1);
        assert_eq!(p.streak.best, 1);
    }

    #[test]
    fn next_problem_is_none_when_everything_is_solved() {
        let (_d, core) = game();
        for slug in ["e1", "e2", "m1", "h1", "h2", "h3"] {
            solve(&core, slug, TODAY);
        }
        let p = core.progress(TODAY).unwrap();
        assert!(p.next_problem.is_none());
        let trail = p.achievements.iter().find(|a| a.id == "trail-complete").unwrap();
        assert_eq!(trail.unlocked_on.as_deref(), Some(TODAY));
    }

    #[test]
    fn invalid_date_is_rejected() {
        let (_d, core) = game();
        assert_eq!(core.progress("12/11/2026").unwrap_err().code, "invalid_date");
    }

    // ---------- spec 004 ----------

    use crate::content::Unit;

    fn unit(id: &str, problems: &[&str]) -> Unit {
        Unit {
            id: id.into(),
            title: id.to_uppercase(),
            description: String::new(),
            icon: String::new(),
            problems: problems.iter().map(|s| s.to_string()).collect(),
        }
    }

    /// Trilha a (a1 a2 a3) → b (b1 b2 b3) → c (c1)
    fn trail_core_at(path: &std::path::Path) -> Core {
        let slugs = ["a1", "a2", "a3", "b1", "b2", "b3", "c1"];
        let problems = slugs
            .iter()
            .map(|s| variant(s, Difficulty::Easy, &s[..1]))
            .collect();
        let units = vec![
            unit("a", &["a1", "a2", "a3"]),
            unit("b", &["b1", "b2", "b3"]),
            unit("c", &["c1"]),
        ];
        Core::with_units(db::open(path).unwrap(), problems, units)
    }

    fn trail_core() -> (tempfile::TempDir, Core) {
        let dir = tempfile::tempdir().unwrap();
        let core = trail_core_at(&dir.path().join("t.db"));
        (dir, core)
    }

    fn unit_states(core: &Core) -> Vec<UnitState> {
        core.trail(TODAY).unwrap().iter().map(|u| u.state).collect()
    }

    use UnitState::{Completed, InProgress, Locked, Unlocked};

    #[test]
    fn trail_lists_units_in_order_with_their_problems() {
        let (_d, core) = trail_core();
        let trail = core.trail(TODAY).unwrap();
        assert_eq!(trail.iter().map(|u| u.id.as_str()).collect::<Vec<_>>(), vec!["a", "b", "c"]);
        assert_eq!(unit_states(&core), vec![Unlocked, Locked, Locked]);
        assert_eq!((trail[0].solved, trail[0].total), (0, 3));
        assert_eq!(
            trail[0].problems.iter().map(|p| p.slug.as_str()).collect::<Vec<_>>(),
            vec!["a1", "a2", "a3"]
        );
        assert!(trail[0].current && !trail[1].current);
        // RF-4: a unidade bloqueada diz o que falta
        assert_eq!(
            trail[1].blocked_by,
            Some(TrailBlocker { unit_id: "a".into(), unit_title: "A".into(), remaining: 2 })
        );
    }

    #[test]
    fn solving_moves_units_through_their_states() {
        let (_d, core) = trail_core();
        solve(&core, "a1", TODAY);
        assert_eq!(unit_states(&core), vec![InProgress, Locked, Locked]);
        assert_eq!(core.trail(TODAY).unwrap()[1].blocked_by.as_ref().unwrap().remaining, 1);

        solve(&core, "a2", TODAY);
        assert_eq!(unit_states(&core), vec![InProgress, Unlocked, Locked]);

        solve(&core, "a3", TODAY);
        assert_eq!(unit_states(&core), vec![Completed, Unlocked, Locked]);
    }

    // RF-6
    #[test]
    fn rewards_announce_the_unit_that_just_opened() {
        let (_d, core) = trail_core();
        assert!(solve(&core, "a1", TODAY).units_unlocked.is_empty());
        assert_eq!(solve(&core, "a2", TODAY).units_unlocked, vec!["B".to_string()]);
        // já estava liberada: não anuncia de novo
        assert!(solve(&core, "a3", TODAY).units_unlocked.is_empty());
    }

    // CA-5
    #[test]
    fn problems_of_a_locked_unit_cannot_be_opened_run_or_submitted() {
        let (_d, core) = trail_core();
        let code = add_problem().solution;
        assert_eq!(core.get_problem("b1").unwrap_err().code, "unit_locked");
        assert_eq!(core.run_code("b1", &code).unwrap_err().code, "unit_locked");
        assert_eq!(core.submit_code("b1", &code, TODAY).unwrap_err().code, "unit_locked");
        assert_eq!(core.get_solution("b1", true, TODAY).unwrap_err().code, "unit_locked");
        assert_eq!(submissions_of(&core, "b1"), 0);

        solve(&core, "a1", TODAY);
        solve(&core, "a2", TODAY);
        assert!(core.get_problem("b1").is_ok());
        assert_eq!(core.get_problem("c1").unwrap_err().code, "unit_locked");
    }

    fn submissions_of(core: &Core, slug: &str) -> i64 {
        db::problems::count_submissions(&core.conn().unwrap(), slug).unwrap()
    }

    // CA-6
    #[test]
    fn home_suggestion_follows_the_trail() {
        let (_d, core) = trail_core();
        let next = |c: &Core| c.progress(TODAY).unwrap().next_problem.map(|p| p.slug);
        assert_eq!(next(&core).as_deref(), Some("a1"));
        solve(&core, "a1", TODAY);
        assert_eq!(next(&core).as_deref(), Some("a2"));
        solve(&core, "a2", TODAY);
        assert_eq!(next(&core).as_deref(), Some("b1"));
        assert!(core.trail(TODAY).unwrap()[1].current);
    }

    // CA-7
    #[test]
    fn no_suggestion_once_the_whole_trail_is_completed() {
        let (_d, core) = trail_core();
        for slug in ["a1", "a2", "a3", "b1", "b2", "b3", "c1"] {
            solve(&core, slug, TODAY);
        }
        assert_eq!(unit_states(&core), vec![Completed, Completed, Completed]);
        assert!(core.progress(TODAY).unwrap().next_problem.is_none());
        assert!(core.trail(TODAY).unwrap().iter().all(|u| !u.current));
    }

    // Quem desistiu não fica presa: a aceitação posterior conta para a trilha.
    #[test]
    fn solving_after_giving_up_still_advances_the_trail() {
        let (_d, core) = trail_core();
        core.get_solution("a1", true, TODAY).unwrap();
        core.get_solution("a2", true, TODAY).unwrap();
        assert_eq!(solve(&core, "a1", TODAY).xp_gained, 0);
        let second = solve(&core, "a2", TODAY);
        assert_eq!(second.xp_gained, 0);
        assert_eq!(second.units_unlocked, vec!["B".to_string()]);
        assert_eq!(unit_states(&core), vec![InProgress, Unlocked, Locked]);
    }

    // "Unidade liberada nunca volta a ficar bloqueada", mesmo se o conteúdo crescer.
    #[test]
    fn an_unlocked_unit_stays_unlocked_after_the_previous_unit_grows() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("t.db");
        {
            // versão antiga do conteúdo: a unidade "a" só tinha a1
            let problems = vec![
                variant("a1", Difficulty::Easy, "a"),
                variant("b1", Difficulty::Easy, "b"),
            ];
            let units = vec![unit("a", &["a1"]), unit("b", &["b1"])];
            let old = Core::with_units(db::open(&path).unwrap(), problems, units);
            solve(&old, "a1", TODAY);
            assert_eq!(unit_states(&old), vec![Completed, Unlocked]);
        }
        // conteúdo novo: "a" agora tem três questões, e só uma está resolvida
        let grown = trail_core_at(&path);
        assert_eq!(unit_states(&grown), vec![InProgress, Unlocked, Locked]);
        assert!(grown.get_problem("b1").is_ok());
    }

    #[test]
    fn problems_outside_the_trail_stay_reachable() {
        let dir = tempfile::tempdir().unwrap();
        let problems = vec![variant("a1", Difficulty::Easy, "a"), variant("loose", Difficulty::Easy, "x")];
        let core = Core::with_units(
            db::open(&dir.path().join("t.db")).unwrap(),
            problems,
            vec![unit("a", &["a1"])],
        );
        assert!(core.get_problem("loose").is_ok());
        assert_eq!(core.trail(TODAY).unwrap().len(), 1);
    }
}
