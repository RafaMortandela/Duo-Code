//! Trilha de unidades (spec 004): estados e desbloqueio, sem I/O.

use serde::Serialize;
use std::collections::HashSet;

/// Quantas questões resolvidas em uma unidade liberam a seguinte.
pub const REQUIRED_TO_ADVANCE: u32 = 2;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnitDef {
    pub id: String,
    /// Slugs, na ordem em que aparecem na unidade.
    pub problems: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UnitState {
    Locked,
    /// Liberada, nenhuma questão resolvida.
    Unlocked,
    InProgress,
    Completed,
}

/// O que falta para uma unidade bloqueada abrir.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Blocker {
    /// Índice da unidade anterior, onde as questões precisam ser resolvidas.
    pub unit: usize,
    pub remaining: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UnitProgress {
    pub state: UnitState,
    pub solved: u32,
    pub total: u32,
    pub blocked_by: Option<Blocker>,
}

/// Resolvidas necessárias em uma unidade de `total` questões para abrir a próxima:
/// duas, ou todas se a unidade tiver menos que isso.
pub fn required_to_advance(total: u32) -> u32 {
    REQUIRED_TO_ADVANCE.min(total)
}

fn solved_in(unit: &UnitDef, solved: &HashSet<String>) -> u32 {
    unit.problems.iter().filter(|p| solved.contains(*p)).count() as u32
}

/// Estado de cada unidade.
///
/// `kept_unlocked` são as unidades que já estiveram liberadas: elas nunca
/// voltam a ficar bloqueadas, mesmo que o conteúdo da anterior cresça.
pub fn trail_state(
    units: &[UnitDef],
    solved: &HashSet<String>,
    kept_unlocked: &HashSet<String>,
) -> Vec<UnitProgress> {
    let mut out = Vec::with_capacity(units.len());
    for (i, unit) in units.iter().enumerate() {
        let total = unit.problems.len() as u32;
        let done = solved_in(unit, solved);

        let blocked_by = if i == 0 || kept_unlocked.contains(&unit.id) {
            None
        } else {
            let prev = &units[i - 1];
            let need = required_to_advance(prev.problems.len() as u32);
            let have = solved_in(prev, solved);
            (have < need).then(|| Blocker { unit: i - 1, remaining: need - have })
        };

        let state = if blocked_by.is_some() {
            UnitState::Locked
        } else if done == 0 {
            UnitState::Unlocked
        } else if done == total {
            UnitState::Completed
        } else {
            UnitState::InProgress
        };
        out.push(UnitProgress { state, solved: done, total, blocked_by });
    }
    out
}

/// Próxima questão sugerida: a primeira não resolvida da unidade liberada
/// mais avançada que ainda não está concluída. `None` quando não sobra nada.
pub fn suggest<'a>(
    units: &'a [UnitDef],
    progress: &[UnitProgress],
    solved: &HashSet<String>,
) -> Option<&'a str> {
    units
        .iter()
        .zip(progress)
        .rev()
        .filter(|(_, p)| p.state != UnitState::Locked)
        .find_map(|(unit, _)| unit.problems.iter().find(|s| !solved.contains(*s)))
        .map(String::as_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unit(id: &str, n: usize) -> UnitDef {
        UnitDef { id: id.into(), problems: (1..=n).map(|i| format!("{id}{i}")).collect() }
    }

    fn trail() -> Vec<UnitDef> {
        vec![unit("a", 3), unit("b", 3), unit("c", 3)]
    }

    fn set(items: &[&str]) -> HashSet<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    fn states(units: &[UnitDef], solved: &[&str]) -> Vec<UnitState> {
        trail_state(units, &set(solved), &HashSet::new()).iter().map(|p| p.state).collect()
    }

    use UnitState::*;

    // CA-1
    #[test]
    fn only_the_first_unit_starts_unlocked() {
        assert_eq!(states(&trail(), &[]), vec![Unlocked, Locked, Locked]);
    }

    // CA-2
    #[test]
    fn one_of_three_is_in_progress_and_keeps_the_next_locked() {
        let progress = trail_state(&trail(), &set(&["a1"]), &HashSet::new());
        assert_eq!(progress[0].state, InProgress);
        assert_eq!((progress[0].solved, progress[0].total), (1, 3));
        assert_eq!(progress[1].state, Locked);
        assert_eq!(progress[1].blocked_by, Some(Blocker { unit: 0, remaining: 1 }));
    }

    // CA-3
    #[test]
    fn two_of_three_unlock_the_next_unit() {
        assert_eq!(states(&trail(), &["a1", "a3"]), vec![InProgress, Unlocked, Locked]);
    }

    // CA-4
    #[test]
    fn all_solved_is_completed() {
        assert_eq!(states(&trail(), &["a1", "a2", "a3"]), vec![Completed, Unlocked, Locked]);
    }

    #[test]
    fn blocker_points_at_the_previous_unit_with_what_is_missing() {
        let progress = trail_state(&trail(), &set(&["a1", "a2"]), &HashSet::new());
        assert_eq!(progress[1].blocked_by, None);
        assert_eq!(progress[2].blocked_by, Some(Blocker { unit: 1, remaining: 2 }));
    }

    #[test]
    fn small_units_need_all_their_problems() {
        assert_eq!(required_to_advance(0), 0);
        assert_eq!(required_to_advance(1), 1);
        assert_eq!(required_to_advance(2), 2);
        assert_eq!(required_to_advance(5), 2);

        let units = vec![unit("a", 1), unit("b", 1), unit("c", 2)];
        assert_eq!(states(&units, &[]), vec![Unlocked, Locked, Locked]);
        assert_eq!(states(&units, &["a1"]), vec![Completed, Unlocked, Locked]);
        assert_eq!(states(&units, &["a1", "b1"]), vec![Completed, Completed, Unlocked]);
    }

    // "Unidade liberada nunca volta a ficar bloqueada."
    #[test]
    fn a_unit_that_was_unlocked_stays_unlocked_when_content_grows() {
        // "a" tinha 1 questão e foi resolvida; depois ganhou mais duas.
        let grown = vec![unit("a", 3), unit("b", 3)];
        let solved = set(&["a1"]);
        assert_eq!(trail_state(&grown, &solved, &HashSet::new())[1].state, Locked);

        let kept = set(&["b"]);
        let progress = trail_state(&grown, &solved, &kept);
        assert_eq!(progress[1].state, Unlocked);
        assert_eq!(progress[1].blocked_by, None);
    }

    #[test]
    fn solved_slugs_outside_the_trail_are_ignored() {
        assert_eq!(states(&trail(), &["zzz"]), vec![Unlocked, Locked, Locked]);
    }

    fn suggestion(units: &[UnitDef], solved: &[&str]) -> Option<String> {
        let solved = set(solved);
        let progress = trail_state(units, &solved, &HashSet::new());
        suggest(units, &progress, &solved).map(str::to_string)
    }

    #[test]
    fn suggestion_starts_at_the_first_problem() {
        assert_eq!(suggestion(&trail(), &[]).as_deref(), Some("a1"));
        assert_eq!(suggestion(&trail(), &["a1"]).as_deref(), Some("a2"));
    }

    // CA-6
    #[test]
    fn suggestion_moves_to_the_most_advanced_unlocked_unit() {
        assert_eq!(suggestion(&trail(), &["a1", "a2"]).as_deref(), Some("b1"));
    }

    #[test]
    fn suggestion_returns_to_earlier_units_when_the_last_is_done() {
        let all_but_a3 = ["a1", "a2", "b1", "b2", "b3", "c1", "c2", "c3"];
        assert_eq!(suggestion(&trail(), &all_but_a3).as_deref(), Some("a3"));
    }

    // CA-7
    #[test]
    fn no_suggestion_when_everything_is_completed() {
        let all = ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"];
        assert_eq!(suggestion(&trail(), &all), None);
        assert_eq!(suggestion(&[], &[]), None);
    }
}
