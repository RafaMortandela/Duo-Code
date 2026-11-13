import { call } from "./client";
import type { ProblemSummary } from "./problems";

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

export type RewardReason = "first_solve" | "already_solved" | "gave_up";

export type Rewards = {
  reason: RewardReason;
  xp_gained: number;
  level_before: number;
  level: LevelInfo;
  streak_before: number;
  streak: Streak;
  /** Ids das conquistas destravadas por esta submissão. */
  achievements: string[];
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
};

export function getProgress(): Promise<Progress> {
  return call("get_progress");
}
