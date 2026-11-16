//! Revisão espaçada (spec 005): intervalos fixos, sem I/O.

use chrono::{Days, NaiveDate};
use serde::{Deserialize, Serialize};

/// Dias até a próxima revisão, por estágio.
pub const INTERVALS: [u64; 5] = [1, 3, 7, 14, 30];
pub const MAX_STAGE: u8 = (INTERVALS.len() - 1) as u8;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Rating {
    Hard,
    Ok,
    Easy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Schedule {
    pub stage: u8,
    pub due: NaiveDate,
}

fn at(stage: u8, today: NaiveDate) -> Schedule {
    let stage = stage.min(MAX_STAGE);
    let due = today
        .checked_add_days(Days::new(INTERVALS[stage as usize]))
        .unwrap_or(today);
    Schedule { stage, due }
}

/// Primeira resolução: estágio 0, vence amanhã.
pub fn initial(today: NaiveDate) -> Schedule {
    at(0, today)
}

/// "Não consegui": volta ao começo.
pub fn failed(today: NaiveDate) -> Schedule {
    at(0, today)
}

/// Novo agendamento depois de uma revisão aceita em `today`.
/// O vencimento conta a partir de hoje, não do vencimento anterior.
pub fn next_review(stage: u8, rating: Rating, today: NaiveDate) -> Schedule {
    let stage = stage.min(MAX_STAGE);
    let next = match rating {
        Rating::Hard => 0,
        Rating::Ok => stage + 1,
        Rating::Easy => stage + 2,
    };
    at(next, today)
}

pub fn is_due(due: NaiveDate, today: NaiveDate) -> bool {
    due <= today
}

/// Itens vencidos, do mais atrasado para o menos atrasado.
pub fn due_queue<T: Clone>(items: &[(T, NaiveDate)], today: NaiveDate) -> Vec<(T, NaiveDate)> {
    let mut due: Vec<_> = items.iter().filter(|(_, d)| is_due(*d, today)).cloned().collect();
    due.sort_by_key(|(_, d)| *d);
    due
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    const D: &str = "2026-11-16"; // segunda-feira

    // CA-1
    #[test]
    fn first_solve_is_due_the_next_day() {
        assert_eq!(initial(d(D)), Schedule { stage: 0, due: d("2026-11-17") });
    }

    // CA-2
    #[test]
    fn ok_moves_one_stage() {
        assert_eq!(next_review(1, Rating::Ok, d(D)), Schedule { stage: 2, due: d("2026-11-23") });
    }

    // CA-3
    #[test]
    fn easy_moves_two_stages() {
        assert_eq!(next_review(1, Rating::Easy, d(D)), Schedule { stage: 3, due: d("2026-11-30") });
    }

    // CA-4
    #[test]
    fn stage_never_goes_past_the_last() {
        let last = Schedule { stage: 4, due: d("2026-12-16") };
        assert_eq!(next_review(3, Rating::Easy, d(D)), last);
        assert_eq!(next_review(4, Rating::Ok, d(D)), last);
        assert_eq!(next_review(4, Rating::Easy, d(D)), last);
        assert_eq!(next_review(200, Rating::Ok, d(D)), last);
    }

    // CA-5
    #[test]
    fn hard_goes_back_to_the_start() {
        assert_eq!(next_review(3, Rating::Hard, d(D)), Schedule { stage: 0, due: d("2026-11-17") });
        assert_eq!(failed(d(D)), Schedule { stage: 0, due: d("2026-11-17") });
    }

    // CA-6: o novo vencimento não depende de há quanto tempo estava vencida.
    #[test]
    fn next_due_counts_from_the_day_of_the_review() {
        let on_time = next_review(1, Rating::Ok, d(D));
        // a mesma revisão, só que feita 5 dias depois do vencimento original
        assert_eq!(on_time.due, d("2026-11-23"));
        assert_eq!(next_review(1, Rating::Ok, d("2026-11-21")).due, d("2026-11-28"));
    }

    #[test]
    fn full_ladder_with_ok() {
        let mut stage = 0;
        let mut days = Vec::new();
        for _ in 0..6 {
            let s = next_review(stage, Rating::Ok, d(D));
            days.push((s.due - d(D)).num_days());
            stage = s.stage;
        }
        assert_eq!(days, vec![3, 7, 14, 30, 30, 30]);
    }

    // CA-8
    #[test]
    fn queue_is_ordered_from_most_overdue_and_skips_the_future() {
        let items = vec![
            ("three-late", d("2026-11-13")),
            ("today", d(D)),
            ("one-late", d("2026-11-15")),
            ("tomorrow", d("2026-11-17")),
        ];
        let queue: Vec<&str> = due_queue(&items, d(D)).into_iter().map(|(s, _)| s).collect();
        assert_eq!(queue, vec!["three-late", "one-late", "today"]);
    }

    #[test]
    fn due_today_counts_as_due() {
        assert!(is_due(d(D), d(D)));
        assert!(is_due(d("2026-11-01"), d(D)));
        assert!(!is_due(d("2026-11-17"), d(D)));
    }
}
