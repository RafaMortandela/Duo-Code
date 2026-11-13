//! Streak diário (spec 003). Função pura: recebe os dias ativos e "hoje".

use chrono::{Days, NaiveDate};
use serde::Serialize;
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DayState {
    /// Hoje já é um dia ativo ("garantido").
    Secured,
    /// Ontem foi ativo, hoje ainda não ("em risco").
    AtRisk,
    /// Nem hoje nem ontem ("zerado").
    Broken,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Streak {
    pub current: u32,
    /// Maior sequência já atingida; nunca diminui.
    pub best: u32,
    pub state: DayState,
}

/// Quantos dias ativos consecutivos terminam em `end` (0 se `end` não é ativo).
fn run_ending_at(active: &BTreeSet<NaiveDate>, end: NaiveDate) -> u32 {
    let mut count = 0;
    let mut day = end;
    while active.contains(&day) {
        count += 1;
        match day.checked_sub_days(Days::new(1)) {
            Some(prev) => day = prev,
            None => break,
        }
    }
    count
}

fn longest_run(active: &BTreeSet<NaiveDate>) -> u32 {
    let mut best = 0;
    let mut run = 0;
    let mut previous: Option<NaiveDate> = None;
    for &day in active {
        let consecutive = previous.and_then(|p| p.checked_add_days(Days::new(1))) == Some(day);
        run = if consecutive { run + 1 } else { 1 };
        best = best.max(run);
        previous = Some(day);
    }
    best
}

pub fn streak(active: &BTreeSet<NaiveDate>, today: NaiveDate) -> Streak {
    let yesterday = today.checked_sub_days(Days::new(1));
    let (current, state) = if active.contains(&today) {
        (run_ending_at(active, today), DayState::Secured)
    } else if let Some(y) = yesterday.filter(|y| active.contains(y)) {
        (run_ending_at(active, y), DayState::AtRisk)
    } else {
        (0, DayState::Broken)
    };
    Streak { current, best: longest_run(active), state }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    fn days(list: &[&str]) -> BTreeSet<NaiveDate> {
        list.iter().map(|s| d(s)).collect()
    }

    // 2026-11-09 é uma segunda-feira.
    const MON: &str = "2026-11-09";
    const TUE: &str = "2026-11-10";
    const WED: &str = "2026-11-11";
    const THU: &str = "2026-11-12";

    // CA-1
    #[test]
    fn three_days_ending_today_is_secured() {
        let s = streak(&days(&[MON, TUE, WED]), d(WED));
        assert_eq!(s, Streak { current: 3, best: 3, state: DayState::Secured });
    }

    // CA-2
    #[test]
    fn active_until_yesterday_is_at_risk_and_still_counts() {
        let s = streak(&days(&[MON, TUE]), d(WED));
        assert_eq!(s, Streak { current: 2, best: 2, state: DayState::AtRisk });
    }

    // CA-3
    #[test]
    fn a_missed_day_breaks_the_streak_but_keeps_the_record() {
        let s = streak(&days(&[MON, TUE]), d(THU));
        assert_eq!(s, Streak { current: 0, best: 2, state: DayState::Broken });
    }

    // CA-4: o conjunto de dias já representa "várias submissões no mesmo dia = 1 dia".
    #[test]
    fn a_day_counts_once() {
        let mut active = days(&[MON]);
        active.insert(d(MON));
        assert_eq!(streak(&active, d(MON)).current, 1);
    }

    // CA-5
    #[test]
    fn dates_on_each_side_of_midnight_are_two_days() {
        let s = streak(&days(&[TUE, WED]), d(WED));
        assert_eq!(s.current, 2);
    }

    // CA-6
    #[test]
    fn runs_cross_month_and_year_boundaries() {
        let active = days(&["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
        assert_eq!(streak(&active, d("2027-01-02")).current, 4);

        let leap = days(&["2028-02-28", "2028-02-29", "2028-03-01"]);
        assert_eq!(streak(&leap, d("2028-03-01")).current, 3);
    }

    #[test]
    fn no_activity_is_broken_with_zero_record() {
        let s = streak(&BTreeSet::new(), d(WED));
        assert_eq!(s, Streak { current: 0, best: 0, state: DayState::Broken });
    }

    #[test]
    fn record_is_the_longest_run_even_if_it_is_in_the_past() {
        let active = days(&["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", TUE, WED]);
        let s = streak(&active, d(WED));
        assert_eq!((s.current, s.best), (2, 4));
    }

    #[test]
    fn a_gap_inside_the_history_only_counts_the_latest_run() {
        let s = streak(&days(&[MON, WED]), d(WED));
        assert_eq!((s.current, s.best), (1, 1));
    }

    #[test]
    fn restarting_after_a_break_starts_at_one() {
        let s = streak(&days(&[MON, THU]), d(THU));
        assert_eq!(s, Streak { current: 1, best: 1, state: DayState::Secured });
    }
}
