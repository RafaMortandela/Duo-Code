//! XP e níveis (spec 003).

use crate::content::Difficulty;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum XpEvent {
    FirstSolve(Difficulty),
    Review,
}

pub fn xp_for(event: XpEvent) -> u32 {
    match event {
        XpEvent::FirstSolve(Difficulty::Easy) => 10,
        XpEvent::FirstSolve(Difficulty::Medium) => 20,
        XpEvent::FirstSolve(Difficulty::Hard) => 40,
        XpEvent::Review => 5,
    }
}

/// XP total necessário para chegar ao nível `n` (nível 1 = 0, 2 = 100, 3 = 300...).
pub fn level_threshold(n: u32) -> u32 {
    50 * n * n.saturating_sub(1)
}

pub fn level(xp_total: u32) -> u32 {
    let mut n = 1;
    while level_threshold(n + 1) <= xp_total {
        n += 1;
    }
    n
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct LevelInfo {
    pub level: u32,
    pub xp_total: u32,
    /// XP em que o nível atual começou.
    pub level_start: u32,
    /// XP em que o próximo nível começa.
    pub next_level_at: u32,
}

pub fn level_info(xp_total: u32) -> LevelInfo {
    let level = level(xp_total);
    LevelInfo {
        level,
        xp_total,
        level_start: level_threshold(level),
        next_level_at: level_threshold(level + 1),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xp_table() {
        assert_eq!(xp_for(XpEvent::FirstSolve(Difficulty::Easy)), 10);
        assert_eq!(xp_for(XpEvent::FirstSolve(Difficulty::Medium)), 20);
        assert_eq!(xp_for(XpEvent::FirstSolve(Difficulty::Hard)), 40);
        assert_eq!(xp_for(XpEvent::Review), 5);
    }

    // CA-8
    #[test]
    fn level_boundaries() {
        assert_eq!(level(0), 1);
        assert_eq!(level(99), 1);
        assert_eq!(level(100), 2);
        assert_eq!(level(299), 2);
        assert_eq!(level(300), 3);
        assert_eq!(level(599), 3);
        assert_eq!(level(600), 4);
    }

    #[test]
    fn thresholds_follow_the_formula() {
        assert_eq!(
            (1..=6).map(level_threshold).collect::<Vec<_>>(),
            vec![0, 100, 300, 600, 1000, 1500]
        );
    }

    #[test]
    fn level_info_brackets_the_total() {
        let info = level_info(250);
        assert_eq!(
            info,
            LevelInfo { level: 2, xp_total: 250, level_start: 100, next_level_at: 300 }
        );
        for xp in [0, 1, 99, 100, 1234, 50_000] {
            let i = level_info(xp);
            assert!(i.level_start <= xp && xp < i.next_level_at, "{xp}: {i:?}");
        }
    }
}
