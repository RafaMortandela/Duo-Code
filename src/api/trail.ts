import { call } from "./client";
import type { ProblemSummary } from "./problems";

export type UnitState = "locked" | "unlocked" | "in_progress" | "completed";

export type TrailUnit = {
  id: string;
  title: string;
  description: string;
  icon: string;
  state: UnitState;
  solved: number;
  total: number;
  /** Presente quando a unidade está bloqueada: o que falta para abrir. */
  blocked_by: { unit_id: string; unit_title: string; remaining: number } | null;
  /** É a unidade da próxima questão sugerida. */
  current: boolean;
  problems: ProblemSummary[];
};

export function getTrail(): Promise<TrailUnit[]> {
  return call("get_trail");
}
