//! Conquistas (spec 003): catálogo declarativo e avaliação pura.
//! Títulos e descrições ficam no frontend (`src/copy.ts`), pelos mesmos ids.

/// Tudo de que as condições precisam, já contado.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct AchievementState {
    /// Questões que renderam XP de primeira resolução.
    pub solved: u32,
    pub solved_medium: u32,
    pub solved_hard: u32,
    pub streak: u32,
    pub units_completed: u32,
    pub units_total: u32,
    /// A submissão que acabou de ser aceita foi a primeira da questão.
    pub first_try: bool,
    pub reviews: u32,
    pub level: u32,
}

type Condition = fn(&AchievementState) -> bool;

/// Em ordem de exibição.
pub const CATALOG: &[(&str, Condition)] = &[
    ("first-solve", |s| s.solved >= 1),
    ("first-try", |s| s.first_try),
    ("streak-3", |s| s.streak >= 3),
    ("streak-7", |s| s.streak >= 7),
    ("streak-30", |s| s.streak >= 30),
    ("first-medium", |s| s.solved_medium >= 1),
    ("first-hard", |s| s.solved_hard >= 1),
    ("solved-10", |s| s.solved >= 10),
    ("solved-30", |s| s.solved >= 30),
    ("unit-complete", |s| s.units_completed >= 1),
    ("trail-complete", |s| s.units_total > 0 && s.units_completed == s.units_total),
    ("review-10", |s| s.reviews >= 10),
    ("level-5", |s| s.level >= 5),
];

/// Ids de todas as conquistas cuja condição vale em `state`.
/// Quem chama desconta as que já estavam destravadas.
pub fn evaluate(state: &AchievementState) -> Vec<&'static str> {
    CATALOG
        .iter()
        .filter(|(_, condition)| condition(state))
        .map(|(id, _)| *id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn earned(state: AchievementState) -> Vec<&'static str> {
        evaluate(&state)
    }

    #[test]
    fn nothing_earned_from_an_empty_state() {
        assert!(earned(AchievementState::default()).is_empty());
    }

    #[test]
    fn first_solve_and_first_try() {
        let s = AchievementState { solved: 1, first_try: true, level: 1, ..Default::default() };
        assert_eq!(earned(s), vec!["first-solve", "first-try"]);
        let s = AchievementState { solved: 1, first_try: false, level: 1, ..Default::default() };
        assert_eq!(earned(s), vec!["first-solve"]);
    }

    // CA-9 (parte pura): cada marco de streak vale a partir do seu limite.
    #[test]
    fn streak_milestones() {
        let at = |streak| earned(AchievementState { streak, ..Default::default() });
        assert!(at(2).is_empty());
        assert_eq!(at(3), vec!["streak-3"]);
        assert_eq!(at(4), vec!["streak-3"]);
        assert_eq!(at(7), vec!["streak-3", "streak-7"]);
        assert_eq!(at(30), vec!["streak-3", "streak-7", "streak-30"]);
    }

    #[test]
    fn difficulty_and_volume() {
        let s = AchievementState { solved: 10, solved_medium: 1, ..Default::default() };
        assert_eq!(earned(s), vec!["first-solve", "first-medium", "solved-10"]);
        let s = AchievementState { solved: 30, solved_hard: 2, ..Default::default() };
        assert_eq!(earned(s), vec!["first-solve", "first-hard", "solved-10", "solved-30"]);
    }

    #[test]
    fn units_and_trail() {
        let s = AchievementState { units_completed: 1, units_total: 10, ..Default::default() };
        assert_eq!(earned(s), vec!["unit-complete"]);
        let s = AchievementState { units_completed: 10, units_total: 10, ..Default::default() };
        assert_eq!(earned(s), vec!["unit-complete", "trail-complete"]);
        // sem unidades não existe "trilha completa"
        assert!(earned(AchievementState::default()).is_empty());
    }

    #[test]
    fn reviews_and_level() {
        let s = AchievementState { reviews: 10, level: 5, ..Default::default() };
        assert_eq!(earned(s), vec!["review-10", "level-5"]);
        let s = AchievementState { reviews: 9, level: 4, ..Default::default() };
        assert!(earned(s).is_empty());
    }

    #[test]
    fn catalog_ids_are_unique() {
        let mut ids: Vec<_> = CATALOG.iter().map(|(id, _)| *id).collect();
        ids.sort();
        let before = ids.len();
        ids.dedup();
        assert_eq!(ids.len(), before);
        assert_eq!(before, 13);
    }
}
