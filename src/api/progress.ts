import { call } from "./client";
import type { ProblemSummary } from "./problems";
import type { ReviewSchedule } from "./reviews";

export type DayState = "secured" | "at_risk" | "broken";

export type Streak = {
  current: number;
  best: number;
  state: DayState;
};

export type LevelInfo = {
  level: number;
  xp_total: number;
  /** XP em que o nível atual começou. */
  level_start: number;
  /** XP em que o próximo nível começa. */
  next_level_at: number;
};

export type RewardReason = "first_solve" | "already_solved" | "gave_up" | "review";

export type Rewards = {
  reason: RewardReason;
  xp_gained: number;
  level_before: number;
  level: LevelInfo;
  streak_before: number;
  streak: Streak;
  /** Ids das conquistas destravadas por esta submissão. */
  achievements: string[];
  /** Títulos das unidades da trilha que abriram com esta submissão. */
  units_unlocked: string[];
  /** Novo agendamento, quando a submissão foi uma revisão. */
  review: ReviewSchedule | null;
};

export type Progress = {
  /** Data local de hoje segundo o backend, `YYYY-MM-DD`. */
  today: string;
  streak: Streak;
  level: LevelInfo;
  solved: { easy: number; medium: number; hard: number; total: number };
  problems_total: number;
  activity: { date: string; count: number }[];
  achievements: { id: string; unlocked_on: string | null }[];
  next_problem: ProblemSummary | null;
  /** Revisões vencidas hoje. */
  reviews_due: number;
};

export function getProgress(): Promise<Progress> {
  return call("get_progress");
}
