//! Lembrete diário (spec 005): decide se é hora de notificar. Sem I/O.

use chrono::NaiveTime;

pub const DEFAULT_TIME: &str = "19:00";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReminderConfig {
    pub enabled: bool,
    pub time: NaiveTime,
}

impl Default for ReminderConfig {
    fn default() -> Self {
        Self { enabled: true, time: parse_time(DEFAULT_TIME).expect("valid default") }
    }
}

/// `HH:MM` → hora. `None` se o texto não for um horário.
pub fn parse_time(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s.trim(), "%H:%M").ok()
}

/// Configuração a partir dos valores gravados; o que faltar ou for inválido
/// cai no padrão (ligado, 19:00).
pub fn config_from(enabled: Option<&str>, time: Option<&str>) -> ReminderConfig {
    let default = ReminderConfig::default();
    ReminderConfig {
        enabled: enabled.map(|v| v != "false").unwrap_or(default.enabled),
        time: time.and_then(parse_time).unwrap_or(default.time),
    }
}

/// Notifica quando: o lembrete está ligado, o horário já chegou, o dia ainda
/// não é ativo e nenhuma notificação saiu hoje.
///
/// Por ser "já chegou" e não "é exatamente agora", um computador que estava
/// desligado no horário notifica na primeira verificação do mesmo dia (RF-7).
pub fn should_notify(
    now: NaiveTime,
    config: ReminderConfig,
    day_active: bool,
    already_notified_today: bool,
) -> bool {
    config.enabled && !day_active && !already_notified_today && now >= config.time
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t(s: &str) -> NaiveTime {
        parse_time(s).unwrap()
    }

    fn at_seven() -> ReminderConfig {
        ReminderConfig { enabled: true, time: t("19:00") }
    }

    // CA-10
    #[test]
    fn notifies_at_the_configured_time_when_nothing_was_done() {
        assert!(should_notify(t("19:00"), at_seven(), false, false));
    }

    // CA-10
    #[test]
    fn stays_quiet_when_the_day_is_already_active() {
        assert!(!should_notify(t("19:00"), at_seven(), true, false));
    }

    // CA-10
    #[test]
    fn stays_quiet_when_disabled() {
        let off = ReminderConfig { enabled: false, ..at_seven() };
        assert!(!should_notify(t("19:00"), off, false, false));
    }

    // CA-10
    #[test]
    fn notifies_at_most_once_a_day() {
        assert!(!should_notify(t("19:00"), at_seven(), false, true));
        assert!(!should_notify(t("23:59"), at_seven(), false, true));
    }

    #[test]
    fn stays_quiet_before_the_time() {
        assert!(!should_notify(t("18:59"), at_seven(), false, false));
        assert!(!should_notify(t("00:00"), at_seven(), false, false));
    }

    // CA-11, RF-7
    #[test]
    fn late_start_on_the_same_day_still_notifies() {
        assert!(should_notify(t("21:00"), at_seven(), false, false));
        assert!(should_notify(t("23:59"), at_seven(), false, false));
    }

    #[test]
    fn config_defaults_and_parsing() {
        assert_eq!(config_from(None, None), ReminderConfig { enabled: true, time: t("19:00") });
        assert_eq!(
            config_from(Some("false"), Some("07:30")),
            ReminderConfig { enabled: false, time: t("07:30") }
        );
        // valor inválido cai no padrão em vez de desligar o lembrete
        assert_eq!(config_from(Some("true"), Some("25:99")).time, t("19:00"));
        assert_eq!(config_from(Some("true"), Some("")).time, t("19:00"));
        assert_eq!(parse_time(" 08:05 "), Some(t("08:05")));
        assert_eq!(parse_time("8pm"), None);
    }
}
